'use client';
import { useEffect, useState } from 'react';
import { VALIDATORS, type DataFile } from '@/game/systems/validators';
import { loadFile, saveFile, saveBtnStyle, textareaStyle } from './adminUi';

/** 구조가 단순한 파일은 JSON을 직접 고친다. 형식·검증 오류가 있으면 저장 버튼이 꺼진다. */
export default function JsonEditor({ file, help }: { file: DataFile; help: string }) {
  const [text, setText] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  useEffect(() => { loadFile<unknown>(file).then(v => setText(v === null ? '' : JSON.stringify(v, null, 2))); }, [file]);
  if (text === null) return <div style={{ padding: 20, color: '#888' }}>불러오는 중…</div>;

  let parsed: unknown = null;
  let errors: string[] = [];
  try { parsed = JSON.parse(text); errors = VALIDATORS[file](parsed as never); }
  catch (e) { errors = [`JSON 형식 오류: ${String(e)}`]; }
  const save = async () => { setStatus('저장 중...'); setStatus(await saveFile(file, parsed)); setTimeout(() => setStatus(''), 4000); };

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', gap: 8 }}>
      <div style={{ fontSize: 12, color: '#aaa' }}>{help}</div>
      <textarea value={text} onChange={e => setText(e.target.value)} spellCheck={false} style={{ ...textareaStyle, flex: 1, fontSize: 13 }} />
      {errors.length > 0 && <div style={{ color: '#f87171', fontSize: 11 }}>{errors.map((e, i) => <div key={i}>• {e}</div>)}</div>}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={save} disabled={errors.length > 0} style={{ ...saveBtnStyle, width: 160, marginBottom: 0, opacity: errors.length ? 0.4 : 1 }}>저장</button>
        {status && <span style={{ fontSize: 11 }}>{status}</span>}
      </div>
    </div>
  );
}
