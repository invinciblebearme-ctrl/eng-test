// 4학년 2학기 영어 총괄평가 대비 — 기본 개념 16개와 확인 문제 (정답은 서버에만 있음)
//
// 문제 형식(t)
//  text   : 짧은 답 쓰기. a = 정답(문자열 또는 허용 답 배열). cs = 대소문자 구별
//  choice : 하나 고르기. opts = 보기, a = 정답
//  pick   : 여러 개 고르기. opts = 보기, a = 정답 배열
//  multi  : 빈칸 여러 개. q 안의 ___ 순서대로, a = [[허용 답...], ...], sel = 빈칸별 보기(선택형)
//  order  : 낱말 순서 배열. words = 낱말 카드, a = 정답 문장
//  time   : 시각을 숫자로(예: 4:30). a = "4:30"
// 보조 자료: say = 🔊 읽어 주기(브라우저 TTS), clock = [시, 분], money = {c100, b1000}, color = 색깔 견본
// cs가 없으면 대소문자는 구별하지 않음. 앞뒤 공백·끝 마침표는 무시함.

import { WORD_SETS, UNITS } from './words.js';
import { EXAMS } from './exams.js';
export { UNITS };

const BASE_CONCEPTS = [
  {
    id: 1, unit: '7단원', title: '요일 낱말 듣고 쓰기',
    lead: '요일은 모두 day로 끝나요. 앞부분 소리를 잘 들어요.',
    summary: `
<div class="cards">
  <div class="card"><h4>헷갈리는 요일</h4><ul>
    <li><b class="en">Tuesday</b> 튜즈데이 (화)</li>
    <li><b class="en">Thursday</b> 써즈데이 (목)</li>
    <li><b class="en">Wednesday</b> 웬즈데이 (수) — 가운데 d는 소리 나지 않아요</li></ul></div>
  <div class="card dark"><h4>묻고 답하기</h4>
    <p class="big"><span class="en">A: What day is it today?</span></p>
    <p class="big"><span class="en">B: It’s Wednesday.</span></p></div>
</div>
<table class="tbl"><tr class="hd"><th class="en">Sunday</th><th class="en">Monday</th><th class="en">Tuesday</th><th class="en">Wednesday</th><th class="en">Thursday</th><th class="en">Friday</th><th class="en">Saturday</th></tr>
<tr><td>Sun.</td><td>Mon.</td><td>Tue.</td><td>Wed.</td><td>Thu.</td><td>Fri.</td><td>Sat.</td></tr>
<tr class="ko"><td>일</td><td>월</td><td>화</td><td>수</td><td>목</td><td>금</td><td>토</td></tr></table>`,
    questions: [
      { t: 'text', q: '🔊 소리를 듣고 요일을 영어로 쓰세요.', say: 'Wednesday', a: 'Wednesday' },
      { t: 'text', q: '🔊 소리를 듣고 요일을 영어로 쓰세요.', say: 'Tuesday', a: 'Tuesday' },
      { t: 'choice', q: 'Monday는 무슨 요일인가요?', opts: ['일요일', '월요일', '화요일', '수요일'], a: '월요일' },
      { t: 'text', q: '빈칸에 알맞은 글자 하나를 쓰세요.  We d _ e s d a y (수요일)', a: 'n' },
      { t: 'text', q: '🔊 소리를 듣고 요일을 영어로 쓰세요.', say: 'Friday', a: 'Friday' },
      { t: 'text', q: '🔊 소리를 듣고 요일을 영어로 쓰세요.', say: 'Thursday', a: 'Thursday' },
      { t: 'text', q: '일요일을 영어로 쓰세요.', a: 'Sunday' },
      { t: 'choice', q: 'Saturday는 무슨 요일인가요?', opts: ['금요일', '토요일', '일요일', '목요일'], a: '토요일' },
      { t: 'text', q: '빈칸에 알맞은 글자 하나를 쓰세요.  T _ e s d a y (화요일)', a: 'u' },
      { t: 'text', q: '빈칸에 알맞은 글자 하나를 쓰세요.  T h _ r s d a y (목요일)', a: 'u' },
    ],
  },
  {
    id: 2, unit: '7단원', title: '요일 줄임말과 대문자',
    lead: '앞의 세 글자 + 점(.)',
    summary: `
<div class="cards">
  <div class="card"><h4>규칙</h4><ul>
    <li>줄임말: <span class="en">Sun. Mon. Tue. Wed. Thu. Fri. Sat.</span></li>
    <li>요일의 첫 글자는 언제나 <b>대문자</b></li>
    <li><span class="en">friday</span> ✗ → <span class="en">Friday</span> ○</li></ul></div>
  <div class="card"><h4>예시</h4><ul class="plain">
    <li class="en">Friday → Fri.</li><li class="en">Wednesday → Wed.</li>
    <li>문장 첫 글자도 대문자: <span class="en">It’s Friday.</span></li></ul></div>
</div>`,
    questions: [
      { t: 'text', q: 'Friday의 줄임말을 쓰세요. (점은 빼고 써도 돼요)', a: ['Fri', 'Fri.'], cs: true },
      { t: 'text', q: 'Wednesday의 줄임말을 쓰세요. (점은 빼고 써도 돼요)', a: ['Wed', 'Wed.'], cs: true },
      { t: 'text', q: '바르게 고쳐 쓰세요.  friday', a: 'Friday', cs: true },
      { t: 'choice', q: 'Thu.는 무슨 요일인가요?', opts: ['화요일', '수요일', '목요일', '토요일'], a: '목요일' },
      { t: 'text', q: '문장에서 틀린 낱말을 바르게 고쳐 쓰세요.  It’s friday.', a: 'Friday', cs: true },
      { t: 'text', q: 'Monday의 줄임말을 쓰세요. (점은 빼고 써도 돼요)', a: ['Mon', 'Mon.'], cs: true },
      { t: 'text', q: 'Tuesday의 줄임말을 쓰세요. (점은 빼고 써도 돼요)', a: ['Tue', 'Tue.'], cs: true },
      { t: 'text', q: 'Wed.는 어떤 요일의 줄임말인지 영어로 쓰세요.', a: 'Wednesday', cs: true },
      { t: 'choice', q: 'Sat.는 무슨 요일인가요?', opts: ['일요일', '월요일', '금요일', '토요일'], a: '토요일' },
      { t: 'text', q: '요일 낱말은 모두 (       )로 끝나요. 빈칸에 알맞은 말을 영어로 쓰세요.', a: 'day' },
    ],
  },
  {
    id: 3, unit: '7단원', title: '수업 이름',
    lead: '수업 이름 뒤에 class를 붙여요.',
    summary: `
<div class="cards">
  <div class="card"><h4>수업 낱말</h4><ul>
    <li><span class="en">music</span> 음악 · <span class="en">art</span> 미술</li>
    <li><span class="en">computer</span> 컴퓨터 · <span class="en">soccer</span> 축구</li>
    <li><span class="en">piano</span> 피아노 · <span class="en">dance</span> 무용</li></ul></div>
  <div class="card dark"><h4>말해 보기</h4>
    <p class="big en">I have a music class.</p><p class="big en">I have an art class.</p>
    <p class="note">art처럼 모음 소리로 시작하면 <b>an</b></p></div>
</div>`,
    questions: [
      { t: 'text', q: '🔊 듣고 빈칸에 알맞은 낱말을 쓰세요.  I have a ______ class.', say: 'I have a music class.', a: 'music' },
      { t: 'text', q: '‘미술’을 영어로 쓰세요.', a: 'art' },
      { t: 'text', q: '🔊 듣고 빈칸에 알맞은 낱말을 쓰세요.  I have a ______ class.', say: 'I have a piano class.', a: 'piano' },
      { t: 'choice', q: 'soccer class의 뜻은?', opts: ['음악 수업', '축구 수업', '무용 수업', '미술 수업'], a: '축구 수업' },
      { t: 'text', q: '‘컴퓨터’를 영어로 쓰세요.', a: 'computer' },
      { t: 'text', q: '‘축구’를 영어로 쓰세요.', a: 'soccer' },
      { t: 'text', q: '컴퓨터 수업이 있어요.  I have a ______ class.', a: 'computer' },
      { t: 'choice', q: 'dance class의 뜻은?', opts: ['피아노 수업', '컴퓨터 수업', '무용 수업', '축구 수업'], a: '무용 수업' },
      { t: 'choice', q: '빈칸에 알맞은 말은?  I have ___ art class.', opts: ['a', 'an'], a: 'an' },
      { t: 'choice', q: '빈칸에 알맞은 말은?  I have ___ music class.', opts: ['a', 'an'], a: 'a' },
    ],
  },
  {
    id: 4, unit: '8단원', title: '숫자 낱말 철자 (1~9)',
    lead: '가격을 영어로 쓰려면 철자를 정확히 알아야 해요.',
    summary: `
<div class="cards">
  <div class="card"><h4>헷갈리는 철자</h4><ul>
    <li><span class="en">seven</span> — e가 두 번</li>
    <li><span class="en">eight</span> — e·i·g·h·t</li>
    <li><span class="en">three</span> — h 다음에 r</li></ul></div>
  <div class="card dark"><h4>1~9</h4>
    <p class="big en">one · two · three</p><p class="big en">four · five · six</p><p class="big en">seven · eight · nine</p></div>
</div>`,
    questions: [
      { t: 'text', q: '숫자를 영어로 쓰세요.  7', a: 'seven' },
      { t: 'text', q: '숫자를 영어로 쓰세요.  3', a: 'three' },
      { t: 'text', q: '숫자를 영어로 쓰세요.  8', a: 'eight' },
      { t: 'text', q: '빈칸에 알맞은 글자 하나를 쓰세요.  s e v _ n (7)', a: 'e' },
      { t: 'text', q: '빈칸에 알맞은 글자 하나를 쓰세요.  e i _ h t (8)', a: 'g' },
      { t: 'text', q: '숫자를 영어로 쓰세요.  4', a: 'four' },
      { t: 'text', q: '숫자를 영어로 쓰세요.  9', a: 'nine' },
      { t: 'text', q: '숫자를 영어로 쓰세요.  5', a: 'five' },
      { t: 'text', q: 'six를 숫자로 쓰세요.', a: '6' },
      { t: 'text', q: '빈칸에 알맞은 글자 하나를 쓰세요.  t h _ e e (3)', a: 'r' },
    ],
  },
  {
    id: 5, unit: '8단원', title: 'hundred 와 thousand, 돈 세기',
    lead: '돈을 세어 영어로 말해요.',
    summary: `
<div class="cards">
  <div class="card"><h4>돈 세기</h4><ul>
    <li>100원 동전 3개 → <span class="en">three hundred won</span></li>
    <li>1,000원 지폐 3장 → <span class="en">three thousand won</span></li>
    <li><span class="en">hundred, thousand</span> 뒤에는 <b>s를 붙이지 않아요</b></li></ul></div>
  <div class="card dark"><h4>예시</h4>
    <p class="big en">300 → three hundred</p><p class="big en">3,000 → three thousand</p><p class="big en">8,000 → eight thousand</p></div>
</div>`,
    questions: [
      { t: 'text', q: 'three hundred를 숫자로 쓰세요.', a: ['300'] },
      { t: 'text', q: 'three thousand를 숫자로 쓰세요.', a: ['3,000', '3000'] },
      { t: 'text', q: '영어로 쓰세요.  700', a: ['seven hundred', 'seven hundred won'] },
      { t: 'text', q: '영어로 쓰세요.  8,000', a: ['eight thousand', 'eight thousand won'] },
      { t: 'text', q: '돈을 세어 영어로 쓰세요. (won은 빼고 써도 돼요)', money: { b1000: 2 }, a: ['two thousand', 'two thousand won'] },
      { t: 'text', q: 'eight hundred를 숫자로 쓰세요.', a: ['800'] },
      { t: 'text', q: 'five thousand를 숫자로 쓰세요.', a: ['5,000', '5000'] },
      { t: 'text', q: '돈을 세어 영어로 쓰세요. (won은 빼고 써도 돼요)', money: { c100: 3 }, a: ['three hundred', 'three hundred won'] },
      { t: 'text', q: '돈을 세어 영어로 쓰세요. (won은 빼고 써도 돼요)', money: { c100: 4 }, a: ['four hundred', 'four hundred won'] },
      { t: 'text', q: '돈을 세어 영어로 쓰세요. (won은 빼고 써도 돼요)', money: { b1000: 3 }, a: ['three thousand', 'three thousand won'] },
    ],
  },
  {
    id: 6, unit: '8단원', title: '-teen 과 -ty 구별하기',
    lead: '13~19는 -teen, 30·40…은 -ty',
    summary: `
<div class="cards">
  <div class="card"><h4>소리 구별</h4><ul>
    <li><span class="en">thirTEEN</span> 13 — 뒤를 길고 세게</li>
    <li><span class="en">THIRty</span> 30 — 앞을 세게, 끝은 짧게</li>
    <li>시각에서도: 9:40 → <span class="en">nine forty</span></li></ul></div>
  <div class="card dark"><h4>짝으로 익히기</h4>
    <p class="big en">13 thirteen ↔ 30 thirty</p><p class="big en">14 fourteen ↔ 40 forty</p><p class="big en">15 fifteen ↔ 50 fifty</p></div>
</div>`,
    questions: [
      { t: 'choice', q: '🔊 듣고 알맞은 숫자를 고르세요.', say: 'thirteen', opts: ['13', '30'], a: '13' },
      { t: 'choice', q: '🔊 듣고 알맞은 숫자를 고르세요.', say: 'thirty', opts: ['13', '30'], a: '30' },
      { t: 'choice', q: '🔊 듣고 알맞은 숫자를 고르세요.', say: 'fourteen', opts: ['14', '40'], a: '14' },
      { t: 'text', q: '영어로 쓰세요.  40', a: 'forty' },
      { t: 'text', q: '영어로 쓰세요.  30', a: 'thirty' },
      { t: 'choice', q: '🔊 듣고 알맞은 숫자를 고르세요.', say: 'forty', opts: ['14', '40'], a: '40' },
      { t: 'text', q: 'fifteen을 숫자로 쓰세요.', a: '15' },
      { t: 'text', q: '영어로 쓰세요.  50', a: 'fifty' },
      { t: 'text', q: '영어로 쓰세요.  14', a: 'fourteen' },
      { t: 'text', q: '영어로 쓰세요.  13', a: 'thirteen' },
    ],
  },
  {
    id: 7, unit: '8단원', title: '물건 낱말과 값 묻고 답하기',
    lead: 'this(가까운 것) / that(먼 것)',
    summary: `
<div class="cards">
  <div class="card"><h4>물건 낱말</h4><ul>
    <li><span class="en">pencil</span> 연필 · <span class="en">pencil case</span> 필통</li>
    <li><span class="en">comic book</span> 만화책 · <span class="en">toy car</span> 장난감 자동차</li>
    <li><span class="en">cap</span> 모자 · <span class="en">bag</span> 가방</li></ul></div>
  <div class="card dark"><h4>가게 대화</h4>
    <p class="big en">A: I like this comic book.</p><p class="big en">A: How much is it?</p>
    <p class="big en">B: It’s three thousand won.</p><p class="big en">A: I’ll take it.</p></div>
</div>`,
    questions: [
      { t: 'text', q: '‘만화책’을 영어로 쓰세요.', a: 'comic book' },
      { t: 'text', q: '‘필통’을 영어로 쓰세요.', a: 'pencil case' },
      { t: 'text', q: '값을 묻는 말을 완성하세요.  How ______ is it?', a: 'much' },
      { t: 'choice', q: '내 앞에 있는 가까운 모자를 가리켜요.  I like ____ cap.', opts: ['this', 'that'], a: 'this' },
      { t: 'choice', q: 'Here you are.의 뜻은?', opts: ['얼마예요?', '여기 있어요.', '그것을 살게요.', '고마워요.'], a: '여기 있어요.' },
      { t: 'text', q: '‘연필’을 영어로 쓰세요.', a: 'pencil' },
      { t: 'text', q: '‘장난감 자동차’를 영어로 쓰세요.', a: 'toy car' },
      { t: 'choice', q: '멀리 있는 가방을 가리켜요.  I like ____ bag.', opts: ['this', 'that'], a: 'that' },
      { t: 'text', q: '‘그것을 살게요.’  I’ll ______ it.', a: 'take' },
      { t: 'text', q: '‘나는 이 만화책이 좋아요.’  I ______ this comic book.', a: 'like' },
    ],
  },
  {
    id: 8, unit: '9단원', title: 'Is this your ~? 묻고 답하기',
    lead: '물건의 주인인지 물어요.',
    summary: `
<div class="cards">
  <div class="card"><h4>물건 낱말</h4><ul>
    <li><span class="en">bag</span> 가방 · <span class="en">watch</span> 손목시계</li>
    <li><span class="en">notebook</span> 공책 · <span class="en">cap</span> 모자</li>
    <li><span class="en">umbrella</span> 우산 · <span class="en">ball</span> 공</li></ul></div>
  <div class="card dark"><h4>묻고 답하기</h4>
    <p class="big en">A: Is this your umbrella?</p><p class="big en">B: Yes, it is. Thank you!</p><p class="big en">B: No, it isn’t.</p></div>
</div>`,
    questions: [
      { t: 'text', q: '‘우산’을 영어로 쓰세요.', a: 'umbrella' },
      { t: 'text', q: '‘공책’을 영어로 쓰세요.', a: 'notebook' },
      { t: 'text', q: '빈칸에 알맞은 낱말을 쓰세요.  ______ this your cap?', a: 'Is' },
      { t: 'text', q: '내 것이 아니라고 답해요.  No, ____________.', a: ['it isn’t', 'it is not', 'it isnt'] },
      { t: 'multi', q: '내 것이 맞다고 답해요.  ___ , it ___ .', a: [['Yes'], ['is']] },
      { t: 'text', q: '‘가방’을 영어로 쓰세요.', a: 'bag' },
      { t: 'text', q: '‘손목시계’를 영어로 쓰세요.', a: 'watch' },
      { t: 'text', q: '‘공’을 영어로 쓰세요.', a: 'ball' },
      { t: 'text', q: '‘이것이 네 우산이니?’  Is ______ your umbrella?', a: 'this' },
      { t: 'text', q: '‘응, 맞아. 고마워!’  Yes, it is. ______ you!', a: 'Thank' },
    ],
  },
  {
    id: 9, unit: '9단원', title: '색깔 낱말과 My ~ is ~.',
    lead: '물건 다음에 is, 그다음 색깔',
    summary: `
<div class="cards">
  <div class="card"><h4>색깔 낱말</h4><ul>
    <li><i class="sw" style="background:#e53935"></i><span class="en">red</span> 빨강 · <i class="sw" style="background:#1e63d6"></i><span class="en">blue</span> 파랑 · <i class="sw" style="background:#f7d117"></i><span class="en">yellow</span> 노랑</li>
    <li><i class="sw" style="background:#2e9e44"></i><span class="en">green</span> 초록 · <i class="sw" style="background:#8c8c8c"></i><span class="en">gray</span> 회색 · <i class="sw" style="background:#f48fb1"></i><span class="en">pink</span> 분홍</li>
    <li><i class="sw" style="background:#fff"></i><span class="en">white</span> 흰색 · <i class="sw" style="background:#111"></i><span class="en">black</span> 검정 · <i class="sw" style="background:#8d5524"></i><span class="en">brown</span> 갈색</li></ul></div>
  <div class="card dark"><h4>문장 만들기</h4>
    <p class="big en">My cap is yellow.</p><p class="big en">My umbrella is gray.</p>
    <p class="note">첫 글자 M은 대문자, 끝에는 마침표(.)</p></div>
</div>`,
    questions: [
      { t: 'text', q: '이 색깔을 영어로 쓰세요.', color: '#2e9e44', a: 'green' },
      { t: 'text', q: '이 색깔을 영어로 쓰세요.', color: '#8c8c8c', a: ['gray', 'grey'] },
      { t: 'multi', q: '‘내 모자는 노란색이야.’  My ___ is ___ .', a: [['cap'], ['yellow']] },
      { t: 'multi', q: '‘내 모자는 노란색이야.’  ___ cap ___ yellow.', a: [['My'], ['is']] },
      { t: 'order', q: '낱말 카드를 순서대로 눌러 문장을 만드세요. (내 공은 빨간색이야.)', words: ['red', 'is', 'My', 'ball'], a: 'My ball is red.' },
      { t: 'text', q: '이 색깔을 영어로 쓰세요.', color: '#e53935', a: 'red' },
      { t: 'text', q: '이 색깔을 영어로 쓰세요.', color: '#f7d117', a: 'yellow' },
      { t: 'choice', q: 'blue의 뜻은?', opts: ['빨간색', '초록색', '파란색', '회색'], a: '파란색' },
      { t: 'multi', q: '‘내 가방은 회색이야.’  My ___ is ___ .', a: [['bag'], ['gray', 'grey']] },
      { t: 'order', q: '낱말 카드를 순서대로 눌러 문장을 만드세요. (내 모자는 파란색이야.)', words: ['is', 'blue', 'cap', 'My'], a: 'My cap is blue.' },
    ],
  },
  {
    id: 10, unit: '10단원', title: '바늘 시계 읽기',
    lead: '짧은 바늘 = 시, 긴 바늘 = 분',
    summary: `
<div class="cards">
  <div class="card center"><div class="clocks">{{clock:4:30}}<div>4시 30분</div></div><div class="clocks">{{clock:9:40}}<div>9시 40분</div></div></div>
  <div class="card"><h4>읽는 방법</h4><ul>
    <li>긴 바늘이 가리키는 숫자 × 5 = 분</li>
    <li>긴 바늘 6 → 30분, 짧은 바늘은 두 숫자의 가운데</li>
    <li>긴 바늘 8 → 40분</li>
    <li>3시 30분과 4시 30분을 헷갈리지 않게: 짧은 바늘이 어느 숫자를 <b>지났는지</b> 보기</li></ul></div>
</div>`,
    questions: [
      [4, 30], [9, 40], [3, 30], [10, 40], [12, 0], [7, 30], [2, 40], [6, 0], [11, 30], [8, 40],
    ].map(([h, m]) => ({ t: 'time', q: '시계를 보고 시각을 숫자로 쓰세요. (예: 5:30)', clock: [h, m], a: `${h}:${String(m).padStart(2, '0')}` })),
  },
  {
    id: 11, unit: '10단원', title: '시각 묻고 답하기',
    lead: 'What → time → is → it',
    summary: `
<div class="cards">
  <div class="card"><h4>규칙</h4><ul>
    <li>시각을 물을 때: <span class="en">What time is it?</span></li>
    <li>대답: <span class="en">It’s</span> + 시 + 분.</li>
    <li>정각은 시만: <span class="en">It’s seven.</span></li></ul></div>
  <div class="card dark"><h4>예시</h4>
    <p class="big en">A: What time is it?</p><p class="big en">B: It’s four thirty.</p><p class="big en">B: It’s nine forty.</p></div>
</div>`,
    questions: [
      { t: 'text', q: '시계를 보고 영어로 쓰세요.  It’s ____________.', clock: [4, 30], a: 'four thirty' },
      { t: 'text', q: '시계를 보고 영어로 쓰세요.  It’s ____________.', clock: [9, 40], a: 'nine forty' },
      { t: 'time', q: 'It’s ten forty.  이 시각을 숫자로 쓰세요. (예: 5:30)', a: '10:40' },
      { t: 'text', q: '시각을 묻는 말을 완성하세요.  What ______ is it?', a: 'time' },
      { t: 'order', q: '낱말 카드를 순서대로 눌러 시각을 묻는 말을 만드세요.', words: ['is', 'it', 'What', 'time'], a: 'What time is it?' },
      { t: 'text', q: '시계를 보고 영어로 쓰세요.  It’s ____________.', clock: [3, 30], a: 'three thirty' },
      { t: 'text', q: '시계를 보고 영어로 쓰세요.  It’s ____________.', clock: [10, 40], a: 'ten forty' },
      { t: 'time', q: '🔊 듣고 시각을 숫자로 쓰세요. (예: 5:30)', say: 'What time is it? It’s four thirty.', a: '4:30' },
      { t: 'time', q: '🔊 듣고 시각을 숫자로 쓰세요. (예: 5:30)', say: 'What time is it? It’s nine forty.', a: '9:40' },
      { t: 'text', q: '빈칸에 알맞은 낱말을 쓰세요.  What time ______ it?', a: 'is' },
    ],
  },
  {
    id: 12, unit: '10단원', title: 'It’s time for ~. 일과 말하기',
    lead: '“~할 시간이야.” time 다음에 for',
    summary: `
<div class="cards">
  <div class="card"><h4>일과 낱말</h4><ul>
    <li><span class="en">breakfast</span> 아침 식사 · <span class="en">lunch</span> 점심 식사</li>
    <li><span class="en">dinner</span> 저녁 식사</li>
    <li><span class="en">school</span> 학교 · <span class="en">bed</span> 잠자리</li></ul></div>
  <div class="card dark"><h4>예시</h4>
    <p class="big en">It’s seven. It’s time for breakfast.</p><p class="big en">It’s twelve. It’s time for lunch.</p><p class="big en">It’s ten. It’s time for bed.</p></div>
</div>`,
    questions: [
      { t: 'text', q: '‘점심 먹을 시간이야.’  It’s twelve. It’s time for ______.', a: 'lunch' },
      { t: 'text', q: '‘아침 먹을 시간이야.’  It’s seven. It’s time for ______.', a: 'breakfast' },
      { t: 'text', q: '‘잘 시간이야.’  It’s ten. It’s time for ______.', a: 'bed' },
      { t: 'text', q: '빈칸에 알맞은 두 낱말을 쓰세요.  It’s ________ ________ dinner.', a: 'time for' },
      { t: 'choice', q: 'It’s time for dinner.의 뜻은?', opts: ['아침 먹을 시간이야.', '점심 먹을 시간이야.', '저녁 먹을 시간이야.', '잘 시간이야.'], a: '저녁 먹을 시간이야.' },
      { t: 'text', q: '‘저녁 식사’를 영어로 쓰세요.', a: 'dinner' },
      { t: 'text', q: '‘학교’를 영어로 쓰세요.', a: 'school' },
      { t: 'text', q: '‘점심 식사’를 영어로 쓰세요.', a: 'lunch' },
      { t: 'text', q: '빈칸에 알맞은 낱말을 쓰세요.  It’s time ______ breakfast.', a: 'for' },
      { t: 'choice', q: 'It’s time for bed.의 뜻은?', opts: ['학교 갈 시간이야.', '잘 시간이야.', '저녁 먹을 시간이야.', '일어날 시간이야.'], a: '잘 시간이야.' },
    ],
  },
  {
    id: 13, unit: '11단원', title: '하고 있는 일 낱말',
    lead: '지금 하고 있는 일을 나타내요.',
    summary: `
<div class="cards">
  <div class="card"><h4>하는 일</h4><ul>
    <li><span class="en">cleaning my room</span> 방 청소하기</li>
    <li><span class="en">reading a book</span> 책 읽기 · <span class="en">doing homework</span> 숙제하기</li>
    <li><span class="en">watching TV</span> 텔레비전 보기 · <span class="en">drawing a picture</span> 그림 그리기</li></ul></div>
  <div class="card dark"><h4>생활 낱말</h4>
    <p class="big en">game · book · music</p><p class="big en">table · cookie</p><p class="note">게임 · 책 · 음악 · 탁자 · 과자</p></div>
</div>`,
    questions: [
      { t: 'text', q: '‘과자’를 영어로 쓰세요.', a: 'cookie' },
      { t: 'text', q: '‘탁자’를 영어로 쓰세요.', a: 'table' },
      { t: 'choice', q: 'watching TV의 뜻은?', opts: ['책 읽기', '텔레비전 보기', '숙제하기', '그림 그리기'], a: '텔레비전 보기' },
      { t: 'choice', q: 'cleaning my room의 뜻은?', opts: ['내 방 청소하기', '숙제하기', '그림 그리기', '책 읽기'], a: '내 방 청소하기' },
      { t: 'text', q: '‘책 읽기’를 영어로 쓰세요.', a: 'reading a book' },
      { t: 'text', q: '‘게임’을 영어로 쓰세요.', a: 'game' },
      { t: 'text', q: '‘음악’을 영어로 쓰세요.', a: 'music' },
      { t: 'choice', q: 'doing homework의 뜻은?', opts: ['텔레비전 보기', '숙제하기', '내 방 청소하기', '책 읽기'], a: '숙제하기' },
      { t: 'choice', q: 'drawing a picture의 뜻은?', opts: ['그림 그리기', '책 읽기', '숙제하기', '텔레비전 보기'], a: '그림 그리기' },
      { t: 'text', q: '‘텔레비전 보기’를 영어로 쓰세요.', a: 'watching TV' },
    ],
  },
  {
    id: 14, unit: '11단원', title: 'What are you doing? 묻고 답하기',
    lead: 'What → are → you → doing',
    summary: `
<div class="cards">
  <div class="card"><h4>규칙</h4><ul>
    <li>나에게: <span class="en">What are you doing?</span> → <span class="en">I’m ~ing.</span></li>
    <li>그·그녀에게: <span class="en">What is he(she) doing?</span></li>
    <li>→ <span class="en">He’s(She’s) ~ing.</span></li></ul></div>
  <div class="card dark"><h4>대화</h4>
    <p class="big en">A: What are you doing?</p><p class="big en">B: I’m reading a book.</p><p class="big en">A: Can you help me?</p><p class="big en">B: Sure.</p></div>
</div>`,
    questions: [
      { t: 'text', q: '빈칸에 알맞은 낱말을 쓰세요.  What ______ you doing?', a: 'are' },
      { t: 'text', q: '빈칸에 알맞은 낱말을 쓰세요.  What are you ______?', a: 'doing' },
      { t: 'text', q: '빈칸에 알맞은 낱말을 쓰세요.  What ______ he doing?', a: 'is' },
      { t: 'text', q: '‘나는 책을 읽고 있어.’  I’m ______ a book.', a: 'reading' },
      { t: 'multi', q: '알맞은 뜻을 골라 연결하세요.  Can you help me? → ___   /   Sure. → ___',
        sel: [['나 좀 도와줄래?', '좋아.', '너는 뭐 하고 있니?'], ['나 좀 도와줄래?', '좋아.', '너는 뭐 하고 있니?']],
        a: [['나 좀 도와줄래?'], ['좋아.']] },
      { t: 'text', q: '‘나는 내 방을 청소하고 있어.’  I’m ______ my room.', a: 'cleaning' },
      { t: 'text', q: '‘나는 텔레비전을 보고 있어.’  I’m ______ TV.', a: 'watching' },
      { t: 'text', q: '‘나는 숙제를 하고 있어.’  I’m ______ my homework.', a: 'doing' },
      { t: 'text', q: '빈칸에 알맞은 낱말을 쓰세요.  What ______ she doing?', a: 'is' },
      { t: 'choice', q: 'What are you doing?의 뜻은?', opts: ['너는 몇 살이니?', '너는 뭐 하고 있니?', '몇 시니?', '이것은 얼마니?'], a: '너는 뭐 하고 있니?' },
    ],
  },
  {
    id: 15, unit: '소리와 철자', title: 'ch 소리',
    lead: 'c와 h가 만나 /ㅊ/처럼 한 소리',
    summary: `
<div class="cards">
  <div class="card"><h4>낱말 끝의 ch</h4><ul>
    <li><span class="en">lun<u>ch</u></span> 점심</li><li><span class="en">tou<u>ch</u></span> 만지다</li><li><span class="en">mu<u>ch</u></span> 많이</li></ul></div>
  <div class="card dark"><h4>낱말 앞의 ch</h4>
    <p class="big en"><u>ch</u>air 의자</p><p class="big en"><u>ch</u>eese 치즈</p><p class="note">앞에도, 끝에도 올 수 있어요</p></div>
</div>`,
    questions: [
      { t: 'text', q: '🔊 듣고 낱말을 쓰세요.', say: 'lunch', a: 'lunch' },
      { t: 'text', q: '🔊 듣고 낱말을 쓰세요.', say: 'touch', a: 'touch' },
      { t: 'choice', q: 'much에서 ch 소리를 내는 부분에 밑줄 친 것을 고르세요.', opts: ['[m]uch', 'm[u]ch', 'mu[ch]'], a: 'mu[ch]' },
      { t: 'choice', q: 'chair에서 ch 소리를 내는 부분에 밑줄 친 것을 고르세요.', opts: ['[ch]air', 'ch[ai]r', 'cha[ir]'], a: '[ch]air' },
      { t: 'choice', q: 'touch의 뜻은?', opts: ['점심', '만지다', '많이', '의자'], a: '만지다' },
      { t: 'text', q: '‘많이’를 영어로 쓰세요.', a: 'much' },
      { t: 'text', q: '‘의자’를 영어로 쓰세요.', a: 'chair' },
      { t: 'choice', q: 'lunch에서 ch 소리를 내는 부분에 밑줄 친 것을 고르세요.', opts: ['[l]unch', 'l[un]ch', 'lun[ch]'], a: 'lun[ch]' },
      { t: 'choice', q: 'touch에서 ch 소리를 내는 부분에 밑줄 친 것을 고르세요.', opts: ['[t]ouch', 't[ou]ch', 'tou[ch]'], a: 'tou[ch]' },
      { t: 'choice', q: 'lunch의 뜻은?', opts: ['아침', '점심', '저녁', '치즈'], a: '점심' },
    ],
  },
  {
    id: 16, unit: '소리와 철자', title: '짧은 모음 a e i u',
    lead: '짧게 소리 내는 모음',
    summary: `
<div class="cards">
  <div class="card"><h4>소리</h4><ul>
    <li><b class="en">a</b> /애/ — <span class="en">bag, hat</span></li>
    <li><b class="en">e</b> /에/ — <span class="en">bed, ten</span></li>
    <li><b class="en">i</b> /이/ — <span class="en">big, six</span></li>
    <li><b class="en">u</b> /어/ — <span class="en">sun, run, lunch</span></li></ul></div>
  <div class="card dark"><h4>같은 소리 찾기</h4>
    <p class="big en">hat · bag → a</p><p class="big en">sun · run → u</p>
    <p class="note">뜻을 보고 모음을 고르기: b_g 가방(a) / 큰(i)</p></div>
</div>`,
    questions: [
      { t: 'choice', q: '빈칸에 알맞은 모음은?  h _ t (모자)', opts: ['a', 'e', 'i', 'u'], a: 'a' },
      { t: 'choice', q: '빈칸에 알맞은 모음은?  b _ d (침대)', opts: ['a', 'e', 'i', 'u'], a: 'e' },
      { t: 'choice', q: '빈칸에 알맞은 모음은?  s _ x (여섯)', opts: ['a', 'e', 'i', 'u'], a: 'i' },
      { t: 'choice', q: '빈칸에 알맞은 모음은?  s _ n (해)', opts: ['a', 'e', 'i', 'u'], a: 'u' },
      { t: 'pick', q: 'a /애/ 소리가 나는 낱말 두 개를 모두 고르세요.', opts: ['hat', 'bed', 'bag', 'six'], a: ['hat', 'bag'] },
      { t: 'choice', q: '빈칸에 알맞은 모음은?  b _ g (가방)', opts: ['a', 'e', 'i', 'u'], a: 'a' },
      { t: 'choice', q: '빈칸에 알맞은 모음은?  t _ n (열, 10)', opts: ['a', 'e', 'i', 'u'], a: 'e' },
      { t: 'choice', q: '빈칸에 알맞은 모음은?  b _ g (큰)', opts: ['a', 'e', 'i', 'u'], a: 'i' },
      { t: 'choice', q: '빈칸에 알맞은 모음은?  r _ n (달리다)', opts: ['a', 'e', 'i', 'u'], a: 'u' },
      { t: 'pick', q: 'u /어/ 소리가 나는 낱말 두 개를 모두 고르세요.', opts: ['sun', 'big', 'run', 'ten'], a: ['sun', 'run'] },
    ],
  },
];

// 기본 개념 1~16 + 단원별 낱말 17~22
export const CONCEPTS = [
  ...BASE_CONCEPTS.map((c) => ({ grade: 4, kind: 'concept', short: '개념' + c.id, ...c })),
  ...WORD_SETS,
  ...EXAMS,
];

// 'c l __ s s' + ['a'] → 'class'  ('/'는 띄어쓰기)
export const fillPattern = (pat, letters) => {
  let k = 0;
  return pat.split(' ').map((t) => (t === '__' ? (letters[k++] || '_') : t === '/' ? ' ' : t)).join('');
};

// ---------- 채점 ----------
const norm = (s, cs) => {
  let v = String(s ?? '')
    .replace(/[‘’`´]/g, "'").replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ').trim()
    .replace(/\s*([,?!])\s*/g, '$1 ').trim()
    .replace(/[.!?]+$/, '').trim();
  return cs ? v : v.toLowerCase();
};
const asList = (a) => (Array.isArray(a) ? a : [a]);
const parseTime = (s) => {
  const m = String(s ?? '').replace(/\s/g, '').match(/^(\d{1,2})(?:[:：시.]?(\d{1,2})?분?)?$/);
  if (!m) return null;
  const h = +m[1], mi = m[2] ? +m[2] : 0;
  return h >= 1 && h <= 12 && mi < 60 ? `${h}:${String(mi).padStart(2, '0')}` : null;
};

export function gradeOne(q, ans) {
  if (q.a == null) return false;   // 정답 미입력
  if (ans == null || ans === '' || (Array.isArray(ans) && ans.every((x) => !x))) return false;
  switch (q.t) {
    case 'text':
      if (q.ko) { const k = (v) => norm(v).replace(/[\s,.~]/g, ''); return asList(q.a).some((x) => k(x) === k(ans)); }
      return asList(q.a).some((x) => norm(x, q.cs) === norm(ans, q.cs));
    case 'spellmean': {
      if (!Array.isArray(ans)) return false;
      const k = (v) => norm(v).replace(/[\s,.~?!/]/g, '');
      return q.a.en.some((x) => norm(x, q.cs) === norm(ans[0], q.cs)) && q.a.ko.some((x) => k(x) === k(ans[1]));
    }
    case 'spell':
      return Array.isArray(ans) && q.a.every((x, i) => String(ans[i] ?? '').trim().toLowerCase() === x);
    case 'choice':
      return ans === q.a;
    case 'time':
      return parseTime(ans) === q.a;
    case 'order':
      if (q.join === '') return (Array.isArray(ans) ? ans.join('') : String(ans)).replace(/\s/g, '').toLowerCase() === q.a.replace(/\s/g, '').toLowerCase();
      return norm(Array.isArray(ans) ? ans.join(' ') : ans, true) === norm(q.a, true);
    case 'pick': {
      const s = new Set(asList(ans));
      return s.size === q.a.length && q.a.every((x) => s.has(x));
    }
    case 'multi':
      return Array.isArray(ans) && q.a.every((ok, i) => ok.some((x) => norm(x, q.cs) === norm(ans[i], q.cs)));
  }
  return false;
}

export function answerText(q) {
  if (q.a == null) return '(정답 미입력)';
  if (q.t === 'multi') return q.a.map((x) => x[0]).join(', ');
  if (q.t === 'pick') return q.a.join(', ');
  if (q.t === 'spellmean') return `${q.a.en[0]} / ${q.a.ko[0]}`;
  if (q.t === 'spell') return `${fillPattern(q.pat, q.a)} (${q.a.join(', ')})`;
  return asList(q.a)[0];
}

// 학생에게 보내는 문제 (정답 제거)
export function publicConcepts(grade) {
  // 시험(낱말·철자·단원평가)은 정리 내용을 숨김 → 제출한 뒤 /api/summary 로만 받음
  return CONCEPTS.filter((c) => grade == null || c.grade === grade).map(({ questions, summary, ...c }) => ({
    ...c,
    summary: c.kind === 'concept' ? summary : '',
    locked: c.kind !== 'concept',
    questions: questions.map(({ a, ...q }) => ({ ...q, blanks: q.t === 'multi' ? a.length : undefined, pending: a == null || undefined, end: q.t === 'order' ? (q.join === '' ? '' : (a.match(/[.?!]$/) || ['.'])[0]) : undefined })),
  }));
}
