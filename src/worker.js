import { CONCEPTS, UNITS, gradeOne, answerText, publicConcepts } from './content.js';
import { aiGrade } from './ai.js';
import { aiTargets } from './triage.js';
import { STUDENT_HTML, TEACHER_HTML, STYLE_CSS, COMMON_JS, XLSX_JS, QR_JS } from './assets.js';

const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const fail = (msg, status = 400, extra) => json({ error: msg, ...(extra || {}) }, status);
const text = (body, type) => new Response(body, { headers: { 'content-type': type + '; charset=utf-8', 'cache-control': 'no-cache' } });

// ---------- Supabase (PostgREST) ----------
const UPGRADE_MSG = '데이터베이스 업그레이드가 필요해요. Supabase SQL Editor에서 sql/upgrade-2026-11.sql을 실행한 뒤 다시 해 주세요.';
class HttpError extends Error { constructor(m, s, extra) { super(m); this.status = s; this.extra = extra; } }
async function sb(env, path, { method = 'GET', body, prefer, count } = {}) {
  const key = env.SUPABASE_SERVICE_KEY;
  const headers = { apikey: key, 'content-type': 'application/json' };
  if (key.startsWith('eyJ')) headers.authorization = 'Bearer ' + key; // 예전 JWT 형식 키
  const pref = [prefer, count ? 'count=exact' : ''].filter(Boolean).join(',');
  if (pref) headers.prefer = pref;
  const r = await fetch(env.SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) {
    const t = await r.text();
    if (/relation .* does not exist|Could not find the table/i.test(t)) throw new HttpError('데이터베이스 표가 아직 없어요. Supabase에서 schema.sql을 먼저 실행해 주세요.', 503);
    if (/column .* does not exist|Could not find the .* column|Could not find the function|function .* does not exist|PGRST202|PGRST204|"42703"|"42883"/i.test(t)) throw new HttpError(UPGRADE_MSG, 503, { upgrade: true });
    throw new HttpError('데이터베이스 오류: ' + t.slice(0, 200), 502);
  }
  const t = await r.text();   // return=minimal이면 본문이 비어 있음 (201/204)
  const data = t ? JSON.parse(t) : null;
  if (count) { const cr = r.headers.get('content-range') || ''; const tot = parseInt(cr.split('/')[1], 10); return { data: data || [], total: Number.isFinite(tot) ? tot : null }; }
  return data;
}
// 여러 쪽으로 나눠 모두 읽기 (Supabase는 한 번에 최대 1000행만 돌려줌). path에 order가 없으면 id 순.
async function sbAll(env, path, page = 1000) {
  const ord = /[?&]order=/.test(path) ? '' : '&order=id.asc';
  const out = [];
  for (let off = 0; ;) {
    const { data, total } = await sb(env, `${path}${ord}&limit=${page}&offset=${off}`, { count: true });
    out.push(...data); off += data.length;
    if (!data.length || (total != null ? off >= total : data.length < page)) break;
  }
  return out;
}
const rpc = (env, fn, args) => sb(env, 'rpc/' + fn, { method: 'POST', body: args });
// DB 업그레이드(sql/upgrade-2026-11.sql) 여부 — 1분 동안 기억
const SCHEMA = new Map();   // DB 주소 → { v, at }
async function schemaV(env, fresh) {
  const k = env.SUPABASE_URL, c = SCHEMA.get(k);
  if (!fresh && c && Date.now() - c.at < 60000) return c.v;
  let v = 1;
  try { v = +(await rpc(env, 'eng_schema_version', {})) || 1; } catch (e) { if (!(e.extra && e.extra.upgrade) && e.status !== 404) throw e; }
  SCHEMA.set(k, { v, at: Date.now() });
  return v;
}
// 업그레이드가 꼭 필요한 쓰기: 없으면 안내 후 중단 (예전 여러 요청 방식으로 폴백하지 않음)
async function needV2(env) { if ((await schemaV(env)) < 2 && (await schemaV(env, true)) < 2) throw new HttpError(UPGRADE_MSG, 503, { upgrade: true }); }
const activeQ = (v) => (v >= 2 ? '&archived_at=is.null' : '');

// ---------- 교사 토큰 (HMAC) ----------
const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function hmac(env, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode('eng4:' + env.TEACHER_PASSWORD), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
async function makeToken(env) { const exp = String(Date.now() + 1000 * 60 * 60 * 24 * 30); return exp + '.' + (await hmac(env, exp)); }
async function checkToken(env, req) {
  const t = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const [exp, sig] = t.split('.');
  if (!exp || !sig || +exp < Date.now()) return false;
  const good = await hmac(env, exp);
  if (good.length !== sig.length) return false;
  let diff = 0; for (let i = 0; i < good.length; i++) diff |= good.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}
function safeEqual(a, b) {
  a = String(a); b = String(b); let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}

// ---------- 도우미 ----------
const conceptOf = (id) => CONCEPTS.find((c) => c.id === +id);
const int = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };
// 닫힌 시험 번호 (test_settings에 enabled=false)
async function closedSet(env) { const r = await sb(env, 'test_settings?select=concept&enabled=eq.false'); return new Set(r.map((x) => x.concept)); }
const aiOn = (env) => !!(env.AI_API_URL && env.AI_API_KEY && env.AI_MODEL);
const marksOf = (sub) => sub.auto.map((a, i) => (sub.overrides && sub.overrides[i] != null ? !!sub.overrides[i] : a));
const normName = (v) => String(v ?? '').normalize('NFC').replace(/[\s​ ]+/g, '').slice(0, 40);
const normId = (v) => String(v ?? '').normalize('NFKC').trim().toLowerCase().replace(/[^a-z0-9._@-]/g, '').slice(0, 60);
const normIds = (v) => [...new Set((Array.isArray(v) ? v : String(v ?? '').split(/[\s,;/]+/)).map(normId).filter(Boolean))].slice(0, 5);
const cleanOverrides = (src) => { const o = {}; for (const [k, v] of Object.entries(src || {})) if (int(k) != null && int(k) >= 0 && int(k) < 40) o[int(k)] = !!v; return o; };
// AI가 볼 문항: 선생님이 직접 정한 O/X(overrides)는 빼고
const aiNeedOf = (s, c) => aiTargets(c, s.answers, marksOf(s)).filter((t) => !(s.overrides && s.overrides[t.i] != null)).length;
// 한 요청에서 쓰기를 몇 번까지 할지 (Cloudflare 바깥 요청 50개 제한 아래로 여유 있게)
const WRITE_BUDGET = 30;
const chunks = (xs, n = 200) => { const out = []; for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n)); return out; };

// 학생용 공개 세트 (정답·정리 없음) + 문항 수·내용 버전(임시저장 확인용)
const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); };
const PUB = new Map(publicConcepts(null).map((c) => [c.id, { ...c, questionCount: c.questions.length, contentVersion: fnv(JSON.stringify(c.questions)) }]));
const liteOf = ({ questions, summary, ...c }) => c;

// 학생 로그인 표 (학생 번호.만료.서명)
async function shmac(env, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode('stu:' + env.SUPABASE_SERVICE_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
async function studentToken(env, sid) { const m = sid + '.' + (Date.now() + 1000 * 60 * 60 * 24 * 180); return m + '.' + (await shmac(env, m)); }
async function studentFrom(env, req) {
  const t = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const [sid, exp, sig] = t.split('.');
  if (!sid || !exp || !sig || +exp < Date.now() || !safeEqual(sig, await shmac(env, sid + '.' + exp))) throw new HttpError('다시 로그인해 주세요', 401);
  return getStudent(env, sid);
}
async function getStudent(env, id, { teacher } = {}) {
  const v = await schemaV(env);
  const r = await sb(env, `students?select=id,grade,class_no,number,name${v >= 2 ? ',archived_at' : ''}&id=eq.${int(id)}`);
  if (!r.length) throw new HttpError('학생을 찾을 수 없어요. 다시 로그인해 주세요.', 401);
  if (!teacher && r[0].archived_at) throw new HttpError('명렬표에서 빠진 학생이에요. 선생님께 말씀드려요.', 401);
  const { archived_at, ...st } = r[0];
  return teacher ? r[0] : st;
}
// 학생에게 보여 줄 제출 (채점 확정 전에는 점수·정답 없음)
function studentSub(c, s) {
  const out = { answers: s.answers, status: s.status };
  if (s.status === 'graded') {
    const marks = marksOf(s);
    Object.assign(out, { marks, score: marks.filter(Boolean).length, feedback: s.feedback, correct: c.questions.map(answerText), graded_at: s.graded_at, submitted_at: s.submitted_at, attempt: s.attempt || 1 });
  }
  return out;
}
// rev(버전)이 맞을 때만 고치기. 맞지 않으면 409와 지금 값. rev는 DB 트리거가 1 올림(sql/upgrade-2026-11.sql)
async function patchRev(env, id, rev, patch, sel = 'id,rev') {
  const cur = rev != null ? int(rev) : (await sb(env, `submissions?select=rev&id=eq.${int(id)}`))[0]?.rev;
  if (cur == null) throw new HttpError('제출을 찾을 수 없어요 (다시 풀게 했거나 지워졌을 수 있어요)', 404);
  const r = await sb(env, `submissions?id=eq.${int(id)}&rev=eq.${cur}&select=${sel}`, { method: 'PATCH', prefer: 'return=representation', body: patch });
  if (!r.length) {
    const now = await sb(env, `submissions?select=id,rev,status,overrides,feedback,feedback_draft,reviewed_at&id=eq.${int(id)}`);
    if (!now.length) throw new HttpError('제출을 찾을 수 없어요 (다시 풀게 했거나 지워졌을 수 있어요)', 404);
    throw new HttpError('다른 화면(또는 예약 작업)에서 먼저 바뀌었어요. 새로고침한 뒤 다시 해 주세요.', 409, { conflict: true, current: now[0] });
  }
  return r[0];
}

// ---------- 오류 기록 (error_log 표 + 선택: 텔레그램) ----------
// 500번대만. 같은 오류는 1분에 한 번 기록, 텔레그램은 10분에 한 번. 기록이 실패해도 원래 응답에는 영향 없음.
// 쿼리 문자열·학생 답·토큰은 남기지 않음.
const ERR_SEEN = new Map(), TG_SEEN = new Map();
const seenRecently = (m, key, ms) => { const now = Date.now(), t = m.get(key); if (t && now - t < ms) return true; if (m.size > 300) m.clear(); m.set(key, now); return false; };
async function logError(env, info) {
  try {
    const row = { source: info.source || 'server', method: String(info.method || '').slice(0, 10), path: String(info.path || '').slice(0, 120), status: info.status ?? null, message: String(info.message || '').replace(/Bearer\s+\S+/gi, 'Bearer ***').slice(0, 300), detail: info.detail || null };
    const key = `${env.SUPABASE_URL}|${row.source}|${row.path}|${row.status}|${row.message.slice(0, 80)}`;
    if (seenRecently(ERR_SEEN, key, 60000)) return;
    console.error('eng-error', JSON.stringify(row));
    await sb(env, 'error_log', { method: 'POST', prefer: 'return=minimal', body: [row] }).catch(() => {});
    if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID && !seenRecently(TG_SEEN, key, 600000)) {
      const where = row.source === 'server' ? '서버' : row.source === 'teacher' ? '교사 화면' : '학생 화면';
      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: `⚠️ eng-test ${where} 오류\n${row.method} ${row.path}${row.status ? ' → ' + row.status : ''}\n${row.message}` }) }).catch(() => {});
    }
  } catch {}
}
const later = (ctx, p) => (ctx && typeof ctx.waitUntil === 'function' ? ctx.waitUntil(p) : p);
const CLIENT_ERR = { n: 0, at: 0 };   // 화면 오류 받기: 1분에 30건까지

// ---------- 듣기·그림 파일 (R2) — 로그인한 학생·교사만 ----------
async function media(req, env, url) {
  const t = url.searchParams.get('t') || '';
  const fake = new Request(url, { headers: { authorization: 'Bearer ' + t } });
  let ok = await checkToken(env, fake).catch(() => false);
  if (!ok) ok = await studentFrom(env, fake).then(() => true).catch(() => false);
  if (!ok) return new Response('로그인이 필요해요', { status: 401 });
  if (!env.MEDIA) return new Response('no media', { status: 404 });
  const key = decodeURIComponent(url.pathname.slice('/media/'.length));
  if (!/^[\w\-/.]+$/.test(key) || key.includes('..')) return new Response('bad key', { status: 400 });
  const obj = await env.MEDIA.get(key, { range: req.headers });
  if (!obj) return new Response('Not found', { status: 404 });
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set('etag', obj.httpEtag); h.set('accept-ranges', 'bytes'); h.set('cache-control', 'private, max-age=86400');
  if (obj.range && req.headers.get('range')) {
    const off = obj.range.offset ?? 0, len = obj.range.length ?? obj.size - off;
    h.set('content-range', `bytes ${off}-${off + len - 1}/${obj.size}`); h.set('content-length', String(len));
    return new Response(obj.body, { status: 206, headers: h });
  }
  h.set('content-length', String(obj.size));
  return new Response(obj.body, { headers: h });
}

// 명렬표 파일 → 정리된 반 목록 [{grade, class_no, students:[{number, name, login_ids|null}]}]
function normRoster(classes) {
  const out = [];
  for (const cl of classes || []) {
    const c = int(cl.class_no), g = int(cl.grade) || 4; if (!c || c < 1 || c > 15 || g < 1 || g > 6) continue;
    const by = new Map();
    for (const s of cl.students || []) {
      const number = int(s.number), name = normName(s.name);
      if (!(number && number > 0 && number < 100 && name)) continue;
      const ids = s.login_ids != null ? normIds(s.login_ids) : null;
      by.set(number, { number, name, login_ids: ids && ids.length ? ids : null });   // ID 없으면 기존 ID는 그대로 둠
    }
    const prev = out.find((x) => x.grade === g && x.class_no === c);   // 같은 반이 두 번 오면 합치되 번호는 하나만 (뒤의 것)
    if (prev) { const m = new Map(prev.students.map((x) => [x.number, x])); for (const s of by.values()) m.set(s.number, s); prev.students = [...m.values()]; }
    else if (by.size) out.push({ grade: g, class_no: c, students: [...by.values()] });
  }
  return out;
}
// 학생별 답 수 (지금 답 + 이전 기록)
async function answerCounts(env, ids) {
  const n = {}; if (!ids.length) return n;
  const parts = await Promise.all(chunks(ids).flatMap((p) => [sbAll(env, `submissions?select=id,student_id&student_id=in.(${p.join(',')})`), sbAll(env, `submission_history?select=id,student_id&student_id=in.(${p.join(',')})`)]));
  for (const rows of parts) for (const r of rows) n[r.student_id] = (n[r.student_id] || 0) + 1;
  return n;
}

// ---------- 라우터 ----------
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const p = url.pathname;
    try {
      if (req.method === 'GET') {
        if (p === '/' || p === '/index.html' || /^\/t\/\d+\/?$/.test(p)) return text(STUDENT_HTML, 'text/html');   // /t/25 = 그 시험 바로 열기
        if (p === '/qr.js') return new Response(QR_JS, { headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'public, max-age=604800' } });
        if (p === '/teacher' || p === '/teacher/') return text(TEACHER_HTML, 'text/html');
        if (p === '/style.css') return text(STYLE_CSS, 'text/css');
        if (p === '/common.js') return text(COMMON_JS, 'text/javascript');
        if (p.startsWith('/media/')) return media(req, env, url);
        if (p === '/xlsx.js') return new Response(XLSX_JS, { headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'public, max-age=604800' } });
      }
      if (!p.startsWith('/api/')) return new Response('Not found', { status: 404 });

      const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'TEACHER_PASSWORD'].filter((k) => !env[k]);
      if (missing.length) return fail('아직 설정이 끝나지 않았어요 (' + missing.join(', ') + ' 필요). 선생님께 말씀드려요.', 503);

      const body = req.method === 'POST' && p !== '/api/t/media' ? await req.json().catch(() => ({})) : {};
      const q = url.searchParams;

      // ----- 학생 -----
      if (p === '/api/login' && req.method === 'POST') {
        const name = normName(body.name), id = normId(body.id);
        if (!name || !id) return fail('이름과 학생 계정 ID를 모두 써 주세요');
        const v = await schemaV(env);
        // ID로 먼저 찾고, 이름은 띄어쓰기·한글 조합 방식 차이를 무시하고 비교 (보관된 학생은 제외)
        const byId = await sb(env, `students?select=id,grade,class_no,number,name&login_ids=cs.${encodeURIComponent('{"' + id + '"}')}${activeQ(v)}`);
        const hit = byId.filter((s) => normName(s.name) === name);
        if (hit.length !== 1) {
          const total = await sb(env, `students?select=id${activeQ(v)}&limit=1`);
          if (!total.length) return fail('아직 명렬표가 없어요. 선생님께 말씀드려요.', 401);
          console.log('login fail', JSON.stringify({ idFound: byId.length, nameMatch: hit.length }));
          return fail('이름 또는 학생 계정 ID가 맞지 않아요. 다시 확인해 주세요.', 401);
        }
        return json({ token: await studentToken(env, hit[0].id), student: hit[0] });
      }
      // 학생 학년에 맞는 문제만. ?lite=1이면 목록용(문항 없이 questionCount·contentVersion만)
      if (p === '/api/concepts') {
        const [st, closed] = await Promise.all([studentFrom(env, req), closedSet(env)]);
        const lite = q.get('lite') === '1';
        const list = [...PUB.values()].filter((c) => c.grade === st.grade).map((c) => ({ ...(lite ? liteOf(c) : c), open: !closed.has(c.id) }));
        return json({ concepts: list, units: UNITS.filter((u) => u.grade === st.grade) });
      }
      if (p === '/api/concept') {
        const [st, closed] = await Promise.all([studentFrom(env, req), closedSet(env)]);
        const c = PUB.get(int(q.get('concept') ?? q.get('id')));
        if (!c || c.grade !== st.grade) return fail('번호가 잘못됐어요');
        return json({ concept: { ...c, open: !closed.has(c.id) } });
      }
      if (p === '/api/me') {
        const st = await studentFrom(env, req);
        const [subs, hist] = await Promise.all([
          sbAll(env, `submissions?select=concept,status,auto,overrides,feedback,submitted_at,attempt&student_id=eq.${st.id}`),
          sbAll(env, `submission_history?select=concept,attempt&student_id=eq.${st.id}`),
        ]);
        const retake = {}; for (const h of hist) retake[h.concept] = Math.max(retake[h.concept] || 0, h.attempt);
        return json({ student: st, retake, submissions: subs.map((s) => ({ concept: s.concept, status: s.status, submitted_at: s.submitted_at, attempt: s.attempt, score: s.status === 'graded' ? marksOf(s).filter(Boolean).length : null, note: s.status === 'graded' && !!s.feedback })) });
      }
      // 결과 모아 보기: 채점 확정된 것만 한 번에 {items:[{concept: 공개 세트(문항 포함), submission}]}
      if (p === '/api/submissions') {
        const st = await studentFrom(env, req);
        const [rows, closed] = await Promise.all([sbAll(env, `submissions?select=id,concept,status,answers,auto,overrides,feedback,submitted_at,graded_at,attempt&student_id=eq.${st.id}&status=eq.graded`), closedSet(env)]);
        const items = rows.map((s) => { const c = conceptOf(s.concept), pc = PUB.get(s.concept); return c && pc && c.grade === st.grade ? { concept: { ...pc, open: !closed.has(c.id) }, submission: studentSub(c, s) } : null; }).filter(Boolean);
        const order = [...PUB.keys()];
        items.sort((a, b) => order.indexOf(a.concept.id) - order.indexOf(b.concept.id));
        return json({ items });
      }
      if (p === '/api/summary') {
        const st = await studentFrom(env, req);
        const c = conceptOf(q.get('concept')); if (!c || c.grade !== st.grade) return fail('번호가 잘못됐어요');
        const r = await sb(env, `submissions?select=id&student_id=eq.${st.id}&concept=eq.${c.id}`);
        if (!r.length) return fail('문제를 푼 뒤에 확인할 수 있어요', 403);
        return json({ summary: c.summary });
      }
      if (p === '/api/submission') {
        const st = await studentFrom(env, req);
        const c = conceptOf(q.get('concept')); if (!c || c.grade !== st.grade) return fail('개념 번호가 잘못됐어요');
        const r = await sb(env, `submissions?select=answers,status,auto,overrides,feedback,graded_at,submitted_at,attempt&student_id=eq.${st.id}&concept=eq.${c.id}`);
        if (!r.length) return fail('제출한 답이 없어요', 404);
        return json({ submission: studentSub(c, r[0]) });
      }
      // 틀린 문제 다시 풀기 (연습) — 채점이 끝난 뒤에만, 점수·기록은 바뀌지 않음
      if (p === '/api/retry' && req.method === 'POST') {
        const st = await studentFrom(env, req);
        const c = conceptOf(body.concept); if (!c || c.grade !== st.grade) return fail('번호가 잘못됐어요');
        const r = await sb(env, `submissions?select=status,auto,overrides&student_id=eq.${st.id}&concept=eq.${c.id}`);
        if (!r.length || r[0].status !== 'graded') return fail('선생님이 채점한 뒤에 다시 풀 수 있어요', 409);
        const wrong = new Set(marksOf(r[0]).map((m, i) => (m ? -1 : i)).filter((i) => i >= 0));
        const marks = {};
        for (const [k, a] of Object.entries(body.answers || {})) {
          const i = +k; if (!wrong.has(i) || c.questions[i].a == null) continue;
          const v = Array.isArray(a) ? a.slice(0, 20).map((x) => String(x ?? '').slice(0, 100)) : String(a ?? '').slice(0, 200);
          marks[i] = gradeOne(c.questions[i], v);
        }
        return json({ marks });
      }
      if (p === '/api/submit' && req.method === 'POST') {
        const st = await studentFrom(env, req);
        const c = conceptOf(body.concept); if (!c || c.grade !== st.grade) return fail('개념 번호가 잘못됐어요');
        const answers = Array.isArray(body.answers) ? body.answers.slice(0, c.questions.length) : [];
        while (answers.length < c.questions.length) answers.push('');
        const clean = answers.map((a) => (Array.isArray(a) ? a.slice(0, 20).map((x) => String(x ?? '').slice(0, 100)) : String(a ?? '').slice(0, 200)));
        const [old, closed, prev] = await Promise.all([
          sb(env, `submissions?select=status&student_id=eq.${st.id}&concept=eq.${c.id}`),
          closedSet(env),
          sb(env, `submission_history?select=attempt&student_id=eq.${st.id}&concept=eq.${c.id}`),
        ]);
        if (old.length && old[0].status === 'graded') return fail('선생님이 이미 채점했어요. 다시 풀려면 선생님께 말씀드려요.', 409);
        if (old.length && c.kind !== 'concept') return fail('이미 시험을 봤어요. 다시 보려면 선생님께 말씀드려요.', 409);
        if (closed.has(c.id)) return fail('지금은 열려 있지 않은 시험이에요. 선생님께 말씀드려요.', 403);
        const auto = c.questions.map((qq, i) => gradeOne(qq, clean[i]));
        const attempt = prev.reduce((m, x) => Math.max(m, x.attempt), 0) + 1;
        const row = { student_id: st.id, concept: c.id, attempt, answers: clean, auto, overrides: {}, ai: null, status: 'submitted', feedback: null, feedback_draft: null, reviewed_at: null, submitted_at: new Date().toISOString(), graded_at: null };
        await sb(env, 'submissions?on_conflict=student_id,concept', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: [row] });
        return json({ ok: true });
      }

      // 화면(자바스크립트) 오류 받기 — 로그인한 학생·교사만, 짧게. 아니면 조용히 무시
      if (p === '/api/client-error' && req.method === 'POST') {
        const now = Date.now(); if (now - CLIENT_ERR.at > 60000) Object.assign(CLIENT_ERR, { n: 0, at: now });
        if (++CLIENT_ERR.n > 30) return json({ ok: false });
        let source = null;
        if (await checkToken(env, req)) source = 'teacher';
        else if (await studentFrom(env, req).then(() => true).catch(() => false)) source = 'student';
        if (!source) return json({ ok: false });
        await later(ctx, logError(env, { source, method: 'JS', path: String(body.where || '').replace(/[?#][^\s]*/g, ''), message: body.message }));
        return json({ ok: true });
      }

      // ----- 교사 -----
      if (p === '/api/teacher/login' && req.method === 'POST') {
        if (!safeEqual(body.password || '', env.TEACHER_PASSWORD)) return fail('비밀번호가 맞지 않아요', 401);
        return json({ token: await makeToken(env) });
      }
      if (p.startsWith('/api/t/')) {
        if (!(await checkToken(env, req))) return fail('다시 로그인해 주세요', 401);

        if (p === '/api/t/key') return json({ concepts: CONCEPTS.map((c) => ({ ...c, questions: c.questions.map((qq) => ({ ...qq, answerText: answerText(qq), end: qq.t === 'order' ? (qq.join === '' ? '' : (qq.a.match(/[.?!]$/) || ['.'])[0]) : undefined })) })) });
        // 최근 오류 (교사 화면 ⚠️ 알림). 표가 없으면 missing. 열 때 30일 지난 기록 정리
        if (p === '/api/t/errors') {
          const hours = Math.min(Math.max(int(q.get('hours')) || 24, 1), 24 * 30), since = new Date(Date.now() - hours * 3600e3).toISOString();
          try {
            const { data, total } = await sb(env, `error_log?select=id,at,source,method,path,status,message&at=gte.${since}&order=id.desc&limit=50`, { count: true });
            later(ctx, sb(env, `error_log?at=lt.${new Date(Date.now() - 30 * 86400e3).toISOString()}`, { method: 'DELETE', prefer: 'return=minimal' }).catch(() => {}));
            return json({ items: data, count: total ?? data.length, hours, telegram: !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) });
          } catch (e) { if (e.status === 503) return json({ items: [], count: 0, hours, missing: true }); throw e; }
        }
        if (p === '/api/t/schema') { const v = await schemaV(env, true); return json({ version: v, ok: v >= 2, message: v >= 2 ? '' : UPGRADE_MSG }); }

        if (p === '/api/t/overview') {
          const c = int(q.get('class')), g = int(q.get('grade')) || 4; if (!c) return fail('반을 골라 주세요');
          const v = await schemaV(env);
          const students = await sbAll(env, `students?select=id,number,name&grade=eq.${g}&class_no=eq.${c}${activeQ(v)}&order=number.asc`);
          let subs = [], hist = [];
          if (students.length) {
            const ids = students.map((s) => s.id).join(',');
            [subs, hist] = await Promise.all([
              sbAll(env, `submissions?select=id,student_id,concept,status,answers,auto,overrides,ai,feedback,feedback_draft,submitted_at,attempt&student_id=in.(${ids})`),
              sbAll(env, `submission_history?select=student_id,concept,attempt,auto,overrides,status,graded_at&student_id=in.(${ids})&order=attempt.asc,id.asc`),
            ]);
          }
          return json({ students, submissions: subs.map((s) => ({ id: s.id, student_id: s.student_id, concept: s.concept, status: s.status, submitted_at: s.submitted_at, attempt: s.attempt || 1, ai: !!s.ai, draft: !!s.feedback_draft && !s.feedback, pub: !!s.feedback, aiNeed: s.status !== 'graded' && !s.ai && conceptOf(s.concept) ? aiNeedOf(s, conceptOf(s.concept)) : 0, score: marksOf(s).filter(Boolean).length })),
            history: hist.map((h) => ({ student_id: h.student_id, concept: h.concept, attempt: h.attempt, status: h.status, graded_at: h.graded_at, score: marksOf(h).filter(Boolean).length })), aiEnabled: aiOn(env) });
        }
        // 오늘 할 일: 학년의 반별 채점 대기 / AI 제안 검토 / 피드백 미공개 / 미제출(열린 시험 중 반에서 누군가 낸 것)
        if (p === '/api/t/today') {
          const g = int(q.get('grade')) || 4, v = await schemaV(env);
          const students = await sbAll(env, `students?select=id,class_no&grade=eq.${g}${activeQ(v)}`);
          if (!students.length) return json({ classes: [] });
          const ids = students.map((s) => s.id), cls = Object.fromEntries(students.map((s) => [s.id, s.class_no]));
          const [rows, closed] = await Promise.all([Promise.all(chunks(ids).map((part) => sbAll(env, `submissions?select=id,student_id,concept,status,ai,feedback,feedback_draft,reviewed_at&student_id=in.(${part.join(',')})`))).then((x) => x.flat()), closedSet(env)]);
          const openIds = new Set(CONCEPTS.filter((c) => c.grade === g && !closed.has(c.id)).map((c) => c.id));
          const by = {};
          for (const s of students) (by[s.class_no] = by[s.class_no] || { class_no: s.class_no, students: 0, wait: 0, aiSuggest: 0, unpub: 0, missing: 0, sets: {} }).students++;
          for (const r of rows) {
            const b = by[cls[r.student_id]]; if (!b) continue;
            if (r.status !== 'graded') { b.wait++; if (r.ai && !r.reviewed_at) b.aiSuggest++; }
            else if (!r.feedback && r.feedback_draft) b.unpub++;
            if (openIds.has(r.concept)) b.sets[r.concept] = (b.sets[r.concept] || 0) + 1;
          }
          // 미제출: 이 학년의 열린 시험 전체 기준 (아무도 안 낸 열린 시험도 셈)
          const classes = Object.values(by).sort((a, b) => a.class_no - b.class_no).map(({ sets, ...b }) => ({ ...b, missing: [...openIds].reduce((a, id) => a + b.students - (sets[id] || 0), 0), openSets: openIds.size }));
          return json({ classes });
        }
        // 일괄 출력용: 한 반의 학생과 제출 답(자세히)
        if (p === '/api/t/report') {
          const c = int(q.get('class')), g = int(q.get('grade')) || 4; if (!c) return fail('반을 골라 주세요');
          const v = await schemaV(env);
          const students = await sbAll(env, `students?select=id,grade,class_no,number,name&grade=eq.${g}&class_no=eq.${c}${activeQ(v)}&order=number.asc`);
          let subs = [], hist = [];
          if (students.length) {
            const ids = students.map((s) => s.id).join(',');
            [subs, hist] = await Promise.all([
              sbAll(env, `submissions?select=id,student_id,concept,attempt,answers,auto,overrides,status,feedback,submitted_at,graded_at&student_id=in.(${ids})`),
              sbAll(env, `submission_history?select=student_id,concept,attempt,auto,overrides,status,graded_at&student_id=in.(${ids})&order=attempt.asc,id.asc`),
            ]);
          }
          return json({ students, history: hist.map((h) => ({ student_id: h.student_id, concept: h.concept, attempt: h.attempt, score: marksOf(h).filter(Boolean).length, graded_at: h.graded_at })), submissions: subs.map((s) => { const marks = marksOf(s); return { student_id: s.student_id, concept: s.concept, attempt: s.attempt || 1, answers: s.answers, marks, score: marks.filter(Boolean).length, status: s.status, feedback: s.feedback, submitted_at: s.submitted_at, graded_at: s.graded_at }; }) });
        }
        if (p === '/api/t/submission') {
          const r = await sb(env, `submissions?select=*&id=eq.${int(q.get('id'))}`);
          if (!r.length) return fail('제출을 찾을 수 없어요', 404);
          const [hist, student] = await Promise.all([
            sb(env, `submission_history?select=attempt,answers,auto,overrides,status,feedback,submitted_at,graded_at&student_id=eq.${r[0].student_id}&concept=eq.${r[0].concept}&order=attempt.asc`),
            getStudent(env, r[0].student_id, { teacher: true }),
          ]);
          return json({ submission: r[0], student, history: hist.map((h) => ({ ...h, marks: marksOf(h), score: marksOf(h).filter(Boolean).length })) });
        }
        // AI 연결 확인: 예시 답(개념 11)을 AI에게 보내 보기 — 아무것도 저장하지 않음
        if (p === '/api/t/ai-check' && req.method === 'POST') {
          if (!aiOn(env)) return fail('AI 채점 설정(AI_API_URL, AI_API_KEY, AI_MODEL)이 아직 없어요', 503);
          const c = conceptOf(11), sample = ["It's four thirty", 'nine forty', 'time', 'time', ['What', 'time', 'is', 'it'], 'three thirty', 'ten fourty', '4:30', '9:40', 'is'];
          const t0 = Date.now();
          const ai = await aiGrade(env, c, sample, c.questions.map((qq, i) => gradeOne(qq, sample[i])));
          return json({ ok: true, ms: Date.now() - t0, items: Object.entries(ai).map(([i, v]) => ({ n: +i + 1, answer: sample[i], ok: v.ok, reason: v.reason, why: v.why })) });
        }
        // AI 제안: 선생님이 직접 정한 O/X는 AI에게 보내지도, 바꾸지도 않음. rev를 주면 그 버전일 때만 저장
        if (p === '/api/t/ai-grade' && req.method === 'POST') {
          if (!aiOn(env)) return fail('AI 채점 설정(AI_API_URL, AI_API_KEY, AI_MODEL)이 아직 없어요', 503);
          await needV2(env);
          const r = await sb(env, `submissions?select=*&id=eq.${int(body.id)}`);
          if (!r.length) return fail('제출을 찾을 수 없어요', 404);
          const s = r[0], c = conceptOf(s.concept);
          if (body.rev != null && int(body.rev) !== s.rev) return fail('다른 화면에서 먼저 바뀌었어요. 새로고침한 뒤 다시 해 주세요.', 409, { conflict: true });
          if (s.status === 'graded') return fail('이미 확정된 결과예요. 확정을 취소한 뒤 AI 채점을 하세요.', 409);
          const keep = s.overrides || {};
          const ai = await aiGrade(env, c, s.answers, marksOf(s).map((m, i) => (keep[i] != null ? true : m)));
          const overrides = { ...keep };
          for (const [i, v] of Object.entries(ai)) if (overrides[i] == null && v.ok) overrides[i] = true;
          const saved = await patchRev(env, s.id, s.rev, { ai, overrides });
          return json({ ok: true, ai, overrides, rev: saved.rev, asked: Object.keys(ai).length, score: marksOf({ ...s, overrides }).filter(Boolean).length });
        }
        // 상세 채점 저장. status: 'graded'(확정) | 'submitted'(확정 취소) | 없음(상태 그대로)
        if (p === '/api/t/grade' && req.method === 'POST') {
          await needV2(env);
          const id = int(body.id);
          const cur = await sb(env, `submissions?select=status,rev,graded_at&id=eq.${id}`);
          if (!cur.length) return fail('제출을 찾을 수 없어요', 404);
          const patch = {};
          if (body.overrides !== undefined) patch.overrides = cleanOverrides(body.overrides);
          if (body.feedback !== undefined) patch.feedback = String(body.feedback || '').slice(0, 500) || null;
          if (body.status === 'graded' && cur[0].status !== 'graded') Object.assign(patch, { status: 'graded', graded_at: new Date().toISOString() });
          if (body.status === 'submitted' && cur[0].status === 'graded') Object.assign(patch, { status: 'submitted', graded_at: null });
          const saved = await patchRev(env, id, body.rev != null ? body.rev : cur[0].rev, patch, 'id,rev,status');
          return json({ ok: true, rev: saved.rev, status: saved.status });
        }
        // 일괄 확정 / 확정 취소
        // body: { grade, class(없으면 학년 전체), concepts:[번호…](없으면 전체), filter:'all'|'perfect'|'ai', undo:true(확정 취소), dry:true(세기만) }
        if (p === '/api/t/confirm-all' && req.method === 'POST') {
          const g = int(body.grade) || 4, c = int(body.class), v = await schemaV(env);
          if (!body.dry) await needV2(env);
          const students = await sbAll(env, `students?select=id,class_no&grade=eq.${g}${c ? `&class_no=eq.${c}` : ''}${activeQ(v)}`);
          if (!students.length) return json({ count: 0, byConcept: {}, byClass: {} });
          const cls = Object.fromEntries(students.map((s) => [s.id, s.class_no]));
          const ids = Array.isArray(body.concepts) ? body.concepts.map(int).filter((x) => conceptOf(x)) : null;
          if (ids && !ids.length) return json({ count: 0, byConcept: {}, byClass: {} });
          let rows = (await Promise.all(chunks(students.map((s) => s.id)).map((part) => sbAll(env, `submissions?select=id,student_id,concept,auto,overrides,ai,feedback,feedback_draft${v >= 2 ? ',rev' : ''}&status=eq.${body.undo ? 'graded' : 'submitted'}&student_id=in.(${part.join(',')})${ids ? `&concept=in.(${ids.join(',')})` : ''}`)))).flat();
          if (!body.undo && body.filter === 'perfect') rows = rows.filter((s) => marksOf(s).every(Boolean));
          if (!body.undo && body.filter === 'ai') rows = rows.filter((s) => s.ai || marksOf(s).every(Boolean));   // AI 검토를 마쳤거나 만점
          const byConcept = {}, byClass = {};
          for (const s of rows) { byConcept[s.concept] = (byConcept[s.concept] || 0) + 1; byClass[cls[s.student_id]] = (byClass[cls[s.student_id]] || 0) + 1; }
          if (body.dry || !rows.length) return json({ count: rows.length, byConcept, byClass });
          const now = new Date().toISOString(), st = body.undo ? { status: 'submitted', graded_at: null } : { status: 'graded', graded_at: now };
          // 한 행은 한 번만 고침: 초안을 공개할 행은 상태+피드백을 함께, 읽은 버전 그대로일 때만. 나머지는 상태만 (읽은 버전 조건)
          const withDraft = !body.undo && body.useDraft ? rows.filter((s) => s.feedback_draft && !s.feedback) : [];
          // Cloudflare는 요청 한 번에 바깥 요청을 50개까지만 허용 → 상태만 바꿀 행은 rev가 같은 것끼리 묶어 PATCH 한 번,
          // 초안 공개 행은 한 행씩. 한 번에 WRITE_BUDGET 번까지만 보내고 남은 수는 more로 알림(화면이 이어서 다시 부름)
          let count = 0, drafts = 0, conflicts = 0, budget = WRITE_BUDGET, more = 0;
          const cond = `&status=eq.${body.undo ? 'graded' : 'submitted'}`;
          const plain = rows.filter((s) => !withDraft.includes(s)), groups = new Map();
          for (const s of plain) { const k = s.rev ?? 'x'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(s.id); }
          for (const [rev, ids] of groups) for (const part of chunks(ids, 100)) {
            if (budget <= 0) { more += part.length; continue; }
            budget--;
            const done = await sb(env, `submissions?id=in.(${part.join(',')})${rev === 'x' ? '' : `&rev=eq.${rev}`}${cond}&select=id`, { method: 'PATCH', prefer: 'return=representation', body: st });
            count += done.length; conflicts += part.length - done.length;
          }
          for (const s of withDraft) {
            if (budget <= 0) { more++; continue; }
            budget--;
            try { await patchRev(env, s.id, s.rev, { ...st, feedback: s.feedback_draft.slice(0, 500) }); count++; drafts++; }
            catch (e) { if (e.status !== 409 && e.status !== 404) throw e; conflicts++; budget--; }
          }
          return json({ count, byConcept, byClass, drafts, conflicts, more });
        }
        // ----- ✅ 검토·공개 -----
        // 목록: state = wait(채점 대기) | unpub(확정됐지만 피드백 미공개) | all
        if (p === '/api/t/review') {
          const g = int(q.get('grade')) || 4, c = int(q.get('class')), state = q.get('state') || 'wait', v = await schemaV(env);
          const students = await sbAll(env, `students?select=id,class_no,number,name&grade=eq.${g}${c ? `&class_no=eq.${c}` : ''}${activeQ(v)}&order=class_no.asc,number.asc`);
          if (!students.length) return json({ students: [], items: [] });
          const ids = (q.get('concepts') || '').split(',').map(int).filter((x) => conceptOf(x));
          const cond = state === 'wait' ? '&status=eq.submitted' : state === 'unpub' ? '&status=eq.graded&feedback=is.null&feedback_draft=not.is.null' : '';
          const rows = (await Promise.all(chunks(students.map((x) => x.id)).map((part) => sbAll(env, `submissions?select=id,student_id,concept,attempt,status,answers,auto,overrides,ai,feedback,feedback_draft,reviewed_at${v >= 2 ? ',rev' : ''}&student_id=in.(${part.join(',')})${ids.length ? `&concept=in.(${ids.join(',')})` : ''}${cond}`)))).flat();
          return json({ students, items: rows.filter((r) => conceptOf(r.concept) && conceptOf(r.concept).grade === g) });
        }
        // 카드 하나 저장: O/X 수정·피드백 초안·검토함 (확정 상태는 그대로). rev가 다르면 409
        if (p === '/api/t/review-save' && req.method === 'POST') {
          await needV2(env);
          const patch = {};
          if (body.overrides) patch.overrides = cleanOverrides(body.overrides);
          if (body.feedback_draft !== undefined) patch.feedback_draft = String(body.feedback_draft || '').slice(0, 500) || null;
          if (body.reviewed !== undefined) patch.reviewed_at = body.reviewed ? new Date().toISOString() : null;
          if (!Object.keys(patch).length) return json({ ok: true });
          const saved = await patchRev(env, body.id, body.rev, patch, 'id,rev,reviewed_at');
          return json({ ok: true, rev: saved.rev, reviewed_at: saved.reviewed_at });
        }
        // 묶음 O/X: 여러 제출의 같은 문항을 한 번에 (선생님이 정한 값으로 기록). revs: {id: rev}
        if (p === '/api/t/bulk-override' && req.method === 'POST') {
          await needV2(env);
          const ids = (body.ids || []).map(int).filter(Boolean), i = int(body.i), v = !!body.value, revs = body.revs || {};
          if (!ids.length || i == null || i < 0 || i >= 40) return fail('대상이 없어요');
          if (ids.length > WRITE_BUDGET) return fail(`한 번에 ${WRITE_BUDGET}건까지예요. 나눠서 보내 주세요.`);
          const rows = (await Promise.all(chunks(ids).map((part) => sb(env, `submissions?select=id,auto,overrides,rev&id=in.(${part.join(',')})`)))).flat();
          const items = [], conflicts = [];
          for (const r of rows) {
            const o = { ...(r.overrides || {}), [i]: v };
            const want = revs[r.id] != null ? int(revs[r.id]) : r.rev;
            try { const s = await patchRev(env, r.id, want, { overrides: o }); items.push({ id: r.id, overrides: o, rev: s.rev }); }
            catch (e) { if (e.status !== 409) throw e; conflicts.push(r.id); }
          }
          return json({ count: items.length, items, conflicts });
        }
        // 확정 + 피드백 공개. items:[{id, rev, feedback_draft?}] — 화면의 최신 초안을 함께 받아 한 행 UPDATE로 확정·공개
        if (p === '/api/t/review-commit' && req.method === 'POST') {
          await needV2(env);
          const items = Array.isArray(body.items) ? body.items : (body.ids || []).map((id) => ({ id }));
          const want = new Map(items.map((x) => [int(x.id), x]).filter(([id]) => id));
          if (!want.size) return json({ graded: 0, published: 0, conflicts: [], revs: {} });
          if (want.size > WRITE_BUDGET) return fail(`한 번에 ${WRITE_BUDGET}건까지예요. 나눠서 보내 주세요.`);
          const now = new Date().toISOString();
          let graded = 0, published = 0; const conflicts = [], revs = {};
          for (const part of chunks([...want.keys()])) {
            const rows = await sb(env, `submissions?select=id,status,feedback,feedback_draft,rev&id=in.(${part.join(',')})`);
            for (const r of rows) {
              const it = want.get(r.id);
              if (it.rev != null && int(it.rev) !== r.rev) { conflicts.push(r.id); continue; }
              const draft = it.feedback_draft !== undefined ? String(it.feedback_draft || '').slice(0, 500) || null : r.feedback_draft;
              const patch = { reviewed_at: now };
              if (it.feedback_draft !== undefined) patch.feedback_draft = draft;
              const g = body.grade !== false && r.status !== 'graded', pub = body.publish && !r.feedback && draft;
              if (g) Object.assign(patch, { status: 'graded', graded_at: now });
              if (pub) patch.feedback = draft;
              try { revs[r.id] = (await patchRev(env, r.id, r.rev, patch)).rev; if (g) graded++; if (pub) published++; }
              catch (e) { if (e.status !== 409) throw e; conflicts.push(r.id); }
            }
          }
          return json({ graded, published, conflicts, revs });
        }
        // 확정된 결과의 💬 피드백 초안을 학생에게 공개 (선생님이 쓴 말이 없는 것만)
        if (p === '/api/t/publish-drafts' && req.method === 'POST') {
          const g = int(body.grade) || 4, c = int(body.class), v = await schemaV(env);
          if (!body.dry) await needV2(env);
          const students = await sbAll(env, `students?select=id&grade=eq.${g}${c ? `&class_no=eq.${c}` : ''}${activeQ(v)}`);
          if (!students.length) return json({ count: 0 });
          const rows = (await Promise.all(chunks(students.map((s) => s.id)).map((part) => sbAll(env, `submissions?select=id,feedback_draft${v >= 2 ? ',rev' : ''}&status=eq.graded&feedback=is.null&feedback_draft=not.is.null&student_id=in.(${part.join(',')})`)))).flat();
          if (body.dry) return json({ count: rows.length });
          let count = 0;
          for (const s of rows) { try { await patchRev(env, s.id, s.rev, { feedback: s.feedback_draft.slice(0, 500) }); count++; } catch (e) { if (e.status !== 409) throw e; } }
          return json({ count, skipped: rows.length - count });
        }
        // Claude 예약 작업이 남긴 분석 보고서
        if (p === '/api/t/reports') return json({ reports: await sb(env, `ai_reports?select=*&grade=eq.${int(q.get('grade')) || 4}&order=created_at.desc&limit=20`) });
        if (p === '/api/t/report-delete' && req.method === 'POST') { await sb(env, `ai_reports?id=eq.${int(body.id)}`, { method: 'DELETE', prefer: 'return=minimal' }); return json({ ok: true }); }
        if (p === '/api/t/reset' && req.method === 'POST') {   // 기록 없이 완전히 지우기
          await sb(env, `submissions?id=eq.${int(body.id)}`, { method: 'DELETE', prefer: 'return=minimal' });
          return json({ ok: true });
        }
        // 재출제: 기록 보관 + 지우기 + (선택) 시험 열기를 DB 함수 하나로 (중간에 실패하면 아무것도 안 바뀜)
        if (p === '/api/t/reissue' && req.method === 'POST') {
          await needV2(env);
          let subs;
          if (body.id) subs = await sb(env, `submissions?select=id&id=eq.${int(body.id)}`);
          else {
            const c = conceptOf(body.concept), ids = (body.student_ids || []).map(int).filter(Boolean);
            if (!c || !ids.length) return fail('시험과 학생을 골라 주세요');
            subs = await sb(env, `submissions?select=id&concept=eq.${c.id}&student_id=in.(${ids.join(',')})`);
          }
          if (!subs.length) return json({ count: 0 });
          const count = await rpc(env, 'reissue_submissions', { p_ids: subs.map((s) => s.id), p_open: !!body.open });
          return json({ count: +count || 0 });
        }
        // 명렬표 미리보기: 반마다 추가 / 이름·ID 바뀜 / 보관 해제 / (바꾸기 켜면) 보관될 학생과 그 학생의 답 수
        if (p === '/api/t/roster-preview' && req.method === 'POST') {
          const classes = normRoster(body.classes), archive = !!(body.archive ?? body.replace), v = await schemaV(env);
          if (!classes.length) return fail('저장할 학생이 없어요');
          const out = await Promise.all(classes.map(async (cl) => {
            const ex = await sbAll(env, `students?select=id,number,name,login_ids${v >= 2 ? ',archived_at' : ''}&grade=eq.${cl.grade}&class_no=eq.${cl.class_no}`);
            const cnt = await answerCounts(env, ex.map((s) => s.id));
            const byNo = new Map(ex.map((s) => [s.number, s])), inFile = new Set(cl.students.map((s) => s.number));
            const r = { grade: cl.grade, class_no: cl.class_no, total: cl.students.length, add: [], update: [], restore: [], archive: [], same: 0 };
            for (const s of cl.students) {
              const e = byNo.get(s.number);
              if (!e) { r.add.push({ number: s.number, name: s.name, ids: s.login_ids }); continue; }
              const idsChanged = !!s.login_ids && (e.login_ids || []).join(',') !== s.login_ids.join(',');
              const item = { number: s.number, name: s.name, from: e.name, nameChanged: e.name !== s.name, idsChanged, answers: cnt[e.id] || 0 };
              if (e.archived_at) r.restore.push(item); else if (item.nameChanged || idsChanged) r.update.push(item); else r.same++;
            }
            if (archive) for (const e of ex) if (!e.archived_at && !inFile.has(e.number)) r.archive.push({ number: e.number, name: e.name, answers: cnt[e.id] || 0 });
            return r;
          }));
          return json({ classes: out, archive, upgraded: v >= 2 });
        }
        // 명렬표 저장: DB 함수 하나로 (추가·수정·보관 해제, 바꾸기 켜면 파일에 없는 학생 보관). 학생·답은 지우지 않음
        if (p === '/api/t/roster' && req.method === 'POST') {
          await needV2(env);
          const classes = normRoster(body.classes);
          if (!classes.length) return fail('저장할 학생이 없어요');
          const r = await rpc(env, 'roster_apply', { p_classes: classes, p_archive: !!(body.archive ?? body.replace) });
          const all = classes.flatMap((c) => c.students);
          return json({ count: all.length, withIds: all.filter((s) => s.login_ids).length, ...r });
        }
        // 명렬표 화면: 한 반의 학생(보관 포함 선택)과 학생별 답 수
        if (p === '/api/t/roster-list') {
          const c = int(q.get('class')), g = int(q.get('grade')) || 4, v = await schemaV(env); if (!c) return fail('반을 골라 주세요');
          const students = await sbAll(env, `students?select=id,number,name,login_ids${v >= 2 ? ',archived_at' : ''}&grade=eq.${g}&class_no=eq.${c}&order=number.asc`);
          const cnt = await answerCounts(env, students.map((s) => s.id));
          return json({ students: students.map((s) => ({ ...s, archived_at: s.archived_at || null, answers: cnt[s.id] || 0 })), upgraded: v >= 2 });
        }
        if (p === '/api/t/roster-check') {
          const all = await sbAll(env, `students?select=id,grade,class_no,login_ids${activeQ(await schemaV(env))}`);
          const by = {}; for (const s of all) { const k = s.grade + '-' + s.class_no; const b = (by[k] = by[k] || { grade: s.grade, class_no: s.class_no, total: 0, noId: 0 }); b.total++; if (!s.login_ids || !s.login_ids.length) b.noId++; }
          return json({ classes: by });
        }
        // 정답을 고친 뒤 이미 낸 답을 다시 자동 채점 (선생님이 직접 고친 O/X는 그대로)
        if (p === '/api/t/regrade' && req.method === 'POST') {
          const g = int(body.grade) || 4, ids = CONCEPTS.filter((c) => c.grade === g).map((c) => c.id);
          const subs = await sbAll(env, `submissions?select=id,concept,answers,auto&concept=in.(${ids.join(',')})`);
          let changed = 0;
          for (const s of subs) {
            const c = conceptOf(s.concept), auto = c.questions.map((qq, i) => gradeOne(qq, s.answers[i]));
            if (JSON.stringify(auto) !== JSON.stringify(s.auto)) { await sb(env, `submissions?id=eq.${s.id}`, { method: 'PATCH', prefer: 'return=minimal', body: { auto } }); changed++; }
          }
          return json({ checked: subs.length, changed });
        }
        // 듣기·그림 파일 올리기 (교사만): POST /api/t/media?key=g4u10/q01.mp3  본문 = 파일
        if (p === '/api/t/media' && req.method === 'POST') {
          const key = q.get('key') || '';
          if (!/^[\w\-/.]+$/.test(key) || key.includes('..')) return fail('파일 이름이 잘못됐어요');
          const type = key.endsWith('.mp3') ? 'audio/mpeg' : key.endsWith('.png') ? 'image/png' : 'image/jpeg';
          await env.MEDIA.put(key, req.body, { httpMetadata: { contentType: type } });
          return json({ ok: true, key });
        }
        // 미리보기에서 채점해 보기 (저장 안 함)
        if (p === '/api/t/try' && req.method === 'POST') {
          const c = conceptOf(body.concept); if (!c) return fail('시험을 찾을 수 없어요');
          const ans = Array.isArray(body.answers) ? body.answers : [];
          return json({ marks: c.questions.map((qq, i) => gradeOne(qq, ans[i])) });
        }
        // 시험 열기/닫기
        if (p === '/api/t/settings') {
          if (req.method === 'POST') {
            const ids = (Array.isArray(body.concepts) ? body.concepts : [body.concept]).map(int).filter((x) => conceptOf(x));
            if (!ids.length) return fail('시험을 골라 주세요');
            await sb(env, 'test_settings?on_conflict=concept', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: ids.map((concept) => ({ concept, enabled: !!body.enabled, updated_at: new Date().toISOString() })) });
          }
          return json({ closed: [...(await closedSet(env))] });
        }
        if (p === '/api/t/student-ids' && req.method === 'POST') {
          const ids = normIds(body.login_ids);
          await sb(env, `students?id=eq.${int(body.id)}`, { method: 'PATCH', prefer: 'return=minimal', body: { login_ids: ids } });
          return json({ ok: true, login_ids: ids });
        }
        // 학생 보관 / 복원 (기록은 그대로, 보관하면 목록·로그인에서 빠짐)
        if (p === '/api/t/student-archive' && req.method === 'POST') {
          await needV2(env);
          const r = await sb(env, `students?id=eq.${int(body.id)}&select=id,archived_at`, { method: 'PATCH', prefer: 'return=representation', body: { archived_at: body.archived === false ? null : new Date().toISOString() } });
          if (!r.length) return fail('학생을 찾을 수 없어요', 404);
          return json({ ok: true, archived_at: r[0].archived_at });
        }
        // 완전 삭제는 답 기록이 하나도 없는 학생만 (잘못 넣은 줄 지우기용)
        if (p === '/api/t/student-delete' && req.method === 'POST') {
          const id = int(body.id), cnt = await answerCounts(env, [id]);
          if (cnt[id]) return fail('답 기록이 있는 학생은 지울 수 없어요. 대신 ‘보관’을 쓰세요.', 409);
          await sb(env, `students?id=eq.${id}`, { method: 'DELETE', prefer: 'return=minimal' });
          return json({ ok: true });
        }
      }
      return fail('없는 주소예요', 404);
    } catch (e) {
      const status = e.status || 500;
      if (status >= 500) await later(ctx, logError(env, { method: req.method, path: p, status, message: e.message || String(e), detail: e.extra && e.extra.upgrade ? { upgrade: true } : null }));
      return fail(status === 500 && !(e instanceof HttpError) ? '서버 오류가 났어요. 잠시 뒤 다시 해 주세요.' : e.message || '서버 오류', status, e.extra);
    }
  },
};
