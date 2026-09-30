# 입자 공작소 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 스펙(`docs/superpowers/specs/2026-09-30-matter-composition-design.md`) 그대로, 튜토리얼 + 주문 5개(한 판 12분 내외)로 끝까지 플레이 가능한 입자 공작소 MVP를 만든다.

**Architecture:** 순수 함수 `game/rules.ts`(판정) + zustand `game/store.ts`(단계 전이, persist) + `game/dex.ts`(도감 누적) 위에, 방 4개는 React 오버레이(드래그·드롭), 배경·연출은 Phaser 씬이 얹힌다. 콘텐츠는 `public/data/*.json`을 `dataStore`가 fetch·검증. 규칙 함수는 데이터셋을 첫 인자로 받아(`d: Dataset`) 테스트에서 JSON을 그대로 넣는다.

**Tech Stack:** Next.js 16.3.6, React 19.2.8, Phaser 4.2, zustand 5, Tailwind 4, TypeScript 5, Vitest 4(jsdom), pnpm 10. 새 의존성 없음 (`html-to-image` 이미 있음).

**공통 규칙 (모든 태스크)**
- 커밋 전 1회: `git config user.name "tgtec26" && git config user.email "tgtec26@snu-g.ms.kr"`. 커밋 메시지 끝에 `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- 태스크 끝 검증: `pnpm test && pnpm typecheck && pnpm lint`. UI 태스크는 추가로 `pnpm dev`(포트 3400) → Chrome `open -a "Google Chrome" http://localhost:3400`, 1280×800에서 눈으로 확인. 푸시는 UI 확인 후 (AGENTS.md 푸시 조건).
- 이모지 금지, 플레이스홀더는 도형·텍스트. 한글은 `word-break: keep-all`.
- 교과서 밖 원소·분자·이온 금지, 결합 종류·전자 껍질 언급 금지 (AGENTS.md).
- 이식 원본: `../snug-rock-cycle-game` (통째 복사 금지, 필요한 것만 옮겨 고친다).

---

## 파일 구조

```
game/
  types.ts            타입 (Element, Molecule, Ion, Order, Step, Dex, Phase …)
  rules.ts            판정 규칙 단일 출처 (순수 함수)
  dex.ts              도감 누적 (localStorage 'particle-dex-v1')
  store.ts            단계 전이 (persist 'particle-run-v1')
  dataStore.ts        JSON fetch·검증 (이식)
  audio.ts            음원 재생 (이식)
  phaserConfig.ts     Phaser 설정 (이식)
  systems/            validators.ts, render.ts, placeholders.ts, sceneRouter.ts (이식·수정)
  scenes/             BootScene, WorkshopScene, RoomScene
components/
  GameContainer.tsx HUD.tsx UIOverlay.tsx TopControls.tsx AudioRunner.tsx  (이식)
  hooks/useDrag.ts    hooks/useLock.ts
  overlays/           DialogBox, TitleOverlay, IntroOverlay, OrderBoardOverlay,
                      AtomBuilderOverlay, PeriodicTableOverlay, MoleculeBenchOverlay,
                      ClassifyOverlay, IonWorkshopOverlay, ElementCardGameOverlay,
                      ParticleCardView, ResultOverlay, QuizOverlay, EndingOverlay, SummaryOverlay
app/admin/ app/api/admin/[file]/route.ts   (이식)
public/data/  elements molecules ions substances orders minigame-config dialog-config quiz-pool  (.json)
tests/        rules.test.ts data.test.ts dex.test.ts store.test.ts
```

---

## Task 1: 타입과 핵심 데이터 (원소·분자·이온)

**Files:**
- Create: `game/types.ts`, `public/data/elements.json`, `public/data/molecules.json`, `public/data/ions.json`
- Test: `tests/data.test.ts`

- [ ] **Step 1: 타입 작성** — `game/types.ts`

```ts
export interface Element {
  number: number; symbol: string; name: string; group: number; period: number;
  state: '기체' | '액체' | '고체';
  neutrons?: number;   // 교과서 145쪽: 수소 0, 탄소 6, 산소 8 만
  page: number;        // 그림 Ⅳ-6 쪽수
}
export interface Molecule {
  id: string; formula: string; name: string;
  atoms: Record<string, number>;   // 원소 기호 → 개수
  kind: '원소' | '화합물';
  card: string; page: number;
}
export interface Ion {
  id: string; symbol: string;      // 원소 기호
  charge: number;                  // +1, -1, +2, -2
  formula: string; name: string; pole: '(-)극' | '(+)극';
}
export interface Dataset { elements: Element[]; molecules: Molecule[]; ions: Ion[]; }

export type Room = 'atom' | 'table' | 'molecule' | 'ion';
export interface Step { room: Room; target: string; }   // target = 원소 기호 | 분자 id | 이온 id
export interface Order {
  id: string; title: string; ingredients: string[];
  steps: Step[]; unlockedAfter?: string[];
  accept: string; done: string;
}
export interface Dex { elements: string[]; placed: string[]; molecules: string[]; ions: string[]; substances: string[]; }
export type Phase =
  | 'title' | 'intro' | 'orders' | 'accept' | 'room' | 'classify'
  | 'result' | 'quiz' | 'ending' | 'summary';
```

- [ ] **Step 2: 실패하는 데이터 테스트** — `tests/data.test.ts`

```ts
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
  expect(elements.filter(e => e.neutrons !== undefined).map(e => [e.symbol, e.neutrons]))
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
```

- [ ] **Step 3: 실패 확인** — `pnpm test tests/data.test.ts` → FAIL (json 없음)

- [ ] **Step 4: 데이터 작성**
  - `elements.json` (배열, 20개). 필드 `number,symbol,name,group,period,state,page` (+ `neutrons`). 값:
    H 수소 1/1 기체 n0 · He 헬륨 18/1 기체 · Li 리튬 1/2 고체 · Be 베릴륨 2/2 고체 · B 붕소 13/2 고체 · C 탄소 14/2 고체 n6 · N 질소 15/2 기체 · O 산소 16/2 기체 n8 · F 플루오린 17/2 기체 · Ne 네온 18/2 기체 · Na `나트륨(소듐)` 1/3 고체 · Mg 마그네슘 2/3 고체 · Al 알루미늄 13/3 고체 · Si 규소 14/3 고체 · P 인 15/3 고체 · S 황 16/3 고체 · Cl 염소 17/3 기체 · Ar 아르곤 18/3 기체 · K `칼륨(포타슘)` 1/4 고체 · Ca 칼슘 2/4 고체. `page`는 전부 `147`. **상온 상태·족·주기가 교과서 그림 Ⅳ-6(147쪽)과 다르면 교과서를 우선**하고 위 값을 고친다 (교과서 원문은 구글 드라이브).
  - `molecules.json` (배열, 13개). 각 항목 `{id, formula, name, atoms, kind, card, page}`. id는 formula의 ASCII 형태(`H2O`, `O3`, `He`). 이름: 수소·산소·질소·염소·오존·물·과산화 수소·일산화 탄소·이산화 탄소·메테인·암모니아·염화 수소·헬륨. `card`는 한 줄(예: 물: `"수소 원자 2개와 산소 원자 1개로 이루어진 분자. 나누면 물의 성질이 사라져요."`). `page`: 원소 분자 155, 나머지 142~143·155 중 교과서 표기 기준.
  - `ions.json` (배열, 7개). `{id:'Na+', symbol:'Na', charge:1, formula:'Na⁺', name:'나트륨 이온', pole:'(-)극'}` 형식. 이름: 수소 이온·리튬 이온·나트륨 이온·칼륨 이온·마그네슘 이온·염화 이온·산화 이온.

- [ ] **Step 5: 통과 확인** — `pnpm test tests/data.test.ts` → PASS (필요하면 `tsconfig.json`에 `"resolveJsonModule": true` 확인)

- [ ] **Step 6: Commit**

```bash
git add game/types.ts public/data tests/data.test.ts
git commit -m "feat: 타입과 원소·분자·이온 데이터"
```

---

## Task 2: 판정 규칙 `game/rules.ts` (TDD)

**Files:** Create `game/rules.ts`; Test `tests/rules.test.ts`

- [ ] **Step 1: 실패하는 테스트** — `tests/rules.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import elements from '../public/data/elements.json';
import molecules from '../public/data/molecules.json';
import ions from '../public/data/ions.json';
import type { Dataset, Dex, Order } from '../game/types';
import {
  identifyAtom, placeInTable, identifyMolecule, canGrow, liveFormula, classify,
  makeIon, checkLattice, pendingSteps, orderDone, isOrderOpen,
} from '../game/rules';

const d = { elements, molecules, ions } as Dataset;
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
    expect(canGrow(d, ['H', 'H', 'H'])).toBe(false);   // NH₃가 아니라 H 3개만은 불가
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
```

- [ ] **Step 2: 실패 확인** — `pnpm test tests/rules.test.ts` → FAIL (`../game/rules` 없음)

- [ ] **Step 3: 구현** — `game/rules.ts`

```ts
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
```

- [ ] **Step 4: 통과 확인** — `pnpm test tests/rules.test.ts` → PASS. 실패 시 테스트가 아니라 구현을 고친다 (교과서 근거 규칙).

- [ ] **Step 5: Commit**

```bash
git add game/rules.ts tests/rules.test.ts
git commit -m "feat: 판정 규칙 rules.ts와 테스트"
```

---

## Task 3: 나머지 데이터 (물질·주문·대화·퀴즈·미니게임) + 검증기

**Files:** Create `public/data/{substances,orders,minigame-config,dialog-config,quiz-pool}.json`, `game/systems/validators.ts`; Modify `tests/data.test.ts`

- [ ] **Step 1: 실패하는 테스트 추가** — `tests/data.test.ts` 끝에

```ts
import orders from '../public/data/orders.json';
import quiz from '../public/data/quiz-pool.json';
import { pendingSteps } from '../game/rules';
import type { Dataset, Dex, Order } from '../game/types';

const d = { elements, molecules, ions } as Dataset;

it('주문 6개(0~5), 최종 주문은 1~4 완료 후 열림', () => {
  expect((orders as Order[]).map(o => o.id)).toEqual(['o0', 'o1', 'o2', 'o3', 'o4', 'o5']);
  expect((orders as Order[]).find(o => o.id === 'o5')!.unlockedAfter).toEqual(['o1', 'o2', 'o3', 'o4']);
});
it('주문의 step 대상은 데이터에 존재하고, 순서대로 하면 완료 가능', () => {
  for (const o of orders as Order[]) {
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
  for (const o of orders as Order[]) for (const s of o.steps.filter(x => x.room === 'molecule')) {
    const m = d.molecules.find(x => x.id === s.target)!;
    expect(Object.keys(m.atoms).every(a => o.ingredients.includes(a))).toBe(true);
  }
});
it('퀴즈: 주문별 3문항 이상, 정답 인덱스가 보기 범위 안', () => {
  for (const id of ['o1', 'o2', 'o3', 'o4', 'o5']) {
    const qs = (quiz as { order: string; choices: string[]; answer: number }[]).filter(q => q.order === id);
    expect(qs.length).toBeGreaterThanOrEqual(3);
    for (const q of qs) expect(q.answer).toBeGreaterThanOrEqual(0), expect(q.answer).toBeLessThan(q.choices.length);
  }
});
```

- [ ] **Step 2: 실패 확인** — `pnpm test tests/data.test.ts` → FAIL

- [ ] **Step 3: 데이터 작성**
  - `orders.json` — 스펙 4-1 표 그대로. 각 항목 `{id, title, ingredients:[원소 기호], steps:[{room,target}], unlockedAfter?, accept, done}`. `accept`·`done`은 박사 대사 **1~2문장**. `ingredients`는 원소 **기호**(`["H","O"]`).
    - o0 튜토리얼: steps = atom H·C·O, table H·C·O
    - o1 물: molecule `H2O`
    - o2 공기: atom N, table N, molecule `N2`·`O2`·`CO2`
    - o3 오존층: molecule `O3`
    - o4 소금: atom Na·Cl, table Na·Cl, ion `Na+`·`Cl-`
    - o5 바닷물(최종, unlockedAfter o1~o4): atom Mg, table Mg, molecule `H2O`, ion `Na+`·`Cl-`·`Mg2+`
  - `substances.json` — 주문 결과 물질 카드 `{id, name, components:[...], particle:'분자'|'이온'|'원자', order}` 5개(물·공기·오존·염화 나트륨·바닷물) + 157쪽 캔 음료 1개.
  - `minigame-config.json` — `{ atom:{seconds:45, dropRadius:70, slotCount:20}, table:{seconds:30, cell:{w:52,h:52}}, molecule:{seconds:60, snap:56}, ion:{seconds:60, lattice:4, dropRadius:44}, cardGame:{seconds:60} }`
  - `dialog-config.json` — `{ intro:[...박사 대사 3줄, 첫 줄은 "우리 주변의 물건은 무엇으로 이루어져 있을까?"], hints:{ atomCharged, tablePlace, moleculeNone, classifyWrong, ionNone, latticeOpposite } }` (hints 문구는 스펙 4-3 표의 "불가 안내" 그대로).
  - `quiz-pool.json` — 배열 `{id, order:'o1'..'o5', q, choices:[..], answer:idx, page, explain}`. 주문당 3~4문항, 원천은 교과서 발췌 문서 3장 35문항에서 옮긴다. o5에는 "양이온은 어느 극으로?"(답 (-)극) 포함.

- [ ] **Step 4: 검증기** — `game/systems/validators.ts` (rock-cycle 것을 열어 형식 참고, 파일명만 이 프로젝트 것으로)

```ts
export type DataFile = 'elements' | 'molecules' | 'ions' | 'substances' | 'orders' | 'minigame-config' | 'dialog-config' | 'quiz-pool';
const arr = (name: string, v: unknown) => (Array.isArray(v) && v.length ? [] : [`${name}: 비어 있거나 배열이 아님`]);
const need = (name: string, v: Record<string, unknown>[], keys: string[]) =>
  v.flatMap((o, i) => keys.filter(k => o[k] === undefined).map(k => `${name}[${i}].${k} 없음`));

export const VALIDATORS: Record<DataFile, (v: never) => string[]> = {
  elements: (v: Record<string, unknown>[]) => [...arr('elements', v), ...need('elements', v, ['number', 'symbol', 'name', 'group', 'period', 'state'])],
  molecules: (v: Record<string, unknown>[]) => [...arr('molecules', v), ...need('molecules', v, ['id', 'formula', 'name', 'atoms', 'kind', 'card'])],
  ions: (v: Record<string, unknown>[]) => [...arr('ions', v), ...need('ions', v, ['id', 'symbol', 'charge', 'formula', 'name', 'pole'])],
  substances: (v: Record<string, unknown>[]) => [...arr('substances', v), ...need('substances', v, ['id', 'name', 'components', 'particle'])],
  orders: (v: Record<string, unknown>[]) => [...arr('orders', v), ...need('orders', v, ['id', 'title', 'ingredients', 'steps', 'accept', 'done'])],
  'minigame-config': (v: Record<string, unknown>) => (['atom', 'table', 'molecule', 'ion'].filter(k => !v[k]).map(k => `minigame-config.${k} 없음`)),
  'dialog-config': (v: Record<string, unknown>) => (v.intro && v.hints ? [] : ['dialog-config: intro/hints 없음']),
  'quiz-pool': (v: Record<string, unknown>[]) => [...arr('quiz-pool', v), ...need('quiz-pool', v, ['id', 'order', 'q', 'choices', 'answer'])],
};
```

- [ ] **Step 5: 통과 확인** — `pnpm test && pnpm typecheck && pnpm lint` → PASS

- [ ] **Step 6: Commit**

```bash
git add public/data game/systems/validators.ts tests/data.test.ts
git commit -m "feat: 주문·물질·퀴즈·대화 데이터와 검증기"
```

---

## Task 4: 도감 `game/dex.ts` + 상태 `game/store.ts` (TDD)

**Files:** Create `game/dex.ts`, `game/store.ts`, `game/dataStore.ts`; Test `tests/dex.test.ts`, `tests/store.test.ts`

- [ ] **Step 1: dex 실패 테스트** — `tests/dex.test.ts`

```ts
import { it, expect, beforeEach } from 'vitest';
import { loadDex, addToDex, clearDex } from '../game/dex';

beforeEach(() => { localStorage.clear(); clearDex(); });

it('새 항목이면 true, 이미 있으면 false, 판을 넘어 저장', () => {
  expect(addToDex('elements', 'H')).toBe(true);
  expect(addToDex('elements', 'H')).toBe(false);
  expect(loadDex().elements).toEqual(['H']);
});
it('localStorage가 깨져 있어도 빈 도감', () => {
  localStorage.setItem('particle-dex-v1', '{oops');
  expect(loadDex().molecules).toEqual([]);
});
```

- [ ] **Step 2: dex 구현** — `game/dex.ts`

```ts
import type { Dex } from '@/game/types';
const KEY = 'particle-dex-v1';
const empty = (): Dex => ({ elements: [], placed: [], molecules: [], ions: [], substances: [] });
let cache: Dex | null = null;

export function loadDex(): Dex {
  if (cache) return cache;
  try { cache = { ...empty(), ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { cache = empty(); }
  return cache!;
}
export function addToDex(kind: keyof Dex, id: string): boolean {
  const dex = loadDex();
  if (dex[kind].includes(id)) return false;
  dex[kind] = [...dex[kind], id];
  try { localStorage.setItem(KEY, JSON.stringify(dex)); } catch { /* 저장 실패해도 진행 */ }
  return true;
}
export function clearDex() { cache = null; try { localStorage.removeItem(KEY); } catch { /* */ } }
```

- [ ] **Step 3: store 실패 테스트** — `tests/store.test.ts`

```ts
import { it, expect, beforeEach } from 'vitest';
import elements from '../public/data/elements.json';
import molecules from '../public/data/molecules.json';
import ions from '../public/data/ions.json';
import orders from '../public/data/orders.json';
import { useDataStore } from '../game/dataStore';
import { useGameStore } from '../game/store';
import { clearDex, loadDex } from '../game/dex';
import type { Order } from '../game/types';

beforeEach(() => {
  localStorage.clear(); clearDex();
  useDataStore.setState({ elements, molecules, ions, orders: orders as Order[], loaded: true } as never);
  useGameStore.getState().reset();
});
const S = () => useGameStore.getState();

it('title → intro → orders(첫 판은 튜토리얼 주문 자동)', () => {
  S().start('아이');
  expect(S().phase).toBe('intro');
  S().next();
  expect(S().phase).toBe('accept');           // 튜토리얼 o0 자동 수락 화면
  expect(S().orderId).toBe('o0');
});
it('임의 phase 점프 금지: title에서 completeRoom 무시', () => {
  S().completeRoom({ room: 'atom', target: 'H', stars: 3 });
  expect(S().phase).toBe('title');
});
it('방 진행: step 순서·대상이 맞을 때만 진전', () => {
  S().start('a'); S().next(); S().acceptOrder('o0');
  expect(S().phase).toBe('room');
  S().completeRoom({ room: 'atom', target: 'C', stars: 3 });   // 순서 틀림
  expect(S().stepIdx).toBe(0);
  S().completeRoom({ room: 'atom', target: 'H', stars: 3 });
  expect(S().stepIdx).toBe(1);
  expect(loadDex().elements).toEqual(['H']);
});
it('분자 방 완료 → classify → (정답) result', () => {
  S().start('a'); S().next(); S().acceptOrder('o0');
  for (const t of ['H', 'C', 'O']) S().completeRoom({ room: 'atom', target: t, stars: 3 });
  for (const t of ['H', 'C', 'O']) S().completeRoom({ room: 'table', target: t, stars: 3 });
  expect(S().phase).toBe('result');           // 튜토리얼은 분자 방이 없어 곧장 결과
  S().next(); expect(S().phase).toBe('quiz' /* 튜토리얼도 퀴즈 1문항 */ );
});
it('classify 오답은 phase 유지·별 감점, 정답이면 진행', () => {
  S().start('a'); S().next(); S().acceptOrder('o1');
  S().completeRoom({ room: 'molecule', target: 'H2O', stars: 3 });
  expect(S().phase).toBe('classify');
  S().classify('원소');
  expect(S().phase).toBe('classify');
  S().classify('화합물');
  expect(S().phase).toBe('result');
});
it('최종 주문은 1~4 완료 전 수락 불가', () => {
  S().start('a'); S().next(); S().acceptOrder('o0'); // 튜토리얼 통과는 생략하고 강제 수락 시도
  useGameStore.setState({ phase: 'orders' });
  S().acceptOrder('o5');
  expect(S().phase).toBe('orders');
});
it('restartRun은 도감을 유지하고 진행만 초기화', () => {
  S().start('a'); S().next(); S().acceptOrder('o0');
  S().completeRoom({ room: 'atom', target: 'H', stars: 3 });
  S().restartRun();
  expect(S().phase).toBe('intro'); expect(S().doneOrders).toEqual([]);
  expect(loadDex().elements).toEqual(['H']);
});
```

  (튜토리얼 흐름: 첫 판은 `intro` 다음 `accept`로 o0가 자동 제시. 튜토리얼 이후엔 `orders`.)

- [ ] **Step 4: store 구현** — `game/store.ts`

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Phase, Step } from '@/game/types';
import { classify as classifyAtoms, isOrderOpen, pendingSteps } from '@/game/rules';
import { addToDex, loadDex } from '@/game/dex';
import { useDataStore } from '@/game/dataStore';

export interface GameState {
  nickname: string; phase: Phase;
  orderId: string | null; queue: Step[]; stepIdx: number;
  doneOrders: string[]; stars: number; mistakes: number;
  newCards: string[]; startedAt: number | null; elapsedMs: number;
  tutorialDone: boolean;
}
export interface RoomResult { room: Step['room']; target: string; stars: number; extra?: string[] }
interface Actions {
  start: (nickname: string) => void;
  next: () => void;
  acceptOrder: (id: string) => void;
  completeRoom: (r: RoomResult) => void;
  classify: (answer: '원소' | '화합물') => void;
  finishQuiz: (firstTry: boolean) => void;
  restartRun: () => void;
  reset: () => void;
}
const fresh = (): GameState => ({
  nickname: '', phase: 'title', orderId: null, queue: [], stepIdx: 0, doneOrders: [], stars: 0, mistakes: 0,
  newCards: [], startedAt: null, elapsedMs: 0, tutorialDone: false,
});
const KIND = { atom: 'elements', table: 'placed', molecule: 'molecules', ion: 'ions' } as const;
const order = (id: string | null) => useDataStore.getState().orders.find(o => o.id === id);
const moleculeAtoms = (id: string) => {
  const m = useDataStore.getState().molecules.find(x => x.id === id);
  return m ? Object.entries(m.atoms).flatMap(([k, n]) => Array<string>(n).fill(k)) : [];
};
/** 방을 마친 뒤 다음 phase: 남은 step이 있으면 room, 없으면 result */
const afterRoom = (queue: Step[], idx: number): Phase => (idx < queue.length ? 'room' : 'result');

export const useGameStore = create<GameState & Actions>()(persist((set, get) => ({
  ...fresh(),
  start: (nickname) => set({ ...fresh(), nickname, phase: 'intro', startedAt: Date.now(), tutorialDone: get().tutorialDone }),
  next: () => set(s => {
    if (s.phase === 'intro') return s.tutorialDone ? { phase: 'orders' } : { phase: 'accept', orderId: 'o0' };
    if (s.phase === 'result') return { phase: 'quiz' };
    if (s.phase === 'ending') return { phase: 'summary' };
    return {};
  }),
  acceptOrder: (id) => set(s => {
    const o = order(id);
    if (!o || !['orders', 'accept'].includes(s.phase) || !isOrderOpen(o, s.doneOrders)) return {};
    const queue = pendingSteps(o, loadDex());
    return { orderId: id, queue, stepIdx: 0, phase: afterRoom(queue, 0) };
  }),
  completeRoom: (r) => set(s => {
    const cur = s.queue[s.stepIdx];
    if (s.phase !== 'room' || !cur || cur.room !== r.room || cur.target !== r.target) return {};
    const fresh_ = addToDex(KIND[r.room], r.target);
    for (const x of r.extra ?? []) addToDex('molecules', x);   // 보너스: 다른 물질 카드
    const stepIdx = s.stepIdx + 1;
    const newCards = fresh_ ? [...s.newCards, r.target] : s.newCards;
    const base = { stepIdx, stars: s.stars + r.stars, newCards };
    return r.room === 'molecule' ? { ...base, phase: 'classify' } : { ...base, phase: afterRoom(s.queue, stepIdx) };
  }),
  classify: (answer) => set(s => {
    const cur = s.queue[s.stepIdx - 1];
    if (s.phase !== 'classify' || !cur) return {};
    if (classifyAtoms(moleculeAtoms(cur.target)) !== answer) return { mistakes: s.mistakes + 1, stars: Math.max(0, s.stars - 1) };
    return { phase: afterRoom(s.queue, s.stepIdx) };
  }),
  finishQuiz: (firstTry) => set(s => {
    if (s.phase !== 'quiz' || !s.orderId) return {};
    const doneOrders = s.doneOrders.includes(s.orderId) ? s.doneOrders : [...s.doneOrders, s.orderId];
    const stars = s.stars + (firstTry ? 1 : 0);
    const finished = ['o1', 'o2', 'o3', 'o4', 'o5'].every(id => doneOrders.includes(id));
    if (finished) return { doneOrders, stars, phase: 'ending', elapsedMs: s.startedAt ? Date.now() - s.startedAt : 0 };
    return { doneOrders, stars, phase: 'orders', orderId: null, tutorialDone: true };
  }),
  restartRun: () => set(s => ({ ...fresh(), nickname: s.nickname, phase: 'intro', startedAt: Date.now(), tutorialDone: true })),
  reset: () => set(fresh()),
}), { name: 'particle-run-v1', version: 1, storage: createJSONStorage(() => localStorage) }));
```

  `game/dataStore.ts`: rock-cycle `game/dataStore.ts`를 열어 같은 형식으로, 상태를 `{ elements, molecules, ions, substances, orders, minigame, dialog, quiz, loaded, error }`로, `load()`가 8개 JSON을 `Promise.all`로 fetch + `VALIDATORS` 검증(개발 모드에서만 throw)하게 만든다. `import type`은 `@/game/types`.

- [ ] **Step 5: 통과 확인** — `pnpm test` → 전체 PASS. 테스트 중 "튜토리얼은 분자 방이 없어 곧장 결과" 케이스는 `result → quiz` 확인까지. 통과 안 하면 store를 고친다.

- [ ] **Step 6: Commit**

```bash
git add game/dex.ts game/store.ts game/dataStore.ts tests
git commit -m "feat: 도감·데이터 스토어·게임 상태 전이"
```

---

## Task 5: 엔진 이식 + 타이틀·인트로까지 브라우저에서 보이기

**Files:** Create/이식: `game/phaserConfig.ts`, `game/audio.ts`, `game/systems/{render,placeholders,sceneRouter}.ts`, `game/scenes/{BootScene,WorkshopScene}.ts`, `components/{GameContainer,HUD,UIOverlay,TopControls,AudioRunner}.tsx`, `components/hooks/{useDrag,useLock}.ts`, `components/overlays/{DialogBox,TitleOverlay,IntroOverlay}.tsx`, `public/assets/audio/*.mp3`; Modify: `app/page.tsx`

- [ ] **Step 1: 원본 읽고 이식** — `../snug-rock-cycle-game`의 아래 파일을 **열어 읽고** 필요한 부분만 옮긴다 (rock/map/village 등 도메인 코드는 제거, import 경로 `@/…`).
  - `game/systems/render.ts`, `placeholders.ts` (그대로에 가깝게), `sceneRouter.ts`(아래 수정), `game/phaserConfig.ts`(씬 목록을 `[BootScene, WorkshopScene]`로), `game/audio.ts`
  - `components/GameContainer.tsx`, `HUD.tsx`(HUD 항목: 주문 이름·방 진행 n/m·별·경과 시간·도감 원소 n/20·분자 n/12·이온 n/7), `UIOverlay.tsx`(phase → 오버레이 매핑), `TopControls.tsx`(전체 화면·음소거, 클릭 후 `blur()`), `AudioRunner.tsx`, `overlays/DialogBox.tsx`, `TitleOverlay.tsx`, `IntroOverlay.tsx`
  - 음원 6개는 `../snug-rock-cycle-game/public/assets/audio/`에서 `public/assets/audio/`로 복사 (`correct/error/success/quiz-background/start_ending/mole_game`). 그림은 가져오지 않는다.
- [ ] **Step 2: sceneRouter 수정** — 이 게임은 씬이 둘뿐이라 단순화

```ts
import type * as Phaser from 'phaser';
import { useGameStore } from '@/game/store';
import type { Phase } from '@/game/types';

export function sceneFor(phase: Phase): 'Workshop' | 'Room' {
  return phase === 'room' || phase === 'classify' ? 'Room' : 'Workshop';
}
export function attachRouter(scene: Phaser.Scene) {
  const unsub = useGameStore.subscribe((s, prev) => {
    if (s.phase === prev.phase) return;
    const target = sceneFor(s.phase);
    if (target !== scene.scene.key) { unsub(); scene.scene.start(target); }
  });
  scene.events.once('shutdown', unsub);
  return unsub;
}
```

  `RoomScene`은 Task 7에서 추가하므로 이 시점엔 `sceneFor`가 항상 `'Workshop'`을 돌려주게 하거나 RoomScene 빈 껍데기(배경색만)를 함께 만든다 (후자 권장, 씬 키 `Room`).
- [ ] **Step 3: 입력 훅** — `components/hooks/useLock.ts` (6번 입력 잠금), `useDrag.ts` (드래그 공통, `pointerupoutside` 대응 = window 리스너)

```ts
// useLock.ts — 화면 전환 뒤 잠깐 입력 무시 (연타 방지)
import { useEffect, useState } from 'react';
export function useLock(ms = 900) {
  const [locked, setLocked] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLocked(false), ms); return () => clearTimeout(t); }, [ms]);
  return locked;
}
```

```ts
// useDrag.ts — 무대(1280×800) 좌표로 변환하는 드래그. 캔버스 밖에서 손을 떼도 종료된다.
import { useCallback, useRef, useState } from 'react';
export interface DragState { id: string; x: number; y: number }
export function useDrag(stage: React.RefObject<HTMLElement | null>, onDrop: (id: string, x: number, y: number) => void) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const cur = useRef<DragState | null>(null);
  const toStage = (e: PointerEvent | React.PointerEvent) => {
    const r = stage.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 1280, y: ((e.clientY - r.top) / r.height) * 800 };
  };
  const begin = useCallback((id: string, e: React.PointerEvent) => {
    e.preventDefault();
    const p = toStage(e); cur.current = { id, ...p }; setDrag(cur.current);
    const move = (ev: PointerEvent) => { const q = toStage(ev); cur.current = { id, ...q }; setDrag(cur.current); };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      const c = cur.current; cur.current = null; setDrag(null);
      if (c) onDrop(c.id, c.x, c.y);
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDrop]);
  return { drag, begin };
}
```

- [ ] **Step 4: `app/page.tsx` 교체** — 기존 letterbox 골격에 `GameContainer` + `UIOverlay`를 얹는다 (rock-cycle `app/page.tsx` 구조 참고). 데이터 로드는 `useDataStore.load()`를 마운트 시 1회.
- [ ] **Step 5: 브라우저 확인** — `pnpm dev` → `open -a "Google Chrome" http://localhost:3400`. 타이틀(시작 버튼) → 첫 터치에 전체 화면 → 인트로 박사 대사 → (다음은 Task 6). 음소거·전체 화면 버튼 동작, 새로고침해도 안 깨짐, 콘솔 오류 없음. 개발 훅 `__store`, `__game`, `__rules` 노출.
- [ ] **Step 6: `pnpm test && pnpm typecheck && pnpm lint`, Commit**

```bash
git add -A && git commit -m "feat: 엔진 이식과 타이틀·인트로"
```

---

## Task 6: 주문판 + 수락 대사 + 결과·퀴즈 흐름 (방 없이 한 바퀴)

**Files:** Create `components/overlays/{OrderBoardOverlay,ResultOverlay,QuizOverlay}.tsx`; Modify `components/UIOverlay.tsx`, `game/scenes/WorkshopScene.ts`

- [ ] **Step 1: OrderBoardOverlay** — 공작소 벽 주문서. 주문 5장 카드(#1~#4 + 최종). 각 카드: 제목, **구성 성분(원소 기호 칩)**, 완료 표시. 최종 카드는 `isOrderOpen` false면 자물쇠 도형 + 흐림. 카드를 **주문판 가운데 "수락" 자리로 드래그**하거나 탭 → `useGameStore.getState().acceptOrder(id)`. (탭은 키보드 Enter 대체.) 입장 후 `useLock(900)`.
- [ ] **Step 2: accept phase** — `DialogBox`로 `order.accept` 대사 1~2문장, 확인하면 `acceptOrder(order.id)` 호출해 `room`(또는 `result`)로. (튜토리얼 o0 자동 진입 경로 포함.)
- [ ] **Step 3: ResultOverlay** — 주문 완료: 물질 카드(`substances.json`: 구성 성분·구성 입자, 157쪽 형식) + `order.done` 박사 대사 1~2문장. 새 카드는 스케일 팝 + 반짝임 + 성공음. 확인 → `next()`.
- [ ] **Step 4: QuizOverlay** — rock-cycle `QuizOverlay`를 옮겨, `quiz-pool.json`에서 `order === orderId` 문항 중 무작위 1문항. 첫 시도 정답이면 `finishQuiz(true)`, 오답 후 재시도는 `finishQuiz(false)`. 오답 피드백 한 줄 + `explain`. 튜토리얼 o0는 `order` 매칭 문항이 없으므로 퀴즈를 건너뛰고 `finishQuiz(false)` 호출.
- [ ] **Step 5: 임시 방 통과 훅(개발 전용)** — `process.env.NODE_ENV !== 'production'`에서 `window.__skipRoom()` = 현재 `queue[stepIdx]`를 `completeRoom({..., stars:3})`. 방 오버레이(Task 7~10) 완성 전에 흐름만 확인하기 위한 도구. Task 10 이후 제거 여부는 유지해도 무방(개발 전용).
- [ ] **Step 6: 브라우저 확인** — 타이틀 → 인트로 → 튜토리얼 수락 → `__skipRoom()` 반복 → 결과 → 주문판 → 주문 1 수락 → … 최종 잠금·열림, 주문 5개 완료 시 엔딩(Task 11 전이라면 phase만 확인). 새로고침 이어하기.
- [ ] **Step 7: 검증·Commit** — `git commit -m "feat: 주문판과 결과·퀴즈 흐름"`

---

## Task 7: 원자 조립기 (5-1)

**Files:** Create `components/overlays/AtomBuilderOverlay.tsx`, `game/scenes/RoomScene.ts`(배경·연출 채움); Modify `components/UIOverlay.tsx`

- 대상 step: `room === 'atom'`, `target` = 원소 기호. 튜토리얼(o0)일 때만 중성자 판정 (`orderId === 'o0'`).
- 상태: `protons, neutrons, electrons`(정수, 0 시작 — 비튜토리얼은 `neutrons`를 원소에 맞게 미리 채움: 스펙 "박사가 넣어 둠", 중성자는 표시만).
- 화면(무대 1280×800 좌표): 원자핵 자리 (640, 380) 반지름 90, 전자 자리 = 반지름 200 원 위 20개 슬롯, 왼쪽 상자에 입자 3종(양성자·중성자·전자, 지름 56px = 터치 44px 이상).
- 조작: 상자 입자를 **드래그** → 원자핵(양성자·중성자) 또는 전자 슬롯(전자)에 놓기. 놓은 입자를 다시 밖으로 끌어내면 빠짐 (넣었다 뺀 횟수 `wobble`++). 원자핵 표시 `+{protons}`, **원소 이름은 `elements.find(number===protons)` 로 실시간**(0개면 빈칸).
- 키보드 대체: `P`/`N`/`E` 키로 각 입자 +1, `Shift+키` −1, Enter 완료.
- 완료 버튼(양성자 ≥1일 때 활성): `identifyAtom(d, protons, electrons, isTutorial ? neutrons : undefined)`.
  - 성공 → 별점 계산(`wobble`≤1 & 시간 여유 3, 아니면 2/1) → `completeRoom({room:'atom', target: element.symbol, stars})`. 단, **`element.symbol !== step.target`이면** 성공음 대신 힌트 "이건 {name}이야, 주문서는 {target 이름}" 후 계속 (store가 target 불일치를 무시하므로 UI에서 먼저 막는다).
  - 실패 → `hint` 한 줄 표시(`dialog-config.hints.atomCharged` 등), 별 1개 감점.
- 성공 피드백: 원자핵 스케일 팝 + 파티클 + 밝은 효과음(`correct.mp3`) + 카드 등록 연출. 실패는 짧은 흔들림 + `error.mp3`.
- 3D 느낌: 전자를 집으면 그림자가 멀어지고 1.15배, 원자핵은 그라데이션 구 + 하단 그림자 타원.
- 시간 표시는 막대(글자 없이). 상시 글자 최소.
- 검증: 1280×800, 수소(양성자 1·중성자 0·전자 1) → 카드, 나트륨 전자 부족 → 안내, 터치 드래그(브라우저 개발자도구 터치 에뮬레이션), 드래그 중 캔버스 밖에서 손 떼기, Enter/Space 연타. 튜토리얼에서 C(6·6·6)·O(8·8·8) 완료.
- Commit: `git commit -m "feat: 원자 조립기"`

---

## Task 8: 주기율표 광장 (5-2)

**Files:** Create `components/overlays/PeriodicTableOverlay.tsx`; Modify `game/scenes/RoomScene.ts`(물 반응·풍선 연출)

- step `room === 'table'`. 표는 18열×4행(1~4주기) 그리드, 1~20번만 밝은 칸(나머지 회색). 칸 크기 ≥ 44px, 무대 폭 안에 들어가게 셀 62×62.
- 조작: 화면 아래 원소 카드(해당 step의 `target`)를 **표의 칸으로 드래그**. 놓으면 `placeInTable(d, symbol, period, group)`.
  - 성공 → 그 칸이 빛나고 해당 세로줄(족)·가로줄(주기) 하이라이트, `completeRoom({room:'table', target, stars})`. 1족(Li·Na·K): 물통 연출(Phaser, 기체 방울). 18족(He·Ne·Ar): 풍선·네온 빛. 수소(H): 말풍선 "금속과는 성질이 달라" 한 줄.
  - 실패 → 카드가 원위치로 튕김 + `hints.tablePlace` 한 줄.
- 키보드 대체: 화살표로 칸 이동, Enter로 놓기.
- 별점: 오배치 횟수.
- 검증: 20개 원소 모두 제자리 통과·틀린 자리 실패, 1족·18족 연출, 터치 드롭.
- Commit: `git commit -m "feat: 주기율표 광장"`

---

## Task 9: 분자 조립소 + 갈림길 (5-3)

**Files:** Create `components/overlays/{MoleculeBenchOverlay,ClassifyOverlay}.tsx`

- step `room === 'molecule'`, `target` = 분자 id. 작업대 위에 원자 블록(H·C·N·O·Cl, 지름 56px 공, 주문 `ingredients`에 있는 원소만 상자에 등장).
- 조작: 상자에서 블록을 **작업대로 끌어놓기** → 이미 놓인 원자에 **접촉시켜 붙이기**(드래그해 근접 거리 ≤ `minigame-config.molecule.snap`이면 붙음). 붙기 직전 `canGrow(d, [...현재, 새])`가 false면 튕겨 나가며 `hints.moleculeNone`. 붙을 때마다 위쪽 화학식 칸을 `liveFormula(atoms)`로 갱신(H → H₂ → H₂O).
- 완성: `identifyMolecule(d, atoms)`가 성공하면
  - `molecule.id === target` → "완성" + `completeRoom({room:'molecule', target, stars})`
  - 목록의 다른 분자(예: O₂ 주문에서 O₃) → 보너스 "다른 물질" 카드, `completeRoom`을 부르지 않고 `addToDex('molecules', id)`만 하고 안내 한 줄("그건 산소가 아니라 오존이에요"). 계속 조립 가능. (store의 `extra`는 target 완성 때 함께 넘길 수 있게 로컬 상태에 모은다.)
- 붙였다 뗀 횟수 = 별점 감점. 떼기는 붙인 원자를 작업대 밖으로 드래그.
- **ClassifyOverlay(갈림길)**: 두 문 도형("원소" / "화합물")을 **문 손잡이를 끌어 열기**(누르기만 X). 손잡이를 끝까지 끌면 `useGameStore.getState().classify(answer)`. 오답이면 문이 닫히며 `hints.classifyWrong` 한 줄("물은 수소 원자와 산소 원자, 두 종류로 되어 있어요"), 정답이면 구성 원자 종류 수를 강조한 말풍선. 키보드: 좌우 화살표로 문 선택 + Enter.
- 주문 1 물: H₂O 완성 후 건전지 물 분해 연출(Phaser, 두 전극에서 기체) + 문구 "물은 원소가 아니에요". 주문 3 오존: "산소가 아니라 오존이에요" 후 갈림길 정답 "원소".
- 검증: H₂O≠H₂O₂, O₂≠O₃, CO≠CO₂ 각각 조립, H₃ 튕김, N₂·O₂·CO₂ 3연속(주문 2), 갈림길 오답·정답, 터치.
- Commit: `git commit -m "feat: 분자 조립소와 갈림길"`

---

## Task 10: 이온 공방 + 염화 나트륨 격자 (5-4)

**Files:** Create `components/overlays/IonWorkshopOverlay.tsx`

- step `room === 'ion'`, `target` = 이온 id. 원자(`target.symbol`)의 원자핵 "+N"과 전자들이 가운데. 상태 `delta`(잃음 −, 얻음 +).
- 조작: 전자를 **원 밖으로 끌어내면** 잃음(전하 +1씩), 상자의 전자를 **원 안으로 넣으면** 얻음(전하 −1씩). 오른쪽 위에 이온식·이름이 실시간: 전하 c = `-delta`, 이온식 `symbol + toSup(|c|, c>0?'+':'-')`, 이름은 `makeIon` 성공 시 `ion.name`(교과서 이온일 때만 이름 표시, 아니면 식만).
- 완료: `makeIon(d, symbol, charge)`가 성공하고 `ion.id === target`이면 `completeRoom({room:'ion', target, stars})`. 다른 교과서 이온이면 안내, 벗어나면 `hints.ionNone`(예: "나트륨은 전자 1개를 잃어요") 후 원상 복귀. 별점: 시도 횟수.
- **염화 나트륨(o4, 바닷물 o5)**: Na⁺·Cl⁻ 이온 조립이 끝난 뒤 격자 단계. 4×4 격자에 Na⁺·Cl⁻ 타일을 **드래그로 번갈아 놓기**. 놓을 때마다 `checkLattice(grid)`. 충돌이면 타일이 흔들리며 `hints.latticeOpposite`. `complete`이면 완성 연출(Phaser: 격자 반짝임) + "이온으로 이루어진 물질" 카드. (격자는 마지막 이온 step 완료 뒤 같은 오버레이에서 진행하고, 그 뒤 `completeRoom`을 부른다.)
- 키보드: 화살표로 칸 이동, `+`/`-` 키로 타일 놓기.
- 검증: Na⁺·Cl⁻·O²⁻·Mg²⁺ 각각, Na²⁺ 실패, 격자 완성·충돌, 터치.
- Commit: `git commit -m "feat: 이온 공방과 염화 나트륨 격자"`

---

## Task 11: 엔딩·요약 팝업·도감 카드·보너스 놀이

**Files:** Create `components/overlays/{EndingOverlay,SummaryOverlay,ParticleCardView,ElementCardGameOverlay}.tsx`

- [ ] **EndingOverlay**: 오늘 만든 물질의 **입자 지도**(원자 → 분자/이온 → 물질) 애니메이션 3~5초 피날레: 잠깐 멈춤 → 큰 파티클·빛 폭발 → 팡파르(`success.mp3`)·배경음 전환 → 별·점수 카운트업 → `next()`. 0.7~1.5초 입력 잠금 뒤 건너뛰기 허용.
- [ ] **SummaryOverlay**(요약 결과 팝업): 별점, 새 카드(`newCards`), 도감 n/N, 경과 시간, **'나의 결과 내려받기'** 버튼(`html-to-image` `toPng`로 결과 카드 PNG), '다시 하기'(`restartRun`), '처음으로'(`reset`).
- [ ] **ParticleCardView**: 도감 카드(원소·분자·이온·물질). 결과·엔딩·도감에서 재사용. 내용은 스펙 6장 항목 그대로.
- [ ] **ElementCardGameOverlay(5-5 보너스)**: 주기율표 광장에서 진입 버튼(글자 없는 카드 도형). 원소 이름 카드 12장이 원형 둘레, 기호 카드는 뒤집혀 가운데. 말이 놓인 이름과 일치하는 기호 카드를 뒤집으면 한 칸 이동, 아니면 뒤집힘. 한 바퀴 돌면 완료 → 별점 보너스(도감과 무관). 드래그로 말 옮기기 + 카드 탭(선택 조작이므로 탭 허용).
- 검증: 엔딩 피날레·건너뛰기·PNG 다운로드 확인, 카드가 잘림 없이 표시, 어절 줄바꿈.
- Commit: `git commit -m "feat: 엔딩·요약 팝업·도감 카드·보너스 놀이"`

---

## Task 12: admin 편집기 이식

**Files:** Create `app/admin/…`, `app/api/admin/[file]/route.ts`

- `../snug-rock-cycle-game/app/admin/**`와 `app/api/admin/[file]/route.ts`를 열어 옮긴다. 탭 6개(원소·분자·이온·주문·대화·퀴즈·미니게임 — 스펙 8장). `MapEditor`는 삭제하고 미니게임 좌표는 `JsonEditor`로 편집. 파일 허용 목록을 이 프로젝트의 8개 JSON으로 바꾸고 `VALIDATORS`로 저장 전 검증, production은 403.
- 검증: `/admin`에서 원소 이름 수정 → 저장 → 새로고침 반영, 스키마 어긋나면 저장 거부. `git diff`로 JSON이 의도대로만 바뀌었는지 확인 후 원복.
- Commit: `git commit -m "feat: admin 편집기"`

---

## Task 13: 완주 QA·시간 측정·정리·푸시

- [ ] 1280×800 크롬(터치 에뮬레이션)으로 **2판 완주**(주문 순서 바꿔서 1회 + 보너스 놀이 포함 1회). 체크: 학생 조작이 전부 과학 행동에 맞는지, 글자 잘림·겹침·버튼 가림 없음, 어절 단위 줄바꿈, Enter/Space 연타·캔버스 밖 손 떼기·새로고침에 안 꼬임, 첫 터치 전체 화면, 음소거, 요약 팝업 PNG.
- [ ] **한 판 시간 측정.** 12분 내외 목표, 15분 초과 시 방 시간·판정 폭 완화, 그래도 넘으면 주문 2(공기)의 분자를 2개로 줄인다 (스펙 11장).
- [ ] `docs/art-todo.md` 작성: 스펙 13장 그림 목록과 codex 프롬프트 초안 (그림 자체는 이 플랜 밖 — 플레이스홀더로 완성됨).
- [ ] 과학 용어 점검: AGENTS.md 금지어 grep (`전자 껍질|전자 배치|옥텟|이온 결합|공유 결합|금속 결합|전기 분해|알칼리 금속|비활성 기체|불소|메탄`) — `public/data`와 `components` 안에 0건이어야 함.

```bash
grep -rnE "전자 껍질|전자 배치|옥텟|이온 결합|공유 결합|금속 결합|전기 분해|알칼리 금속|비활성 기체|불소|메탄" public/data components game app
```

- [ ] `PROGRESS.md`에 기록 추가(기존 내용 보존), `AGENTS.md` "현재 상태" 갱신.
- [ ] `pnpm test && pnpm typecheck && pnpm lint && pnpm build` 통과 → `git diff --check` → 푸시 (실제 브라우저 확인을 끝낸 뒤).

```bash
git add -A && git commit -m "docs: 완주 QA 결과와 진행 기록" && git push origin main
```

---

## Self-Review (스펙 대조)

| 스펙 | 태스크 |
|---|---|
| 1 목표·성공 기준(12분, 도감 수) | 13 (시간 측정), 4 (dex) |
| 2 과학적 정확성 | 1·3 (데이터), 13 (금지어 grep) |
| 3 화면 흐름·HUD·이어하기 | 4 (store persist), 5 (HUD), 6 (주문판) |
| 4-1 주문 6개 | 3 (orders.json, 완료 가능 테스트) |
| 4-2 데이터 8종 | 1·3 |
| 4-3 판정 여섯 함수 + 보조 | 2 (`identifyAtom placeInTable identifyMolecule classify makeIon checkLattice orderDone` + `canGrow liveFormula pendingSteps isOrderOpen`) |
| 4-4 한 판 판정·도감 누적·건너뛰기 | 2 (`pendingSteps`), 4 (restartRun) |
| 5-1~5-4 방 4개 | 7~10 |
| 5-5 보너스 | 11 |
| 6 도감 3장+물질 카드 | 4·11 |
| 8 admin | 12 |
| 9 코드 구성 | 파일 구조 절 |
| 10 오류 처리 | 3 (검증기), 4 (dex try/catch) |
| 11 테스트·QA | 1~4 (Vitest), 13 |
| 12 배포 | 13 |
| 13 그림 목록 | 13 (`docs/art-todo.md`) |

**알려진 열린 항목**
- 원소 `state`·`page` 값은 교과서 그림 Ⅳ-6 대조 필요 (Task 1 Step 4에 명시).
- 튜토리얼 o0에는 퀴즈가 없어 `finishQuiz(false)`로 건너뛴다 (Task 6). 스펙에 튜토리얼 퀴즈 규정 없음 — 이 해석으로 진행.
- Task 7~11은 UI라 코드 전문 대신 파일·규칙·핵심 조작·검증 기준으로 적었다. 구현 시 rock-cycle `MineralOverlay`의 포인터·드롭 판정과 `useDrag`(Task 5)를 기반으로 한다. 각 오버레이 구현 전에 서브에이전트가 해당 원본 파일을 먼저 읽는다.
