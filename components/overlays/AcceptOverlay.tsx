'use client';
import { useGameStore } from '@/game/store';
import { useDataStore } from '@/game/dataStore';
import { DialogBox } from '@/components/overlays/DialogBox';

/** 튜토리얼(o0) 수락 대사. 주문판에서 고른 주문은 바로 방으로 간다. */
export function AcceptOverlay() {
  const phase = useGameStore(s => s.phase);
  const orderId = useGameStore(s => s.orderId);
  const acceptOrder = useGameStore(s => s.acceptOrder);
  const order = useDataStore(s => s.orders.find(o => o.id === orderId));
  if (phase !== 'accept' || !order) return null;
  return <DialogBox npcName="입자 박사" color="#e9c46a" lines={[order.accept]} onDone={() => acceptOrder(order.id)} />;
}
