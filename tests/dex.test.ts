import { it, expect, beforeEach } from 'vitest';
import { loadDex, addToDex, clearDex } from '../game/dex';

beforeEach(() => { localStorage.clear(); clearDex(); });

it('새 항목이면 true, 이미 있으면 false, 판을 넘어 저장', () => {
  expect(addToDex('elements', 'H')).toBe(true);
  expect(addToDex('elements', 'H')).toBe(false);
  expect(loadDex().elements).toEqual(['H']);
  expect(JSON.parse(localStorage.getItem('particle-dex-v1')!).elements).toEqual(['H']);
});
it('localStorage가 깨져 있어도 빈 도감', () => {
  localStorage.setItem('particle-dex-v1', '{oops');
  expect(loadDex().molecules).toEqual([]);
});
