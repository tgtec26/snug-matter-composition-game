import { describe, it, expect } from 'vitest';
import { cardMatch, nextPos, cardGameStars } from '../game/rules';

describe('원소 카드 놀이', () => {
  it('말이 놓인 카드와 같은 번호일 때만 일치', () => {
    expect(cardMatch(3, 3)).toBe(true);
    expect(cardMatch(3, 4)).toBe(false);
  });
  it('한 칸씩 돌아 12칸째에 처음으로', () => {
    expect(nextPos(0, 12)).toBe(1);
    expect(nextPos(11, 12)).toBe(0);
  });
  it('틀린 횟수에 따른 별', () => {
    expect(cardGameStars(0)).toBe(3);
    expect(cardGameStars(5)).toBe(2);
    expect(cardGameStars(9)).toBe(1);
  });
});
