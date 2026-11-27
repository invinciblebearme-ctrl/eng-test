const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- 커스텀 SVG 아이콘 세트 (5종 테마 currentColor 자동 연동) ----------
const ICONS = {
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/>',
  word: '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.3 2.3 4.7-5.1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.7"/>',
  sound: '<path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 6a8.5 8.5 0 0 1 0 12"/>',
  print: '<path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7" rx="1"/>',
  retry: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M19 3v3"/><path d="M17.5 4.5h3"/>',
  chart: '<path d="M3 3v18h18"/><path d="M8 17v-5"/><path d="M13 17V9"/><path d="M18 17v-8"/>',
  board: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 2h6v4H9z"/><path d="M9 11h6"/><path d="M9 15h4"/>',
  palette: '<path d="M12 22a10 10 0 1 1 10-10c0 2.2-1.8 3.5-3.5 3.5H16a2 2 0 0 0-2 2c0 1.4.8 2.5.8 3.2 0 .8-.7 1.3-2.8 1.3z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="11" cy="7.5" r="1"/><circle cx="15.5" cy="8.5" r="1"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3z"/>',
  eye: '<path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M17.9 17.9A10.9 10.9 0 0 1 12 19c-6.2 0-10-7-10-7a18.5 18.5 0 0 1 5.1-5.9"/><path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c6.2 0 10 7 10 7a18.5 18.5 0 0 1-2.2 3.2"/><path d="M3 3l18 18"/>',
  send: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/>',
  warn: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z"/>',
  megaphone: '<path d="m3 11 16-5v12L3 13v-2z"/><path d="M11 15v4a2 2 0 0 1-2 2H8l-1-6"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  play: '<polygon points="6 4 20 12 6 20 6 4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M12 18h.01"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  x: '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
};
function ico(name, size = 16) {
  const p = ICONS[name] || '';
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}

async function api(path, body, token) {
  if (token) LAST_TOKEN = token;
  const opt = { method: body ? 'POST' : 'GET', headers: {} };
  if (body) { opt.headers['content-type'] = 'application/json'; opt.body = JSON.stringify(body); }
  if (token) opt.headers.authorization = 'Bearer ' + token;
  const r = await fetch(path, opt);
  let d = null; try { d = await r.json(); } catch {}
  if (!r.ok) { const e = new Error((d && d.error) || ('오류 ' + r.status)); e.status = r.status; e.data = d || {}; throw e; }
  return d;
}

// ---------- 화면 오류를 서버에 알리기 (로그인한 뒤에만, 한 페이지에 5건까지) ----------
// API 오류(서버가 이미 기록)와 확장 프로그램 오류는 빼고, 이 사이트 스크립트의 오류만
let LAST_TOKEN = '';
const CLIENT_ERR_SENT = { n: 0, keys: new Set() };
function reportClientError(message, where) {
  try {
    const msg = String(message || '').slice(0, 300), key = msg.slice(0, 80) + '|' + where;
    if (!LAST_TOKEN || !msg || CLIENT_ERR_SENT.n >= 5 || CLIENT_ERR_SENT.keys.has(key)) return;
    CLIENT_ERR_SENT.n++; CLIENT_ERR_SENT.keys.add(key);
    fetch('/api/client-error', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + LAST_TOKEN }, body: JSON.stringify({ message: msg, where: String(where || '').slice(0, 120) }) }).catch(() => {});
  } catch {}
}
if (typeof addEventListener === 'function') {
  addEventListener('error', (e) => {
    const f = String(e.filename || '');
    if (f && typeof location !== 'undefined' && !f.startsWith(location.origin)) return;   // 다른 사이트·확장 프로그램
    reportClientError(e.message, `${location.pathname} ${f.split('/').pop()}:${e.lineno || 0}`);
  });
  addEventListener('unhandledrejection', (e) => { const r = e.reason; if (r && r.status) return; reportClientError((r && r.message) || r, location.pathname + ' (promise)'); });
}

// ---------- 알림·상태 (화면 읽기 프로그램도 읽어 줌) ----------
// toast(글, 종류) 종류: 'ok' | 'error' | 'info'(기본). error는 조금 더 오래 보이고 role=alert
function toast(msg, kind = 'info') {
  let box = document.getElementById('toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
  const t = document.createElement('div'); t.className = 'toast' + (kind && kind !== 'info' ? ' ' + kind : ''); t.textContent = msg;
  if (kind === 'error') t.setAttribute('role', 'alert');
  box.appendChild(t); setTimeout(() => t.remove(), kind === 'error' ? 5000 : 2200);
}
// 칸 옆 상태 글: statusMsg(el, '저장 중…', 'saving' | 'saved' | 'error' | 'info'). 글이 없으면 지움
function statusMsg(el, text, kind = 'info') {
  if (!el) return;
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status'); el.setAttribute('aria-live', kind === 'error' ? 'assertive' : 'polite');
  el.className = (el.className.replace(/\bst(-\w+)?\b/g, '').trim() + (text ? ` st st-${kind}` : '')).trim();
  el.textContent = text || '';
}

// ---------- 저장 줄 세우기: 한 대상(카드·행)의 저장 요청을 차례로 하나씩 ----------
// q = saveQueue(send(patch) → Promise, onChange(q)).  q.stage(patch, 지연ms) 로 변경을 쌓고, q.flush()로 바로 보냄.
// 보내는 동안 쌓인 변경은 같은 펌프가 이어서 보냄(재귀·자기 기다림 없음). 실패하면 변경을 보존하고 state='error'.
// 409(다른 곳에서 바뀜)면 conflict=true가 되어 더 보내지 않음 → 새로 불러와야 함.
// q.state: 'saved' | 'dirty'(쌓임) | 'saving' | 'error'.  q.done: 지금 펌프가 끝나면 풀리는 Promise
function saveQueue(send, onChange = () => {}) {
  const q = {
    pending: null, state: 'saved', err: '', conflict: false, timer: null, touched: false, running: false, done: Promise.resolve(),
    stage(patch, delay = 0) {
      q.pending = { ...(q.pending || {}), ...patch }; q.touched = true;
      if (!q.running && q.state !== 'error') q.state = 'dirty';
      clearTimeout(q.timer); q.timer = null;
      if (delay) { q.timer = setTimeout(() => q.flush(), delay); onChange(q); return q.done; }
      return q.flush();
    },
    flush() {
      clearTimeout(q.timer); q.timer = null;
      if (q.running || q.conflict || !q.pending) return q.done;   // 돌고 있는 펌프가 남은 것까지 보냄
      q.running = true;
      q.done = (async () => {
        try {
          while (q.pending && !q.conflict) {
            const patch = q.pending; q.pending = null; q.state = 'saving'; onChange(q);
            try { await send(patch); q.err = ''; }
            catch (e) { q.pending = { ...patch, ...(q.pending || {}) }; q.state = 'error'; q.err = e.message || String(e); q.conflict = e.status === 409; return; }
            q.state = q.pending ? 'saving' : 'saved';
          }
        } finally { q.running = false; onChange(q); }
      })();
      return q.done;
    },
    reset() { clearTimeout(q.timer); Object.assign(q, { pending: null, state: 'saved', err: '', conflict: false, timer: null }); onChange(q); },
  };
  return q;
}

// ---------- 창(모달) 접근성: role=dialog, 초점 가두기, Esc·배경 눌러 닫기, 닫으면 초점 되돌리기 ----------
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),audio[controls]';
// 다시 그린 뒤 같은 칸·버튼으로 초점을 돌려놓기: key = focusKey(el) → 그린 뒤 restoreFocus(root, key)
function focusKey(el) {
  if (!el || el === document.body || !el.tagName) return null;
  if (el.id) return { sel: '#' + CSS.escape(el.id), s: el.selectionStart, e: el.selectionEnd };
  const ds = Object.entries(el.dataset || {}); if (!ds.length) return null;
  const own = el.tagName.toLowerCase() + ds.map(([k, v]) => `[data-${k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}="${CSS.escape(v)}"]`).join('');
  const card = el.parentElement && el.parentElement.closest('[data-id],[data-k]');
  const pre = card ? (card.dataset.id != null ? `[data-id="${CSS.escape(card.dataset.id)}"] ` : `[data-k="${CSS.escape(card.dataset.k)}"] `) : '';
  return { sel: pre + own, s: el.selectionStart, e: el.selectionEnd };
}
function restoreFocus(root, key) {
  if (!key || !root) return false;
  let el = null; try { el = root.querySelector(key.sel); } catch {}
  if (!el) return false;
  el.focus({ preventScroll: true });
  if (key.s != null && typeof el.setSelectionRange === 'function') try { el.setSelectionRange(key.s, key.e); } catch {}
  return true;
}
// 이미 그려진 창(container 안의 .modal > .box)에 접근성을 입힘. 안의 내용을 다시 그려도 유지됨.
// opts: { label, onClose(), canClose() → false면 안 닫음 }. 돌려줌: { release(), tryClose() }
function trapModal(container, opts = {}) {
  const prev = document.activeElement;
  const box = () => container.querySelector('.modal .box') || container.querySelector('.box');
  const dress = () => {
    const b = box(); if (!b) return;
    b.setAttribute('role', 'dialog'); b.setAttribute('aria-modal', 'true'); if (!b.hasAttribute('tabindex')) b.setAttribute('tabindex', '-1');
    if (opts.label) b.setAttribute('aria-label', opts.label);
    if (!b.contains(document.activeElement) && !restoreFocus(b, last)) { const f = b.querySelector('[autofocus]') || b.querySelector(FOCUSABLE); (f || b).focus({ preventScroll: true }); }
  };
  let last = null;
  const onFocus = (e) => { last = focusKey(e.target) || last; };
  const tryClose = () => { if (opts.canClose && opts.canClose() === false) return false; if (opts.onClose) opts.onClose(); return true; };
  const onKey = (e) => {
    const b = box(); if (!b) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); tryClose(); return; }
    if (e.key !== 'Tab') return;
    const fs = [...b.querySelectorAll(FOCUSABLE)].filter((x) => x.offsetParent !== null || x === document.activeElement);
    if (!fs.length) { e.preventDefault(); b.focus(); return; }
    const first = fs[0], last = fs[fs.length - 1];
    if (!b.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  const onClick = (e) => { if (e.target.classList && e.target.classList.contains('modal')) tryClose(); };
  const mo = new MutationObserver(dress);
  document.addEventListener('keydown', onKey, true); container.addEventListener('click', onClick); container.addEventListener('focusin', onFocus);
  mo.observe(container, { childList: true, subtree: true });
  dress();
  return {
    tryClose,
    release() {
      document.removeEventListener('keydown', onKey, true); container.removeEventListener('click', onClick); container.removeEventListener('focusin', onFocus); mo.disconnect();
      if (prev && prev.isConnected && typeof prev.focus === 'function') prev.focus({ preventScroll: true });
    },
  };
}
// 새 창 열기: openModal(html, { label, onClose, canClose, container }) → { el, box, close(), tryClose(), update(html) }
// close()는 확인 없이 닫음, tryClose()는 canClose를 물어봄. Esc·배경 클릭은 tryClose.
function openModal(html, opts = {}) {
  let el = opts.container || document.getElementById('modal');
  if (!el) { el = document.createElement('div'); el.id = 'modal'; document.body.appendChild(el); }
  if (el._modal) el._modal.close(true);
  el.innerHTML = `<div class="modal"><div class="box">${html}</div></div>`;
  let closed = false;
  const api = {
    el, get box() { return el.querySelector('.modal .box'); },
    update(h) { const b = el.querySelector('.modal .box'); if (b) b.innerHTML = h; },
    close(silent) { if (closed) return; closed = true; t.release(); el._modal = null; el.innerHTML = ''; if (!silent && opts.onClose) opts.onClose(); },
    tryClose() { return t.tryClose(); },
  };
  const t = trapModal(el, { label: opts.label, canClose: opts.canClose, onClose: () => api.close() });
  el._modal = api;
  return api;
}

// 머리줄 높이 → CSS 변수 --header-h (붙박이 줄들이 머리줄 아래에 붙도록)
(() => {
  const set = () => { const h = document.querySelector('header.top'); if (h) document.documentElement.style.setProperty('--header-h', h.offsetHeight + 'px'); };
  if (typeof ResizeObserver !== 'undefined') addEventListener('DOMContentLoaded', () => { const h = document.querySelector('header.top'); if (h) new ResizeObserver(set).observe(h); set(); });
  else addEventListener('load', set);
})();

// 🔊 영어 읽어 주기 (브라우저 내장 음성)
let enVoice = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices().filter((v) => /^en[-_]/i.test(v.lang));
  enVoice = vs.find((v) => /en[-_]US/i.test(v.lang) && /google|samantha|aria|jenny|natural/i.test(v.name)) || vs.find((v) => /en[-_]US/i.test(v.lang)) || vs[0] || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(text) {
  if (!('speechSynthesis' in window)) { toast('이 기기에서는 소리를 낼 수 없어요'); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text).replace(/[’]/g, "'"));
  u.lang = 'en-US'; u.rate = 0.8; if (enVoice) u.voice = enVoice;
  speechSynthesis.speak(u);
}

// 바늘 시계 그림
function clockSVG(h, m, size = 150) {
  const cx = 100, cy = 100;
  let ticks = '';
  for (let i = 0; i < 60; i++) {
    const a = (i * 6 - 90) * Math.PI / 180, big = i % 5 === 0;
    const r1 = big ? 72 : 78, r2 = 84;
    ticks += `<line x1="${cx + r1 * Math.cos(a)}" y1="${cy + r1 * Math.sin(a)}" x2="${cx + r2 * Math.cos(a)}" y2="${cy + r2 * Math.sin(a)}" stroke="#333" stroke-width="${big ? 3 : 1}"/>`;
  }
  let nums = '';
  for (let i = 1; i <= 12; i++) {
    const a = (i * 30 - 90) * Math.PI / 180;
    nums += `<text x="${cx + 59 * Math.cos(a)}" y="${cy + 59 * Math.sin(a) + 6}" text-anchor="middle" font-size="17" font-weight="700" fill="#333">${i}</text>`;
  }
  const ha = ((h % 12) * 30 + m * 0.5 - 90) * Math.PI / 180, ma = (m * 6 - 90) * Math.PI / 180;
  return `<svg width="${size}" height="${size}" viewBox="0 0 200 200" role="img" aria-label="시계"><circle cx="100" cy="100" r="92" fill="#fff" stroke="#7b3fa0" stroke-width="10"/>${ticks}${nums}
<line x1="100" y1="100" x2="${cx + 42 * Math.cos(ha)}" y2="${cy + 42 * Math.sin(ha)}" stroke="#222" stroke-width="8" stroke-linecap="round"/>
<line x1="100" y1="100" x2="${cx + 70 * Math.cos(ma)}" y2="${cy + 70 * Math.sin(ma)}" stroke="#e0522a" stroke-width="5" stroke-linecap="round"/>
<circle cx="100" cy="100" r="7" fill="#222"/></svg>`;
}

function moneyHTML(mo) {
  let s = '<div class="money">';
  for (let i = 0; i < (mo.c100 || 0); i++) s += '<div class="coin">100</div>';
  for (let i = 0; i < (mo.b1000 || 0); i++) s += '<div class="bill">1000원</div>';
  return s + '</div>';
}

// 보기 글자: [ch] → 밑줄
const optLabel = (o) => (o === '(정답 미입력)' ? '<span style="color:var(--no)">(정답 미입력)</span>' : esc(o)).replace(/\[(.+?)\]/g, '<u>$1</u>');

function fillSummary(html) {
  return html.replace(/\{\{clock:(\d+):(\d+)\}\}/g, (_, h, m) => clockSVG(+h, +m, 150));
}
function bindSpeak(root) {
  root.querySelectorAll('.en').forEach((el) => el.addEventListener('click', () => speak(el.textContent.replace(/^[AB]:\s*/, ''))));
}

// 듣기·그림 주소 (로그인 표를 붙여야 열림)
let MEDIA_TOKEN = '';
const mediaUrl = (k) => `/media/${k}?t=${encodeURIComponent(MEDIA_TOKEN)}`;
function mediaHTML(q) {
  let s = '';
  if (q.audio) s += `<audio class="aud" controls preload="none" controlslist="nodownload" src="${mediaUrl(q.audio)}"></audio>`;
  if (q.img) s += `<img class="qimg" src="${mediaUrl(q.img)}" alt="">`;
  if (q.imgs) s += q.imgs.map((x) => `<img class="qimg sm" src="${mediaUrl(x)}" alt="">`).join('');
  if (q.say) s += `<button class="say" data-say="${esc(q.say)}">${ico('sound', 16)} 듣기</button>`;
  if (q.clock) s += clockSVG(q.clock[0], q.clock[1], 150);
  if (q.money) s += moneyHTML(q.money);
  if (q.color) s += `<div class="colorbox" style="background:${esc(q.color)}"></div>`;
  return s ? `<div class="media">${s}</div>` : '';
}

const fillPattern = (pat, letters) => { let k = 0; return pat.split(' ').map((t) => (t === '__' ? (letters[k++] || '_') : t === '/' ? ' ' : t)).join(''); };
const qLabel = (c) => (c.kind === 'word' ? `${c.unit} 단어 시험` : c.kind === 'spelltest' ? `${c.unit} 철자 시험` : c.kind === 'exam' ? `${c.unit} 단원평가` : `개념 ${c.id}`);
// 문제에 딸린 보조 표시 (빈칸 낱말, 알파벳 카드) — 교사 화면용
const qExtra = (q) => (q.audio ? ` <audio controls preload="none" src="${mediaUrl(q.audio)}" style="height:28px;vertical-align:middle;max-width:220px"></audio>` : '') + [q.img, ...(q.imgs || []), ...(q.optImg || [])].filter(Boolean).map((x) => ` <img src="${mediaUrl(x)}" style="height:44px;vertical-align:middle;border-radius:6px">`).join('') + (q.pat ? ` <b>${esc(q.pat)}</b> (${esc(q.mean)})` : '') + (q.t === 'order' && q.join === '' ? ` <span class="muted">[${q.words.map(esc).join(' / ')}]</span>` : '');
function answerToText(q, a) {
  if (q.t === 'spellmean' && Array.isArray(a)) return a.some(Boolean) ? `${a[0] || '(빈칸)'} / ${a[1] || '(빈칸)'}` : '';
  if (q.t === 'spell' && Array.isArray(a)) return a.some(Boolean) ? `${fillPattern(q.pat, a)} (${a.map((x) => x || '_').join(', ')})` : '';
  if (a == null || a === '') return '';
  if (Array.isArray(a)) return q.t === 'order' ? (a.length ? a.join(q.join ?? ' ') + (q.end ?? '.') : '') : a.filter(Boolean).join(', ');
  return String(a);
}

// ---------- 결과지 (학생 화면·교사 일괄 출력 공용) ----------
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '');
const optPic = (q, label) => { if (!q.optImg || !label) return ''; const k = q.opts.indexOf(label); return k >= 0 ? `<img class="ansimg" src="${mediaUrl(q.optImg[k])}" alt="">` : ''; };
const setTitle = (c) => (c.kind === 'concept' ? `개념 ${c.id} · ${c.title}` : c.title);
const who = (st) => `${st.grade}학년 ${st.class_no}반 ${st.number}번 <b>${esc(st.name)}</b>`;
function resultHeadHTML(c, sub, st) {
  return `<div class="rhead"><div class="rtitle">${esc(setTitle(c))}</div>
    <div class="rmeta">${who(st)} · ${fmtDate(sub.graded_at || sub.submitted_at)}${sub.attempt > 1 ? ` · <b>${sub.attempt}차</b>` : ''}${sub.status !== 'graded' ? ' · <span style="color:var(--wait)">채점 대기</span>' : ''}</div>
    <div class="rscore">${sub.score} <small>/ ${c.questions.length}</small></div></div>`;
}
// correct: 문항별 정답 글자 배열
function resultItemsHTML(c, sub, correct, onlyWrong) {
  return c.questions.map((q, i) => {
    if (onlyWrong && sub.marks[i]) return '';
    const ok = sub.marks[i], mine = answerToText(q, sub.answers[i]);
    return `<div class="q ${ok ? 'ok' : 'no'}"><div class="qh"><div class="qn">${i + 1}</div><div class="qt">${optLabel(q.q)}${q.pat ? ` <b>${esc(q.pat)}</b> (${esc(q.mean)})` : ''}</div><div class="mark ${ok ? 'ok' : 'no'}">${ok ? 'O' : 'X'}</div></div>${mediaHTML(q)}
      <div class="fb">내 답: <b>${optLabel(mine) || '<span class="muted">(빈칸)</span>'}</b>${optPic(q, sub.answers[i])}${ok ? '' : ` &nbsp;→&nbsp; 정답: <span class="right">${optLabel(correct[i])}</span>${optPic(q, q.a ?? correct[i])}`}</div></div>`;
  }).join('');
}
// 선생님 말씀 카드 (결과 화면·출력 공통)
const teacherNoteHTML = (fb) => (fb ? `<div class="tnote"><div class="tnh"><img class="illus illus-teacher" src="/img/teacher-avatar.jpg" alt=""> 선생님이 남긴 말</div><p>${esc(fb).replace(/\n/g, '<br>')}</p></div>` : '');
// 한 학생의 결과 모음 (parts: [{c, sub, correct}])
// detail: true = 문제별 자세히, 'wrong' = 틀린 문제·선생님 말씀만, false = 점수표만
function studentReportHTML(st, parts, detail, gradeLabel) {
  const onlyWrong = detail === 'wrong';
  const total = parts.reduce((a, p) => a + p.sub.score, 0), max = parts.reduce((a, p) => a + p.c.questions.length, 0);
  return `<div class="rhead"><div class="rtitle">${gradeLabel} · 결과 모음</div>
      <div class="rmeta">${who(st)} · ${fmtDate(new Date())} 출력</div>
      <div class="rscore">${max ? Math.round(total / max * 100) : 0}<small>%</small></div></div>
    <table class="plain rsum"><tr><th>시험</th><th>점수</th><th>채점일</th></tr>${parts.map(({ c, sub, hist }) => `<tr><td>${esc(setTitle(c))}</td><td>${(hist || []).map((h) => `<span class="muted">${h.attempt}차 ${h.score} → </span>`).join('')}<b>${sub.score}</b> / ${c.questions.length}${sub.attempt > 1 ? ` <span class="small">(${sub.attempt}차)</span>` : ''}</td><td>${fmtDate(sub.graded_at) || '<span class="muted">채점 대기</span>'}</td></tr>`).join('')}</table>
    ${detail ? parts.map(({ c, sub, correct }) => `<section class="rsec">${resultHeadHTML(c, sub, st)}${teacherNoteHTML(sub.feedback)}${onlyWrong && sub.marks.every(Boolean) ? '<p class="small muted">틀린 문제가 없어요. 모두 맞혔어요!</p>' : resultItemsHTML(c, sub, correct, onlyWrong)}</section>`).join('') : ''}`;
}
// el 부분만 인쇄 (그림을 다 불러온 뒤)
// 몸통 바로 아래 요소(교사 일괄 출력 등)는 다른 것을 숨기고 제자리에 두어야 학생마다 쪽 나눔이 됨 (absolute 안에서는 쪽 나눔이 무시됨)
function printOnly(el) {
  const solo = el.parentElement === document.body;
  document.body.classList.add('printing'); if (solo) document.body.classList.add('printing-solo'); el.classList.add('print-target');
  const done = () => { document.body.classList.remove('printing', 'printing-solo'); el.classList.remove('print-target'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  Promise.all([...el.querySelectorAll('img')].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })))).then(() => setTimeout(() => window.print(), 150));
}
