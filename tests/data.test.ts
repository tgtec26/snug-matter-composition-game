import { it, expect } from 'vitest';
import elements from '../public/data/elements.json';
import molecules from '../public/data/molecules.json';
import ions from '../public/data/ions.json';
import orders from '../public/data/orders.json';
import quiz from '../public/data/quiz-pool.json';
import { pendingSteps } from '../game/rules';
import type { Dataset, Dex, Order } from '../game/types';

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

const d = { elements, molecules, ions } as unknown as Dataset;

it('주문 6개(0~5), 최종 주문은 1~4 완료 후 열림', () => {
  expect((orders as unknown as Order[]).map(o => o.id)).toEqual(['o0', 'o1', 'o2', 'o3', 'o4', 'o5']);
  expect((orders as unknown as Order[]).find(o => o.id === 'o5')!.unlockedAfter).toEqual(['o1', 'o2', 'o3', 'o4']);
});
it('주문의 step 대상은 데이터에 존재하고, 순서대로 하면 완료 가능', () => {
  for (const o of orders as unknown as Order[]) {
    for (const s of o.steps) {
      const ok = s.room === 'molecule' ? molecules.some(m => m.id === s.target)
        : s.room === 'ion' ? ions.some(i => i.id === s.target)
        : elements.some(e => e.symbol === s.target);
      expect(ok, `${o.id} ${s.room} ${s.target}`).toBe(true);
    }
    // 각 step을 완료할 때마다 도감에 등록한다고 가정해 비워지는지
    const dex: Dex = { elements: [], placed: [], molecules: [], ions: [], substances: [] };
    for (const s of o.steps) {
      ({ atom: dex.elements, table: dex.placed, molecule: dex.molecules, ion: dex.ions })[s.room].push(s.target);
    }
    expect(pendingSteps(o, dex)).toHaveLength(0);
  }
});
it('분자 step의 원자 원소는 주문 ingredients에 있음', () => {
  for (const o of orders as unknown as Order[]) for (const s of o.steps.filter(x => x.room === 'molecule')) {
    const m = d.molecules.find(x => x.id === s.target)!;
    expect(Object.keys(m.atoms).every(a => o.ingredients.includes(a))).toBe(true);
  }
});
it('퀴즈: 주문별 3문항 이상, 정답 인덱스가 보기 범위 안', () => {
  for (const id of ['o1', 'o2', 'o3', 'o4', 'o5']) {
    const qs = (quiz as { order: string; choices: string[]; answer: number }[]).filter(q => q.order === id);
    expect(qs.length).toBeGreaterThanOrEqual(3);
    for (const q of qs) {
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.choices.length);
    }
  }
});
