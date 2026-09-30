'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/game/store';
import { useDataStore } from '@/game/dataStore';
import { atomStars, identifyAtom } from '@/game/rules';
import { playSfx } from '@/game/audio';
import { useLock } from '@/components/hooks/useLock';
import { useDrag } from '@/components/hooks/useDrag';
import { Burst } from '@/components/overlays/Burst';
import type { Step } from '@/game/types';

const CX = 640, CY = 380, NUC_R = 90, RING_R = 200, MAX = 20;
type Kind = 'p' | 'n' | 'e';
const STYLE: Record<Kind, { bg: string; sym: string; name: string }> = {
  p: { bg: 'radial-gradient(circle at 35% 30%, #fecaca, #ef4444 55%, #991b1b)', sym: '+', name: '양성자' },
  n: { bg: 'radial-gradient(circle at 35% 30%, #f3f4f6, #9ca3af 55%, #4b5563)', sym: '', name: '중성자' },
  e: { bg: 'radial-gradient(circle at 35% 30%, #bfdbfe, #3b82f6 55%, #1e3a8a)', sym: '−', name: '전자' },
};
const slotPos = (i: number) => { const a = (i / MAX) * Math.PI * 2 - Math.PI / 2; return { x: CX + Math.cos(a) * RING_R, y: CY + Math.sin(a) * RING_R }; };
/** 원자핵 안 입자 자리: 해바라기 배열, 양성자·중성자를 번갈아 섞는다 */
const dotPos = (i: number) => { const r = 13 * Math.sqrt(i + 0.5), a = i * 2.39996; return { x: Math.cos(a) * r, y: Math.sin(a) * r }; };
const mix = (p: number, n: number): Kind[] => {
  const out: Kind[] = []; let a = p, b = n;
  while (a + b > 0) { if (a > 0) { out.push('p'); a--; } if (b > 0) { out.push('n'); b--; } }
  return out;
};
const dist = (x: number, y: number, ax: number, ay: number) => Math.hypot(x - ax, y - ay);

interface S { p: number; n: number; slots: number[]; wobble: number; fails: number }

const Ball = ({ kind, size, lift = false }: { kind: Kind; size: number; lift?: boolean }) => (
  <div className="relative" style={{ width: size, height: size, transform: lift ? 'scale(1.15)' : undefined }}>
    <div className="absolute rounded-full bg-black/40 blur-[3px]"
      style={{ left: size * 0.1, right: size * 0.1, bottom: lift ? -size * 0.45 : -size * 0.08, height: size * 0.28, transition: 'bottom .1s' }} />
    <div className="absolute inset-0 rounded-full border border-white/40 flex items-center justify-center text-white font-bold"
      style={{ background: STYLE[kind].bg, fontSize: size * 0.55 }}>{STYLE[kind].sym}</div>
  </div>
);

/** 5-1 원자 조립기: 상자의 입자를 끌어다 원자핵·전자 자리에 놓는다. 판정은 rules.identifyAtom. */
export function AtomBuilderOverlay({ step }: { step: Step }) {
  const orderId = useGameStore(s => s.orderId);
  const completeRoom = useGameStore(s => s.completeRoom);
  const elements = useDataStore(s => s.elements);
  const hints = useDataStore(s => s.dialog?.hints);
  const cfg = useDataStore(s => s.minigame?.atom) as { seconds: number; dropRadius: number } | undefined;
  const seconds = cfg?.seconds ?? 45, dropR = cfg?.dropRadius ?? 70;
  const tutorial = orderId === 'o0';
  const target = elements.find(e => e.symbol === step.target);

  const [s, setS] = useState<S>({ p: 0, n: 0, slots: [], wobble: 0, fails: 0 });
  const [msg, setMsg] = useState(tutorial ? '' : '중성자는 박사가 넣어 두었어. 원자의 종류는 양성자수로 정해져.');
  const [failTick, setFailTick] = useState(0);
  const [done, setDone] = useState<{ symbol: string; name: string } | null>(null);
  const [t0] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const locked = useLock(900);
  const stage = useRef<HTMLDivElement>(null);
  const sRef = useRef(s);
  useEffect(() => { sRef.current = s; });
  const busy = useRef(false);   // 성공 연출·실패 직후 입력 잠금

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setElapsed((Date.now() - t0) / 1000), 200);
    return () => clearInterval(t);
  }, [done, t0]);

  const add = useCallback((k: Kind, slot?: number) => setS(v => {
    if (k === 'p') return v.p >= MAX ? v : { ...v, p: v.p + 1 };
    if (k === 'n') return v.n >= MAX ? v : { ...v, n: v.n + 1 };
    if (v.slots.length >= MAX) return v;
    const free = Array.from({ length: MAX }, (_, i) => i).filter(i => !v.slots.includes(i));
    return { ...v, slots: [...v.slots, slot !== undefined && free.includes(slot) ? slot : free[0]] };
  }), []);
  const remove = useCallback((k: Kind, slot?: number) => setS(v => {
    if (k === 'p') return v.p ? { ...v, p: v.p - 1, wobble: v.wobble + 1 } : v;
    if (k === 'n') return v.n ? { ...v, n: v.n - 1, wobble: v.wobble + 1 } : v;
    if (!v.slots.length) return v;
    const at = slot !== undefined && v.slots.includes(slot) ? slot : v.slots[v.slots.length - 1];
    return { ...v, slots: v.slots.filter(i => i !== at), wobble: v.wobble + 1 };
  }), []);

  const nearestFree = (x: number, y: number, ignore?: number) => {
    let best = -1, bd = Infinity;
    for (let i = 0; i < MAX; i++) {
      if (sRef.current.slots.includes(i) && i !== ignore) continue;
      const q = slotPos(i), d = dist(x, y, q.x, q.y);
      if (d < bd) { bd = d; best = i; }
    }
    return { best, bd };
  };

  const onDrop = useCallback((id: string, x: number, y: number) => {
    if (busy.current) return;
    const [from, arg] = id.split(':');
    const inNuc = dist(x, y, CX, CY) <= NUC_R + 20;
    if (from === 'box') {
      const k = arg as Kind;
      if (k === 'e') { const { best, bd } = nearestFree(x, y); if (bd <= dropR && !inNuc) add('e', best); }
      else if (inNuc) add(k);
    } else if (from === 'pull') {
      if (!inNuc) remove(arg as Kind);
    } else if (from === 'el') {
      const i = Number(arg), r = dist(x, y, CX, CY);
      if (Math.abs(r - RING_R) <= dropR && r > NUC_R + 20) {
        const { best } = nearestFree(x, y, i);
        setS(v => ({ ...v, slots: v.slots.map(q => (q === i ? best : q)) }));
      } else remove('e', i);
    }
  }, [add, remove, dropR]);
  const { drag, begin } = useDrag(stage, onDrop);

  const start = (id: string) => (e: React.PointerEvent) => { if (!locked && !busy.current) begin(id, e); };
  const pullFromNucleus = (e: React.PointerEvent) => {
    if (locked || busy.current) return;
    const v = sRef.current, kinds = mix(v.p, tutorial ? v.n : 0);
    if (!kinds.length) return;
    const r = stage.current!.getBoundingClientRect(), k = 1280 / r.width;
    const px = (e.clientX - r.left) * k - CX, py = (e.clientY - r.top) * k - CY;
    let best = 0, bd = Infinity;
    kinds.forEach((_, i) => { const q = dotPos(i), d = dist(px, py, q.x, q.y); if (d < bd) { bd = d; best = i; } });
    begin(`pull:${kinds[best]}`, e);
  };

  const finish = useCallback(() => {
    if (busy.current || locked) return;
    const v = sRef.current;
    if (v.p < 1) return;
    const res = identifyAtom({ elements, molecules: [], ions: [] }, v.p, v.slots.length, tutorial ? v.n : undefined);
    const say = (t: string) => { setMsg(t); setFailTick(k => k + 1); };
    if (!res.ok) {
      playSfx('error'); busy.current = true; setTimeout(() => { busy.current = false; }, 500);
      setS(x => ({ ...x, fails: x.fails + 1 }));
      say(res.reason === 'charged' && hints?.atomCharged ? hints.atomCharged : res.hint);
      return;
    }
    if (res.element.symbol !== step.target) {   // 주문과 다른 원소: 감점 없이 계속
      playSfx('error'); busy.current = true; setTimeout(() => { busy.current = false; }, 500);
      say(`이건 ${res.element.name}이야, 주문서는 ${target?.name ?? step.target}`);
      return;
    }
    busy.current = true;
    playSfx('correct'); setTimeout(() => playSfx('success'), 350);
    setMsg(''); setDone({ symbol: res.element.symbol, name: res.element.name });
    const stars = atomStars(v.wobble, (Date.now() - t0) / 1000 > seconds, v.fails);
    setTimeout(() => completeRoom({ room: 'atom', target: res.element.symbol, stars }), 2000);
  }, [locked, elements, tutorial, hints, step.target, target, t0, seconds, completeRoom]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || locked || busy.current) return;
      if (e.key === 'Enter') { e.preventDefault(); finish(); return; }
      const k = e.key.toLowerCase();
      if (k !== 'p' && k !== 'n' && k !== 'e') return;
      if (k === 'n' && !tutorial) return;
      (e.shiftKey ? remove : add)(k as Kind);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [locked, tutorial, add, remove, finish]);

  const live = elements.find(e => e.number === s.p);
  const kinds = mix(s.p, tutorial ? s.n : Math.min(s.p > 0 ? 3 : 0, MAX));   // 비튜토리얼: 개수 단정 없이 장식용 회색 알갱이
  const left = Math.max(0, 1 - elapsed / seconds);
  const dragKind = drag ? (drag.id.split(':')[1].replace(/\d+/, 'e') as Kind) : null;
  const trayKinds: Kind[] = tutorial ? ['p', 'n', 'e'] : ['p', 'e'];
  const hiddenEl = drag?.id.startsWith('el:') ? Number(drag.id.split(':')[1]) : -1;

  return (
    <div ref={stage} className="absolute inset-0 select-none">
      {/* 주문 목표 + 실시간 원소 이름 */}
      <div className="absolute left-1/2 top-[52px] -translate-x-1/2 rounded-full bg-black/60 px-6 py-1.5 text-amber-200 text-[20px] font-bold">
        만들 원소 {target?.name} {target?.symbol}
      </div>
      <div className="absolute left-1/2 top-[100px] -translate-x-1/2 text-[44px] font-bold text-white h-[56px] whitespace-nowrap" style={{ textShadow: '0 3px 8px #000' }}>
        {live ? `${live.name} ${live.symbol}` : ''}
      </div>

      {/* 전자 자리 */}
      {Array.from({ length: MAX }, (_, i) => { const q = slotPos(i); return (
        <div key={i} className="absolute rounded-full border-2 border-dashed border-sky-200/40"
          style={{ left: q.x - 22, top: q.y - 22, width: 44, height: 44 }} />
      ); })}
      {/* 놓인 전자 */}
      {s.slots.map(i => { const q = slotPos(i); return i === hiddenEl ? null : (
        <div key={i} className="absolute cursor-grab pointer-events-auto" style={{ left: q.x - 28, top: q.y - 28, width: 56, height: 56, touchAction: 'none', animation: 'pop .25s' }}
          onPointerDown={start(`el:${i}`)}>
          <div className="absolute left-2 top-2"><Ball kind="e" size={40} /></div>
        </div>
      ); })}

      {/* 원자핵: 그림자 타원 + 구 */}
      <div key={failTick} className="absolute" style={{ left: CX - NUC_R, top: CY - NUC_R, width: NUC_R * 2, height: NUC_R * 2, animation: failTick && !done ? 'shake .3s' : undefined }}>
        <div className="absolute rounded-full bg-black/40 blur-md" style={{ left: 15, right: 15, bottom: -34, height: 26 }} />
        <div className={`absolute inset-0 rounded-full border-2 pointer-events-auto ${drag && drag.id.startsWith('box:') && drag.id !== 'box:e' && dist(drag.x, drag.y, CX, CY) <= NUC_R + 20 ? 'border-amber-300' : 'border-white/40'}`}
          style={{ background: 'radial-gradient(circle at 35% 30%, #4b5563, #1f2937 70%)', animation: done ? 'pop .6s' : undefined, touchAction: 'none', cursor: 'grab' }}
          onPointerDown={pullFromNucleus}>
          {kinds.map((k, i) => { const q = dotPos(i); return (
            <div key={i} className="absolute" style={{ left: NUC_R + q.x - 10, top: NUC_R + q.y - 10, width: 20, height: 20 }}><Ball kind={k} size={20} /></div>
          ); })}
        </div>
        {done && <Burst count={28} radius={260} />}
      </div>
      <div className="absolute text-[34px] font-bold text-red-300" style={{ left: CX - 60, top: CY - NUC_R - 62, width: 120, textAlign: 'center', textShadow: '0 2px 6px #000' }}>+{s.p}</div>
      <div className="absolute text-[34px] font-bold text-sky-300" style={{ left: CX - 60, top: CY + NUC_R + 30, width: 120, textAlign: 'center', textShadow: '0 2px 6px #000' }}>−{s.slots.length}</div>

      {/* 입자 상자 */}
      <div className="absolute rounded-2xl bg-black/50 border border-white/20 flex flex-col items-center justify-center gap-5"
        style={{ left: 40, top: 190, width: 190, height: 400 }}>
        {trayKinds.map(k => (
          <div key={k} className="flex flex-col items-center gap-1">
            <div className="cursor-grab pointer-events-auto" style={{ width: 76, height: 76, padding: 10, touchAction: 'none' }} onPointerDown={start(`box:${k}`)}>
              <Ball kind={k} size={56} />
            </div>
            <div className="text-[16px] text-white/80">{STYLE[k].name} ({k.toUpperCase()})</div>
          </div>
        ))}
      </div>

      {/* 완료 버튼 */}
      <button type="button" disabled={s.p < 1 || !!done} onClick={finish}
        className={`absolute pointer-events-auto rounded-2xl border-2 text-[26px] font-bold ${s.p < 1 ? 'bg-white/10 border-white/20 text-white/40' : 'bg-amber-400 border-amber-100 text-black'}`}
        style={{ left: 1030, top: 340, width: 210, height: 80 }}>
        완성
      </button>

      {/* 시간 막대(글자 없음) + 한 줄 안내 */}
      <div className="absolute rounded-full bg-white/15 overflow-hidden" style={{ left: 340, top: 680, width: 600, height: 14 }}>
        <div className={`h-full rounded-full ${left < 0.2 ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: `${left * 100}%`, transition: 'width .2s linear' }} />
      </div>
      <div className="absolute inset-x-0 text-center text-[24px] text-white" style={{ top: 712, textShadow: '0 2px 6px #000' }}>{msg}</div>

      {/* 성공: 번쩍임 + 카드 */}
      {done && (
        <>
          <div className="absolute inset-0 bg-white pointer-events-none" style={{ animation: 'fadeout .6s forwards' }} />
          <div className="absolute rounded-2xl bg-amber-100 border-4 border-amber-400 text-black text-center pointer-events-none"
            style={{ left: 1040, top: 470, width: 190, padding: 12, animation: 'pop .5s .3s both' }}>
            <div className="text-[46px] font-bold leading-none">{done.symbol}</div>
            <div className="text-[20px] font-bold mt-1">{done.name}</div>
          </div>
        </>
      )}

      {/* 드래그 중인 입자: 집으면 1.15배, 그림자 멀어짐 */}
      {drag && dragKind && (
        <div className="absolute pointer-events-none" style={{ left: drag.x - 28, top: drag.y - 34 }}>
          <Ball kind={dragKind} size={56} lift />
        </div>
      )}
    </div>
  );
}
