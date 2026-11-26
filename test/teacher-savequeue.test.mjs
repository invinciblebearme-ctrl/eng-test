// common.js의 saveQueue(검토 카드 저장 줄)를 실제로 늦게 끝나는 요청(deferred fetch)으로 확인합니다.
// 특히: 저장 중에 두 번째 O/X를 쌓아도 멈추지(서로 기다리지) 않고, 순서대로 새 rev로 보내는지.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = { console, setTimeout, clearTimeout, Promise, window: {}, document: { addEventListener() {}, getElementById: () => null, querySelector: () => null }, addEventListener() {}, CSS: { escape: (x) => x } };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('../public/common.js', import.meta.url), 'utf8') + '\n;globalThis.saveQueue = saveQueue;', ctx);
const { saveQueue } = ctx;

let bad = 0;
const ok = (c, m, x) => { console.log(c ? 'ok ' : 'BAD', m, c || x === undefined ? '' : JSON.stringify(x)); if (!c) bad++; };
const tick = () => new Promise((r) => setImmediate(r));
const within = (p, ms = 500) => Promise.race([p.then(() => true), new Promise((r) => setTimeout(() => r(false), ms))]);
// 가짜 서버: 요청마다 끝내는 시점을 테스트가 정함. rev가 맞아야 저장
function server() {
  const s = { rev: 1, sent: [], waits: [], data: {} };
  s.send = (patch, rev) => new Promise((res, rej) => { s.sent.push({ patch, rev }); s.waits.push({ res: () => { if (rev !== s.rev) { const e = new Error('conflict'); e.status = 409; return rej(e); } Object.assign(s.data, patch); s.rev++; res({ rev: s.rev }); }, rej }); });
  s.finish = async (k = 0) => { s.waits[k].res(); await tick(); };
  return s;
}

// 1) 저장 중에 두 번째 변경 → 첫 저장 끝난 뒤 새 rev로 이어서, 멈춤 없음
{
  const srv = server(), card = { rev: 1 }, states = [];
  const q = saveQueue(async (p) => { const d = await srv.send(p, card.rev); card.rev = d.rev; }, (x) => states.push(x.state));
  const p1 = q.stage({ overrides: { 1: true } });
  await tick();
  ok(srv.sent.length === 1 && q.state === 'saving', '첫 O/X: 바로 보냄, 저장 중');
  const p2 = q.stage({ overrides: { 1: true, 2: false } });
  await tick();
  ok(srv.sent.length === 1, '저장 중 두 번째 O/X: 아직 안 보냄 (줄 서기)');
  await srv.finish(0);
  await tick();
  ok(srv.sent.length === 2 && srv.sent[1].rev === 2, '첫 저장이 끝나면 새 rev(2)로 두 번째를 보냄', srv.sent);
  await srv.finish(1);
  ok(await within(Promise.all([p1, p2])), '두 저장 모두 끝남 (서로 기다리는 멈춤 없음)');
  ok(q.state === 'saved' && card.rev === 3 && srv.data.overrides[2] === false && !q.running, '마지막 값 저장, 상태 saved', { st: q.state, rev: card.rev });
}
// 2) 저장 중에 여러 번 쌓으면 하나로 합쳐 한 번만 더 보냄
{
  const srv = server(), card = { rev: 1 };
  const q = saveQueue(async (p) => { const d = await srv.send(p, card.rev); card.rev = d.rev; });
  q.stage({ a: 1 }); await tick();
  q.stage({ b: 1 }); q.stage({ c: 1 }); q.stage({ b: 2 });
  await srv.finish(0); await tick();
  ok(srv.sent.length === 2 && JSON.stringify(srv.sent[1].patch) === JSON.stringify({ b: 2, c: 1 }), '쌓인 변경은 합쳐서 한 번에', srv.sent[1]);
  await srv.finish(1);
  ok(await within(q.done) && q.state === 'saved', '합친 저장도 끝남');
}
// 3) 실패: 변경 보존, error 상태, 다시 저장하면 같은 내용(+그 사이 변경)을 보냄
{
  let fail = true; const sent = [];
  const q = saveQueue(async (p) => { sent.push(p); if (fail) throw new Error('네트워크 오류'); });
  await q.stage({ feedback_draft: '가' });
  ok(q.state === 'error' && q.err === '네트워크 오류' && q.pending.feedback_draft === '가' && !q.running, '실패하면 error, 변경은 남음');
  q.stage({ overrides: { 0: true } }, 50);   // 실패 뒤 새 변경 (지연)
  ok(q.state === 'error', '실패 표시는 다시 저장할 때까지 유지');
  fail = false; await q.flush();
  ok(q.state === 'saved' && sent.length === 2 && sent[1].feedback_draft === '가' && sent[1].overrides[0] === true, '다시 저장: 실패한 것 + 새 변경 함께', sent[1]);
}
// 4) 409(다른 곳에서 바뀜): 더 보내지 않음
{
  let n = 0;
  const q = saveQueue(async () => { n++; const e = new Error('바뀜'); e.status = 409; throw e; });
  await q.stage({ x: 1 });
  await q.stage({ y: 1 });
  ok(q.conflict && q.state === 'error' && n === 1, '409 뒤에는 새로 불러올 때까지 보내지 않음');
  q.reset();
  ok(!q.conflict && q.state === 'saved' && !q.pending, 'reset()으로 되돌림');
}
// 5) 지연 저장(피드백 0.7초): flush하면 기다리지 않고 바로, 한 번만
{
  const sent = [];
  const q = saveQueue(async (p) => { sent.push(p); });
  q.stage({ feedback_draft: '안녕' }, 700);
  ok(q.state === 'dirty' && sent.length === 0, '지연 저장: 아직 안 보냄 (dirty)');
  await q.flush();
  await new Promise((r) => setTimeout(r, 20));
  ok(sent.length === 1 && q.state === 'saved' && q.timer === null, '공개 전 flush: 바로 보내고 타이머 지움 (두 번 안 보냄)');
}

console.log(bad ? `${bad} problems` : 'ALL OK');
process.exit(bad ? 1 : 0);
