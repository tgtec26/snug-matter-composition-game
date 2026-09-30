export type CharacterId = 'girl1' | 'boy' | 'girl2';

/** 견습생 그림 파일 이름(npc/ 아래). girl1은 처음부터 있던 그림. */
export const CHARACTERS: { id: CharacterId; label: string; stem: string }[] = [
  { id: 'girl1', label: '하나', stem: 'apprentice' },
  { id: 'boy', label: '준', stem: 'apprentice_boy' },
  { id: 'girl2', label: '소라', stem: 'apprentice_girl2' },
];

export const characterStem = (id: CharacterId) => (CHARACTERS.find(c => c.id === id) ?? CHARACTERS[0]).stem;
