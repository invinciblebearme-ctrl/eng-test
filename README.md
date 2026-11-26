# eng-test · 3·4학년 2학기 영어 확인 문제 · 단원평가

학생: https://eng-test.allforedu.kr · 교사: https://eng-test.allforedu.kr/teacher

- **Cloudflare Worker** (`eng4-2-review`): 페이지 + API. 정답은 서버에만 있음
- **Supabase**: 학생 명렬표, 제출 답, 재출제 기록, 시험 열기/닫기
- **Cloudflare R2** (`eng4-review-media`): 단원평가 듣기(mp3)·그림 — 로그인한 학생·교사만 열람

## 학생
- 이름 + 학생 계정 ID로 로그인 → **자기 학년 시험만** 보임
- 4학년: 📘 기본 개념 1~16 / 📝 단원 평가(단어 시험·철자 시험·단원평가)
- 3학년: 📝 단원 평가(10·11단원 철자 시험·단원평가)
- 시험(단어·철자·단원평가)은 한 번만 제출, 낱말 정리·듣기 대본은 제출 뒤에 열림
- 채점 확정된 결과를 문제·내 답·정답과 함께 보고 **출력** (시험별 / 모아 보기)
- 시험별 링크 `/t/번호` 또는 QR로 들어오면 로그인 뒤 그 시험이 바로 열림
- 홈 타일에 지금 할 일이 보임: 지금 풀 시험 · ✏️ 이어서 풀기(임시저장 있음) · 제출 완료(채점 대기) · 결과 확인 · 🔒 잠김. 진행률은 **열린 시험** 기준
- **임시저장**: 푸는 중인 답을 이 기기에 학생·시험·차수별로 저장하고 다시 들어오면 이어서 풀기(“임시저장은 제출이 아니에요”). 문제가 바뀌었으면(`contentVersion`) 옛 답을 불러오지 않음. 저장이 안 되는 기기면 거짓 ‘저장됨’ 없이 알리고, 떠날 때 물어봄. 로그아웃하면 그 학생의 임시저장만 지움
- 제출 전에 한 번만 확인 창: 안 푼 문항·덜 채운 칸(여러 칸·철자·순서 문항 포함) 수와 그 문항으로 가는 버튼
- 목록은 가벼운 `/api/concepts?lite=1`, 문제는 열 때 `/api/concept?concept=번호`, 결과 모아 보기는 `/api/submissions` 한 번

## 교사 (`/teacher`)
메뉴는 일하는 순서대로: **채점·성적(조회·개별 수정) → 검토·공개(작업함) → 분석 → 시험 열기·링크 → 문제·정답 → 명렬표**. 메뉴 아래 한 줄 설명이 있고, 검토·공개 메뉴에 채점 대기 수가 보임.
- **📋 오늘 할 일**: 채점 대기 · 🤖 AI 제안 미검토 · 💬 피드백 미공개 · 📭 미제출 칸(열린 시험 기준)을 반별로 보여 주고 누르면 바로 그 일로 이동 (검토·공개 맨 위, 채점·성적에는 그 반만)
- **채점·성적**: 학년·반 선택, 단원별 보기, 칸을 눌러 한 학생 답 자세히(O/X·남길 말), 일괄 확정, 🤖 AI 제안 받기, 🔄 재채점, **🔁 재출제**(이전 기록 보관), **🖨 결과 일괄 출력**, CSV. 30초마다 새로고침(창이 열려 있거나 AI 작업 중이면 쉼)
  - 상세 창: 채점 대기면 [확정] [저장(대기 유지)] [AI 제안], 확정됐으면 [수정 저장(확정 유지)] [↩ 확정 취소]. 저장 안 한 변경이 있으면 닫기·Esc·배경 클릭 때 물어봄. AI 제안 전에 저장 안 한 O/X를 먼저 저장
  - 선생님이 누른 O/X는 자동 채점과 같아도 `overrides`에 기록 → AI가 바꾸지 않고 AI에게 보내지도 않음
  - 🤖 AI 일괄 작업은 메뉴를 옮겨도 계속되고 머리줄에 진행이 보임. 한 번에 하나만, ⏸ 중지 · ▶ 이어서 · ↻ 실패만 다시
- **✅ 검토·공개 (작업함)**: 틀린 문제를 🧩 문항별 묶음(같은 오답 한 번에 O/X) 또는 🧑‍🎓 학생별 카드로 보고, 💬 피드백 초안을 고친 뒤 선택한 것만 확정+공개. 키보드 J/K·O/X·Space·E·R
  - 저장: O/X·검토함은 바로, 초안은 입력을 멈추고 0.7초 뒤. 카드마다 요청을 차례로 보냄(`saveQueue`, `rev`로 늦은 저장이 새 저장을 덮지 않음). 카드에 저장 중/저장됨/⚠️ 실패(+다시 저장·되돌리기) 표시
  - 저장 안 된 카드가 있으면 확정·공개 버튼이 막히고, 메뉴 이동·새로고침·창 닫기 때 물어봄. 확정할 때 화면의 최신 초안을 함께 보내서 한 행 UPDATE로 확정+공개
  - 카드 상태 구분: 채점 대기/확정됨 · 🤖 AI 제안 · ✓ 검토함 · 💬 초안(미공개)/📣 공개됨
- **📊 분석**: 학년·반별 대시보드(평균 정답률, 반별·세트별 막대, 어려운 문항 Top 10과 자주 나온 오답, 도움이 필요한 학생, 미제출 학생) + Claude 예약 작업 보고서
- **명렬표**: 엑셀 업로드(‘<3학년 1반>’ 형식, 반·번호·이름·학생 계정 ID), ID 수정
  - 저장 전 미리보기: 반마다 ➕ 추가 · ✏️ 이름·ID 바뀜(이어받는 답 수) · ↩ 보관 해제 · 📦 보관될 학생(답 수)
  - **반 전체 바꾸기는 기본 꺼짐**. 켜면 파일에 없는 학생을 지우지 않고 **보관**(목록·로그인에서 빠짐, 답 기록 유지). 보관된 학생은 ‘보관된 학생도 보기’에서 ↩ 복원. 완전 삭제는 답이 하나도 없는 학생만
- **문제·정답**: 세트별 문제와 정답, 듣기·그림 확인
- **🔓 시험 열기·링크**: 시험별 열기/닫기, 링크 복사, QR 카드 출력
- 모든 창은 `role=dialog`·초점 가두기·Esc·닫으면 초점 되돌림(`common.js` `openModal`/`trapModal`), 알림은 `toast(글, 'ok'|'error')`(role=status), 칸 옆 상태는 `statusMsg`

## ⚠️ 오류 알림
- 서버 500번대 오류(DB 오류·AI 오류·업그레이드 필요 등)와 교사·학생 화면의 자바스크립트 오류를 Supabase `error_log` 표에 남김 (`sql/upgrade-2026-11b-errors.sql`로 표 추가, 없으면 기록만 건너뜀)
  - 같은 오류는 1분에 한 번만. 쿼리 문자열·학생 답·토큰은 남기지 않음. 화면 오류는 로그인한 사용자만, 한 페이지에 5건까지. 30일 지난 기록은 자동 삭제
- 교사 화면 맨 위에 “최근 24시간 새 오류 N건 [자세히] [확인함]” (5분마다 확인, ‘확인함’ 이후 새로 생긴 것만)
- 선택: Cloudflare 비밀값 `TELEGRAM_BOT_TOKEN`·`TELEGRAM_CHAT_ID`를 넣으면 텔레그램으로도 알림 (같은 오류 10분에 한 번)
- Cloudflare 로그(`wrangler tail`)에도 `eng-error`로 찍힘

## Claude 예약 작업 (평일 오후)
Supabase에 직접 연결해서 ① 애매한 오답에 🤖 O/X 제안(`ai`, `overrides`) ② 학생별 💬 피드백 초안(`feedback_draft`) ③ 학년별 분석 보고서(`ai_reports`)를 남긴다. `status`·`feedback`은 건드리지 않으므로 **선생님이 확정해야 학생에게 보인다** (일괄 확정 창의 '피드백 초안도 함께 공개').

## 폴더
- `src/content.js` 기본 개념 1~16 · 채점 규칙 · `src/words.js` 단어·철자 시험 · `src/exams.js` 단원평가
- `src/worker.js` API · `src/ai.js` AI 채점 · `public/` 학생·교사 화면
- `schema.sql` Supabase 표(처음 설치) · `sql/upgrade-2026-11.sql` 업그레이드 · `build.mjs` 화면 파일 묶기 · `deploy.sh` 배포
- `test/` 검사: `grade`(정답 규칙) · `triage`(AI 대상) · `api`(실제 Worker + 가짜 Supabase) · `api-sql`(임시 PostgreSQL=PGlite로 DB 함수·권한·원자성) · `teacher-syntax`(화면 스크립트 문법) · `teacher-savequeue`(저장 줄) · `student-*`(학생 화면). `api-mock.mjs` 가짜 Supabase, `serve.mjs` 로컬 서버

## 개발
```bash
npm ci
npm test                  # 빌드 + 모든 검사 (하나라도 실패하면 종료 코드 1, GitHub Actions도 같은 검사)
npm run serve             # 가짜 Supabase·R2·AI + 가짜 학생으로 로컬 실행 (http://127.0.0.1:8787, 교사 test1234, 학생 가짜1반1 / fake101)
                          #   MOCK_SCHEMA=1: 업그레이드 전 DB 흉내, MOCK_MAX_ROWS=3: 쪽 나눔 확인
./deploy.sh               # 필수 검사 → npm test → Cloudflare 업로드 → 응답(HTTP·success) 확인. 실패하면 멈춤
```
실제 사이트에서 학생으로 답을 내지 않는다. 화면 확인은 `npm run serve`와 가짜 이름으로.

## DB 업그레이드 (2026-11, 배포 전에 한 번)
Supabase SQL Editor에서 `sql/upgrade-2026-11.sql` 실행 → `select public.eng_schema_version();` 가 2이면 끝. 여러 번 실행해도 안전하고 기존 학생·제출 값은 바꾸지 않음.
- `students.archived_at`(보관), `submissions.rev`(버전, UPDATE마다 트리거가 +1)
- `reissue_submissions`(재출제: 기록 보관+지우기+시험 열기를 한 트랜잭션), `roster_apply`(명렬표: 추가·수정·보관을 한 트랜잭션) — `SECURITY INVOKER`, `service_role`만 실행(anon·authenticated 실행 불가)
- 업그레이드 전에는 읽기(성적표·학생 로그인·제출)만 예전처럼 되고, 재출제·명렬표 저장·검토 저장 등은 “업그레이드가 필요해요” 안내 후 멈춤(여러 요청으로 나눠 하는 예전 방식으로 돌아가지 않음). 교사 화면 맨 위에도 알림
- Claude 예약 작업이 `feedback_draft`·`ai`를 고쳐도 `rev`가 올라가므로, 그 사이 교사 화면의 옛 저장은 409로 막히고 “새로 불러오기”를 안내

## Cloudflare 설정 (Worker → Settings → Variables and Secrets)
| 이름 | 종류 | 내용 |
|---|---|---|
| `SUPABASE_URL` | Text | Supabase Project URL |
| `SUPABASE_SERVICE_KEY` | Secret | Supabase secret 키 |
| `TEACHER_PASSWORD` | Secret | 교사 비밀번호 |
| `AI_API_URL` · `AI_MODEL` · `AI_API_KEY` | Secret | AI 채점 — 전북AI API Gateway (OpenAI 호환) `https://api.baze.co/v1/gateway/chat/completions/`, 모델 `gemini-3.5-flash-lite` |
| `TELEGRAM_BOT_TOKEN` · `TELEGRAM_CHAT_ID` | Secret | (선택) 오류 알림을 텔레그램으로 |

AI 채점은 토큰을 아끼려고 **판별이 애매한 오답만** 보냄 (`src/triage.js`): 철자 1~2자 차이, 띄어쓰기·문장부호 차이, 말을 덧붙이거나 빠뜨림, 칸 위치 잘못. 빈칸·고르기 문항·전혀 다른 답·대소문자만 틀린 답(대소문자 구별 문항)은 보내지 않고, 보낼 문항이 없으면 AI를 부르지 않음. 규칙 확인: `node test/triage.test.mjs`

## 새 단원평가 추가
1. 문제지 `.hwp`, 문항별 음원 `.zip`, 정답 및 대본 `.hwp`를 받음
2. 그림·음원을 교사 전용 업로드 API(`POST /api/t/media?key=...`)로 R2에 올림
3. `src/exams.js`에 문항 추가 → `npm test` → `./deploy.sh`
