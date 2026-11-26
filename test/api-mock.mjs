// 테스트용 가짜 Supabase(PostgREST) — 메모리 DB. 가짜 데이터만 씁니다.
// 실제 PostgREST처럼: select 열 고르기, eq/neq/in/is/cs/gt/gte/lt/lte/not 필터, order(여러 열),
// limit/offset, 최대 행 수(maxRows), Prefer count=exact → Content-Range, return=representation, upsert(on_conflict),
// 없는 열 → 400(42703), 없는 함수 → 404(PGRST202), rpc 함수(원자적: 실패하면 아무것도 안 바뀜)
import http from 'node:http';

const COLS = {
  students: ['id', 'grade', 'class_no', 'number', 'name', 'login_ids', 'created_at', 'archived_at'],
  submissions: ['id', 'student_id', 'concept', 'attempt', 'answers', 'auto', 'overrides', 'ai', 'feedback_draft', 'reviewed_at', 'status', 'feedback', 'submitted_at', 'graded_at', 'rev'],
  submission_history: ['id', 'student_id', 'concept', 'attempt', 'answers', 'auto', 'overrides', 'ai', 'feedback_draft', 'status', 'feedback', 'submitted_at', 'graded_at', 'archived_at'],
  ai_reports: ['id', 'grade', 'title', 'body', 'created_at'],
  test_settings: ['concept', 'enabled', 'updated_at'],
};
const V2_ONLY = { students: ['archived_at'], submissions: ['rev'] };
const DEFAULTS = {
  students: () => ({ login_ids: [], archived_at: null, created_at: new Date().toISOString() }),
  submissions: () => ({ attempt: 1, overrides: {}, ai: null, feedback_draft: null, reviewed_at: null, status: 'submitted', feedback: null, submitted_at: new Date().toISOString(), graded_at: null, rev: 1 }),
  submission_history: () => ({ overrides: {}, archived_at: new Date().toISOString() }),
  ai_reports: () => ({ created_at: new Date().toISOString() }),
  test_settings: () => ({ enabled: true, updated_at: new Date().toISOString() }),
};
const UNIQUE = { students: ['grade', 'class_no', 'number'], submissions: ['student_id', 'concept'], test_settings: ['concept'] };

class PgErr extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }

export function createDb({ schema = 2, maxRows = 1000 } = {}) {
  const db = { students: [], submissions: [], test_settings: [], submission_history: [], ai_reports: [] };
  const state = { db, seq: 1, schema, maxRows, log: [] };
  const cols = (t) => COLS[t].filter((c) => state.schema >= 2 || !(V2_ONLY[t] || []).includes(c));
  const checkCol = (t, c) => { if (!cols(t).includes(c)) throw new PgErr(400, '42703', `column ${t}.${c} does not exist`); };
  const insertRow = (t, row) => {
    for (const k of Object.keys(row)) if (!cols(t).includes(k)) throw new PgErr(400, 'PGRST204', `Could not find the '${k}' column of '${t}' in the schema cache`);
    const r = { ...(t === 'test_settings' ? {} : { id: state.seq++ }), ...DEFAULTS[t](), ...row };
    if (state.schema < 2) for (const c of V2_ONLY[t] || []) delete r[c];
    if (t === 'students' && !(r.class_no >= 1 && r.class_no <= 15)) throw new PgErr(400, '23514', 'new row violates check constraint "students_class_no_check"');
    const u = UNIQUE[t]; if (u && db[t].some((x) => u.every((k) => x[k] === r[k]))) throw new PgErr(409, '23505', `duplicate key value violates unique constraint (${u.join(',')})`);
    db[t].push(r); return r;
  };
  const deleteRows = (t, rows) => { for (const r of rows) { db[t].splice(db[t].indexOf(r), 1); if (t === 'students') { db.submissions = db.submissions.filter((s) => s.student_id !== r.id); db.submission_history = db.submission_history.filter((s) => s.student_id !== r.id); } } };
  // 원자적 실행: 실패하면 db를 되돌림
  const atomic = (fn) => { const snap = JSON.stringify(db), seq = state.seq; try { return fn(); } catch (e) { const back = JSON.parse(snap); for (const k of Object.keys(db)) db[k] = back[k]; state.seq = seq; throw e; } };
  const RPC = {
    eng_schema_version: () => 2,
    reissue_submissions: ({ p_ids, p_open }) => atomic(() => {
      const subs = db.submissions.filter((s) => p_ids.includes(s.id));
      for (const s of subs) insertRow('submission_history', { student_id: s.student_id, concept: s.concept, attempt: s.attempt || 1, answers: s.answers, auto: s.auto, overrides: s.overrides || {}, ai: s.ai, status: s.status, feedback: s.feedback, feedback_draft: s.feedback_draft, submitted_at: s.submitted_at, graded_at: s.graded_at });
      if (p_open) for (const concept of new Set(subs.map((s) => s.concept))) { const ex = db.test_settings.find((x) => x.concept === concept); if (ex) Object.assign(ex, { enabled: true }); else insertRow('test_settings', { concept, enabled: true }); }
      deleteRows('submissions', subs);
      return subs.length;
    }),
    roster_apply: ({ p_classes, p_archive }) => atomic(() => {
      const n = { added: 0, updated: 0, restored: 0, same: 0, archived: 0 };
      for (const c of p_classes) for (const s of c.students) {
        const ex = db.students.find((x) => x.grade === c.grade && x.class_no === c.class_no && x.number === s.number);
        const ids = Array.isArray(s.login_ids) ? s.login_ids : null;
        if (!ex) { insertRow('students', { grade: c.grade, class_no: c.class_no, number: s.number, name: s.name, login_ids: ids || [] }); n.added++; continue; }
        if (ex.archived_at) n.restored++; else if (ex.name !== s.name || (ids && ex.login_ids.join() !== ids.join())) n.updated++; else n.same++;
        Object.assign(ex, { name: s.name, login_ids: ids || ex.login_ids, archived_at: null });
      }
      if (p_archive) for (const st of db.students) if (!st.archived_at && p_classes.some((c) => c.grade === st.grade && c.class_no === st.class_no) && !p_classes.some((c) => c.grade === st.grade && c.class_no === st.class_no && c.students.some((s) => s.number === st.number))) { st.archived_at = new Date().toISOString(); n.archived++; }
      return n;
    }),
  };

  function parse(t, sp) {
    const f = []; let order = null, limit = null, offset = 0, select = null;
    for (const [k, v] of sp) {
      if (k === 'on_conflict') continue;
      if (k === 'select') { select = v; continue; }
      if (k === 'order') { order = v.split(',').map((x) => { const [c, d] = x.split('.'); checkCol(t, c); return [c, d === 'desc' ? -1 : 1]; }); continue; }
      if (k === 'limit') { limit = +v; continue; }
      if (k === 'offset') { offset = +v; continue; }
      checkCol(t, k);
      let [op, ...rest] = v.split('.'); let neg = false;
      if (op === 'not') { neg = true; op = rest.shift(); }
      const val = rest.join('.');
      f.push([k, op, op === 'in' ? val.slice(1, -1).split(',').filter((x) => x !== '') : val, neg]);
    }
    const fields = select && select !== '*' ? select.split(',') : null;
    if (fields) fields.forEach((c) => checkCol(t, c));
    return { f, order, limit, offset, fields };
  }
  const cmp = (a, b) => (a == null ? (b == null ? 0 : 1) : b == null ? -1 : typeof a === 'number' && typeof b === 'number' ? a - b : String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0);
  const test = (r, [k, op, v, neg]) => {
    const x = r[k]; let ok;
    if (op === 'eq') ok = x != null && String(x) === v;
    else if (op === 'neq') ok = x != null && String(x) !== v;
    else if (op === 'in') ok = x != null && v.includes(String(x));
    else if (op === 'is') ok = v === 'null' ? x == null : String(x) === v;
    else if (op === 'cs') ok = v.slice(1, -1).split(',').map((y) => y.replace(/"/g, '')).every((y) => (x || []).includes(y));
    else if (['gt', 'gte', 'lt', 'lte'].includes(op)) { const c = cmp(isNaN(+v) ? x : +x, isNaN(+v) ? v : +v); ok = x != null && (op === 'gt' ? c > 0 : op === 'gte' ? c >= 0 : op === 'lt' ? c < 0 : c <= 0); }
    else throw new PgErr(400, 'PGRST100', 'unknown operator ' + op);
    return neg ? !ok : ok;
  };
  const project = (rows, fields) => rows.map((r) => (fields ? Object.fromEntries(fields.map((c) => [c, r[c] ?? null])) : { ...r }));

  // PostgREST 요청 하나 처리 → { status, headers, body }
  function handle(method, pathname, search, prefer, body) {
    const u = new URLSearchParams(search);
    const parts = pathname.replace(/^\/rest\/v1\//, '').split('/');
    state.log.push(method + ' ' + parts.join('/') + (search ? '?' + search : ''));
    try {
      if (parts[0] === 'rpc') {
        const fn = RPC[parts[1]];
        if (!fn || state.schema < 2) throw new PgErr(404, 'PGRST202', `Could not find the function public.${parts[1]} in the schema cache`);
        return { status: 200, body: fn(body || {}) };
      }
      const t = parts[0]; if (!db[t]) throw new PgErr(404, '42P01', `relation "public.${t}" does not exist`);
      const { f, order, limit, offset, fields } = parse(t, u);
      const rep = /return=representation/.test(prefer || ''), minimal = /return=minimal/.test(prefer || '');
      let out = [];
      if (method === 'GET') {
        out = db[t].filter((r) => f.every((x) => test(r, x)));
        if (order) out.sort((a, b) => { for (const [c, d] of order) { const v = cmp(a[c], b[c]) * d; if (v) return v; } return 0; });
        const total = out.length;
        const lim = Math.min(limit ?? Infinity, state.maxRows);
        out = out.slice(offset, offset + lim);
        const headers = { 'content-range': `${out.length ? `${offset}-${offset + out.length - 1}` : '*'}/${/count=exact/.test(prefer || '') ? total : '*'}` };
        return { status: 200, headers, body: project(out, fields) };
      }
      if (method === 'POST') {
        const keys = u.get('on_conflict') ? u.get('on_conflict').split(',') : null;
        out = atomic(() => (Array.isArray(body) ? body : [body]).map((row) => {
          const ex = keys && db[t].find((r) => keys.every((k) => r[k] === row[k]));
          if (ex && /merge-duplicates/.test(prefer || '')) { for (const k of Object.keys(row)) checkCol(t, k); const old = ex.rev; Object.assign(ex, row); if (t === 'submissions' && state.schema >= 2) ex.rev = (old || 0) + 1; return ex; }
          return insertRow(t, row);
        }));
        return minimal ? { status: 201 } : { status: 201, body: project(out, fields) };
      }
      if (method === 'PATCH') {
        for (const k of Object.keys(body || {})) if (!cols(t).includes(k)) throw new PgErr(400, 'PGRST204', `Could not find the '${k}' column of '${t}' in the schema cache`);
        out = db[t].filter((r) => f.every((x) => test(r, x)));
        out.forEach((r) => { const old = r.rev; Object.assign(r, JSON.parse(JSON.stringify(body))); if (t === 'submissions' && state.schema >= 2) r.rev = (old || 0) + 1; });   // DB 트리거 흉내
        return rep ? { status: 200, body: project(out, fields) } : { status: 204 };
      }
      if (method === 'DELETE') {
        out = db[t].filter((r) => f.every((x) => test(r, x)));
        const copy = project(out, fields); deleteRows(t, out);
        return rep ? { status: 200, body: copy } : { status: 204 };
      }
      throw new PgErr(405, 'PGRST000', 'method');
    } catch (e) {
      if (!(e instanceof PgErr)) throw e;
      return { status: e.status, body: { code: e.code, message: e.message } };
    }
  }
  // worker의 fetch를 대신하는 함수 (네트워크 없이)
  const fetchLike = async (url, opt = {}) => {
    const u = new URL(url);
    const r = handle(opt.method || 'GET', u.pathname, u.search.slice(1), (opt.headers || {}).prefer, opt.body ? JSON.parse(opt.body) : null);
    return new Response(r.body === undefined ? null : JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json', ...(r.headers || {}) } });
  };
  return { ...state, state, handle, fetchLike, RPC };
}

// HTTP 서버로 띄우기 (serve.mjs)
export function listenDb(mock, port, host = '127.0.0.1') {
  return http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    let b = ''; for await (const c of req) b += c;
    const r = mock.handle(req.method, u.pathname, u.search.slice(1), req.headers.prefer, b ? JSON.parse(b) : null);
    res.writeHead(r.status, { 'content-type': 'application/json', ...(r.headers || {}) });
    res.end(r.body === undefined ? '' : JSON.stringify(r.body));
  }).listen(port, host);
}

// 가짜 명렬표·답 (실명 아님)
export function seed(mock, { classes = 2, per = 6 } = {}) {
  const { db } = mock.state;
  for (let c = 1; c <= classes; c++) for (let n = 1; n <= per; n++) {
    db.students.push({ id: mock.state.seq++, grade: 4, class_no: c, number: n, name: `가짜${c}반${n}`, login_ids: [`fake${c}${String(n).padStart(2, '0')}`], created_at: new Date().toISOString(), archived_at: null });
  }
}
