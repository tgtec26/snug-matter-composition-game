'use client';
import { createElement, type ComponentType } from 'react';
import { useGameStore } from '@/game/store';
import type { Room, Step } from '@/game/types';
import { AtomBuilderOverlay } from '@/components/overlays/AtomBuilderOverlay';
import { PeriodicTableOverlay } from '@/components/overlays/PeriodicTableOverlay';

/** 방 종류 → 오버레이. Task 8~10은 이 표에 한 줄씩만 추가한다 (예: table: PeriodicTableOverlay). */
export const ROOMS: Partial<Record<Room, ComponentType<{ step: Step }>>> = {
  atom: AtomBuilderOverlay,
  table: PeriodicTableOverlay,
};

export function RoomRouter() {
  const step = useGameStore(s => s.queue[s.stepIdx]);
  const stepIdx = useGameStore(s => s.stepIdx);
  if (!step) return null;
  const Room = ROOMS[step.room];
  if (!Room) return <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-white/60 text-[20px]">[{step.room} 방 구현 예정]</div>;
  return createElement(Room, { key: stepIdx, step });   // key: 단계가 바뀌면 상태를 새로
}
