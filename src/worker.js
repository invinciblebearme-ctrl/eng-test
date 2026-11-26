import { CONCEPTS, UNITS, gradeOne, answerText, publicConcepts } from './content.js';
import { aiGrade } from './ai.js';
import { aiTargets } from './triage.js';
import { STUDENT_HTML, TEACHER_HTML, STYLE_CSS, COMMON_JS, XLSX_JS, QR_JS } from './assets.js';

const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const text = (body, type) => new Response(body, { headers: { 'content-type': type + '; charset=utf-8', 'cache-control': 'no-cache' } });

// ---------- Supabase (PostgREST) ----------
async function sb(env, path, { method = 'GET', body, prefer } = {}) {
  const key = env.SUPABASE_SERVICE_KEY;
  const headers = { apikey: key, 'content-type': 'application/json' };
  if (key.startsWith('eyJ')) headers.authorization = 'Bearer ' + key; // 예전 JWT 형식 키
  if (prefer) headers.prefer = prefer;
  const r = await fetch(env.SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) {
    const t = await r.text();
    if (/relation .* does not exist|Could not find the table/i.test(t)) throw new HttpError('데이터베이스 표가 아직 없어요. Supabase에서 schema.sql을 먼저 실행해 주세요.', 503);
    throw new HttpError('데이터베이스 오류: ' + t.slice(0, 200), 502);
  }
  const t = await r.text();   // return=minimal이면 본문이 비어 있음 (201/204)
  return t ? JSON.parse(t) : null;
}
class HttpError extends Error { constructor(m, s) { super(m); this.status = s; } }

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
const normName = (v) => String(v ?? '').normalize('NFC').replace(/[\s\u200b\u00a0]+/g, '').slice(0, 40);
const normId = (v) => String(v ?? '').normalize('NFKC').trim().toLowerCase().replace(/[^a-z0-9._@-]/g, '').slice(0, 60);
const normIds = (v) => [...new Set((Array.isArray(v) ? v : String(v ?? '').split(/[\s,;/]+/)).map(normId).filter(Boolean))].slice(0, 5);
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
async function getStudent(env, id) {
  const r = await sb(env, `students?select=id,grade,class_no,number,name&id=eq.${int(id)}`);
  if (!r.length) throw new HttpError('학생을 찾을 수 없어요. 다시 로그인해 주세요.', 401);
  return r[0];
}

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

// ---------- 라우터 ----------
export default {
  async fetch(req, env) {
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
        // ID로 먼저 찾고, 이름은 띄어쓰기·한글 조합 방식 차이를 무시하고 비교
        const byId = await sb(env, `students?select=id,grade,class_no,number,name&login_ids=cs.${encodeURIComponent('{"' + id + '"}')}`);
        const hit = byId.filter((s) => normName(s.name) === name);
        if (hit.length !== 1) {
          const total = await sb(env, 'students?select=id&limit=1');
          if (!total.length) return fail('아직 명렬표가 없어요. 선생님께 말씀드려요.', 401);
          console.log('login fail', JSON.stringify({ idFound: byId.length, nameMatch: hit.length }));
          return fail('이름 또는 학생 계정 ID가 맞지 않아요. 다시 확인해 주세요.', 401);
        }
        return json({ token: await studentToken(env, hit[0].id), student: hit[0] });
      }
      // 학생 학년에 맞는 문제만
      if (p === '/api/concepts') {
        const st = await studentFrom(env, req);
        const closed = await closedSet(env);
        return json({ concepts: publicConcepts(st.grade).map((c) => ({ ...c, open: !closed.has(c.id) })), units: UNITS.filter((u) => u.grade === st.grade) });
      }
      if (p === '/api/me') {
        const st = await studentFrom(env, req);
        const subs = await sb(env, `submissions?select=concept,status,auto,overrides,feedback,submitted_at,attempt&student_id=eq.${st.id}`);
        const hist = await sb(env, `submission_history?select=concept,attempt&student_id=eq.${st.id}`);
        const retake = {}; for (const h of hist) retake[h.concept] = Math.max(retake[h.concept] || 0, h.attempt);
        return json({ student: st, retake, submissions: subs.map((s) => ({ concept: s.concept, status: s.status, submitted_at: s.submitted_at, attempt: s.attempt, score: s.status === 'graded' ? marksOf(s).filter(Boolean).length : null, note: s.status === 'graded' && !!s.feedback })) });
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
        const r = await sb(env, `submissions?select=*&student_id=eq.${st.id}&concept=eq.${c.id}`);
        if (!r.length) return fail('제출한 답이 없어요', 404);
        const s = r[0], out = { answers: s.answers, status: s.status };
        if (s.status === 'graded') {
          const marks = marksOf(s);
          Object.assign(out, { marks, score: marks.filter(Boolean).length, feedback: s.feedback, correct: c.questions.map(answerText), graded_at: s.graded_at, submitted_at: s.submitted_at });
        }
        return json({ submission: out });
      }
      // 틀린 문제 다시 풀기 (연습) — 채점이 끝난 뒤에만, 점수·기록은 바뀌지 않음
      if (p === '/api/retry' && req.method === 'POST') {
        const st = await studentFrom(env, req);
        const c = conceptOf(body.concept); if (!c || c.grade !== st.grade) return fail('번호가 잘못됐어요');
        const r = await sb(env, `submissions?select=*&student_id=eq.${st.id}&concept=eq.${c.id}`);
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
        const old = await sb(env, `submissions?select=status&student_id=eq.${st.id}&concept=eq.${c.id}`);
        if (old.length && old[0].status === 'graded') return fail('선생님이 이미 채점했어요. 다시 풀려면 선생님께 말씀드려요.', 409);
        if (old.length && c.kind !== 'concept') return fail('이미 시험을 봤어요. 다시 보려면 선생님께 말씀드려요.', 409);
        if ((await closedSet(env)).has(c.id)) return fail('지금은 열려 있지 않은 시험이에요. 선생님께 말씀드려요.', 403);
        const auto = c.questions.map((qq, i) => gradeOne(qq, clean[i]));
        const prev = await sb(env, `submission_history?select=attempt&student_id=eq.${st.id}&concept=eq.${c.id}`);
        const attempt = prev.reduce((m, x) => Math.max(m, x.attempt), 0) + 1;
        await sb(env, 'submissions?on_conflict=student_id,concept', {
          method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
          body: [{ student_id: st.id, concept: c.id, attempt, answers: clean, auto, overrides: {}, ai: null, status: 'submitted', feedback: null, feedback_draft: null, reviewed_at: null, submitted_at: new Date().toISOString(), graded_at: null }],
        });
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

        if (p === '/api/t/overview') {
          const c = int(q.get('class')), g = int(q.get('grade')) || 4; if (!c) return fail('반을 골라 주세요');
          const students = await sb(env, `students?select=id,number,name,login_ids&grade=eq.${g}&class_no=eq.${c}&order=number.asc`);
          let subs = [], hist = [];
          if (students.length) {
            const ids = students.map((s) => s.id).join(',');
            subs = await sb(env, `submissions?select=id,student_id,concept,status,answers,auto,overrides,ai,feedback,feedback_draft,submitted_at,attempt&student_id=in.(${ids})`);
            hist = await sb(env, `submission_history?select=student_id,concept,attempt,auto,overrides,status,graded_at&student_id=in.(${ids})&order=attempt.asc`);
          }
          return json({ students, submissions: subs.map((s) => ({ id: s.id, student_id: s.student_id, concept: s.concept, status: s.status, submitted_at: s.submitted_at, attempt: s.attempt || 1, ai: !!s.ai, draft: !!s.feedback_draft && !s.feedback, aiNeed: s.status !== 'graded' && !s.ai && conceptOf(s.concept) ? aiTargets(conceptOf(s.concept), s.answers, marksOf(s)).length : 0, score: marksOf(s).filter(Boolean).length })),
            history: hist.map((h) => ({ student_id: h.student_id, concept: h.concept, attempt: h.attempt, status: h.status, graded_at: h.graded_at, score: marksOf(h).filter(Boolean).length })), aiEnabled: aiOn(env) });
        }
        // 일괄 출력용: 한 반의 학생과 제출 답(자세히)
        if (p === '/api/t/report') {
          const c = int(q.get('class')), g = int(q.get('grade')) || 4; if (!c) return fail('반을 골라 주세요');
          const students = await sb(env, `students?select=id,grade,class_no,number,name&grade=eq.${g}&class_no=eq.${c}&order=number.asc`);
          let subs = [];
          let hist = [];
          if (students.length) {
            subs = await sb(env, `submissions?select=student_id,concept,attempt,answers,auto,overrides,status,feedback,submitted_at,graded_at&student_id=in.(${students.map((s) => s.id).join(',')})`);
            hist = await sb(env, `submission_history?select=student_id,concept,attempt,auto,overrides,status,graded_at&student_id=in.(${students.map((s) => s.id).join(',')})&order=attempt.asc`);
          }
          return json({ students, history: hist.map((h) => ({ student_id: h.student_id, concept: h.concept, attempt: h.attempt, score: marksOf(h).filter(Boolean).length, graded_at: h.graded_at })), submissions: subs.map((s) => { const marks = marksOf(s); return { student_id: s.student_id, concept: s.concept, attempt: s.attempt || 1, answers: s.answers, marks, score: marks.filter(Boolean).length, status: s.status, feedback: s.feedback, submitted_at: s.submitted_at, graded_at: s.graded_at }; }) });
        }
        if (p === '/api/t/submission') {
          const r = await sb(env, `submissions?select=*&id=eq.${int(q.get('id'))}`);
          if (!r.length) return fail('제출을 찾을 수 없어요', 404);
          const hist = await sb(env, `submission_history?select=attempt,answers,auto,overrides,status,feedback,submitted_at,graded_at&student_id=eq.${r[0].student_id}&concept=eq.${r[0].concept}&order=attempt.asc`);
          return json({ submission: r[0], student: await getStudent(env, r[0].student_id), history: hist.map((h) => ({ ...h, marks: marksOf(h), score: marksOf(h).filter(Boolean).length })) });
        }
        // AI 연결 확인: 예시 답(개념 11)을 AI에게 보내 보기 — 아무것도 저장하지 않음
        if (p === '/api/t/ai-check' && req.method === 'POST') {
          if (!aiOn(env)) return fail('AI 채점 설정(AI_API_URL, AI_API_KEY, AI_MODEL)이 아직 없어요', 503);
          const c = conceptOf(11), sample = ["It's four thirty", 'nine forty', 'time', 'time', ['What', 'time', 'is', 'it'], 'three thirty', 'ten fourty', '4:30', '9:40', 'is'];
          const t0 = Date.now();
          const ai = await aiGrade(env, c, sample, c.questions.map((qq, i) => gradeOne(qq, sample[i])));
          return json({ ok: true, ms: Date.now() - t0, items: Object.entries(ai).map(([i, v]) => ({ n: +i + 1, answer: sample[i], ok: v.ok, reason: v.reason, why: v.why })) });
        }
        if (p === '/api/t/ai-grade' && req.method === 'POST') {
          if (!aiOn(env)) return fail('AI 채점 설정(AI_API_URL, AI_API_KEY, AI_MODEL)이 아직 없어요', 503);
          const r = await sb(env, `submissions?select=*&id=eq.${int(body.id)}`);
          if (!r.length) return fail('제출을 찾을 수 없어요', 404);
          const s = r[0], c = conceptOf(s.concept);
          const ai = await aiGrade(env, c, s.answers, marksOf(s));
          // AI가 인정한 답만 O로 제안 (선생님이 이미 직접 고친 문항은 그대로 둠)
          const overrides = { ...(s.overrides || {}) };
          for (const [i, v] of Object.entries(ai)) if (overrides[i] == null && v.ok) overrides[i] = true;
          await sb(env, `submissions?id=eq.${s.id}`, { method: 'PATCH', prefer: 'return=minimal', body: { ai, overrides } });
          return json({ ok: true, ai, overrides, asked: Object.keys(ai).length, score: marksOf({ ...s, overrides }).filter(Boolean).length });
        }
        if (p === '/api/t/grade' && req.method === 'POST') {
          const id = int(body.id);
          const overrides = {};
          for (const [k, v] of Object.entries(body.overrides || {})) if (int(k) != null && int(k) >= 0 && int(k) < 40) overrides[int(k)] = !!v;
          const graded = body.status === 'graded';
          await sb(env, `submissions?id=eq.${id}`, { method: 'PATCH', prefer: 'return=minimal', body: { overrides, feedback: String(body.feedback || '').slice(0, 500) || null, status: graded ? 'graded' : 'submitted', graded_at: graded ? new Date().toISOString() : null } });
          return json({ ok: true });
        }
        // 일괄 확정 / 확정 취소
        // body: { grade, class(없으면 학년 전체), concepts:[번호…](없으면 전체), filter:'all'|'perfect'|'ai', undo:true(확정 취소), dry:true(세기만) }
        if (p === '/api/t/confirm-all' && req.method === 'POST') {
          const g = int(body.grade) || 4, c = int(body.class);
          const students = await sb(env, `students?select=id,class_no&grade=eq.${g}${c ? `&class_no=eq.${c}` : ''}`);
          if (!students.length) return json({ count: 0, byConcept: {}, byClass: {} });
          const cls = Object.fromEntries(students.map((s) => [s.id, s.class_no]));
          const ids = Array.isArray(body.concepts) ? body.concepts.map(int).filter((x) => conceptOf(x)) : null;
          if (ids && !ids.length) return json({ count: 0, byConcept: {}, byClass: {} });
          let rows = await sb(env, `submissions?select=id,student_id,concept,auto,overrides,ai,feedback,feedback_draft&status=eq.${body.undo ? 'graded' : 'submitted'}&student_id=in.(${students.map((s) => s.id).join(',')})${ids ? `&concept=in.(${ids.join(',')})` : ''}`);
          if (!body.undo && body.filter === 'perfect') rows = rows.filter((s) => marksOf(s).every(Boolean));
          if (!body.undo && body.filter === 'ai') rows = rows.filter((s) => s.ai || marksOf(s).every(Boolean));   // AI 검토를 마쳤거나 만점
          const byConcept = {}, byClass = {};
          for (const s of rows) { byConcept[s.concept] = (byConcept[s.concept] || 0) + 1; byClass[cls[s.student_id]] = (byClass[cls[s.student_id]] || 0) + 1; }
          if (body.dry || !rows.length) return json({ count: rows.length, byConcept, byClass });
          for (let i = 0; i < rows.length; i += 200) {   // 주소 길이 때문에 나눠서
            const part = rows.slice(i, i + 200).map((s) => s.id).join(',');
            await sb(env, `submissions?id=in.(${part})`, { method: 'PATCH', prefer: 'return=minimal', body: body.undo ? { status: 'submitted', graded_at: null } : { status: 'graded', graded_at: new Date().toISOString() } });
          }
          // 피드백 초안도 함께 공개 (선생님이 쓴 말이 없는 것만)
          if (!body.undo && body.useDraft) for (const s of rows) if (s.feedback_draft && !s.feedback) await sb(env, `submissions?id=eq.${s.id}`, { method: 'PATCH', prefer: 'return=minimal', body: { feedback: s.feedback_draft.slice(0, 500) } });
          return json({ count: rows.length, byConcept, byClass, drafts: rows.filter((s) => s.feedback_draft && !s.feedback).length });
        }
        // ----- ✅ 검토·공개 -----
        // 목록: state = wait(채점 대기) | unpub(확정됐지만 피드백 미공개) | all
        if (p === '/api/t/review') {
          const g = int(q.get('grade')) || 4, c = int(q.get('class')), state = q.get('state') || 'wait';
          const students = await sb(env, `students?select=id,class_no,number,name&grade=eq.${g}${c ? `&class_no=eq.${c}` : ''}&order=class_no.asc,number.asc`);
          if (!students.length) return json({ students: [], items: [] });
          const ids = (q.get('concepts') || '').split(',').map(int).filter((x) => conceptOf(x));
          const cond = state === 'wait' ? '&status=eq.submitted' : state === 'unpub' ? '&status=eq.graded&feedback=is.null&feedback_draft=not.is.null' : '';
          const rows = await sb(env, `submissions?select=id,student_id,concept,attempt,status,answers,auto,overrides,ai,feedback,feedback_draft,reviewed_at&student_id=in.(${students.map((x) => x.id).join(',')})${ids.length ? `&concept=in.(${ids.join(',')})` : ''}${cond}`);
          return json({ students, items: rows.filter((r) => conceptOf(r.concept) && conceptOf(r.concept).grade === g) });
        }
        // 카드 하나 저장: O/X 수정·피드백 초안·검토함 (확정 상태는 그대로)
        if (p === '/api/t/review-save' && req.method === 'POST') {
          const patch = {};
          if (body.overrides) { const o = {}; for (const [k, v] of Object.entries(body.overrides)) if (int(k) != null && int(k) >= 0 && int(k) < 40) o[int(k)] = !!v; patch.overrides = o; }
          if (body.feedback_draft !== undefined) patch.feedback_draft = String(body.feedback_draft || '').slice(0, 500) || null;
          if (body.reviewed !== undefined) patch.reviewed_at = body.reviewed ? new Date().toISOString() : null;
          if (!Object.keys(patch).length) return json({ ok: true });
          await sb(env, `submissions?id=eq.${int(body.id)}`, { method: 'PATCH', prefer: 'return=minimal', body: patch });
          return json({ ok: true });
        }
        // 묶음 O/X: 여러 제출의 같은 문항을 한 번에
        if (p === '/api/t/bulk-override' && req.method === 'POST') {
          const ids = (body.ids || []).map(int).filter(Boolean), i = int(body.i), v = !!body.value;
          if (!ids.length || i == null || i < 0 || i >= 40) return fail('대상이 없어요');
          const rows = await sb(env, `submissions?select=id,auto,overrides&id=in.(${ids.join(',')})`);
          for (const r of rows) {
            const o = { ...(r.overrides || {}) };
            if (!!r.auto[i] === v) delete o[i]; else o[i] = v;
            await sb(env, `submissions?id=eq.${r.id}`, { method: 'PATCH', prefer: 'return=minimal', body: { overrides: o } });
          }
          return json({ count: rows.length });
        }
        // 확정 + 피드백 공개 (선생님이 쓴 말이 없으면 초안을 공개)
        if (p === '/api/t/review-commit' && req.method === 'POST') {
          const ids = (body.ids || []).map(int).filter(Boolean);
          if (!ids.length) return json({ graded: 0, published: 0 });
          const now = new Date().toISOString();
          let graded = 0, published = 0;
          for (let k = 0; k < ids.length; k += 200) {
            const rows = await sb(env, `submissions?select=id,status,feedback,feedback_draft&id=in.(${ids.slice(k, k + 200).join(',')})`);
            for (const r of rows) {
              const patch = { reviewed_at: now };
              if (body.grade !== false && r.status !== 'graded') { patch.status = 'graded'; patch.graded_at = now; graded++; }
              if (body.publish && !r.feedback && r.feedback_draft) { patch.feedback = r.feedback_draft.slice(0, 500); published++; }
              await sb(env, `submissions?id=eq.${r.id}`, { method: 'PATCH', prefer: 'return=minimal', body: patch });
            }
          }
          return json({ graded, published });
        }
        // 확정된 결과의 💬 피드백 초안을 학생에게 공개 (선생님이 쓴 말이 없는 것만)
        if (p === '/api/t/publish-drafts' && req.method === 'POST') {
          const g = int(body.grade) || 4, c = int(body.class);
          const students = await sb(env, `students?select=id&grade=eq.${g}${c ? `&class_no=eq.${c}` : ''}`);
          if (!students.length) return json({ count: 0 });
          const rows = await sb(env, `submissions?select=id,feedback_draft&status=eq.graded&feedback=is.null&feedback_draft=not.is.null&student_id=in.(${students.map((s) => s.id).join(',')})`);
          if (body.dry) return json({ count: rows.length });
          for (const s of rows) await sb(env, `submissions?id=eq.${s.id}`, { method: 'PATCH', prefer: 'return=minimal', body: { feedback: s.feedback_draft.slice(0, 500) } });
          return json({ count: rows.length });
        }
        // Claude 예약 작업이 남긴 분석 보고서
        if (p === '/api/t/reports') return json({ reports: await sb(env, `ai_reports?select=*&grade=eq.${int(q.get('grade')) || 4}&order=created_at.desc&limit=20`) });
        if (p === '/api/t/report-delete' && req.method === 'POST') { await sb(env, `ai_reports?id=eq.${int(body.id)}`, { method: 'DELETE', prefer: 'return=minimal' }); return json({ ok: true }); }
        if (p === '/api/t/reset' && req.method === 'POST') {   // 기록 없이 완전히 지우기
          await sb(env, `submissions?id=eq.${int(body.id)}`, { method: 'DELETE', prefer: 'return=minimal' });
          return json({ ok: true });
        }
        if (p === '/api/t/reissue' && req.method === 'POST') {
          let subs;
          if (body.id) subs = await sb(env, `submissions?select=*&id=eq.${int(body.id)}`);
          else {
            const c = conceptOf(body.concept), ids = (body.student_ids || []).map(int).filter(Boolean);
            if (!c || !ids.length) return fail('시험과 학생을 골라 주세요');
            subs = await sb(env, `submissions?select=*&concept=eq.${c.id}&student_id=in.(${ids.join(',')})`);
          }
          if (!subs.length) return json({ count: 0 });
          await sb(env, 'submission_history', { method: 'POST', prefer: 'return=minimal', body: subs.map((s) => ({ student_id: s.student_id, concept: s.concept, attempt: s.attempt || 1, answers: s.answers, auto: s.auto, overrides: s.overrides || {}, ai: s.ai, status: s.status, feedback: s.feedback, feedback_draft: s.feedback_draft, submitted_at: s.submitted_at, graded_at: s.graded_at })) });
          await sb(env, `submissions?id=in.(${subs.map((s) => s.id).join(',')})`, { method: 'DELETE', prefer: 'return=minimal' });
          // 닫힌 시험이면 함께 열기 (선택)
          if (body.open) await sb(env, 'test_settings?on_conflict=concept', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: [...new Set(subs.map((s) => s.concept))].map((concept) => ({ concept, enabled: true, updated_at: new Date().toISOString() })) });
          return json({ count: subs.length });
        }
        if (p === '/api/t/roster' && req.method === 'POST') {
          const withIds = [], noIds = [];
          for (const cl of body.classes || []) {
            const c = int(cl.class_no), g = int(cl.grade) || 4; if (!c || c < 1 || c > 15 || g < 1 || g > 6) continue;
            for (const s of cl.students || []) {
              const number = int(s.number), name = normName(s.name);
              if (!(number && number > 0 && number < 100 && name)) continue;
              const ids = s.login_ids != null ? normIds(s.login_ids) : null;
              if (ids && ids.length) withIds.push({ grade: g, class_no: c, number, name, login_ids: ids });
              else noIds.push({ grade: g, class_no: c, number, name });   // ID 없으면 기존 ID는 그대로 둠
            }
          }
          if (!withIds.length && !noIds.length) return fail('저장할 학생이 없어요');
          for (const rows of [withIds, noIds]) if (rows.length)
            await sb(env, 'students?on_conflict=grade,class_no,number', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: rows });
          // 반 전체 바꾸기: 파일에 없는 번호의 학생(과 그 학생이 낸 답)을 지움
          let removed = 0;
          if (body.replace) {
            const byCls = {};
            for (const r of [...withIds, ...noIds]) (byCls[r.grade + '-' + r.class_no] = byCls[r.grade + '-' + r.class_no] || []).push(r.number);
            for (const [gc, nums] of Object.entries(byCls)) {
              const [g, c] = gc.split('-').map(int);
              const del = await sb(env, `students?grade=eq.${g}&class_no=eq.${c}&number=not.in.(${nums.join(',')})`, { method: 'DELETE', prefer: 'return=representation' });
              removed += del.length;
            }
          }
          return json({ count: withIds.length + noIds.length, withIds: withIds.length, removed });
        }
        if (p === '/api/t/roster-check') {
          const all = await sb(env, 'students?select=grade,class_no,login_ids');
          const by = {}; for (const s of all) { const k = s.grade + '-' + s.class_no; const b = (by[k] = by[k] || { grade: s.grade, class_no: s.class_no, total: 0, noId: 0 }); b.total++; if (!s.login_ids || !s.login_ids.length) b.noId++; }
          return json({ classes: by });
        }
        // 정답을 고친 뒤 이미 낸 답을 다시 자동 채점 (선생님이 직접 고친 O/X는 그대로)
        if (p === '/api/t/regrade' && req.method === 'POST') {
          const g = int(body.grade) || 4, ids = CONCEPTS.filter((c) => c.grade === g).map((c) => c.id);
          const subs = await sb(env, `submissions?select=id,concept,answers,auto&concept=in.(${ids.join(',')})`);
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
        // 시험 열기/닫기
        // 미리보기에서 채점해 보기 (저장 안 함)
        if (p === '/api/t/try' && req.method === 'POST') {
          const c = conceptOf(body.concept); if (!c) return fail('시험을 찾을 수 없어요');
          const ans = Array.isArray(body.answers) ? body.answers : [];
          return json({ marks: c.questions.map((qq, i) => gradeOne(qq, ans[i])) });
        }
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
        if (p === '/api/t/student-delete' && req.method === 'POST') {
          await sb(env, `students?id=eq.${int(body.id)}`, { method: 'DELETE', prefer: 'return=minimal' });
          return json({ ok: true });
        }
      }
      return fail('없는 주소예요', 404);
    } catch (e) {
      return fail(e.message || '서버 오류', e.status || 500);
    }
  },
};
