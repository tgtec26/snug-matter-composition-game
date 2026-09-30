import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { GET, POST } from '../app/api/admin/[file]/route';
import { DATA_FILES } from '../game/systems/validators';

let tmp: string;
const ctx = (file: string) => ({ params: Promise.resolve({ file }) });
const post = (file: string, body: unknown) =>
  POST(new Request('http://x', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) }) as never, ctx(file));
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(tmp, 'public/data', `${f}.json`), 'utf-8'));

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-'));
  fs.mkdirSync(path.join(tmp, 'public/data'), { recursive: true });
  for (const f of DATA_FILES) fs.copyFileSync(`public/data/${f}.json`, path.join(tmp, 'public/data', `${f}.json`));
  vi.spyOn(process, 'cwd').mockReturnValue(tmp);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); fs.rmSync(tmp, { recursive: true, force: true }); });

describe('admin route', () => {
  it('허용 파일만: 알 수 없는 이름·경로 조작은 400', async () => {
    for (const n of ['foo', '../package', '..%2Fpackage', 'elements.json', '']) {
      expect((await GET({} as never, ctx(n))).status).toBe(400);
      expect((await post(n, [])).status).toBe(400);
    }
  });
  it('GET은 한글이 그대로 온다', async () => {
    const r = await GET({} as never, ctx('elements'));
    expect((await r.json())[0].name).toBe('수소');
  });
  it('정상 저장: 들여쓰기·UTF-8 유지', async () => {
    const els = read('elements'); els[0].name = '수소2';
    expect((await post('elements', els)).status).toBe(200);
    const raw = fs.readFileSync(path.join(tmp, 'public/data/elements.json'), 'utf-8');
    expect(raw).toContain('"name": "수소2"');
    expect(raw.endsWith('\n')).toBe(true);
  });
  it('스키마 어긋남·깨진 JSON은 400, 파일 안 바뀜', async () => {
    const before = fs.readFileSync(path.join(tmp, 'public/data/elements.json'), 'utf-8');
    expect((await post('elements', [{ number: 1 }])).status).toBe(400);
    expect((await post('elements', '{oops')).status).toBe(400);
    expect(fs.readFileSync(path.join(tmp, 'public/data/elements.json'), 'utf-8')).toBe(before);
  });
  it('주문 step 대상이 없거나 퀴즈 정답이 범위 밖이면 400', async () => {
    const orders = read('orders'); orders[1].steps[0].target = 'ZZ';
    const r = await post('orders', orders);
    expect(r.status).toBe(400);
    expect((await r.json()).errors[0]).toContain('ZZ');
    const quiz = read('quiz-pool'); quiz[0].answer = 9;
    expect((await post('quiz-pool', quiz)).status).toBe(400);
  });
  it('참조되는 원소를 지우면 거부', async () => {
    const els = read('elements').filter((e: { symbol: string }) => e.symbol !== 'Na');
    expect((await post('elements', els)).status).toBe(400);
  });
  it('production은 403', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect((await post('elements', read('elements'))).status).toBe(403);
  });
});
