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

const SYSTEM = `너는 초등학교 4학년 영어 확인 문제를 채점하는 선생님의 보조자야.
각 문항의 [문제], [정답], [학생 답]을 보고, 학생 답을 정답으로 인정할 수 있는지 판단해.
기준:
- 철자가 틀리면 오답 (예: yelow, Wensday). 이 학습의 핵심이 철자이기 때문이야.
- 띄어쓰기 한 칸 차이, 끝 마침표·물음표 유무, 따옴표 모양(’ ')은 무시해.
- [대소문자 구별: 예]인 문항은 대문자를 틀리면 오답. 아니면 대소문자는 무시해.
- 정답과 뜻과 표현이 같고 문제가 요구한 형태를 지켰으면 정답 (예: "It's four thirty"처럼 문제에 이미 있는 말을 덧붙인 것, grey/gray).
- 한국어 뜻을 쓰는 문항은 뜻이 같으면 정답.
- '철자 / 뜻'을 함께 쓰는 문항은 영어 철자와 우리말 뜻이 둘 다 맞아야 정답. 철자는 엄격하게, 뜻은 의미가 같으면 인정.
- 확실하지 않으면 오답으로 하고 이유에 "선생님 확인 필요"라고 써.
반드시 JSON만 출력해: {"results":[{"n":문항번호,"ok":true 또는 false,"reason":"한국어 한 문장"}]}`;

function describe(q, ans) {
  const show = Array.isArray(ans) ? (q.t === 'spellmean' ? `철자: ${ans[0] || ''} / 뜻: ${ans[1] || ''}` : q.t === 'order' ? ans.join(q.join ?? ' ') : q.t === 'spell' ? `${q.pat} 빈칸에 ${ans.join(', ')}` : ans.join(' / ')) : String(ans ?? '');
  const extra = [q.say && `(듣기 음성: "${q.say}")`, q.clock && `(시계: ${q.clock[0]}시 ${q.clock[1]}분)`, q.color && `(색 견본 ${q.color})`,
    q.money && `(그림: ${q.money.c100 ? '100원 동전 ' + q.money.c100 + '개' : ''}${q.money.b1000 ? '1000원 지폐 ' + q.money.b1000 + '장' : ''})`].filter(Boolean).join(' ');
  return `[문제] ${q.q} ${extra}\n[정답] ${answerText(q)}${Array.isArray(q.a) && q.t === 'text' && q.a.length > 1 ? ` (허용: ${q.a.join(', ')})` : ''}\n[대소문자 구별] ${q.cs ? '예' : '아니오'}\n[학생 답] ${show}`;
}

async function callAI(env, userText) {
  const headers = { 'content-type': 'application/json' };
  const h = env.AI_AUTH_HEADER || 'authorization';
  headers[h] = h.toLowerCase() === 'authorization' ? 'Bearer ' + env.AI_API_KEY : env.AI_API_KEY;
  const r = await fetch(env.AI_API_URL, {
    method: 'POST', headers,
    body: JSON.stringify({ model: env.AI_MODEL, temperature: 0, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: userText }] }),
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

// 제출 하나를 AI로 채점 → { "문항index": {ok, reason} }
export async function aiGrade(env, concept, answers, auto) {
  const targets = concept.questions.map((q, i) => ({ q, i })).filter(({ i }) => !auto[i]);
  const out = {};
  const ask = [];
  for (const { q, i } of targets) {
    const a = answers[i];
    const empty = a == null || (Array.isArray(a) ? a.every((x) => !String(x).trim()) : !String(a).trim());
    // 빈칸, 고르기 문항(choice/pick)은 AI가 판단할 것이 없음
    if (empty || q.t === 'choice' || q.t === 'pick' || q.t === 'spell') out[i] = { ok: false, reason: empty ? '답을 쓰지 않았어요' : '보기를 잘못 골랐어요' };
    else ask.push({ q, i });
  }
  if (ask.length) {
    const user = `개념 ${concept.id}: ${concept.title}\n\n` + ask.map(({ q, i }) => `### ${i + 1}번\n${describe(q, answers[i])}`).join('\n\n');
    const res = parseResults(await callAI(env, user));
    for (const { i } of ask) {
      const r = res.find((x) => +x.n === i + 1);
      out[i] = r ? { ok: !!r.ok, reason: String(r.reason || '').slice(0, 200) } : { ok: false, reason: 'AI가 답하지 않음 — 선생님 확인 필요' };
    }
  }
  return out;
}
