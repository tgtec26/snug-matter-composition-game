'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/game/store';
import { useDataStore } from '@/game/dataStore';
import { checkLattice, ionStars, latticeConflictCells, makeIon, toSup } from '@/game/rules';
import { playSfx } from '@/game/audio';
import { useLock } from '@/components/hooks/useLock';
import { useDrag } from '@/components/hooks/useDrag';
import { Burst } from '@/components/overlays/Burst';
import type { Step } from '@/game/types';

const CX = 640, CY = 380, NUC_R = 90, RING_R = 190, OUT_R = RING_R + 50, MAX_GAIN = 3;
const GL = 440, GT = 190, CELL = 100;   // 격자 (RoomScene.lattice 와 같은 좌표)
const ballBg = 'radial-gradient(circle at 35% 30%, #bfdbfe, #3b82f6 55%, #1e3a8a)';
const dist = (x: number, y: number, ax: number, ay: number) => Math.hypot(x - ax, y - ay);
/** 원자 번호만큼의 전자를 원 둘레에 균등하게 (껍질 구분 없음) */
const ringPos = (i: number, n: number) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2; return { x: CX + Math.cos(a) * RING_R, y: CY + Math.sin(a) * RING_R }; };

const Electron = ({ size, lift = false }: { size: number; lift?: boolean }) => (
  <div className="relative" style={{ width: size, height: size, transform: lift ? 'scale(1.15)' : undefined }}>
    <div className="absolute rounded-full bg-black/40 blur-[3px]"
      style={{ left: size * 0.1, right: size * 0.1, bottom: lift ? -size * 0.45 : -size * 0.08, height: size * 0.28 }} />
    <div className="absolute inset-0 rounded-full border border-white/40 flex items-center justify-center text-white font-bold"
      style={{ background: ballBg, fontSize: size * 0.55 }}>−</div>
  </div>
);

/** 5-4 이온 공방: 전자를 원 밖으로 끌어내면 (+), 상자의 전자를 원 안에 넣으면 (-). 판정은 rules.makeIon·checkLattice. */
export function IonWorkshopOverlay({ step }: { step: Step }) {
  const orderId = useGameStore(s => s.orderId);
  const completeRoom = useGameStore(s => s.completeRoom);
  const elements = useDataStore(s => s.elements);
  const ions = useDataStore(s => s.ions);
  const orders = useDataStore(s => s.orders);
  const hints = useDataStore(s => s.dialog?.hints);
  const cfg = useDataStore(s => s.minigame?.ion) as { seconds: number; lattice: number; dropRadius: number } | undefined;
  const size = cfg?.lattice ?? 4;
  const targetIon = ions.find(i => i.id === step.target);
  const atom = elements.find(e => e.symbol === targetIon?.symbol);
  const Z = atom?.number ?? 0;
  const ionSteps = orders.find(o => o.id === orderId)?.steps.filter(s => s.room === 'ion').map(s => s.target) ?? [];
  // 이온이 Na⁺·Cl⁻뿐인 주문(염화 나트륨)만: 마지막 이온 step 끝에 격자. 바닷물(Mg²⁺ 포함)은 격자 없음.
  const withLattice = ionSteps.includes('Na+') && ionSteps.includes('Cl-') && ionSteps.every(t => t === 'Na+' || t === 'Cl-') && ionSteps[ionSteps.length - 1] === step.target;

  const [delta, setDelta] = useState(0);   // 얻은 전자(+) / 잃은 전자(−)
  const [fails, setFails] = useState(0);
  const [msg, setMsg] = useState('');
  const [tick, setTick] = useState(0);
  const [phase, setPhase] = useState<'ion' | 'lattice'>('ion');
  const [done, setDone] = useState(false);
  const locked = useLock(900);
  const stage = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const dRef = useRef(delta);
  useEffect(() => { dRef.current = delta; });

  const change = useCallback((d: number) => setDelta(v => Math.min(MAX_GAIN, Math.max(-Z, v + d))), [Z]);
  const onDrop = useCallback((id: string, x: number, y: number) => {
    if (busy.current) return;
    const out = dist(x, y, CX, CY) > OUT_R;
    if (id.startsWith('el:') && out) change(-1);
    else if (id === 'box:e' && !out) change(1);
  }, [change]);
  const { drag, begin } = useDrag(stage, onDrop);
  const start = (id: string) => (e: React.PointerEvent) => { if (!locked && !busy.current) begin(id, e); };

  const charge = -delta;
  const formula = (targetIon?.symbol ?? '') + (charge ? toSup(Math.abs(charge), charge > 0 ? '+' : '-') : '');
  const dataset = { elements, molecules: [], ions };
  const live = targetIon ? makeIon(dataset, targetIon.symbol, charge) : null;
  const n = Z + delta;

  const finish = useCallback(() => {
    if (busy.current || locked || !targetIon) return;
    const res = makeIon(dataset, targetIon.symbol, -dRef.current);
    if (!res.ok || res.ion.id !== step.target) {
      playSfx('error'); busy.current = true; setFails(f => f + 1); setTick(k => k + 1);
      setMsg(dRef.current === 0 ? '전자를 잃거나 얻어야 이온이 돼요' : res.ok ? (hints?.ionNone ?? '') : res.hint);
      setTimeout(() => { setDelta(0); busy.current = false; }, 900);   // 원상복귀
      return;
    }
    busy.current = true; setMsg(''); setDone(true);
    playSfx('correct'); setTimeout(() => playSfx('success'), 350);
    const stars = ionStars(fails);
    if (withLattice) setTimeout(() => { setPhase('lattice'); setDone(false); busy.current = true; setTimeout(() => { busy.current = false; }, 800); }, 1800);
    else setTimeout(() => completeRoom({ room: 'ion', target: step.target, stars }), 2000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, targetIon, step.target, fails, withLattice, completeRoom, hints, elements, ions]);

  useEffect(() => {
    if (phase !== 'ion') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || locked || busy.current) return;
      if (e.key === 'Enter') { e.preventDefault(); finish(); }
      else if (e.key.toLowerCase() === 'e') change(e.shiftKey ? -1 : 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, locked, change, finish]);

  if (!targetIon || !atom) return null;
  if (phase === 'lattice') {
    return <Lattice size={size} hints={hints} onDone={() => completeRoom({ room: 'ion', target: step.target, stars: ionStars(fails) })} />;
  }
  const hiddenEl = drag?.id.startsWith('el:') ? Number(drag.id.slice(3)) : -1;
  const overOut = drag?.id.startsWith('el:') && dist(drag.x, drag.y, CX, CY) > OUT_R;
  const overIn = drag?.id === 'box:e' && dist(drag.x, drag.y, CX, CY) <= OUT_R;

  return (
    <div ref={stage} className="absolute inset-0 select-none">
      <div className="absolute left-1/2 top-[52px] -translate-x-1/2 rounded-full bg-black/60 px-6 py-1.5 text-amber-200 text-[20px] font-bold whitespace-nowrap">
        만들 이온 {targetIon.name} {targetIon.formula}
      </div>

      {/* 실시간 이온식·이름 */}
      <div className="absolute rounded-2xl bg-black/50 border border-white/20 text-center" style={{ left: 980, top: 120, width: 260, height: 150 }}>
        <div className="text-[60px] font-bold text-white leading-[80px]" style={{ textShadow: '0 3px 8px #000' }}>{formula}</div>
        <div className="text-[26px] font-bold text-amber-200 h-[40px]">{live?.ok ? live.ion.name : ''}</div>
      </div>

      {/* 안쪽/바깥 경계 안내: 끌고 있을 때만 반응 */}
      <div className={`absolute rounded-full border-4 border-dashed ${overOut || overIn ? 'border-amber-300/80' : 'border-white/10'}`}
        style={{ left: CX - OUT_R, top: CY - OUT_R, width: OUT_R * 2, height: OUT_R * 2 }} />

      {/* 원자핵 */}
      <div key={tick} className="absolute" style={{ left: CX - NUC_R, top: CY - NUC_R, width: NUC_R * 2, height: NUC_R * 2, animation: tick && !done ? 'shake .3s' : undefined }}>
        <div className="absolute rounded-full bg-black/40 blur-md" style={{ left: 15, right: 15, bottom: -34, height: 26 }} />
        <div className="absolute inset-0 rounded-full border-2 border-white/40 flex items-center justify-center text-[46px] font-bold text-red-200"
          style={{ background: 'radial-gradient(circle at 35% 30%, #4b5563, #1f2937 70%)', animation: done ? 'pop .6s' : undefined }}>
          +{Z}
        </div>
        {done && <Burst count={28} radius={260} />}
      </div>
      <div className="absolute text-[34px] font-bold text-sky-300" style={{ left: CX - 60, top: CY + NUC_R + 30, width: 120, textAlign: 'center', textShadow: '0 2px 6px #000' }}>−{n}</div>

      {/* 전자들 (원 둘레 균등 배치, 끌어서 밖으로) */}
      {Array.from({ length: n }, (_, i) => { const q = ringPos(i, n); return i === hiddenEl ? null : (
        <div key={`${n}-${i}`} className="absolute cursor-grab pointer-events-auto" style={{ left: q.x - 28, top: q.y - 28, width: 56, height: 56, touchAction: 'none', animation: 'pop .25s' }}
          onPointerDown={start(`el:${i}`)}>
          <div className="absolute left-2 top-2"><Electron size={40} /></div>
        </div>
      ); })}

      {/* 전자 상자 */}
      <div className="absolute rounded-2xl bg-black/50 border border-white/20 flex flex-col items-center justify-center"
        style={{ left: 40, top: 300, width: 150, height: 160 }}>
        <div className="cursor-grab pointer-events-auto" style={{ width: 76, height: 76, padding: 10, touchAction: 'none' }} onPointerDown={start('box:e')}>
          <Electron size={56} />
        </div>
      </div>

      <button type="button" disabled={done} onClick={finish}
        className="absolute pointer-events-auto rounded-2xl border-2 text-[26px] font-bold bg-amber-400 border-amber-100 text-black"
        style={{ left: 1030, top: 340, width: 210, height: 80 }}>완성</button>

      <div className="absolute inset-x-0 text-center text-[24px] text-white" style={{ top: 712, textShadow: '0 2px 6px #000' }}>{msg}</div>

      {done && (
        <>
          <div className="absolute inset-0 bg-white pointer-events-none" style={{ animation: 'fadeout .6s forwards' }} />
          <div className="absolute rounded-2xl bg-amber-100 border-4 border-amber-400 text-black text-center pointer-events-none"
            style={{ left: 1040, top: 470, width: 190, padding: 12, animation: 'pop .5s .3s both' }}>
            <div className="text-[46px] font-bold leading-none">{targetIon.formula}</div>
            <div className="text-[20px] font-bold mt-1">{targetIon.name}</div>
          </div>
        </>
      )}

      {drag && (
        <div className="absolute pointer-events-none" style={{ left: drag.x - 28, top: drag.y - 34 }}>
          <Electron size={56} lift />
        </div>
      )}
    </div>
  );
}

type Grid = (string | null)[][];
const tileStyle = (v: string) => (v === '+'
  ? { bg: 'radial-gradient(circle at 35% 30%, #fed7aa, #f97316 55%, #9a3412)', label: 'Na⁺' }
  : { bg: 'radial-gradient(circle at 35% 30%, #bbf7d0, #22c55e 55%, #166534)', label: 'Cl⁻' });

const Tile = ({ v, size = 84, lift = false, bad = false }: { v: string; size?: number; lift?: boolean; bad?: boolean }) => (
  <div className="relative" style={{ width: size, height: size, transform: lift ? 'scale(1.15)' : undefined, animation: bad ? 'shake .3s 2' : undefined }}>
    <div className="absolute rounded-full bg-black/40 blur-[4px]"
      style={{ left: size * 0.1, right: size * 0.1, bottom: lift ? -size * 0.4 : -size * 0.06, height: size * 0.26 }} />
    <div className={`absolute inset-0 rounded-full border-2 flex items-center justify-center text-white font-bold ${bad ? 'border-red-400' : 'border-white/50'}`}
      style={{ background: tileStyle(v).bg, fontSize: size * 0.36, boxShadow: bad ? '0 0 0 5px rgba(248,113,113,.8)' : undefined }}>{tileStyle(v).label}</div>
  </div>
);

/** 염화 나트륨: Na⁺·Cl⁻ 타일을 격자에 번갈아 놓는다. 판정은 rules.checkLattice. */
function Lattice({ size, hints, onDone }: { size: number; hints?: Record<string, string>; onDone: () => void }) {
  const [grid, setGrid] = useState<Grid>(() => Array.from({ length: size }, () => Array<string | null>(size).fill(null)));
  const [bad, setBad] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const [cur, setCur] = useState({ r: 0, c: 0 });
  const [done, setDone] = useState(false);
  const locked = useLock(800);
  const stage = useRef<HTMLDivElement>(null);
  const gRef = useRef(grid);
  const busy = useRef(false);

  const apply = useCallback((next: Grid) => {
    gRef.current = next; setGrid(next);
    const res = checkLattice(next), cells = latticeConflictCells(next);
    setBad(cells);
    if (res.conflicts > 0) { playSfx('error'); setMsg(hints?.latticeOpposite ?? ''); return; }
    setMsg('');
    if (res.complete) {
      busy.current = true; setDone(true);
      playSfx('correct'); setTimeout(() => playSfx('success'), 350);
      window.dispatchEvent(new CustomEvent('room-fx', { detail: { kind: 'lattice' } }));
      setTimeout(onDone, 3200);
    } else playSfx('correct');
  }, [hints, onDone]);
  const put = useCallback((r: number, c: number, v: string | null, from?: [number, number]) => {
    const next = gRef.current.map(row => [...row]);
    if (from) next[from[0]][from[1]] = null;
    if (r >= 0) next[r][c] = v;
    apply(next);
  }, [apply]);

  const onDrop = useCallback((id: string, x: number, y: number) => {
    if (busy.current) return;
    const c = Math.floor((x - GL) / CELL), r = Math.floor((y - GT) / CELL);
    const inside = r >= 0 && r < size && c >= 0 && c < size;
    if (id.startsWith('tray:')) { if (inside) put(r, c, id.slice(5)); }
    else {
      const [fr, fc] = id.slice(5).split(',').map(Number), v = gRef.current[fr][fc];
      if (inside && (r !== fr || c !== fc)) put(r, c, v, [fr, fc]);
      else if (!inside) put(-1, 0, null, [fr, fc]);   // 밖으로 끌어내면 뺀다
    }
  }, [put, size]);
  const { drag, begin } = useDrag(stage, onDrop);
  const start = (id: string) => (e: React.PointerEvent) => { if (!locked && !busy.current) begin(id, e); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || locked || busy.current) return;
      const mv: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
      if (mv[e.key]) { e.preventDefault(); setCur(p => ({ r: Math.min(size - 1, Math.max(0, p.r + mv[e.key][0])), c: Math.min(size - 1, Math.max(0, p.c + mv[e.key][1])) })); }
      else if (e.key === '+' || e.key === '=') put(cur.r, cur.c, '+');
      else if (e.key === '-') put(cur.r, cur.c, '-');
      else if (e.key === 'Backspace' || e.key === 'Delete') put(cur.r, cur.c, null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [locked, size, cur, put]);

  const hidden = drag?.id.startsWith('cell:') ? drag.id.slice(5) : '';
  return (
    <div ref={stage} className="absolute inset-0 select-none">
      <div className="absolute left-1/2 top-[52px] -translate-x-1/2 rounded-full bg-black/60 px-6 py-1.5 text-amber-200 text-[20px] font-bold whitespace-nowrap">염화 나트륨 만들기</div>

      {/* 격자 판 */}
      <div className="absolute rounded-2xl bg-black/40 border-2 border-white/25" style={{ left: GL - 10, top: GT - 10, width: size * CELL + 20, height: size * CELL + 20 }} />
      {grid.map((row, r) => row.map((v, c) => {
        const key = `${r},${c}`, isCur = cur.r === r && cur.c === c;
        return (
          <div key={key} className={`absolute rounded-xl border-2 border-dashed ${isCur ? 'border-amber-300' : 'border-white/25'}`}
            style={{ left: GL + c * CELL + 4, top: GT + r * CELL + 4, width: CELL - 8, height: CELL - 8 }}>
            {v && key !== hidden && (
              <div className="absolute cursor-grab pointer-events-auto flex items-center justify-center" style={{ left: -4, top: -4, width: CELL, height: CELL, touchAction: 'none', animation: 'pop .25s' }}
                onPointerDown={start(`cell:${key}`)}>
                <Tile v={v} bad={bad.includes(key)} />
              </div>
            )}
          </div>
        );
      }))}

      {/* 타일 상자 */}
      <div className="absolute rounded-2xl bg-black/50 border border-white/20 flex flex-col items-center justify-center gap-6" style={{ left: 60, top: 250, width: 170, height: 300 }}>
        {(['+', '-'] as const).map(v => (
          <div key={v} className="cursor-grab pointer-events-auto flex items-center justify-center" style={{ width: 100, height: 100, touchAction: 'none' }} onPointerDown={start(`tray:${v}`)}>
            <Tile v={v} />
          </div>
        ))}
      </div>

      {done && (
        <>
          <div className="absolute rounded-2xl bg-amber-100 border-4 border-amber-400 text-black text-center pointer-events-none"
            style={{ left: 910, top: 320, width: 340, padding: 14, animation: 'pop .5s .5s both' }}>
            <div className="text-[26px] font-bold leading-tight whitespace-nowrap">이온으로 이루어진 물질</div>
            <div className="text-[20px] mt-1">염화 나트륨</div>
          </div>
          <Burst count={30} radius={300} />
        </>
      )}
      <div className="absolute inset-x-0 text-center text-[24px] text-white" style={{ top: 712, textShadow: '0 2px 6px #000' }}>{msg}</div>

      {drag && drag.id.length > 0 && (() => {
        const v = drag.id.startsWith('tray:') ? drag.id.slice(5) : grid[Number(drag.id.slice(5).split(',')[0])]?.[Number(drag.id.slice(5).split(',')[1])];
        return v ? <div className="absolute pointer-events-none" style={{ left: drag.x - 42, top: drag.y - 50 }}><Tile v={v} lift /></div> : null;
      })()}
    </div>
  );
}
