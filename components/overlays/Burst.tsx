'use client';

import { useState } from 'react';

const COLORS = ['#fcd34d', '#34d399', '#60a5fa', '#f472b6', '#fb923c'];

/** 도형 파티클이 사방으로 퍼지는 반짝임 (이모지 없음). 부모는 relative. */
export function Burst({ count = 14, radius = 150 }: { count?: number; radius?: number }) {
  const [parts] = useState(() => Array.from({ length: count }, (_, k) => {
    const a = (k / count) * Math.PI * 2 + Math.random() * 0.5;
    const d = radius * (0.6 + Math.random() * 0.6);
    return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, delay: Math.random() * 120, c: COLORS[k % COLORS.length], round: k % 2 === 0 };
  }));
  return (
    <div className="absolute left-1/2 top-1/2 pointer-events-none">
      {parts.map((p, i) => (
        <span key={i} className={`absolute w-3 h-3 ${p.round ? 'rounded-full' : 'rotate-45'}`}
          style={{ background: p.c, '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, animation: `burst 0.9s ease-out ${p.delay}ms forwards` } as React.CSSProperties} />
      ))}
    </div>
  );
}
