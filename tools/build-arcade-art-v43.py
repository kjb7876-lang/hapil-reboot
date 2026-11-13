#!/usr/bin/env python3
"""v43 원큐 여정용 경량 그림 묶음을 원화에서 만든다. 원화는 고치지 않는다.
배정표: tools/arcade-art-v43/*.json (base.json + 부별 p1~p8.json). 형식:
  {"actors":{키:{...}}, "mobs":{...}, "props":{...}, "rewards":{...}, "bgs":{...}}
  그림 항목: {"src": 원화 경로, "cell":[열,행,열수,행수](시트의 한 칸), "box":[x,y,w,h](픽셀로 자르기), "flip":true, "size":긴 변}
  움직이는 그림: 위 항목에 "strip":칸수 를 더하면 src(자른 뒤)가 가로로 칸수만큼 이어진 시트라는 뜻이고,
               "frames":[그림 항목, …] 을 주면 낱장 여러 개를 차례로 잇는다. "fps":초당 장수(기본 6).
               결과는 가로로 이어 붙인 한 장이고 manifest에 frames·cell·fps가 적힌다(화면 쪽이 돌려 가며 그린다).
  동작 그림: 인물·몹 항목에 "motions":{"side":{그림 항목},"attack":{…}} → <키>@side.webp (옆 걷기는 오른쪽을 보게, 필요하면 "flip":true).
  옆모습 그림: "facing":"right" 를 적으면 화면 쪽이 가는 방향에 맞춰 좌우를 뒤집는다.
  아이템: "items":{"heart":{…}} → heart.webp.
  배경 항목: {"src": 원화 경로, "focus":[0~1,0~1](자를 때 중심, 기본 0.5,0.5)}
결과: media/arcade-v43/<키>.webp, bg-<키>.jpg, reward-<키>.webp, manifest.json(원본 경로·해시).
실행: python3 tools/build-arcade-art-v43.py  (저장소 루트에서). 문제가 있으면 목록을 찍고 1로 끝난다."""
import glob, hashlib, json, os, sys
from PIL import Image

OUT = 'media/arcade-v43'
LONG = {'actors': 260, 'mobs': 150, 'props': 200, 'rewards': 96, 'items': 72}
LIMIT = {'actors': 90000, 'mobs': 90000, 'props': 90000, 'rewards': 40000, 'bgs': 130000, 'items': 40000}

def sha(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()

def cut(spec):
    im = Image.open(spec['src']).convert('RGBA')
    if 'cell' in spec:
        c, r, cols, rows = spec['cell']
        w, h = im.width // cols, im.height // rows
        im = im.crop((c * w, r * h, c * w + w, r * h + h))
    if 'box' in spec:
        x, y, w, h = spec['box']
        im = im.crop((x, y, x + w, y + h))
    box = im.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
    if not box:
        raise ValueError('empty picture')
    im = im.crop(box)
    if spec.get('flip'):
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    return im

def raw(spec):
    im = Image.open(spec['src']).convert('RGBA')
    if 'cell' in spec:
        c, r, cols, rows = spec['cell']
        w, h = im.width // cols, im.height // rows
        im = im.crop((c * w, r * h, c * w + w, r * h + h))
    if 'box' in spec:
        x, y, w, h = spec['box']
        im = im.crop((x, y, x + w, y + h))
    return im

def frames_of(spec):
    """움직이는 그림의 칸들. 모든 칸을 같은 테두리로 잘라 흔들리지 않게 한다."""
    if 'frames' in spec:
        cells = [raw(f) for f in spec['frames']]
        w, h = max(c.width for c in cells), max(c.height for c in cells)
        same = []
        for c in cells:  # 크기가 다른 낱장은 아래 가운데에 맞춘다
            base = Image.new('RGBA', (w, h), (0, 0, 0, 0)); base.paste(c, ((w - c.width) // 2, h - c.height)); same.append(base)
        cells = same
    else:
        sheet, n = raw(spec), spec['strip']
        w = sheet.width // n
        cells = [sheet.crop((i * w, 0, i * w + w, sheet.height)) for i in range(n)]
    union = None
    for c in cells:
        b = c.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
        if b: union = b if union is None else (min(union[0], b[0]), min(union[1], b[1]), max(union[2], b[2]), max(union[3], b[3]))
    if union is None: raise ValueError('empty picture')
    cells = [c.crop(union) for c in cells]
    if spec.get('flip'): cells = [c.transpose(Image.FLIP_LEFT_RIGHT) for c in cells]
    return cells

def main():
    os.makedirs(OUT, exist_ok=True)
    manifest, problems, seen = {}, [], {}
    try: old = json.load(open(f'{OUT}/manifest.json'))
    except Exception: old = {}
    for path in sorted(glob.glob('tools/arcade-art-v43/*.json')):
        table = json.load(open(path))
        for group, entries in table.items():
            if group not in LIMIT:
                problems.append(f'{path}: unknown group {group}'); continue
            todo = []
            for key, spec in entries.items():
                todo.append((key, spec))
                # 동작 그림: "motions": {"side": {그림 항목}, "attack": {…}} → <키>@side.webp. 크기는 본 그림을 따른다.
                for mname, mspec in (spec.get('motions') or {}).items():
                    extra_spec = dict(mspec); extra_spec.setdefault('size', spec.get('size', LONG.get(group, 150)))
                    todo.append((key + '@' + mname, extra_spec))
            for key, spec in todo:
                name = ('bg-' + key + '.jpg') if group == 'bgs' else ('reward-' + key + '.webp') if group == 'rewards' else key + '.webp'
                if name in seen:
                    problems.append(f'{path}: {name} already given by {seen[name]}'); continue
                seen[name] = path
                out = f'{OUT}/{name}'
                try:
                    if not os.path.exists(spec['src']):
                        raise ValueError('missing source ' + spec['src'])
                    # 원화와 항목이 그대로면 다시 만들지 않는다(전체를 다시 만들려면 FORCE=1).
                    stamp = hashlib.sha256((json.dumps({k: v for k, v in spec.items() if k != 'motions'}, sort_keys=True) + ''.join(sha(f['src']) for f in spec.get('frames', [])) + sha(spec['src'])).encode()).hexdigest()[:16]
                    was = old.get(name)
                    if was and was.get('stamp') == stamp and os.path.exists(out) and os.path.getsize(out) == was.get('bytes') and not os.environ.get('FORCE'):
                        manifest[name] = dict(was)
                        if spec.get('motions'): manifest[name]['motions'] = sorted(spec['motions'])
                        else: manifest[name].pop('motions', None)
                        continue
                    if group == 'bgs':
                        im = Image.open(spec['src']).convert('RGB')
                        scale = max(480 / im.width, 800 / im.height)
                        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
                        fx, fy = spec.get('focus', [.5, .5])
                        left, top = round((im.width - 480) * fx), round((im.height - 800) * fy)
                        im = im.crop((left, top, left + 480, top + 800))
                        quality = 58
                        while True:
                            im.save(out, quality=quality, optimize=True)
                            if os.path.getsize(out) < LIMIT[group] or quality <= 30: break
                            quality -= 6
                    else:
                        long = spec.get('size', LONG[group])
                        extra = {}
                        if 'strip' in spec or 'frames' in spec:
                            cells = frames_of(spec)
                            for c in cells: c.thumbnail((long, long), Image.LANCZOS)
                            cw, ch = cells[0].size
                            im = Image.new('RGBA', (cw * len(cells), ch), (0, 0, 0, 0))
                            for i, c in enumerate(cells): im.paste(c, (i * cw, 0))
                            extra = {'frames': len(cells), 'cell': [cw, ch], 'fps': spec.get('fps', 6)}
                        else:
                            im = cut(spec)
                            im.thumbnail((long, long), Image.LANCZOS)
                        quality = 84
                        while True:
                            im.save(out, quality=quality, method=6)
                            if os.path.getsize(out) < LIMIT[group] or quality <= 40: break
                            quality -= 8
                    if os.path.getsize(out) >= LIMIT[group]:
                        problems.append(f'{name}: {os.path.getsize(out)} bytes is over {LIMIT[group]}')
                    manifest[name] = {'group': group, 'source': spec['src'], 'sourceSha256': sha(spec['src']), 'size': list(im.size), 'bytes': os.path.getsize(out), 'table': path, 'stamp': stamp}
                    if group != 'bgs': manifest[name].update(extra)
                    if spec.get('motions'): manifest[name]['motions'] = sorted(spec['motions'])
                    if spec.get('facing'): manifest[name]['facing'] = spec['facing']  # 옆모습 그림이 보는 쪽(화면 쪽이 가는 방향에 맞춰 뒤집는다)
                except Exception as e:
                    problems.append(f'{path}: {key}: {e}')
    for f in os.listdir(OUT):
        if f != 'manifest.json' and f not in manifest:
            os.remove(f'{OUT}/{f}')
    json.dump(manifest, open(f'{OUT}/manifest.json', 'w'), indent=1, ensure_ascii=False, sort_keys=True)
    print(len(manifest), 'pictures,', sum(v['bytes'] for v in manifest.values()), 'bytes')
    for p in problems: print('PROBLEM', p)
    sys.exit(1 if problems else 0)

if __name__ == '__main__':
    main()
