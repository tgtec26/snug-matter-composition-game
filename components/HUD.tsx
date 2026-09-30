'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/game/store';
import { useDataStore } from '@/game/dataStore';
import { loadDex } from '@/game/dex';
import { Art, artFrame } from '@/components/Art';

const plate = artFrame('ui/plate_wood', 60, 14);

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/** 좌상단(주문·방 진행) / 우상단(별·시간·도감). 우측 끝은 TopControls 자리로 비워 둔다. */
export function HUD() {
  const phase = useGameStore(s => s.phase);
  const orderId = useGameStore(s => s.orderId);
  const stepIdx = useGameStore(s => s.stepIdx);
  const total = useGameStore(s => s.queue.length);
  const stars = useGameStore(s => s.stars);
  const startedAt = useGameStore(s => s.startedAt);
  const elapsedMs = useGameStore(s => s.elapsedMs);
  const orders = useDataStore(s => s.orders);
  const [now, setNow] = useState(() => Date.now());
  const [dex, setDex] = useState(() => loadDex());

  useEffect(() => {
    const t = setInterval(() => { setNow(Date.now()); setDex({ ...loadDex() }); }, 1000);
    return () => clearInterval(t);
  }, []);

  if (phase === 'title' || phase === 'summary') return null;
  const title = orders.find(o => o.id === orderId)?.title;
  const time = phase === 'ending' ? elapsedMs : startedAt ? now - startedAt : 0;
  const placed = dex.placed.length;

  return (
    <div className="absolute inset-x-0 top-0 flex items-start justify-between pl-4 pr-[190px] pt-2 text-white select-none text-[15px]">
      {title ? (
        <div className="flex gap-3 px-5 py-1.5 min-h-[32px]" style={plate}>
          <span className="text-amber-300 font-bold">{title}</span>
          {/* room: 지금 방이 stepIdx+1번째, classify: completeRoom 뒤라 stepIdx가 이미 방금 끝낸 방 번호 */}
          {total > 0 && (phase === 'room' || phase === 'classify') && <span className="text-white/80">방 {Math.min(phase === 'room' ? stepIdx + 1 : stepIdx, total)}/{total}</span>}
        </div>
      ) : <div />}
      <div className="flex items-center gap-4 px-5 py-1.5" style={plate}>
        <span className="flex items-center gap-1 text-amber-300 font-bold" aria-label={`별 ${stars}`}><Art src="ui/star" style={{ width: 22, height: 22 }} />{stars}</span>
        <span className="font-mono text-white/80">{fmt(time)}</span>
        <span className="text-white/80">원소 {Math.max(dex.elements.length, placed)}/20</span>
        <span className="text-white/80">분자 {dex.molecules.length}/12</span>
        <span className="text-white/80">이온 {dex.ions.length}/7</span>
      </div>
    </div>
  );
}
