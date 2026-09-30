'use client';

import { useDataStore } from '@/game/dataStore';
import { Burst } from '@/components/overlays/Burst';
import { Art, artBg } from '@/components/Art';

export type CardKind = 'element' | 'molecule' | 'ion' | 'substance';

/** 도감 카드(스펙 6장). 결과·요약에서 재사용한다. */
export function ParticleCardView({ kind, id, isNew = false, delay = 0 }: { kind: CardKind; id: string; isNew?: boolean; delay?: number }) {
  const elements = useDataStore(s => s.elements);
  const molecules = useDataStore(s => s.molecules);
  const ions = useDataStore(s => s.ions);
  const substances = useDataStore(s => s.substances);

  let title = id;
  let sub = '';
  let rows: [string, React.ReactNode][] = [];
  let parts: { name: string; components: string[]; particle: string }[] | undefined;

  if (kind === 'element') {
    const e = elements.find(x => x.symbol === id);
    if (!e) return null;
    title = e.name; sub = e.symbol;
    rows = [['원자 번호', `${e.number} (양성자수 ${e.number})`], ['족·주기', `${e.group}족 ${e.period}주기`], ['상온 상태', e.state], ['교과서', `${e.page}쪽`]];
  } else if (kind === 'molecule') {
    const m = molecules.find(x => x.id === id);
    if (!m) return null;
    title = m.name; sub = m.formula;
    const atoms = Object.entries(m.atoms).map(([sym, n], k) => <span key={sym} className="whitespace-nowrap">{k > 0 && '+ '}{elements.find(e => e.symbol === sym)?.name ?? sym} {n}개 </span>);
    rows = [['구성 원자', atoms], ['분류', m.kind === '원소' ? '원소' : '화합물'], ['나누면', '성질이 사라짐'], ['교과서', `${m.page}쪽`]];
  } else if (kind === 'ion') {
    const i = ions.find(x => x.id === id);
    if (!i) return null;
    title = i.name; sub = i.formula;
    const n = Math.abs(i.charge);
    rows = [['전자', `${n}개 ${i.charge > 0 ? '잃음' : '얻음'}`], ['전류를 흘리면', `${i.pole}으로 이동`]];
  } else {
    const s = substances.find(x => x.id === id);
    if (!s) return null;
    title = s.name;
    rows = [['구성 성분', s.components.join(', ')], ['구성 입자', s.particle]];
    parts = s.parts;
  }

  return (
    <div className="relative" style={{ animation: `pop 0.5s cubic-bezier(.2,1.4,.4,1) ${delay}ms both` }}>
      {isNew && <Burst />}
      <div className={`text-slate-900 px-10 pt-7 pb-10 ${parts ? 'w-[420px]' : 'w-[280px]'}`}
        style={{ ...artBg('ui/card_front'), filter: isNew ? 'drop-shadow(0 0 18px rgba(252,211,77,.8))' : undefined }}>
        <div className="flex items-baseline justify-between gap-3 mb-3 border-b-2 border-slate-300 pb-2">
          <span className="text-[30px] font-black">{title}</span>
          {sub && <span className="text-[30px] font-black text-sky-700">{sub}</span>}
        </div>
        {rows.map(([k, v]) => (
          <div key={k} className="text-[19px] leading-snug mb-1"><span className="text-slate-500 mr-2">{k}</span><span className="font-bold">{v}</span></div>
        ))}
        {parts && (
          <div className="mt-3 border-t-2 border-slate-300 pt-2 flex flex-col gap-1">
            {parts.map(p => (
              <div key={p.name} className="text-[16px]"><span className="font-bold">{p.name}</span> <span className="text-slate-500">{p.components.join(', ')} · {p.particle}</span></div>
            ))}
          </div>
        )}
        {isNew && (
          <div className="absolute -top-5 -right-6 w-[110px] h-[53px] rotate-6 flex items-center justify-center pb-3 text-white text-[16px] font-black" style={{ textShadow: '0 1px 2px #7f1d1d' }}>
            <Art src="ui/ribbon" className="absolute inset-0 w-full h-full" />
            <span className="relative">새 카드</span>
          </div>
        )}
      </div>
    </div>
  );
}
