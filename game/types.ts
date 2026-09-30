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

export interface Substance { id: string; name: string; components: string[]; particle: string; order?: string; parts?: Record<string, unknown>; }
export interface DialogConfig { intro: string[]; hints: Record<string, string>; }
export type MinigameConfig = Record<string, Record<string, unknown>>;
export interface QuizQuestion { id: string; order: string; q: string; choices: string[]; answer: number; page?: number; explain?: string; }
