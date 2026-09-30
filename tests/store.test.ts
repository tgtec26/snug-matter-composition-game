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
const force = (phase: ReturnType<typeof S>['phase']) => useGameStore.setState({ phase });
/** 현재 대기열을 전부 통과 (분자는 classify까지 정답) */
const playQueue = () => {
  while (S().phase === 'room') {
    const { room, target } = S().queue[S().stepIdx];
    S().completeRoom({ room, target, stars: 3 });
    if (S().phase === 'classify') {
      const m = molecules.find(x => x.id === target)!;
      S().classify(m.kind as '원소' | '화합물');
    }
  }
};
/** 주문판에서 고르기: orders → accept → (대사 확인) → room */
const pick = (id: string) => { S().acceptOrder(id); S().acceptOrder(id); };
const playOrder = (id: string) => {
  pick(id); playQueue();
  expect(S().phase).toBe('result'); S().next(); expect(S().phase).toBe('quiz'); S().finishQuiz(true);
};
const finishTutorial = () => { S().start('a'); S().next(); S().acceptOrder('o0'); playQueue(); S().next(); S().finishQuiz(true); };

it('title → intro → accept(튜토리얼 주문 o0 자동 제시)', () => {
  S().start('아이');
  expect(S().phase).toBe('intro');
  S().next();
  expect(S().phase).toBe('accept');
  expect(S().orderId).toBe('o0');
});
it('임의 phase 점프 금지: title에서 completeRoom 무시', () => {
  S().completeRoom({ room: 'atom', target: 'H', stars: 3 });
  expect(S().phase).toBe('title');
});
it('튜토리얼 화면에서는 제시된 o0만 수락', () => {
  S().start('a'); S().next(); S().acceptOrder('o1');
  expect(S().phase).toBe('accept');
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
it('튜토리얼 완주: 분자 방 없이 result → quiz → finishQuiz 후 orders 복귀', () => {
  S().start('a'); S().next(); S().acceptOrder('o0'); playQueue();
  expect(S().phase).toBe('result');
  S().next(); expect(S().phase).toBe('quiz');
  S().finishQuiz(false);
  expect(S().phase).toBe('orders');
  expect(S().tutorialDone).toBe(true);
  expect(S().doneOrders).toEqual(['o0']);
});
it('classify 오답은 phase 유지·별 감점, 정답이면 진행', () => {
  S().start('a'); force('orders'); pick('o1');
  S().completeRoom({ room: 'molecule', target: 'H2O', stars: 3 });
  expect(S().phase).toBe('classify');
  S().classify('원소');
  expect(S().phase).toBe('classify');
  expect(S().stars).toBe(2); expect(S().mistakes).toBe(1);
  S().classify('화합물');
  expect(S().phase).toBe('result');
});
it('최종 주문은 1~4 완료 전 수락 불가, 완료 후 가능', () => {
  finishTutorial();
  expect(S().phase).toBe('orders');
  S().acceptOrder('o5');
  expect(S().phase).toBe('orders');
  for (const id of ['o1', 'o2', 'o3', 'o4']) playOrder(id);
  pick('o5');
  expect(S().phase).toBe('room');
});
it('주문 5개 완료 → ending → next → summary', () => {
  finishTutorial();
  for (const id of ['o1', 'o2', 'o3', 'o4', 'o5']) playOrder(id);
  expect(S().phase).toBe('ending');
  S().next(); expect(S().phase).toBe('summary');
});
it('restartRun은 도감을 유지하고 진행만 초기화, 튜토리얼은 건너뜀', () => {
  S().start('a'); S().next(); S().acceptOrder('o0');
  S().completeRoom({ room: 'atom', target: 'H', stars: 3 });
  S().restartRun();
  expect(S().phase).toBe('intro'); expect(S().doneOrders).toEqual([]);
  expect(loadDex().elements).toEqual(['H']);
  S().next(); expect(S().phase).toBe('orders');
});
it('새로고침 복원: 저장된 진행이 rehydrate로 돌아온다', async () => {
  S().start('a'); S().next(); S().acceptOrder('o0');
  S().completeRoom({ room: 'atom', target: 'H', stars: 3 });
  const raw = localStorage.getItem('particle-run-v1')!;
  useGameStore.setState({ phase: 'title', stepIdx: 0, orderId: null, queue: [] });
  localStorage.setItem('particle-run-v1', raw);
  await useGameStore.persist.rehydrate();
  expect(S().phase).toBe('room'); expect(S().stepIdx).toBe(1); expect(S().orderId).toBe('o0');
});

it('완료한 주문은 재수락 불가 (별 파밍 방지)', () => {
  finishTutorial();
  playOrder('o1');
  const stars = S().stars;
  S().acceptOrder('o1');
  expect(S().phase).toBe('orders');
  expect(S().stars).toBe(stars);
});
it('classify 오답 3번이어도 별은 1개만 감점, mistakes는 매번 +1', () => {
  S().start('a'); force('orders'); pick('o1');
  S().completeRoom({ room: 'molecule', target: 'H2O', stars: 3 });
  S().classify('원소'); S().classify('원소'); S().classify('원소');
  expect(S().stars).toBe(2); expect(S().mistakes).toBe(3);
  S().classify('화합물');
  expect(S().phase).toBe('result');
});
it('다음 분자 방의 classify는 감점 플래그가 리셋된다', () => {
  S().start('a'); force('orders'); pick('o2');
  S().completeRoom({ room: 'atom', target: 'N', stars: 0 });
  S().completeRoom({ room: 'table', target: 'N', stars: 0 });
  S().completeRoom({ room: 'molecule', target: 'N2', stars: 3 });
  S().classify('화합물'); S().classify('화합물');   // N2는 원소 → 오답
  expect(S().stars).toBe(2);
  S().classify('원소');
  S().completeRoom({ room: 'molecule', target: 'O2', stars: 3 });
  S().classify('화합물');
  expect(S().stars).toBe(4);   // 2 + 3 - 1
});
it('데이터가 로드되기 전(새로고침 직후) classify는 무시', () => {
  S().start('a'); force('orders'); pick('o2');
  S().completeRoom({ room: 'atom', target: 'N', stars: 0 });
  S().completeRoom({ room: 'table', target: 'N', stars: 0 });
  S().completeRoom({ room: 'molecule', target: 'N2', stars: 3 });
  useDataStore.setState({ loaded: false, molecules: [] } as never);
  S().classify('화합물');
  expect(S().mistakes).toBe(0); expect(S().stars).toBe(3); expect(S().phase).toBe('classify');
});
it('주문판에서 고르면 accept phase에 머물고(대사), 확인해야 room으로 간다', () => {
  finishTutorial();
  S().acceptOrder('o1');
  expect(S().phase).toBe('accept'); expect(S().orderId).toBe('o1');
  S().acceptOrder('o2');   // 제시된 주문이 아니면 무시
  expect(S().orderId).toBe('o1'); expect(S().phase).toBe('accept');
  S().acceptOrder('o1');
  expect(S().phase).toBe('room'); expect(S().queue.length).toBe(1);
});
it('잠긴 최종 주문은 주문판에서도 accept로 넘어가지 않는다', () => {
  finishTutorial();
  S().acceptOrder('o5');
  expect(S().phase).toBe('orders');
});
it('같은 원소를 조립·배치해도 새 카드 목록에는 한 번만 (요약 팝업 중복 방지)', () => {
  S().start('a'); S().next(); S().acceptOrder('o0'); playQueue();
  expect(S().newCards).toEqual(['H', 'C', 'O']);
});
it('방 오류(misses)는 mistakes에 합산되고 갈림길 오답과도 더해진다', () => {
  S().start('a'); force('orders'); pick('o2');
  S().completeRoom({ room: 'atom', target: 'N', stars: 2, misses: 2 });
  S().completeRoom({ room: 'table', target: 'N', stars: 3, misses: 1 });
  S().completeRoom({ room: 'molecule', target: 'N2', stars: 3 });
  S().classify('화합물');
  expect(S().mistakes).toBe(4);
});
it('다른 물질 보너스 카드도 새 카드 목록에 한 번만 (이미 도감에 있으면 제외)', () => {
  S().start('a'); force('orders'); pick('o2');
  S().completeRoom({ room: 'atom', target: 'N', stars: 3 });
  S().completeRoom({ room: 'table', target: 'N', stars: 3 });
  S().completeRoom({ room: 'molecule', target: 'N2', stars: 3, extra: ['H2', 'O2'] });
  S().classify('원소');
  S().completeRoom({ room: 'molecule', target: 'O2', stars: 3, extra: ['H2'] });
  expect(S().newCards).toEqual(['N', 'N2', 'H2', 'O2']);
});
