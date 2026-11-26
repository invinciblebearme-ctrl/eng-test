// schema.sql + sql/upgrade-2026-11.sql 을 임시 PostgreSQL(PGlite, 메모리)에 설치해서
// 재출제·명렬표 함수의 원자성·권한을 확인합니다. 가짜 데이터만 씁니다.
import { readFileSync } from 'node:fs';
// PGlite가 없으면 실패합니다 (필수 검사). npm ci로 설치하세요.
import { PGlite } from '@electric-sql/pglite';

const read = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const db = new PGlite();
let bad = 0;
const ok = (cond, msg) => { console.log(cond ? 'ok ' : 'BAD', msg); if (!cond) bad++; };
const one = async (sql, p) => (await db.query(sql, p)).rows;

// Supabase에 있는 역할 흉내
await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;`);
await db.exec(read('schema.sql'));
await db.exec(read('sql/upgrade-2026-11.sql'));
await db.exec(read('sql/upgrade-2026-11.sql'));   // 두 번 실행해도 안전
await db.exec(read('sql/upgrade-2026-11b-errors.sql'));   // 오류 기록 표 (schema.sql에도 있음 → 다시 실행해도 안전)
await db.exec(`grant usage on schema public to service_role; grant all on all tables in schema public to service_role; grant all on all sequences in schema public to service_role;`);

ok((await one('select public.eng_schema_version() v'))[0].v === 2, '설치 확인 함수 = 2');
for (const fn of ['public.roster_apply(jsonb, boolean)', 'public.reissue_submissions(bigint[], boolean)', 'public.eng_schema_version()']) {
  const r = await one(`select r, has_function_privilege(r, $1, 'execute') x from unnest(array['anon','authenticated','service_role']) r`, [fn]);
  ok(r.find((x) => x.r === 'anon').x === false && r.find((x) => x.r === 'authenticated').x === false && r.find((x) => x.r === 'service_role').x === true, `권한: ${fn} anon/authenticated 실행 불가, service_role 가능`);
  const sec = await one(`select p.prosecdef from pg_proc p where p.oid = $1::regprocedure`, [fn]);
  ok(sec[0].prosecdef === false, `SECURITY INVOKER: ${fn}`);
}

// ---- 명렬표 ----
const roster = (classes, archive) => one('select public.roster_apply($1::jsonb, $2) r', [JSON.stringify(classes), archive]).then((x) => x[0].r);
let r = await roster([{ grade: 4, class_no: 1, students: [{ number: 1, name: '가나', login_ids: ['a1'] }, { number: 2, name: '다라', login_ids: null }, { number: 3, name: '마바', login_ids: ['c3'] }] }], false);
ok(r.added === 3 && r.archived === 0, '명렬표 추가 3명');
const sid = Object.fromEntries((await one('select id, number from students')).map((x) => [x.number, x.id]));
await db.query(`insert into submissions (student_id, concept, answers, auto) values ($1, 1, '["x"]', '[true]'), ($2, 1, '["y"]', '[false]')`, [sid[1], sid[3]]);
r = await roster([{ grade: 4, class_no: 1, students: [{ number: 1, name: '가나', login_ids: null }, { number: 2, name: '다라2', login_ids: ['b2'] }] }], false);
ok(r.same === 1 && r.updated === 1 && r.archived === 0, '바꾸기 끔: 3번은 그대로 (보관 안 함)');
ok((await one('select login_ids from students where number=1'))[0].login_ids.join() === 'a1', 'login_ids null이면 기존 ID 유지');
r = await roster([{ grade: 4, class_no: 1, students: [{ number: 1, name: '가나', login_ids: null }, { number: 2, name: '다라2', login_ids: null }] }], true);
ok(r.archived === 1, '바꾸기 켬: 파일에 없는 3번 보관');
const s3 = (await one('select archived_at from students where number=3'))[0];
ok(s3.archived_at != null, '3번 학생 행은 남고 archived_at 설정');
ok((await one('select count(*)::int n from submissions where student_id=$1', [sid[3]]))[0].n === 1, '보관해도 3번 학생 답은 그대로');
r = await roster([{ grade: 4, class_no: 1, students: [{ number: 3, name: '마바', login_ids: null }] }], false);
ok(r.restored === 1, '다시 올리면 보관 해제');
// 실패하면 전부 되돌림 (원자성): 반 번호 제약 위반 행을 섞음
const before = (await one('select count(*)::int n from students'))[0].n;
let threw = false;
try { await roster([{ grade: 4, class_no: 1, students: [{ number: 9, name: '새학생', login_ids: null }] }, { grade: 4, class_no: 99, students: [{ number: 1, name: '잘못', login_ids: null }] }], true); } catch { threw = true; }
ok(threw && (await one('select count(*)::int n from students'))[0].n === before, '명렬표: 중간 오류면 아무것도 바뀌지 않음');
ok((await one('select count(*)::int n from students where archived_at is not null'))[0].n === 0, '명렬표: 오류 시 보관도 되돌림');

// ---- 재출제 ----
const subs = (await one('select id, concept from submissions order by id')).map((x) => x.id);
await db.query(`insert into test_settings (concept, enabled) values (1, false)`);
const n = (await one('select public.reissue_submissions($1::bigint[], true) n', [subs]))[0].n;
ok(n === 2, '재출제 2건');
ok((await one('select count(*)::int n from submissions'))[0].n === 0 && (await one('select count(*)::int n from submission_history'))[0].n === 2, '재출제: 기록으로 옮기고 지움');
ok((await one('select enabled from test_settings where concept=1'))[0].enabled === true, '재출제: 닫힌 시험 열기');
// 원자성: 기록 표에 넣다가 실패하면 지우지도 않음
await db.query(`insert into submissions (student_id, concept, answers, auto) values ($1, 2, '["x"]', '[true]')`, [sid[1]]);
await db.exec(`alter table submission_history add constraint t_fail check (concept <> 2)`);
threw = false;
try { await one('select public.reissue_submissions(array(select id from submissions), false)'); } catch { threw = true; }
ok(threw && (await one('select count(*)::int n from submissions'))[0].n === 1, '재출제: 기록 실패 시 원래 답 그대로');
await db.exec(`alter table submission_history drop constraint t_fail`);

// ---- rev 트리거: 어떤 UPDATE든 1 올림 ----
await db.query(`insert into submissions (student_id, concept, answers, auto) values ($1, 3, '["x"]', '[true]')`, [sid[1]]);
ok((await one('select rev from submissions where concept=3'))[0].rev === 1, '새 제출 rev = 1');
await db.exec(`update submissions set status = 'graded' where concept = 3`);
await db.exec(`update submissions set feedback = 'a', rev = 100 where concept = 3`);
ok((await one('select rev from submissions where concept=3'))[0].rev === 3, 'rev 트리거: 직접 UPDATE도 +1, 임의 rev 값은 무시');
const upd = await one(`update submissions set feedback = 'b' where concept = 3 and rev = 2 returning id`);
ok(upd.length === 0, 'rev 조건: 옛 버전 UPDATE는 0행');
const pr = await one(`select has_function_privilege('anon', 'public.submissions_bump_rev()', 'execute') x`);
ok(pr[0].x === false, '트리거 함수도 anon 실행 불가');

// ---- 오류 기록 표 ----
const rls = await one(`select relrowsecurity r from pg_class where oid = 'public.error_log'::regclass`);
ok(rls[0].r === true, 'error_log: RLS 켜짐 (정책 없음 → anon 접근 불가)');
await db.query(`insert into error_log (path, status, message) values ('/api/me', 502, 'x')`);
let bad1 = false; try { await db.query(`insert into error_log (source) values ('hacker')`); } catch { bad1 = true; }
ok(bad1, 'error_log: source는 server/teacher/student만');

console.log(bad ? `${bad} problems` : 'ALL OK');
process.exit(bad ? 1 : 0);
