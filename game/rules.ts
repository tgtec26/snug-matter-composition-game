import type { Dataset, Dex, Element, Ion, Molecule, Order, Step } from '@/game/types';

const SUB = '₀₁₂₃₄₅₆₇₈₉';
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const map = (n: number, t: string) => String(n).replace(/\d/g, c => t[+c]);
/** 개수 1이면 생략 (교과서 화학식 규칙) */
export const toSub = (n: number) => (n === 1 ? '' : map(n, SUB));
export const toSup = (n: number, sign: '+' | '-') => (n === 1 ? '' : map(n, SUP)) + (sign === '+' ? '⁺' : '⁻');

type Fail<R extends string = string> = { ok: false; reason: R; hint: string };
const fail = <R extends string>(reason: R, hint: string): Fail<R> => ({ ok: false, reason, hint });

const count = (atoms: string[]) => {
  const c: Record<string, number> = {};
  for (const a of atoms) c[a] = (c[a] ?? 0) + 1;
  return c;
};

export function identifyAtom(d: Dataset, protons: number, electrons: number, neutrons?: number):
  { ok: true; element: Element } | Fail<'range' | 'charged' | 'neutron'> {
  const element = d.elements.find(e => e.number === protons);
  if (!element) return fail('range', '양성자는 1~20개까지만 다뤄요');
  if (electrons !== protons) return fail('charged', '전자 수가 양성자수와 달라서 전기적으로 중성이 아니에요 — 이온은 이온 공방에서');
  if (element.neutrons !== undefined && neutrons !== undefined && neutrons !== element.neutrons)
    return fail('neutron', `${element.name}의 중성자는 ${element.neutrons}개예요`);
  return { ok: true, element };
}

export function placeInTable(d: Dataset, symbol: string, period: number, group: number): { ok: true } | Fail<'place'> {
  const e = d.elements.find(x => x.symbol === symbol);
  if (e && e.period === period && e.group === group) return { ok: true };
  return fail('place', '원자 번호순으로 놓아요 — 세로줄이 족, 가로줄이 주기');
}

export function identifyMolecule(d: Dataset, atoms: string[]): { ok: true; molecule: Molecule } | Fail<'none'> {
  const c = count(atoms);
  const key = Object.keys(c).sort().map(k => `${k}${c[k]}`).join();
  const molecule = d.molecules.find(m => Object.keys(m.atoms).sort().map(k => `${k}${m.atoms[k]}`).join() === key);
  return molecule ? { ok: true, molecule } : fail('none', '교과서에 없는 조합이라 붙지 않아요');
}

/** 지금 원자들이 목록 분자 중 하나의 일부이면 true → 더 붙일 수 있다 */
export function canGrow(d: Dataset, atoms: string[]): boolean {
  const c = count(atoms);
  return d.molecules.some(m => Object.keys(c).every(k => (m.atoms[k] ?? 0) >= c[k]));
}

const ORDER = ['C', 'N', 'H', 'O', 'Cl'];   // CO₂ CH₄ NH₃ H₂O HCl 표기 순서
export function liveFormula(atoms: string[]): string {
  const c = count(atoms);
  const keys = Object.keys(c).sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99));
  return keys.map(k => k + toSub(c[k])).join('');
}

export const classify = (atoms: string[]): '원소' | '화합물' =>
  Object.keys(count(atoms)).length === 1 ? '원소' : '화합물';

export function makeIon(d: Dataset, symbol: string, charge: number): { ok: true; ion: Ion } | Fail<'ion'> {
  const ion = d.ions.find(i => i.symbol === symbol && i.charge === charge);
  if (ion) return { ok: true, ion };
  const e = d.ions.find(i => i.symbol === symbol);
  return fail('ion', e ? `교과서에 없는 이온이에요 — ${e.symbol}는 전자 ${Math.abs(e.charge)}개를 ${e.charge > 0 ? '잃어요' : '얻어요'}` : '교과서에 없는 이온이에요');
}

/** 4×4 등 격자: '+' | '-' | null. 상하좌우 이웃이 같은 전하면 충돌 */
export function checkLattice(grid: (string | null)[][]): { complete: boolean; conflicts: number } {
  let conflicts = 0; let filled = 0; let total = 0;
  grid.forEach((row, r) => row.forEach((v, c) => {
    total++;
    if (!v) return;
    filled++;
    if (grid[r][c + 1] === v) conflicts++;
    if (grid[r + 1]?.[c] === v) conflicts++;
  }));
  return { complete: filled === total && conflicts === 0, conflicts };
}

const registered = (s: Step, dex: Dex) => {
  switch (s.room) {
    case 'atom': return dex.elements.includes(s.target);
    case 'table': return dex.placed.includes(s.target);
    case 'molecule': return dex.molecules.includes(s.target);
    case 'ion': return dex.ions.includes(s.target);
  }
};
export const pendingSteps = (o: Order, dex: Dex): Step[] => o.steps.filter(s => !registered(s, dex));
export const orderDone = (o: Order, dex: Dex) => pendingSteps(o, dex).length === 0;
export const isOrderOpen = (o: Order, doneOrders: string[]) => (o.unlockedAfter ?? []).every(id => doneOrders.includes(id));

/** 원자 조립기 별점: 3개에서 넣었다 뺀 횟수 2회 이상·시간 초과·실패 경험마다 1개씩 감점 (최소 1) */
export const atomStars = (wobble: number, overTime: boolean, fails: number) =>
  Math.max(1, 3 - (wobble > 1 ? 1 : 0) - (overTime ? 1 : 0) - (fails > 0 ? 1 : 0));

/** 주기율표 광장 별점: 오배치 1~2회 -1, 3회 이상 -2, 시간 초과 -1 (최소 1) */
export const tableStars = (misses: number, overTime: boolean) =>
  Math.max(1, 3 - (misses > 2 ? 2 : misses > 0 ? 1 : 0) - (overTime ? 1 : 0));

/** 분자 조립소 별점: 붙였다 뗀 횟수 1~2회 -1, 3회 이상 -2, 시간 초과 -1 (최소 1) */
export const moleculeStars = (detaches: number, overTime: boolean) =>
  Math.max(1, 3 - (detaches > 2 ? 2 : detaches > 0 ? 1 : 0) - (overTime ? 1 : 0));

/** 이온 공방 별점: 확인 버튼을 눌러 틀린 횟수 1회 -1, 2회 이상 -2 (최소 1) */
export const ionStars = (fails: number) => Math.max(1, 3 - Math.min(fails, 2));

/** 격자에서 같은 전하 이웃과 붙은 칸들 ("r,c") */
export function latticeConflictCells(grid: (string | null)[][]): string[] {
  const out = new Set<string>();
  grid.forEach((row, r) => row.forEach((v, c) => {
    if (!v) return;
    if (grid[r][c + 1] === v) { out.add(`${r},${c}`); out.add(`${r},${c + 1}`); }
    if (grid[r + 1]?.[c] === v) { out.add(`${r},${c}`); out.add(`${r + 1},${c}`); }
  }));
  return [...out];
}
