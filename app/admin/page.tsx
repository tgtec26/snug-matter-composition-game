'use client';
import { useState } from 'react';
import Link from 'next/link';
import JsonEditor from './_components/JsonEditor';
import { btnStyle } from './_components/adminUi';
import type { DataFile } from '@/game/systems/validators';

interface Tab { id: string; label: string; files: { file: DataFile; label: string; help: string }[] }
const TABS: Tab[] = [
  { id: 'elements', label: '원소', files: [{ file: 'elements', label: '원소', help: '원소 1~20번: number·symbol·name·group(족)·period(주기)·state. 중성자수(neutrons)는 수소·탄소·산소만 교과서에 있으니 다른 원소에는 넣지 마세요.' }] },
  { id: 'particles', label: '분자·이온', files: [
    { file: 'molecules', label: '분자', help: '교과서 목록의 분자만. atoms는 {원소 기호: 개수}, card는 도감 카드 문구.' },
    { file: 'ions', label: '이온', help: '이온 7종. 양이온은 pole "(-)극", 음이온은 "(+)극".' },
    { file: 'substances', label: '물질', help: '완성 물질 카드(components·particle).' },
  ] },
  { id: 'orders', label: '주문', files: [{ file: 'orders', label: '주문', help: 'steps의 room은 atom·table·molecule·ion, target은 원소 기호 / 분자 id / 이온 id (데이터에 있어야 저장됩니다). unlockedAfter는 잠금 조건, accept·done은 대사.' }] },
  { id: 'dialog', label: '대화', files: [{ file: 'dialog-config', label: '대화', help: 'intro는 인트로 대사(한 줄씩 넘어감), hints는 실패 한 줄 안내. 대사는 1~2문장.' }] },
  { id: 'quiz', label: '퀴즈', files: [{ file: 'quiz-pool', label: '퀴즈', help: 'order는 주문 id, answer는 choices 안의 번호(0부터), page·explain은 교과서 근거.' }] },
  { id: 'minigame', label: '미니게임', files: [{ file: 'minigame-config', label: '미니게임', help: '시간은 ms(1000 = 1초). 방마다 수치·좌표를 조정하세요. 한 판 10분 내외가 되도록.' }] },
];

export default function AdminPage() {
  const [tab, setTab] = useState(TABS[0].id);
  const t = TABS.find(x => x.id === tab)!;
  const [sub, setSub] = useState<Record<string, number>>({});
  const f = t.files[sub[tab] ?? 0];
  const prod = process.env.NODE_ENV === 'production';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f0f0f', color: '#eee', fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', gap: 4, padding: '8px 12px', background: '#141414', borderBottom: '1px solid #2a2a2a', alignItems: 'center' }}>
        {TABS.map(x => <button key={x.id} onClick={() => setTab(x.id)} style={{ ...btnStyle(tab === x.id), padding: '8px 16px', fontSize: 13 }}>{x.label}</button>)}
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: prod ? '#f87171' : '#888' }}>
          {prod ? '읽기 전용 — 배포 서버에서는 저장 불가' : '저장은 로컬(pnpm dev)에서만 됩니다. 저장한 JSON은 git 커밋·푸시로 배포하세요.'}
        </div>
        <Link href="/" style={{ marginLeft: 12, fontSize: 12, color: '#7dd3fc' }}>게임 →</Link>
      </div>
      {t.files.length > 1 && (
        <div style={{ display: 'flex', gap: 4, padding: '6px 12px', background: '#111' }}>
          {t.files.map((x, i) => <button key={x.file} onClick={() => setSub({ ...sub, [tab]: i })} style={btnStyle((sub[tab] ?? 0) === i)}>{x.label}</button>)}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <JsonEditor key={f.file} file={f.file} help={f.help} />
      </div>
    </div>
  );
}
