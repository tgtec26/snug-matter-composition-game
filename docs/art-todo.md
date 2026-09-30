# 그림 목록 (art-todo)

스펙 13장 기준. 지금 게임은 **플레이스홀더(단순 도형·CSS 그라데이션 공)로 끝까지 완성**돼 있고, 아래 그림은 교체용이다. 모든 그림은 codex로 만든다 (`scripts/gen_image.sh`). 이모지 금지.

## 공통 규칙

- **표시 크기의 2배 해상도 WebP.** 배경은 1280×800 표시 → 원본 PNG 생성 후 `scripts/to_webp_bg.sh <원본.png> <출력.webp>` (1600×1000, q85, 암석 순환과 동일). 인물·아이템은 `scripts/slice_sheet.py`로 격자 시트를 잘라 투명 WebP (한 변 = 표시 높이의 2배).
- **원본 보관**: `docs/assets-source/<분류>/<이름>.png` (커밋), 게임용: `public/assets/<분류>/<이름>.webp`.
- **화풍 통일**: 모든 프롬프트 앞에 아래 "화풍 머리말"을 붙이고, 첫 번째로 만든 공작소 배경을 이후 요청에 참고 그림으로 첨부한다.
- **격자 시트**: 인물·입자·장치처럼 작은 그림은 한 장의 격자 시트(흰 배경 또는 투명, 칸 사이 여백 넉넉히)로 만들어 잘라 화풍을 맞춘다.
- **Phaser 텍스처 키 ↔ 파일 경로**: `BootScene.preload()`가 `public/assets/manifest.json`(파일 경로 배열, 예: `["bg/workshop.webp"]`)을 읽고, 거기 적힌 파일 중 `game/systems/render.ts`의 `ART` 표에 있는 것만 불러온다. **그림 파일을 넣으면 manifest에 경로를 한 줄 추가**해야 자동 교체된다. 적히지 않은 파일은 요청하지 않으므로 콘솔 404가 나지 않고, 텍스처가 없으면 `addBg`와 공작소 인물이 플레이스홀더로 남는다. 지금 연결된 키: 배경 5장(`workshop_bg`, `room_<atom|table|molecule|ion>_bg`), 인물 `npc_apprentice`·`npc_doctor`(WorkshopScene). 표정 2장·장치(fx_*)는 쓰는 코드가 아직 없어 `ART`에 넣고 씬에서 연결해야 한다.
- React 오버레이(방 4개)의 입자·타일·카드는 CSS로 그린다. 그림으로 바꾸려면 해당 오버레이의 공 컴포넌트(`Ball`, `AtomBall`, `Electron`, `Tile`)에서 `<img>`로 바꾸는 코드 수정이 필요하다. 입자는 **CSS 우선**(스펙 10장 "SVG 코드 우선")이므로 교체는 선택 사항.

### 화풍 머리말 (모든 요청 앞에)

> 중학생 대상 과학 교육 게임 그림. 밝고 따뜻한 2D 일러스트, 굵은 외곽선 없는 부드러운 셀 셰이딩, 살짝 위에서 내려다본 사선 시점(3/4 view), 부드러운 그림자로 입체감. 채도는 중간, 파스텔보다 조금 진함. 글자·숫자·로고·워터마크 절대 넣지 않음. 현미경 속 작은 세계의 공방이라는 설정.

## 1. 배경 (1280×800 표시 → 1600×1000 WebP)

| 파일 | 텍스처 키 | 쓰는 곳 | 프롬프트 초안 |
|---|---|---|---|
| `public/assets/bg/workshop.webp` | `workshop_bg` | WorkshopScene (타이틀·인트로·주문판·결과·퀴즈) | 입자 공작소 내부. 가운데 위쪽 벽에 **빈** 코르크 주문판(1240×480 영역, 나무 틀, 네 모서리 못, 종이 없음), 아래쪽 앞에 나무 작업대 띠(높이 약 80px). 좌하단·우하단은 인물이 설 자리로 비워 둔다. 벽에는 원자 모형 공, 유리 플라스크, 작은 주기율표 포스터(글자 없는 칸만). 가로 16:10. |
| `public/assets/bg/room_atom.webp` | `room_atom_bg` | 원자 조립기 | 어두운 청록 실험실. 화면 가운데에 둥근 받침대(지름 약 400px 영역은 비워 둠 — 원자핵·전자 궤도가 올라감), 왼쪽에 입자 상자를 둘 선반, 오른쪽에 큰 버튼이 놓일 금속 패널. 가운데는 복잡하지 않게. |
| `public/assets/bg/room_table.webp` | `room_table_bg` | 주기율표 광장 | 광장 바닥에 18열×4행 격자 판이 새겨진 돌바닥(칸은 비어 있고 글자 없음, 화면 위 절반 폭 1120px). 아래 가운데에 카드 받침대, 왼쪽 아래에 물통 놓을 자리, 오른쪽 아래에 풍선이 뜰 여백. |
| `public/assets/bg/room_molecule.webp` | `room_molecule_bg` | 분자 조립소 | 나무 작업대 윗면이 화면 왼쪽 2/3(760×430)를 차지하는 사선 시점 공방. 작업대 아래 가운데에 원자 공 상자(나무 상자, 뚜껑 열림), 오른쪽 여백에 건전지와 물컵이 놓일 자리. |
| `public/assets/bg/room_ion.webp` | `room_ion_bg` | 이온 공방 | 보라·남색 톤 실험실. 가운데 원형 받침(지름 480px 영역 비움), 왼쪽 전자 상자 선반, 오른쪽 위 이온식 표시판(빈 검은 판). 격자 배열 장면에도 쓰이므로 가운데는 단순하게. |

※ RoomScene은 현재 방 종류로 키(`room_<room>_bg`)를 고르고, 방이 바뀌면 배경만 갈아 끼운다 (갈림길은 방금 끝낸 분자 방 배경).

## 2. 인물 (격자 시트 1장: 3열×2행, 칸 512×512 → 표시 높이 180px, 360px WebP)

| 칸 | 파일 | 텍스처 키 |
|---|---|---|
| 1 | `public/assets/npc/apprentice.webp` | `npc_apprentice` — 견습 공작사 정면 (물질 분리 공방 견습생 그림이 먼저 생기면 그것을 재사용하고 이 칸은 생략) |
| 2 | `public/assets/npc/apprentice_happy.webp` | `npc_apprentice_happy` — 기쁜 표정 |
| 3 | `public/assets/npc/apprentice_think.webp` | `npc_apprentice_think` — 고민하는 표정 |
| 4 | `public/assets/npc/doctor.webp` | `npc_doctor` — 입자 박사 |
| 5~6 | `-` | 비움 |

- 시트 원본: `docs/assets-source/npc/sheet.png` → `python3 scripts/slice_sheet.py docs/assets-source/npc/sheet.png 3 2 public/assets/npc 360 apprentice apprentice_happy apprentice_think doctor - -`
- 프롬프트: "3열 2행 격자 캐릭터 시트, 흰 배경, 칸마다 전신 1명, 발끝이 칸 아래쪽에 닿게. 1~3칸: 같은 견습 공작사(중학생 나이, 짧은 앞치마, 보호 안경을 이마에 올림) 정면·기쁜 표정·턱을 괴고 고민하는 표정. 4칸: 입자 박사(흰 실험복, 둥근 안경, 흰 수염, 손에 작은 원자 모형). 5~6칸 비움."
- 대사창 초상(DialogBox의 96px 원)에도 같은 그림을 쓸 수 있다 (코드 수정 필요).

## 3. 입자·아이템 (격자 시트, 칸 256×256 → 표시 56px, 112px WebP)

CSS로 이미 입체 공(그라데이션+그림자)이 있어 **선택 사항**. 교체한다면 색을 지금 CSS와 맞춘다.

| 시트 | 칸 (이름) | 색 기준 |
|---|---|---|
| `docs/assets-source/items/particles.png` 4열×2행 | `proton` `neutron` `electron` `atom_H` `atom_C` `atom_N` `atom_O` `atom_Cl` | 양성자 빨강(+ 표시는 코드가 얹음), 중성자 회색, 전자 파랑, H 흰색·C 검정·N 파랑·O 빨강·Cl 초록 (분자 모형 관례) |
| `docs/assets-source/items/lattice.png` 2열×1행 | `tile_na` `tile_cl` | Na⁺ 주황, Cl⁻ 초록 (격자 타일, 이온식 글자는 코드가 얹음) |

- 프롬프트: "4열 2행 격자, 흰 배경, 칸마다 반짝이는 매끈한 구슬 하나(위 왼쪽 하이라이트, 아래 부드러운 그림자). 1 빨강 2 회색 3 파랑 4 흰색 5 거의 검정 6 파랑 7 빨강 8 초록. 글자·기호 넣지 않음."
- 출력: `public/assets/items/<이름>.webp`. 원소 카드 20장은 **그림 없이 코드**(ParticleCardView)로 그린다 — 글자가 핵심이라 그림으로 만들지 않는다.

## 4. 장치 (SVG/Phaser 도형 우선, 필요 시 그림)

| 장치 | 지금 | 교체 시 파일·키 | 프롬프트 초안 |
|---|---|---|---|
| 주기율표 판 | React 칸(1~20 밝게) | 교체 안 함 (칸 좌표가 판정과 직결) | — |
| 작업대 | CSS 사선 판 | 배경 `room_molecule_bg`에 포함 | — |
| 물통(1족 연출) | Phaser 도형 | `public/assets/fx/bucket.webp` / `fx_bucket` (표시 150×110 → 300×220) | "물이 담긴 유리 물통, 사선 시점, 흰 배경, 글자 없음" |
| 풍선(18족 연출) | Phaser 타원 | `public/assets/fx/balloon.webp` / `fx_balloon` (90×110 → 180×220), 색은 코드에서 tint | "흰색 고무풍선 하나와 끈, 흰 배경(색은 나중에 입힘)" |
| 건전지·컵(물 분해) | Phaser 도형 | `public/assets/fx/battery.webp` / `fx_battery` (96×46 → 192×92), `public/assets/fx/cup.webp` / `fx_cup` (170×130 → 340×260) | "원통형 건전지 옆모습, (+)(-) 단자만, 글자 없음" / "물이 든 비커, 전극 두 개 꽂힘, 사선 시점" |
| 반짝임 | CSS 파티클 | 교체 안 함 | — |

## 5. 체크리스트

- [x] 공작소 배경 먼저 생성 → 이후 요청에 참고 그림으로 첨부 (2026-09-30)
- [x] 방 배경 4장 + RoomScene 방별 키 연결 (주기율표 광장은 표가 석판 밖으로 나와 1회 재생성)
- [x] 인물 시트 (견습생 3표정 + 박사, `npc/`) — 물질 분리 공방 그림은 쓰지 않고 새로 만듦
- [x] BootScene `preload()` 추가 (manifest 방식)
- [x] 그림을 넣은 뒤 manifest에 경로 추가, 1280×800에서 글자·버튼과 겹치지 않는지 확인 (Phaser 쪽)
- [x] 입자·타일 시트(`items/`), 장치 그림(`fx/`) 생성·Phaser 연동 (물통·금속·풍선·건전지·비커)
- [x] UI 키트(카드·자물쇠·도장·칸 타일·문·손잡이·버튼·패널·별·화살표·리본·트레이) 생성 (`ui/`) — **오버레이 코드 교체는 미완료(2단계)**
- [ ] React 오버레이(입자 구·카드·문·칸 타일·버튼·패널)를 그림으로 교체 — 요소별 파일·크기는 `docs/assets-source/INVENTORY.md`

※ 위 3·4장의 "선택 사항"·"CSS 우선" 방침은 2026-09-30 사용자 지시("벡터는 텍스트만 남기고 나머지는 이미지로 대체")로 대체됐다. 장치·입자·UI도 그림으로 만든다.

## 견습생 선택 (2026-10-01)
시작 화면에서 견습생 3명 중 고른다(`game/characters.ts`). 3명 모두 codex로 **처음부터 투명 배경**(`gen_image.sh`에서 "REAL TRANSPARENT background" 요청)으로 새로 그려 교체했다. 원본 시트: `docs/assets-source/npc/{girl1,boy,girl2}_transparent.png` → `slice_sheet.py <시트> 3 1 public/assets/npc 360 <이름 3개>`. 흰 배경으로 받아 지우면 경계가 깎이고 내부 흰 얼룩이 남으므로 앞으로 인물·아이템도 투명 배경으로 요청한다.
