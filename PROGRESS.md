# 입자 공작소 (가제) — 진행 기록

## 2026-09-30 기획·스펙
- 교과서 Ⅳ. 물질의 구성(135~167쪽) 발췌·정리 → `docs/superpowers/specs/2026-09-30-matter-composition-textbook.md` (단원 구조, 과학적 정확성, 게임 데이터 목록, 퀴즈 원천 35문항, 조작 단서 8개).
- 가안 → 설계 스펙 v1 **승인** (`2026-09-30-matter-composition-design.md`). 확정: 입자 공작소 세계관(물질 분리 공방 견습생 재사용), 방 4개(원자 조립기·주기율표 광장·분자 조립소·이온 공방, 이온 이동 실험대는 부록), 원자 번호 1~20, 한 판 = 튜토리얼 + 주문 5개(12분 내외, 최대 15분), 오답은 교과서 근거 안내 후 재조작(별 1개 감점), 다른 교과서 분자를 만들면 보너스 카드.

## 2026-09-30 프로젝트 뼈대
- `snug-matter-properties-game` 뼈대와 동일 설정 (암석 순환에서 유래): pnpm 10, Next.js 16.3.6, React 19.2.8, Phaser 4.2, zustand 5, Tailwind 4, TypeScript 5, Vitest 4 (jsdom). dev 포트 3400 (혈액 3000, 암석 3100, 전기 3200, 물질의 특성 3300과 동시 실행 가능).
- `app/page.tsx`는 1280×800 letterbox placeholder, `game/config.ts`는 무대 크기만. 게임 본체 없음.
- `scripts/` 3개 복사 (Codex 이미지 생성, WebP 배경 변환, 시트 자르기).
- 확인: `pnpm test`(3 tests) · `pnpm typecheck` · `pnpm lint` · `pnpm build`(정적 `/`) 모두 통과.

### 다음 단계
1. 계획서 `docs/superpowers/plans/2026-09-30-matter-composition-mvp.md` 작성 (스펙 9장 코드 구성 기준, 태스크별 체크박스).
2. 암석 순환에서 공통 부품 이식 (AGENTS.md "참고 구현" 목록) → `rules.ts`(4-3 판정표)와 테스트부터. 물질 분리 공방의 주문판·견습생 그림이 먼저 생기면 가져온다.
3. Vercel 대시보드에서 Import → main 푸시 자동 배포.

## 2026-09-30 구현 계획서
- `docs/superpowers/plans/2026-09-30-matter-composition-mvp.md` 작성 (태스크 13개). Task 1~4(타입·데이터·rules·store, 코드 전문·TDD) → 5~6(엔진 이식, 주문판·결과·퀴즈 흐름) → 7~10(방 4개) → 11(엔딩·요약·보너스) → 12(admin) → 13(완주 QA·푸시).
- 열린 항목: 원소 상태·쪽수는 교과서 그림 Ⅳ-6 대조, 튜토리얼 퀴즈 생략 해석.

### 다음 단계
1. Task 1부터 subagent-driven-development로 실행.
