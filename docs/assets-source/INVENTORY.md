# 그림 인벤토리 (벡터 → 이미지 교체용)

1단계(그림 제작·Phaser 연결) 결과. 2단계(React 오버레이의 CSS 도형 교체)는 이 표를 그대로 보고 진행한다.
글자·숫자·기호는 **모두 코드가 얹는다** — 그림은 빈 바탕이다. 진행바(시간 막대)·글자·순수 레이아웃 컨테이너·순간 연출(Burst 파티클, 기체 방울, 반짝임 원, 번쩍임 흰 화면)은 벡터로 남긴다.

- 경로는 `public/assets/` 기준, 코드에서는 `/assets/<경로>`. 표시 크기는 CSS px(무대 1280×800).
- **투명 여백**: 잘라낸 그림의 하단(약 6~10%)에는 부드러운 바닥 그림자가 포함돼 있다(투명 그라데이션). 구·카드·타일은 그림 크기 = 물체 + 그림자이므로, 물체를 표시 크기에 맞추려면 `<img>`를 표시 크기의 약 1.06배로 두고 `object-position: top`/하단 그림자만 겹치게 한다. 코드의 그림자(`blur` 검은 타원)는 **그림 그림자로 대체되므로 제거**한다.
- **그림자 보정(2단계)**: 실제로는 바닥 그림자가 밝은 불투명 픽셀로 남아 있었다 → `python3 scripts/fix_shadow.py <webp...>`로 반투명 검정 그림자로 바꿨다(ui/*, items/slot_socket*·tile_*, fx/nucleus). 구 그림(atom_*·proton·neutron·electron)은 파일 그대로, 오버레이의 `Sphere`가 원으로 잘라 쓴다. 새로 잘라낸 그림에도 적용할 것.
- 시트 원본: `docs/assets-source/<분류>/*.png`, 스타일 머리말 `docs/assets-source/style.txt`, 잘라내기 `scripts/slice_sheet.py`(TIGHT=1은 가로세로 비 유지).
- Phaser 텍스처 키가 있는 것만 `game/systems/render.ts`의 `ART`에 등록됐고 `manifest.json`에 전 파일이 적혀 있다(오버레이용 파일은 Phaser가 무시). 오버레이에서는 `<img src="/assets/...">`(가로세로 비는 아래 "px 크기" 열)로 쓴다.

## A. Phaser (1단계에서 교체 완료, 플레이스홀더 폴백 유지)

| 요소 | 쓰는 곳 | 표시 크기 | 파일 | 키 |
|---|---|---|---|---|
| 공작소 배경(빈 주문판·작업대 포함) | WorkshopScene | 1280×800 | bg/workshop.webp (1600×1000) | workshop_bg |
| 원자 조립기 배경 | RoomScene | 1280×800 | bg/room_atom.webp | room_atom_bg |
| 주기율표 광장 배경(빈 석판 x 24~1255, y 145~472) | RoomScene | 1280×800 | bg/room_table.webp | room_table_bg |
| 분자 조립소 배경(작업대·나무 상자 포함) | RoomScene | 1280×800 | bg/room_molecule.webp | room_molecule_bg |
| 이온 공방 배경(원형 받침·빈 표시판) | RoomScene | 1280×800 | bg/room_ion.webp | room_ion_bg |
| 견습생 | WorkshopScene | 높이 180 | npc/apprentice.webp (360×360) | npc_apprentice |
| 견습생 기쁨 / 고민 | (DialogBox 초상용, 아직 코드 없음) | 96 원 | npc/apprentice_happy.webp, apprentice_think.webp | npc_apprentice_happy / _think |
| 입자 박사 | WorkshopScene | 높이 180 | npc/doctor.webp | npc_doctor |
| 물통(1족) | RoomScene.bucket | 가로 190 | fx/bucket.webp (360×354) | fx_bucket |
| 금속 조각 | RoomScene.bucket | 가로 44 | fx/metal.webp (360×300) | fx_metal |
| 풍선(18족, tint) | RoomScene.balloon | 세로 약 190 | fx/balloon.webp (183×360) | fx_balloon |
| 건전지 | RoomScene.electrolysis | 가로 130 | fx/battery.webp (360×212) | fx_battery |
| 비커+전극 | RoomScene.electrolysis | 가로 190 | fx/cup.webp (300×360) | fx_cup |

## B. React 오버레이 (2단계 대상)

| 요소 | 쓰는 곳 | 지금(벡터) | 표시 크기(px) | 그림 파일 (px 크기) |
|---|---|---|---|---|
| 양성자·중성자·전자 구 | AtomBuilderOverlay `Ball` (트레이 56, 원자핵 안 20, 놓인 전자 40, 드래그 56, 상자 56) | radial-gradient 원 + 검은 그림자 | 20~56 | items/proton.webp, neutron.webp, electron.webp (192×192) — 기호 `+`·`−`는 코드가 얹음 |
| 전자(이온 공방) | IonWorkshopOverlay `Electron` (40/56) | 파란 그라데이션 원 | 40~56 | items/electron.webp |
| 원자핵 구 | AtomBuilderOverlay·IonWorkshopOverlay (지름 180) | 어두운 그라데이션 원 + 그림자 | 180 | fx/nucleus.webp (351×360). 빈 구; 안의 양성자·기호는 코드. |
| 전자 자리 링(20개) | AtomBuilderOverlay (44 점선 원) | border-dashed 원 | 44 | items/slot_socket.webp / slot_socket_lit.webp(강조, 192×192). 정사각 나무 받침 안의 홈이라 원형 링이 필요하면 `slot_socket`을 표시 크기 ~56으로 쓰거나 점선 원 유지(선택). |
| 원자 구 H·C·N·O·Cl | MoleculeBenchOverlay `AtomBall`(56), ClassifyOverlay(48) | 색 그라데이션 원 + 원소 기호 | 48~56 | items/atom_H.webp, atom_C, atom_N, atom_O, atom_Cl (192×192) — 색: 은회색·검정·파랑·빨강·초록. 글자는 코드. |
| 이온 타일 Na⁺·Cl⁻ | IonWorkshopOverlay `Tile`(84) | 색 원 + 이온식 | 84 | items/tile_na.webp(주황), tile_cl.webp(초록) — 납작한 원판(192×192, 가로로 넓은 타원형이라 높이 약 60%). 이온식은 코드. |
| 격자 칸(4×4 빈칸·강조) | IonWorkshopOverlay Lattice (100 칸, 점선 사각) | border-dashed 사각 | 92 | ui/lattice_cell.webp, lattice_cell_lit.webp (184×192) — 안이 빈 나무 홈, 발광 버전 |
| 주기율표 칸 | PeriodicTableOverlay (62×62 칸, 18×4) | 하늘/회색/노랑 div | 58 | ui/cell_bright.webp(원소 있음), cell_empty.webp(원소 없음), cell_hit.webp(정답·빛남), cell_line.webp(같은 행·열 강조) — 각 190×192, 번호·기호는 코드 |
| 원소 카드 앞면 | PeriodicTableOverlay `Card` (120×120) | amber div | 120 | ui/card_front.webp (512×477, 안쪽 빈 호박색) |
| 카드 놀이 카드 뒷면 | ElementCardGameOverlay 기호 카드(60) · 주기율표 보너스 입구(76×104) | indigo div + "?" | 60 / 76×104 | ui/card_back.webp (512×465, 원자 궤도 무늬만 있고 글자 없음). "?"는 코드. |
| 카드 놀이 이름 카드 | ElementCardGameOverlay (104×56) | 하늘색·금색 div | 104×56 | ui/plate_wood.webp(가로 640×154, 이름 카드) 또는 ui/cell_bright/cell_hit(늘려 쓰지 말 것) |
| 카드 놀이 말 | ElementCardGameOverlay (48) | 장미색 원 | 48×72 | ui/game_piece.webp (125×192, 세로형 말 — 아래 그림자 포함, 원 대신 세워 놓음) |
| 주문 카드 종이 / 완료 종이 | OrderBoardOverlay `Card` (216×300) | amber div / 초록 div | 216×300 | ui/order_paper.webp, order_paper_done.webp (382×512 / 376×512, 가로세로 비 0.75, 위 못 구멍 있음) |
| 잠금 자물쇠 | OrderBoardOverlay `Lock` (64×76) | div 조합 | 64×70 | ui/lock.webp (464×512) |
| 완료 도장 | OrderBoardOverlay (rotate -8°) | 초록 border div + "완료" | 약 120×64 | ui/stamp_done.webp (320×172, 안이 투명한 초록 잉크 테두리, 이미 기울어 있음 → 코드 rotate 제거). "완료" 글자는 코드. |
| 주문 수락 자리(점선) | OrderBoardOverlay (360×130 dashed) | border-dashed | — | 벡터 유지 가능(드롭 영역 강조). 선택: ui/panel_glass.webp |
| 화살표(수락·문 손잡이·말 옮기기) | OrderBoardOverlay, ClassifyOverlay, MoleculeBenchOverlay(svg), ElementCardGameOverlay(`↓`) | CSS 삼각형/svg/글자 | 36~60 | ui/arrow_down.webp (225×256; 위쪽/옆 화살표는 `rotate`) |
| 문 | ClassifyOverlay (300×400, `rounded-t-[120px]`) | 갈색 그라데이션 div | 300×338 (그림 비 454:512) | ui/door.webp — 손잡이 없음 |
| 문 안쪽(열린 뒤 어둠 / 정답 빛) | ClassifyOverlay | 남색·노란 그라데이션 | 300×338 | ui/doorway_dark.webp (458×512), ui/doorway_lit.webp (468×512) — 같은 테두리, 안이 다름. door 위에 겹쳐 회전. |
| 문 손잡이 | ClassifyOverlay (72 히트, 44 원) | 원 그라데이션 | 60 | ui/knob.webp (512×472) |
| 큰 버튼 "완성"·"시작"·"돌아가기" | AtomBuilder·IonWorkshop(210×80), TitleOverlay, ElementCard | amber div | 210×80 | ui/button_amber.webp (640×215) — 글자 코드. 비활성은 `grayscale`+opacity. |
| 보조 버튼 "다시 하기" 등 | SummaryOverlay, EndingOverlay | sky/white div | 150×52 | ui/button_sky.webp (640×219), ui/button_navy.webp (640×269, 반투명 남색) |
| 우상단 소리·전체화면 버튼 | TopControls (44×44+) | 검은 반투명 div | 44+ | ui/button_navy.webp 또는 ui/panel_glass.webp(256×251). 글자(소리/전체) 유지. |
| HUD 판·목표 알약 | HUD, 각 방 상단 "만들 원소…"(bg-black/60 rounded-full) | 검은 반투명 div | 가변 | ui/plate_wood.webp (640×154, 늘려 쓰지 말고 9-slice가 필요하면 `border-image`; 없으면 벡터 유지 허용) |
| 대사창 바탕 | DialogBox (1230×170) | bg-black/80 div | 1232×170 | ui/panel_dialog.webp (640×185, 가로세로 비 3.5:1이라 1230 폭으로 늘리면 세로가 늘어난다 → `border-image` 9-slice 또는 `background-size: 100% 100%` 후 육안 확인) |
| 대사창 초상 원 | DialogBox (96 원) | 색 원 | 96 | ui/portrait_frame.webp (255×256, 안이 크림색) 위에 npc 그림 (npc/apprentice*.webp, doctor.webp를 원형 crop) |
| 결과·요약·퀴즈 종이 카드 | ResultOverlay(`ParticleCardView` 260×~250), SummaryOverlay(680×), QuizOverlay(860×) | amber-50 div | 260~860 | ui/panel_paper.webp (640×244) 또는 벡터 유지. 도감 카드 배경은 ui/card_front.webp(호박색)를 바탕으로 쓸 수 있다. |
| 입자·이온·전자 상자(트레이) | AtomBuilder(190×400), IonWorkshop(150×160, 170×300), MoleculeBench 나무 상자 | bg-black/50 div | 150~190 × 160~400 | ui/tray_wood.webp (184×256, 세로형, 안이 비어 있음). MoleculeBench의 나무 상자·작업대 윗면(CSS 갈색 그라데이션)은 **room_molecule 배경에 그려져 있으므로 CSS 삭제**. |
| 작업대(분자 조립소) | MoleculeBenchOverlay (BX 140~900, BY 150~580 갈색 그라데이션) | div | — | bg/room_molecule.webp에 포함(그림의 작업대 윗면은 화면 x 0~1020, y 110~680 정도로 더 넓다 → 작업대 CSS div 제거, 드롭 판정 좌표는 그대로) |
| 별 아이콘 | HUD("별 N" 글자), EndingOverlay("별"), SummaryOverlay | 글자 | 24~40 | ui/star.webp (256×251) — 글자 "별" 앞이나 대신 |
| 새 카드 리본 | ParticleCardView("새 카드" 알약) | rotate-6 amber pill | 96×46 | ui/ribbon.webp (256×123, 글자 없음) + 코드 글자 |
| 도감 패널 | (없음 — HUD 글자) | — | — | 만들지 않음 |
| 반응형 패널 | 위 panel_glass | — | — | ui/panel_glass.webp |

## C. 제작 이력 (codex 호출)
공작소 배경 1, 방 배경 4(+주기율표 재생성 1), 인물 시트 1, 입자·타일·소켓 시트 1, 장치 시트 1, 카드·자물쇠 시트 1, 칸 타일 시트 1, 문 시트 1, UI 넓은 시트 1, UI 작은 시트 1, 도장 1(첫 시트의 도장 칸이 글자 흔적으로 깨져 다시 생성). 총 14회.
- 2026-10-01: fx/nucleus를 회색-남색 구(원본 fx/nucleus2.png)로 교체. Phaser 그림 fix_shadow 적용(doctor·balloon·bucket·cup·metal은 SAT=10, 나머지 기본).
