// AI에게 보낼 '애매한 오답'만 고르기 — 토큰 절약용
// 자동 채점에서 X가 나온 답 가운데, 아래처럼 정답과 아주 가까운 것만 AI가 본다.
//  - 철자 1~2자 차이 (짧은 낱말은 1자)          예: yelow ↔ yellow, fourty ↔ forty
//  - 띄어쓰기·문장부호만 다름                     예: watchingTV ↔ watching TV
//  - 말을 덧붙이거나 빠뜨림                       예: It's four thirty ↔ four thirty, 숙제하기 ↔ 숙제
//  - 칸을 잘못 맞춤 (빈칸 답이 서로 바뀜, 한 칸에 몰아 씀, 철자·뜻 칸이 바뀜)
// 보내지 않는 것: 빈칸, 고르기·순서·시각·빈칸 글자 문항, 전혀 다른 답,
//               대소문자를 지켜야 하는 문항에서 대소문자만 틀린 답(규칙상 분명한 오답)

const clean = (s) => String(s ?? '').normalize('NFC').replace(/[‘’`´]/g, "'").replace(/[“”]/g, '"').trim();
const lower = (s) => clean(s).toLowerCase();
const compact = (s) => lower(s).replace(/[\s.,!?'"~·/\-]/g, '');   // 띄어쓰기·문장부호 빼고 비교

function lev(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 99;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

// 학생 답 하나와 허용 정답들 비교 → 'exact' | 'case' | 이유 문자열(애매) | null(확실한 오답)
export function closeness(ans, accepted, cs) {
  const A = compact(ans);
  if (!A) return null;
  let best = null;
  for (const x of accepted) {
    const C = compact(x);
    if (!C) continue;
    if (A === C) {
      // 글자는 같고 대소문자만 다름: 대소문자를 지켜야 하는 문항이면 규칙상 오답이 분명 → AI 필요 없음
      const strip = (v) => clean(v).replace(/[\s.,!?'"~·/\-]/g, '');
      if (cs && strip(ans) !== strip(x)) { best = best || 'case'; continue; }
      return lower(ans) === lower(x) ? 'exact' : '띄어쓰기·문장부호 차이';
    }
    // 철자: 6자 이하 낱말은 1자, 더 긴 말은 2자 차이까지 (forty↔fifty처럼 다른 낱말이 되는 것은 제외)
    const limit = C.length <= 6 ? 1 : 2, d = C.length >= 3 ? lev(A, C) : 99;
    const hangul = /[가-힣]/.test(C), minLen = hangul ? 1 : 2, extra = hangul ? 4 : 14;
    if (d <= limit) best = best && best !== 'case' ? best : `철자 ${d}자 차이`;
    else if ((A.includes(C) || C.includes(A)) && Math.min(A.length, C.length) >= minLen && Math.abs(A.length - C.length) <= extra) best = best && best !== 'case' ? best : '말을 덧붙이거나 빠뜨림';
  }
  return best === 'case' ? null : best;
}

const asList = (a) => (Array.isArray(a) ? a : [a]);

// 문항 하나가 AI 검토 대상인지 → 이유 문자열 또는 null
export function aiReason(q, ans) {
  if (q.a == null) return null;
  if (['choice', 'pick', 'order', 'time', 'spell'].includes(q.t)) return null;
  if (q.t === 'text') { const r = closeness(ans, asList(q.a), q.cs && !q.ko); return r === 'exact' ? null : r; }   // 'exact' = 글자는 같고 대문자 규칙만 어김 → 분명한 오답
  if (q.t === 'spellmean') {
    if (!Array.isArray(ans)) return null;
    const en = closeness(ans[0], q.a.en, q.cs), ko = closeness(ans[1], q.a.ko, false);
    // 철자·뜻 칸이 바뀐 경우
    if (!en && !ko && closeness(ans[1], q.a.en, false) && closeness(ans[0], q.a.ko, false)) return '철자·뜻 칸이 바뀜';
    if (!en || !ko) return null;                       // 한쪽이 확실히 틀리면 AI 필요 없음
    const parts = [en, ko].filter((x) => x !== 'exact');
    return parts.length ? parts.join(', ') : null;   // 둘 다 'exact'면 대문자 규칙만 어긴 분명한 오답
  }
  if (q.t === 'multi') {
    if (!Array.isArray(ans)) return null;
    const blanks = q.a.map((acc, k) => closeness(ans[k], acc, q.cs));
    if (blanks.every(Boolean)) { const p = blanks.filter((x) => x !== 'exact'); return p.length ? p.join(', ') : null; }
    // 칸 위치: 학생 답들을 모으면 정답들과 같은 경우 (바뀜·몰아 씀)
    const all = compact(ans.join(' ')), want = compact(q.a.map((x) => x[0]).join(' '));
    const swapped = q.a.length === 2 && closeness(ans[0], q.a[1], q.cs) && closeness(ans[1], q.a[0], q.cs);
    if (swapped || (all && all === want)) return '칸 위치를 잘못 맞춤';
    return null;
  }
  return null;
}

// 제출 하나에서 AI가 볼 문항 [{ i, why }]
export function aiTargets(concept, answers, marks) {
  const out = [];
  concept.questions.forEach((q, i) => { if (!marks[i]) { const why = aiReason(q, answers[i]); if (why) out.push({ i, why }); } });
  return out;
}
