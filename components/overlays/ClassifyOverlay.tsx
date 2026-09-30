'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/game/store';
import { useDataStore } from '@/game/dataStore';
import { classify } from '@/game/rules';
import { eunneun } from '@/game/josa';
import { playSfx } from '@/game/audio';
import { useLock } from '@/components/hooks/useLock';
import { Burst } from '@/components/overlays/Burst';
import { AtomBall } from '@/components/overlays/MoleculeBenchOverlay';

type Answer = '원소' | '화합물';
const DOORS: { a: Answer; left: number; dir: 1 | -1 }[] = [{ a: '원소', left: 330, dir: -1 }, { a: '화합물', left: 650, dir: 1 }];
const W = 300, H = 400, TOP = 250, TRAVEL = 180;

/** 5-3 갈림길: 손잡이를 끝까지 끌어 문을 연다. 왼쪽 문은 왼쪽으로, 오른쪽 문은 오른쪽으로 당긴다. */
export function ClassifyOverlay() {
  const step = useGameStore(s => s.queue[s.stepIdx - 1]);
  const molecules = useDataStore(s => s.molecules);
  const elements = useDataStore(s => s.elements);
  const hints = useDataStore(s => s.dialog?.hints);
  const m = molecules.find(x => x.id === step?.target);
  const atoms = m ? Object.entries(m.atoms).flatMap(([k, n]) => Array<string>(n).fill(k)) : [];
  const kinds = [...new Set(atoms)];
  const names = kinds.map(k => elements.find(e => e.symbol === k)?.name ?? k);

  const [prog, setProg] = useState<Record<Answer, number>>({ 원소: 0, 화합물: 0 });
  const [grab, setGrab] = useState<Answer | null>(null);
  const [sel, setSel] = useState<Answer | null>(null);
  const [msg, setMsg] = useState('');
  const [good, setGood] = useState<Answer | null>(null);
  const [shake, setShake] = useState(0);
  const locked = useLock(1000);
  const stage = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const open = (a: Answer) => {
    if (busy.current || !atoms.length) return;
    busy.current = true;
    setProg(p => ({ ...p, [a]: 1 }));
    if (classify(atoms) === a) {   // 정답: 말풍선을 보여 준 뒤 store에 알린다
      setGood(a); setMsg(''); playSfx('correct'); setTimeout(() => playSfx('success'), 350);
      timer.current = setTimeout(() => useGameStore.getState().classify(a), 2400);
      return;
    }
    playSfx('error'); setShake(k => k + 1);
    useGameStore.getState().classify(a);   // 오답: mistakes+1, 별 감점은 store가 처리
    setMsg(step?.target === 'H2O' && hints?.classifyWrong ? hints.classifyWrong
      : kinds.length === 1 ? `${eunneun(m?.name ?? '')} ${names[0]} 원자 한 종류로 되어 있어요`
      : `${eunneun(m?.name ?? '')} ${names.join(' 원자와 ')} 원자, ${kinds.length === 2 ? '두' : kinds.length} 종류로 되어 있어요`);
    timer.current = setTimeout(() => { setProg({ 원소: 0, 화합물: 0 }); busy.current = false; }, 700);
  };

  const pull = (a: Answer, dir: 1 | -1, e: React.PointerEvent) => {
    if (locked || busy.current) return;
    e.preventDefault();
    const r = stage.current!.getBoundingClientRect();
    const sx = (e.clientX - r.left) / r.width * 1280;
    setGrab(a);
    const move = (ev: PointerEvent) => {
      const x = (ev.clientX - r.left) / r.width * 1280;
      const p = Math.min(1, Math.max(0, ((x - sx) * dir) / TRAVEL));
      if (p >= 1) { end(); open(a); } else setProg(q => ({ ...q, [a]: p }));
    };
    const end = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end);
      setGrab(null);
      if (!busy.current) setProg(q => ({ ...q, [a]: 0 }));   // 끝까지 못 끌면 문이 도로 닫힌다
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || locked || busy.current) return;
      if (e.key === 'ArrowLeft') setSel('원소');
      else if (e.key === 'ArrowRight') setSel('화합물');
      else if (e.key === 'Enter' && sel) { e.preventDefault(); open(sel); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, sel, atoms.join()]);

  return (
    <div ref={stage} className="absolute inset-0 select-none">
      {/* 위: 방금 만든 물질 (공이 서로 닿은 모양) */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-5 rounded-2xl bg-black/55 px-8" style={{ top: 56, height: 96 }}>
        <div className="flex">{atoms.map((k, i) => <div key={i} style={{ marginLeft: i ? -2 : 0 }}><AtomBall sym={k} size={48} /></div>)}</div>
        <span className="text-white text-[36px] font-bold whitespace-nowrap">{m?.formula} · {m?.name}</span>
      </div>

      <div className="absolute" style={{ left: 0, top: 0, width: 1280, height: 800, perspective: 1400, pointerEvents: 'none' }}>
        {DOORS.map(({ a, left, dir }) => {
          const p = prog[a];
          const hinge = dir === -1 ? 'left' : 'right';
          return (
            <div key={a} className="absolute" style={{ left, top: TOP, width: W, height: H, animation: shake && p === 1 ? 'shake .3s' : undefined }}>
              {/* 문 뒤: 밝은 빛 */}
              <div className="absolute inset-0 rounded-t-[120px] border-4 border-amber-900"
                style={{ background: good === a ? 'radial-gradient(circle, #fef9c3, #fcd34d)' : 'radial-gradient(circle, #1e293b, #020617)', transition: 'background .4s' }} />
              {good === a && <div className="absolute" style={{ left: W / 2, top: H / 2 }}><Burst count={30} radius={230} /></div>}
              {/* 문짝 */}
              <div className="absolute inset-0 rounded-t-[120px] border-4 border-amber-950 flex flex-col items-center"
                style={{ background: 'linear-gradient(90deg,#92400e,#b45309 50%,#92400e)', transformOrigin: `${hinge} center`, transform: `rotateY(${-dir * p * 78}deg)`,
                  transition: grab === a ? 'none' : 'transform .4s ease-out', boxShadow: sel === a ? '0 0 0 6px #fcd34d, 0 0 30px 10px #fcd34d88' : '0 10px 24px #0008', backfaceVisibility: 'hidden' }}>
                <div className="mt-24 text-amber-100 font-bold text-[40px] whitespace-nowrap">{a}</div>
                <div className="absolute rounded-full bg-black/30" style={{ [dir === -1 ? 'right' : 'left']: 8, top: 0, bottom: 0, width: 4 }} />
              </div>
              {/* 손잡이: 끌어서 연다 */}
              {!good && (
                <div className="absolute pointer-events-auto cursor-grab rounded-full flex items-center justify-center"
                  style={{ [dir === -1 ? 'right' : 'left']: 6, top: H / 2 - 10, width: 72, height: 72, touchAction: 'none', transform: `translateX(${dir * p * TRAVEL}px)` }}
                  onPointerDown={e => pull(a, dir, e)}>
                  <div className="rounded-full" style={{ width: 44, height: 44, background: 'radial-gradient(circle at 35% 30%, #fef3c7, #f59e0b 60%, #92400e)', border: '2px solid #fff', boxShadow: grab === a ? '0 14px 10px #0007' : '0 4px 4px #0007' }} />
                </div>
              )}
              {/* 손잡이를 당길 방향 안내 */}
              {!p && !locked && !good && (
                <svg className="absolute pointer-events-none" style={{ [dir === -1 ? 'right' : 'left']: dir === -1 ? 90 : 90, top: H / 2 + 4, animation: 'bob 1s ease-in-out infinite' }} width="46" height="40" viewBox="0 0 46 40">
                  <path d={dir === -1 ? 'M4 20 L24 4 V13 H42 V27 H24 V36 Z' : 'M42 20 L22 4 V13 H4 V27 H22 V36 Z'} fill="#fcd34d" stroke="#fff" strokeWidth="2" />
                </svg>
              )}
            </div>
          );
        })}
      </div>

      {good && (
        <div className="absolute left-1/2 -translate-x-1/2 rounded-2xl bg-white text-slate-900 text-center font-bold" style={{ top: 168, padding: '10px 22px', fontSize: 26, animation: 'pop .5s', wordBreak: 'keep-all' }}>
          <span className="text-amber-600">{kinds.length === 1 ? '한' : kinds.length === 2 ? '두' : kinds.length}</span> 종류의 원자 → {good}
        </div>
      )}
      <div className="absolute inset-x-0 text-center text-[24px] text-white" style={{ top: 690, textShadow: '0 2px 6px #000', wordBreak: 'keep-all' }}>{msg}</div>
    </div>
  );
}
