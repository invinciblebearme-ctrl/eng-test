// 로컬 테스트: 가짜 PostgREST(:8788) + 가짜 AI(:8789) + Worker(:8787) — 모두 127.0.0.1에서만 열림
// SEED=1 이면 가짜 학생(가짜1반1…)을 넣어 둠. MOCK_SCHEMA=1 이면 업그레이드 전 DB 흉내. MOCK_MAX_ROWS로 쪽 크기.
import http from 'node:http';
import fs from 'node:fs';
import worker from '../src/worker.js';
import { createDb, listenDb, seed } from './api-mock.mjs';

const HOST = '127.0.0.1';
const mock = createDb({ schema: +(process.env.MOCK_SCHEMA || 2), maxRows: +(process.env.MOCK_MAX_ROWS || 1000) });
if (process.env.SEED) seed(mock);
listenDb(mock, 8788, HOST);

// 가짜 AI (OpenAI 호환) :8789 — "It's"를 덧붙인 답은 인정, 나머지는 오답
http.createServer(async (req, res) => {
  let b = ''; for await (const c of req) b += c; const j = JSON.parse(b);
  if (process.env.AI_LOG) fs.appendFileSync(process.env.AI_LOG, JSON.stringify({ chars: j.messages.map((m) => m.content.length), max_tokens: j.max_tokens, user: j.messages[1].content }) + '\n');
  if (/생활기록부/.test(j.messages[0].content)) { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ choices: [{ message: { content: '"요일 낱말을 듣고 첫 글자를 대문자로 바르게 쓰며, 배운 표현의 뜻을 우리말로 정확히 옮김. 헷갈리는 낱말의 철자를 소리 내어 확인하는 습관을 기르며 꾸준히 성장하는 모습을 보임."' } }] })); return; }
  const items = [...j.messages[1].content.matchAll(/### (\d+)번[\s\S]*?\[학생 답\] (.*)/g)];
  const results = items.map(([, n, a]) => ({ n: +n, ok: /^it'?s /i.test(a), reason: /^it'?s /i.test(a) ? "It's를 덧붙였지만 시각 표현이 맞아요" : '철자가 틀렸어요' }));
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ choices: [{ message: { content: '채점 결과입니다:\n```json\n' + JSON.stringify({ results }) + '\n```' } }] }));
}).listen(8789, HOST);

// 가짜 R2: test/media/ 폴더
const MEDIA_DIR = process.env.MEDIA_DIR || new URL('./media/', import.meta.url).pathname;
const MEDIA = { async put(key, body) { const f = MEDIA_DIR + key; fs.mkdirSync(f.slice(0, f.lastIndexOf('/')), { recursive: true }); fs.writeFileSync(f, Buffer.from(await new Response(body).arrayBuffer())); }, async get(key) { const f = MEDIA_DIR + key; if (!fs.existsSync(f)) return null; const b = fs.readFileSync(f);
  return { body: b, size: b.length, httpEtag: '"x"', range: null, writeHttpMetadata(h) { h.set('content-type', key.endsWith('.mp3') ? 'audio/mpeg' : 'image/jpeg'); } }; } };
const env = { MEDIA, AI_API_URL: `http://${HOST}:8789/v1/chat/completions`, AI_API_KEY: 'k-test', AI_MODEL: 'jb-model', SUPABASE_URL: `http://${HOST}:8788`, SUPABASE_SERVICE_KEY: 'sb_secret_test', TEACHER_PASSWORD: 'test1234' };
http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c); const body = Buffer.concat(chunks);   // 파일 업로드도 깨지지 않게 바이트 그대로
  const r = await worker.fetch(new Request(`http://${HOST}:8787` + req.url, { method: req.method, headers: req.headers, body: req.method === 'POST' ? body : undefined }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
}).listen(8787, HOST, () => console.log(`ready http://${HOST}:8787 (교사 비밀번호 test1234${process.env.SEED ? ', 가짜 학생: 가짜1반1 / fake101' : ''})`));
