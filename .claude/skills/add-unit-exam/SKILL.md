---
name: add-unit-exam
description: eng-test 사이트(3·4학년 영어 확인 문제·단원평가)에 새 단원을 추가하는 절차. 출판사에서 받은 단원평가 압축 파일(문제지 .hwp, 문항별 음원 .zip, 정답 및 대본 .hwp)을 온라인 시험으로 만들고, Portfolio(New Words·Key Expressions) 학습지 사진으로 철자 시험을 만들고, 듣기·그림을 R2에 올리고, 테스트·배포·커밋까지 한다. 사용자가 "○단원 추가", "단원평가 올려줘", "download_N.zip", "영어3(함)/영어4(함) ○단원", "Portfolio", "New Words 철자 시험", ".hwp 문제지와 음원"을 말하거나 그런 파일을 올리면 이 스킬을 쓴다. 정답·대본 파일만 따로 올라와도(이미 있는 단원평가의 정답 채우기) 이 스킬을 쓴다.
---

# 새 단원 추가 (단원평가 · 철자 시험)

이 저장소는 Cloudflare Worker 하나(`src/worker.js`)가 학생·교사 화면과 API를 맡고, 문제는 코드(`src/exams.js`, `src/words.js`)에, 학생·답은 Supabase에, 듣기·그림은 R2에 있다. 새 단원 추가는 **코드에 문항을 넣고 → 음원·그림을 올리고 → 배포**하는 일이다. DB 표는 바꿀 필요가 없다.

문항 형식과 예시는 `references/question-format.md`에 있다. 문항을 쓰기 전에 읽는다.

## 0. 먼저 확인할 것 (사용자에게 물어보기 전에 파일로 판단)
- **학년**: 파일 이름의 `영어3` = 3학년, `영어4` = 4학년. 사용자가 말한 학년과 다르면 **작업 전에 알린다** (예전에 3학년 파일을 4학년으로 받을 뻔한 일이 있었다).
- **단원**: 문제지 첫머리 `10. What Time Is It?` 같은 제목. Portfolio 사진의 `Lesson 11 …` 제목과 단원평가 제목이 같은 단원인지 확인한다. 다르면 알린다.
- **정답 파일**: 없으면 그림·글로 확실한 문항만 정답을 넣고, 듣기 문항은 `a: null`(정답 미입력)로 두고 정답 파일을 요청한다. 듣기 정답을 추측하지 않는다 — 학생 점수가 틀리게 나가기 때문.
- **이미 있는 단원인지**: `grep -n "ukey: '<단원>'" src/exams.js src/words.js`.

## 1. 파일 풀기·읽기
```bash
SK=.claude/skills/add-unit-exam/scripts; W=<작업 폴더(스크래치)>
python3 -I $SK/unpack_zip.py <download.zip> $W            # exam.hwp, answer.hwp, audio/q01.mp3…
pip install -q olefile pillow                               # 처음 한 번
python3 -I $SK/hwp_extract.py $W/exam.hwp $W/ex             # text.txt, seq.txt, BIN*
python3 -I $SK/hwp_extract.py $W/answer.hwp $W/ans          # 정답·대본
python3 -I $SK/prep_images.py $W/ex $W/web                  # BIN*.jpg + contact.png
```
- `ans/text.txt`의 `정답` 줄(`01 ①  02 ⑤ …`)과 `대본`을 읽는다.
- `ex/seq.txt`로 **그림이 어느 문항·보기에 붙는지** 본다. 순서는 `T 01 …` → `T ①` → `P BIN0001.bmp` 처럼 보기 번호 바로 뒤에 그림이 온다. 같은 그림이 여러 문항에 다시 쓰이기도 한다(예: 10~12번 보기 그림 3장 공유).
- `web/contact.png`를 Read로 보고 **그림 문제마다 정답이 그림과 맞는지** 확인한다(예: "08:20 아침 식사 그림 → ①").

## 2. 정답 점검 (이상한 문항)
정답·대본·보기를 서로 대 본다. 출판사 자료에도 오류가 있었다:
- 대본은 "I can jump."인데 보기 ⑤가 "점프할 수 **없어**" → 대본에 맞게 **보기 글자를 고치고** 코드에 주석을 단다.
- 질문과 음원 속 대답이 어긋남 → 음원은 못 고치므로 **문제 글을 조정**해 정답이 하나가 되게 한다.
고친 것은 모두 사용자에게 알린다. 고치기 애매하면 정답 파일 그대로 두고 알린다.

## 3. 문항 넣기
- 단원평가: `src/exams.js`의 `EXAMS`에 세트 추가. 위쪽에 `const G4U12 = (n) => \`g4u12/img/${n}.jpg\`;` 같은 도우미를 만든다.
- R2 접두어 규칙: `g{학년}u{단원}` (예: `g4u12`, `g3u12`). 예전 3학년 10·11단원만 `u10`, `u11`을 쓴다 — 건드리지 않는다.
- `summary`에는 듣기 대본을 넣는다 (학생에게는 **제출 뒤에만** 열린다).
- 철자 시험: Portfolio 사진의 New Words(단어·뜻)와 Key Expressions(영어·우리말)를 `src/words.js` 끝에 `WORD_SETS.push(...)`.
- 새 단원 키면 `UNITS`에 추가. `id`는 기존 최댓값 + 1 (`grep -ho "id: [0-9]*" src/*.js | sort -t' ' -k2 -n | tail -1`).

## 4. 검사
```bash
node build.mjs && node test/grade.test.mjs    # 모든 문항의 정답이 채점 규칙으로 '정답' 처리되는지
```
`grade.test.mjs`는 정답 채점, 기본 개념 10문항, 세트 번호(id) 중복을 확인한다. `ALL OK`가 나와야 한다. 정답 미입력 문항은 `pending`으로 따로 표시된다.

가능하면 로컬에서 화면도 본다: `MEDIA_DIR=<음원·그림 폴더> node test/serve.mjs` → Playwright로 교사 `/?preview=<id>` 미리보기(교사 로그인 비밀번호 `test1234`)를 열어 듣기·그림·보기가 나오는지 확인.

## 5. 음원·그림 올리기 → 배포
```bash
TEACHER_PASSWORD=<교사 비밀번호> $SK/upload_media.sh https://eng4-2-review.invinciblebearme.workers.dev g4u12 $W/audio $W/web
./deploy.sh
```
- 교사 비밀번호는 사용자에게 받은 값을 쓰고 코드·커밋에 적지 않는다.
- 업로드 후 스크립트가 크기를 비교한다. `size mismatch`가 없어야 한다.
- 배포 뒤 실제 사이트 확인: 해당 학년 학생으로 로그인 → `/api/concepts`에 새 세트가 있는지, `/media/<키>?t=<토큰>`이 200인지.

## 6. 커밋·푸시
```bash
git add -A && git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -m "<학년> <단원> 단원평가·철자 시험 추가" && git push origin main
```
- **학생 실명·학생 계정 ID가 든 파일은 커밋하지 않는다** (`.gitignore`가 `test/*-e2e.cjs`를 막는다). 출판사 원본(hwp, mp3, 그림)도 저장소에 넣지 않는다 — R2에만 둔다.

## 7. 사용자에게 알릴 것
- 학년·단원·세트 이름, 문항 수(듣기 몇 개), 철자 시험 단어·표현 수
- 정답 출처(정답 파일 / 그림으로 판단 / 미입력), 고친 이상한 문항
- 새 시험은 **열림** 상태로 시작한다 → 아직 풀게 하지 않을 거면 교사 화면 "🔓 시험 열기·링크"에서 닫으라고 안내
- 시험 링크: `https://eng-test.allforedu.kr/t/<id>` (같은 탭에서 QR 확대·복사 가능)
