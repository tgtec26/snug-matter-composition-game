import type * as Phaser from 'phaser';
import { DPR } from '@/game/config';

export function ensureCircle(scene: Phaser.Scene, key: string, r0: number, color: number, stroke = 0xffffff, strokeW0 = 4) {
  if (scene.textures.exists(key)) return;
  const r = r0 * DPR, strokeW = strokeW0 * DPR;
  const g = scene.add.graphics();
  g.fillStyle(color, 1); g.fillCircle(r, r, r);
  g.lineStyle(strokeW, stroke, 1); g.strokeCircle(r, r, r - strokeW / 2);
  g.generateTexture(key, r * 2, r * 2); g.destroy();
}
export function ensureRoundedRect(scene: Phaser.Scene, key: string, w0: number, h0: number, radius0: number, color: number, stroke = 0xffffff, strokeW0 = 4) {
  if (scene.textures.exists(key)) return;
  const w = w0 * DPR, h = h0 * DPR, radius = radius0 * DPR, strokeW = strokeW0 * DPR;
  const g = scene.add.graphics();
  g.fillStyle(color, 1); g.fillRoundedRect(0, 0, w, h, radius);
  g.lineStyle(strokeW, stroke, 1); g.strokeRoundedRect(strokeW / 2, strokeW / 2, w - strokeW, h - strokeW, radius - strokeW / 2);
  g.generateTexture(key, w, h); g.destroy();
}
