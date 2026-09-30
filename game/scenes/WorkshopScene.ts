import * as Phaser from 'phaser';
import { addBg, addImgH, hiDpi, TEXT } from '@/game/systems/render';
import { attachRouter } from '@/game/systems/sceneRouter';
import { useGameStore } from '@/game/store';

/** 공작소 배경 (주문판·수락 대사 등 방 밖 화면). 그림은 workshop_bg 텍스처가 생기면 자동 교체. */
export class WorkshopScene extends Phaser.Scene {
  constructor() { super({ key: 'Workshop' }); }
  create() {
    hiDpi(this);
    addBg(this, 'workshop_bg', 0x2a2440);
    // 벽 주문판: 나무 틀 + 코르크 면 + 못 (주문판 phase에서만 보인다)
    const board = this.add.container(0, 0);
    board.add(this.add.rectangle(640, 350, 1240, 480, 0x6b4423).setStrokeStyle(8, 0x3e2612));
    board.add(this.add.rectangle(640, 350, 1200, 440, 0xb98a5a));
    board.add(this.add.text(640, 145, '주문판', { ...TEXT, fontSize: '30px', color: '#3e2612', fontStyle: 'bold' }).setOrigin(0.5));
    for (const x of [90, 1190]) for (const y of [130, 570]) board.add(this.add.circle(x, y, 7, 0x333333));
    const sync = () => board.setVisible(useGameStore.getState().phase === 'orders');
    sync();
    const unsub = useGameStore.subscribe(sync);
    this.events.once('shutdown', unsub);
    // 작업대와 인물 (플레이스홀더: 색 원 + 이름)
    this.add.rectangle(640, 760, 1280, 80, 0x4a3b2a);
    if (this.textures.exists('npc_apprentice')) addImgH(this, 150, 640, 'npc_apprentice', 180);
    else this.add.circle(150, 690, 44, 0x60a5fa).setStrokeStyle(4, 0xffffff);
    this.add.text(150, 750, '견습생', { ...TEXT, fontSize: '18px', color: '#fff' }).setOrigin(0.5);
    if (this.textures.exists('npc_doctor')) addImgH(this, 1130, 640, 'npc_doctor', 180);
    else this.add.circle(1130, 690, 44, 0xe9c46a).setStrokeStyle(4, 0xffffff);
    this.add.text(1130, 750, '입자 박사', { ...TEXT, fontSize: '18px', color: '#fff' }).setOrigin(0.5);
    attachRouter(this);
  }
}
