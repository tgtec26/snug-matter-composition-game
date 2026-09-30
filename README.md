# 입자 공작소 (가제) — snug-matter-composition-game

중2 과학 Ⅳ. 물질의 구성 학습 게임. 입자 공작소의 견습 공작사가 되어 양성자·중성자·전자로 원자를 만들고, 주기율표에 놓고, 원자를 붙여 분자를 만들고, 전자를 주고받아 이온을 만든다. 조립한 것이 곧 화학식·이온식이 되어 도감에 남는다. **현재 프로젝트 뼈대만 있음** (2026-09-30). 설계 스펙은 승인됨, 계획서 작성 후 구현 시작.

## 실행

```bash
pnpm install
pnpm dev          # http://localhost:3400
pnpm test && pnpm typecheck && pnpm lint && pnpm build
```

## 문서

- 설계 스펙 (승인): `docs/superpowers/specs/2026-09-30-matter-composition-design.md`
- 가안·결정 기록: `docs/superpowers/specs/2026-09-30-matter-composition-draft.md`
- 교과서 발췌·정리: `docs/superpowers/specs/2026-09-30-matter-composition-textbook.md` (미래엔 과학2 Ⅳ. 물질의 구성 135~167쪽). 교과서 원문은 저장소에 두지 않는다.
- 계획서: 작성 예정 (`docs/superpowers/plans/*-mvp.md`)

## 구조 (스펙 9장)

암석 순환 여행(`snug-rock-cycle-game`)·물질 분리 공방(`snug-matter-properties-game`)과 같은 구조를 따른다.

- Next.js 16 App Router 위에 Phaser 4 캔버스(1280×800, HiDPI)와 React 오버레이(HUD·대화·퀴즈·갈림길·방 4개)를 겹친다.
- 판정 규칙은 `game/rules.ts` 하나(`identifyAtom`·`placeInTable`·`identifyMolecule`·`classify`·`makeIon`·`checkLattice`), 진행 상태는 zustand 스토어 `game/store.ts`(localStorage 이어하기).
- 편집 가능한 콘텐츠는 `public/data/*.json`(원소·분자·이온·물질·주문·대화·퀴즈·미니게임), `/admin`에서 편집 (배포 서버는 저장 403).
- 그림은 `public/assets/`에 WebP를 넣으면 자동 사용, 없으면 플레이스홀더. 입자·장치 그림은 SVG 코드 우선. 생성·변환 스크립트는 `scripts/`.
