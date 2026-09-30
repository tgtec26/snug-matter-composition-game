'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/game/store';
import { useDataStore } from '@/game/dataStore';
import { addToDex } from '@/game/dex';
import { playSfx } from '@/game/audio';
import { DialogBox } from '@/components/overlays/DialogBox';
import { Burst } from '@/components/overlays/Burst';

interface CardData { id: string; name: string; rows: [string, string][]; parts?: { name: string; components: string[]; particle: string }[] }

export function ResultOverlay() {
  const phase = useGameStore(s => s.phase);
  const orderId = useGameStore(s => s.orderId);
  if (phase !== 'result' || !orderId) return null;
  return <Result key={orderId} orderId={orderId} />;
}

/** 간단한 인라인 카드 — 도감 카드는 Task 11에서 ParticleCardView로 교체 */
function Result({ orderId }: { orderId: string }) {
  const order = useDataStore(s => s.orders.find(o => o.id === orderId));
  const substances = useDataStore(s => s.substances);
  const elements = useDataStore(s => s.elements);
  const newCards = useGameStore(s => s.newCards);
  const next = useGameStore(s => s.next);
  const [fresh, setFresh] = useState<string[]>([]);
  const done = useRef(false);

  const subs = substances.filter(s => s.order === orderId);
  const cards: CardData[] = subs.length
    ? subs.map(s => ({ id: s.id, name: s.name, parts: s.parts, rows: [['구성 성분', s.components.join(', ')], ['구성 입자', s.particle]] }))
    : (order?.ingredients ?? []).map(sym => {
        const e = elements.find(x => x.symbol === sym);
        return { id: sym, name: e?.name ?? sym, rows: [['원소 기호', sym], ['원자 번호', String(e?.number ?? '')]] as [string, string][] };
      });

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const fr = subs.length ? subs.filter(s => addToDex('substances', s.id)).map(s => s.id) : (order?.ingredients ?? []).filter(x => newCards.includes(x));
    setFresh(fr);
    if (fr.length) playSfx('success');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!order) return null;
  return (
    <div className="absolute inset-0 bg-black/60 pointer-events-auto">
      <div className="absolute inset-x-0 top-[90px] flex justify-center gap-8">
        {cards.map((c, i) => {
          const isNew = fresh.includes(c.id);
          return (
            <div key={c.id} className="relative" style={{ animation: `pop 0.5s cubic-bezier(.2,1.4,.4,1) ${i * 150}ms both` }}>
              {isNew && <Burst />}
              <div className={`rounded-2xl border-4 bg-amber-50 text-slate-900 px-6 py-5 ${c.parts ? 'w-[400px]' : 'w-[240px]'} ${isNew ? 'border-amber-400' : 'border-amber-200'}`}
                style={{ boxShadow: isNew ? '0 0 36px rgba(252,211,77,.7)' : '0 6px 0 rgba(0,0,0,.35)' }}>
                <div className="text-[32px] font-black mb-3 border-b-2 border-slate-300 pb-2">{c.name}</div>
                {c.rows.map(([k, v]) => (
                  <div key={k} className="text-[20px] leading-snug mb-1"><span className="text-slate-500 mr-2">{k}</span><span className="font-bold">{v}</span></div>
                ))}
                {c.parts && (
                  <div className="mt-3 border-t-2 border-slate-300 pt-2 flex flex-col gap-1">
                    {c.parts.map(p => (
                      <div key={p.name} className="text-[16px]"><span className="font-bold">{p.name}</span> <span className="text-slate-500">{p.components.join(', ')} · {p.particle}</span></div>
                    ))}
                  </div>
                )}
                {isNew && <div className="absolute -top-4 -right-4 rounded-full bg-amber-400 text-black text-[16px] font-black px-3 py-1 rotate-6">새 카드</div>}
              </div>
            </div>
          );
        })}
      </div>
      <DialogBox npcName="입자 박사" color="#e9c46a" lines={[order.done]} onDone={next} />
    </div>
  );
}
