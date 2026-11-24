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

## 교사 (`/teacher`)
- **채점·성적**: 학년·반 선택, 단원별 보기, O/X 수정, 일괄 확정, 🤖 AI 채점(선택), 🔄 재채점, **🔁 재출제**(이전 기록 보관), **🖨 결과 일괄 출력**, CSV
- **명렬표**: 엑셀 업로드(‘<3학년 1반>’ 형식, 반·번호·이름·학생 계정 ID), ID 수정
- **문제·정답**: 세트별 문제와 정답, 듣기·그림 확인
- **🔓 시험 열기·링크**: 시험별 열기/닫기, 링크 복사, QR 카드 출력

## 폴더
- `src/content.js` 기본 개념 1~16 · 채점 규칙 · `src/words.js` 단어·철자 시험 · `src/exams.js` 단원평가
- `src/worker.js` API · `src/ai.js` AI 채점 · `public/` 학생·교사 화면
- `schema.sql` Supabase 표 · `build.mjs` 화면 파일 묶기 · `deploy.sh` 배포

## 개발
```bash
npm install
node build.mjs            # public/ → src/assets.js
node test/grade.test.mjs  # 모든 문항 정답이 채점 규칙에 맞는지 확인
node test/serve.mjs       # 가짜 Supabase·R2로 로컬 실행 (http://127.0.0.1:8787)
./deploy.sh               # Cloudflare에 배포 (API 토큰 필요)
```

## Cloudflare 설정 (Worker → Settings → Variables and Secrets)
| 이름 | 종류 | 내용 |
|---|---|---|
| `SUPABASE_URL` | Text | Supabase Project URL |
| `SUPABASE_SERVICE_KEY` | Secret | Supabase secret 키 |
| `TEACHER_PASSWORD` | Secret | 교사 비밀번호 |
| `AI_API_URL` · `AI_MODEL` · `AI_API_KEY` | Text·Text·Secret | (선택) AI 채점 — OpenAI 호환 형식 |

## 새 단원평가 추가
1. 문제지 `.hwp`, 문항별 음원 `.zip`, 정답 및 대본 `.hwp`를 받음
2. 그림·음원을 교사 전용 업로드 API(`POST /api/t/media?key=...`)로 R2에 올림
3. `src/exams.js`에 문항 추가 → `node test/grade.test.mjs` → `./deploy.sh`
