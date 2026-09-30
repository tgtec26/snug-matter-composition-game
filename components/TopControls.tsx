'use client';

import { useEffect, useState } from 'react';
import { isMuted, setMuted } from '@/game/audio';
import { artFrame } from '@/components/Art';

const btn = 'pointer-events-auto min-w-11 h-11 px-3 whitespace-nowrap text-white text-[15px] font-bold';
const bg = artFrame('ui/button_navy', 100, 16);

/** 오른쪽 위 전체 화면·음소거. 누른 뒤 blur()해서 Enter·Space가 다시 누르지 않게 한다. */
export function TopControls() {
  const [mute, setMute] = useState(isMuted());
  const [full, setFull] = useState(false);
  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  return (
    <div className="absolute top-2 right-3 flex gap-2 z-50">
      <button type="button" aria-label="음소거" aria-pressed={mute} className={btn} style={bg}
        onClick={e => { setMuted(!mute); setMute(!mute); e.currentTarget.blur(); }}>{mute ? '소리 꺼짐' : '소리'}</button>
      <button type="button" aria-label="전체 화면" aria-pressed={full} className={btn} style={bg}
        onClick={e => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.().catch(() => {}); e.currentTarget.blur(); }}>{full ? '축소' : '전체'}</button>
    </div>
  );
}
