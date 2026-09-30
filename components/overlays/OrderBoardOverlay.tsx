'use client';

import { useCallback, useRef } from 'react';
import { useGameStore } from '@/game/store';
import { useDataStore } from '@/game/dataStore';
import { isOrderOpen } from '@/game/rules';
import { useLock } from '@/components/hooks/useLock';
import { useDrag } from '@/components/hooks/useDrag';
import { playSfx } from '@/game/audio';
import type { Order } from '@/game/types';

const SLOT = { x1: 440, x2: 840, y1: 520, y2: 690 };   // 수락 자리 (드롭 판정, 여유 포함)
const inSlot = (x: number, y: number) => x >= SLOT.x1 && x <= SLOT.x2 && y >= SLOT.y1 && y <= SLOT.y2;
const CARD_W = 216;

export function OrderBoardOverlay() {
  const phase = useGameStore(s => s.phase);
  if (phase !== 'orders') return null;
  return <Board />;
}

function Card({ o, label, state }: { o: Order; label: string; state: 'open' | 'done' | 'locked' }) {
  return (
    <div className={`relative h-[300px] rounded-2xl border-4 px-4 py-3 flex flex-col gap-3 ${state === 'done' ? 'border-emerald-400 bg-emerald-950' : 'border-amber-200 bg-amber-50 text-slate-900'} ${state === 'locked' ? 'opacity-40 blur-[2px]' : ''}`}
      style={{ width: CARD_W, boxShadow: '0 6px 0 rgba(0,0,0,.35)' }}>
      <div className={`self-start rounded-full px-3 py-0.5 text-[16px] font-black ${state === 'done' ? 'bg-emerald-400 text-emerald-950' : 'bg-amber-500 text-black'}`}>{label}</div>
      <div className={`text-[24px] font-black leading-tight ${state === 'done' ? 'text-emerald-100' : ''}`}>{o.title}</div>
      <div className="flex flex-wrap gap-1.5 content-start">
        {o.ingredients.map(sym => (
          <span key={sym} className={`w-11 h-11 rounded-full flex items-center justify-center text-[18px] font-black border-2 ${state === 'done' ? 'border-emerald-300 text-emerald-100' : 'border-slate-700 bg-white'}`}>{sym}</span>
        ))}
      </div>
      {state === 'done' && <div className="mt-auto self-end rotate-[-8deg] border-4 border-emerald-300 rounded-lg px-3 py-0.5 text-[22px] font-black text-emerald-300">완료</div>}
    </div>
  );
}

function Lock() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none z-10">
      <div className="relative w-[64px] h-[76px]">
        <div className="absolute left-[10px] top-0 w-[44px] h-[40px] rounded-t-full border-[8px] border-b-0 border-slate-200" />
        <div className="absolute left-0 bottom-0 w-[64px] h-[44px] rounded-lg bg-slate-200 border-4 border-slate-500" />
        <div className="absolute left-[28px] bottom-[12px] w-2 h-4 rounded bg-slate-600" />
      </div>
      <div className="rounded-lg bg-black/70 px-3 py-1 text-[16px] font-bold text-white">주문 1~4 완료 뒤</div>
    </div>
  );
}

function Board() {
  const orders = useDataStore(s => s.orders).filter(o => o.id !== 'o0');
  const doneOrders = useGameStore(s => s.doneOrders);
  const acceptOrder = useGameStore(s => s.acceptOrder);
  const locked = useLock(900);
  const stage = useRef<HTMLDivElement>(null);
  const start = useRef({ x: 0, y: 0 });
  const stateOf = (o: Order) => doneOrders.includes(o.id) ? 'done' : isOrderOpen(o, doneOrders) ? 'open' : 'locked';

  const accept = useCallback((id: string) => {
    if (locked) return;
    const o = orders.find(x => x.id === id);
    if (!o || stateOf(o) !== 'open') return;
    playSfx('correct');
    acceptOrder(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, orders, doneOrders, acceptOrder]);

  const onDrop = useCallback((id: string, x: number, y: number) => {
    const tap = Math.hypot(x - start.current.x, y - start.current.y) < 10;   // 살짝 눌렀다 뗌 = 탭
    if (tap || inSlot(x, y)) accept(id);
  }, [accept]);
  const { drag, begin } = useDrag(stage, onDrop);

  const startDrag = (id: string, e: React.PointerEvent) => {
    if (locked) return;
    const r = stage.current!.getBoundingClientRect();
    start.current = { x: ((e.clientX - r.left) / r.width) * 1280, y: ((e.clientY - r.top) / r.height) * 800 };
    begin(id, e);
  };
  const over = drag && inSlot(drag.x, drag.y);
  const dragged = drag ? orders.find(o => o.id === drag.id) : null;

  return (
    <div ref={stage} className="absolute inset-0 pointer-events-auto select-none touch-none">
      <div className="absolute inset-x-0 top-[170px] flex justify-center gap-6">
        {orders.map((o, i) => {
          const st = stateOf(o);
          const label = o.id === 'o5' ? '최종' : `${i + 1}`;
          return (
            <button key={o.id} type="button"
              aria-label={`${o.title} ${st === 'open' ? '수락' : st === 'done' ? '완료' : '잠김'}`}
              className={`relative outline-none rounded-2xl focus-visible:ring-4 ring-white ${st === 'open' ? 'cursor-grab' : 'cursor-default'} ${drag?.id === o.id ? 'opacity-30' : ''}`}
              onPointerDown={st === 'open' ? e => startDrag(o.id, e) : undefined}
              onClick={e => { if (e.detail === 0) accept(o.id); }}>
              <Card o={o} label={label} state={st} />
              {st === 'locked' && <Lock />}
            </button>
          );
        })}
      </div>

      <div className={`absolute flex flex-col items-center justify-center rounded-3xl border-4 border-dashed transition-all ${over ? 'border-amber-300 bg-amber-300/30 scale-105' : 'border-white/50 bg-white/10'}`}
        style={{ left: SLOT.x1 + 20, top: SLOT.y1 + 20, width: SLOT.x2 - SLOT.x1 - 40, height: SLOT.y2 - SLOT.y1 - 40 }}>
        <div className="w-0 h-0 border-x-[18px] border-x-transparent border-t-[22px] border-t-amber-300 mb-2" style={{ animation: 'bob 1s ease-in-out infinite' }} />
        <div className="text-[30px] font-black text-white">수락</div>
      </div>

      {drag && dragged && (
        <div className="absolute pointer-events-none z-20" style={{ left: drag.x, top: drag.y, transform: 'translate(-50%,-50%) scale(1.08) rotate(-3deg)', filter: 'drop-shadow(0 22px 14px rgba(0,0,0,.5))' }}>
          <Card o={dragged} label={dragged.id === 'o5' ? '최종' : dragged.id.slice(1)} state="open" />
        </div>
      )}
    </div>
  );
}
