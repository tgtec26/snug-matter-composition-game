'use client';

import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { useGameStore } from '@/game/store';
import { useDataStore } from '@/game/dataStore';
import { loadDex } from '@/game/dex';
import { useLock } from '@/components/hooks/useLock';
import { Burst } from '@/components/overlays/Burst';
import { Art, artBg, artFrame } from '@/components/Art';

const fmt = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}분 ${String(s % 60).padStart(2, '0')}초`; };

/** 요약 결과 팝업: 별·새 카드·도감·시간을 결과 카드(PNG로 저장 가능)에 모은다. */
export function SummaryOverlay() {
  const s = useGameStore();
  const elements = useDataStore(d => d.elements);
  const molecules = useDataStore(d => d.molecules);
  const ions = useDataStore(d => d.ions);
  const locked = useLock(1200);
  const card = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const dex = loadDex();
  const label = (id: string) => {
    const e = elements.find(x => x.symbol === id);
    if (e) return `${e.name} ${e.symbol}`;
    return molecules.find(x => x.id === id)?.formula ?? ions.find(x => x.id === id)?.formula ?? id;
  };
  const stats = [
    ['원소', Math.max(dex.elements.length, dex.placed.length), 20],
    ['분자', dex.molecules.length, 12],
    ['이온', dex.ions.length, 7],
  ] as const;

  const save = async () => {
    if (!card.current || saving) return;
    setSaving(true); setErr('');
    try {
      // html-to-image는 border-image 그림을 PNG에 넣지 못한다 → 같은 그림을 data URL로 바꿔 끼운다(보이는 모습은 같음)
      const frame = await fetch('/assets/ui/panel_paper.webp').then(r => r.blob())
        .then(b => new Promise<string>(ok => { const f = new FileReader(); f.onload = () => ok(f.result as string); f.readAsDataURL(b); }));
      card.current.style.borderImageSource = `url(${frame})`;
      const url = await toPng(card.current, { pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = url; a.download = `입자-결과-${s.nickname || '견습 공작사'}.png`;
      document.body.appendChild(a); a.click(); a.remove();
    } catch { setErr('저장하지 못했어요. 다시 눌러 보세요.'); }
    setSaving(false);
  };

  const btn = 'h-[56px] px-8 text-[20px] font-bold disabled:opacity-40 disabled:grayscale';
  return (
    <div className="absolute inset-0 bg-black/70 pointer-events-auto flex items-center justify-center">
      <div className="relative" style={{ animation: 'pop .5s cubic-bezier(.2,1.4,.4,1) both' }}>
        <div className="absolute left-1/2 top-[20%] pointer-events-none"><Burst count={24} radius={300} /></div>
        <div ref={card} className="w-[680px] text-slate-900 px-11 py-10" style={artFrame('ui/panel_paper', 60, 34)}>
          <div className="text-[34px] font-black border-b-2 border-slate-300 pb-2 mb-4">{s.nickname || '견습 공작사'}의 입자 공방 결과</div>
          <div className="flex items-center gap-8 mb-4">
            <div className="flex items-center gap-2 text-[64px] font-black text-amber-500 leading-none tabular-nums" aria-label={`별 ${s.stars}`}>
              <Art src="ui/star" style={{ width: 64, height: 63 }} />{s.stars}
            </div>
            <div className="text-[22px] leading-snug">
              <div>걸린 시간 <b>{fmt(s.elapsedMs)}</b></div>
              <div>실수 <b>{s.mistakes}</b>번</div>
            </div>
            <Art src="npc/apprentice_happy" className="ml-auto -my-6" style={{ width: 130, height: 130 }} />
          </div>
          <div className="mb-4">
            <div className="text-[20px] text-slate-500 mb-1">새로 얻은 카드 {s.newCards.length}장</div>
            <div className="flex flex-wrap gap-2 min-h-[36px]">
              {s.newCards.length === 0 && <span className="text-[18px] text-slate-400">이번엔 새 카드가 없어요</span>}
              {s.newCards.map(id => <span key={id} className="rounded-full bg-amber-200 border-2 border-amber-400 px-3 py-0.5 text-[18px] font-bold">{label(id)}</span>)}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {stats.map(([n, a, b]) => (
              <div key={n} className="rounded-xl bg-white border-2 border-slate-300 py-2 text-center">
                <div className="text-[18px] text-slate-500">{n} 도감</div>
                <div className="text-[30px] font-black tabular-nums">{a}<span className="text-[20px] text-slate-400">/{b}</span></div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 flex justify-center gap-3">
          <button type="button" disabled={locked || saving} onClick={save} className={`${btn} text-black`} style={artBg('ui/button_amber')}>{saving ? '저장 중' : '나의 결과 내려받기'}</button>
          <button type="button" disabled={locked} onClick={s.restartRun} className={`${btn} text-slate-900`} style={artBg('ui/button_sky')}>다시 하기</button>
          <button type="button" disabled={locked} onClick={s.reset} className={`${btn} text-white`} style={artBg('ui/button_navy')}>처음으로</button>
        </div>
        {err && <div className="mt-2 text-center text-[18px] text-red-300">{err}</div>}
      </div>
    </div>
  );
}
