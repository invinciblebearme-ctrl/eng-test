// public/ 파일을 Worker 모듈(src/assets.js)로 묶습니다.
import { readFileSync, writeFileSync } from 'node:fs';
const r = (f) => JSON.stringify(readFileSync(new URL('./public/' + f, import.meta.url), 'utf8'));
writeFileSync(new URL('./src/assets.js', import.meta.url),
  `export const STUDENT_HTML = ${r('student.html')};\nexport const TEACHER_HTML = ${r('teacher.html')};\nexport const STYLE_CSS = ${r('style.css')};\nexport const COMMON_JS = ${r('common.js')};\nexport const QR_JS = ${JSON.stringify(readFileSync(new URL('./node_modules/qrcode-generator/qrcode.js', import.meta.url), 'utf8'))};\nexport const XLSX_JS = ${JSON.stringify(readFileSync(new URL('./node_modules/xlsx/dist/xlsx.full.min.js', import.meta.url), 'utf8'))};\n`);
console.log('built src/assets.js');
