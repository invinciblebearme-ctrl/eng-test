#!/bin/bash
# 듣기(mp3)·그림(jpg)을 사이트의 교사 전용 업로드 API로 R2에 올리고 크기까지 확인.
# 사용: TEACHER_PASSWORD=... ./upload_media.sh <사이트 주소> <R2 접두어> <음원 폴더> <그림 폴더>
#   예: TEACHER_PASSWORD=**** ./upload_media.sh https://eng4-2-review.invinciblebearme.workers.dev g4u12 work/audio work/web
#   → g4u12/q01.mp3 …, g4u12/img/BIN0001.jpg …
# Cloudflare API로 직접 올리면 요청 제한(code 971)에 자주 걸려서 사이트 API를 씀.
set -euo pipefail
B=${1%/}; PREFIX=$2; AUD=$3; IMG=$4
[ -n "${TEACHER_PASSWORD:-}" ] || { echo "TEACHER_PASSWORD 환경변수가 필요해요"; exit 1; }
TOK=$(curl -s -X POST "$B/api/teacher/login" -H 'content-type: application/json' -d "{\"password\":\"$TEACHER_PASSWORD\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
ok=0; fail=0
up() { local key=$1 file=$2 r
  for n in 1 2 3; do r=$(curl -s -X POST "$B/api/t/media?key=$key" -H "authorization: Bearer $TOK" --data-binary @"$file"); echo "$r" | grep -q '"ok":true' && { ok=$((ok+1)); return; }; sleep $((n*2)); done
  fail=$((fail+1)); echo "FAIL $key $r"; }
for f in "$AUD"/q*.mp3; do [ -e "$f" ] && up "$PREFIX/$(basename "$f")" "$f"; done
for f in "$IMG"/*.jpg; do [ -e "$f" ] && up "$PREFIX/img/$(basename "$f")" "$f"; done
echo "uploaded $ok, failed $fail"
# 크기 확인 (교사 토큰으로 내려받아 비교)
for f in "$AUD"/q*.mp3; do [ -e "$f" ] || continue; a=$(stat -c %s "$f"); b=$(curl -s "$B/media/$PREFIX/$(basename "$f")?t=$TOK" | wc -c); [ "$a" = "$b" ] || echo "size mismatch $(basename "$f") $a $b"; done
echo "verified"
