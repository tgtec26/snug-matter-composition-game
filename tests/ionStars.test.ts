import { describe, it, expect } from 'vitest';
import { ionStars, latticeConflictCells } from '../game/rules';

describe('ionStars', () => {
  it('실패마다 감점, 최소 1', () => {
    expect([0, 1, 2, 5].map(ionStars)).toEqual([3, 2, 1, 1]);
  });
});
describe('latticeConflictCells', () => {
  it('같은 전하 이웃 칸만 돌려준다', () => {
    expect(latticeConflictCells([['+', '-'], ['-', '+']])).toEqual([]);
    expect(latticeConflictCells([['+', '+'], [null, '-']]).sort()).toEqual(['0,0', '0,1']);
  });
});
