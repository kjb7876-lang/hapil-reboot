#!/usr/bin/env python3
"""드라이브 보스 레이저·문양 시트(Bnn_…_레이저문양시트.png, 1264x848, 3x2칸, 검은 바탕)를 보스별 작은 그림 묶음으로 굽는다.
쓰는 칸: 1번(직선 레이저) → 레이저 질감 띠, 4번(원형 문양) → 스펠 시작 때 보스 뒤 1초 문양, 6번(섬광) → 스펠 시작 섬광.
2·3·5번 칸(지그재그, 고리, 투사체)은 쓰지 않는다(사용자 결정 11-14: 계속 도는 고리·문양 연출은 넣지 않음).
검은 바탕은 그대로 두고 앱이 'lighter'로 더해 그린다. 오른쪽 아래 반짝이 워터마크가 있는 6번 칸은 가장자리를 잘라 낸다.
사용: python3 tools/build-laser-sheets-v43.py <시트 폴더(Bnn.png)>
배정: B번호 = 엔진 보스 등장 순서(B01 악마화 나무 … B33 아르콘 수문장), 표는 docs/v43/laser-sheets.json."""
import json, sys, os
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'media', 'arcade-v43-laser')
table = json.load(open(os.path.join(ROOT, 'docs', 'v43', 'laser-sheets.json'), encoding='utf-8'))
src = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
index = {}
for b, actor in table['assign'].items():
    path = os.path.join(src, b + '.png')
    if not os.path.exists(path):
        continue
    im = Image.open(path).convert('RGB')
    W, H = im.size; cw, ch = W // 3, H // 2
    # 1번 칸에서 가장 밝은 가로 띠를 찾는다
    cell = im.crop((0, 0, cw, ch)).convert('L')
    rows = [sum(cell.crop((0, y, cw, y + 1)).tobytes()) for y in range(ch)]
    tot = sum(rows) or 1; cy = int(sum(y * r for y, r in enumerate(rows)) / tot)
    band = 110
    top = max(0, min(ch - band, cy - band // 2))
    beam = im.crop((8, top, cw - 8, top + band)).resize((384, 96), Image.LANCZOS)
    emblem = im.crop((20, ch + 20, cw - 20, H - 20)).resize((224, 224), Image.LANCZOS)
    burst = im.crop((2 * cw + 60, ch + 50, W - 110, H - 100)).resize((224, 224), Image.LANCZOS)
    atlas = Image.new('RGB', (448, 320))
    atlas.paste(beam.crop((0, 0, 384, 96)), (0, 0))
    atlas.paste(emblem, (0, 96)); atlas.paste(burst, (224, 96))
    name = actor + '.webp'
    atlas.save(os.path.join(OUT, name), 'WEBP', quality=78, method=6)
    index[actor] = {'file': name, 'sheet': b, 'beam': [0, 0, 384, 96], 'emblem': [0, 96, 224, 224], 'burst': [224, 96, 224, 224]}
json.dump({'note': '보스 레이저 질감·스펠 시작 문양·섬광. tools/build-laser-sheets-v43.py가 만든다.', 'sheets': index},
          open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(index), 'sheets')
