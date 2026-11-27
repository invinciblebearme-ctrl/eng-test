// AI 채점 (전북 AI API 등 외부 AI) — 정확 일치 채점에서 X가 나온 답만 보내 "인정해도 되는지" 판단을 받습니다.
// 결과는 '제안'으로만 저장하고, 교사가 확인·확정합니다.
//
// 설정 (Cloudflare Worker 변수/비밀)
//   AI_API_URL   : 요청 주소 (OpenAI 호환 예: https://…/v1/chat/completions)
//   AI_API_KEY   : API 키 (Secret)
//   AI_MODEL     : 모델 이름
//   AI_AUTH_HEADER (선택): 키를 넣을 헤더 이름. 기본 Authorization(Bearer). 예: x-api-key
//
// API 형식이 OpenAI 호환이 아니면 callAI()의 요청 본문과 응답 읽는 부분만 바꾸면 됩니다.
import { answerText } from './content.js';
import { aiTargets } from './triage.js';

// 지시문은 짧게 (매 요청마다 보내므로 토큰 절약)
const SYSTEM = `초등 영어 시험 채점 보조. 각 문항의 학생 답이 자동 채점에서 오답이 됐지만 정답과 아주 가까워 애매한 경우다. 인정 여부만 판단해.
- 영어 철자가 틀리면 오답(철자가 학습 목표). 띄어쓰기·끝 문장부호·따옴표 모양 차이는 무시.
- [대소문자 구별: 예]면 대소문자 틀림은 오답.
- 문제에 이미 있는 말을 덧붙였거나(It's four thirty) 같은 뜻의 우리말이면 정답. 칸을 잘못 맞춘 것은 의도가 분명하면 정답.
- '철자/뜻' 문항은 둘 다 맞아야 정답. 확실하지 않으면 오답, 이유에 "선생님 확인".
JSON만: {"results":[{"n":번호,"ok":true|false,"reason":"20자 이내"}]}`;

function describe(q, ans) {
  const show = Array.isArray(ans) ? (q.t === 'spellmean' ? `철자: ${ans[0] || ''} / 뜻: ${ans[1] || ''}` : q.t === 'order' ? ans.join(q.join ?? ' ') : q.t === 'spell' ? `${q.pat} 빈칸에 ${ans.join(', ')}` : ans.join(' / ')) : String(ans ?? '');
  const extra = [q.say && `(듣기 음성: "${q.say}")`, q.clock && `(시계: ${q.clock[0]}시 ${q.clock[1]}분)`, q.color && `(색 견본 ${q.color})`,
    q.money && `(그림: ${q.money.c100 ? '100원 동전 ' + q.money.c100 + '개' : ''}${q.money.b1000 ? '1000원 지폐 ' + q.money.b1000 + '장' : ''})`].filter(Boolean).join(' ');
  return `[문제] ${q.q.slice(0, 120)} ${extra}\n[정답] ${answerText(q)}${Array.isArray(q.a) && q.t === 'text' && q.a.length > 1 ? ` (허용: ${q.a.join(', ')})` : ''}\n[대소문자 구별] ${q.cs ? '예' : '아니오'}\n[학생 답] ${show}`;
}

async function callAI(env, userText, maxTokens = 400, system = SYSTEM) {
  const headers = { 'content-type': 'application/json' };
  const h = env.AI_AUTH_HEADER || 'authorization';
  headers[h] = h.toLowerCase() === 'authorization' ? 'Bearer ' + env.AI_API_KEY : env.AI_API_KEY;
  const r = await fetch(env.AI_API_URL, {
    method: 'POST', headers,
    body: JSON.stringify({ model: env.AI_MODEL, temperature: 0, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: userText }] }),
  });
  const t = await r.text();
  if (!r.ok) throw Object.assign(new Error(`AI API 오류 ${r.status}: ${t.slice(0, 200)}`), { status: 502 });
  let d; try { d = JSON.parse(t); } catch { d = null; }
  // OpenAI 호환 응답 → 다른 형식 몇 가지도 시도
  const content = d?.choices?.[0]?.message?.content ?? d?.output_text ?? d?.content?.[0]?.text ?? d?.result ?? d?.answer ?? t;
  return typeof content === 'string' ? content : JSON.stringify(content);
}

function parseResults(text) {
  const m = String(text).match(/\{[\s\S]*\}/);
  if (!m) throw Object.assign(new Error('AI 응답에서 결과(JSON)를 찾지 못했어요'), { status: 502 });
  const j = JSON.parse(m[0]);
  return Array.isArray(j) ? j : j.results || [];
}

// 제출 하나를 AI로 채점 → { "문항index": {ok, reason, why} }
// marks: 지금 O/X (선생님이 고친 것 포함). 애매한 오답(triage.js)만 AI에게 보내고, 없으면 AI를 부르지 않음.
export async function aiGrade(env, concept, answers, marks) {
  const targets = aiTargets(concept, answers, marks);
  const out = {};
  if (!targets.length) return out;
  const user = `${concept.title}\n\n` + targets.map(({ i, why }) => `### ${i + 1}번 (애매한 이유: ${why})\n${describe(concept.questions[i], answers[i])}`).join('\n\n');
  const res = parseResults(await callAI(env, user, 300 + 80 * targets.length));
  for (const { i, why } of targets) {
    const r = res.find((x) => +x.n === i + 1);
    out[i] = r ? { ok: !!r.ok, reason: String(r.reason || '').slice(0, 120), why } : { ok: false, reason: 'AI가 답하지 않음 — 선생님 확인', why };
  }
  return out;
}

// 🎁 판도라의 상자: 생활기록부 교과 세부능력 및 특기사항 문구 초안 (교사가 버튼을 누를 때만)
const RECORD_SYSTEM = `초등학교 3~4학년 영어 교과의 생활기록부 '교과 세부능력 및 특기사항' 초안을 쓰는 보조야.
- 주어진 학습 자료(영역별 결과, 실제로 쓴 낱말·표현, 자주 한 실수)만 근거로 2~3문장을 써.
- 문장 끝은 "~함." "~임." "~보임." 같은 생활기록부 문체.
- 학생 이름, 점수, 숫자, 등급(상·중·하, 우수 등), 다른 학생과의 비교는 절대 쓰지 마.
- 듣기·읽기·쓰기에서 관찰된 능력을 구체적인 낱말·표현과 함께 쓰고, 부족한 점은 성장 가능성으로 부드럽게 써.
- 흔한 상투 문장을 피하고 이 학생에게만 맞는 내용으로 써.
- 다른 말 없이 문구만 출력해.`;
export async function recordDraft(env, info) {
  const t = await callAI(env, info, 500, RECORD_SYSTEM);
  return String(t).replace(/```[a-z]*|```/g, '').replace(/^\s*["'“”]+|["'“”]+\s*$/g, '').replace(/\s+/g, ' ').trim().slice(0, 600);
}
