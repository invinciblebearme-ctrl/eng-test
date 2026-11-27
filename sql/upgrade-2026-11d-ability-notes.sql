-- 판도라의 상자: 학생별 AI 설명 (강점·보완할 점·지도 방법·생활기록부 문구 초안)
-- 예약 작업(Claude)이 쓰고 교사 화면에서만 읽음. 학생 화면·학생 API에서는 쓰지 않음.
-- body: {"summary","strength","improve","guide","record"} / based_on: 쓸 때의 점수 (바뀌면 다시 씀)
create table if not exists public.ability_notes (
  student_id bigint primary key references public.students(id) on delete cascade,
  body jsonb not null,
  based_on jsonb,
  updated_at timestamptz not null default now()
);
-- 정책 없음 = 서비스 키(사이트 Worker)만 읽고 씀
alter table public.ability_notes enable row level security;
