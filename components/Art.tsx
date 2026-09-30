/* eslint-disable @next/next/no-img-element -- 드래그 중 매 프레임 움직이는 작은 장식 그림이라 next/image 대신 일반 img */
import type { CSSProperties } from 'react';

/** public/assets 그림 한 장. 장식이라 입력을 가로채지 않고, 못 불러오면 숨긴다(글자·히트 영역은 코드에 그대로 남는다). */
export function Art({ src, className = '', style }: { src: string; className?: string; style?: CSSProperties }) {
  return (
    <img src={`/assets/${src}.webp`} alt="" aria-hidden draggable={false}
      className={`pointer-events-none select-none max-w-none ${className}`} style={style}
      onError={e => { e.currentTarget.style.visibility = 'hidden'; }} />
  );
}

/** 구 그림(192px 안, 중심 45.5%·반지름 39%의 구 + 오른쪽 아래 그림자)을 지름 size 자리에 맞춘다. 그림의 바닥 그림자는 은회색 구(H·중성자)와
 *  구분이 안 돼 원으로 잘라 내고, 그림자는 코드가 그린다 — lift면 그림자가 멀어진다(집어 올린 높이). */
export function Sphere({ src, size, lift = false }: { src: string; size: number; lift?: boolean }) {
  return (
    <>
      <div className="absolute rounded-full bg-black/40 blur-[3px]"
        style={{ left: size * 0.1, right: size * 0.1, bottom: lift ? -size * 0.45 : -size * 0.08, height: size * 0.28, transition: 'bottom .1s' }} />
      <Art src={src} className="absolute" style={{
        left: -size * 0.083, top: -size * 0.083, width: size * 1.28, height: size * 1.28, clipPath: 'circle(38.5% at 45.5% 45.5%)',
      }} />
    </>
  );
}

/** 요소 크기에 맞춰 늘려 까는 그림 바탕 (버튼·패널·칸). 못 불러오면 바탕만 빠진다. */
export const artBg = (src: string): CSSProperties => ({ background: `url(/assets/${src}.webp) center / 100% 100% no-repeat` });

/** 테두리 그림을 9조각으로 늘려 까는 바탕 (판·상자·대사창). slice는 원본 px, w는 화면에 그릴 테두리 두께. */
export const artFrame = (src: string, slice: number, w: number): CSSProperties => ({
  borderStyle: 'solid', borderWidth: 0, borderImage: `url(/assets/${src}.webp) ${slice} fill / ${w}px stretch`,
});

/** 지름 180 원자핵 자리(border-2 안쪽 기준)에 맞춘 원자핵 그림. 구만 원으로 잘라 쓰고(그림자는 코드),
 *  전자(파랑)와 색이 겹치지 않게 회색-남색 구다. */
export const NUCLEUS_ART: CSSProperties = { left: -10, top: -3, width: 188, height: 193, clipPath: 'circle(46.5% at 52% 47.5%)' };
export const NUCLEUS_SHADOW: CSSProperties = { left: 15, right: 15, bottom: -34, height: 26 };
