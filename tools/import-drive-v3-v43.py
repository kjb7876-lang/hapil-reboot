#!/usr/bin/env python3
"""드라이브 v3 걷기 세트(CX-0082MV 추가1 v3: m0가 실제로 그리는 그림 기준 위·아래·옆 384칸 4프레임)를 저장소로 가져온다.
입력: 내려받아 푼 세트의 요약 JSON들(인자). 형식 {세트: {mobName, m0Key:[…], down, up, side, status, holdReason, driveIds, zips}}
출력: media/drive-v43/v3-<세트>-down.webp(·-side.webp) 가로 4칸 256px, alpha<=16→0 / media/drive-v43/index.json 의 items에 kind 'mob-v3' 항목(m0Key 포함)
세로 화면은 몹이 아래로 내려오므로 아래 걷기를 기본 그림으로 쓴다. 위 걷기는 가져오지 않는다(쓰는 곳이 없다).
실행: python3 tools/import-drive-v3-v43.py summary-a.json summary-b.json …"""
import json, os, re, sys
from PIL import Image

OUT = 'media/drive-v43'
CELL = 256

def strip4(path):
    im = Image.open(path).convert('RGBA')
    n = 4
    w = im.width // n
    cells = [im.crop((i * w, 0, i * w + w, im.height)) for i in range(n)]
    out = Image.new('RGBA', (CELL * n, CELL), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        a = c.getchannel('A').point(lambda v: 0 if v <= 16 else v); c.putalpha(a)
        c.thumbnail((CELL, CELL), Image.LANCZOS)
        out.paste(c, (i * CELL + (CELL - c.width) // 2, CELL - c.height))
    return out

index = json.load(open(f'{OUT}/index.json'))
items = [i for i in index['items'] if i.get('kind') != 'mob-v3']
done = []
for path in sys.argv[1:]:
    for name, v in sorted(json.load(open(path)).items()):
        if not v.get('down') or not os.path.exists(v['down']):
            print('skip (no down walk):', name); continue
        slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
        keys = v.get('m0Key') or v.get('m0Keys') or []
        keys = [keys] if isinstance(keys, str) else keys
        item = {'id': 'V3-' + slug, 'code': 'CX-0082MV v3', 'name': v.get('mobName'), 'kind': 'mob-v3', 'm0Key': keys,
                'driveFileIds': v.get('driveIds'), 'zip': v.get('zips'), 'hold': True, 'holdReason': v.get('holdReason'), 'status': v.get('status'),
                'frames': 4, 'cell': [CELL, CELL], 'sourceCell': v.get('cell'), 'verdict': 'use',
                'reviewNotes': '세로 화면에서 작게 내려오는 기본 걷기로 사용. 걸음새 HOLD는 그대로 남아 있다.'}
        for tag in ('down', 'side'):
            if v.get(tag) and os.path.exists(v[tag]):
                f = f'v3-{slug}-{tag}.webp'
                try: strip4(v[tag]).save(f'{OUT}/{f}', quality=88, method=6)
                except Exception as e: print('bad', name, tag, e); continue
                item['file' if tag == 'down' else 'sideFile'] = f
        if 'file' in item: items.append(item); done.append(name)
index['items'] = items
json.dump(index, open(f'{OUT}/index.json', 'w'), ensure_ascii=False, indent=1)
print(len(done), 'v3 walk sets imported')
