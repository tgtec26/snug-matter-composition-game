'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/game/store';
import { useDataStore } from '@/game/dataStore';
import { loadDex } from '@/game/dex';

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
      <div className="flex gap-3 rounded-xl bg-black/60 px-4 py-1.5 min-h-[32px]">
        {title && <span className="text-amber-300 font-bold">{title}</span>}
        {total > 0 && <span className="text-white/80">방 {Math.min(stepIdx, total)}/{total}</span>}
      </div>
      <div className="flex items-center gap-4 rounded-xl bg-black/60 px-4 py-1.5">
        <span className="text-amber-300 font-bold">별 {stars}</span>
        <span className="font-mono text-white/80">{fmt(time)}</span>
        <span className="text-white/80">원소 {Math.max(dex.elements.length, placed)}/20</span>
        <span className="text-white/80">분자 {dex.molecules.length}/12</span>
        <span className="text-white/80">이온 {dex.ions.length}/7</span>
      </div>
    </div>
  );
}
