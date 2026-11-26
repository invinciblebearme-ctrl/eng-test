-- 2026-11 업그레이드: 학생 보관(소프트 삭제) · 제출 버전 · 원자적 재출제/명렬표 함수
-- Supabase SQL Editor에서 한 번 실행합니다. 여러 번 실행해도 안전합니다(멱등).
-- schema.sql(처음 설치)을 먼저 실행한 뒤 이어서 실행하세요.
-- 기존 학생·제출 기록은 바꾸거나 지우지 않습니다 (열 추가와 함수 만들기만).

begin;

-- 1) 학생 보관: 명렬표에서 빠진 학생을 지우지 않고 보관 (archived_at이 있으면 목록·로그인에서 숨김)
alter table public.students add column if not exists archived_at timestamptz;
create index if not exists students_active_idx on public.students (grade, class_no) where archived_at is null;

-- 2) 제출 버전: 저장할 때마다 1씩 올려서 늦게 도착한 옛 저장이 새 저장을 덮어쓰지 않게
alter table public.submissions add column if not exists rev int not null default 1;
create index if not exists submissions_concept_idx on public.submissions (concept);
-- 어떤 UPDATE든(Worker·예약 작업·재채점·일괄 확정) rev를 1 올림. 기존 행 값은 지금 바꾸지 않음
create or replace function public.submissions_bump_rev()
returns trigger language plpgsql security invoker set search_path = public, pg_temp
as $$ begin new.rev := coalesce(old.rev, 0) + 1; return new; end $$;
drop trigger if exists submissions_bump_rev on public.submissions;
create trigger submissions_bump_rev before update on public.submissions
  for each row execute function public.submissions_bump_rev();

-- 3) 설치 확인용 (Worker가 업그레이드 여부를 묻는 데만 씀)
create or replace function public.eng_schema_version()
returns int language sql stable security invoker set search_path = public, pg_temp
as $$ select 2 $$;

-- 4) 재출제: 현재 답을 이전 기록으로 옮기고 지우기 (+ 닫힌 시험 열기)를 한 트랜잭션으로
create or replace function public.reissue_submissions(p_ids bigint[], p_open boolean default false)
returns int language plpgsql security invoker set search_path = public, pg_temp
as $$
declare n int;
begin
  perform 1 from public.submissions where id = any(p_ids) for update;
  insert into public.submission_history
    (student_id, concept, attempt, answers, auto, overrides, ai, status, feedback, feedback_draft, submitted_at, graded_at)
  select student_id, concept, coalesce(attempt, 1), answers, auto, coalesce(overrides, '{}'::jsonb), ai, status, feedback, feedback_draft, submitted_at, graded_at
    from public.submissions where id = any(p_ids);
  get diagnostics n = row_count;
  if p_open and n > 0 then
    insert into public.test_settings (concept, enabled, updated_at)
    select distinct concept, true, now() from public.submissions where id = any(p_ids)
    on conflict (concept) do update set enabled = true, updated_at = now();
  end if;
  delete from public.submissions where id = any(p_ids);
  return n;
end $$;

-- 5) 명렬표 적용: 추가·수정·보관 해제, (선택) 파일에 없는 학생 보관 — 한 트랜잭션으로
-- p_classes: [{grade, class_no, students:[{number, name, login_ids: [..] | null}]}]
--   login_ids가 null이면 기존 ID를 그대로 둠. 학생 행과 제출 기록은 지우지 않음.
create or replace function public.roster_apply(p_classes jsonb, p_archive boolean default false)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp
as $$
declare
  r record; ex public.students; ids text[];
  v_added int := 0; v_updated int := 0; v_restored int := 0; v_same int := 0; v_archived int := 0;
begin
  for r in
    select (c->>'grade')::int as g, (c->>'class_no')::int as cl, (s->>'number')::int as num, s->>'name' as nm, s->'login_ids' as lid
      from jsonb_array_elements(p_classes) c, jsonb_array_elements(c->'students') s
  loop
    ids := case when r.lid is null or jsonb_typeof(r.lid) <> 'array' then null
                else array(select jsonb_array_elements_text(r.lid)) end;
    select * into ex from public.students where grade = r.g and class_no = r.cl and number = r.num for update;
    if not found then
      insert into public.students (grade, class_no, number, name, login_ids) values (r.g, r.cl, r.num, r.nm, coalesce(ids, '{}'));
      v_added := v_added + 1;
    else
      if ex.archived_at is not null then v_restored := v_restored + 1;
      elsif ex.name <> r.nm or (ids is not null and ex.login_ids is distinct from ids) then v_updated := v_updated + 1;
      else v_same := v_same + 1; end if;
      update public.students set name = r.nm, login_ids = coalesce(ids, login_ids), archived_at = null where id = ex.id;
    end if;
  end loop;
  if p_archive then
    update public.students st set archived_at = now()
     where st.archived_at is null
       and exists (select 1 from jsonb_array_elements(p_classes) c
                    where (c->>'grade')::int = st.grade and (c->>'class_no')::int = st.class_no)
       and not exists (select 1 from jsonb_array_elements(p_classes) c, jsonb_array_elements(c->'students') s
                        where (c->>'grade')::int = st.grade and (c->>'class_no')::int = st.class_no and (s->>'number')::int = st.number);
    get diagnostics v_archived = row_count;
  end if;
  return jsonb_build_object('added', v_added, 'updated', v_updated, 'restored', v_restored, 'same', v_same, 'archived', v_archived);
end $$;

-- 6) 권한: 서비스 키(service_role, Worker)만 실행. 공개 키(anon)·로그인 사용자(authenticated)는 실행 불가
revoke all on function public.eng_schema_version() from public, anon, authenticated;
revoke all on function public.submissions_bump_rev() from public, anon, authenticated;
revoke all on function public.reissue_submissions(bigint[], boolean) from public, anon, authenticated;
revoke all on function public.roster_apply(jsonb, boolean) from public, anon, authenticated;
grant execute on function public.eng_schema_version() to service_role;
grant execute on function public.reissue_submissions(bigint[], boolean) to service_role;
grant execute on function public.roster_apply(jsonb, boolean) to service_role;

commit;

-- 설치 확인 (결과가 2이면 끝):
--   select public.eng_schema_version();
-- 권한 확인 (anon·authenticated가 false여야 함):
--   select r, has_function_privilege(r, 'public.roster_apply(jsonb, boolean)', 'execute')
--     from unnest(array['anon','authenticated','service_role']) r;
