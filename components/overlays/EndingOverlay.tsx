'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/game/store';
import { useDataStore } from '@/game/dataStore';
import { playSfx } from '@/game/audio';
import { useLock } from '@/components/hooks/useLock';
import { Burst } from '@/components/overlays/Burst';
import { Art, artBg, artFrame } from '@/components/Art';

const ROW_START = 900, ROW_GAP = 380, BOOM_AT = 3400, END_AT = 6200;

/** 엔딩 피날레: 입자 지도(원자 → 분자·이온 → 물질) → 폭발·팡파르 → 별 카운트업 → 요약. 잠금 뒤 건너뛰기 가능. */
export function EndingOverlay() {
  const doneOrders = useGameStore(s => s.doneOrders);
  const stars = useGameStore(s => s.stars);
  const next = useGameStore(s => s.next);
  const substances = useDataStore(s => s.substances);
  const elements = useDataStore(s => s.elements);
  const [boom, setBoom] = useState(false);
  const [count, setCount] = useState(0);
  const locked = useLock(1000);
  const went = useRef(false);

  const go = useCallback(() => { if (!went.current) { went.current = true; next(); } }, [next]);
  const rows = substances.filter(s => s.order && doneOrders.includes(s.order) && s.id !== 'can-drink');

  useEffect(() => {
    const t1 = setTimeout(() => { setBoom(true); playSfx('success'); }, BOOM_AT);
    const t2 = setTimeout(go, END_AT);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [go]);

  useEffect(() => {
    if (!boom) return;
    const t0 = Date.now();
    const t = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / 1400);
      setCount(Math.round(stars * p));
      if (p >= 1) clearInterval(t);
    }, 40);
    return () => clearInterval(t);
  }, [boom, stars]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (!e.repeat && !locked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [locked, go]);

  const sym = (name: string) => elements.find(e => e.name.replace(/\(.*\)/, '') === name)?.symbol ?? name.slice(0, 2);

  return (
    <div className="absolute inset-0 bg-slate-950/85 pointer-events-auto select-none" onPointerDown={() => { if (!locked) go(); }}>
      <div className="absolute inset-x-0 top-[70px] flex justify-center gap-[150px] text-white/50 text-[20px] font-bold" style={{ animation: 'pop .6s .2s both' }}>
        <span>원자</span><span>분자·이온</span><span>물질</span>
      </div>
      <div className="absolute inset-x-0 top-[120px] flex flex-col items-center gap-3">
        {rows.map((s, i) => (
          <div key={s.id} className="flex items-center gap-6 w-[900px] justify-center" style={{ animation: `pop .5s cubic-bezier(.2,1.4,.4,1) ${ROW_START + i * ROW_GAP}ms both` }}>
            <div className="flex gap-2 w-[300px] justify-end flex-wrap">
              {s.components.map(c => (
                <span key={c} className="w-11 h-11 text-slate-900 font-black text-[17px] flex items-center justify-center" style={artBg('ui/cell_bright')}>{sym(c)}</span>
              ))}
            </div>
            <span className="text-amber-300 text-[28px]">→</span>
            <span className="w-[170px] text-center text-white/80 text-[20px] font-bold">{s.particle}</span>
            <span className="text-amber-300 text-[28px]">→</span>
            <span className="w-[180px] text-slate-900 text-[22px] font-black text-center py-1.5" style={artFrame('ui/panel_paper', 40, 12)}>{s.name}</span>
          </div>
        ))}
      </div>

      {boom && (<>
        <div className="absolute inset-0 bg-white pointer-events-none" style={{ animation: 'fadeout .9s forwards' }} />
        <div className="absolute left-1/2 top-[45%] pointer-events-none"><Burst count={36} radius={420} /></div>
        <div className="absolute left-1/4 top-[55%] pointer-events-none"><Burst count={20} radius={260} /></div>
        <div className="absolute right-1/4 top-[55%] pointer-events-none"><Burst count={20} radius={260} /></div>
        <div className="absolute inset-x-0 bottom-[70px] flex justify-center items-center gap-4 pointer-events-none" style={{ animation: 'pop .6s both' }}>
          <Art src="ui/star" style={{ width: 84, height: 82 }} />
          <span className="text-amber-300 text-[88px] font-black leading-none tabular-nums">{count}</span>
        </div>
      </>)}
    </div>
  );
}
