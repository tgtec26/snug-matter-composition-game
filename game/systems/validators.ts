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
