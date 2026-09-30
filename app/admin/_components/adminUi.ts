import type { CSSProperties } from 'react';
import type { DataFile } from '@/game/systems/validators';

export const sectionStyle: CSSProperties = { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: 14, marginBottom: 12 };
export const labelStyle: CSSProperties = { fontSize: 11, color: '#888', marginBottom: 4, display: 'block' };
export const inputStyle: CSSProperties = { width: '100%', background: '#0f0f0f', border: '1px solid #333', borderRadius: 4, padding: '6px 8px', color: '#eee', fontFamily: 'inherit', fontSize: 12, boxSizing: 'border-box' };
export const textareaStyle: CSSProperties = { ...inputStyle, resize: 'vertical', minHeight: 60, lineHeight: 1.5 };
export const btnStyle = (active = false): CSSProperties => ({ padding: '8px 12px', background: active ? '#22c55e' : '#222', color: active ? '#000' : '#ddd', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: active ? 'bold' : 'normal', fontSize: 12, textAlign: 'left' });
export const saveBtnStyle: CSSProperties = { width: '100%', padding: '9px 0', background: '#22c55e', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', marginBottom: 8 };

export async function loadFile<T>(file: DataFile): Promise<T | null> {
  try { const r = await fetch(`/api/admin/${file}`, { cache: 'no-store' }); if (!r.ok) return null; return (await r.json()) as T; } catch { return null; }
}
export async function saveFile(file: DataFile, data: unknown): Promise<string> {
  try {
    const r = await fetch(`/api/admin/${file}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (r.ok) return '저장 완료';
    const j = await r.json().catch(() => ({}));
    if (r.status === 403) return '배포 서버에서는 저장할 수 없습니다 (로컬 pnpm dev에서만)';
    return `저장 실패: ${(j.errors ?? [j.error ?? r.status]).join(' / ')}`;
  } catch (e) { return `저장 실패: ${String(e)}`; }
}
