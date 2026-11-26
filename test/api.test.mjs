// 실제 Worker 처리기(src/worker.js)를 가짜 Supabase(test/api-mock.mjs)에 붙여 API 동작을 확인합니다.
// 네트워크·실제 DB·실제 학생 없음 (가짜 이름만).
import worker from '../src/worker.js';
import { createDb, seed } from './api-mock.mjs';
import { CONCEPTS } from '../src/content.js';

let bad = 0, n = 0;
const ok = (cond, msg, extra) => { n++; if (!cond) { bad++; console.log('BAD', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } else console.log('ok ', msg); };

const env = { SUPABASE_URL: 'http://mock.local', SUPABASE_SERVICE_KEY: 'sb_secret_test', TEACHER_PASSWORD: 'pw-test', AI_API_URL: 'http://ai.local/v1', AI_API_KEY: 'k', AI_MODEL: 'm' };
let mock;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opt) => {
  const u = String(url);
  if (/^http:\/\/mock\d*\.local/.test(u)) return mock.fetchLike(u, opt);
  if (u.startsWith(env.AI_API_URL)) {   // 가짜 AI: "It's"로 시작하면 인정
    const j = JSON.parse(opt.body); const items = [...j.messages[1].content.matchAll(/### (\d+)번[\s\S]*?\[학생 답\] (.*)/g)];
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ results: items.map(([, k, a]) => ({ n: +k, ok: /^it'?s /i.test(a), reason: 'r' })) }) } }] }), { headers: { 'content-type': 'application/json' } });
  }
  return realFetch(url, opt);
};
let dbNo = 0;   // 가짜 DB마다 주소를 달리해 Worker의 스키마 버전 기억이 섞이지 않게
const fresh = (o) => { mock = createDb(o); seed(mock); env.SUPABASE_URL = `http://mock${++dbNo}.local`; return mock; };
async function call(path, body, token) {
  const headers = {}; if (token) headers.authorization = 'Bearer ' + token;
  if (body) headers['content-type'] = 'application/json';
  const r = await worker.fetch(new Request('http://w.local' + path, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined }), env);
  return { status: r.status, d: await r.json().catch(() => null) };
}
// 학생 로그인 → 토큰
const stuLogin = async (name, id) => (await call('/api/login', { name, id })).d?.token;
const T = async () => (await call('/api/teacher/login', { password: 'pw-test' })).d.token;
const c11 = CONCEPTS.find((c) => c.id === 11);   // 4학년 개념 (AI 테스트용 시각 문제)
const ans11 = ["It's four thirty", 'nine forty', 'time', 'time', ['What', 'time', 'is', 'it'], 'three thirty', 'ten fourty', '4:30', '9:40', 'is'];

// ---------- 학생 API ----------
fresh();
let st = await stuLogin('가짜1반1', 'fake101');
ok(!!st, '학생 로그인');
let r = await call('/api/concepts', null, st);
ok(r.status === 200 && r.d.concepts.every((c) => Array.isArray(c.questions) && c.grade === 4), '/api/concepts 기존 형식 유지 (문항 포함)');
const full = r.d.concepts;
r = await call('/api/concepts?lite=1', null, st);
ok(r.d.concepts.length === full.length && r.d.concepts.every((c) => !c.questions && !('summary' in c) && c.questionCount > 0 && typeof c.contentVersion === 'string' && typeof c.open === 'boolean'), 'lite=1: 문항·정리 없이 questionCount·contentVersion·open');
r = await call('/api/concept?concept=11', null, st);
ok(r.status === 200 && r.d.concept.questions.length === r.d.concept.questionCount && r.d.concept.questions.every((q) => q.a === undefined) && !r.d.concept.summary, '/api/concept 상세: 문항 있음, 정답·정리 없음');
ok((await call('/api/concept?id=11', null, st)).status === 200, '/api/concept?id= 별칭');
const g3 = CONCEPTS.find((c) => c.grade === 3);
ok((await call('/api/concept?concept=' + g3.id, null, st)).status === 400, '/api/concept 다른 학년 거부');
await call('/api/submit', { concept: 11, answers: ans11 }, st);
await call('/api/submit', { concept: 1, answers: [] }, st);
r = await call('/api/submissions', null, st);
ok(r.status === 200 && r.d.items.length === 0, '/api/submissions: 채점 전에는 비어 있음');
mock.state.db.submissions.find((s) => s.concept === 11).status = 'graded';
r = await call('/api/submissions', null, st);
const one = await call('/api/submission?concept=11', null, st);
ok(r.d.items.length === 1 && r.d.items[0].concept.id === 11 && r.d.items[0].concept.questions.length === 10 && JSON.stringify(r.d.items[0].submission) === JSON.stringify(one.d.submission), '/api/submissions: graded만, submission은 /api/submission과 같은 모양', r.d.items[0]);

// ---------- 쪽 나눔 (1000행 제한) ----------
fresh({ maxRows: 3 });
let tk = await T();
for (const s of mock.state.db.students.filter((x) => x.class_no === 1)) { const t = await stuLogin(s.name, s.login_ids[0]); await call('/api/submit', { concept: 1, answers: [] }, t); await call('/api/submit', { concept: 2, answers: [] }, t); }
r = await call('/api/t/overview?grade=4&class=1', null, tk);
ok(r.d.students.length === 6 && r.d.submissions.length === 12, '한 번에 3행만 주는 DB에서도 목록이 빠지지 않음', { s: r.d.students.length, sub: r.d.submissions.length });
r = await call('/api/t/review?grade=4&state=all', null, tk);
ok(r.d.items.length === 12 && r.d.items.every((x) => x.rev === 1), '검토 목록도 전부 + rev 포함');

// ---------- 저장 버전(rev)과 상태 ----------
fresh(); tk = await T();
st = await stuLogin('가짜1반1', 'fake101');
await call('/api/submit', { concept: 11, answers: ans11 }, st);
const sid = mock.state.db.submissions[0].id;
r = await call('/api/t/review-save', { id: sid, rev: 1, overrides: { 1: true } }, tk);
ok(r.status === 200 && r.d.rev === 2, 'review-save: 버전 맞으면 저장, rev+1');
r = await call('/api/t/review-save', { id: sid, rev: 1, overrides: { 1: false } }, tk);
ok(r.status === 409 && r.d.conflict && r.d.current.rev === 2 && mock.state.db.submissions[0].overrides[1] === true, 'review-save: 옛 버전 저장은 409, DB는 그대로', r);
r = await call('/api/t/grade', { id: sid, rev: 2, overrides: { 1: true }, feedback: '', status: 'graded' }, tk);
ok(r.d.status === 'graded' && mock.state.db.submissions[0].graded_at, '상세: 확정');
const gAt = mock.state.db.submissions[0].graded_at;
r = await call('/api/t/grade', { id: sid, rev: r.d.rev, overrides: { 1: true, 2: true }, feedback: '좋아요' }, tk);
ok(r.d.status === 'graded' && mock.state.db.submissions[0].status === 'graded' && mock.state.db.submissions[0].graded_at === gAt && mock.state.db.submissions[0].feedback === '좋아요', '상세: 수정 저장은 확정 상태 유지 (예전 버그: submitted로 바뀜)');
r = await call('/api/t/grade', { id: sid, rev: r.d.rev, status: 'submitted' }, tk);
ok(mock.state.db.submissions[0].status === 'submitted' && mock.state.db.submissions[0].graded_at === null && mock.state.db.submissions[0].overrides[2] === true, '상세: 확정 취소는 명시적으로만, O/X는 그대로');

// AI: 선생님이 정한 O/X는 바꾸지 않음
mock.state.db.submissions[0].overrides = { 0: false };   // 선생님이 1번(It's four thirty)을 X로 정함
let rev = mock.state.db.submissions[0].rev;
r = await call('/api/t/ai-grade', { id: sid, rev }, tk);
ok(r.status === 200 && r.d.overrides[0] === false, 'AI: 선생님이 정한 X는 그대로', r.d);
r = await call('/api/t/ai-grade', { id: sid, rev }, tk);
ok(r.status === 409, 'AI: 화면 버전이 옛것이면 409 (미저장 O/X 덮어쓰기 방지)');

// 검토 확정 + 최신 초안 함께 공개 (한 행 UPDATE)
mock.state.db.submissions[0].feedback_draft = '옛 초안'; mock.state.db.submissions[0].feedback = null;
rev = mock.state.db.submissions[0].rev;
const before = mock.state.log.length;
r = await call('/api/t/review-commit', { items: [{ id: sid, rev, feedback_draft: '새 초안' }], publish: true, grade: true }, tk);
const patches = mock.state.log.slice(before).filter((x) => x.startsWith('PATCH'));
ok(r.d.graded === 1 && r.d.published === 1 && mock.state.db.submissions[0].feedback === '새 초안' && mock.state.db.submissions[0].feedback_draft === '새 초안' && mock.state.db.submissions[0].status === 'graded', '검토 확정: 화면의 최신 초안이 공개됨 (옛 초안 아님)');
ok(patches.length === 1, '검토 확정: 확정·공개를 한 행 UPDATE 한 번으로', patches);
r = await call('/api/t/review-commit', { items: [{ id: sid, rev, feedback_draft: 'x' }], publish: true }, tk);
ok(r.d.conflicts.length === 1 && mock.state.db.submissions[0].feedback === '새 초안', '검토 확정: 옛 버전이면 건너뛰고 conflicts로 알림');

// 묶음 O/X: 선생님 값으로 기록
mock.state.db.submissions[0].status = 'submitted';
r = await call('/api/t/bulk-override', { ids: [sid], i: 3, value: false, revs: { [sid]: mock.state.db.submissions[0].rev } }, tk);
ok(r.d.count === 1 && r.d.items[0].overrides[3] === false && r.d.items[0].rev === mock.state.db.submissions[0].rev, '묶음 O/X: 자동 채점과 같아도 선생님 값으로 기록 + 새 rev');

// 일괄 확정 + 초안 공개: 한 행은 PATCH 한 번 (트리거로 rev가 올라도 충돌 안 남)
{
  const save = mock, saveUrl = env.SUPABASE_URL; fresh(); const t2 = await T();
  for (const k of [1, 2, 3]) { const t = await stuLogin(`가짜1반${k}`, `fake10${k}`); await call('/api/submit', { concept: 1, answers: [] }, t); }
  mock.state.db.submissions.forEach((x, k) => { if (k < 2) x.feedback_draft = '초안' + k; });
  const b0 = mock.state.log.length;
  const cr = await call('/api/t/confirm-all', { grade: 4, class: 1, concepts: [1], useDraft: true }, t2);
  const pt = mock.state.log.slice(b0).filter((x) => x.startsWith('PATCH'));
  ok(cr.d.count === 3 && cr.d.drafts === 2 && cr.d.conflicts === 0 && pt.length === 3 && mock.state.db.submissions.every((x) => x.status === 'graded') && mock.state.db.submissions[0].feedback === '초안0', '일괄 확정: 3건 확정 + 초안 2건 공개, 행마다 PATCH 1번, 충돌 0', { d: cr.d, pt });
  mock = save; env.SUPABASE_URL = saveUrl;
}

// ---------- 재출제 (DB 함수) ----------
r = await call('/api/t/reissue', { id: sid, open: true }, tk);
ok(r.d.count === 1 && mock.state.db.submissions.length === 0 && mock.state.db.submission_history.length === 1, '재출제: 기록 보관 후 지움');
fresh({ schema: 1 }); tk = await T();
st = await stuLogin('가짜1반1', 'fake101');
ok(!!st, '업그레이드 전 DB: 학생 로그인 됨 (읽기 호환)');
await call('/api/submit', { concept: 11, answers: ans11 }, st);
ok(mock.state.db.submissions.length === 1, '업그레이드 전 DB: 제출 됨');
r = await call('/api/t/overview?grade=4&class=1', null, tk);
ok(r.status === 200 && r.d.submissions.length === 1, '업그레이드 전 DB: 성적표 읽기 됨');
r = await call('/api/t/reissue', { id: mock.state.db.submissions[0].id }, tk);
ok(r.status === 503 && r.d.upgrade && mock.state.db.submissions.length === 1 && mock.state.db.submission_history.length === 0, '업그레이드 전 DB: 재출제는 안내 후 중단 (여러 요청으로 폴백 안 함)', r.d);
r = await call('/api/t/roster', { classes: [{ grade: 4, class_no: 1, students: [{ number: 1, name: '새' }] }] }, tk);
ok(r.status === 503 && r.d.upgrade && mock.state.db.students.find((s) => s.class_no === 1 && s.number === 1).name === '가짜1반1', '업그레이드 전 DB: 명렬표 저장도 안내 후 중단');
r = await call('/api/t/review-save', { id: mock.state.db.submissions[0].id, rev: 1, overrides: {} }, tk);
ok(r.status === 503 && r.d.upgrade, '업그레이드 전 DB: 검토 저장 안내');
ok((await call('/api/t/schema', null, tk)).d.ok === false, '/api/t/schema: 업그레이드 필요 표시');

// ---------- 명렬표: 미리보기·보관·복원 ----------
fresh(); tk = await T();
st = await stuLogin('가짜1반6', 'fake106');
await call('/api/submit', { concept: 1, answers: [] }, st);
const file = [{ grade: 4, class_no: 1, students: [1, 2, 3, 4].map((k) => ({ number: k, name: `가짜1반${k}`, login_ids: null })).concat([{ number: 5, name: '이름바뀜', login_ids: ['fake105'] }, { number: 7, name: '새학생', login_ids: ['n7'] }]) }];
r = await call('/api/t/roster-preview', { classes: file }, tk);
let pv = r.d.classes[0];
ok(pv.add.length === 1 && pv.update.length === 1 && pv.update[0].nameChanged && pv.archive.length === 0 && pv.same === 4, '미리보기(바꾸기 끔): 추가 1 · 수정 1 · 보관 0', pv);
r = await call('/api/t/roster-preview', { classes: file, archive: true }, tk);
pv = r.d.classes[0];
ok(pv.archive.length === 1 && pv.archive[0].number === 6 && pv.archive[0].answers === 1, '미리보기(바꾸기 켬): 보관 대상 6번 + 답 수 1', pv.archive);
r = await call('/api/t/roster', { classes: file }, tk);
ok(r.d.added === 1 && r.d.archived === 0 && !mock.state.db.students.find((s) => s.number === 6 && s.class_no === 1).archived_at, '저장(바꾸기 기본 끔): 아무도 보관 안 됨');
r = await call('/api/t/roster', { classes: file, archive: true }, tk);
const s6 = mock.state.db.students.find((s) => s.number === 6 && s.class_no === 1);
ok(r.d.archived === 1 && s6.archived_at && mock.state.db.submissions.some((x) => x.student_id === s6.id), '바꾸기 켬: 6번 보관, 답은 그대로');
r = await call('/api/t/overview?grade=4&class=1', null, tk);
ok(!r.d.students.some((s) => s.id === s6.id), '보관된 학생은 성적표에서 빠짐');
ok((await call('/api/login', { name: '가짜1반6', id: 'fake106' })).status === 401, '보관된 학생은 로그인 안 됨');
ok((await call('/api/me', null, st)).status === 401, '보관된 학생의 예전 토큰도 거부');
r = await call('/api/t/roster-list?grade=4&class=1', null, tk);
ok(r.d.students.find((s) => s.id === s6.id).archived_at && r.d.students.find((s) => s.id === s6.id).answers === 1, '명렬표 화면: 보관 학생도 보이고 답 수 표시');
r = await call('/api/t/student-delete', { id: s6.id }, tk);
ok(r.status === 409 && mock.state.db.students.includes(s6), '답 기록이 있는 학생은 완전 삭제 거부');
r = await call('/api/t/student-archive', { id: s6.id, archived: false }, tk);
ok(r.d.archived_at === null && (await call('/api/login', { name: '가짜1반6', id: 'fake106' })).status === 200, '복원하면 다시 로그인');
const s7 = mock.state.db.students.find((s) => s.number === 7 && s.class_no === 1);
ok((await call('/api/t/student-delete', { id: s7.id }, tk)).status === 200, '답 없는 학생은 삭제 가능');

r = await call('/api/t/roster-preview', { classes: [{ grade: 4, class_no: 2, students: [{ number: 1, name: '가짜2반1' }] }, { grade: 4, class_no: 2, students: [{ number: 1, name: '가짜2반1' }, { number: 9, name: '새' }] }] }, tk);
ok(r.d.classes.length === 1 && r.d.classes[0].total === 2 && r.d.classes[0].add.length === 1, '같은 반이 두 번 와도 번호는 하나만', r.d.classes);

// ---------- 오늘 할 일 ----------
r = await call('/api/t/today?grade=4', null, tk);
const c1 = r.d.classes.find((c) => c.class_no === 1);
const open4 = CONCEPTS.filter((c) => c.grade === 4).length;
ok(c1 && c1.wait === 1 && c1.openSets === open4 && c1.missing === open4 * c1.students - 1, '오늘 할 일: 채점 대기 1, 미제출 = 열린 시험 전체 × 학생 - 낸 것 (아무도 안 낸 시험 포함)', c1);
await call('/api/t/settings', { concepts: CONCEPTS.filter((c) => c.grade === 4 && c.id !== 1).map((c) => c.id), enabled: false }, tk);
const c1b = (await call('/api/t/today?grade=4', null, tk)).d.classes.find((c) => c.class_no === 1);
ok(c1b.openSets === 1 && c1b.missing === c1b.students - 1, '오늘 할 일: 닫힌 시험은 미제출에서 빠짐', c1b);

console.log(n, 'checks;', bad ? bad + ' problems' : 'ALL OK');
process.exit(bad ? 1 : 0);
