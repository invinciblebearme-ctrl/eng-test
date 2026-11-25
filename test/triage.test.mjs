// AI 검토 대상 고르기 규칙 확인
import { CONCEPTS } from '../src/content.js';
import { aiReason } from '../src/triage.js';
const Q = (cid, n) => CONCEPTS.find((c) => c.id === cid).questions[n - 1];
const cases = [
  // [시험, 문항, 학생 답, AI로 보내야 하나]
  [9, 7, 'yelow', true],            // 철자 1자
  [6, 4, 'fourty', true],           // 철자 1자
  [6, 4, 'fifty', false],           // 다른 낱말
  [13, 10, 'watchingTV', true],     // 띄어쓰기
  [11, 1, "It's four thirty", true],// 말 덧붙임
  [11, 1, 'nine forty', false],     // 다른 답
  [2, 3, 'friday', false],          // 대소문자만 (대소문자 구별 문항)
  [3, 1, 'musik', true],            // 철자
  [3, 1, '', false],                // 빈칸
  [1, 3, '화요일', false],          // 고르기 문항
  [9, 3, ['yellow', 'cap'], true],  // 빈칸 바뀜
  [9, 3, ['cap yellow', ''], true], // 한 칸에 몰아 씀
  [9, 3, ['bag', 'red'], false],    // 다른 답
  [24, 1, ['brother', '형님'], true],     // 뜻: 말 덧붙임(형)
  [24, 1, ['brothr', '오빠'], true],      // 철자 1자 + 뜻 맞음
  [24, 1, ['sister', '오빠'], false],     // 철자 완전히 틀림
  [24, 1, ['오빠', 'brother'], true],     // 칸 바뀜
  [17, 1, '수학과목', true],              // 우리말 덧붙임
  [17, 1, '과학', false],                 // 다른 뜻
  [25, 15, 'brothers', true],             // 단원평가 쓰기
  [25, 1, '②', false],                    // 단원평가 고르기
  [8, 1, 'umbrela', true],                // 긴 낱말 철자 1자
  [24, 3, ['grandfahter', '할아버지'], true], // 긴 낱말 철자 2자
  [4, 1, 'sevn', true],                   // 짧은 낱말 1자
  [4, 1, 'six', false],                   // 다른 숫자
  [22, 3, '해님', true],                  // 한 글자 뜻 + 덧붙임
];
let bad = 0;
for (const [cid, n, a, want] of cases) {
  const r = aiReason(Q(cid, n), a); const got = !!r;
  if (got !== want) bad++;
  console.log(got === want ? 'ok ' : 'BAD', `${cid}-${n}`, JSON.stringify(a), '→', r || '(보내지 않음)');
}
console.log(bad ? `${bad} wrong` : 'ALL OK');
