'use client';

import { useCallback, useRef } from 'react';
import { useGameStore } from '@/game/store';
import { useDataStore } from '@/game/dataStore';
import { isOrderOpen } from '@/game/rules';
import { useLock } from '@/components/hooks/useLock';
import { useDrag } from '@/components/hooks/useDrag';
import { playSfx } from '@/game/audio';
import { Art, artBg } from '@/components/Art';
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
    <div className={`relative h-[300px] pl-12 pr-9 pt-9 pb-7 flex flex-col gap-3 text-slate-900 ${state === 'locked' ? 'opacity-40 blur-[2px]' : ''}`}
      style={{ width: CARD_W, ...artBg(state === 'done' ? 'ui/order_paper_done' : 'ui/order_paper') }}>
      <div className={`self-start rounded-full px-3 py-0.5 text-[16px] font-black ${state === 'done' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-black'}`}>{label}</div>
      <div className={`text-[24px] font-black leading-tight ${state === 'done' ? 'text-emerald-900' : ''}`}>{o.title}</div>
      <div className="flex flex-wrap gap-1.5 content-start">
        {o.ingredients.map(sym => (
          <span key={sym} className="w-11 h-11 flex items-center justify-center text-[18px] font-black text-slate-900" style={artBg('ui/cell_bright')}>{sym}</span>
        ))}
      </div>
      {state === 'done' && <div className="mt-auto self-end w-[120px] h-[64px] flex items-center justify-center text-[24px] font-black text-emerald-700" style={artBg('ui/stamp_done')}>완료</div>}
    </div>
  );
}

function Lock() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none z-10">
      <Art src="ui/lock" style={{ width: 64, height: 70 }} />
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

      <div className={`absolute flex flex-col items-center justify-center rounded-3xl border-[2.8px] border-dashed transition-all ${over ? 'border-amber-300 bg-amber-900/70 scale-105' : 'border-white/80 bg-slate-900/60'}`}
        style={{ left: SLOT.x1 + 20, top: SLOT.y1 + 20, width: SLOT.x2 - SLOT.x1 - 40, height: SLOT.y2 - SLOT.y1 - 40 }}>
        <Art src="ui/arrow_down" className="absolute" style={{ left: '50%', top: -58, marginLeft: -18, width: 36, height: 41, animation: 'bob 1s ease-in-out infinite' }} />
        <div className="text-[34px] font-black text-white" style={{ textShadow: '0 2px 6px #000' }}>수락</div>
      </div>

      {drag && dragged && (
        <div className="absolute pointer-events-none z-20" style={{ left: drag.x, top: drag.y, transform: 'translate(-50%,-50%) scale(1.08) rotate(-3deg)', filter: 'drop-shadow(0 22px 14px rgba(0,0,0,.5))' }}>
          <Card o={dragged} label={dragged.id === 'o5' ? '최종' : dragged.id.slice(1)} state="open" />
        </div>
      )}
    </div>
  );
}
