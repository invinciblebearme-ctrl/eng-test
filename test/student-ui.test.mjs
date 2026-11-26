import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../public/student.html', import.meta.url), 'utf8');
const scriptMatch = html.match(/<script>\s*([\s\S]*?)<\/script>\s*<\/body>/);
assert.ok(scriptMatch, 'student.html inline script not found');
const STUDENT_SCRIPT = scriptMatch[1].replace(/\nstart\(\);\s*$/, '\n');

function createEl(id = '') {
  return {
    id,
    _innerHTML: '',
    textContent: '',
    hidden: false,
    disabled: false,
    value: '',
    dataset: {},
    style: {},
    attrs: {},
    classList: {
      _set: new Set(),
      add(...c) { c.forEach((x) => this._set.add(x)); },
      remove(...c) { c.forEach((x) => this._set.delete(x)); },
      toggle(c, on) { if (on) this._set.add(c); else this._set.delete(c); },
      contains(c) { return this._set.has(c); },
    },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k] ?? null; },
    querySelector() { return createEl(); },
    querySelectorAll() { return []; },
    insertAdjacentHTML() {},
    appendChild() {},
    remove() {},
    focus() {},
    scrollIntoView() {},
    set innerHTML(v) { this._innerHTML = String(v); },
    get innerHTML() { return this._innerHTML; },
  };
}

function bootEnv(apiImpl) {
  const appEl = createEl('app');
  const allEl = createEl('all');
  const els = new Map([
    ['#app', appEl],
    ['#all', allEl],
    ['#ttl', createEl('ttl')],
    ['#who', createEl('who')],
    ['#out', createEl('out')],
    ['#sum', createEl('sum')],
    ['#qarea', createEl('qarea')],
    ['#back', createEl('back')],
    ['#prt', createEl('prt')],
  ]);
  const storage = new Map();
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
    localStorage: {
      get length() { return storage.size; },
      key(i) { return [...storage.keys()][i] ?? null; },
      getItem: (k) => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(String(k), String(v)),
      removeItem: (k) => storage.delete(String(k)),
    },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    location: { pathname: '/', search: '', origin: 'http://127.0.0.1:8787' },
    history: { replaceState() {} },
    navigator: { userAgent: 'Mozilla/5.0' },
    scrollTo() {},
    confirm: () => true,
    alert: () => {},
    document: {
      title: '',
      activeElement: null,
      body: createEl('body'),
      createElement: () => createEl(),
      addEventListener() {},
      removeEventListener() {},
    },
    $: (sel) => els.get(sel) || createEl(sel),
    esc: (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    ico: () => '',
    optLabel: (o) => String(o ?? ''),
    fillSummary: (h) => String(h ?? ''),
    bindSpeak() {},
    mediaHTML: () => '',
    resultHeadHTML: () => '',
    resultItemsHTML: () => '',
    teacherNoteHTML: () => '',
    studentReportHTML: (_me, parts) => `<div class="report">COUNT:${parts.length}</div>`,
    printOnly() {},
    speak() {},
    toast() {},
    MEDIA_TOKEN: '',
    api: apiImpl || (async () => ({})),
  };
  vm.createContext(ctx);
  vm.runInContext(STUDENT_SCRIPT, ctx);
  return { ctx, appEl, allEl };
}

test('복수 입력 문항(spellmean, multi, spell, order) 및 공백 답안 완성도 검사', () => {
  const { ctx } = bootEnv();
  const qs = [
    { t: 'spellmean', q: '1' },
    { t: 'multi', q: '2', blanks: 2 },
    { t: 'spell', q: '3', pat: 'c __ __' },
    { t: 'order', q: '4', words: ['It', 'is', 'red'] },
    { t: 'text', q: '5' },
  ];

  // 모두 미응답 / 공백만 입력
  const rEmpty = ctx.inspectAnswers(qs, [['', ''], [' ', ''], ['', ''], [], '   ']);
  assert.deepEqual([...rEmpty.empty], [0, 1, 2, 3, 4]);
  assert.deepEqual([...rEmpty.partial], []);
  assert.equal(rEmpty.completeCount, 0);

  // 부분 응답
  const rPart = ctx.inspectAnswers(qs, [['cat', ''], ['a', ''], ['a', ''], ['It', 'is'], 'ok']);
  assert.deepEqual([...rPart.empty], []);
  assert.deepEqual([...rPart.partial], [0, 1, 2, 3]);
  assert.equal(rPart.completeCount, 1);

  // 모두 완성
  const rDone = ctx.inspectAnswers(qs, [['cat', '고양이'], ['a', 'b'], ['a', 't'], ['It', 'is', 'red'], 'ok']);
  assert.deepEqual([...rDone.empty], []);
  assert.deepEqual([...rDone.partial], []);
  assert.equal(rDone.completeCount, 5);
});

test('홈 진행률은 열린 시험만 분모로 계산하고 닫힌 제출은 별도 표기한다', () => {
  const { ctx, appEl } = bootEnv();
  vm.runInContext(`
    ME = { id: 1, grade: 4, class_no: 1, number: 1, name: '김하늘' };
    CONCEPTS = [
      { id: 1, kind: 'concept', unit: '1단원', title: '열린1', open: true, questionCount: 10 },
      { id: 2, kind: 'concept', unit: '1단원', title: '열린2', open: true, questionCount: 10 },
      { id: 3, kind: 'word', unit: '1단원', ukey: 'u1', title: '닫힌제출', open: false, questionCount: 10 },
      { id: 4, kind: 'exam', unit: '1단원', ukey: 'u1', title: '닫힌미제출', open: false, questionCount: 10 }
    ];
    UNITS = [{ key: 'u1', name: '1단원', title: '1단원' }];
    SUBS = { 1: { status: 'graded', score: 9 }, 3: { status: 'submitted' } };
  `, ctx);
  ctx.home();
  assert.ok(appEl.innerHTML.includes('열린 시험 제출 1 / 2'));
  assert.ok(appEl.innerHTML.includes('닫힌 시험 제출 1건'));
  assert.ok(appEl.innerHTML.includes('role="progressbar"'));
  assert.ok(appEl.innerHTML.includes('aria-valuenow="1"'));
  assert.ok(appEl.innerHTML.includes('aria-valuemax="2"'));
});

test('화면을 떠난 뒤 도착한 늦은 API 응답이 현재 화면을 덮어쓰지 않는다 (async race 방지)', async () => {
  let resolveSlow;
  const { ctx, appEl } = bootEnv(async (path) => {
    if (path.startsWith('/api/concept?')) {
      return new Promise((r) => { resolveSlow = r; });
    }
    return {};
  });
  vm.runInContext(`
    ME = { id: 1, grade: 4, class_no: 1, number: 1, name: '김하늘' };
    CONCEPTS = [{ id: 10, kind: 'word', unit: '1단원', ukey: 'u1', title: '단어시험', open: true, questionCount: 5 }];
    UNITS = [{ key: 'u1', name: '1단원', title: '1단원' }];
    SUBS = {};
  `, ctx);

  const p = ctx.concept(10);
  // 응답 오기 전에 홈으로 이동
  ctx.home();
  const homeHtml = appEl.innerHTML;
  assert.ok(homeHtml.includes('김하늘, 오늘도 화이팅!'));

  // 늦은 응답 도착
  resolveSlow({ concept: { id: 10, kind: 'word', title: '단어시험', lead: '', open: true, questions: [] } });
  await p;
  assert.equal(appEl.innerHTML, homeHtml);
});

test('allResults()는 /api/submissions 배치 응답(items)을 우선 사용한다', async () => {
  const calls = [];
  const { ctx, allEl } = bootEnv(async (path) => {
    calls.push(path);
    if (path === '/api/submissions') {
      return {
        items: [
          { concept: { id: 1, kind: 'concept', title: '개념1', questions: [{ t: 'text', q: 'q' }] }, submission: { status: 'graded', score: 1, marks: [true], answers: ['a'], correct: ['a'] } },
          { concept: { id: 2, kind: 'concept', title: '개념2', questions: [{ t: 'text', q: 'q' }] }, submission: { status: 'graded', score: 1, marks: [true], answers: ['b'], correct: ['b'] } },
        ],
      };
    }
    return {};
  });
  vm.runInContext(`
    ME = { id: 1, grade: 4, class_no: 1, number: 1, name: '김하늘' };
    CONCEPTS = [
      { id: 1, kind: 'concept', title: '개념1', questionCount: 1 },
      { id: 2, kind: 'concept', title: '개념2', questionCount: 1 }
    ];
    SUBS = { 1: { status: 'graded', score: 1 }, 2: { status: 'graded', score: 1 } };
  `, ctx);

  await ctx.allResults();
  assert.deepEqual(calls, ['/api/submissions']);
  assert.equal(allEl.innerHTML, '<div class="report">COUNT:2</div>');
});

test('로그인 폼에 label for 연결과 접근성 속성이 포함된다', () => {
  const { ctx, appEl } = bootEnv();
  ctx.login();
  assert.ok(appEl.innerHTML.includes('for="nm"'));
  assert.ok(appEl.innerHTML.includes('for="sid"'));
  assert.ok(appEl.innerHTML.includes('role="alert"'));
});

test('openAccessibleModal은 trapModal이 있으면 label과 함께 위임하고 닫기 시 release를 호출한다', () => {
  const { ctx } = bootEnv();
  let trapArgs = null;
  let released = false;
  ctx.trapModal = (el, opts) => {
    trapArgs = { el, opts };
    return { release() { released = true; } };
  };
  const modal = ctx.openAccessibleModal({ id: 'm1', label: '테스트 모달', html: '<div class="box"><button id="ok">확인</button></div>' });
  assert.ok(trapArgs);
  assert.equal(trapArgs.opts.label, '테스트 모달');
  modal.close(true);
  assert.equal(released, true);
});
