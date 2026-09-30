'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDataStore } from '@/game/dataStore';
import { cardGameStars, cardMatch, nextPos } from '@/game/rules';
import { playSfx } from '@/game/audio';
import { useLock } from '@/components/hooks/useLock';
import { useDrag } from '@/components/hooks/useDrag';
import { Burst } from '@/components/overlays/Burst';

const N = 12, CX = 640, CY = 430, R = 250, CW = 104, CH = 56, SYM = 60, GAP = 6;
const ringPos = (i: number, r = R) => { const a = (i / N) * Math.PI * 2 - Math.PI / 2; return { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r }; };
const slotPos = (s: number) => ({ x: CX - (4 * SYM + 3 * GAP) / 2 + (s % 4) * (SYM + GAP), y: CY - (3 * SYM + 2 * GAP) / 2 + Math.floor(s / 4) * (SYM + GAP) });
const shuffled = () => { const a = Array.from({ length: N }, (_, i) => i); for (let i = N - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/** 5-5 보너스: 이름 카드 12장이 원, 기호 카드는 뒤집혀 가운데. 맞는 기호를 뒤집으면 말을 끌어 한 칸 옮기고, 한 바퀴 돌면 끝. (교과서 141쪽 카드 구성을 알 수 없어 수소~마그네슘 12개 사용) */
export function ElementCardGameOverlay({ onClose }: { onClose: () => void }) {
  const elements = useDataStore(s => s.elements).slice(0, N);
  const [order] = useState(shuffled);           // 가운데 슬롯 → 원소 번호(0~11)
  const [pos, setPos] = useState(0);
  const [moved, setMoved] = useState(0);
  const [pending, setPending] = useState(false);   // 일치했으니 말을 옮길 차례
  const [gone, setGone] = useState<number[]>([]);
  const [peek, setPeek] = useState<number | null>(null);   // 틀려서 잠깐 보이는 슬롯
  const [wrong, setWrong] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [msg, setMsg] = useState('');
  const locked = useLock(700);
  const busy = useRef(false);
  const stage = useRef<HTMLDivElement>(null);
  const done = moved >= N;

  const flip = useCallback((s: number) => {
    if (locked || busy.current || pending || done || gone.includes(s) || !elements.length) return;
    if (cardMatch(pos, order[s])) {
      playSfx('correct'); setPeek(s); busy.current = true; setMsg('');
      setTimeout(() => { setGone(g => [...g, s]); setPeek(null); setPending(true); busy.current = false; }, 500);
    } else {
      playSfx('error'); setPeek(s); busy.current = true; setWrong(w => w + 1); setMsg(`${elements[order[s]].symbol} 카드는 다른 이름의 것이에요`);
      setTimeout(() => { setPeek(null); busy.current = false; }, 900);
    }
  }, [locked, pending, done, gone, pos, order, elements]);

  const move = useCallback(() => {
    if (!pending) return;
    const m = moved + 1;
    setPending(false); setMoved(m); setPos(nextPos(pos, N)); setMsg('');
    if (m >= N) { playSfx('correct'); setTimeout(() => playSfx('success'), 350); } else playSfx('correct');
  }, [pending, pos, moved]);

  const onDrop = useCallback((_id: string, x: number, y: number) => {
    const t = nextPos(pos, N), p = ringPos(t);
    if (Math.hypot(x - p.x, y - p.y) < 90) move(); else { playSfx('error'); setMsg('말을 다음 이름 카드로 끌어 놓아요'); }
  }, [pos, move]);
  const { drag, begin } = useDrag(stage, onDrop);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      e.stopPropagation();   // 아래의 주기율표 광장이 키를 받지 않게 한다
      if (e.repeat) return;
      if (e.key === 'Escape') { onClose(); return; }
      if (locked && !done) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (done) onClose(); else if (pending) move(); else flip(cursor); return; }
      if (pending && e.key === 'ArrowRight') { move(); return; }
      const d = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4 } as Record<string, number>)[e.key];
      if (d) { e.preventDefault(); setCursor(c => Math.min(N - 1, Math.max(0, c + d))); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [locked, done, pending, cursor, flip, move, onClose]);

  const pp = ringPos(pos, R + 44);
  const pieceX = drag ? drag.x : pp.x, pieceY = drag ? drag.y : pp.y;
  const nxt = ringPos(nextPos(pos, N));

  return (
    <div ref={stage} className="absolute inset-0 bg-slate-950/95 pointer-events-auto select-none" style={{ zIndex: 20 }}>
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute left-4 top-[52px] w-11 h-11 rounded-xl bg-white/15 border border-white/40 text-white text-[22px] font-bold">×</button>

      {elements.map((e, i) => {
        const p = ringPos(i);
        const isNext = pending && i === nextPos(pos, N);
        const filled = i < moved || (done && i === 0);
        return (
          <div key={e.symbol} className={`absolute rounded-xl border-4 flex flex-col items-center justify-center leading-none ${filled ? 'bg-amber-200 border-amber-400 text-slate-900' : 'bg-sky-100 border-sky-300 text-slate-900'} ${isNext ? 'ring-4 ring-amber-300' : ''}`}
            style={{ left: p.x - CW / 2, top: p.y - CH / 2, width: CW, height: CH, animation: isNext ? 'bob 0.8s infinite' : undefined }}>
            <span className="text-[19px] font-bold">{e.name.replace(/\(.*\)/, '')}</span>
            {filled && <span className="text-[15px] font-black text-sky-700 mt-0.5">{e.symbol}</span>}
          </div>
        );
      })}

      {order.map((el, s) => {
        if (gone.includes(s)) return null;
        const p = slotPos(s), up = peek === s, cur = cursor === s && !pending && !done;
        return (
          <button key={s} type="button" aria-label={`기호 카드 ${s + 1}`} onClick={() => { setCursor(s); flip(s); }}
            className={`absolute rounded-lg border-4 font-black text-[24px] flex items-center justify-center ${up ? 'bg-amber-100 border-amber-400 text-slate-900' : 'bg-indigo-500 border-indigo-200 text-transparent'} ${cur ? 'ring-4 ring-white' : ''}`}
            style={{ left: p.x, top: p.y, width: SYM, height: SYM, transform: up ? 'scale(1.15)' : undefined, transition: 'transform .15s', touchAction: 'manipulation' }}>
            {up ? elements[el].symbol : '?'}
          </button>
        );
      })}

      {/* 말: 일치한 뒤에만 끌 수 있다 (집으면 커진다) */}
      {!done && (
        <div className={`absolute rounded-full bg-rose-500 border-4 border-white ${pending ? 'cursor-grab' : ''}`}
          style={{ left: pieceX - 24, top: pieceY - 24, width: 48, height: 48, touchAction: 'none', transform: drag ? 'scale(1.25)' : undefined,
            boxShadow: drag ? '0 18px 10px -6px rgba(0,0,0,.6)' : '0 5px 0 rgba(0,0,0,.45)', animation: pending && !drag ? 'bob .7s infinite' : undefined, pointerEvents: pending ? 'auto' : 'none', zIndex: 5 }}
          onPointerDown={e => { if (pending && !locked) begin('piece', e); }} />
      )}
      {pending && !drag && <div className="absolute pointer-events-none text-amber-300 text-[36px] font-black" style={{ left: nxt.x - 12, top: nxt.y - 70 }}>↓</div>}

      {wrong > 0 && !done && <div className="absolute flex gap-1.5" style={{ left: 20, top: 110 }}>{Array.from({ length: Math.min(wrong, 12) }, (_, i) => <span key={i} className="w-3.5 h-3.5 rounded-full bg-red-400" />)}</div>}
      <div className="absolute inset-x-0 text-center text-[24px] text-white" style={{ bottom: 22, textShadow: '0 2px 6px #000' }}>{msg}</div>

      {done && (<>
        <div className="absolute inset-0 bg-white pointer-events-none" style={{ animation: 'fadeout .8s forwards' }} />
        <div className="absolute pointer-events-none" style={{ left: CX, top: CY }}><Burst count={36} radius={380} /></div>
        <div className="absolute flex flex-col items-center gap-3" style={{ left: CX - 140, top: CY - 100, width: 280, animation: 'pop .6s .3s both' }}>
          <div className="text-amber-300 text-[36px] font-black">보너스 별</div>
          <div className="text-amber-300 text-[96px] font-black leading-none">+{cardGameStars(wrong)}</div>
          <button type="button" onClick={onClose} className="h-[52px] px-8 rounded-xl bg-amber-400 border-2 border-amber-200 text-black text-[20px] font-bold">돌아가기</button>
        </div>
      </>)}
    </div>
  );
}
