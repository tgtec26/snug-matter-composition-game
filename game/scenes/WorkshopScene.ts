import * as Phaser from 'phaser';
import { addBg, hiDpi } from '@/game/systems/render';
import { attachRouter } from '@/game/systems/sceneRouter';

/** 공작소 배경 (주문판·수락 대사 등 방 밖 화면). 그림은 workshop_bg 텍스처가 생기면 자동 교체. */
export class WorkshopScene extends Phaser.Scene {
  constructor() { super({ key: 'Workshop' }); }
  create() {
    hiDpi(this);
    addBg(this, 'workshop_bg', 0x2a2440);
    attachRouter(this);
  }
}
