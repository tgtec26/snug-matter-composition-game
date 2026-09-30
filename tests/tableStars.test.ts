import { describe, it, expect } from 'vitest';
import { tableStars } from '../game/rules';

describe('tableStars', () => {
  it('오배치·시간 초과마다 감점, 최소 1', () => {
    expect(tableStars(0, false)).toBe(3);
    expect(tableStars(1, false)).toBe(2);
    expect(tableStars(3, false)).toBe(1);
    expect(tableStars(0, true)).toBe(2);
    expect(tableStars(5, true)).toBe(1);
  });
});
