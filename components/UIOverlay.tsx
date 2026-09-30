'use client';

import type { ComponentType } from 'react';
import { HUD } from '@/components/HUD';
import { TopControls } from '@/components/TopControls';
import { AudioRunner } from '@/components/AudioRunner';
import { TitleOverlay } from '@/components/overlays/TitleOverlay';
import { IntroOverlay } from '@/components/overlays/IntroOverlay';
import { useGameStore } from '@/game/store';
import type { Phase } from '@/game/types';

/** 자리표시 — 각 태스크에서 실제 오버레이로 교체 */
const Todo = ({ name }: { name: string }) => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-white/60 text-[20px]">[{name} 구현 예정]</div>
);
const todo = (name: string): ComponentType => function TodoOverlay() { return <Todo name={name} />; };

/** phase → 오버레이. 다음 태스크는 이 표의 값만 바꾼다. */
export const OVERLAYS: Record<Phase, ComponentType> = {
  title: TitleOverlay,
  intro: IntroOverlay,
  orders: todo('주문판'),
  accept: todo('수락 대사'),
  room: todo('방'),
  classify: todo('원소·화합물 분류'),
  result: todo('결과'),
  quiz: todo('퀴즈'),
  ending: todo('엔딩'),
  summary: todo('요약'),
};

/** 1280×800 네이티브 좌표. 루트는 클릭을 통과시키고 각 오버레이가 pointer-events-auto를 켠다. */
export function UIOverlay() {
  const phase = useGameStore(s => s.phase);
  const Current = OVERLAYS[phase];
  return (
    <div className="absolute inset-0 pointer-events-none">
      <HUD />
      <Current />
      <TopControls />
      <AudioRunner />
    </div>
  );
}
