// 사이트의 위젯 화면(public/widget.html)을 앱 화면(dist/index.html)으로 복사 — 화면 코드는 한 곳에서만 관리
// (tauri가 src-tauri 에서 부르든 widget/desktop 에서 부르든 이 파일 위치 기준)
import { mkdirSync, copyFileSync } from 'node:fs';
const here = new URL('.', import.meta.url);
mkdirSync(new URL('dist/', here), { recursive: true });
copyFileSync(new URL('../../public/widget.html', here), new URL('dist/index.html', here));
console.log('dist/index.html ← public/widget.html');
