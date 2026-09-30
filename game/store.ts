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
    if (s.phase === 'accept' && id !== s.orderId) return {};   // 튜토리얼 화면에서는 제시된 주문만
    const queue = pendingSteps(o, loadDex());
    return { orderId: id, queue, stepIdx: 0, phase: afterRoom(queue, 0) };
  }),
  completeRoom: (r) => set(s => {
    const cur = s.queue[s.stepIdx];
    if (s.phase !== 'room' || !cur || cur.room !== r.room || cur.target !== r.target) return {};
    const isNew = addToDex(KIND[r.room], r.target);
    for (const x of r.extra ?? []) addToDex('molecules', x);   // 보너스: 다른 물질 카드
    const stepIdx = s.stepIdx + 1;
    const newCards = isNew ? [...s.newCards, r.target] : s.newCards;
    const base = { stepIdx, stars: s.stars + r.stars, newCards };
    return r.room === 'molecule' ? { ...base, phase: 'classify' as Phase } : { ...base, phase: afterRoom(s.queue, stepIdx) };
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
    if (finished) return { doneOrders, stars, phase: 'ending' as Phase, elapsedMs: s.startedAt ? Date.now() - s.startedAt : 0 };
    return { doneOrders, stars, phase: 'orders' as Phase, orderId: null, tutorialDone: true };
  }),
  restartRun: () => set(s => ({ ...fresh(), nickname: s.nickname, phase: 'intro', startedAt: Date.now(), tutorialDone: true })),
  reset: () => set(fresh()),
}), { name: 'particle-run-v1', version: 1, storage: createJSONStorage(() => localStorage) }));
