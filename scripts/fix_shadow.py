#!/usr/bin/env python3
"""
잘라낸 그림의 '밝은 불투명 바닥 그림자'를 진짜 그림자(검정 + 반투명)로 바꾼다.

    python3 scripts/fix_shadow.py <그림.webp> ...   (제자리 덮어쓰기)

slice_sheet.py의 remove_bg는 흰 배경만 지우고, 흰 종이 위에 그려진 옅은 회색 그림자는
불투명한 밝은 색으로 남긴다 → 어두운 방 배경 위에서 흰 얼룩으로 보인다.
투명 영역에서 이어진 '밝고 채도 낮은' 픽셀만 따라가(물체 안쪽의 흰 반사광은 닿지 않음)
밝을수록 옅은 검정 그림자로 바꾼다.
"""
import os
import sys
from collections import deque
from PIL import Image

SAT, LIGHT = int(os.environ.get("SAT", 50)), 150   # max-min <= SAT, min >= LIGHT 인 픽셀만 그림자 후보 (물체 색이 살짝 비친 그림자까지)


def fix(path):
    img = Image.open(path).convert('RGBA')
    w, h = img.size
    px = img.load()
    shadowy = lambda c: c[3] > 0 and max(c[:3]) - min(c[:3]) <= SAT and min(c[:3]) >= LIGHT
    seen = bytearray(w * h)
    q = deque((x, y) for y in range(h) for x in range(w) if px[x, y][3] < 10)
    for x, y in q:
        seen[y * w + x] = 1
    n = 0
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                seen[ny * w + nx] = 1
                c = px[nx, ny]
                if shadowy(c):
                    lum = sum(c[:3]) / 3
                    px[nx, ny] = (0, 0, 0, round(min(200, (255 - lum) * 2.2) * c[3] / 255))
                    n += 1
                    q.append((nx, ny))
    img.save(path, 'WEBP', quality=90, method=6)
    print(f'{path}: {n} px')


if __name__ == '__main__':
    for p in sys.argv[1:]:
        fix(p)
