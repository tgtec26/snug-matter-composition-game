import { describe, it, expect } from 'vitest';
import elements from '../public/data/elements.json';
import molecules from '../public/data/molecules.json';
import ions from '../public/data/ions.json';
import type { Dataset, Dex, Order } from '../game/types';
import {
  identifyAtom, placeInTable, identifyMolecule, canGrow, liveFormula, classify, linearOrder,
  makeIon, checkLattice, pendingSteps, orderDone, isOrderOpen,
} from '../game/rules';

const d = { elements, molecules, ions } as unknown as Dataset;
const emptyDex: Dex = { elements: [], placed: [], molecules: [], ions: [], substances: [] };

describe('identifyAtom', () => {
  it('양성자수 1~20 → 원소 20건', () => {
    for (let p = 1; p <= 20; p++) {
      const r = identifyAtom(d, p, p);
      expect(r.ok && r.element.number).toBe(p);
    }
  });
  it('전자 수 ≠ 양성자수 → 중성 아님', () => {
    const r = identifyAtom(d, 11, 10);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toBe('charged');
  });
  it('범위 밖', () => { expect(identifyAtom(d, 21, 21).ok).toBe(false); expect(identifyAtom(d, 0, 0).ok).toBe(false); });
  it('튜토리얼 중성자 대조: H0 C6 O8, 틀리면 불가, 생략하면 판정 없음', () => {
    expect(identifyAtom(d, 1, 1, 0).ok).toBe(true);
    expect(identifyAtom(d, 6, 6, 6).ok).toBe(true);
    expect(identifyAtom(d, 8, 8, 8).ok).toBe(true);
    expect(identifyAtom(d, 6, 6, 7).ok).toBe(false);
    expect(identifyAtom(d, 11, 11, 99).ok).toBe(true);   // 교과서에 없는 중성자수는 판정하지 않는다
  });
});

describe('placeInTable', () => {
  it('20개 원소 모두 자기 자리에서 통과', () => {
    for (const e of elements) expect(placeInTable(d, e.symbol, e.period, e.group).ok).toBe(true);
  });
  it('틀린 자리 불가', () => { expect(placeInTable(d, 'Na', 2, 1).ok).toBe(false); });
});

describe('identifyMolecule', () => {
  const id = (a: string[]) => { const r = identifyMolecule(d, a); return r.ok ? r.molecule.id : null; };
  it('H₂O ≠ H₂O₂, O₂ ≠ O₃, CO ≠ CO₂', () => {
    expect(id(['H', 'H', 'O'])).toBe('H2O');
    expect(id(['H', 'H', 'O', 'O'])).toBe('H2O2');
    expect(id(['O', 'O'])).toBe('O2');
    expect(id(['O', 'O', 'O'])).toBe('O3');
    expect(id(['C', 'O'])).toBe('CO');
    expect(id(['C', 'O', 'O'])).toBe('CO2');
  });
  it('순서 무관, He 1개도 분자', () => { expect(id(['O', 'H', 'H'])).toBe('H2O'); expect(id(['He'])).toBe('He'); });
  it('목록 밖 조합 불가', () => { expect(id(['H', 'H', 'H'])).toBeNull(); expect(id(['N', 'O'])).toBeNull(); });
});

describe('canGrow / liveFormula', () => {
  it('목록 분자의 일부면 붙을 수 있음', () => {
    expect(canGrow(d, ['H'])).toBe(true);
    expect(canGrow(d, ['H', 'H'])).toBe(true);
    expect(canGrow(d, ['H', 'H', 'O'])).toBe(true);
    expect(canGrow(d, ['H', 'H', 'H'])).toBe(true);    // CH₄·NH₃의 일부 (순서 무관하게 쌓임)
    expect(canGrow(d, ['H', 'H', 'H', 'H', 'H'])).toBe(false);   // 목록 분자에 H 5개는 없음
    expect(canGrow(d, ['N', 'O'])).toBe(false);
  });
  it('화학식 실시간 표기 (1 생략, 오른쪽 아래 숫자)', () => {
    expect(liveFormula(['H'])).toBe('H');
    expect(liveFormula(['H', 'H'])).toBe('H₂');
    expect(liveFormula(['O', 'H', 'H'])).toBe('H₂O');
    expect(liveFormula(['C', 'O', 'O'])).toBe('CO₂');
    expect(liveFormula(['H', 'N', 'H', 'H'])).toBe('NH₃');
    expect(liveFormula(['H', 'Cl'])).toBe('HCl');
  });
});

describe('classify', () => {
  it('원소: O₃·N₂·He, 화합물: H₂O·CO₂·NH₃', () => {
    for (const a of [['O', 'O', 'O'], ['N', 'N'], ['He']]) expect(classify(a)).toBe('원소');
    for (const a of [['H', 'H', 'O'], ['C', 'O', 'O'], ['N', 'H', 'H', 'H']]) expect(classify(a)).toBe('화합물');
  });
});

describe('makeIon', () => {
  it('7종 정답', () => {
    const cases: [string, number, string, string][] = [
      ['Na', 1, 'Na⁺', '나트륨 이온'], ['Cl', -1, 'Cl⁻', '염화 이온'], ['O', -2, 'O²⁻', '산화 이온'],
      ['Mg', 2, 'Mg²⁺', '마그네슘 이온'], ['H', 1, 'H⁺', '수소 이온'], ['Li', 1, 'Li⁺', '리튬 이온'], ['K', 1, 'K⁺', '칼륨 이온'],
    ];
    for (const [s, c, f, n] of cases) {
      const r = makeIon(d, s, c);
      expect(r.ok && [r.ion.formula, r.ion.name]).toEqual([f, n]);
    }
  });
  it('Na²⁺ 불가', () => { expect(makeIon(d, 'Na', 2).ok).toBe(false); });
  it('불가 안내는 원소 이름과 조사로 (Cl는 X)', () => {
    const r = makeIon(d, 'Cl', -2);
    expect(!r.ok && r.hint).toBe('교과서에 없는 이온이에요 — 염소는 전자 1개를 얻어요');
    const m = makeIon(d, 'Mg', 1);
    expect(!m.ok && m.hint).toBe('교과서에 없는 이온이에요 — 마그네슘은 전자 2개를 잃어요');
  });
});

describe('checkLattice', () => {
  const P = '+', N = '-';
  it('번갈아 채운 4×4 = 완성', () => {
    const g = [[P, N, P, N], [N, P, N, P], [P, N, P, N], [N, P, N, P]] as const;
    expect(checkLattice(g.map(r => [...r]))).toEqual({ complete: true, conflicts: 0 });
  });
  it('같은 전하가 이웃하면 충돌', () => {
    const g = [[P, P, P, N], [N, P, N, P], [P, N, P, N], [N, P, N, P]] as const;
    const r = checkLattice(g.map(r => [...r]));
    expect(r.complete).toBe(false); expect(r.conflicts).toBeGreaterThan(0);
  });
  it('빈 칸이 있으면 미완성', () => {
    const g = [[P, N, null, N], [N, P, N, P], [P, N, P, N], [N, P, N, P]];
    expect(checkLattice(g).complete).toBe(false);
  });
});

describe('주문 진행', () => {
  const o: Order = {
    id: 'o2', title: '공기', ingredients: [], accept: '', done: '',
    steps: [{ room: 'atom', target: 'N' }, { room: 'table', target: 'N' }, { room: 'molecule', target: 'N2' }],
  };
  it('도감에 있는 원소·분자는 건너뜀', () => {
    expect(pendingSteps(o, emptyDex)).toHaveLength(3);
    const dex = { ...emptyDex, elements: ['N'], placed: ['N'] };
    expect(pendingSteps(o, dex).map(s => s.target)).toEqual(['N2']);
  });
  it('모두 등록되면 완료', () => {
    expect(orderDone(o, emptyDex)).toBe(false);
    expect(orderDone(o, { ...emptyDex, elements: ['N'], placed: ['N'], molecules: ['N2'] })).toBe(true);
  });
  it('최종 주문 잠금: 1~4 완료 후 열림', () => {
    const fin = { ...o, id: 'o5', unlockedAfter: ['o1', 'o2', 'o3', 'o4'] };
    expect(isOrderOpen(fin, ['o1', 'o2', 'o3'])).toBe(false);
    expect(isOrderOpen(fin, ['o1', 'o2', 'o3', 'o4'])).toBe(true);
    expect(isOrderOpen(o, [])).toBe(true);
  });
});

describe('linearOrder', () => {
  it('CO₂는 산소-탄소-산소 순서', () => expect(linearOrder('CO2', ['C', 'O', 'O'])).toEqual(['O', 'C', 'O']));
  it('목록에 없는 분자는 그대로', () => expect(linearOrder('H2O', ['H', 'H', 'O'])).toEqual(['H', 'H', 'O']));
});
