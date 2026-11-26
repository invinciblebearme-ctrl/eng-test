import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../public/student.html', import.meta.url), 'utf8');
const scriptMatch = html.match(/<script>\s*([\s\S]*?)<\/script>\s*<\/body>/);
assert.ok(scriptMatch, 'student.html inline script not found');
const STUDENT_SCRIPT = scriptMatch[1].replace(/\nstart\(\);\s*$/, '\n');

function createStorage(opts = {}) {
  const map = new Map();
  return {
    get length() { return map.size; },
    key(i) { return [...map.keys()][i] ?? null; },
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) {
      if (opts.throwOnSet) throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      map.set(String(k), String(v));
    },
    removeItem(k) { map.delete(String(k)); },
    _dump() { return Object.fromEntries(map); },
  };
}

function createFakeEl(id = '') {
  const el = {
    id,
    _innerHTML: '',
    textContent: '',
    hidden: false,
    disabled: false,
    value: '',
    dataset: {},
    style: {},
    attrs: {},
    _children: new Map(),
    onclick: null,
    oninput: null,
    onchange: null,
    classList: {
      _set: new Set(),
      add(...c) { c.forEach((x) => this._set.add(x)); },
      remove(...c) { c.forEach((x) => this._set.delete(x)); },
      toggle(c, on) { if (on) this._set.add(c); else this._set.delete(c); },
      contains(c) { return this._set.has(c); },
    },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k] ?? null; },
    querySelector(sel) {
      if (!this._children.has(sel)) this._children.set(sel, createFakeEl(sel));
      return this._children.get(sel);
    },
    querySelectorAll() { return []; },
    insertAdjacentHTML() {},
    appendChild() {},
    remove() {},
    focus() {},
    scrollIntoView() {},
    set innerHTML(v) { this._innerHTML = String(v); },
    get innerHTML() { return this._innerHTML; },
  };
  return el;
}

function bootStudentEnv({ storageOpts = {}, apiImpl, confirmImpl } = {}) {
  const localStorage = createStorage(storageOpts);
  const appEl = createFakeEl('app');
  const els = new Map([
    ['#app', appEl],
    ['#ttl', createFakeEl('ttl')],
    ['#who', createFakeEl('who')],
    ['#out', createFakeEl('out')],
    ['#sum', createFakeEl('sum')],
    ['#qarea', createFakeEl('qarea')],
    ['#draftBar', createFakeEl('draftBar')],
    ['#sub', createFakeEl('sub')],
    ['#back', createFakeEl('back')],
    ['#go', createFakeEl('go')],
  ]);
  const modals = [];
  const winListeners = {};
  const toasts = [];
  const bodyEl = createFakeEl('body');
  bodyEl.appendChild = (m) => modals.push(m);
  const ctx = {
    console,
    Math,
    Date,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Set,
    Map,
    Promise,
    Error,
    DOMException,
    URL,
    URLSearchParams,
    structuredClone,
    setTimeout,
    clearTimeout,
    localStorage,
    sessionStorage: createStorage(),
    location: { pathname: '/', search: '', origin: 'http://127.0.0.1:8787' },
    history: { replaceState() {} },
    navigator: { userAgent: 'Mozilla/5.0' },
    window: {
      addEventListener(ev, fn) { (winListeners[ev] = winListeners[ev] || []).push(fn); },
    },
    scrollTo() {},
    confirm: confirmImpl || (() => true),
    alert: () => {},
    document: {
      title: '',
      activeElement: null,
      body: bodyEl,
      createElement: () => createFakeEl(),
      addEventListener() {},
      removeEventListener() {},
    },
    $: (sel) => {
      if (!els.has(sel)) els.set(sel, createFakeEl(sel));
      return els.get(sel);
    },
    esc: (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    optLabel: (o) => String(o ?? ''),
    fillSummary: (h) => String(h ?? ''),
    bindSpeak() {},
    mediaHTML: () => '',
    resultHeadHTML: () => '',
    resultItemsHTML: () => '',
    teacherNoteHTML: () => '',
    studentReportHTML: () => '<div>REPORT</div>',
    printOnly() {},
    speak() {},
    toast: (m) => toasts.push(m),
    MEDIA_TOKEN: '',
    api: apiImpl || (async () => ({})),
  };
  vm.createContext(ctx);
  vm.runInContext(STUDENT_SCRIPT, ctx);
  return { ctx, localStorage, appEl, toasts, els, modals, winListeners };
}

test('학생 ID · 시험 ID · 응시 차수별로 임시저장 키가 분리된다', () => {
  const { ctx } = bootStudentEnv();
  const c1 = { id: 1, contentVersion: 'v1', questions: [{ t: 'text', q: 'hi' }] };
  const c2 = { id: 2, contentVersion: 'v1', questions: [{ t: 'text', q: 'bye' }] };

  const s1 = ctx.saveDraft(101, c1, 1, ['hello']);
  const s2 = ctx.saveDraft(102, c1, 1, ['world']);
  const s3 = ctx.saveDraft(101, c1, 2, ['second']);
  const s4 = ctx.saveDraft(101, c2, 1, ['other']);

  assert.equal(s1.ok, true);
  assert.notEqual(s1.key, s2.key);
  assert.notEqual(s1.key, s3.key);
  assert.notEqual(s1.key, s4.key);

  assert.deepEqual(ctx.loadDraft(101, c1, 1).draft.answers, ['hello']);
  assert.deepEqual(ctx.loadDraft(102, c1, 1).draft.answers, ['world']);
  assert.deepEqual(ctx.loadDraft(101, c1, 2).draft.answers, ['second']);
  assert.equal(ctx.loadDraft(101, c1, 3).status, 'none');
});

test('문항 구조 또는 contentVersion이 바뀌면 이전 임시저장을 복구하지 않는다', () => {
  const { ctx } = bootStudentEnv();
  const cOrig = { id: 5, contentVersion: 'v1', questions: [{ t: 'text', q: 'one' }, { t: 'choice', q: 'two', opts: ['a', 'b'] }] };
  ctx.saveDraft(10, cOrig, 1, ['ans1', 'a']);

  const cChangedQ = { id: 5, contentVersion: 'v1', questions: [{ t: 'text', q: 'one-edited' }, { t: 'choice', q: 'two', opts: ['a', 'b'] }] };
  assert.equal(ctx.loadDraft(10, cChangedQ, 1).status, 'version-mismatch');

  const cChangedVer = { id: 5, contentVersion: 'v2', questions: cOrig.questions };
  assert.equal(ctx.loadDraft(10, cChangedVer, 1).status, 'version-mismatch');
});

test('localStorage 저장 실패 시 ok:false를 반환하고 거짓 성공 표시를 하지 않는다', () => {
  const { ctx } = bootStudentEnv({ storageOpts: { throwOnSet: true } });
  const c = { id: 3, questions: [{ t: 'text', q: 'q1' }] };
  const res = ctx.saveDraft(1, c, 1, ['abc']);
  assert.equal(res.ok, false);
});

test('로그아웃 시 해당 학생의 임시저장만 삭제되고 다른 학생의 초안은 유지된다', () => {
  const { ctx, localStorage } = bootStudentEnv();
  const c = { id: 7, questions: [{ t: 'text', q: 'q' }] };
  ctx.saveDraft(11, c, 1, ['mine']);
  ctx.saveDraft(22, c, 1, ['theirs']);

  vm.runInContext('ME = { id: 11, grade: 4, class_no: 1, number: 1, name: "김" }; TOKEN = "tok";', ctx);
  ctx.logout(true);

  assert.equal(ctx.loadDraft(11, c, 1).status, 'none');
  assert.equal(ctx.loadDraft(22, c, 1).status, 'ok');
  assert.deepEqual(ctx.loadDraft(22, c, 1).draft.answers, ['theirs']);
  assert.equal(localStorage.getItem('eng4-student-token'), null);
});

test('제출 성공 후 loadMe()가 실패해도 초안이 제거되고 제출 완료 상태가 유지된다 (실제 quiz/submit 핸들러 호출)', async () => {
  let meCalls = 0;
  let submitCalls = 0;
  const conceptObj = { id: 9, kind: 'word', unit: 'U1', title: '단어', lead: '', locked: true, open: true, questions: [{ t: 'text', q: 'q1' }] };
  const { ctx, toasts, els, modals } = bootStudentEnv({
    apiImpl: async (path) => {
      if (path === '/api/submit') { submitCalls++; return { ok: true }; }
      if (path === '/api/me') {
        meCalls++;
        throw new Error('네트워크 일시 오류');
      }
      if (path.startsWith('/api/concept')) return { concept: conceptObj };
      return {};
    },
  });

  vm.runInContext('ME = { id: 33, grade: 4, class_no: 1, number: 3, name: "박" }; TOKEN = "t"; RETAKE = {}; SUBS = {};', ctx);
  vm.runInContext(`CONCEPTS = [${JSON.stringify(conceptObj)}];`, ctx);
  ctx.saveDraft(33, conceptObj, 1, ['apple']);

  ctx.quiz(conceptObj, null, vm.runInContext('VIEW_SEQ', ctx));
  // 실제 제출 버튼 클릭 -> 검토 모달 열림 -> #rvSend 클릭 -> doSubmit() 실행
  els.get('#sub').onclick();
  assert.equal(modals.length, 1);
  await modals[0].querySelector('#rvSend').onclick();

  assert.equal(submitCalls, 1);
  assert.equal(meCalls, 1);
  assert.equal(ctx.loadDraft(33, conceptObj, 1).status, 'none');
  assert.equal(vm.runInContext('SUBS[9].status', ctx), 'submitted');
  assert.ok(toasts.some((t) => t.includes('제출은 완료됐어요')));
});

test('loadConceptDetail 캐시는 최신 목록의 open 상태를 덮어쓰지 않는다', async () => {
  const { ctx } = bootStudentEnv();
  vm.runInContext(`
    DETAIL_CACHE[5] = { id: 5, kind: 'word', title: '단어', open: true, contentVersion: 'v1', questions: [{ t: 'text', q: 'q' }] };
    CONCEPTS = [{ id: 5, kind: 'word', title: '단어', open: false, contentVersion: 'v1', questionCount: 1 }];
  `, ctx);
  const c = await ctx.loadConceptDetail(5);
  assert.equal(c.open, false);
  assert.equal(c.questions.length, 1);
});

test('임시저장 실패 상태에서는 beforeunload와 목록 이동 시 경고가 동작한다', async () => {
  let confirmMsg = '';
  const { ctx, els, winListeners } = bootStudentEnv({
    storageOpts: { throwOnSet: true },
    confirmImpl: (msg) => { confirmMsg = msg; return false; },
  });
  const c = { id: 4, kind: 'concept', unit: '1단원', title: '개념4', lead: '', open: true, questions: [{ t: 'text', q: 'q' }] };
  vm.runInContext('ME = { id: 1, grade: 4, class_no: 1, number: 1, name: "김" }; SUBS = {}; RETAKE = {};', ctx);
  vm.runInContext(`CONCEPTS = [${JSON.stringify(c)}];`, ctx);

  await ctx.concept(4);
  ctx.quiz(c, null, vm.runInContext('VIEW_SEQ', ctx));
  // 첫 문항 입력 시뮬레이션 -> saveDraft 실패 -> setDraftSaveFailed(true)
  const q0Input = els.get('#qarea').querySelector('#q0 .ans').querySelector('input');
  q0Input.oninput({ target: { value: 'hello' } });

  assert.equal(vm.runInContext('DRAFT_SAVE_FAILED', ctx), true);
  let prevented = false;
  const ev = { preventDefault() { prevented = true; }, returnValue: '' };
  winListeners.beforeunload.forEach((fn) => fn(ev));
  assert.equal(prevented, true);

  els.get('#back').onclick();
  assert.ok(confirmMsg.includes('임시저장이 되지 않았어요'));
});
