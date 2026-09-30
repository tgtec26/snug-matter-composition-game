'use client';
// 개발 전용: 방·분류 오버레이(Task 7~10)가 생기기 전 흐름 확인용 '통과' 버튼. production 빌드에서는 렌더하지 않는다.
import { useGameStore } from '@/game/store';
import { useDataStore } from '@/game/dataStore';
import { classify } from '@/game/rules';

export function skipRoom() {
  const s = useGameStore.getState();
  const cur = s.queue[s.stepIdx];
  if (s.phase === 'room' && cur) s.completeRoom({ room: cur.room, target: cur.target, stars: 3 });
}
export function skipClassify() {
  const s = useGameStore.getState();
  const m = useDataStore.getState().molecules.find(x => x.id === s.queue[s.stepIdx - 1]?.target);
  if (s.phase === 'classify' && m) s.classify(classify(Object.entries(m.atoms).flatMap(([k, n]) => Array<string>(n).fill(k))));
}

export function DevSkip() {
  const phase = useGameStore(s => s.phase);
  if (process.env.NODE_ENV === 'production' || (phase !== 'room' && phase !== 'classify')) return null;
  return (
    <button type="button" onClick={phase === 'room' ? skipRoom : skipClassify}
      className="absolute left-1/2 top-[60%] -translate-x-1/2 pointer-events-auto px-6 py-3 rounded-xl bg-white/20 border border-white/50 text-white text-[20px]">
      개발용 통과
    </button>
  );
}
