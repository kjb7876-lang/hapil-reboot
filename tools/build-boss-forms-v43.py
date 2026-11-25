#!/usr/bin/env python3
"""보스 '다른 모습' 그림만 만든다(tools/arcade-art-v43/forms.json → media/arcade-v43/<키>.webp, manifest 항목 추가).
전체 묶음(build-arcade-art-v43.py)을 다시 돌리지 않고 이 표만 만든다: 전체 빌드는 다른 도구가 만든 그림을 지우기 때문이다.
자르기·줄이기 규칙은 build-arcade-art-v43.py의 함수를 그대로 쓴다. 실행: python3 tools/build-boss-forms-v43.py (저장소 루트)."""
import importlib.util, json, os, sys, hashlib
from PIL import Image
spec = importlib.util.spec_from_file_location('art', 'tools/build-arcade-art-v43.py'); art = importlib.util.module_from_spec(spec); spec.loader.exec_module(art)
TABLE = 'tools/arcade-art-v43/forms.json'
OUT = art.OUT
man = json.load(open(f'{OUT}/manifest.json'))
problems = []
todo = []
for key, sp in json.load(open(TABLE))['actors'].items():
    todo.append((key, sp))
    for mname, msp in (sp.get('motions') or {}).items():  # 동작 그림(공격·쓰러짐) → <키>@<동작>.webp, 크기는 본 그림을 따른다
        msp = dict(msp); msp.setdefault('size', sp.get('size', art.LONG['actors'])); todo.append((key + '@' + mname, msp))
for key, sp in todo:
    name = key + '.webp'; out = f'{OUT}/{name}'
    long = sp.get('size', art.LONG['actors']); extra = {}
    if 'strip' in sp:
        cells = art.frames_of(sp)[::sp.get('every', 1)]  # every: 칸을 건너뛰어 용량을 줄인다(8칸 → 4칸)
        for c in cells: c.thumbnail((long, long), Image.LANCZOS)
        cw, ch = cells[0].size
        im = Image.new('RGBA', (cw * len(cells), ch), (0, 0, 0, 0))
        for i, c in enumerate(cells): im.paste(c, (i * cw, 0))
        extra = {'frames': len(cells), 'cell': [cw, ch], 'fps': sp.get('fps', 6)}
    else:
        im = art.cut(sp); im.thumbnail((long, long), Image.LANCZOS)
    q = 84
    while True:
        im.save(out, quality=q, method=6)
        if os.path.getsize(out) < art.LIMIT['actors'] or q <= 40: break
        q -= 8
    if os.path.getsize(out) >= art.LIMIT['actors']: problems.append(f'{name}: {os.path.getsize(out)} bytes')
    stamp = hashlib.sha256((json.dumps({k: v for k, v in sp.items() if k != 'motions'}, sort_keys=True) + art.sha(sp['src'])).encode()).hexdigest()[:16]
    man[name] = {'group': 'actors', 'source': sp['src'], 'sourceSha256': art.sha(sp['src']), 'size': list(im.size), 'bytes': os.path.getsize(out), 'table': TABLE, 'stamp': stamp, **extra}
    if sp.get('motions'): man[name]['motions'] = sorted(sp['motions'])
    print(name, im.size, extra.get('cell'), os.path.getsize(out))
json.dump(man, open(f'{OUT}/manifest.json', 'w'), indent=1, ensure_ascii=False, sort_keys=True)
for p in problems: print('PROBLEM', p)
sys.exit(1 if problems else 0)
