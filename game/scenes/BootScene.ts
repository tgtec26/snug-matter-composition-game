import * as Phaser from 'phaser';
import { sceneFor } from '@/game/systems/sceneRouter';
import { useGameStore } from '@/game/store';

/** public/assets/ 에 그림이 생기면 여기서 preload 한다 (없으면 플레이스홀더). */
export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'Boot' }); }
  create() {
    this.scene.start(sceneFor(useGameStore.getState().phase));
  }
}
