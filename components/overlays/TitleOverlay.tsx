'use client';

import { useState } from 'react';
import { useGameStore } from '@/game/store';

export function TitleOverlay() {
  const phase = useGameStore(s => s.phase);
  const start = useGameStore(s => s.start);
  const [name, setName] = useState('');
  if (phase !== 'title') return null;
  const ok = name.trim().length >= 2 && name.trim().length <= 8;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 pointer-events-auto">
      <div className="text-[22px] text-amber-300 tracking-widest mb-2">중2 과학 · 물질의 구성</div>
      <h1 className="text-[76px] font-black text-white mb-12">입자 공작소</h1>
      <form onSubmit={e => {
        e.preventDefault();
        if (!ok) return;
        document.documentElement.requestFullscreen?.().catch(() => {});   // 시작 조작 = 전체 화면
        start(name.trim());
      }} className="flex items-center gap-3">
        <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="견습생 이름 (2~8자)" maxLength={8}
          className="text-[24px] px-5 py-3 rounded-xl bg-white text-slate-900 w-[320px] outline-none" />
        <button type="submit" disabled={!ok} className="text-[24px] px-6 py-3 rounded-xl bg-amber-500 text-black font-bold disabled:opacity-40">시작</button>
      </form>
    </div>
  );
}
