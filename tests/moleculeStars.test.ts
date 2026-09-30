import { describe, it, expect } from 'vitest';
import { moleculeStars } from '../game/rules';

describe('moleculeStars', () => {
  it('뗀 횟수·시간 초과마다 감점, 최소 1', () => {
    expect(moleculeStars(0, false)).toBe(3);
    expect(moleculeStars(2, false)).toBe(2);
    expect(moleculeStars(3, false)).toBe(1);
    expect(moleculeStars(0, true)).toBe(2);
    expect(moleculeStars(5, true)).toBe(1);
  });
});
