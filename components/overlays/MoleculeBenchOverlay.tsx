'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '@/game/store';
import { useDataStore } from '@/game/dataStore';
import { addToDex } from '@/game/dex';
import { canGrow, identifyMolecule, liveFormula, moleculeStars } from '@/game/rules';
import { iga, ieyo } from '@/game/josa';
import { playSfx } from '@/game/audio';
import { useLock } from '@/components/hooks/useLock';
import { useDrag } from '@/components/hooks/useDrag';
import { Burst } from '@/components/overlays/Burst';
import type { Step } from '@/game/types';

const D = 56;
const BX0 = 140, BX1 = 900, BY0 = 150, BY1 = 580;
const BOX_Y = 690, BOX_X = 380;
const COLORS: Record<string, { bg: string; fg: string }> = {
  H: { bg: 'radial-gradient(circle at 35% 30%, #ffffff, #e2e8f0 55%, #94a3b8)', fg: '#0f172a' },
  C: { bg: 'radial-gradient(circle at 35% 30%, #9ca3af, #374151 55%, #111827)', fg: '#fff' },
  N: { bg: 'radial-gradient(circle at 35% 30%, #bfdbfe, #3b82f6 55%, #1e3a8a)', fg: '#fff' },
  O: { bg: 'radial-gradient(circle at 35% 30%, #fecaca, #ef4444 55%, #991b1b)', fg: '#fff' },
  Cl: { bg: 'radial-gradient(circle at 35% 30%, #bbf7d0, #22c55e 55%, #14532d)', fg: '#fff' },
};
const inBench = (x: number, y: number) => x >= BX0 && x <= BX1 && y >= BY0 && y <= BY1;
const inside = (x: number, y: number) => x >= BX0 + D / 2 && x <= BX1 - D / 2 && y >= BY0 + D / 2 && y <= BY1 - D / 2;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

interface Pt { x: number; y: number }
interface A extends Pt { id: number; el: string; on: boolean }

/** 접촉 위치: 가장 가까운 붙은 원자에 공이 닿도록 놓는다 (겹치면 30도씩 돌려 빈 곳을 찾는다) */
function contactPos(placed: Pt[], toward: Pt): Pt {
  const q = placed.reduce((m, p) => (Math.hypot(p.x - toward.x, p.y - toward.y) < Math.hypot(m.x - toward.x, m.y - toward.y) ? p : m));
  const base = Math.atan2(toward.y - q.y, toward.x - q.x) || 0;
  for (let k = 0; k < 12; k++) {
    for (const sg of k === 0 ? [1] : [1, -1]) {
      const a = base + sg * k * (Math.PI / 6);
      const c = { x: q.x + Math.cos(a) * D, y: q.y + Math.sin(a) * D };
      if (inside(c.x, c.y) && placed.every(p => Math.hypot(p.x - c.x, p.y - c.y) >= D - 1)) return c;
    }
  }
  return { x: q.x + D, y: q.y };
}
/** 붙은 원자를 떼고 난 뒤 남은 원자들이 다시 서로 닿게 모은다 */
function repack(list: A[]): A[] {
  const on = list.filter(a => a.on);
  if (on.length < 2) return list;
  const placed: A[] = [on[0]];
  for (const a of on.slice(1)) placed.push({ ...a, ...contactPos(placed, a) });
  return list.map(a => placed.find(p => p.id === a.id) ?? a);
}

export const AtomBall = ({ sym, size = D, lift = false, glow = false }: { sym: string; size?: number; lift?: boolean; glow?: boolean }) => (
  <div className="relative" style={{ width: size, height: size, transform: lift ? 'scale(1.15)' : undefined }}>
    <div className="absolute rounded-full bg-black/40 blur-[3px]"
      style={{ left: size * 0.1, right: size * 0.1, bottom: lift ? -size * 0.45 : -size * 0.08, height: size * 0.28 }} />
    <div className="absolute inset-0 rounded-full border border-white/50 flex items-center justify-center font-bold"
      style={{ background: COLORS[sym]?.bg, color: COLORS[sym]?.fg, fontSize: size * 0.42, boxShadow: glow ? '0 0 22px 8px #fcd34d' : undefined }}>{sym}</div>
  </div>
);

let nextId = 1;

/** 5-3 분자 조립소: 원자 블록을 작업대로 끌어다 접촉시켜 붙인다. 판정은 rules(canGrow·identifyMolecule·liveFormula). */
export function MoleculeBenchOverlay({ step }: { step: Step }) {
  const orderId = useGameStore(s => s.orderId);
  const completeRoom = useGameStore(s => s.completeRoom);
  const orders = useDataStore(s => s.orders);
  const elements = useDataStore(s => s.elements);
  const molecules = useDataStore(s => s.molecules);
  const hints = useDataStore(s => s.dialog?.hints);
  const cfg = useDataStore(s => s.minigame?.molecule) as { seconds: number; snap: number } | undefined;
  const seconds = cfg?.seconds ?? 60;
  // 접촉 판정: 공 중심 거리. snap(56)은 공이 딱 닿는 거리라 손가락으로는 빡빡해서 1.5배로 넉넉히 둔다.
  const snap = (cfg?.snap ?? 56) * 1.5;
  const d = useMemo(() => ({ elements, molecules, ions: [] }), [elements, molecules]);
  const target = molecules.find(m => m.id === step.target);
  const blocks = (orders.find(o => o.id === orderId)?.ingredients ?? []).filter(s => COLORS[s]);

  const [atoms, setAtoms] = useState<A[]>([]);
  const [msg, setMsg] = useState('');
  const [bonus, setBonus] = useState<{ formula: string; name: string } | null>(null);
  const [ghost, setGhost] = useState<{ k: number; x: number; y: number; el: string } | null>(null);
  const [done, setDone] = useState<{ formula: string; name: string } | null>(null);
  const [shake, setShake] = useState(0);
  const [t0] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const locked = useLock(900);
  const stage = useRef<HTMLDivElement>(null);
  const ref = useRef<A[]>([]);
  const busy = useRef(false);
  const detaches = useRef(0);
  const extras = useRef<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setElapsed((Date.now() - t0) / 1000), 200);
    return () => clearInterval(t);
  }, [done, t0]);

  const commit = (n: A[]) => { ref.current = n; setAtoms(n); };

  /** 붙인 원자들 상태를 보고 완성·보너스 판정 */
  const evaluate = (list: A[]) => {
    const syms = list.filter(a => a.on).map(a => a.el);
    const res = syms.length ? identifyMolecule(d, syms) : null;
    if (!res?.ok || !target) { setBonus(null); return; }
    const m = res.molecule;
    if (m.id === target.id) {
      busy.current = true; setBonus(null);
      setDone({ formula: m.formula, name: m.name });
      playSfx('correct'); setTimeout(() => playSfx('success'), 350);
      setMsg(hints?.[`done${target.id}`] ?? '');
      if (target.id === 'H2O') window.dispatchEvent(new CustomEvent('room-fx', { detail: { kind: 'electrolysis' } }));
      const stars = moleculeStars(detaches.current, (Date.now() - t0) / 1000 > seconds);
      timer.current = setTimeout(() => completeRoom({ room: 'molecule', target: target.id, stars, extra: extras.current }), target.id === 'H2O' ? 3800 : 2600);
      return;
    }
    setBonus({ formula: m.formula, name: m.name });
    if (!extras.current.includes(m.id)) extras.current.push(m.id);
    addToDex('molecules', m.id);
    playSfx('correct');
    setMsg(`그건 ${iga(target.name)} 아니라 ${ieyo(m.name)}`);
  };

  /** 원자 하나를 (x,y)에 놓는다. id가 있으면 이미 작업대에 있던 떠 있는 원자. */
  const put = (el: string, x: number, y: number, id?: number) => {
    const list = ref.current, on = list.filter(a => a.on && a.id !== id);
    const syms = on.map(a => a.el);
    const near = on.length ? Math.min(...on.map(a => Math.hypot(a.x - x, a.y - y))) : Infinity;
    const attach = !on.length || near <= snap;
    if (attach && !canGrow(d, [...syms, el])) {   // 목록 분자의 일부가 아니면 튕겨 나간다
      playSfx('error'); setShake(k => k + 1); setMsg(hints?.moleculeNone ?? '교과서에 없는 조합이라 붙지 않아요');
      if (id === undefined) setGhost({ k: Date.now(), x, y, el });
      return;
    }
    const pos = !attach ? { x, y } : on.length ? contactPos(on, { x, y }) : { x: clamp(x, BX0 + D / 2, BX1 - D / 2), y: clamp(y, BY0 + D / 2, BY1 - D / 2) };
    const a: A = { id: id ?? nextId++, el, ...pos, on: attach };
    const next = id === undefined ? [...list, a] : list.map(q => (q.id === id ? a : q));
    commit(next);
    if (attach) { playSfx('correct'); setMsg(''); evaluate(next); } else setMsg('');
  };

  const remove = (id: number) => {
    const a = ref.current.find(q => q.id === id);
    if (!a) return;
    if (a.on) { detaches.current++; playSfx('error'); }
    const next = repack(ref.current.filter(q => q.id !== id));
    commit(next); setMsg(''); evaluate(next);
  };

  const onDrop = useCallback((id: string, x: number, y: number) => {
    if (locked || busy.current) return;
    const [kind, v] = id.split(':');
    if (kind === 'box') { if (inBench(x, y)) put(v, x, y); return; }
    const a = ref.current.find(q => q.id === +v);
    if (!a) return;
    if (!inBench(x, y)) remove(a.id);                 // 작업대 밖으로 끌어내면 뗀다
    else if (!a.on) put(a.el, x, y, a.id);            // 떠 있던 원자: 옮기거나 붙인다
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, d, target, hints, snap]);
  const { drag, begin } = useDrag(stage, onDrop);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || locked || busy.current) return;
      const n = +e.key;
      if (n >= 1 && n <= blocks.length) {   // 키보드: 숫자 = 그 블록을 붙이기, Backspace = 마지막에 붙인 원자 떼기
        const on = ref.current.filter(a => a.on);
        const t = on.length * 2.1;   // 방향을 조금씩 돌려 일렬로만 놓이지 않게
        put(blocks[n - 1], on.length ? on[0].x + Math.cos(t) * D : (BX0 + BX1) / 2, on.length ? on[0].y + Math.sin(t) * D : (BY0 + BY1) / 2);
      } else if (e.key === 'Backspace') {
        const on = ref.current.filter(a => a.on);
        if (on.length) { e.preventDefault(); remove(on[on.length - 1].id); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, blocks.join(), d, target, hints, snap]);

  const on = atoms.filter(a => a.on);
  const live = liveFormula(on.map(a => a.el));
  const dragAtom = drag ? (drag.id.startsWith('box:') ? { el: drag.id.slice(4) } : atoms.find(a => a.id === +drag.id.slice(2))) : null;
  const dragOn = drag?.id.startsWith('a:') ? atoms.find(a => a.id === +drag.id.slice(2))?.on : false;
  const near = drag && dragAtom && !dragOn && inBench(drag.x, drag.y)
    ? on.filter(a => `a:${a.id}` !== drag.id).find(a => Math.hypot(a.x - drag.x, a.y - drag.y) <= snap)?.id : undefined;
  const removing = !!drag && dragOn && !inBench(drag.x, drag.y);
  const cx = on.length ? on.reduce((s, a) => s + a.x, 0) / on.length : 0;
  const cy = on.length ? on.reduce((s, a) => s + a.y, 0) / on.length : 0;
  const left = Math.max(0, 1 - elapsed / seconds);
  const boxW = blocks.length * 110 + 30;

  return (
    <div ref={stage} className="absolute inset-0 select-none">
      {/* 위: 만들 물질 + 화학식 칸 */}
      <div className="absolute flex items-center justify-between rounded-2xl bg-black/55 px-6" style={{ left: BX0, top: 52, width: BX1 - BX0, height: 72 }}>
        <span className="text-amber-200 text-[22px] font-bold whitespace-nowrap">만들 것 · {target?.name}</span>
        <span key={live + (done ? 'd' : '')} className="font-bold" style={{ fontSize: 48, color: done ? '#fcd34d' : '#fff', animation: 'pop .35s', textShadow: done ? '0 0 20px #fcd34d' : undefined }}>
          {live || '□'}{done && <span className="text-[24px] ml-3">{done.name}</span>}
        </span>
      </div>
      <div className="absolute rounded-full bg-white/15 overflow-hidden" style={{ left: BX0, top: 132, width: BX1 - BX0, height: 10 }}>
        <div className={`h-full rounded-full ${left < 0.2 ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: `${left * 100}%`, transition: 'width .2s linear' }} />
      </div>

      {/* 작업대: 윗면 + 앞 모서리 */}
      <div className="absolute rounded-2xl" style={{ left: BX0, top: BY0, width: BX1 - BX0, height: BY1 - BY0, background: 'linear-gradient(#d6b98c, #b89563)', boxShadow: 'inset 0 6px 24px #0004', outline: removing ? '5px solid #f87171' : drag && inBench(drag.x, drag.y) ? '5px solid #fcd34d' : 'none' }} />
      <div className="absolute rounded-b-2xl" style={{ left: BX0 - 8, top: BY1 - 6, width: BX1 - BX0 + 16, height: 26, background: 'linear-gradient(#7c5a2b, #4a3418)', boxShadow: '0 12px 18px #0006' }} />

      {/* 원자 (아래쪽이 앞: 깊이 정렬) */}
      <div key={shake} className="absolute inset-0" style={{ animation: shake ? 'shake .3s' : undefined, pointerEvents: 'none' }}>
        {[...atoms].sort((a, b) => a.y - b.y).map(a => (
          <div key={a.id} className="absolute pointer-events-auto cursor-grab"
            style={{ left: a.x - D / 2 - 8, top: a.y - D / 2 - 8, width: D + 16, height: D + 16, padding: 8, touchAction: 'none', opacity: drag?.id === `a:${a.id}` ? 0.3 : 1,
              zIndex: Math.round(a.y), transition: 'left .15s, top .15s' }}
            onPointerDown={e => { if (!locked && !busy.current) begin(`a:${a.id}`, e); }}>
            <div className={`rounded-full ${near === a.id ? 'ring-4 ring-amber-300' : ''} ${a.on ? '' : 'outline-dashed outline-2 outline-white/70 outline-offset-2'}`}
              style={{ animation: done ? 'pop .5s' : undefined }}>
              <AtomBall sym={a.el} glow={!!done} />
            </div>
          </div>
        ))}
      </div>
      {done && <div className="absolute" style={{ left: cx, top: cy }}><Burst count={28} radius={220} /></div>}
      {ghost && (
        <div key={ghost.k} className="absolute pointer-events-none" style={{ left: ghost.x - D / 2, top: ghost.y - D / 2, '--dx': '0px', '--dy': '170px', animation: 'flyback .6s ease-in forwards' } as React.CSSProperties}>
          <AtomBall sym={ghost.el} />
        </div>
      )}

      {/* 보너스: 다른 물질 카드 */}
      {bonus && (
        <div key={bonus.formula} className="absolute rounded-2xl bg-amber-100 border-4 border-amber-400 text-black text-center leading-none pointer-events-none"
          style={{ left: 960, top: 190, width: 250, padding: '16px 8px', animation: 'pop .5s' }}>
          <div className="text-[18px] font-bold text-amber-700">다른 물질</div>
          <div className="text-[46px] font-bold mt-2">{bonus.formula}</div>
          <div className="text-[22px] font-bold mt-2">{bonus.name}</div>
        </div>
      )}

      {/* 아래: 원자 상자 */}
      <div className="absolute rounded-2xl" style={{ left: BOX_X - boxW / 2, top: BOX_Y - 44, width: boxW, height: 116, background: '#5b3a14', boxShadow: 'inset 0 8px 16px #0008' }} />
      {blocks.map((el, i) => (
        <div key={el} className="absolute pointer-events-auto cursor-grab" style={{ left: BOX_X - boxW / 2 + 15 + i * 110 + 5, top: BOX_Y - 36, width: 80, height: 80, padding: 12, touchAction: 'none', opacity: drag?.id === `box:${el}` ? 0.35 : 1 }}
          onPointerDown={e => { if (!locked && !busy.current) begin(`box:${el}`, e); }}>
          <AtomBall sym={el} />
        </div>
      ))}
      <div className="absolute rounded-b-2xl pointer-events-none" style={{ left: BOX_X - boxW / 2 - 6, top: BOX_Y + 20, width: boxW + 12, height: 56, background: 'linear-gradient(#8a5a22, #4a2f0e)', boxShadow: '0 10px 16px #0006' }} />
      {blocks.map((el, i) => (
        <div key={el} className="absolute pointer-events-none text-center text-amber-100/80 text-[16px] font-bold" style={{ left: BOX_X - boxW / 2 + 15 + i * 110 + 5, top: BOX_Y + 36, width: 80 }}>{i + 1}</div>
      ))}
      {!atoms.length && !locked && (
        <svg className="absolute pointer-events-none" style={{ left: BOX_X - 30, top: 596, animation: 'bob 1s ease-in-out infinite', transform: 'rotate(180deg)' }} width="60" height="60" viewBox="0 0 60 60">
          <path d="M30 6 L54 34 H38 V56 H22 V34 H6 Z" fill="#fcd34d" stroke="#fff" strokeWidth="3" />
        </svg>
      )}

      {/* 들고 있는 블록: 크게, 그림자는 멀리 */}
      {drag && dragAtom && (
        <div className="absolute pointer-events-none" style={{ left: drag.x - D / 2, top: drag.y - D / 2 - 10, zIndex: 999 }}>
          <AtomBall sym={dragAtom.el} lift />
        </div>
      )}

      <div className="absolute text-white text-[22px]" style={{ left: 600, top: 626, width: 380, textShadow: '0 2px 6px #000', wordBreak: 'keep-all' }}>{msg}</div>
    </div>
  );
}
