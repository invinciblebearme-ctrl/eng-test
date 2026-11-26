# eng-test 작업 규칙

- 답변은 한국어로 한다.
- **고칠 때마다 GitHub에 커밋하고 푸시한다** (버전 관리). 기능 하나·수정 하나가 끝나면 `node build.mjs` → `node test/grade.test.mjs` → `./deploy.sh` → `git commit` → `git push origin main`. 커밋 메시지는 무엇을 왜 바꿨는지 한국어로 짧게.
- 커밋하면 안 되는 것: API 키·비밀번호 파일, 학생 실명·ID가 든 테스트 파일(`test/*-e2e.cjs`는 gitignore), 출판사 원본(hwp·mp3·그림).
- 실제 사이트에서 학생으로 답을 내지 않는다. 화면 확인은 `node test/serve.mjs`(가짜 Supabase·R2)와 가짜 학생 이름으로.
- 학생에게 보이는 것(확정, 선생님 말씀)은 선생님이 확인한 뒤에만 바꾼다.
