import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import { createDb, listenDb } from './api-mock.mjs';

test('교사가 학생 화면 테마를 지정하고 학생이 GET /api/theme로 조회한다', async () => {
  const db = createDb({ schema: 2 });
  const srv = listenDb(db, 0);
  await new Promise((r) => srv.once('listening', r));
  const env = { SUPABASE_URL: `http://127.0.0.1:${srv.address().port}`, SUPABASE_SERVICE_KEY: 'sb_secret_test', TEACHER_PASSWORD: 'pw' };
  const req = (path, body, token) => worker.fetch(new Request('http://x' + path, {
    method: body ? 'POST' : 'GET',
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }), env);

  try {
    // 1) 기본값 조회 (비로그인 공개 읽기)
    const r0 = await req('/api/theme');
    assert.equal(r0.status, 200);
    assert.deepEqual(await r0.json(), { studentTheme: 'default' });

    // 2) 교사 미인증 시 변경 거부
    const rUnauth = await req('/api/t/theme', { studentTheme: 'dual' });
    assert.equal(rUnauth.status, 401);

    // 3) 교사 로그인
    const rLogin = await req('/api/teacher/login', { password: 'pw' });
    const { token } = await rLogin.json();

    // 4) 교사 전용(dark) 또는 잘못된 테마는 학생 테마로 거부
    const rDark = await req('/api/t/theme', { studentTheme: 'dark' }, token);
    assert.equal(rDark.status, 400);
    const rBad = await req('/api/t/theme', { studentTheme: 'neon' }, token);
    assert.equal(rBad.status, 400);

    // 5) 유효한 테마 지정 후 학생이 조회
    const rSet = await req('/api/t/theme', { studentTheme: 'playful' }, token);
    assert.equal(rSet.status, 200);
    assert.deepEqual(await rSet.json(), { ok: true, studentTheme: 'playful' });

    const r1 = await req('/api/theme');
    assert.deepEqual(await r1.json(), { studentTheme: 'playful' });
  } finally {
    srv.closeAllConnections();
    srv.close();
  }
});
