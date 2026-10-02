import { it, expect, beforeEach, vi } from 'vitest';
import cfg from '../public/data/audio-config.json';
import { DEFAULT_AUDIO_CONFIG, MUTE_KEY, type AudioConfig } from '../game/audio';
import { VALIDATORS } from '../game/systems/validators';
import { existsSync } from 'node:fs';

beforeEach(() => { vi.resetModules(); localStorage.clear(); });

it('audio-config.json은 검증을 통과하고 기본값과 같다 (소리가 바뀌지 않음)', () => {
  expect(VALIDATORS['audio-config'](cfg as never)).toEqual([]);
  expect(cfg).toEqual(DEFAULT_AUDIO_CONFIG);
});
it('음량 범위·누락 경로를 어드민 저장 단계에서 거른다', () => {
  const bad = { ...cfg, bgm: { ...cfg.bgm, volume: 2 }, sfx: { ...cfg.sfx, files: { ...cfg.sfx.files, pick: '' } } };
  expect(VALIDATORS['audio-config'](bad as never).length).toBe(2);
});
it('설정의 모든 음원 파일이 public에 있다', () => {
  const c = cfg as AudioConfig;
  for (const p of [...Object.values(c.bgm.tracks), ...Object.values(c.sfx.files)]) expect(existsSync(`public${p}`), p).toBe(true);
});
it('음소거는 localStorage에 저장되고 다시 불러온 모듈에서 유지된다', async () => {
  const a = await import('../game/audio');
  expect(a.isMuted()).toBe(false);
  a.setMuted(true);
  expect(localStorage.getItem(MUTE_KEY)).toBe('1');
  vi.resetModules();
  expect((await import('../game/audio')).isMuted()).toBe(true);
});
it('localStorage가 막혀도 음소거 토글이 던지지 않는다', async () => {
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  const a = await import('../game/audio');
  expect(() => a.setMuted(true)).not.toThrow();
  expect(a.isMuted()).toBe(true);
  spy.mockRestore();
});
it('phase별 BGM: 시작·결과 / 방 / 주문·퀴즈', async () => {
  const { pickBgm } = await import('../components/AudioRunner');
  expect(pickBgm('title' as never)).toBe('title');
  expect(pickBgm('room')).toBe('room');
  expect(pickBgm('classify')).toBe('room');
  expect(pickBgm('quiz')).toBe('quiz');
  expect(pickBgm('orders')).toBe('quiz');
});
