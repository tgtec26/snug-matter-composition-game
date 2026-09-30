import { describe, it, expect } from 'vitest';
import { atomStars } from '../game/rules';

describe('atomStars', () => {
  it('깔끔하면 3, 감점마다 1, 최소 1', () => {
    expect(atomStars(1, false, 0)).toBe(3);
    expect(atomStars(2, false, 0)).toBe(2);
    expect(atomStars(2, true, 1)).toBe(1);
    expect(atomStars(0, true, 0)).toBe(2);
  });
});
