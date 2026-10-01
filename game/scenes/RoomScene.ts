import * as Phaser from 'phaser';
import { addBg, addImgW, hiDpi, isArt } from '@/game/systems/render';
import { attachRouter } from '@/game/systems/sceneRouter';
import { useGameStore, type GameState } from '@/game/store';

const NEON: Record<string, number> = { He: 0xfde68a, Ne: 0xfb7185, Ar: 0xc084fc };
/** 지금 방의 배경 키 (갈림길은 방금 끝낸 분자 방) — room_atom_bg · room_table_bg · room_molecule_bg · room_ion_bg */
const bgKey = (s: GameState) => `room_${s.queue[s.phase === 'classify' ? s.stepIdx - 1 : s.stepIdx]?.room}_bg`;

/** 방 4개(원자 조립기·주기율표·분자 조립소·이온 공방)의 바탕. 주기율표 광장의 1족·18족 연출은 window 'room-fx' 이벤트로 받는다. */
export class RoomScene extends Phaser.Scene {
  constructor() { super({ key: 'Room' }); }
  create() {
    hiDpi(this);
    let key = bgKey(useGameStore.getState());
    let bg = addBg(this, key, 0x1c3a3a).setDepth(-1);
    const unsub = useGameStore.subscribe(s => {   // 방이 바뀌어도 씬은 그대로라 배경만 갈아 끼운다
      if (bgKey(s) === key) return;
      key = bgKey(s); bg.destroy(); bg = addBg(this, key, 0x1c3a3a).setDepth(-1);
    });
    this.events.once('shutdown', unsub);
    attachRouter(this);
    const onFx = (e: Event) => {
      const { symbol, group, kind, size } = (e as CustomEvent<{ symbol?: string; group?: number; kind?: string; size?: number }>).detail;
      const before = this.children.list.length;
      if (kind === 'electrolysis') this.electrolysis();
      else if (kind === 'lattice') this.lattice(size ?? 3);
      else if (group === 1) this.bucket(); else if (group === 18) this.balloon(NEON[symbol ?? ''] ?? 0xfde68a);
      const made = this.children.list.slice(before);   // 연출 물체는 3.6초 뒤 정리
      this.time.delayedCall(3600, () => made.forEach(o => o.destroy()));
    };
    window.addEventListener('room-fx', onFx);
    this.events.once('shutdown', () => window.removeEventListener('room-fx', onFx));
  }
  /** 물 분해: 건전지에 연결한 두 전극에서 기체 방울이 올라온다 (분자 조립소, 화면 오른쪽) */
  private electrolysis() {
    const x = 1090, y = 600;
    let batt: Phaser.GameObjects.Shape | Phaser.GameObjects.Image;
    let electrodes = [-40, 40];
    if (isArt(this, 'fx_cup') && isArt(this, 'fx_battery')) {   // 그림: 비커(전극 포함) + 건전지
      this.add.ellipse(x, y + 92, 200, 26, 0x000000, 0.25);
      this.add.image(x, y + 30, 'fx_cup').setDisplaySize(190, 190 * 452 / 377);
      batt = addImgW(this, x, y - 118, 'fx_battery', 130);
      electrodes = [-25, 45];
    } else {
      this.add.ellipse(x, y + 92, 200, 26, 0x000000, 0.4);
      this.add.rectangle(x, y + 30, 170, 130, 0x60a5fa, 0.7).setStrokeStyle(4, 0xe0f2fe);
      batt = this.add.rectangle(x, y - 200, 96, 46, 0x374151).setStrokeStyle(3, 0xffffff);
      this.add.rectangle(x - 30, y - 230, 14, 12, 0xef4444);
      this.add.rectangle(x + 30, y - 230, 14, 12, 0x94a3b8);
      for (const dx of electrodes) {
        this.add.rectangle(x + dx, y - 40, 8, 150, 0xd1d5db).setStrokeStyle(2, 0xffffff);
        this.add.rectangle(x + dx, y - 146, 4, 62, 0xfde68a);
      }
    }
    this.tweens.add({ targets: batt, scale: batt.scale * 1.08, duration: 200, yoyo: true, repeat: 3 });
    for (const [dx, n, c] of [[electrodes[0], 24, 0xffffff], [electrodes[1], 12, 0xfecaca]] as const) {
      for (let i = 0; i < n; i++) {
        const b = this.add.circle(x + dx + Phaser.Math.Between(-6, 6), y + 20, Phaser.Math.Between(3, 7), c, 0).setStrokeStyle(2, c);
        this.tweens.add({ targets: b, y: y - 70 - Phaser.Math.Between(0, 30), x: b.x + Phaser.Math.Between(-10, 10), alpha: { from: 1, to: 0 },
          delay: 300 + i * (n === 24 ? 70 : 140), duration: 900, onStart: () => b.setAlpha(1) });
      }
    }
  }
  /** 염화 나트륨 격자 완성: n×n 칸이 대각선 순서로 차례로 반짝인다 (오버레이 격자는 무대 중앙 640,390 · 칸 100) */
  private lattice(n: number) {
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const g = this.add.circle(640 - n * 50 + 50 + c * 100, 390 - n * 50 + 50 + r * 100, 20, c + r & 1 ? 0x60a5fa : 0xfbbf24, 0.7);
      this.tweens.add({ targets: g, scale: { from: 0.5, to: 3.2 }, alpha: { from: 0.8, to: 0 }, delay: (r + c) * 110, duration: 700 });
    }
  }
  /** 물통에 금속 조각을 넣으면 기체 방울이 올라온다 */
  private bucket() {
    const x = 320, y = 600;
    let piece: Phaser.GameObjects.Shape | Phaser.GameObjects.Image;
    if (isArt(this, 'fx_bucket') && isArt(this, 'fx_metal')) {
      this.add.image(x, y + 10, 'fx_bucket').setDisplaySize(190, 190 * 407 / 414);
      piece = addImgW(this, x, y - 90, 'fx_metal', 44);
    } else {
      this.add.ellipse(x, y + 62, 170, 26, 0x000000, 0.4);
      this.add.rectangle(x, y + 20, 150, 90, 0x60a5fa, 0.85).setStrokeStyle(4, 0xe0f2fe);
      this.add.ellipse(x, y - 25, 150, 22, 0xbfdbfe, 0.9);
      piece = this.add.rectangle(x, y - 90, 26, 26, 0xd1d5db).setStrokeStyle(2, 0xffffff);
    }
    this.tweens.add({ targets: piece, y: y - 20, duration: 400, ease: 'Bounce.easeOut' });
    for (let i = 0; i < 26; i++) {
      const b = this.add.circle(x + Phaser.Math.Between(-16, 16), y - 16, Phaser.Math.Between(4, 10), 0xffffff, 0).setStrokeStyle(2, 0xffffff);
      this.tweens.add({ targets: b, y: y - 130 - Phaser.Math.Between(0, 50), x: b.x + Phaser.Math.Between(-30, 30), alpha: { from: 1, to: 0 },
        delay: 400 + i * 60, duration: 900, onStart: () => b.setAlpha(1) });
    }
  }
  /** 풍선이 떠오르고 네온 빛이 번쩍인다 */
  private balloon(color: number) {
    const x = 930, y = 600;
    const glow = this.add.circle(x, y - 40, 20, color, 0.5);
    this.tweens.add({ targets: glow, scale: 5, alpha: 0, duration: 1200, repeat: 1 });
    if (isArt(this, 'fx_balloon')) {   // 그림: 끈 달린 흰 풍선을 기체 색으로 물들인다
      const img = this.add.image(x, y + 30, 'fx_balloon').setDisplaySize(96, 96 * 474 / 241).setTint(color);
      this.tweens.add({ targets: [img, glow], y: '-=40', duration: 1400, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
      return;
    }
    const string = this.add.rectangle(x, y + 60, 3, 90, 0xffffff, 0.7);
    const ball = this.add.ellipse(x, y, 90, 110, color).setStrokeStyle(4, 0xffffff);
    this.tweens.add({ targets: [ball, string, glow], y: '-=40', duration: 1400, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
  }
}
