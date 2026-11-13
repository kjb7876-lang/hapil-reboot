#!/usr/bin/env python3
"""v43 원큐 여정용 경량 그림 묶음을 원화에서 만든다. 원화는 고치지 않는다.
배정표: tools/arcade-art-v43/*.json (base.json + 부별 p1~p8.json). 형식:
  {"actors":{키:{...}}, "mobs":{...}, "props":{...}, "rewards":{...}, "bgs":{...}}
  그림 항목: {"src": 원화 경로, "cell":[열,행,열수,행수](시트의 한 칸), "box":[x,y,w,h](픽셀로 자르기), "flip":true, "size":긴 변}
  배경 항목: {"src": 원화 경로, "focus":[0~1,0~1](자를 때 중심, 기본 0.5,0.5)}
결과: media/arcade-v43/<키>.webp, bg-<키>.jpg, reward-<키>.webp, manifest.json(원본 경로·해시).
실행: python3 tools/build-arcade-art-v43.py  (저장소 루트에서). 문제가 있으면 목록을 찍고 1로 끝난다."""
import glob, hashlib, json, os, sys
from PIL import Image

OUT = 'media/arcade-v43'
LONG = {'actors': 260, 'mobs': 150, 'props': 200, 'rewards': 96}
LIMIT = {'actors': 90000, 'mobs': 90000, 'props': 90000, 'rewards': 40000, 'bgs': 130000}

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

def main():
    os.makedirs(OUT, exist_ok=True)
    manifest, problems, seen = {}, [], {}
    for path in sorted(glob.glob('tools/arcade-art-v43/*.json')):
        table = json.load(open(path))
        for group, entries in table.items():
            if group not in LIMIT:
                problems.append(f'{path}: unknown group {group}'); continue
            for key, spec in entries.items():
                name = ('bg-' + key + '.jpg') if group == 'bgs' else ('reward-' + key + '.webp') if group == 'rewards' else key + '.webp'
                if name in seen:
                    problems.append(f'{path}: {name} already given by {seen[name]}'); continue
                seen[name] = path
                out = f'{OUT}/{name}'
                try:
                    if not os.path.exists(spec['src']):
                        raise ValueError('missing source ' + spec['src'])
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
                        im = cut(spec)
                        long = spec.get('size', LONG[group])
                        im.thumbnail((long, long), Image.LANCZOS)
                        quality = 84
                        while True:
                            im.save(out, quality=quality, method=6)
                            if os.path.getsize(out) < LIMIT[group] or quality <= 40: break
                            quality -= 8
                    if os.path.getsize(out) >= LIMIT[group]:
                        problems.append(f'{name}: {os.path.getsize(out)} bytes is over {LIMIT[group]}')
                    manifest[name] = {'group': group, 'source': spec['src'], 'sourceSha256': sha(spec['src']), 'size': list(im.size), 'bytes': os.path.getsize(out), 'table': path}
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
