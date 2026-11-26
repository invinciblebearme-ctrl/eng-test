const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(path, body, token) {
  const opt = { method: body ? 'POST' : 'GET', headers: {} };
  if (body) { opt.headers['content-type'] = 'application/json'; opt.body = JSON.stringify(body); }
  if (token) opt.headers.authorization = 'Bearer ' + token;
  const r = await fetch(path, opt);
  let d = null; try { d = await r.json(); } catch {}
  if (!r.ok) { const e = new Error((d && d.error) || ('오류 ' + r.status)); e.status = r.status; throw e; }
  return d;
}

function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2200);
}

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
  if (q.say) s += `<button class="say" data-say="${esc(q.say)}">🔊 듣기</button>`;
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
function resultItemsHTML(c, sub, correct) {
  return c.questions.map((q, i) => {
    const ok = sub.marks[i], mine = answerToText(q, sub.answers[i]);
    return `<div class="q ${ok ? 'ok' : 'no'}"><div class="qh"><div class="qn">${i + 1}</div><div class="qt">${optLabel(q.q)}${q.pat ? ` <b>${esc(q.pat)}</b> (${esc(q.mean)})` : ''}</div><div class="mark ${ok ? 'ok' : 'no'}">${ok ? 'O' : 'X'}</div></div>${mediaHTML(q)}
      <div class="fb">내 답: <b>${optLabel(mine) || '<span class="muted">(빈칸)</span>'}</b>${optPic(q, sub.answers[i])}${ok ? '' : ` &nbsp;→&nbsp; 정답: <span class="right">${optLabel(correct[i])}</span>${optPic(q, q.a ?? correct[i])}`}</div></div>`;
  }).join('');
}
// 선생님 말씀 카드 (결과 화면·출력 공통)
const teacherNoteHTML = (fb) => (fb ? `<div class="tnote"><div class="tnh">👩‍🏫 선생님이 남긴 말</div><p>${esc(fb).replace(/\n/g, '<br>')}</p></div>` : '');
// 한 학생의 결과 모음 (parts: [{c, sub, correct}])
function studentReportHTML(st, parts, detail, gradeLabel) {
  const total = parts.reduce((a, p) => a + p.sub.score, 0), max = parts.reduce((a, p) => a + p.c.questions.length, 0);
  return `<div class="rhead"><div class="rtitle">${gradeLabel} · 결과 모음</div>
      <div class="rmeta">${who(st)} · ${fmtDate(new Date())} 출력</div>
      <div class="rscore">${max ? Math.round(total / max * 100) : 0}<small>%</small></div></div>
    <table class="plain rsum"><tr><th>시험</th><th>점수</th><th>채점일</th></tr>${parts.map(({ c, sub, hist }) => `<tr><td>${esc(setTitle(c))}</td><td>${(hist || []).map((h) => `<span class="muted">${h.attempt}차 ${h.score} → </span>`).join('')}<b>${sub.score}</b> / ${c.questions.length}${sub.attempt > 1 ? ` <span class="small">(${sub.attempt}차)</span>` : ''}</td><td>${fmtDate(sub.graded_at) || '<span class="muted">채점 대기</span>'}</td></tr>`).join('')}</table>
    ${detail ? parts.map(({ c, sub, correct }) => `<section class="rsec">${resultHeadHTML(c, sub, st)}${teacherNoteHTML(sub.feedback)}${resultItemsHTML(c, sub, correct)}</section>`).join('') : ''}`;
}
// el 부분만 인쇄 (그림을 다 불러온 뒤)
function printOnly(el) {
  document.body.classList.add('printing'); el.classList.add('print-target');
  const done = () => { document.body.classList.remove('printing'); el.classList.remove('print-target'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  Promise.all([...el.querySelectorAll('img')].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })))).then(() => setTimeout(() => window.print(), 150));
}
