import type { Dex } from '@/game/types';
const KEY = 'particle-dex-v1';
const empty = (): Dex => ({ elements: [], placed: [], molecules: [], ions: [], substances: [] });
let cache: Dex | null = null;

export function loadDex(): Dex {
  if (cache) return cache;
  try { cache = { ...empty(), ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { cache = empty(); }
  return cache!;
}
export function addToDex(kind: keyof Dex, id: string): boolean {
  const dex = loadDex();
  if (dex[kind].includes(id)) return false;
  dex[kind] = [...dex[kind], id];
  try { localStorage.setItem(KEY, JSON.stringify(dex)); } catch { /* 저장 실패해도 진행 */ }
  return true;
}
export function clearDex() { cache = null; try { localStorage.removeItem(KEY); } catch { /* */ } }
