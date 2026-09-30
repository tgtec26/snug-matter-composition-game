'use client';
// 개발 전용: 방 오버레이(Task 7~10)가 생기기 전 흐름 확인용 '통과' 버튼. production 빌드에서는 렌더하지 않는다.
import { useGameStore } from '@/game/store';
import { ROOMS } from '@/components/overlays/RoomRouter';

export function skipRoom() {
  const s = useGameStore.getState();
  const cur = s.queue[s.stepIdx];
  if (s.phase === 'room' && cur) s.completeRoom({ room: cur.room, target: cur.target, stars: 3 });
}

export function DevSkip() {
  const phase = useGameStore(s => s.phase);
  const hasRoom = useGameStore(s => !!ROOMS[s.queue[s.stepIdx]?.room]);   // 실제 오버레이가 있는 방에는 통과 버튼을 띄우지 않는다
  if (process.env.NODE_ENV === 'production' || phase !== 'room' || hasRoom) return null;
  return (
    <button type="button" onClick={skipRoom}
      className="absolute left-1/2 top-[60%] -translate-x-1/2 pointer-events-auto px-6 py-3 rounded-xl bg-white/20 border border-white/50 text-white text-[20px]">
      개발용 통과
    </button>
  );
}
