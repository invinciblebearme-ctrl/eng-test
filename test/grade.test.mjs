import { CONCEPTS, gradeOne, answerText, fillPattern } from '../src/content.js';
let bad = 0, n = 0; const pending = [];
for (const c of CONCEPTS) {
  // 기본 개념은 10문항, 다른 세트(단어·철자·단원평가)는 문항이 있으면 됨. 번호 중복도 확인
  if (c.kind === 'concept' ? c.questions.length !== 10 : !c.questions.length) { console.log('count', c.id, c.questions.length); bad++; }
  if (CONCEPTS.filter((x) => x.id === c.id).length > 1) { console.log('DUPLICATE id', c.id); bad++; }
  c.questions.forEach((q, i) => {
    n++;
    if (q.a == null) { pending.push(c.id + '-' + (i + 1)); return; }
    const a = q.t === 'choice' && c.kind === 'exam' ? q.a : q.t === 'spellmean' ? [q.a.en[0], q.a.ko[0]] : q.t === 'spell' ? q.a : q.t === 'order' && q.join === '' ? q.a.replace(/\s/g, '').split('') : q.t === 'multi' ? q.a.map((x) => x[0]) : q.t === 'pick' ? [...q.a].reverse() : q.t === 'order' ? q.a.replace(/[.?]$/, '').split(' ') : Array.isArray(q.a) ? q.a[0] : q.a;
    if (!gradeOne(q, a)) { bad++; console.log('FAIL', c.id, i + 1, JSON.stringify(a)); }
    if (q.opts && !q.opts.includes(q.a) && q.t === 'choice') { bad++; console.log('OPT', c.id, i + 1); }
    if (q.order && !q.words) bad++;
    if (q.t === 'order' && q.join === '') { const x = [...q.words].map((w) => w.toLowerCase()).sort().join(''), y = q.a.replace(/\s/g, '').toLowerCase().split('').sort().join(''); if (x !== y) { bad++; console.log('SCRAMBLE', c.id, i + 1, q.words.join(''), q.a); } }
    if (q.t === 'spell' && (q.pat.match(/__/g) || []).length !== q.a.length) { bad++; console.log('SPELL count', c.id, i + 1); }
  });
  console.log(c.id, c.questions.map((q) => answerText(q)).join(' | '));
  if (c.kind === 'word') console.log('   spell:', c.questions.filter((q) => q.t === 'spell').map((q) => fillPattern(q.pat, q.a)).join(', '));
}
// 변형 답 테스트
const t = (cid, qi, a, exp) => { const r = gradeOne(CONCEPTS[cid - 1].questions[qi - 1], a); if (r !== exp) { bad++; console.log('VAR', cid, qi, a, r); } };
t(1,1,' wednesday ',true); t(2,3,'friday',false); t(2,1,'Fri.',true); t(2,1,'fri',false);
t(5,2,'3000',true); t(5,5,'Two thousand won',true); t(5,5,'two thousands',false);
t(8,4,"it isn't",true); t(8,4,'it is not',true); t(10,1,'4시 30분',true); t(10,5,'12',true); t(10,5,'12:00',true); t(10,1,'3:30',false);
t(9,5,['My','ball','is','red'],true); t(9,5,['ball','My','is','red'],false); t(11,5,['What','time','is','it'],true);
t(16,5,['hat'],false); t(9,2,'grey',true); t(13,10,'watching tv',true); t(1,1,'',false);
t(17,1,'수학',true); t(17,1,' 수 학 ',true); t(22,3,'태양',true); t(20,4,'잠자리',true); t(20,4,'침대,잠자리',true); t(20,4,'침대',true);
t(17,6,'saturday',false); t(17,6,'Saturday',true); t(17,12,['O','a'],true); t(17,12,['o','e'],false);
t(18,18,'comicbook'.split(''),true); t(21,18,'watchTV'.split(''),true); t(21,18,'watchVT'.split(''),false); t(17,18,'Tuesday'.split(''),true);
t(17,22,'날, 요일',true); t(19,25,'분홍색',true); t(18,9,'one thousand',true);
t(24,1,['brother','오빠'],true); t(24,1,['brother',''],false); t(24,1,['bother','남자 형제'],false); t(24,2,['for','~를 위해'],true); t(24,2,['for','를위해'],true);
t(24,11,['Who is she?','그녀는 누구니?'],true); t(24,12,["He's my dad.",'그는 내 아빠야.'],true); t(24,12,['he is my dad','그는 내 아빠야'],false); t(23,14,['It’s ten thirty.','10시 30분이야.'],true);
console.log('pending answers:', pending.length, pending.join(' '));
console.log(n, 'questions;', bad ? bad + ' problems' : 'ALL OK');
