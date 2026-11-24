// 로컬 테스트: 가짜 PostgREST(:8788) + Worker(:8787)
import http from 'node:http';
import worker from '../src/worker.js';
const db = { students: [], submissions: [], test_settings: [], submission_history: [] }; let seq = 1;
const parse = (sp) => { const f = []; let order = null; for (const [k, v] of sp) { if (k === 'select' || k === 'on_conflict') continue; if (k === 'order') { order = v; continue; } let [op, ...rest] = v.split('.'); let neg = false; if (op === 'not') { neg = true; op = rest.shift(); } const val = rest.join('.'); f.push([k, op, op === 'in' ? val.slice(1, -1).split(',') : val, neg]); } return { f, order }; };
const match = (r, f) => f.every(([k, op, v, neg]) => neg !== (op === 'eq' ? String(r[k]) === v : op === 'in' ? v.includes(String(r[k])) : op === 'cs' ? v.slice(1, -1).split(',').map((x) => x.replace(/"/g, '')).every((x) => (r[k] || []).includes(x)) : true));
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'); const t = u.pathname.split('/').pop(); const { f, order } = parse(u.searchParams);
  let body = ''; for await (const c of req) body += c; body = body ? JSON.parse(body) : null;
  const tbl = db[t]; if (!tbl) { res.writeHead(404); return res.end('relation does not exist'); }
  let out = [];
  if (req.method === 'GET') { out = tbl.filter((r) => match(r, f)); if (order) { const [k, d] = order.split('.'); out.sort((a, b) => (a[k] - b[k]) * (d === 'desc' ? -1 : 1)); } }
  if (req.method === 'POST') { const keys = (u.searchParams.get('on_conflict') || '__none__').split(','); for (const row of body) { const ex = tbl.find((r) => keys.every((k) => r[k] === row[k])); if (ex) Object.assign(ex, row); else tbl.push({ id: seq++, ...(t === 'students' ? { login_ids: [] } : {}), ...row }); } }
  if (req.method === 'PATCH') { out = tbl.filter((r) => match(r, f)); out.forEach((r) => Object.assign(r, body)); }
  if (req.method === 'DELETE') { out = tbl.filter((r) => match(r, f)); for (const r of out) { tbl.splice(tbl.indexOf(r), 1); if (t === 'students') db.submissions = db.submissions.filter((s) => s.student_id !== r.id); } }
  if (req.method !== 'GET' && /return=minimal/.test(req.headers.prefer || '')) { res.writeHead(req.method === 'POST' ? 201 : 204); return res.end(); }
  res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(out));
}).listen(8788);
// 가짜 AI (OpenAI 호환) :8789 — "It's"를 덧붙인 답은 인정, 나머지는 오답
let lastAI = null;
http.createServer(async (req, res) => {
  let b = ''; for await (const c of req) b += c; const j = JSON.parse(b); lastAI = { auth: req.headers.authorization, model: j.model };
  const items = [...j.messages[1].content.matchAll(/### (\d+)번[\s\S]*?\[학생 답\] (.*)/g)];
  const results = items.map(([, n, a]) => ({ n: +n, ok: /^it'?s /i.test(a), reason: /^it'?s /i.test(a) ? "It's를 덧붙였지만 시각 표현이 맞아요" : '철자가 틀렸어요' }));
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ choices: [{ message: { content: '채점 결과입니다:\n```json\n' + JSON.stringify({ results }) + '\n```' } }] }));
}).listen(8789);
// 가짜 R2: test/media/ 폴더
import fs from 'node:fs';
const MEDIA_DIR = process.env.MEDIA_DIR || new URL('./media/', import.meta.url).pathname;
const MEDIA = { async put(key, body) { const f = MEDIA_DIR + key; fs.mkdirSync(f.slice(0, f.lastIndexOf('/')), { recursive: true }); fs.writeFileSync(f, Buffer.from(await new Response(body).arrayBuffer())); }, async get(key) { const f = MEDIA_DIR + key; if (!fs.existsSync(f)) return null; const b = fs.readFileSync(f);
  return { body: b, size: b.length, httpEtag: '"x"', range: null, writeHttpMetadata(h) { h.set('content-type', key.endsWith('.mp3') ? 'audio/mpeg' : 'image/jpeg'); } }; } };
const env = { MEDIA, AI_API_URL: 'http://127.0.0.1:8789/v1/chat/completions', AI_API_KEY: 'k-test', AI_MODEL: 'jb-model', SUPABASE_URL: 'http://127.0.0.1:8788', SUPABASE_SERVICE_KEY: 'sb_secret_test', TEACHER_PASSWORD: 'test1234' };
http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c); const body = Buffer.concat(chunks);   // 파일 업로드도 깨지지 않게 바이트 그대로
  const r = await worker.fetch(new Request('http://127.0.0.1:8787' + req.url, { method: req.method, headers: req.headers, body: req.method === 'POST' ? body : undefined }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
}).listen(8787, () => console.log('ready'));
