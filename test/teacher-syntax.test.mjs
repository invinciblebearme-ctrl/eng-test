// 화면 파일(public/*.html의 <script>, common.js) 문법 확인 + 교사 화면 기본 계약
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
const dir = new URL('../public/', import.meta.url);
let bad = 0;
const check = (name, code) => { try { new vm.Script(code, { filename: name }); console.log('ok ', name); } catch (e) { bad++; console.log('BAD', name, e.message); } };
for (const f of readdirSync(dir)) {
  const src = readFileSync(new URL(f, dir), 'utf8');
  if (f.endsWith('.js')) check(f, src);
  if (f.endsWith('.html')) [...src.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].forEach((m, k) => check(`${f} <script #${k + 1}>`, m[1]));
}
// common.js + teacher.html 스크립트를 한 범위에서 합쳐도 이름이 겹치지 않는지 (같은 페이지에서 함께 실행됨)
const common = readFileSync(new URL('common.js', dir), 'utf8');
for (const page of ['teacher.html', 'student.html']) {
  const inl = [...readFileSync(new URL(page, dir), 'utf8').matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n;\n');
  check(`common.js + ${page} (한 페이지)`, common + '\n;\n' + inl);
}
// 공통 함수가 있는지
for (const fn of ['openModal', 'trapModal', 'toast', 'statusMsg', 'api', 'esc']) if (!new RegExp(`function ${fn}\\b|const ${fn}\\b`).test(common)) { bad++; console.log('BAD common.js에', fn, '없음'); }
console.log(bad ? `${bad} problems` : 'ALL OK');
process.exit(bad ? 1 : 0);
