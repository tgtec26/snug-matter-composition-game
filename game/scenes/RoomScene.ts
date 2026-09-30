import * as Phaser from 'phaser';
import { addBg, hiDpi } from '@/game/systems/render';
import { attachRouter } from '@/game/systems/sceneRouter';

/** 방 4개(원자 조립기·주기율표·분자 조립소·이온 공방)의 바탕 — Task 7 이후 채운다. */
export class RoomScene extends Phaser.Scene {
  constructor() { super({ key: 'Room' }); }
  create() {
    hiDpi(this);
    addBg(this, 'room_bg', 0x1c3a3a);
    attachRouter(this);
  }
}
