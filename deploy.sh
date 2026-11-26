#!/bin/bash
# 사용법: ./deploy.sh  (처음 한 번만: TEACHER_PASSWORD=비밀번호 ./deploy.sh)
# 순서: 필수 검사 파일 확인 → npm test(빌드 포함) → Cloudflare 업로드 → 응답 확인. 하나라도 실패하면 멈춤(종료 코드 1).
# 인증: CLOUDFLARE_API_TOKEN이 있으면 그것을, 없으면 wrangler 로그인(공식 CLI가 갱신)을 씀. 토큰은 화면에 찍지 않음.
# ⚠️ DB 업그레이드(sql/upgrade-2026-11.sql)를 먼저 Supabase에 실행한 뒤 배포하세요. 안 하면 저장 기능이 안내 메시지와 함께 멈춥니다.
set -euo pipefail
cd "$(dirname "$0")"
ACC=58d51fd9734db2859e760dbf82c96556; NAME=eng4-2-review
API="https://api.cloudflare.com/client/v4/accounts/$ACC/workers/scripts/$NAME"

for f in test/grade.test.mjs test/triage.test.mjs test/api.test.mjs test/api-sql.test.mjs test/teacher-syntax.test.mjs test/teacher-savequeue.test.mjs test/api-deploy.test.mjs sql/upgrade-2026-11.sql; do
  [ -f "$f" ] || { echo "❌ 필수 검사 파일이 없어요: $f"; exit 1; }
done
npm test || { echo "❌ 테스트 실패 — 배포하지 않았어요"; exit 1; }

TOKEN="${CLOUDFLARE_API_TOKEN:-}"
if [ -z "$TOKEN" ]; then
  npx -y wrangler@4 whoami >/dev/null 2>&1 || { echo "❌ Cloudflare 로그인이 필요해요: npx wrangler login"; exit 1; }
  TOKEN=$(python3 - <<'EOF'
import os, re
# wrangler가 갱신한 설정 파일은 위치가 여럿일 수 있음 → 만료 시각이 가장 늦은 토큰
best = None
for f in ['~/Library/Preferences/.wrangler/config/default.toml', '~/.config/.wrangler/config/default.toml', '~/.wrangler/config/default.toml']:
    p = os.path.expanduser(f)
    if not os.path.exists(p): continue
    t = open(p).read(); m = re.search(r'oauth_token\s*=\s*"([^"]+)"', t); e = re.search(r'expiration_time\s*=\s*"([^"]+)"', t)
    if m and (best is None or (e.group(1) if e else '') > best[0]): best = (e.group(1) if e else '', m.group(1))
if best: print(best[1])
EOF
)
  [ -n "$TOKEN" ] || { echo "❌ wrangler 토큰을 찾지 못했어요: npx wrangler login"; exit 1; }
fi
AUTH_HDR=$(mktemp); OUT=$(mktemp); trap 'rm -f "$AUTH_HDR" "$OUT"' EXIT
printf 'Authorization: Bearer %s\n' "$TOKEN" > "$AUTH_HDR"; unset TOKEN

if [ -n "${TEACHER_PASSWORD:-}" ]; then
  BIND=$(python3 -c 'import json,os;print(json.dumps([{"type":"secret_text","name":"TEACHER_PASSWORD","text":os.environ["TEACHER_PASSWORD"]}]))')
else BIND='[]'; fi
BIND=$(python3 -c 'import json,sys;b=json.loads(sys.argv[1]);b.append({"type":"r2_bucket","name":"MEDIA","bucket_name":"eng4-review-media"});print(json.dumps(b))' "$BIND")
META="{\"main_module\":\"worker.js\",\"compatibility_date\":\"2026-10-01\",\"bindings\":$BIND,\"keep_bindings\":[\"secret_text\",\"plain_text\"]}"
PARTS=(); for f in src/*.js; do PARTS+=(-F "$(basename "$f")=@$f;type=application/javascript+module"); done

# 응답 확인: HTTP 2xx 이고 success=true 여야 성공
check() {
  local code="$1" what="$2"
  python3 - "$OUT" "$code" "$what" <<'EOF' || exit 1
import json, sys
out, code, what = sys.argv[1], int(sys.argv[2]), sys.argv[3]
try: d = json.load(open(out))
except Exception: d = {}
ok = 200 <= code < 300 and d.get('success') is True
print(('✅ ' if ok else '❌ ') + what, code, '' if ok else (d.get('errors') or open(out).read()[:300]))
sys.exit(0 if ok else 1)
EOF
}
CODE=$(curl -sS -o "$OUT" -w '%{http_code}' -X PUT "$API" -H @"$AUTH_HDR" -F "metadata=$META;type=application/json" "${PARTS[@]}") || { echo "❌ 업로드 요청 실패"; exit 1; }
check "$CODE" "deploy"
CODE=$(curl -sS -o "$OUT" -w '%{http_code}' -X POST "$API/subdomain" -H @"$AUTH_HDR" -H 'content-type: application/json' -d '{"enabled":true,"previews_enabled":false}') || { echo "❌ subdomain 요청 실패"; exit 1; }
check "$CODE" "subdomain"
echo "https://$NAME.invinciblebearme.workers.dev"
# 배포 뒤 첫 화면 확인
curl -sSf -o /dev/null "https://$NAME.invinciblebearme.workers.dev/teacher" && echo "✅ /teacher 응답" || { echo "❌ /teacher 응답 없음"; exit 1; }
