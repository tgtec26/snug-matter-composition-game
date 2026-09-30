'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/game/store';
import { playBgm, stopBgm, unlockAudio, type BgmKey } from '@/game/audio';
import type { Phase } from '@/game/types';

/** phase에 맞춰 배경음 전환: 타이틀·엔딩 / 방 / 주문·퀴즈 */
function pickBgm(phase: Phase): BgmKey {
  if (phase === 'room' || phase === 'classify') return 'mole_game';
  if (phase === 'orders' || phase === 'accept' || phase === 'quiz') return 'quiz-background';
  return 'start_ending';
}

export function AudioRunner() {
  const phase = useGameStore(s => s.phase);

  useEffect(() => { playBgm(pickBgm(phase)); }, [phase]);

  // 첫 입력 전에는 자동 재생이 막히므로 입력이 올 때마다 재시도
  useEffect(() => {
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    return () => { window.removeEventListener('pointerdown', unlockAudio); window.removeEventListener('keydown', unlockAudio); stopBgm(); };
  }, []);

  return null;
}
