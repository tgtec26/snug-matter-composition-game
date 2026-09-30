'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/game/store';
import { useDataStore } from '@/game/dataStore';
import { useLock } from '@/components/hooks/useLock';
import { playSfx } from '@/game/audio';
import { Burst } from '@/components/overlays/Burst';
import { Art, artFrame } from '@/components/Art';

export function QuizOverlay() {
  const phase = useGameStore(s => s.phase);
  const orderId = useGameStore(s => s.orderId);
  if (phase !== 'quiz' || !orderId) return null;
  return <QuizFlow key={orderId} orderId={orderId} />;
}

function QuizFlow({ orderId }: { orderId: string }) {
  const finishQuiz = useGameStore(s => s.finishQuiz);
  const pool = useDataStore(s => s.quiz);
  const [q] = useState(() => {
    const qs = pool.filter(x => x.order === orderId);
    return qs[Math.floor(Math.random() * qs.length)];
  });
  const [wrong, setWrong] = useState<number[]>([]);
  const [right, setRight] = useState(false);
  const [shake, setShake] = useState(false);
  const locked = useLock(900);

  // 튜토리얼 o0처럼 문항이 없으면 멈추지 않고 통과
  useEffect(() => { if (!q) finishQuiz(false); }, [q, finishQuiz]);

  const choose = (i: number) => {
    if (!q || locked || right || wrong.includes(i)) return;
    if (i === q.answer) {
      setRight(true);
      playSfx('correct');
      setTimeout(() => finishQuiz(wrong.length === 0), 1600);
    } else {
      playSfx('error');
      setWrong(w => [...w, i]); setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.repeat) return; const n = Number(e.key); if (n >= 1 && n <= 9) choose(n - 1); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!q) return null;
  return (
    <div className={`absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-auto ${right ? 'bg-emerald-950/60' : ''}`}>
      <div className="relative w-[860px] px-10 py-9"
        style={{ ...artFrame('ui/panel_glass', 60, 26), animation: shake ? 'shake 0.4s' : undefined, filter: right ? 'drop-shadow(0 0 14px rgba(52,211,153,.8))' : undefined }}>
        {/* 견습생이 문제판 위로 고개를 내민다: 푸는 동안 고민, 맞히면 기쁨 */}
        <Art src={right ? 'npc/apprentice_happy' : 'npc/apprentice_think'} className="absolute" style={{ right: 40, top: -122, width: 140, height: 140 }} />
        {right && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <Burst count={20} radius={260} />
            <div className="text-[84px] font-black text-amber-300 leading-none" style={{ animation: 'pop 0.5s cubic-bezier(.2,1.4,.4,1) both', textShadow: '0 4px 0 #7c2d12, 0 0 30px rgba(252,211,77,.6)' }}>정답!</div>
          </div>
        )}
        <div className={right ? 'opacity-30' : ''}>
          <div className="text-white text-[30px] font-bold leading-relaxed mb-6">{q.q}</div>
          <div className="flex flex-col gap-3">
            {q.choices.map((c, i) => (
              <button key={i} type="button" disabled={wrong.includes(i)} onClick={() => choose(i)}
                className={`px-7 py-4 min-h-[64px] text-left text-[24px] flex gap-4 items-center transition ${wrong.includes(i) ? 'text-white/40 opacity-50 grayscale' : right && i === q.answer ? 'text-slate-900 font-bold' : 'text-white hover:brightness-125'}`}
                style={artFrame(right && i === q.answer ? 'ui/button_sky' : 'ui/button_navy', 100, 22)}>
                <span className="font-black text-amber-300 w-6">{i + 1}</span><span>{c}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 min-h-[56px] text-[20px] text-rose-200">{wrong.length > 0 && !right && q.explain}</div>
        </div>
      </div>
    </div>
  );
}
