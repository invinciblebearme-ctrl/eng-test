#!/bin/bash
# 사용법: ./deploy.sh  (처음 한 번만: TEACHER_PASSWORD=비밀번호 ./deploy.sh)
set -e
cd "$(dirname "$0")"
ACC=58d51fd9734db2859e760dbf82c96556; NAME=eng4-2-review
node build.mjs
if [ -n "$TEACHER_PASSWORD" ]; then
  BIND=$(python3 -c 'import json,os;print(json.dumps([{"type":"secret_text","name":"TEACHER_PASSWORD","text":os.environ["TEACHER_PASSWORD"]}]))')
else BIND='[]'; fi
BIND=$(python3 -c 'import json,sys;b=json.loads(sys.argv[1]);b.append({"type":"r2_bucket","name":"MEDIA","bucket_name":"eng4-review-media"});print(json.dumps(b))' "$BIND")
META="{\"main_module\":\"worker.js\",\"compatibility_date\":\"2026-10-01\",\"bindings\":$BIND,\"keep_bindings\":[\"secret_text\",\"plain_text\"]}"
PARTS=(); for f in src/*.js; do PARTS+=(-F "$(basename "$f")=@$f;type=application/javascript+module"); done
curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACC/workers/scripts/$NAME" \
  -F "metadata=$META;type=application/json" "${PARTS[@]}" | python3 -c "import sys,json;d=json.load(sys.stdin);print('deploy', d['success'], d.get('errors') or '')"
curl -sf -X POST "https://api.cloudflare.com/client/v4/accounts/$ACC/workers/scripts/$NAME/subdomain" -H 'content-type: application/json' -d '{"enabled":true,"previews_enabled":false}' >/dev/null && echo "https://$NAME.invinciblebearme.workers.dev"
