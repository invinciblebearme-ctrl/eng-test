// 판도라의 상자 — 학생이 사이트에서 푼 결과(개념 확인 문제·단어·철자 시험·단원평가)로 영어 실력을 계산
// 교사 화면(/api/t/pandora)과 Claude 예약 작업이 같은 숫자를 쓰도록 계산은 모두 여기서 함.
//
// 영역 5가지 (문항마다 하나 이상에 들어감)
//   듣기        : 듣고 고르기·받아쓰기 (음성이 있는 문항)
//   뜻 알기     : 우리말 뜻 쓰기, 낱말과 뜻 잇기·고르기, 시계·그림 읽기
//   낱말 쓰기   : 낱말 철자 (빈칸 글자, 한 낱말 쓰기, 철자·뜻 문항의 철자)
//   문장 쓰기   : 문장·표현 쓰기, 낱말 순서 맞추기, 빈칸 여러 개
//   대문자·문장부호 : 영어 답 가운데 대문자·'(아포스트로피)가 필요한 것 — 글자는 맞았을 때 규칙을 지켰는지
// 단계(종합): 우수 90+ · 안정 75+ · 성장 55+ · 도전 그 아래
// 성취 수준(영역 묶음): 듣기 / 읽기(뜻 알기) / 쓰기(낱말·문장·규칙) — 상 80+ · 중 60+ · 하 그 아래
// 문항이 5개보다 적은 영역은 '자료 부족'으로 두고 종합에서 뺌.
import { gradeOne, answerText } from './content.js';
import { closeness } from './triage.js';

export const DOMAINS = [
  { k: 'listen', name: '듣기', area: '듣기' },
  { k: 'read', name: '뜻 알기', area: '읽기' },
  { k: 'word', name: '낱말 쓰기', area: '쓰기' },
  { k: 'sent', name: '문장 쓰기', area: '쓰기' },
  { k: 'rule', name: '대문자·문장부호', area: '쓰기' },
];
export const AREAS = ['듣기', '읽기', '쓰기'];
export const MIN_ITEMS = 5;
export const levelOf = (s) => (s == null ? null : s >= 90 ? '우수' : s >= 75 ? '안정' : s >= 55 ? '성장' : '도전');
export const gradeOf = (s) => (s == null ? null : s >= 80 ? '상' : s >= 60 ? '중' : '하');
export const LEVELS = ['우수', '안정', '성장', '도전'];

const asList = (a) => (Array.isArray(a) ? a : [a]);
const hasSay = (q) => !!(q.say || q.audio || /잘 듣고|듣고 /.test(q.q || ''));
const isSentence = (s) => /\s/.test(String(s).trim()) || /[.?!]$/.test(String(s).trim());
const compact = (s) => String(s ?? '').normalize('NFC').replace(/[‘’`´]/g, "'").toLowerCase().replace(/[\s.,!?'"~·/\-]/g, '');
const needsRule = (keys, cs) => cs || keys.some((k) => /[A-Z'’]/.test(String(k)));   // 대문자나 '가 들어간 답만 규칙을 셈
const blank = (a) => a == null || String(a).trim() === '' || /모르겠/.test(String(a));

// 영어 답 하나의 '규칙' 판정: 글자(대소문자·부호 빼고)가 맞을 때만 → true(지킴)/false(어김), 그 밖은 null(셈에서 뺌)
function ruleCheck(ok, ans, keys, cs) {
  if (!needsRule(keys, cs) || blank(ans)) return null;
  const A = compact(ans);
  if (!keys.some((k) => compact(k) === A)) return null;
  return !!ok;
}

// 틀린 답의 종류
function mistakeKind(ans, keys, cs, ko) {
  if (blank(ans)) return 'blank';
  const A = compact(ans);
  if (!ko && keys.some((k) => compact(k) === A)) {
    const strip = (v) => String(v).replace(/[‘’`´]/g, "'").replace(/[\s.,!?"~·/\-]/g, '');
    return keys.some((k) => strip(k).toLowerCase() === strip(ans).toLowerCase() && strip(k) !== strip(ans)) ? 'case' : 'punct';
  }
  if (!ko && keys.some((k) => /teen$/i.test(k) && A === compact(k).replace(/teen$/, 'ty') || /ty$/i.test(k) && A === compact(k).replace(/ty$/, 'teen'))) return 'teen';
  const c = closeness(ans, keys, false);
  if (c && /철자/.test(c)) return ko ? 'meaning' : 'spell';
  if (c) return ko ? 'meaning' : 'partial';
  return ko ? 'meaning' : 'other';
}
export const MISTAKE_LABEL = { case: '대문자 규칙', punct: '띄어쓰기·문장부호', teen: '-teen / -ty 혼동', spell: '철자 실수', partial: '말을 빠뜨리거나 덧붙임', meaning: '우리말 뜻', blank: '빈칸·모르겠어요', other: '다른 답', choice: '고르기' };

// 문항 하나 → [{d: 영역, ok}] 와 틀린 답 정보
export function scoreItem(q, ans, mark) {
  const out = [], miss = [];
  const add = (d, ok) => out.push({ d, ok: !!ok });
  if (q.a == null) return { out, miss };
  switch (q.t) {
    case 'spellmean': {
      const a = Array.isArray(ans) ? ans : [];
      const enOk = mark || gradeOne({ t: 'text', a: q.a.en, cs: q.cs }, a[0]);
      const koOk = mark || gradeOne({ t: 'text', ko: true, a: q.a.ko }, a[1]);
      if (hasSay(q)) add('listen', enOk);
      add(q.a.en.some(isSentence) ? 'sent' : 'word', enOk);
      add('read', koOk);
      const r = ruleCheck(enOk, a[0], q.a.en, q.cs); if (r != null) add('rule', r);
      if (!enOk) miss.push({ kind: mistakeKind(a[0], q.a.en, q.cs, false), ans: a[0], key: q.a.en[0] });
      if (!koOk) miss.push({ kind: mistakeKind(a[1], q.a.ko, false, true), ans: a[1], key: q.a.ko[0] });
      break;
    }
    case 'text': {
      const keys = asList(q.a);
      if (q.ko) { add('read', mark); if (!mark) miss.push({ kind: mistakeKind(ans, keys, false, true), ans, key: keys[0] }); break; }
      if (hasSay(q)) add('listen', mark);
      add(keys.some(isSentence) ? 'sent' : 'word', mark);
      const r = ruleCheck(mark, ans, keys, q.cs); if (r != null) add('rule', r);
      if (!mark) miss.push({ kind: mistakeKind(ans, keys, q.cs, false), ans, key: keys[0] });
      break;
    }
    case 'spell': add(hasSay(q) ? 'listen' : 'word', mark); if (hasSay(q)) add('word', mark); if (!mark) miss.push({ kind: blank(Array.isArray(ans) ? ans.join('') : ans) ? 'blank' : 'spell', ans: Array.isArray(ans) ? ans.join(',') : ans, key: answerText(q) }); break;
    case 'order': case 'multi':
      if (hasSay(q)) add('listen', mark);
      add('sent', mark);
      if (q.t === 'multi' && Array.isArray(ans)) q.a.forEach((acc, i) => { const r = ruleCheck(gradeOne({ t: 'text', a: acc, cs: q.cs }, ans[i]), ans[i], acc, q.cs); if (r != null) add('rule', r); });
      if (!mark) miss.push({ kind: blank(Array.isArray(ans) ? ans.join('') : ans) ? 'blank' : 'other', ans: Array.isArray(ans) ? ans.join(' ') : ans, key: answerText(q) });
      break;
    default: // choice, pick, time
      add(hasSay(q) ? 'listen' : 'read', mark);
      if (!mark) miss.push({ kind: blank(ans) ? 'blank' : 'choice', ans: Array.isArray(ans) ? ans.join(', ') : ans, key: answerText(q) });
  }
  return { out, miss };
}

const pct = (ok, n) => (n ? Math.round((ok / n) * 100) : null);
const weekKey = (iso) => { const d = new Date(iso); if (isNaN(d)) return null; const day = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - day); return d.toISOString().slice(0, 10); };

// 학생 한 명. subs: [{concept, answers, marks, status, submitted_at}], conceptOf: id → 개념
export function studentAbility(st, subs, conceptOf) {
  const dom = Object.fromEntries(DOMAINS.map((d) => [d.k, { ok: 0, n: 0 }]));
  const mk = {}, weeks = {}, sets = { concept: 0, word: 0, spelltest: 0, exam: 0 };
  let items = 0, right = 0, last = null;
  for (const s of subs) {
    const c = conceptOf(s.concept); if (!c) continue;
    sets[c.kind] = (sets[c.kind] || 0) + 1;
    if (!last || s.submitted_at > last) last = s.submitted_at;
    const wk = weekKey(s.submitted_at);
    c.questions.forEach((q, i) => {
      const mark = !!(s.marks && s.marks[i]);
      const { out, miss } = scoreItem(q, s.answers ? s.answers[i] : null, mark);
      if (!out.length) return;
      items++; if (mark) right++;
      if (wk) { const w = (weeks[wk] = weeks[wk] || { ok: 0, n: 0 }); w.n++; if (mark) w.ok++; }
      for (const o of out) { dom[o.d].n++; if (o.ok) dom[o.d].ok++; }
      for (const m of miss) { const x = (mk[m.kind] = mk[m.kind] || { n: 0, ex: [] }); x.n++; if (m.kind !== 'blank' && x.ex.length < 3 && m.ans != null && String(m.ans).replace(/[,\s]/g, '')) x.ex.push({ ans: String(m.ans).slice(0, 40), key: String(m.key).slice(0, 40), set: c.kind === 'concept' ? `개념 ${c.id}` : c.title.slice(0, 20), n: i + 1 }); }
    });
  }
  const domains = {};
  for (const d of DOMAINS) { const x = dom[d.k]; domains[d.k] = { ok: x.ok, n: x.n, score: x.n >= MIN_ITEMS ? pct(x.ok, x.n) : null }; }
  const scored = DOMAINS.filter((d) => domains[d.k].score != null);
  const overall = scored.length ? Math.round(scored.reduce((a, d) => a + domains[d.k].score, 0) / scored.length) : null;
  const areas = {};
  for (const a of AREAS) { const ds = DOMAINS.filter((d) => d.area === a); const ok = ds.reduce((s, d) => s + dom[d.k].ok, 0), n = ds.reduce((s, d) => s + dom[d.k].n, 0); areas[a] = { ok, n, score: n >= MIN_ITEMS ? pct(ok, n) : null, grade: n >= MIN_ITEMS ? gradeOf(pct(ok, n)) : null }; }
  const ranked = scored.map((d) => ({ k: d.k, name: d.name, score: domains[d.k].score })).sort((a, b) => b.score - a.score);
  const strong = ranked.filter((d) => d.score >= 80).slice(0, 2), weak = ranked.filter((d) => d.score < 70).reverse().slice(0, 2);
  const mistakes = Object.entries(mk).filter(([k]) => k !== 'other' && k !== 'choice').map(([k, v]) => ({ k, label: MISTAKE_LABEL[k], n: v.n, ex: v.ex })).sort((a, b) => b.n - a.n).slice(0, 4);
  const trend = Object.entries(weeks).sort(([a], [b]) => (a < b ? -1 : 1)).slice(-8).map(([w, v]) => ({ w, rate: pct(v.ok, v.n), n: v.n }));
  return { id: st.id, class_no: st.class_no, number: st.number, name: st.name, subs: subs.length, sets, items, rate: pct(right, items), domains, overall, level: levelOf(overall), areas, strong, weak, mistakes, trend, last_at: last };
}

// 여러 학생 요약 (반·학년)
export function groupSummary(list) {
  const has = list.filter((s) => s.overall != null);
  const avg = (f) => { const v = has.map(f).filter((x) => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
  const domains = Object.fromEntries(DOMAINS.map((d) => [d.k, avg((s) => s.domains[d.k].score)]));
  const levels = Object.fromEntries(LEVELS.map((l) => [l, has.filter((s) => s.level === l).length]));
  const areas = Object.fromEntries(AREAS.map((a) => [a, { 상: 0, 중: 0, 하: 0, avg: avg((s) => s.areas[a].score) }]));
  for (const s of has) for (const a of AREAS) if (s.areas[a].grade) areas[a][s.areas[a].grade]++;
  const ranked = DOMAINS.filter((d) => domains[d.k] != null).sort((a, b) => domains[a.k] - domains[b.k]);
  const mk = {};
  for (const s of has) for (const m of s.mistakes) mk[m.k] = (mk[m.k] || 0) + m.n;
  return {
    students: list.length, measured: has.length, overall: avg((s) => s.overall), level: levelOf(avg((s) => s.overall)), domains, levels, areas,
    weakest: ranked.slice(0, 2).map((d) => ({ k: d.k, name: d.name, score: domains[d.k] })),
    mistakes: Object.entries(mk).map(([k, n]) => ({ k, label: MISTAKE_LABEL[k], n })).sort((a, b) => b.n - a.n).slice(0, 4),
    help: has.filter((s) => s.level === '도전').map((s) => ({ id: s.id, class_no: s.class_no, number: s.number, name: s.name, overall: s.overall })),
  };
}

// 생활기록부 문구 초안을 위한 AI 입력 (교사 버튼 /api/t/pandora-record 가 씀)
// bank: app_settings record_examples_<학년> = {units: {"7": {basic: [...], good: [...]}}} 또는 {any: [...]} (단원 무관 문체 참고) — 학생이 푼 단원·수준에 맞는 예시를 섞어서 최대 9개
export function recordInput(st, rows, conceptOf, bank, rand = Math.random) {
  const ab = studentAbility(st, rows, conceptOf);
  const word = (s) => (s == null ? '자료 부족' : s >= 85 ? '아주 잘함' : s >= 70 ? '잘함' : s >= 55 ? '보통' : '어려워함');
  const good = [];
  for (const r of rows) { const c = conceptOf(r.concept); if (!c) continue; c.questions.forEach((q, i) => { const a = r.answers && r.answers[i], v = Array.isArray(a) ? (q.t === 'spellmean' ? a[0] : q.t === 'order' ? a.join(' ') : '') : a; if (r.marks[i] && typeof v === 'string' && /[A-Za-z]{3,}/.test(v) && good.length < 12 && !good.includes(v.trim())) good.push(v.trim()); }); }
  const sets = Object.entries(ab.sets).filter(([, n]) => n).map(([k, n]) => `${{ concept: '개념 확인 문제', word: '단어 시험', spelltest: '철자 시험', exam: '단원평가' }[k]} ${n}개`).join(', ');
  const byUnit = {};
  for (const r of rows) { const c = conceptOf(r.concept), u = c && parseInt(c.unit, 10); if (!u) continue; const x = (byUnit[u] = byUnit[u] || { ok: 0, n: 0 }); x.n += r.marks.length; x.ok += r.marks.filter(Boolean).length; }
  const units = Object.keys(byUnit).sort((a, b) => a - b);
  let ex = [];
  if (bank && bank.units) { const lv = ab.overall >= 75 ? 'good' : 'basic'; for (const u of units) { const list = (bank.units[u] && bank.units[u][lv]) || []; ex.push(...[...list].sort(() => rand() - 0.5).slice(0, 3)); } }
  // 단원이 맞는 예시가 없으면(예: 다른 학기 평어) 문체 참고용 any 목록에서 고름
  if (!ex.length && bank && Array.isArray(bank.any)) ex = [...bank.any].sort(() => rand() - 0.5).slice(0, 6);
  ex = ex.slice(0, 9);
  const info = [`${st.grade}학년 영어. 푼 시험: ${sets}.`,
    `영역별: ${DOMAINS.map((d) => `${d.name} ${word(ab.domains[d.k].score)}`).join(' / ')}`,
    `강점: ${ab.strong.map((x) => x.name).join(', ') || '뚜렷하지 않음'} · 보완: ${ab.weak.map((x) => x.name).join(', ') || '없음'}`,
    `바르게 쓴 낱말·표현 예: ${good.join(', ') || '없음'}`,
    `자주 한 실수: ${ab.mistakes.map((m) => `${m.label}${m.ex[0] ? ` (예: ${m.ex[0].ans} → ${m.ex[0].key})` : ''}`).join('; ') || '없음'}`,
    `주별 변화: ${ab.trend.length > 1 ? (ab.trend[ab.trend.length - 1].rate >= ab.trend[0].rate ? '나아지고 있음' : '최근 조금 낮아짐') : '기록이 짧음'}`].join('\n')
    + (units.length ? `\n단원별: ${units.map((u) => `${u}단원 ${word(Math.round(byUnit[u].ok / byUnit[u].n * 100))}`).join(', ')}` : '')
    + (ex.length ? `\n\n[참고 예시] (이 선생님이 쓰는 문체 — 그대로 베끼지 말 것)\n${ex.map((x) => '- ' + x).join('\n')}` : '');
  return { ab, info, ex };
}
