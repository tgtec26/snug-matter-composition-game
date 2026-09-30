'use client';

import { useState } from 'react';
import { useGameStore } from '@/game/store';
import { Art, artBg } from '@/components/Art';
import { CHARACTERS, type CharacterId } from '@/game/characters';

export function TitleOverlay() {
  const phase = useGameStore(s => s.phase);
  const start = useGameStore(s => s.start);
  const [name, setName] = useState('');
  const [character, setCharacter] = useState<CharacterId>('girl1');
  if (phase !== 'title') return null;
  const ok = name.trim().length >= 2 && name.trim().length <= 8;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 pointer-events-auto">
      <div className="text-[22px] text-amber-300 tracking-widest mb-2">중2 과학 · 물질의 구성</div>
      <h1 className="text-[76px] font-black text-white mb-6">입자 공작소</h1>
      <form onSubmit={e => {
        e.preventDefault();
        if (!ok) return;
        document.documentElement.requestFullscreen?.().catch(() => {});   // 시작 조작 = 전체 화면
        start(name.trim(), character);
      }} className="flex flex-col items-center gap-5">
        <div role="radiogroup" aria-label="견습생 고르기" className="flex gap-5">
          {CHARACTERS.map(c => {
            const on = c.id === character;
            return (
              <label key={c.id} className="relative cursor-pointer rounded-2xl w-[150px] h-[190px] transition-transform"
                style={{ background: on ? 'rgba(252,211,77,.28)' : 'rgba(255,255,255,.08)', outline: on ? '4px solid #fcd34d' : '2px solid rgba(255,255,255,.25)', transform: on ? 'scale(1.08)' : undefined }}>
                <input type="radio" name="character" value={c.id} checked={on} onChange={() => setCharacter(c.id)} aria-label={c.label} className="sr-only" />
                <Art src={`npc/${c.stem}`} className="absolute left-1/2 bottom-2 h-[176px] w-auto -translate-x-1/2" />
              </label>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
        <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="견습생 이름 (2~8자)" maxLength={8}
          className="text-[24px] px-5 py-3 rounded-xl bg-white text-slate-900 w-[320px] outline-none" />
        <button type="submit" disabled={!ok} className="text-[24px] w-[150px] h-[58px] text-black font-bold disabled:opacity-50" style={artBg('ui/button_amber')}>시작</button>
        </div>
      </form>
    </div>
  );
}
