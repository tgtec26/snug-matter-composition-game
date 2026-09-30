import * as Phaser from 'phaser';
import { sceneFor } from '@/game/systems/sceneRouter';
import { artToLoad } from '@/game/systems/render';
import { useGameStore } from '@/game/store';

/** public/assets/manifest.json 에 적힌 그림만 불러온다 (그림 파일을 넣으면 manifest에 경로를 추가). 없으면 플레이스홀더. */
export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'Boot' }); }
  preload() {
    this.load.json('art_manifest', '/assets/manifest.json');
    this.load.once('filecomplete-json-art_manifest', (_key: string, _type: string, files: string[]) => {
      for (const [key, url] of artToLoad(Array.isArray(files) ? files : [])) this.load.image(key, url);
    });
  }
  create() {
    this.scene.start(sceneFor(useGameStore.getState().phase));
  }
}
