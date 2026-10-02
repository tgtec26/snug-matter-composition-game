import { create } from 'zustand';
import type { DialogConfig, Element, Ion, MinigameConfig, Molecule, Order, QuizQuestion, Substance } from '@/game/types';
import type { AudioConfig } from '@/game/audio';
import { VALIDATORS, type DataFile } from '@/game/systems/validators';

interface DataState {
  elements: Element[]; molecules: Molecule[]; ions: Ion[]; substances: Substance[]; orders: Order[];
  minigame: MinigameConfig | null; dialog: DialogConfig | null; quiz: QuizQuestion[]; audio: AudioConfig | null;
  loaded: boolean; error: string | null;
  load: () => Promise<void>;
}
const getJson = async <T,>(f: DataFile): Promise<T> => {
  const r = await fetch(`/data/${f}.json`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${f}.json: HTTP ${r.status}`);
  const v = await r.json();
  const errs = VALIDATORS[f](v as never);
  if (errs.length && process.env.NODE_ENV !== 'production') throw new Error(errs.join(' / '));
  return v as T;
};

export const useDataStore = create<DataState>()((set) => ({
  elements: [], molecules: [], ions: [], substances: [], orders: [], minigame: null, dialog: null, quiz: [], audio: null,
  loaded: false, error: null,
  load: async () => {
    try {
      const [elements, molecules, ions, substances, orders, minigame, dialog, quiz, audio] = await Promise.all([
        getJson<Element[]>('elements'), getJson<Molecule[]>('molecules'), getJson<Ion[]>('ions'),
        getJson<Substance[]>('substances'), getJson<Order[]>('orders'), getJson<MinigameConfig>('minigame-config'),
        getJson<DialogConfig>('dialog-config'), getJson<QuizQuestion[]>('quiz-pool'), getJson<AudioConfig>('audio-config'),
      ]);
      set({ elements, molecules, ions, substances, orders, minigame, dialog, quiz, audio, loaded: true, error: null });
    } catch (e) {
      set({ error: String(e), loaded: true });
    }
  },
}));
