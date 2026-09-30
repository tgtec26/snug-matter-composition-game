'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/game/store';
import { useDataStore } from '@/game/dataStore';
import { addToDex } from '@/game/dex';
import { playSfx } from '@/game/audio';
import { DialogBox } from '@/components/overlays/DialogBox';
import { ParticleCardView } from '@/components/overlays/ParticleCardView';

export function ResultOverlay() {
  const phase = useGameStore(s => s.phase);
  const orderId = useGameStore(s => s.orderId);
  if (phase !== 'result' || !orderId) return null;
  return <Result key={orderId} orderId={orderId} />;
}

function Result({ orderId }: { orderId: string }) {
  const order = useDataStore(s => s.orders.find(o => o.id === orderId));
  const substances = useDataStore(s => s.substances);
  const newCards = useGameStore(s => s.newCards);
  const next = useGameStore(s => s.next);
  const [fresh, setFresh] = useState<string[]>([]);
  const done = useRef(false);

  const subs = substances.filter(s => s.order === orderId);
  const cards = subs.length
    ? subs.map(x => ({ kind: 'substance' as const, id: x.id }))
    : (order?.ingredients ?? []).map(sym => ({ kind: 'element' as const, id: sym }));

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
        {cards.map((c, i) => <ParticleCardView key={c.id} kind={c.kind} id={c.id} isNew={fresh.includes(c.id)} delay={i * 150} />)}
      </div>
      <DialogBox npcName="입자 박사" color="#e9c46a" lines={[order.done]} onDone={next} />
    </div>
  );
}
