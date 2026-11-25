// 4학년 2학기 영어 — 단원별 낱말 정리와 낱말 문제 (학습지와 같은 순서·같은 문제)
// 세트 번호 17~22 (기본 개념 1~16 다음)

// 우리말 뜻 허용 답: "무용, 춤" → 무용 / 춤 / 무용, 춤 모두 인정
const ko = (...xs) => {
  const out = new Set();
  for (const x of xs) { out.add(x); if (x.includes(',')) x.split(',').forEach((p) => out.add(p.trim())); }
  return [...out];
};
const toKo = (en, a) => ({ t: 'text', q: `뜻을 우리말로 쓰세요.  ${en}`, say: en, a, ko: true });
const toEn = (k, a, cs) => ({ t: 'text', q: `영어로 쓰세요.  ${k}`, a, cs });
// 빈칸 채우기: 'c l __ s s' + 정답 글자들
const spell = (pat, mean, letters) => ({ t: 'spell', q: '빈칸에 알맞은 알파벳을 써서 낱말을 완성하세요.', pat, mean, a: letters });
// 알파벳 순서 배열: 'r/c/c/o/e/s' → soccer
const scram = (letters, mean, word) => ({ t: 'order', q: `알파벳 순서를 바르게 하여 낱말을 만드세요. (${mean})`, words: letters.split('/'), join: '', a: word });
// 잇기: 오른쪽 뜻 5개 중 고르기
const match = (en, opts, a) => ({ t: 'choice', q: `낱말과 뜻을 바르게 이으세요.  ${en} →`, say: en, opts, a });

const wordTable = (rows) => `<div class="card"><table class="tbl words">${rows.map((r) => `<tr>${r.map(([e, k]) => e ? `<td class="en w">${e}</td><td>${k}</td>` : '<td></td><td></td>').join('')}</tr>`).join('')}</table>
<p class="note small muted">영어 낱말을 누르면 소리가 나와요 🔊</p></div>`;
const pairs = (left, right) => left.map((l, i) => [l, right[i] || [null, null]]);

// 단원 평가 메뉴의 단원 목록 (단원평가 문제지는 kind: 'exam', 같은 ukey로 추가)
export const UNITS = [
  { grade: 4, key: '7', name: '7단원', title: '요일과 수업' }, { grade: 4, key: '8', name: '8단원', title: '물건 값' },
  { grade: 4, key: '9', name: '9단원', title: '물건 주인 찾기' }, { grade: 4, key: '10', name: '10단원', title: '시각' },
  { grade: 4, key: '11', name: '11단원', title: '하고 있는 일' }, { grade: 4, key: 's', name: '소리와 철자', title: '소리와 철자' },
  { grade: 3, key: '3-10', name: '10단원', title: 'Can You Jump?' }, { grade: 3, key: '3-11', name: '11단원', title: 'He’s My Dad' },
];

export const WORD_SETS = [
  {
    id: 17, grade: 4, kind: 'word', ukey: '7', short: '단어7', unit: '7단원', title: '7단원 단어 시험', lead: '낱말 목록을 소리 내어 읽고 뜻을 익힌 뒤 문제를 풀어 보세요. 요일·나라 이름·I처럼 언제나 대문자인 낱말은 대문자로 써요.',
    summary: wordTable(pairs(
      [['Sunday', '일요일'], ['Monday', '월요일'], ['Tuesday', '화요일'], ['Wednesday', '수요일'], ['Thursday', '목요일'], ['Friday', '금요일'], ['Saturday', '토요일'], ['music', '음악'], ['art', '미술']],
      [['computer', '컴퓨터'], ['soccer', '축구'], ['piano', '피아노'], ['dance', '무용, 춤'], ['science', '과학'], ['math', '수학'], ['class', '수업'], ['today', '오늘'], ['day', '날, 요일']])),
    questions: [
      toKo('math', ['수학']), toKo('Tuesday', ['화요일']), toKo('computer', ['컴퓨터']), toKo('today', ['오늘']), toKo('music', ['음악']),
      toEn('토요일', 'Saturday'), toEn('피아노', 'piano'), toEn('수요일', 'Wednesday'), toEn('과학', 'science'), toEn('금요일', 'Friday'),
      spell('c l __ s s', '수업', ['a']), spell('M __ n d __ y', '월요일', ['o', 'a']), spell('S __ n d __ y', '일요일', ['u', 'a']), spell('d __ n c __', '무용, 춤', ['a', 'e']), spell('T h __ r s d __ y', '목요일', ['u', 'a']),
      scram('r/c/c/o/e/s', '축구', 'soccer'), scram('h/m/t/a', '수학', 'math'), scram('s/a/T/u/y/e/d', '화요일', 'Tuesday'), scram('o/p/m/r/e/u/c/t', '컴퓨터', 'computer'), scram('t/d/o/y/a', '오늘', 'today'),
      ...[['art', '미술'], ['day', '날, 요일'], ['music', '음악'], ['Saturday', '토요일'], ['piano', '피아노']].map(([e, k], _, arr) => match(e, ['미술', '음악', '날, 요일', '토요일', '피아노'], k)),
    ],
  },
  {
    id: 18, grade: 4, kind: 'word', ukey: '8', short: '단어8', unit: '8단원', title: '8단원 단어 시험', lead: '낱말 목록을 소리 내어 읽고 뜻을 익힌 뒤 문제를 풀어 보세요. 요일·나라 이름·I처럼 언제나 대문자인 낱말은 대문자로 써요.',
    summary: wordTable(pairs(
      [['one', '1'], ['two', '2'], ['three', '3'], ['four', '4'], ['five', '5'], ['six', '6'], ['seven', '7'], ['eight', '8'], ['nine', '9']],
      [['hundred', '100'], ['thousand', '1,000'], ['won', '원'], ['pencil', '연필'], ['pencil case', '필통'], ['comic book', '만화책'], ['toy car', '장난감 자동차'], ['much', '많이, 얼마'], ['take', '사다, 가져가다']])),
    questions: [
      toKo('three', ['3', '셋', '삼']), toKo('comic book', ['만화책']), toKo('seven', ['7', '일곱', '칠']), toKo('four', ['4', '넷', '사']), toKo('pencil case', ['필통']),
      toEn('1', 'one'), toEn('원', 'won'), toEn('연필', 'pencil'), toEn('1,000', ['thousand', 'one thousand', 'a thousand']), toEn('많이, 얼마', 'much'),
      spell('t __ y / c __ r', '장난감 자동차', ['o', 'a']), spell('n __ n __', '9', ['i', 'e']), spell('f __ v __', '5', ['i', 'e']), spell('h __ n d r __ d', '100', ['u', 'e']), spell('t __ k __', '사다, 가져가다', ['a', 'e']),
      scram('h/g/i/t/e', '8', 'eight'), scram('e/h/r/e/t', '3', 'three'), scram('o/k/o/c/m/i/b/c/o', '만화책', 'comic book'), scram('v/e/n/s/e', '7', 'seven'), scram('u/f/r/o', '4', 'four'),
      ...[['two', '2'], ['six', '6'], ['pencil case', '필통'], ['one', '1'], ['won', '원']].map(([e, k]) => match(e, ['2', '필통', '원', '1', '6'], k)),
    ],
  },
  {
    id: 19, grade: 4, kind: 'word', ukey: '9', short: '단어9', unit: '9단원', title: '9단원 단어 시험', lead: '낱말 목록을 소리 내어 읽고 뜻을 익힌 뒤 문제를 풀어 보세요. 요일·나라 이름·I처럼 언제나 대문자인 낱말은 대문자로 써요.',
    summary: wordTable(pairs(
      [['bag', '가방'], ['watch', '손목시계'], ['notebook', '공책'], ['cap', '모자'], ['umbrella', '우산'], ['ball', '공'], ['red', '빨간색'], ['blue', '파란색'], ['yellow', '노란색']],
      [['green', '초록색'], ['gray', '회색'], ['pink', '분홍색'], ['white', '흰색'], ['black', '검은색'], ['brown', '갈색'], ['your', '너의'], ['my', '나의'], ['this', '이것']])),
    questions: [
      toKo('green', ['초록색', '초록', '녹색']), toKo('blue', ['파란색', '파랑', '파랑색']), toKo('bag', ['가방']), toKo('watch', ['손목시계', '시계']), toKo('cap', ['모자']),
      toEn('나의', 'my'), toEn('분홍색', 'pink'), toEn('회색', ['gray', 'grey']), toEn('흰색', 'white'), toEn('검은색', 'black'),
      spell('y __ __ r', '너의', ['o', 'u']), spell('t h __ s', '이것', ['i']), spell('__ m b r e l l __', '우산', ['u', 'a']), spell('y __ l l __ w', '노란색', ['e', 'o']), spell('b r __ w n', '갈색', ['o']),
      scram('l/b/a/l', '공', 'ball'), scram('o/o/n/o/k/b/e/t', '공책', 'notebook'), scram('g/e/r/n/e', '초록색', 'green'), scram('u/l/b/e', '파란색', 'blue'), scram('a/t/h/w/c', '손목시계', 'watch'),
      ...[['red', '빨간색'], ['bag', '가방'], ['cap', '모자'], ['my', '나의'], ['pink', '분홍색']].map(([e, k]) => match(e, ['분홍색', '모자', '빨간색', '나의', '가방'], k)),
    ],
  },
  {
    id: 20, grade: 4, kind: 'word', ukey: '10', short: '단어10', unit: '10단원', title: '10단원 단어 시험', lead: '낱말 목록을 소리 내어 읽고 뜻을 익힌 뒤 문제를 풀어 보세요. 요일·나라 이름·I처럼 언제나 대문자인 낱말은 대문자로 써요.',
    summary: wordTable(pairs(
      [['time', '시각, 시간'], ['breakfast', '아침 식사'], ['lunch', '점심 식사'], ['dinner', '저녁 식사'], ['school', '학교'], ['bed', '침대, 잠자리'], ['homework', '숙제'], ['ten', '10']],
      [['eleven', '11'], ['twelve', '12'], ['thirteen', '13'], ['fourteen', '14'], ['fifteen', '15'], ['thirty', '30'], ['forty', '40'], ['fifty', '50']])),
    questions: [
      toKo('homework', ['숙제']), toKo('ten', ['10', '열', '십']), toKo('dinner', ['저녁 식사', '저녁', '저녁밥']), toKo('bed', ko('침대, 잠자리')), toKo('fourteen', ['14', '열넷', '십사']),
      toEn('학교', 'school'), toEn('50', 'fifty'), toEn('15', 'fifteen'), toEn('11', 'eleven'), toEn('점심 식사', 'lunch'),
      spell('f __ r t y', '40', ['o']), spell('t h __ r t y', '30', ['i']), spell('b r e __ k f __ s t', '아침 식사', ['a', 'a']), spell('t __ m __', '시각, 시간', ['i', 'e']), spell('t w __ l v __', '12', ['e', 'e']),
      scram('h/t/e/t/i/e/r/n', '13', 'thirteen'), scram('w/h/r/o/e/m/k/o', '숙제', 'homework'), scram('r/n/d/n/e/i', '저녁 식사', 'dinner'), scram('r/o/e/n/u/f/e/t', '14', 'fourteen'), scram('l/s/o/h/o/c', '학교', 'school'),
      ...[['ten', '10'], ['bed', '침대, 잠자리'], ['fifty', '50'], ['fifteen', '15'], ['eleven', '11']].map(([e, k]) => match(e, ['50', '15', '10', '침대, 잠자리', '11'], k)),
    ],
  },
  {
    id: 21, grade: 4, kind: 'word', ukey: '11', short: '단어11', unit: '11단원', title: '11단원 단어 시험', lead: '낱말 목록을 소리 내어 읽고 뜻을 익힌 뒤 문제를 풀어 보세요. 요일·나라 이름·I처럼 언제나 대문자인 낱말은 대문자로 써요.',
    summary: wordTable(pairs(
      [['clean', '청소하다'], ['read', '읽다'], ['watch TV', '텔레비전을 보다'], ['do homework', '숙제하다'], ['draw', '그리다'], ['sing', '노래하다'], ['help', '돕다']],
      [['room', '방'], ['book', '책'], ['game', '게임'], ['table', '탁자'], ['cookie', '과자'], ['picture', '그림'], ['sure', '물론, 좋아']])),
    questions: [
      toKo('draw', ['그리다', '그림 그리다', '그림을 그리다']), toKo('table', ['탁자', '테이블', '식탁']), toKo('read', ['읽다']),
      toKo('watch TV', ['텔레비전을 보다', '텔레비전 보다', '텔레비전 보기', 'TV를 보다', 'TV 보다', '티비를 보다', '티비 보다']), toKo('help', ['돕다', '도와주다', '도움']),
      toEn('청소하다', 'clean'), toEn('게임', 'game'), toEn('노래하다', 'sing'), toEn('방', 'room'), toEn('책', 'book'),
      spell('s __ r __', '물론, 좋아', ['u', 'e']), spell('d o / h o m __ w __ r k', '숙제하다', ['e', 'o']), spell('p i c t __ r __', '그림', ['u', 'e']), spell('c __ o k i __', '과자', ['o', 'e']), spell('d r __ w', '그리다', ['a']),
      scram('b/e/t/l/a', '탁자', 'table'), scram('a/r/d/e', '읽다', 'read'), scram('a/V/h/w/t/T/c', '텔레비전을 보다', 'watch TV'), scram('e/h/l/p', '돕다', 'help'), scram('c/e/n/l/a', '청소하다', 'clean'),
      ...[['game', '게임'], ['sing', '노래하다'], ['room', '방'], ['book', '책'], ['sure', '물론, 좋아']].map(([e, k]) => match(e, ['물론, 좋아', '방', '노래하다', '책', '게임'], k)),
    ],
  },
  {
    id: 22, grade: 4, kind: 'word', ukey: 's', short: '단어소리', unit: '소리와 철자', title: '소리와 철자 단어 시험', lead: '낱말 목록을 소리 내어 읽고 뜻을 익힌 뒤 문제를 풀어 보세요. 요일·나라 이름·I처럼 언제나 대문자인 낱말은 대문자로 써요.',
    summary: wordTable(pairs(
      [['lunch', '점심 식사'], ['touch', '만지다'], ['much', '많이'], ['chair', '의자'], ['bag', '가방']],
      [['bed', '침대'], ['six', '6'], ['sun', '해'], ['run', '달리다'], ['big', '큰']])),
    questions: [
      toKo('bag', ['가방']), toKo('bed', ['침대']), toKo('sun', ['해', '태양']), toKo('chair', ['의자']), toKo('six', ['6', '여섯', '육']),
      toEn('점심 식사', 'lunch'), toEn('큰', 'big'), toEn('달리다', 'run'), toEn('많이', 'much'), toEn('만지다', 'touch'),
      spell('c h __ __ r', '의자', ['a', 'i']), spell('l __ n c h', '점심 식사', ['u']), spell('m __ c h', '많이', ['u']), spell('t __ __ c h', '만지다', ['o', 'u']),
      scram('a/r/i/h/c', '의자', 'chair'), scram('n/c/h/l/u', '점심 식사', 'lunch'), scram('u/m/h/c', '많이', 'much'), scram('t/c/o/u/h', '만지다', 'touch'),
      ...[['bag', '가방'], ['bed', '침대'], ['sun', '해'], ['six', '6'], ['big', '큰']].map(([e, k]) => match(e, ['6', '큰', '해', '가방', '침대'], k)),
    ],
  },
];

// New Words · Key Expressions 철자 시험: 🔊 듣고 영어 철자 + 우리말 뜻을 함께 쓰기 (둘 다 맞아야 정답)
const sm = (en, ko, cs) => ({ t: 'spellmean', q: '🔊 잘 듣고, 영어 철자와 우리말 뜻을 쓰세요.', say: Array.isArray(en) ? en[0] : en, a: { en: Array.isArray(en) ? en : [en], ko }, cs });
const spellSummary = (words, exprs) => `<div class="cards"><div class="card"><h4>1. New Words</h4><table class="tbl words">${words.map(([e, k]) => `<tr><td class="en w">${e}</td><td>${k}</td></tr>`).join('')}</table></div>
  <div class="card dark"><h4>2. Key Expressions</h4>${exprs.map(([e, k]) => `<p class="big en">${e}</p><p class="note">${k}</p>`).join('')}</div></div>`;
const LEAD = '🔊 소리를 듣고 영어 철자와 우리말 뜻을 함께 쓰세요. 둘 다 맞아야 정답이에요. 문장은 첫 글자 대문자와 ’(어포스트로피)까지 지켜요. 요일·나라 이름·I처럼 언제나 대문자인 낱말도 대문자로 써요.';

WORD_SETS.push({
  id: 23, grade: 4, kind: 'spelltest', ukey: '10', short: '철자10', unit: '10단원', title: '10단원 New Words · Key Expressions 철자 시험', lead: LEAD,
  summary: spellSummary([['breakfast', '아침 식사'], ['dinner', '저녁 식사'], ['eleven', '11, 열하나'], ['fun', '재미있는'], ['movie', '영화'], ['twenty', '20, 스물'],
    ['music', '음악'], ['school', '학교'], ['thirty', '30, 서른'], ['time', '시간'], ['twelve', '12, 열둘'], ['forty', '40, 마흔']],
    [['What time is it?', '몇 시니?'], ['It’s ten thirty.', '10시 30분이야.'], ['It’s time for bed.', '잘 시간이야.']]),
  questions: [
    sm('breakfast', ['아침 식사', '아침', '아침밥']), sm('dinner', ['저녁 식사', '저녁', '저녁밥']), sm('eleven', ['11', '열하나', '십일']),
    sm('fun', ['재미있는', '재미있다', '재밌는', '재미', '즐거운']), sm('movie', ['영화']), sm('twenty', ['20', '스물', '이십']),
    sm('music', ['음악']), sm('school', ['학교']), sm('thirty', ['30', '서른', '삼십']), sm('time', ['시간', '시각']),
    sm('twelve', ['12', '열둘', '십이']), sm('forty', ['40', '마흔', '사십']),
    sm(['What time is it?'], ['몇 시니', '몇 시야', '몇 시예요', '지금 몇 시니', '지금 몇 시야', '몇 시입니까'], true),
    sm(['It’s ten thirty.', 'It is ten thirty.'], ['10시 30분이야', '10시 30분', '10시 30분이다', '10시 30분입니다', '열 시 삼십 분이야', '열 시 반이야', '10시 반이야'], true),
    sm(['It’s time for bed.', 'It is time for bed.'], ['잘 시간이야', '잘 시간이다', '잘 시간', '잠잘 시간이야', '자야 할 시간이야', '잘 시간입니다'], true),
  ],
});

WORD_SETS.push({
  id: 24, grade: 3, kind: 'spelltest', ukey: '3-11', short: '철자11', unit: '11단원', title: '11단원 New Words · Key Expressions 철자 시험', lead: LEAD,
  summary: spellSummary([['brother', '남자 형제'], ['for', '~를 위해'], ['grandfather', '할아버지'], ['grandmother', '할머니'], ['he', '그'],
    ['mom', '엄마'], ['pretty', '예쁜'], ['she', '그녀'], ['sister', '여자 형제'], ['who', '누구']],
    [['Who is he/she?', '그는 / 그녀는 누구니?'], ['He’s my dad.', '그는 나의 아빠셔.'], ['She’s my sister.', '그녀는 내 여동생이야.'], ['He’s tall.', '그는 키가 크시구나.']]),
  questions: [
    sm('brother', ['남자 형제', '형제', '형', '오빠', '남동생', '남자형제']), sm('for', ['~를 위해', '를 위해', '을 위해', '위해', '위해서', '위하여', '~을 위해', '~를 위하여']),
    sm('grandfather', ['할아버지']), sm('grandmother', ['할머니']), sm('he', ['그', '그는', '그 남자', '그가']),
    sm('mom', ['엄마', '어머니']), sm('pretty', ['예쁜', '예쁘다', '예뻐', '귀여운']), sm('she', ['그녀', '그녀는', '그녀가', '그 여자']),
    sm('sister', ['여자 형제', '자매', '누나', '언니', '여동생', '여자형제']), sm('who', ['누구', '누구니', '누가']),
    { ...sm(['Who is he/she?', 'Who is he?', 'Who is she?', 'Who’s he?', 'Who’s she?', 'Who is he / she?'], ['그는 누구니', '그녀는 누구니', '그는 / 그녀는 누구니', '그는/그녀는 누구니', '그는 누구야', '그녀는 누구야', '그는 누구예요', '그녀는 누구예요'], true), say: 'Who is he? Who is she?' },
    sm(['He’s my dad.', 'He is my dad.'], ['그는 나의 아빠셔', '그는 나의 아빠야', '그는 내 아빠야', '그는 내 아빠셔', '그는 우리 아빠야', '우리 아빠야', '내 아빠야', '나의 아빠셔'], true),
    sm(['She’s my sister.', 'She is my sister.'], ['그녀는 내 여동생이야', '그녀는 나의 여동생이야', '그녀는 내 언니야', '그녀는 내 누나야', '그녀는 나의 언니야', '그녀는 나의 누나야', '그녀는 내 여자 형제야', '그녀는 나의 자매야', '내 여동생이야'], true),
    sm(['He’s tall.', 'He is tall.'], ['그는 키가 크시구나', '그는 키가 크구나', '그는 키가 커', '그는 키가 크다', '그는 키가 크네', '키가 크시구나', '그는 키가 커요'], true),
  ],
});

WORD_SETS.push({
  id: 26, grade: 3, kind: 'spelltest', ukey: '3-10', short: '철자10', unit: '10단원', title: '10단원 New Words · Key Expressions 철자 시험', lead: LEAD,
  summary: spellSummary([['can', '~할 수 있다'], ['dance', '춤추다'], ['go', '가다'], ['helmet', '헬멧'], ['high', '높은, 높게'],
    ['ready', '준비가 된'], ['run', '달리다'], ['sing', '노래하다'], ['skate', '스케이트를 타다'], ['swim', '수영하다']],
    [['Can you skate?', '너 스케이트 탈 수 있니?'], ['Yes, I can. / No, I can’t.', '응, 할 수 있어. / 아니, 할 수 없어.'], ['I can dance.', '나는 춤을 출 수 있어.'], ['I can’t sing.', '나는 노래를 할 수 없어.']]),
  questions: [
    sm('can', ['~할 수 있다', '할 수 있다', '할수있다', '~할 수 있어', '할 수 있어', '수 있다']), sm('dance', ['춤추다', '춤', '춤을 추다', '춤추기', '춤을 춰']),
    sm('go', ['가다', '가']), sm('helmet', ['헬멧']), sm('high', ['높은', '높게', '높은, 높게', '높이', '높다']),
    sm('ready', ['준비가 된', '준비된', '준비', '준비되다', '준비됐어']), sm('run', ['달리다', '뛰다', '달리기', '달려']),
    sm('sing', ['노래하다', '노래', '노래 부르다', '노래를 부르다', '노래하기']), sm('skate', ['스케이트를 타다', '스케이트 타다', '스케이트', '스케이트를 타']),
    sm('swim', ['수영하다', '수영', '헤엄치다', '수영하기']),
    sm(['Can you skate?'], ['너 스케이트 탈 수 있니', '너는 스케이트를 탈 수 있니', '스케이트 탈 수 있니', '너 스케이트 탈 수 있어', '스케이트를 탈 수 있니'], true),
    { ...sm(['Yes, I can. / No, I can’t.', 'Yes, I can./No, I can’t.', 'Yes, I can. / No, I can not.'], ['응, 할 수 있어. / 아니, 할 수 없어', '응 할 수 있어 아니 할 수 없어', '응, 할 수 있어 / 아니, 할 수 없어', '네, 할 수 있어요. / 아니요, 할 수 없어요'], true), say: 'Yes, I can. No, I can’t.' },
    sm(['I can dance.'], ['나는 춤을 출 수 있어', '나는 춤출 수 있어', '나는 춤을 출 수 있다', '난 춤출 수 있어'], true),
    sm(['I can’t sing.', 'I cannot sing.', 'I can not sing.'], ['나는 노래를 할 수 없어', '나는 노래할 수 없어', '나는 노래를 못해', '나는 노래를 할 수 없다', '난 노래 못해', '나는 노래를 부를 수 없어'], true),
  ],
});

WORD_SETS.push({
  id: 30, grade: 4, kind: 'spelltest', ukey: '11', short: '철자11', unit: '11단원', title: '11단원 New Words · Key Expressions 철자 시험', lead: LEAD,
  summary: spellSummary([['cookie', '쿠키'], ['draw', '그리다'], ['homework', '숙제'], ['make', '만들다'], ['picture', '그림'],
    ['read', '읽다'], ['smell', '냄새가 나다'], ['sure', '그럼'], ['clean', '청소하다'], ['table', '탁자']],
    [['What are you doing?', '뭐 하고 있니?'], ['I’m doing homework.', '나는 숙제를 하고 있어.'], ['Can I help you?', '내가 도와줄까?'], ['Sure.', '그래.']]),
  questions: [
    sm('cookie', ['쿠키', '과자']), sm('draw', ['그리다', '그림 그리다', '그려']), sm('homework', ['숙제']), sm('make', ['만들다', '만들어']),
    sm('picture', ['그림', '사진']), sm('read', ['읽다', '읽어']), sm('smell', ['냄새가 나다', '냄새 나다', '냄새', '냄새를 맡다', '냄새가 난다']),
    sm('sure', ['그럼', '물론', '좋아', '그래', '물론이지']), sm('clean', ['청소하다', '청소', '깨끗하게 하다', '청소해']), sm('table', ['탁자', '테이블', '식탁']),
    sm(['What are you doing?'], ['뭐 하고 있니', '뭐 하니', '너는 뭐 하고 있니', '무엇을 하고 있니', '뭐 하고 있어', '너 뭐 하고 있니', '뭐 해'], true),
    sm(['I’m doing homework.', 'I am doing homework.', 'I’m doing my homework.'], ['나는 숙제를 하고 있어', '나는 숙제하고 있어', '숙제를 하고 있어', '나는 숙제를 하는 중이야', '난 숙제하고 있어'], true),
    sm(['Can I help you?'], ['내가 도와줄까', '제가 도와드릴까요', '도와줄까', '내가 도와줄까요', '도와드릴까요'], true),
    sm(['Sure.'], ['그래', '물론', '좋아', '그럼', '물론이지']),
  ],
});
