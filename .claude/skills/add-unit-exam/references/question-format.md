# 문항 형식 (src/content.js 채점 규칙 기준)

정답(`a`)은 서버에만 있고 학생에게는 지워져서 나간다. 채점은 `src/content.js`의 `gradeOne()`.

## 공통 필드
| 필드 | 뜻 |
|---|---|
| `t` | 형식: `choice` `text` `pick` `multi` `order` `time` `spell` `spellmean` |
| `q` | 문제 글. `\n` 줄바꿈 가능. `[i]`처럼 대괄호 글자는 **밑줄**로 보임 (예: `d[i]nner`) |
| `a` | 정답. `null`이면 "정답 미입력" (나중에 넣고 교사 화면 🔄 재채점) |
| `audio` | R2 음원 키 (예: `'g4u12/q03.mp3'`) → ▶ 재생 버튼 |
| `img` / `imgs` | 문제 그림 하나 / 여러 개 (R2 키) |
| `optImg` | 보기 그림 (opts 순서와 같게) → 그림을 눌러 고름 |
| `say` | 브라우저가 읽어 주는 영어 (🔊 버튼, 단어·철자 시험용) |
| `cs: true` | 대소문자 구별 (문장, 요일 등) |

## 단원평가에서 쓰는 형식
```js
// 보기 고르기: opts 글자와 a가 똑같아야 함
{ t: 'choice', q: '잘 듣고, 다음 표현의 우리말 뜻으로 알맞은 것을 고르세요.', audio: 'g4u12/q02.mp3',
  opts: ['① 뭐 하고 있니?', '② …', '③ …', '④ …', '⑤ …'], a: '① 뭐 하고 있니?' },
// 보기가 음원 속에만 있으면 번호만
{ t: 'choice', q: '잘 듣고, 이어질 응답으로 알맞은 것을 고르세요.', audio: 'g4u12/q09.mp3', opts: N5, a: '④' },
// 그림 고르기
{ t: 'choice', q: '잘 듣고, 알맞은 그림을 고르세요.', audio: 'g4u12/q03.mp3', opts: ['①', '②'], optImg: [P('BIN0001'), P('BIN0002')], a: '①' },
// ○/×
{ t: 'choice', q: '잘 듣고, 그림과 일치하면 ○, 일치하지 않으면 ×를 고르세요.', audio: 'g4u12/q07.mp3', img: P('BIN0005'), opts: ['○', '×'], a: '×' },
// 쓰기 (여러 정답 허용은 배열)
{ t: 'text', q: '잘 듣고, 빈칸에 알맞은 단어를 쓰세요.\nB: I’m making ______s.', audio: 'g4u12/q15.mp3', a: ['cookie', 'cookies'] },
```
`N5 = ['①','②','③','④','⑤']`, `P = (n) => \`g4u12/img/${n}.jpg\`` 처럼 파일 위쪽에 도우미를 둔다.

## 시험 세트 (src/exams.js 의 EXAMS 배열에 추가)
```js
{
  id: 31, grade: 4, kind: 'exam', ukey: '12', short: '평가12', unit: '12단원', title: '12단원 단원평가 (영어 제목)',
  lead: '🎧 듣기 문제(1~15번)는 ▶ 버튼을 눌러 들어요. 여러 번 들어도 돼요.',
  summary: `<div class="card"><h4>📖 듣기 대본</h4><div class="small" style="white-space:pre-line">01 …\n02 …</div></div>`,  // 제출 뒤에만 보임
  questions: [ … 20문항 … ],
}
```
- `id`: 지금 쓰는 가장 큰 번호 + 1 (DB 허용 1~100). 이미 쓴 번호는 절대 다시 쓰지 않는다 (학생 답이 그 번호에 묶여 있음).
- `grade`: 3 또는 4. 학생은 자기 학년 세트만 본다.
- `ukey`: 단원 메뉴 키. 4학년 `'7'…'11'`,`'s'`(소리와 철자) / 3학년 `'3-10'`,`'3-11'`. **새 단원이면 `src/words.js`의 `UNITS`에 `{ grade, key, name, title }` 추가.**
- `short`: 교사 성적표 열 이름 (짧게).

## 철자 시험 (Portfolio 학습지 → src/words.js 끝에 WORD_SETS.push)
```js
WORD_SETS.push({
  id: 32, grade: 4, kind: 'spelltest', ukey: '12', short: '철자12', unit: '12단원', title: '12단원 New Words · Key Expressions 철자 시험', lead: LEAD,
  summary: spellSummary([['word', '뜻'], …], [['Key expression.', '우리말'], …]),
  questions: [
    sm('cookie', ['쿠키', '과자']),                       // 단어: 우리말 뜻 여러 개 허용
    sm(['I’m doing homework.', 'I am doing homework.'], ['나는 숙제를 하고 있어', '숙제를 하고 있어'], true),  // 문장: cs=true
  ],
});
```
- `sm(영어, [우리말 뜻들], 대소문자구별)`: 🔊 듣고 **철자와 뜻을 둘 다** 써야 정답. 우리말은 띄어쓰기·문장부호 무시.
- 뜻이 "11, 열하나"처럼 여러 개면 각각 허용. 흔한 다른 말(형/오빠/남동생 등)도 넣어 둔다. 목록에 없는 표현은 교사가 O/X로 고치거나 AI 채점.
- 영어 축약형은 둘 다 허용 (`He’s` / `He is`). `’`와 `'`는 같게 채점됨.
