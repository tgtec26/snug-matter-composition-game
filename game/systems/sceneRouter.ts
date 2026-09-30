import type * as Phaser from 'phaser';
import { useGameStore } from '@/game/store';
import type { Phase } from '@/game/types';

export function sceneFor(phase: Phase): 'Workshop' | 'Room' {
  return phase === 'room' || phase === 'classify' ? 'Room' : 'Workshop';
}
export function attachRouter(scene: Phaser.Scene) {
  const unsub = useGameStore.subscribe((s, prev) => {
    if (s.phase === prev.phase) return;
    const target = sceneFor(s.phase);
    if (target !== scene.scene.key) { unsub(); scene.scene.start(target); }
  });
  scene.events.once('shutdown', unsub);
  return unsub;
}
