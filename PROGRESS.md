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

## 2026-09-30 MVP 구현 (Task 1~13)
- **Task 1~4 (TDD)**: 타입·원소 20/분자 12(+He)/이온 7 데이터, `rules.ts` 판정(identifyAtom·placeInTable·identifyMolecule·classify·makeIon·checkLattice·orderDone + canGrow·liveFormula·pendingSteps·isOrderOpen·별점 함수), 주문·물질·퀴즈·대화 JSON과 검증기, 도감(`particle-dex-v1`)·데이터 스토어·store 전이(`particle-run-v1` 이어하기). 수정: 완료 주문 재수락 금지, classify 감점은 단계당 1회, 데이터 미로드 시 classify 무시.
- **Task 5~6**: 암석 순환 엔진 이식(render·sceneRouter·dataStore·audio·HUD·TopControls·DialogBox·QuizOverlay), 타이틀(시작 = 전체 화면)·인트로, 주문판(카드를 수락 자리로 드래그 또는 탭)·결과 카드·퀴즈. 수정: 주문판에서 고른 주문도 accept 대사를 거친다.
- **Task 7~10 방 4개**: 원자 조립기(양성자·중성자·전자 드래그, 실시간 원소 이름, 튜토리얼만 중성자 판정), 주기율표 광장(카드를 칸으로 드래그, 1족 물통·18족 풍선 연출), 분자 조립소(원자 공 접촉 조립, 실시간 화학식, 다른 물질 보너스 카드, 목록 밖 조합은 튕김) + 갈림길(손잡이를 끌어 문 열기), 이온 공방(전자 끌어내기·넣기, 실시간 이온식·이름) + 염화 나트륨 4×4 격자.
- **Task 11~12**: 엔딩 입자 지도·피날레·요약 팝업(결과 PNG), 도감 카드, 보너스 원소 카드 놀이, `/admin` 편집기.
- **Task 13 완주 QA (1280×800, 인앱 브라우저, 실제 드래그·클릭·키보드)**
  - 1판: localStorage 비운 상태에서 타이틀 → 인트로 → 튜토리얼(H·C·O 조립, 보너스 놀이 포함, 주기율표 H·C·O) → 주문 o3 → o4 → o1 → o2 → o5 → 엔딩 → 요약(PNG 생성 확인). 방·갈림길 도중 새로고침 2회 모두 같은 방에서 이어짐. 2판('다시 하기'): 도감 누적으로 모든 방이 건너뛰어져 대사·결과·퀴즈만 1분 16초.
  - 고친 버그: ① 보너스 놀이 중에도 주기율표 30초 타이머가 흘러 별 감점 → 놀이 중 정지 ② 보너스 별(+1~3)을 보여 주기만 하고 점수에 안 더함 → 그 방 별에 한 번 더함, 놀이 입구는 배치 성공 뒤 숨김 ③ 요약 팝업 새 카드 중복(원자 조립·주기율표 배치가 같은 원소를 두 번 넣음, React key 중복 오류) → 한 번만(테스트 추가) ④ HUD 첫 방이 '방 0/N' → '방 1/N', 주문 없을 때 빈 검은 상자 제거 ⑤ 물 완성 문구가 갈림길 정답("물은 원소가 아니에요")을 미리 알려 줌 → 문구에서 뺌(주문 완료 대사에는 유지) ⑥ 이온 불가 안내 "Cl는 전자…" → "염소는 전자…"(원소 이름+조사, 테스트 추가).
  - 한 판 시간 추정: 약 12~13분(보너스 놀이 1회 포함 시 13~14.5분). 원자 조립 드래그 138회(Cl 34회)가 가장 큼. 15분 이내라 스펙 11장 조정은 하지 않음.
  - 용어 금지어 grep·이모지 grep 0건. `docs/art-todo.md` 작성(그림 목록·파일명·codex 프롬프트).

### 남은 일
1. 그림 교체: `docs/art-todo.md` 순서대로 codex 생성 → `public/assets` WebP, BootScene `preload()`와 RoomScene 방별 배경 키 연결.
2. 효과음 보강: 지금은 암석 순환 음원 6개(correct·error·success + BGM 3)만. 놓기·빼기·문 열기·피날레 팡파르를 local-game-audio-studio로 제작.
3. 실제 크롬북 터치 확인: 첫 터치 전체 화면(인앱 브라우저는 전체 화면 거부라 미확인), 작은 입자 드래그, 소리 재생, 한 판 시간 실측.
4. Vercel Import → main 푸시 자동 배포.

## 2026-09-30 완주 QA 보완 5건 (+ 보너스 별)
- **주기율표 칸**: 칸에는 원자 번호만(1~20 밝은 칸, 나머지 회색), 카드에는 기호·이름만. 원자 조립기에서 센 양성자수와 족·주기 머리표로 자리를 찾는다. 놓은 칸에만 기호 표시. 판정은 `placeInTable` 그대로.
- **이온 별점**: `ionStars(fails, latticeMisses)` — 염화 나트륨 격자에서 같은 전하를 새로 붙인 적이 있으면 -1 (스펙 5-4 "시도 횟수 + 격자 오배치").
- **요약 팝업**: `RoomResult.misses`로 원자 조립 실패·표 오배치·분자 튕김·이온 실패·격자 충돌을 `mistakes`에 합산(갈림길 오답은 기존대로). 다른 물질 보너스 분자는 도감 등록을 `completeRoom`으로 옮겨 처음 얻은 것만 `newCards`에 들어간다(중복 없음). 방 도중 새로고침하면 그 방의 보너스 카드는 저장되지 않는다.
- **그림 자동 교체**: `BootScene.preload()`가 `public/assets/manifest.json`(지금 `[]`)에 적힌 파일 중 `render.ts`의 `ART` 표에 있는 것만 로드 → 없는 파일 404 없음. 방 배경 키를 `room_<atom|table|molecule|ion>_bg`로 나누고 방이 바뀌면 교체. 공작소 인물은 `npc_apprentice`·`npc_doctor`가 있으면 그림.
- **대사 화면 겹침**: intro·accept·result(대사창 phase)에는 공작소 인물 플레이스홀더를 숨긴다.
- **보너스 놀이 별**: 한 판에 한 번만(`store.bonusStarTaken`, persist, restartRun/reset에서 초기화). 받은 뒤에는 주기율표의 놀이 입구를 숨긴다.
- 확인: `pnpm test`(72) · typecheck · lint · build 통과. 1280×800 인앱 브라우저에서 주기율표 오배치/정배치(드래그), 격자 충돌 후 이온 별 +2, 요약 팝업 실수 3번·새 카드 O₂ 포함, 대사 화면 인물 숨김, manifest 빈 목록일 때 4xx 요청 0건, 임시 그림을 manifest에 넣었을 때 공작소·원자 방·주기율표 방 배경 교체를 확인(임시 그림은 삭제).
