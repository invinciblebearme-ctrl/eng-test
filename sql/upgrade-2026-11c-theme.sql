-- 2026-11c 업그레이드: 앱 공통 설정 표 (교사가 지정하는 학생 화면 테마 등)
-- Supabase SQL Editor에서 한 번 실행. 여러 번 실행해도 안전. 기존 표·행은 건드리지 않음.
-- 이 표가 없어도 앱은 기본 테마('default')로 정상 동작함.
begin;
create table if not exists public.app_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
-- 다른 표와 같이 RLS만 켜고 정책 없음 → 공개 키(anon)로는 읽기·쓰기 불가, Worker(서비스 키)만
alter table public.app_settings enable row level security;
commit;
