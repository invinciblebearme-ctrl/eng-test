// 단원평가 (영어3(함) 단원평가 3회) — 문항별 음원·그림은 R2(eng4-review-media)에 있음
// audio: 듣기 파일, img/imgs: 문제 그림, optImg: 보기 그림(보기 순서대로)
const N5 = ['①', '②', '③', '④', '⑤'];
const P = (n) => `u11/img/${n}.jpg`;
const P10 = (n) => `u10/img/${n}.jpg`;
const G4 = (n) => `g4u10/img/${n}.jpg`;
const G411 = (n) => `g4u11/img/${n}.jpg`;
// a: null = 정답 미입력 (정답을 넣고 교사 화면에서 '재채점'하면 다시 채점됨)
const PENDING = null;

export const EXAMS = [
  {
    id: 25, grade: 3, kind: 'exam', ukey: '3-11', short: '평가11', unit: '11단원', title: '11단원 단원평가 (He’s My Dad)',
    lead: '🎧 듣기 문제(1~15번)는 ▶ 버튼을 눌러 들어요. 여러 번 들어도 돼요.',
    summary: `<div class="card"><h4>📖 듣기 대본</h4><div class="small" style="white-space:pre-line">01 G: Who’s he? / B: He’s my dad.
02 B: She’s my sister.
03 G: She’s my grandmother.
04 G: She’s my mom.
05 G: Who’s she? / B: ① She’s my sister. ② He’s my dad. ③ He’s my brother. ④ He’s my grandfather. ⑤ He’s my friend.
06 G: Who’s he? / B: He’s my brother.
07 G: ① He’s my dad. ② He’s my grandfather. ③ He’s my brother. ④ She’s my mom. ⑤ She’s my grandmother.
08 G: Who’s he? / B: ① She’s my friend. ② She’s my mom. ③ She’s my sister. ④ She’s my grandmother. ⑤ He’s my brother.
09 G: Who’s she? / B: She’s my sister.
10 G: She’s tall.
11 B: He’s my grandfather.
12 B: He’s my dad.
13 ① Who’s he? – He’s my brother. ② Who’s she? – She’s my grandmother. ③ Who’s he? – He’s my dad. ④ Who’s she? – She’s my mom. ⑤ Who’s he? – She’s my sister.
14 W: many
15 G: Who’s he? / B: He’s my brother.</div></div>`,
    questions: [
      { t: 'choice', q: '잘 듣고, 알맞은 그림을 고르세요.', audio: 'u11/q01.mp3', opts: ['①', '②'], optImg: [P('BIN0001'), P('BIN0002')], a: '①' },
      { t: 'choice', q: '잘 듣고, 다음 표현의 우리말 뜻으로 알맞은 것을 고르세요.', audio: 'u11/q02.mp3',
        opts: ['① 그는 나의 아빠셔.', '② 그녀는 나의 엄마셔.', '③ 그는 나의 할아버지셔.', '④ 그녀는 나의 할머니셔.', '⑤ 그녀는 나의 여동생이야.'], a: '⑤ 그녀는 나의 여동생이야.' },
      { t: 'choice', q: '잘 듣고, 알맞은 그림을 고르세요.', audio: 'u11/q03.mp3', opts: ['①', '②'], optImg: [P('BIN000C'), P('BIN0003')], a: '②' },
      { t: 'choice', q: '잘 듣고, 다음 표현의 우리말 뜻으로 알맞은 것을 고르세요.', audio: 'u11/q04.mp3',
        opts: ['① 그는 나의 할아버지셔.', '② 그는 키가 엄청 크시구나.', '③ 그녀는 나의 여동생이야.', '④ 그녀는 나의 엄마셔.', '⑤ 그녀는 예쁘시구나.'], a: '④ 그녀는 나의 엄마셔.' },
      { t: 'choice', q: '잘 듣고, 이어질 응답으로 알맞은 것을 고르세요.', audio: 'u11/q05.mp3', opts: N5, a: '①' },
      { t: 'choice', q: '잘 듣고, 알맞은 그림을 고르세요.', audio: 'u11/q06.mp3', opts: ['①', '②'], optImg: [P('BIN0004'), P('BIN0005')], a: '①' },
      { t: 'choice', q: '잘 듣고, 우리말 뜻이 다음과 같은 표현을 고르세요.\n「그는 내 할아버지셔.」', audio: 'u11/q07.mp3', opts: N5, a: '②' },
      { t: 'choice', q: '잘 듣고, 이어질 응답으로 알맞은 것을 고르세요.', audio: 'u11/q08.mp3', opts: N5, a: '⑤' },
      { t: 'choice', q: '잘 듣고, 그림과 일치하면 ○, 일치하지 않으면 ×를 고르세요.', audio: 'u11/q09.mp3', img: P('BIN0006'), opts: ['○', '×'], a: '×' },
      ...[['u11/q10.mp3', '②'], ['u11/q11.mp3', '③'], ['u11/q12.mp3', '①']].map(([au, a]) => (
        { t: 'choice', q: '잘 듣고, 알맞은 그림을 고르세요.', audio: au, opts: ['①', '②', '③'], optImg: [P('BIN0001'), P('BIN0007'), P('BIN000C')], a })),
      { t: 'choice', q: '잘 듣고, 대화가 어색한 것을 고르세요.', audio: 'u11/q13.mp3', opts: N5, a: '⑤' },
      { t: 'choice', q: '잘 듣고, 들려주는 단어와 첫소리가 같은 단어를 고르세요.', audio: 'u11/q14.mp3',
        opts: ['① brother', '② dad', '③ grandmother', '④ grandfather', '⑤ mom'], a: '⑤ mom' },
      { t: 'text', q: '잘 듣고, 빈칸에 알맞은 단어를 쓰세요.\nA: Who’s he?\nB: He’s my _________.', audio: 'u11/q15.mp3', a: 'brother' },
      { t: 'choice', q: '그림에 알맞은 단어를 고르세요.', img: P('BIN0002'), opts: ['① brother', '② dad', '③ grandmother', '④ grandfather', '⑤ mom'], a: '⑤ mom' },
      { t: 'choice', q: '그림이 나타내는 단어의 공통된 첫소리 글자를 고르세요.', imgs: [P('BIN0008'), P('BIN0009'), P('BIN000A')], opts: ['M', 'N'], a: 'M' },
      { t: 'choice', q: '다음 빈칸에 알맞은 알파벳을 고르세요.\nSh□’s tall.', opts: ['① a', '② e', '③ i', '④ o', '⑤ u'], a: '② e' },
      { t: 'text', q: '그림에 알맞은 단어를 <보기>에서 골라 쓰세요.\n<보기> dad   mom   sister', img: P('BIN000B'), a: 'dad' },
      { t: 'text', q: '그림에 알맞은 단어를 <보기>에서 골라 쓰세요. (화살표가 가리키는 사람)\n<보기> dad   mom   sister', img: P('BIN0005'), a: 'sister' },
    ],
  },
  {
    id: 27, grade: 3, kind: 'exam', ukey: '3-10', short: '평가10', unit: '10단원', title: '10단원 단원평가 (Can You Jump?)',
    lead: '🎧 듣기 문제(1~15번)는 ▶ 버튼을 눌러 들어요. 여러 번 들어도 돼요.',
    summary: `<div class="card"><h4>📖 듣기 대본</h4><div class="small" style="white-space:pre-line">01 B: Can you skate? / G: Yes, I can. I can skate.
02 G: Can you sing?
03 G: ① I can’t skate. ② I can’t swim.
04 B: I can jump.
05 G: Can you dance?
06 G: Can you jump? / B: Yes, I can. I can jump.
07 G: ① Can you dance? ② Can you jump? ③ Can you sing? ④ Can you swim? ⑤ Can you run?
08 G: Can you skate? / B: ① I’m fine. ② That’s okay. ③ Can you sing? ④ Can you swim? ⑤ Yes, I can. I can sing. (※ 음원 그대로: 질문은 skate, 대답은 sing)
09 B: Can you run? / G: Yes, I can. I can run.
10 B: I can swim.
11 B: I can sing.
12 G: I can skate.
13 ① Can you swim? – Yes, I can. I can swim. ② Can you run? – No, I can’t. I can’t run. ③ Can you sing? – Yes, I can. I can sing. ④ Can you jump? – No, I can’t. I can’t jump. ⑤ Can you dance? – Yes, I can. I can skate.
14 W: sing
15 M: You can do it.</div></div>`,
    questions: [
      { t: 'choice', q: '잘 듣고, 알맞은 그림을 고르세요.', audio: 'u10/q01.mp3', opts: ['①', '②'], optImg: [P10('BIN0001'), P10('BIN0002')], a: '①' },
      { t: 'choice', q: '잘 듣고, 다음 표현의 우리말 뜻으로 알맞은 것을 고르세요.', audio: 'u10/q02.mp3',
        opts: ['① 너 수영할 수 있니?', '② 너 점프할 수 있니?', '③ 너 달릴 수 있니?', '④ 너 노래할 수 있니?', '⑤ 너 스케이트 탈 수 있니?'], a: '④ 너 노래할 수 있니?' },
      { t: 'choice', q: '잘 듣고, 그림에 알맞은 표현을 고르세요.', audio: 'u10/q03.mp3', img: P10('BIN0003'), opts: ['①', '②'], a: '②' },
      { t: 'choice', q: '잘 듣고, 다음 표현의 우리말 뜻으로 알맞은 것을 고르세요.', audio: 'u10/q04.mp3',
        opts: ['① 나는 춤출 수 있어.', '② 나는 춤출 수 없어.', '③ 나는 노래할 수 있어.', '④ 나는 노래할 수 없어.', '⑤ 나는 점프할 수 있어.'], a: '⑤ 나는 점프할 수 있어.' },   // 원본 보기 ⑤ '점프할 수 없어'는 대본(I can jump.)과 맞지 않아 고침
      { t: 'choice', q: '잘 듣고, 이어질 응답으로 알맞은 것을 고르세요.', audio: 'u10/q05.mp3',
        opts: ['① Yes, I can. I can run.', '② Yes, I can. I can swim.', '③ No, I can’t. I can’t skate.', '④ No, I can’t. I can’t dance.', '⑤ No, I can’t. I can’t jump.'], a: '④ No, I can’t. I can’t dance.' },
      { t: 'choice', q: '잘 듣고, 알맞은 그림을 고르세요.', audio: 'u10/q06.mp3', opts: ['①', '②', '③'], optImg: [P10('BIN000C'), P10('BIN000D'), P10('BIN000E')], a: '②' },
      { t: 'choice', q: '잘 듣고, 우리말 뜻이 다음과 같은 표현을 고르세요.\n「너 달릴 수 있니?」', audio: 'u10/q07.mp3', opts: N5, a: '⑤' },
      { t: 'choice', q: '잘 듣고, 질문에 대한 대답으로 알맞은 것을 고르세요. (할 수 있는지 묻는 질문에 알맞게 대답한 것)', audio: 'u10/q08.mp3', opts: N5, a: '⑤' },
      { t: 'choice', q: '잘 듣고, 그림과 일치하면 ○, 일치하지 않으면 ×를 고르세요.', audio: 'u10/q09.mp3', img: P10('BIN0004'), opts: ['○', '×'], a: '○' },
      ...[['u10/q10.mp3', '②'], ['u10/q11.mp3', '③'], ['u10/q12.mp3', '①']].map(([au, a]) => (
        { t: 'choice', q: '잘 듣고, 알맞은 그림을 고르세요.', audio: au, opts: ['①', '②', '③'], optImg: [P10('BIN0005'), P10('BIN0006'), P10('BIN0007')], a })),
      { t: 'choice', q: '잘 듣고, 대화가 어색한 것을 고르세요.', audio: 'u10/q13.mp3', opts: N5, a: '⑤' },
      { t: 'choice', q: '잘 듣고, 들려주는 단어와 첫소리가 같은 단어를 고르세요.', audio: 'u10/q14.mp3',
        opts: ['① apple', '② hat', '③ skate', '④ key', '⑤ tomato'], a: '③ skate' },
      { t: 'text', q: '잘 듣고, 빈칸에 알맞은 단어를 쓰세요.\nYou ______ do it!', audio: 'u10/q15.mp3', a: 'can' },
      { t: 'choice', q: '그림에 알맞은 단어를 고르세요.', img: P10('BIN0008'), opts: ['① run', '② swim', '③ skate', '④ ski', '⑤ sing'], a: '⑤ sing' },
      { t: 'choice', q: '그림을 보고, 단어의 첫 글자로 알맞은 것을 고르세요.', img: P10('BIN0009'), opts: ['D', 'S'], a: 'D' },
      { t: 'choice', q: '다음 빈칸에 알맞은 알파벳을 고르세요.\nYe□, I can.', opts: ['① a', '② c', '③ m', '④ s', '⑤ u'], a: '④ s' },
      { t: 'text', q: '그림에 알맞은 단어를 <보기>에서 골라 쓰세요.\n<보기> high   helmet   hat', img: P10('BIN000A'), a: 'high' },
      { t: 'text', q: '그림에 알맞은 단어를 <보기>에서 골라 쓰세요. (화살표가 가리키는 것)\n<보기> high   helmet   hat', img: P10('BIN000B'), a: 'helmet' },
    ],
  },
  {
    id: 28, grade: 4, kind: 'exam', ukey: '10', short: '평가10', unit: '10단원', title: '10단원 단원평가 (What Time Is It?)',
    lead: '🎧 듣기 문제(1~15번)는 ▶ 버튼을 눌러 들어요. 여러 번 들어도 돼요.',
    summary: `<div class="card"><h4>📖 듣기 대본</h4><div class="small" style="white-space:pre-line">01 M: ① hat ② bed ③ sing ④ doll ⑤ fun
02 G: It’s time for dinner.
03 G: What time is it? / B: It’s eight twenty. It’s time for breakfast.
04 ① It’s six ten. ② It’s six twenty. ③ It’s six thirty. ④ It’s six forty. ⑤ It’s six fifty. (G: What time is it?)
05 G: ① It’s time for breakfast. ② It’s time for school. ③ It’s time for lunch. ④ It’s time for dinner. ⑤ It’s time for bed.
06 G: ① What time is it? ② What color is it? ③ What’s your name? ④ What’s this? ⑤ What’s that?
07 W: Eric, it’s time for dinner. / B: What time is it? / W: It’s six ten.
08 G: What time is it? / B: It’s ten thirty.
09 G: What time is it? / B: ① That’s okay. ② It’s nine fifty. ③ It’s five hundred won. ④ It’s Wednesday. ⑤ It’s a comic book.
10 W: ① king ② dinner ③ milk ④ kick ⑤ seven
11 G: What time is it? / B: It’s twelve fifty.
12 B: ① It’s ten. ② It’s ten twenty. ③ It’s ten thirty. ④ It’s ten forty. ⑤ It’s ten fifty.
13 ① I’m busy. ② I have a cooking class. ③ It’s Monday. ④ It’s a toy car. ⑤ It’s four ten. (G: What time is it?)
14 B: What time is it? / G: ① It’s blue. ② You can do it. ③ It’s eleven twenty. ④ I can jump. ⑤ Let’s go.
15 ① It’s eight. It’s time for breakfast. ② It’s eight thirty. It’s time for school. ③ It’s twelve thirty. It’s time for lunch. ④ It’s six forty. It’s time for dinner. ⑤ It’s ten fifty. It’s time for bed.</div></div>`,
    questions: [
      { t: 'choice', q: '잘 듣고, 주어진 단어의 밑줄 친 부분과 같은 소리가 포함된 것을 고르세요.\nd[i]nner', audio: 'g4u10/q01.mp3', opts: N5, a: '③' },
      { t: 'choice', q: '잘 듣고, 다음 표현의 우리말 뜻으로 알맞은 것을 고르세요.', audio: 'g4u10/q02.mp3',
        opts: ['① 아침 먹을 시간이야.', '② 점심 먹을 시간이야.', '③ 저녁 먹을 시간이야.', '④ 학교 갈 시간이야.', '⑤ 잘 시간이야.'], a: '③ 저녁 먹을 시간이야.' },
      { t: 'choice', q: '잘 듣고, 대화에 알맞은 그림을 고르세요.', audio: 'g4u10/q03.mp3', opts: ['①', '②'], optImg: [G4('BIN0001'), G4('BIN0002')], a: '①' },
      { t: 'choice', q: '잘 듣고, 그림에 알맞은 대화를 고르세요.', audio: 'g4u10/q04.mp3', img: G4('BIN0003'), opts: N5, a: '⑤' },
      { t: 'choice', q: '잘 듣고, 그림에 알맞은 문장을 고르세요.', audio: 'g4u10/q05.mp3', img: G4('BIN0002'), opts: N5, a: '②' },
      { t: 'choice', q: '잘 듣고, 우리말 뜻이 다음과 같은 표현을 고르세요.\n「몇 시니?」', audio: 'g4u10/q06.mp3', opts: N5, a: '①' },
      { t: 'choice', q: '잘 듣고, 그림과 일치하면 ○, 일치하지 않으면 ×를 고르세요.', audio: 'g4u10/q07.mp3', img: G4('BIN0004'), opts: ['○', '×'], a: '○' },
      { t: 'text', q: '잘 듣고, 빈칸에 알맞은 단어를 쓰세요.\nA: What time is it?\nB: It’s ten ______.', audio: 'g4u10/q08.mp3', a: 'thirty' },
      { t: 'choice', q: '잘 듣고, 이어질 응답으로 알맞은 것을 고르세요.', audio: 'g4u10/q09.mp3', img: G4('BIN000E'), opts: N5, a: '②' },
      { t: 'choice', q: '잘 듣고, 주어진 단어의 밑줄 친 부분과 같은 소리가 포함되지 않은 것을 고르세요.\ns[i]ng', audio: 'g4u10/q10.mp3', opts: N5, a: '⑤' },
      { t: 'choice', q: '잘 듣고, 알맞은 그림을 고르세요.', audio: 'g4u10/q11.mp3', opts: ['①', '②'], optImg: [G4('BIN0005'), G4('BIN000D')], a: '②' },
      { t: 'choice', q: '잘 듣고, 그림에 알맞은 표현을 고르세요.', audio: 'g4u10/q12.mp3', img: G4('BIN0006'), opts: N5, a: '③' },
      { t: 'choice', q: '잘 듣고, 대화가 자연스러운 것을 고르세요.', audio: 'g4u10/q13.mp3', opts: N5, a: '⑤' },
      { t: 'choice', q: '잘 듣고, 이어질 응답으로 알맞은 것을 고르세요.', audio: 'g4u10/q14.mp3', opts: N5, a: '③' },
      { t: 'choice', q: '잘 듣고, 그림에 알맞은 대화를 고르세요.', audio: 'g4u10/q15.mp3', img: G4('BIN0007'), opts: N5, a: '②' },
      { t: 'text', q: '그림에 알맞은 단어를 쓰세요.', img: G4('BIN0008'), a: 'school' },
      { t: 'choice', q: '그림에 알맞은 문장을 고르세요.', img: G4('BIN000C'), opts: ['① It’s time for breakfast.', '② It’s time for lunch.', '③ It’s time for dinner.', '④ It’s time for school.', '⑤ It’s time for bed.'], a: '⑤ It’s time for bed.' },
      { t: 'text', q: '그림을 보고, 알맞은 어구를 <보기>에서 골라 쓰세요.\n<보기> time for breakfast   time for dinner\nIt’s ____________.', img: G4('BIN0009'), a: 'time for dinner' },
      { t: 'text', q: '그림에 알맞은 단어를 <보기>에서 골라 쓰세요.\n<보기> music   time   movie', img: G4('BIN000A'), a: 'movie' },
      { t: 'choice', q: '그림에 알맞은 문장을 고르세요.', img: G4('BIN000B'), opts: ['① It’s ten twenty.', '② It’s ten thirty.', '③ It’s ten forty.'], a: '① It’s ten twenty.' },
    ],
  },
  {
    id: 29, grade: 4, kind: 'exam', ukey: '11', short: '평가11', unit: '11단원', title: '11단원 단원평가 (I’m Drawing a Picture)',
    lead: '🎧 듣기 문제(1~15번)는 ▶ 버튼을 눌러 들어요. 여러 번 들어도 돼요.',
    summary: `<div class="card"><h4>📖 듣기 대본</h4><div class="small" style="white-space:pre-line">01 M: desk, bed
02 B: What are you doing?
03 G: I’m playing a game.
04 G: Can I help you? / B: ① Sure. ② That’s too bad. ③ Help yourself. ④ I’m reading a book. ⑤ I’m making cookies.
05 Grandma: What are you doing? / B: ① I’m playing a game. ② I’m making cookies. ③ I’m doing homework. ④ I’m cleaning the table. ⑤ I’m drawing a picture.
06 G: I’m making cookies.
07 B: I’m drawing a picture.
08 G: ① What color is it? ② What do you want? ③ Can you jump? ④ Can I help you? ⑤ Can you swim?
09 G: What are you doing? / B: ① It’s in the box. ② It’s a book. ③ I’m thirsty. ④ I’m cleaning the table. ⑤ Nice to meet you.
10 G: What are you doing? / B: ① I’m making cookies. ② I’m drawing a picture. ③ I’m doing homework. ④ I’m reading a book. ⑤ I’m playing a game.
11 G: What are you doing? / B: I’m drawing a picture.
12 W: ① hat ② help ③ sing ④ doll ⑤ fun
13 W: make
14 B: What are you doing? / G: ① I’m making cookies. ② You can do it. ③ It’s Monday. ④ I’m happy. ⑤ I want salad.
15 G: What are you doing, Dad? / M: I’m making cookies.</div></div>`,
    questions: [
      { t: 'choice', q: '잘 듣고, 두 단어에 공통으로 포함된 알파벳을 고르세요.', audio: 'g4u11/q01.mp3', opts: ['① a', '② e', '③ i', '④ o', '⑤ u'], a: '② e' },
      { t: 'choice', q: '잘 듣고, 다음 표현의 우리말 뜻으로 알맞은 것을 고르세요.', audio: 'g4u11/q02.mp3',
        opts: ['① 뭐 하고 있니?', '② 너는 목이 마르니?', '③ 너는 무엇을 원하니?', '④ 이것이 네 가방이니?', '⑤ 오늘은 무슨 요일이니?'], a: '① 뭐 하고 있니?' },
      { t: 'choice', q: '잘 듣고, 알맞은 그림을 고르세요.', audio: 'g4u11/q03.mp3', opts: ['①', '②'], optImg: [G411('BIN0001'), G411('BIN0002')], a: '①' },
      { t: 'choice', q: '잘 듣고, 그림에 알맞은 응답을 고르세요.', audio: 'g4u11/q04.mp3', img: G411('BIN0003'), opts: N5, a: '①' },
      { t: 'choice', q: '잘 듣고, 그림에 알맞은 응답을 고르세요.', audio: 'g4u11/q05.mp3', img: G411('BIN0004'), opts: N5, a: '③' },
      { t: 'choice', q: '잘 듣고, 다음 표현의 우리말 뜻으로 알맞은 것을 고르세요.', audio: 'g4u11/q06.mp3',
        opts: ['① 나는 책을 읽고 있어.', '② 나는 그림을 그리고 있어.', '③ 나는 쿠키를 만들고 있어.', '④ 나는 놀이를 하고 있어.', '⑤ 나는 숙제를 하고 있어.'], a: '③ 나는 쿠키를 만들고 있어.' },
      { t: 'choice', q: '잘 듣고, 그림과 일치하면 ○, 일치하지 않으면 ×를 고르세요.', audio: 'g4u11/q07.mp3', img: G411('BIN0005'), opts: ['○', '×'], a: '×' },
      { t: 'choice', q: '잘 듣고, 우리말 뜻이 다음과 같은 표현을 고르세요.\n「제가 도와드릴까요?」', audio: 'g4u11/q08.mp3', opts: N5, a: '④' },
      { t: 'choice', q: '잘 듣고, 이어질 응답으로 알맞은 것을 고르세요.', audio: 'g4u11/q09.mp3', opts: N5, a: '④' },
      { t: 'choice', q: '잘 듣고, 그림에 알맞은 응답을 고르세요.', audio: 'g4u11/q10.mp3', img: G411('BIN0006'), opts: N5, a: '④' },
      { t: 'choice', q: '잘 듣고, 대화 내용에 알맞은 그림을 고르세요.', audio: 'g4u11/q11.mp3', opts: ['①', '②'], optImg: [G411('BIN0007'), G411('BIN0002')], a: '②' },
      { t: 'choice', q: '잘 듣고, 주어진 단어의 밑줄 친 부분과 같은 소리가 포함된 것을 고르세요.\nb[e]d', audio: 'g4u11/q12.mp3', opts: N5, a: '②' },
      { t: 'choice', q: '잘 듣고, 다음 단어의 우리말 뜻으로 알맞은 것을 고르세요.', audio: 'g4u11/q13.mp3', opts: ['① 읽다', '② 하다', '③ 먹다', '④ 만들다', '⑤ 청소하다'], a: '④ 만들다' },
      { t: 'choice', q: '잘 듣고, 이어질 응답으로 알맞은 것을 고르세요.', audio: 'g4u11/q14.mp3', opts: N5, a: '①' },
      { t: 'text', q: '잘 듣고, 빈칸에 알맞은 단어를 <보기>에서 찾아 쓰세요.\n<보기> book   cookie   table\nA: What are you doing, Dad?\nB: I’m making ______s.', audio: 'g4u11/q15.mp3', a: ['cookie', 'cookies'] },
      { t: 'text', q: '그림에 알맞은 어구를 <보기>에서 골라 쓰세요.\n<보기> reading a book   drawing a picture', img: G411('BIN0008'), a: 'reading a book' },
      { t: 'choice', q: '다음 빈칸에 알맞은 알파벳을 고르세요.\n냄새가 나다 = sm□ll', opts: ['① a', '② e', '③ i', '④ o', '⑤ u'], a: '② e' },
      { t: 'text', q: '그림을 보고, 주어진 철자를 바르게 배열하여 알맞은 단어를 쓰세요.\ne, a, m, g', img: G411('BIN0009'), a: 'game' },
      { t: 'text', q: '그림에 알맞은 어구를 <보기>에서 골라 쓰세요.\n<보기> cleaning the table   doing homework', img: G411('BIN000B'), a: 'doing homework' },
      { t: 'choice', q: '그림을 보고, 그림에 알맞은 문장을 고르세요.', img: G411('BIN000A'), opts: ['① I’m reading a book.', '② I’m drawing a picture.', '③ I’m playing a game.'], a: '② I’m drawing a picture.' },
    ],
  },
];
