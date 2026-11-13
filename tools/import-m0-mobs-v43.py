#!/usr/bin/env python3
"""m0(StoryWorld) 저장소의 지역별 일반 몹 그림을 꺼내 media/m0-v43/ 에 이동 4칸·공격 4칸 스트립으로 정리한다.
입력: docs/v43/m0-mobs.json (장면별 몹 표), m0 저장소 경로(첫 인자, 기본 ../kjb7876-lang/m0).
출력: media/m0-v43/<몹ID>-move.webp, <몹ID>-attack.webp, index.json(출처·형식).
m0 그림은 모두 오른쪽을 본다. 원본은 고치지 않는다. 실행: python3 tools/import-m0-mobs-v43.py [m0경로]"""
import io, json, os, re, subprocess, sys, hashlib
from PIL import Image
M0 = sys.argv[1] if len(sys.argv) > 1 else '../kjb7876-lang/m0'
A = 'r96/runtime-text/assets/'
OUT = 'media/m0-v43'
CELL = 168
cache = {}
def blob(path):
    if path not in cache:
        r = subprocess.run(['git', '-c', 'gc.auto=0', '-c', 'maintenance.auto=false', '-C', M0, 'show', 'HEAD:' + path], capture_output=True)
        cache[path] = r.stdout if r.returncode == 0 else None
    return cache[path]
def js(path):
    b = blob(path); return json.loads(b) if b else None
def image(path):
    b = blob(path); return Image.open(io.BytesIO(b)).convert('RGBA') if b else None
def cells(im, cw, ch, idx, cols=None):
    cols = cols or im.width // cw
    return [im.crop(((i % cols) * cw, (i // cols) * ch, (i % cols) * cw + cw, (i // cols) * ch + ch)) for i in idx]
def pick4(idx):
    idx = list(idx)
    if len(idx) <= 4: return idx
    step = len(idx) / 4.0
    return [idx[int(k * step)] for k in range(4)]
def strip(frames):
    """같은 테두리로 자르고 CELL 안에 맞춘 가로 스트립."""
    box = None
    for f in frames:
        b = f.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
        if b: box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    if box is None: return None
    frames = [f.crop(box) for f in frames]
    w, h = frames[0].size; k = min(1.0, CELL / max(w, h)); w2, h2 = max(1, round(w * k)), max(1, round(h * k))
    out = Image.new('RGBA', (w2 * len(frames), h2), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        f = f.resize((w2, h2), Image.LANCZOS)
        a = f.getchannel('A').point(lambda v: 0 if v <= 16 else v); f.putalpha(a)
        out.paste(f, (i * w2, 0))
    return out
r380 = {os.path.basename(m['path']): m for m in (js(A + 'r380/mobs/index.json') or {}).get('mobs', [])}
tracks = {}
for d in ('r109', 'r116', 'r198'):
    for t in (js(A + d + '/mobs/index.json') or {}).get('tracks', []):
        tracks.setdefault(t['group'], {})[t['track']] = t
def extract(path):
    """(move 프레임들, attack 프레임들 또는 None, 형식 설명)"""
    base = os.path.basename(path)
    if '/r380/mobs/' in path and base in r380:
        e = r380[base]; im = image(path)
        if im is None: return None
        cw, ch = e['cell']; mv = cells(im, cw, ch, pick4(e.get('move') or [0]), e.get('cols'))
        at = cells(im, cw, ch, pick4(e['attack']), e.get('cols')) if e.get('attack') else None
        if e.get('facing') == 'left': mv = [f.transpose(Image.FLIP_LEFT_RIGHT) for f in mv]; at = at and [f.transpose(Image.FLIP_LEFT_RIGHT) for f in at]
        return mv, at, 'r380 strip'
    if re.search(r'/r(410|290)/mobs/m\d+\.webp$', path):
        im = image(path)
        if im is None: return None
        return cells(im, 256, 320, [0, 2, 4, 6], 4), cells(im, 256, 320, [8, 9, 10, 11], 4), 'r410 sheet'
    m = re.search(r'/(r109|r116|r198)/mobs/(M\d+)-', path)
    if m and m.group(2) in tracks:
        g = tracks[m.group(2)]
        def get(names):
            for n in names:
                t = g.get(n)
                if t:
                    im = image('r96/runtime-text/' + t['path'])
                    if im is not None:
                        n_f = t.get('frames', 4); cw = im.width // n_f
                        return cells(im, cw, im.height, pick4(range(n_f)), n_f)
            return None
        mv = get(['move', 'walk', 'idle', 'hit']); at = get(['attack'])
        return (mv, at, 'r1xx tracks') if mv else None
    return None
def main():
    table = json.load(open('docs/v43/m0-mobs.json'))['scenes']
    os.makedirs(OUT, exist_ok=True); index = {}; skipped = []
    for scene, v in table.items():
        for mob in v.get('mobs', []):
            path = (mob.get('m0ArtPath') or '').split(' ')[0]; mid = mob['m0Id']
            if mid in index or not path or '/r248/' in path: 
                if not path or '/r248/' in path: skipped.append((scene, mid, path or '없음'))
                continue
            try: got = extract(path)
            except Exception as e: got = None; skipped.append((scene, mid, path + ' ' + str(e)[:60])); continue
            if not got: skipped.append((scene, mid, path)); continue
            mv, at, fmt = got; entry = {'name': mob.get('nameNow') or mob['name'], 'map': v['map'], 'source': path, 'format': fmt}
            for tag, fr in (('move', mv), ('attack', at)):
                if not fr: continue
                s = strip(fr)
                if s is None: continue
                f = f'{OUT}/' + re.sub(r'[^A-Za-z0-9_-]+', '_', mid) + f'-{tag}.webp'  # 파일 이름에 ':' 같은 글자를 쓰지 않는다
                s.save(f, quality=84, method=6)
                entry[tag] = {'file': os.path.basename(f), 'frames': len(fr), 'cell': [s.width // len(fr), s.height], 'bytes': os.path.getsize(f)}
            if 'move' in entry: index[mid] = entry
    json.dump({'source': 'kjb7876-lang/m0 ' + subprocess.run(['git', '-C', M0, 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip(), 'facing': 'right', 'mobs': index, 'skipped': skipped}, open(OUT + '/index.json', 'w'), ensure_ascii=False, indent=1)
    print(len(index), 'mobs,', sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT)), 'bytes, skipped', len(skipped))
main()
