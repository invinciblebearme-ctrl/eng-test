// 판도라의 상자 계산 규칙 확인
import { CONCEPTS, gradeOne } from '../src/content.js';
import { scoreItem, studentAbility, groupSummary, levelOf, gradeOf } from '../src/ability.js';
const C = (id) => CONCEPTS.find((c) => c.id === id);
let bad = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(ok ? 'ok ' : 'BAD', name, ok ? '' : `→ ${JSON.stringify(got)} (want ${JSON.stringify(want)})`); };
const doms = (r) => r.out.map((o) => `${o.d}:${o.ok ? 1 : 0}`).join(' ');

// 듣고 요일 쓰기: 듣기·낱말·규칙. 소문자는 규칙 어김 + '대문자 규칙' 실수
const q1 = C(1).questions[0];
eq('요일 소문자', doms(scoreItem(q1, 'wednesday', false)), 'listen:0 word:0 rule:0');
eq('요일 소문자 종류', scoreItem(q1, 'wednesday', false).miss[0].kind, 'case');
eq('요일 맞음', doms(scoreItem(q1, 'Wednesday', true)), 'listen:1 word:1 rule:1');
eq('요일 철자 틀림은 규칙에서 뺌', doms(scoreItem(q1, 'Wensday', false)), 'listen:0 word:0');
// 철자·뜻: 철자 틀리고 뜻 맞음 → 듣기·낱말 X, 뜻 O
eq('철자·뜻 나눠 셈', doms(scoreItem(C(24).questions[0], ['brothr', '오빠'], false)), 'listen:0 word:0 read:1');
// 우리말 뜻 쓰기는 뜻 알기만
eq('우리말 뜻', doms(scoreItem(C(17).questions[0], '수학', true)), 'read:1');
// 단계·성취 기준
eq('단계', [95, 90, 80, 75, 60, 55, 40].map(levelOf), ['우수', '우수', '안정', '안정', '성장', '성장', '도전']);
eq('성취', [85, 80, 70, 60, 59].map(gradeOf), ['상', '상', '중', '중', '하']);

// 학생 한 명: 모두 맞히면 영역 100, 우수
const subs = [1, 2, 3, 13].map((id) => { const c = C(id); const answers = c.questions.map((q) => (q.t === 'spellmean' ? [q.a.en[0], q.a.ko[0]] : q.t === 'multi' ? q.a.map((x) => x[0]) : Array.isArray(q.a) ? q.a[0] : q.a)); return { concept: id, answers, marks: c.questions.map((q, i) => gradeOne(q, answers[i])), submitted_at: '2026-11-20T01:00:00Z' }; });
const full = studentAbility({ id: 1, class_no: 1, number: 1, name: '가짜' }, subs, C);
eq('만점 학생 단계', full.level, '우수');
eq('만점 학생 실수 없음', full.mistakes.length, 0);
const empty = studentAbility({ id: 2, class_no: 1, number: 2, name: '가짜2' }, [], C);
eq('기록 없음 → 자료 부족', [empty.overall, empty.level], [null, null]);
const g = groupSummary([full, empty]);
eq('요약: 측정 1명', [g.students, g.measured, g.levels['우수']], [2, 1, 1]);
console.log(bad ? `${bad} wrong` : 'ALL OK');
process.exit(bad ? 1 : 0);
