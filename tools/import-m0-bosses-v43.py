#!/usr/bin/env python3
"""m0 보스 공격 자세(r104/bosses/<id>-p1~p4: 준비·내려치기·끝맺음·되돌아옴)를 4칸 스트립으로 가져와 인물의 공격 동작으로 단다.
입력: docs/v43/m0-mobs.json, m0 저장소(기본 /home/claude/kjb7876-lang/m0, 읽기만 한다)
출력: media/m0-v43/boss/<id>-attack.webp + index.json, 그리고 tools/arcade-art-v43/p*.json의 인물 항목에 motions.attack
추가 연결(EXTRA): 드라이브 시트가 없는 같은 인물(루시퍼·벨페고르·맘몬)은 이름으로 직접 단다.
연결: 인물 그림이 드라이브 걷기 시트(bNN-down)이고 m0 표에서 그 드라이브 번호와 이름이 정확히 맞는(exact) 보스일 때만 단다.
실행: python3 tools/import-m0-bosses-v43.py [m0경로]"""
import glob, io, json, os, re, subprocess, sys
from PIL import Image

M0 = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/kjb7876-lang/m0'
OUT = 'media/m0-v43/boss'
CELL = 300
EXTRA = {'p1_seraph': 'a11-boss', 'p2_belphegor': 'b02-boss', 'p2_mammon': 'b06-boss', 'pride': 'b08-boss'}

def blob(path):
    r = subprocess.run(['git', '-c', 'gc.auto=0', '-c', 'maintenance.auto=false', '-C', M0, 'show', 'HEAD:' + path], capture_output=True)
    return r.stdout if r.returncode == 0 and r.stdout else None

os.makedirs(OUT, exist_ok=True)
table = json.load(open('docs/v43/m0-mobs.json'))
by_drive, index = {}, {}
for scene, row in table['scenes'].items():
    for b in row['midboss'] + row['boss']:
        art = b.get('m0ArtPath') or ''
        m = re.search(r'(r96/runtime-text/assets/r104/bosses/[\w-]+)-p1\.webp', art)
        if not m: continue
        cells = []
        for n in (1, 2, 3, 4):
            data = blob(f'{m.group(1)}-p{n}.webp')
            if not data: break
            im = Image.open(io.BytesIO(data)).convert('RGBA')
            a = im.getchannel('A').point(lambda v: 0 if v <= 16 else v); im.putalpha(a)
            cells.append(im)
        if len(cells) < 4: continue
        w, h = max(c.width for c in cells), max(c.height for c in cells)
        scale = CELL / max(w, h)
        cw, ch = round(w * scale), round(h * scale)
        strip = Image.new('RGBA', (cw * 4, ch), (0, 0, 0, 0))
        for i, c in enumerate(cells):
            strip.paste(c.resize((round(c.width * scale), round(c.height * scale)), Image.LANCZOS), (i * cw, 0))
        name = re.sub(r'[^A-Za-z0-9_-]+', '_', b['m0Id']) + '-attack.webp'
        strip.save(f'{OUT}/{name}', quality=82, method=6)
        index[b['m0Id']] = {'name': b['name'], 'scene': scene, 'source': m.group(1) + '-p1~p4.webp', 'file': name, 'frames': 4, 'driveId': b.get('driveId'), 'match': b.get('match')}
        if b.get('driveId') and b.get('match') == 'exact': by_drive.setdefault(b['driveId'].lower(), f'{OUT}/{name}')
json.dump({'source': 'm0 r96/runtime-text/assets/r104/bosses', 'bosses': index}, open(f'{OUT}/index.json', 'w'), ensure_ascii=False, indent=1)
linked, used = [], set()
for path in sorted(glob.glob('tools/arcade-art-v43/[bp]*.json')):
    t = json.load(open(path)); changed = False
    for key, spec in t.get('actors', {}).items():
        m = re.search(r'drive-v43/(b\d+)-down\.webp', spec.get('src', ''))
        src = by_drive.get(m.group(1)) if m else (f"{OUT}/{index[EXTRA[key]]['file']}" if EXTRA.get(key) in index else None)
        if src:
            spec.setdefault('motions', {})['attack'] = {'src': src, 'strip': 4, 'fps': 8, 'size': 220}; used.add(os.path.basename(src))
            linked.append(key); changed = True
    if changed: json.dump(t, open(path, 'w'), indent=1, ensure_ascii=False)
# 쓰지 않는 스트립은 저장소에 남기지 않는다(다시 돌리면 m0에서 다시 가져온다).
for k in [k for k, v in index.items() if v['file'] not in used]:
    os.remove(f"{OUT}/{index[k]['file']}"); index[k]['file'] = None
json.dump({'source': 'm0 r96/runtime-text/assets/r104/bosses', 'bosses': index}, open(f'{OUT}/index.json', 'w'), ensure_ascii=False, indent=1)
print(len(used), 'boss attack strips kept of', len(index), ',', len(linked), 'actors linked:', ' '.join(linked))
