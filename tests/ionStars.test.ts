import { describe, it, expect } from 'vitest';
import { ionStars, latticeConflictCells } from '../game/rules';

describe('ionStars', () => {
  it('실패마다 감점, 최소 1', () => {
    expect([0, 1, 2, 5].map(f => ionStars(f))).toEqual([3, 2, 1, 1]);
  });
  it('격자 오배치가 한 번이라도 있으면 1개 더 감점, 최소 1', () => {
    expect(ionStars(0, 1)).toBe(2);
    expect(ionStars(0, 4)).toBe(2);
    expect(ionStars(1, 2)).toBe(1);
    expect(ionStars(2, 3)).toBe(1);
  });
});
describe('latticeConflictCells', () => {
  it('같은 전하 이웃 칸만 돌려준다', () => {
    expect(latticeConflictCells([['+', '-'], ['-', '+']])).toEqual([]);
    expect(latticeConflictCells([['+', '+'], [null, '-']]).sort()).toEqual(['0,0', '0,1']);
  });
});
