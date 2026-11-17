#!/usr/bin/env python3
"""스토리월드(m0) 최신본의 몹 아래 걷기 시트(4칸)와 시간탑 수문장 떠서 이동 시트(R1029, 8칸)를 가져온다(docs/v43/m0-down.json).
실행: python3 tools/import-m0-down-v43.py <m0 저장소 경로> [git 리비전, 기본 HEAD]
가로 스트립이다. 저장소가 무거워지지 않게 높이 192로 줄여 media/m0-v43/down/<파일> 로 쓴다."""
import io, json, subprocess, sys
from PIL import Image

repo, rev = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else 'HEAD')
table = json.load(open('docs/v43/m0-down.json'))
for mid, row in table['mobs'].items():
    path = row.get('down') or row['float']
    raw = subprocess.run(['git', '-C', repo, 'show', rev + ':r96/runtime-text/assets/' + path], capture_output=True, check=True).stdout
    img = Image.open(io.BytesIO(raw)).convert('RGBA')
    frames = row.get('frames', 4)
    assert img.width % frames == 0, (mid, img.size)
    if img.height > 200: img = img.resize((img.width * 192 // img.height // frames * frames, 192), Image.LANCZOS)
    dst = 'media/m0-v43/down/' + path.split('/')[-1]
    img.save(dst, 'WEBP', quality=88, method=6)
    print(mid, dst, img.size)
