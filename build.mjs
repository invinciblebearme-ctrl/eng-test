// public/ 파일을 Worker 모듈(src/assets.js)로 묶습니다.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
const r = (f) => JSON.stringify(readFileSync(new URL('./public/' + f, import.meta.url), 'utf8'));
const imgDir = new URL('./public/img/', import.meta.url);
const imgs = {};
if (existsSync(imgDir)) {
  for (const f of readdirSync(imgDir)) {
    if (/\.(jpg|jpeg|png|webp)$/i.test(f)) imgs[f] = readFileSync(new URL(f, imgDir)).toString('base64');
  }
}
writeFileSync(new URL('./src/assets.js', import.meta.url),
  `export const STUDENT_HTML = ${r('student.html')};\nexport const TEACHER_HTML = ${r('teacher.html')};\nexport const STYLE_CSS = ${r('style.css')};\nexport const COMMON_JS = ${r('common.js')};\nexport const QR_JS = ${JSON.stringify(readFileSync(new URL('./node_modules/qrcode-generator/qrcode.js', import.meta.url), 'utf8'))};\nexport const XLSX_JS = ${JSON.stringify(readFileSync(new URL('./node_modules/xlsx/dist/xlsx.full.min.js', import.meta.url), 'utf8'))};\nexport const H2C_JS = ${JSON.stringify(readFileSync(new URL('./node_modules/html2canvas/dist/html2canvas.min.js', import.meta.url), 'utf8'))};\nexport const IMGS = ${JSON.stringify(imgs)};\n`);
console.log('built src/assets.js');
