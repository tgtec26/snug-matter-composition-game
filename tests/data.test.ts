import { it, expect } from 'vitest';
import elements from '../public/data/elements.json';
import molecules from '../public/data/molecules.json';
import ions from '../public/data/ions.json';

it('원소 1~20 연속, 족·주기가 그림 Ⅳ-6과 일치', () => {
  expect(elements.map(e => e.number)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  const at = (s: string) => elements.find(e => e.symbol === s)!;
  expect([at('H').group, at('H').period]).toEqual([1, 1]);
  expect([at('He').group, at('He').period]).toEqual([18, 1]);
  expect([at('Na').group, at('Na').period]).toEqual([1, 3]);
  expect([at('Cl').group, at('Cl').period]).toEqual([17, 3]);
  expect([at('Ca').group, at('Ca').period]).toEqual([2, 4]);
});
it('중성자수는 수소·탄소·산소에만', () => {
  expect(elements.filter(e => 'neutrons' in e).map(e => [e.symbol, (e as { neutrons: number }).neutrons]))
    .toEqual([['H', 0], ['C', 6], ['O', 8]]);
});
it('분자 목록은 교과서 12종 + He', () => {
  expect(molecules.map(m => m.formula).sort()).toEqual(
    ['CH₄', 'CO', 'CO₂', 'Cl₂', 'H₂', 'H₂O', 'H₂O₂', 'HCl', 'He', 'N₂', 'NH₃', 'O₂', 'O₃'].sort());
});
it('분자 kind는 원자 종류 수와 일치, 원자는 모두 원소 목록에 있음', () => {
  const syms = new Set(elements.map(e => e.symbol));
  for (const m of molecules) {
    expect(Object.keys(m.atoms).every(s => syms.has(s))).toBe(true);
    expect(m.kind).toBe(Object.keys(m.atoms).length === 1 ? '원소' : '화합물');
  }
});
it('이온 7종, 양이온은 (-)극·음이온은 (+)극', () => {
  expect(ions.map(i => i.formula)).toEqual(['H⁺', 'Li⁺', 'Na⁺', 'K⁺', 'Mg²⁺', 'Cl⁻', 'O²⁻']);
  for (const i of ions) expect(i.pole).toBe(i.charge > 0 ? '(-)극' : '(+)극');
  expect(ions.find(i => i.symbol === 'Cl')!.name).toBe('염화 이온');
  expect(ions.find(i => i.symbol === 'O')!.name).toBe('산화 이온');
});
