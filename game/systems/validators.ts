export const DATA_FILES = ['elements', 'molecules', 'ions', 'substances', 'orders', 'minigame-config', 'dialog-config', 'quiz-pool'] as const;
export type DataFile = (typeof DATA_FILES)[number];
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

type Rows = Record<string, unknown>[];
/** 파일 사이 참조 검사(admin 저장용): 주문 step 대상이 데이터에 있고, 퀴즈 정답 번호가 보기 범위 안인지. */
export function crossErrors(d: { elements: Rows; molecules: Rows; ions: Rows; orders: Rows; 'quiz-pool': Rows }): string[] {
  const has = (rows: Rows, key: string, v: unknown) => Array.isArray(rows) && rows.some(r => r[key] === v);
  const errs: string[] = [];
  for (const o of Array.isArray(d.orders) ? d.orders : []) {
    for (const s of (Array.isArray(o.steps) ? o.steps : []) as { room: string; target: string }[]) {
      const ok = s.room === 'molecule' ? has(d.molecules, 'id', s.target) : s.room === 'ion' ? has(d.ions, 'id', s.target)
        : has(d.elements, 'symbol', s.target);
      if (!ok) errs.push(`주문 ${String(o.id)}: ${s.room} 대상 "${s.target}"이(가) 데이터에 없음`);
    }
  }
  for (const q of Array.isArray(d['quiz-pool']) ? d['quiz-pool'] : []) {
    const n = Array.isArray(q.choices) ? q.choices.length : 0;
    if (!Number.isInteger(q.answer) || (q.answer as number) < 0 || (q.answer as number) >= n) errs.push(`퀴즈 ${String(q.id)}: answer가 보기 범위 밖`);
  }
  return errs;
}
