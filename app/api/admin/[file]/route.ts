import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { DATA_FILES, VALIDATORS, crossErrors, type DataFile } from '@/game/systems/validators';

const isDataFile = (f: string): f is DataFile => (DATA_FILES as readonly string[]).includes(f);
const filePath = (f: DataFile) => path.resolve(process.cwd(), 'public', 'data', `${f}.json`);
const readJson = async (f: DataFile) => JSON.parse(await fs.readFile(filePath(f), 'utf-8'));

export async function GET(_req: NextRequest, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  if (!isDataFile(file)) return NextResponse.json({ error: 'unknown file' }, { status: 400 });
  try {
    return NextResponse.json(await readJson(file));
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ file: string }> }) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Admin API disabled in production' }, { status: 403 });
  }
  const { file } = await ctx.params;
  if (!isDataFile(file)) return NextResponse.json({ error: 'unknown file' }, { status: 400 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid JSON' }, { status: 400 }); }
  const errors = VALIDATORS[file](body as never);
  if (errors.length) return NextResponse.json({ errors }, { status: 400 });
  try {
    const refs = ['elements', 'molecules', 'ions', 'orders', 'quiz-pool'] as const;
    const merged = Object.fromEntries(await Promise.all(refs.map(async f => [f, f === file ? body : await readJson(f)])));
    const cross = crossErrors(merged);
    if (cross.length) return NextResponse.json({ errors: cross }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'data read failed' }, { status: 500 });
  }
  await fs.writeFile(filePath(file), JSON.stringify(body, null, 2) + '\n', 'utf-8');
  return NextResponse.json({ ok: true, file: `${file}.json` });
}
