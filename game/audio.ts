/**
 * 배경음 1트랙(HTMLAudio) + 효과음(WebAudio). 음원은 공통 세트 재활용 (public/assets/audio).
 * 음량·경로는 public/data/audio-config.json(어드민 '소리' 탭)에서 온다. 아래 DEFAULT는 json을 읽기 전 값.
 * 브라우저는 첫 사용자 입력 전 재생을 막으므로 실패는 조용히 무시하고, 첫 입력 때 unlockAudio()로 다시 시도한다.
 */
export type BgmKey = 'title' | 'room' | 'quiz';
export type SfxKey = 'success' | 'correct' | 'error' | 'pick' | 'place';

export interface AudioConfig {
  bgm: { volume: number; tracks: Record<BgmKey, string> };
  sfx: { volume: number; minGapMs: number; files: Record<SfxKey, string> };
}
export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  bgm: { volume: 0.4, tracks: { title: '/assets/audio/start_ending.mp3', room: '/assets/audio/mole_game.mp3', quiz: '/assets/audio/quiz-background.mp3' } },
  sfx: { volume: 0.7, minGapMs: 90, files: {
    success: '/assets/audio/success.mp3', correct: '/assets/audio/correct.mp3', error: '/assets/audio/error.mp3',
    pick: '/assets/audio/pick.mp3', place: '/assets/audio/place.mp3' } },
};

export const MUTE_KEY = 'matter-composition:muted';
let cfg: AudioConfig = DEFAULT_AUDIO_CONFIG;
let current: { key: BgmKey; el: HTMLAudioElement } | null = null;
let muted = readMuted();
const muteListeners = new Set<() => void>();

function readMuted() {
  try { return typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}

export function setAudioConfig(c: AudioConfig) {
  cfg = c;
  if (current) current.el.volume = c.bgm.volume;
  buffers.clear(); loading.clear();
}

function safePlay(el: HTMLAudioElement) {
  if (typeof document !== 'undefined' && document.hidden) return;
  el.play()?.catch(() => { /* autoplay 차단 — 무시 */ });
}

export function playBgm(key: BgmKey) {
  if (typeof window === 'undefined') return;
  const src = cfg.bgm.tracks[key];
  if (current?.key === key && current.el.getAttribute('src') === src) { if (current.el.paused) safePlay(current.el); return; }
  current?.el.pause();
  const el = new Audio(src);
  el.loop = true;
  el.volume = cfg.bgm.volume;
  el.muted = muted;
  current = { key, el };
  safePlay(el);
}

export function stopBgm() {
  current?.el.pause();
  current = null;
}

/** 탭이 숨겨지면 BGM 정지, 돌아오면 이어서 재생 */
export function setBgmHidden(hidden: boolean) {
  if (!current) return;
  if (hidden) current.el.pause(); else safePlay(current.el);
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buffers = new Map<SfxKey, AudioBuffer>();
const loading = new Set<SfxKey>();
const lastAt = new Map<SfxKey, number>();

function getCtx() {
  if (ctx) return ctx;
  const Ctor = typeof window !== 'undefined' ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : undefined;
  if (!Ctor) return null;
  try { ctx = new Ctor(); master = ctx.createGain(); master.connect(ctx.destination); } catch { ctx = null; }
  return ctx;
}

function loadSfx(key: SfxKey) {
  const c = getCtx();
  if (!c || buffers.has(key) || loading.has(key)) return;
  loading.add(key);
  fetch(cfg.sfx.files[key]).then(r => r.arrayBuffer()).then(b => c.decodeAudioData(b))
    .then(buf => { buffers.set(key, buf); }).catch(() => { /* 음원 없음 — 무시 */ }).finally(() => { loading.delete(key); });
}

export function playSfx(key: SfxKey) {
  if (typeof window === 'undefined' || muted) return;
  const now = performance.now();
  if (now - (lastAt.get(key) ?? -Infinity) < cfg.sfx.minGapMs) return;
  const c = getCtx(); const buf = buffers.get(key);
  if (!c || !master) return;
  if (!buf) { loadSfx(key); return; }   // 아직 안 불러왔으면 이번만 건너뛰고 불러 둔다
  lastAt.set(key, now);
  if (c.state === 'suspended') void c.resume().catch(() => {});
  const g = c.createGain(); g.gain.value = cfg.sfx.volume; g.connect(master);
  const src = c.createBufferSource(); src.buffer = buf; src.connect(g); src.start();
}

/** 첫 사용자 입력에서: BGM 재생 시도 + AudioContext 깨우기 + 효과음 미리 불러오기 */
export function unlockAudio() {
  if (current?.el.paused) safePlay(current.el);
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') void c.resume().catch(() => {});
  (Object.keys(cfg.sfx.files) as SfxKey[]).forEach(loadSfx);
}

export function setMuted(m: boolean) {
  muted = m;
  if (current) current.el.muted = m;
  try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch { /* 저장 실패 — 무시 */ }
  muteListeners.forEach(f => f());
}
export const subscribeMuted = (f: () => void) => { muteListeners.add(f); return () => { muteListeners.delete(f); }; };
export const isMuted = () => muted;
