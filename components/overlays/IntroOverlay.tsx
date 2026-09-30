'use client';
import { useGameStore } from '@/game/store';
import { useDataStore } from '@/game/dataStore';
import { DialogBox } from '@/components/overlays/DialogBox';

export function IntroOverlay() {
  const phase = useGameStore(s => s.phase);
  const next = useGameStore(s => s.next);
  const dialog = useDataStore(s => s.dialog);
  if (phase !== 'intro' || !dialog) return null;
  return <DialogBox npcName="입자 박사" color="#e9c46a" lines={dialog.intro} onDone={next} />;
}
