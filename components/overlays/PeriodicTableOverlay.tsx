'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/game/store';
import { useDataStore } from '@/game/dataStore';
import { placeInTable, tableStars } from '@/game/rules';
import { playSfx } from '@/game/audio';
import { useLock } from '@/components/hooks/useLock';
import { useDrag } from '@/components/hooks/useDrag';
import { Burst } from '@/components/overlays/Burst';
import { ElementCardGameOverlay } from '@/components/overlays/ElementCardGameOverlay';
import type { Step } from '@/game/types';

const CELL = 62, COLS = 18, ROWS = 4, LEFT = 82, TOP = 176;
const cellAt = (x: number, y: number) => {
  const g = Math.floor((x - LEFT) / CELL) + 1, p = Math.floor((y - TOP) / CELL) + 1;
  return g >= 1 && g <= COLS && p >= 1 && p <= ROWS ? { p, g } : null;
};
/** 5-2 주기율표 광장: 원소 카드를 표의 칸으로 끌어다 놓는다. 판정은 rules.placeInTable. */
export function PeriodicTableOverlay({ step }: { step: Step }) {
  const completeRoom = useGameStore(s => s.completeRoom);
  const elements = useDataStore(s => s.elements);
  const hints = useDataStore(s => s.dialog?.hints);
  const seconds = (useDataStore(s => s.minigame?.table) as { seconds: number } | undefined)?.seconds ?? 30;
  const target = elements.find(e => e.symbol === step.target);

  const [bonus, setBonus] = useState(false);
  const [misses, setMisses] = useState(0);
  const [msg, setMsg] = useState('');
  const [shake, setShake] = useState(0);
  const [done, setDone] = useState<{ p: number; g: number } | null>(null);
  const [cursor, setCursor] = useState<{ p: number; g: number } | null>(null);   // 키보드 조작 시에만 표시
  const [t0, setT0] = useState(() => Date.now());
  const [bonusStars, setBonusStars] = useState(0);
  const bonusAt = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const locked = useLock(900);
  const stage = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (done || bonus) return;   // 보너스 놀이 중에는 시간이 멈춘다
    const t = setInterval(() => setElapsed((Date.now() - t0) / 1000), 200);
    return () => clearInterval(t);
  }, [done, bonus, t0]);
  const openBonus = () => { bonusAt.current = Date.now(); setBonus(true); };
  const closeBonus = (stars: number) => {
    setT0(t => t + Date.now() - bonusAt.current);   // 놀이한 시간만큼 출발 시각을 늦춘다
    setBonusStars(b => b || stars);   // 이 방에서 처음 끝낸 놀이의 별만
    setBonus(false);
  };

  const place = useCallback((c: { p: number; g: number } | null) => {
    if (!c || !target || busy.current || locked) return;
    const res = placeInTable({ elements, molecules: [], ions: [] }, target.symbol, c.p, c.g);
    if (!res.ok) {
      playSfx('error'); busy.current = true; setTimeout(() => { busy.current = false; }, 500);
      setMisses(m => m + 1); setShake(k => k + 1); setMsg(hints?.tablePlace ?? res.hint);
      return;
    }
    busy.current = true;
    playSfx('correct'); setTimeout(() => playSfx('success'), 350);
    setDone(c);
    setMsg(target.symbol === 'H' ? '금속과는 성질이 달라' : '');
    if ((target.group === 1 && target.symbol !== 'H') || target.group === 18) window.dispatchEvent(new CustomEvent('room-fx', { detail: { symbol: target.symbol, group: target.group } }));
    const stars = tableStars(misses, (Date.now() - t0) / 1000 > seconds) + bonusStars;
    setTimeout(() => completeRoom({ room: 'table', target: target.symbol, stars }), 2600);
  }, [target, locked, elements, hints, misses, t0, seconds, bonusStars, completeRoom]);

  const onDrop = useCallback((_id: string, x: number, y: number) => place(cellAt(x, y)), [place]);
  const { drag, begin } = useDrag(stage, onDrop);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || locked || busy.current) return;
      if (e.key === 'Enter') { e.preventDefault(); place(cursor); return; }
      const d = ({ ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] } as Record<string, number[]>)[e.key];
      if (!d) return;
      e.preventDefault();
      setCursor(c => { const b = c ?? { p: 1, g: 1 }; return { p: Math.min(ROWS, Math.max(1, b.p + d[0])), g: Math.min(COLS, Math.max(1, b.g + d[1])) }; });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [locked, cursor, place]);

  const over = drag ? cellAt(drag.x, drag.y) : null;
  const left = Math.max(0, 1 - elapsed / seconds);
  const cells = Array.from({ length: ROWS * COLS }, (_, i) => ({ p: Math.floor(i / COLS) + 1, g: (i % COLS) + 1 }));

  return (
    <div ref={stage} className="absolute inset-0 select-none">
      <div className="absolute left-1/2 top-[52px] -translate-x-1/2 rounded-full bg-black/60 px-6 py-1.5 text-amber-200 text-[20px] font-bold whitespace-nowrap">
        놓을 원소 {target?.name} {target?.symbol}
      </div>

      {/* 족(세로줄)·주기(가로줄) 번호 */}
      <div className="absolute text-white/60 text-[16px]" style={{ left: 8, top: TOP - 52, width: 70, textAlign: 'right' }}>주기</div>
      <div className="absolute text-white/60 text-[16px]" style={{ left: 8, top: TOP - 26, width: 70, textAlign: 'right' }}>족</div>
      {Array.from({ length: COLS }, (_, i) => (
        <div key={i} className={`absolute text-center text-[18px] font-bold ${done?.g === i + 1 ? 'text-amber-300' : 'text-white/70'}`}
          style={{ left: LEFT + i * CELL, top: TOP - 30, width: CELL }}>{i + 1}</div>
      ))}
      {Array.from({ length: ROWS }, (_, i) => (
        <div key={i} className={`absolute text-right text-[18px] font-bold ${done?.p === i + 1 ? 'text-amber-300' : 'text-white/70'}`}
          style={{ left: 0, top: TOP + i * CELL + 18, width: LEFT - 12 }}>{i + 1}</div>
      ))}

      {/* 표 */}
      {cells.map(c => {
        const el = elements.find(e => e.period === c.p && e.group === c.g);
        const hit = done && done.p === c.p && done.g === c.g;
        const line = done && (done.p === c.p || done.g === c.g);
        const hover = over && over.p === c.p && over.g === c.g;
        const cur = cursor && cursor.p === c.p && cursor.g === c.g;
        return (
          <div key={`${c.p}-${c.g}`} className="absolute" style={{ left: LEFT + (c.g - 1) * CELL, top: TOP + (c.p - 1) * CELL, width: CELL, height: CELL, padding: 2 }}>
            <div className={`h-full w-full rounded-md border-2 flex flex-col items-center justify-center leading-none ${
              hit ? 'bg-amber-300 border-white text-black' : line ? 'bg-amber-100/40 border-amber-300' : el ? 'bg-sky-100/90 border-sky-300 text-slate-900' : 'bg-white/10 border-white/15'
            } ${hover ? 'ring-4 ring-amber-300' : ''} ${cur ? 'ring-4 ring-white' : ''}`}
              style={{ animation: hit ? 'pop .6s' : undefined, boxShadow: hit ? '0 0 26px 8px #fcd34d' : undefined }}>
              {el && (<>
                <span className="text-[12px] opacity-70">{el.number}</span>
                <span className="text-[24px] font-bold">{el.symbol}</span>
              </>)}
            </div>
          </div>
        );
      })}
      {done && <div className="absolute" style={{ left: LEFT + (done.g - 0.5) * CELL, top: TOP + (done.p - 0.5) * CELL }}><Burst count={24} radius={200} /></div>}

      {/* 원소 카드 (집으면 커지고 그림자가 멀어진다) */}
      {target && !done && (
        <div key={shake} className="absolute pointer-events-auto cursor-grab"
          style={{ left: 640 - 60, top: 500, width: 120, height: 120, touchAction: 'none', opacity: drag ? 0.35 : 1, animation: shake ? 'shake .3s' : undefined }}
          onPointerDown={e => { if (!locked && !busy.current) begin('card', e); }}>
          <Card symbol={target.symbol} name={target.name} number={target.number} />
        </div>
      )}
      {drag && target && (
        <div className="absolute pointer-events-none" style={{ left: drag.x - 60, top: drag.y - 66, width: 120, height: 120, transform: 'scale(1.15)' }}>
          <Card symbol={target.symbol} name={target.name} number={target.number} lift />
        </div>
      )}
      {done && target && (
        <div className="absolute pointer-events-none" style={{ left: 640 - 60, top: 500, width: 120, height: 120, animation: 'pop .5s .3s both' }}>
          <Card symbol={target.symbol} name={target.name} number={target.number} />
        </div>
      )}

      {/* 오배치 횟수 */}
      <div className="absolute flex gap-2" style={{ left: 720, top: 540 }}>
        {Array.from({ length: Math.min(misses, 5) }, (_, i) => <span key={i} className="w-4 h-4 rounded-full bg-red-400" />)}
      </div>

      {/* 보너스 놀이 입구 (5-5) */}
      {!done && <button type="button" aria-label="보너스 놀이" onClick={e => { openBonus(); e.currentTarget.blur(); }} className="absolute pointer-events-auto rounded-xl border-4 border-amber-300 bg-indigo-500/80 text-amber-200 text-[40px] font-black"
        style={{ left: 1150, top: 500, width: 76, height: 104, animation: 'bob 1.4s infinite' }}>?</button>}
      {bonus && <ElementCardGameOverlay onClose={closeBonus} />}

      <div className="absolute rounded-full bg-white/15 overflow-hidden" style={{ left: 340, top: 680, width: 600, height: 14 }}>
        <div className={`h-full rounded-full ${left < 0.2 ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: `${left * 100}%`, transition: 'width .2s linear' }} />
      </div>
      <div className="absolute inset-x-0 text-center text-[24px] text-white" style={{ top: 712, textShadow: '0 2px 6px #000' }}>{msg}</div>

      {done && <div className="absolute inset-0 bg-white pointer-events-none" style={{ animation: 'fadeout .6s forwards' }} />}
    </div>
  );
}

const Card = ({ symbol, name, number, lift = false }: { symbol: string; name: string; number: number; lift?: boolean }) => (
  <div className="relative h-full w-full">
    <div className="absolute rounded-full bg-black/40 blur-[4px]" style={{ left: 10, right: 10, bottom: lift ? -22 : -4, height: 16 }} />
    <div className="absolute inset-0 rounded-2xl bg-amber-100 border-4 border-amber-400 text-black text-center flex flex-col items-center justify-center leading-none">
      <div className="text-[14px] opacity-70">{number}</div>
      <div className="text-[46px] font-bold">{symbol}</div>
      <div className="text-[18px] font-bold mt-1">{name}</div>
    </div>
  </div>
);
