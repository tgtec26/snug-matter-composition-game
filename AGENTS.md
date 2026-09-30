# AGENTS

> AI 코딩 에이전트가 이 저장소에서 작업할 때 따라야 할 지침. 상위 `../../AGENTS.md`(워크스페이스 공통 규칙)가 있으면 병합해 적용한다.

## 현재 상태 (2026-09-30)
MVP 구현 완료 (계획서 `docs/superpowers/plans/2026-09-30-matter-composition-mvp.md` Task 1~13 완료, 1280×800 완주 QA 끝). 그림은 플레이스홀더 — 교체 목록은 `docs/art-todo.md`. 남은 일은 PROGRESS.md 끝 절.

## 작업을 이어받으면
1. [PROGRESS.md](PROGRESS.md)에서 완료 항목·다음 단계 확인.
2. 스펙 [docs/superpowers/specs/2026-09-30-matter-composition-design.md](docs/superpowers/specs/2026-09-30-matter-composition-design.md) (승인). 결정 과정은 가안 `*-draft.md`, 교과서 근거는 `*-textbook.md` (미래엔 과학2 Ⅳ. 물질의 구성 135~167쪽). 교과서 원문은 구글 드라이브에 있고 저장소에 커밋하지 않는다.
3. 참고 구현: 암석 순환 여행 — 로컬 `../snug-rock-cycle-game`, GitHub `tgtec26/snug-rock-cycle-game`. 옮겨 올 공통 부품: `game/systems/`(render, placeholders, sceneRouter, validators), `game/dataStore.ts`, `game/phaserConfig.ts`, `game/audio.ts`, `components/`(GameContainer, HUD, UIOverlay, TopControls, AudioRunner, overlays/DialogBox, overlays/QuizOverlay), `components/overlays/MineralOverlay.tsx`의 포인터·드롭 판정(방 4개 오버레이의 바탕), `app/admin/`, `app/api/admin/`. 물질 분리 공방(`../snug-matter-properties-game`)에 주문판·견습생 그림이 생기면 그것을 재사용. 규칙·스토어·타입·씬·데이터·나머지 오버레이는 새로 쓴다. 그림 원본과 `public/assets`는 가져오지 않는다.
4. 코드 수정 후 `pnpm test && pnpm typecheck && pnpm lint` 통과. Next.js 16 API는 `node_modules/next/dist/docs/` 먼저 읽기.
5. 판정 규칙은 `game/rules.ts`에만 (스펙 4-3 표의 여섯 함수가 곧 테스트). 상태 전이는 `game/store.ts`의 `start/next/acceptOrder/completeRoom/classify/finishQuiz/restartRun/reset`만 사용 (임의 phase 점프 금지).
6. 편집 가능한 콘텐츠는 TS가 아니라 `public/data/*.json` (원소·분자·이온·물질·주문·대화·퀴즈·미니게임). `/admin`에서 편집 (배포 서버는 저장 403).
7. `game/scenes/*.ts` 수정 후 브라우저 **전체 새로고침**. 개발 콘솔 훅: `__store`, `__game`, `__rules`.
8. 한글 UI는 어절 단위 줄바꿈(`word-break: keep-all`, 전역 CSS) 유지. 크롬북 1280×800 터치로 끝까지 진행 가능해야 한다(입자 44px 이상). dev 포트 3400.

## 학습 핵심
"물질은 입자로 이루어져 있다. 원소 기호·화학식·이온식은 그 입자의 종류와 개수를 적는 약속이고, 같은 원자라도 어떻게 모이느냐(원자 배열·분자·이온)에 따라 다른 물질이 된다." 양성자수 = 원소, 원자 종류·개수 = 분자, 전자 잃음/얻음 = 이온. 조립한 것이 곧 화학식.

## 과학적 정확성 (반드시 유지) — 미래엔 과학2 Ⅳ. 물질의 구성 (138~161쪽)
- **원소** = 한 가지 종류의 입자로 이루어진 물질, **화합물** = 서로 다른 종류의 입자로 이루어진 물질. 화합물은 성분 원소와 성질이 전혀 다르고 각 성분 원소로 분해할 수 있다. 원소는 118가지.
- **원소 기호**: 첫 글자 대문자, 겹치면 중간 글자 소문자. 표기는 교과서(플루오린, 나트륨(소듐), 칼륨(포타슘), 규소, 붕소). **화학식**: 원자 개수는 오른쪽 아래 작은 숫자(1 생략), 금속처럼 원자가 연속 배열된 물질은 원소 기호만(Fe, Cu).
- **원자** = 원자핵((+) 양성자 + 전하 없는 중성자) + (-) 전자. **양성자수 = 전자 수 → 전기적으로 중성. 원자의 종류 = 양성자수.** 중성자수는 수소 0·탄소 6·산소 8만 교과서에 있음 — 다른 원소는 판정하지 않고 **지어내지 않는다**.
- **주기율표**: 원자 번호(= 양성자수)순, 세로줄 **족** 18개, 가로줄 **주기** 7개. 같은 족은 성질 비슷. 1족 리튬·나트륨·칼륨은 물과 활발히 반응해 기체 발생, 18족 헬륨·네온·아르곤은 상온 기체·잘 반응 안 함. 수소는 1족이지만 금속과 다름. 게임 범위는 1~20번.
- **분자** = 독립된 입자로 존재하여 물질의 성질을 나타내는 가장 작은 입자. 나누면 성질이 사라짐. 18족 원자 1개도 분자라 할 수 있음. 원자 종류가 같아도 개수가 다르면 다른 분자(O₂/O₃, H₂O/H₂O₂, CO/CO₂). 목록은 교과서 12종(H₂ O₂ N₂ Cl₂ O₃ H₂O H₂O₂ CO CO₂ CH₄ NH₃ HCl)만.
- **이온** = 원자가 전자를 잃거나 얻어 전하를 띤 입자. 양이온(+, 잃음)/음이온(-, 얻음). 이온식은 오른쪽 위(1 생략). 이름은 양이온 "~ 이온", 음이온 "~화 이온"(산화 이온·염화 이온). 조립 가능 이온은 H⁺ Li⁺ Na⁺ K⁺ Mg²⁺ Cl⁻ O²⁻ 7종만. 염화 나트륨은 Na⁺·Cl⁻가 규칙적으로 배열.
- **이온의 이동**(카드·퀴즈 문구): 양이온 → (-)극, 음이온 → (+)극.
- **용어**: 전자 껍질·전자 배치·옥텟 X, 이온 결합·공유 결합 X("결합하여"만), 전기 분해 X("물 분해"), 알칼리 금속·비활성 기체·금속/비금속 X("1족 원소"·"18족 원소"), 불소·메탄 X. 분자 모형은 공을 붙인 그림으로만, 결합 각도·모양·종류를 말하지 않는다. 교과서 목록 밖의 원소·분자·이온은 만들 수 없다.
