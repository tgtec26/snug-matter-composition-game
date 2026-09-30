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

## 2026-09-30 전역 개발 지침 대조
- `tgtec26/snug-game-principles`(커밋 0f09d04) 기준 사후 점검: `docs/principles-check.md`(점검표 14개 항목 + 교과서 원문 위치), 회고 조사 `docs/reference-games.md`. AGENTS.md에 지침 링크 추가.
- 코드는 바꾸지 않았다. `pnpm test`(72)·typecheck·lint 통과. 브라우저 플레이는 하지 않았다.
- 지침 기준 남은 일: 효과음 제작(놓기·빼기·문 열기·피날레 — 기존 "남은 일 2"와 같음), 음량과 배치 좌표의 어드민화 여부 결정, 퀴즈 비중 축소 검토, 크롬북 실기, 교과서 원문 `docs/textbook/` 위치 결정(사용자).
## 2026-09-30 그림 교체 2단계 — React 오버레이 CSS 도형 → 그림
- **공용**: `components/Art.tsx` — `Art`(img, draggable=false·pointer-events-none·로드 실패 시 숨김), `Sphere`(구 그림을 원으로 잘라 지름에 맞춤 + 코드 그림자, 집으면 그림자 멀어짐), `artBg`(늘려 까는 background), `artFrame`(border-image 9조각), `NUCLEUS_ART`. 글자·기호·숫자는 모두 코드가 그림 위에 얹는다.
- **그림 수정**: 1단계에서 잘라낸 그림의 바닥 그림자가 투명 그라데이션이 아니라 **밝은 불투명 픽셀**이라 어두운 방에서 흰 얼룩으로 보였다 → `scripts/fix_shadow.py`(투명 영역에서 이어진 밝고 채도 낮은 픽셀만 반투명 검정 그림자로)를 ui/* 전부, items/slot_socket*·tile_*, fx/nucleus에 적용. 구(atom_*·proton·neutron·electron)는 은회색 구(H·중성자)가 그림자와 구분되지 않아 파일은 두고 `Sphere`가 원으로 잘라 쓴다.
- **방**: 원자 조립기(입자 구·원자핵·전자 자리 나무 받침·트레이·완성 버튼·완성 카드), 주기율표(칸 4종 cell_bright/empty/hit/line·원소 카드·보너스 입구 카드 뒷면), 카드 놀이(이름 카드 plate_wood/panel_paper·기호 카드 앞뒤·말 그림·화살표·돌아가기), 분자 조립소(원자 구·화살표·보너스 카드, CSS 작업대·나무 상자 삭제 — 배경 그림에 있음, 놓을 영역 테두리만 유지), 갈림길(문·문 안 어둠/빛·손잡이·화살표·안내 말풍선), 이온 공방(전자·원자핵·이온식 판·트레이·Na⁺/Cl⁻ 원판·격자 칸·격자 판·완성 카드).
- **공작소·결과**: 대사창(panel_dialog 9조각 + 금테 초상에 박사 얼굴), 타이틀 시작 버튼, HUD 판·별 아이콘, 우상단 버튼, 주문 종이·완료 종이·완료 도장(회전 제거)·자물쇠·화살표·재료 칸, 도감 카드(card_front)·새 카드 리본, 퀴즈 판·보기 버튼·견습생 고민/기쁨(판 위), 엔딩 원소 칸·물질 판·별, 요약 카드(panel_paper 9조각 + 견습생 기쁨 + 별)·버튼 3종.
- **동작 변경 없음**: 판정·좌표·드롭 영역·키보드·입력 잠금 그대로. 예외 2건: 카드 놀이 말은 세운 말 그림(48×74)에 맞춰 잡는 영역을 위로 넓힘(원 48×48 → 48×74, 머리를 잡아도 집힘), 퀴즈 동안 공작소 인물(Phaser)을 숨김(문제판 위 견습생과 겹침).
- 요약 PNG: html-to-image가 border-image 그림을 못 넣어서 저장 순간 같은 그림을 data URL로 바꿔 끼운다(PNG에 테두리·별·견습생 포함 확인).
- 확인: test(72)·typecheck·lint·build·diff --check. 1280×800 헤드리스 크롬(포인터 이벤트를 elementFromPoint 요소에 보내 히트 영역 검증) + 인앱 브라우저 실제 드래그 일부로 타이틀→튜토리얼(H 실패/성공, C·O 키보드)→주기율표(오배치/정배치, 보너스 카드 놀이 한 바퀴)→주문 1(물: 붙이기·튕김·떼기, 갈림길 오답/정답)→퀴즈(오답/정답)→주문 4(Na·Cl, 이온 실패/성공, 격자 충돌/완성)→엔딩→요약·PNG.
- 남은 일: Phaser 쪽 그림(npc 발밑, fx 건전지·비커·물통 등)도 같은 흰 그림자 문제가 있다 — `fix_shadow.py` 적용 검토(흰 가운 등 밝은 가장자리가 먹히지 않는지 확인 필요).

### 그림 교체 잔여 결함 4건 (2026-10-01)
- **Phaser 그림 그림자**: `fix_shadow.py`를 npc 견습생 3장·fx/battery는 기본값(SAT=50), 밝은 물체인 doctor·balloon·bucket·cup·metal은 `SAT=10`으로 적용(SAT=50은 흰 가운·풍선·유리·금속 하이라이트를 검게 먹어 제외). 공작소·물통·풍선·물 분해 연출을 브라우저에서 확인. 컵 바닥에 옅은 그림자 자국이 조금 남는다(허용).
- **fx/nucleus**: codex로 회색-남색 구(`docs/assets-source/fx/nucleus2.png`) 생성 → 기존 351×360 구도(구 지름 326, 중심 182,171)에 맞춰 WebP 변환. `NUCLEUS_ART`의 색 필터 제거. 원자 방·이온 공방에서 파란 전자와 구분됨을 확인.
- **React same key 오류**: 원인 = 새 카드 중복 수정(bdcfe4b) 이전에 브라우저 localStorage(`particle-run-v1`)에 저장된 `newCards`에 같은 카드가 두 번 들어 있어 요약 팝업 `key={id}`가 겹침(H·C·O·Na·Cl·N·Mg = 원자 방+주기율표 방이 같은 원소를 두 번 얻던 옛 흐름). 새 흐름은 재현되지 않음. persist `merge`에서 `newCards`를 중복 제거해 불러오도록 수정 + 테스트 1건.
- **ui/knob·ui/card_front**: card_front는 fix_shadow 적용(17px). knob은 아래 분홍빛 얼룩이 채도가 높아 SAT=90까지 올려도 제거되지 않아(금색 본체가 깎임) 원본 유지 — 작게 쓰는 손잡이라 무시.
