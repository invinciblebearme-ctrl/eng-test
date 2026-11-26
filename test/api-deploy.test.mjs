// deploy.sh 동작 확인 — 실제 업로드 없음. PATH 맨 앞에 가짜 npm·curl·npx를 둬서
// npm test 실패 / HTTP 실패 / success=false / /teacher 실패 / 모두 성공 때 종료 코드를 봅니다.
// 가짜 npm은 테스트를 다시 돌리지 않음(재귀 방지). 가짜 curl은 네트워크에 나가지 않음.
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname;
const bin = mkdtempSync(join(tmpdir(), 'eng-deploy-'));
const log = join(bin, 'calls.log'), tmp = join(bin, 'tmp'); mkdirSync(tmp);
const sh = (name, body) => { writeFileSync(join(bin, name), '#!/bin/bash\n' + body); chmodSync(join(bin, name), 0o755); };
sh('npm', `echo "npm $*" >> "${log}"; exit \${FAKE_NPM_EXIT:-0}\n`);
sh('npx', `echo "npx $*" >> "${log}"; exit 0\n`);
// 가짜 curl: -o 파일에 본문, -w면 상태 코드 출력. 업로드(PUT)·subdomain·/teacher를 구분
sh('curl', `echo "curl $*" >> "${log}"
out=""; w=""; url=""; fail=0
while [ $# -gt 0 ]; do case "$1" in -o) out="$2"; shift;; -w) w="$2"; shift;; -sSf) fail=1;; -H|-F|-d|-X) shift;; http*) url="$1";; esac; shift; done
case "$url" in
  */teacher) [ "\${FAKE_TEACHER:-ok}" = ok ] && exit 0 || exit 22;;
  */subdomain) code=\${FAKE_SUB_CODE:-200}; body=\${FAKE_SUB_BODY:-'{"success":true}'};;
  *) code=\${FAKE_PUT_CODE:-200}; body=\${FAKE_PUT_BODY:-'{"success":true}'};;
esac
[ -n "$out" ] && printf '%s' "$body" > "$out"
[ -n "$w" ] && printf '%s' "$code"
exit 0
`);

let bad = 0;
const ok = (c, m, x) => { console.log(c ? 'ok ' : 'BAD', m, c ? '' : JSON.stringify(x).slice(0, 400)); if (!c) bad++; };
function run(env) {
  writeFileSync(log, '');
  const r = spawnSync('bash', [join(root, 'deploy.sh')], { env: { PATH: `${bin}:/usr/bin:/bin:/usr/sbin:/sbin:${process.env.PATH}`, HOME: bin, TMPDIR: tmp, CLOUDFLARE_API_TOKEN: 'tok-SECRET-test', ...env }, encoding: 'utf8', timeout: 30000 });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || ''), calls: readFileSync(log, 'utf8').trim().split('\n').filter(Boolean) };
}
const curls = (r) => r.calls.filter((x) => x.startsWith('curl'));

let r = run({ FAKE_NPM_EXIT: '1' });
ok(r.code !== 0 && curls(r).length === 0, 'npm test 실패 → 종료 코드≠0, 업로드 안 함', r);
r = run({ FAKE_PUT_CODE: '500', FAKE_PUT_BODY: '{"success":false,"errors":[{"message":"boom"}]}' });
ok(r.code !== 0 && curls(r).length === 1 && /❌ deploy 500/.test(r.out), 'HTTP 500 → 실패, 다음 단계 안 함', r);
r = run({ FAKE_PUT_CODE: '200', FAKE_PUT_BODY: '{"success":false,"errors":[{"message":"bad"}]}' });
ok(r.code !== 0 && curls(r).length === 1, 'HTTP 200이지만 success=false → 실패', r);
r = run({ FAKE_PUT_BODY: 'not json' });
ok(r.code !== 0, 'JSON이 아니면 실패', r);
r = run({ FAKE_SUB_CODE: '403', FAKE_SUB_BODY: '{"success":false}' });
ok(r.code !== 0 && curls(r).length === 2, 'subdomain 실패 → 실패', r);
r = run({ FAKE_TEACHER: 'down' });
ok(r.code !== 0 && /❌ \/teacher/.test(r.out), '배포 뒤 /teacher 응답 없으면 실패', r);
r = run({});
ok(r.code === 0 && curls(r).length === 3 && r.calls.some((x) => x === 'npm test'), '모두 성공 → 종료 코드 0, npm test 한 번, 요청 3번', r);
ok(!r.calls.join('\n').includes('tok-SECRET-test') && !r.out.includes('tok-SECRET-test'), '토큰이 명령줄·출력에 나오지 않음', r);
ok(readdirSync(tmp).length === 0, '토큰·응답 임시 파일은 끝나면 지움', readdirSync(tmp));

console.log(bad ? `${bad} problems` : 'ALL OK');
process.exit(bad ? 1 : 0);
