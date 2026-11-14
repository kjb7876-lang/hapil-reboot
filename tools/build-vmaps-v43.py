#!/usr/bin/env python3
"""세로 스크롤 맵(드라이브 'A01_장면01_….png' 묶음, 제미나이로 만든 세로 배경)을 게임 배경으로 만든다. 원화는 고치지 않는다.
입력: 원화 폴더(인자 1, 드라이브에서 받은 A01.png …), docs/v43/vmaps.json (접두어 → 드라이브 id·제목·장면)
처리: 1) 오른쪽 아래 제미나이 반짝이 워터마크를 바로 위 무늬로 덮는다(가장자리를 흐리게 섞음).
      2) 위아래가 이어지게 한다: 아래쪽 띠를 위쪽 띠에 서서히 섞어 붙이고 그만큼 잘라 낸다.
         잘라 낸 그림을 위아래로 이어 붙이면 이음매 없이 끝없이 흐른다.
      3) 폭 WIDTH로 줄여 jpg로 저장(용량 LIMIT 이하).
결과: media/arcade-v43/bg-loop-<장면>.jpg, 그리고 manifest.json에 항목(loop:true, 원본 sha) 추가.
실행: python3 -I tools/build-vmaps-v43.py <원화 폴더>  (저장소 루트에서)"""
import hashlib, io, json, os, sys
from PIL import Image, ImageDraw, ImageFilter

OUT = 'media/arcade-v43'
WIDTH, LIMIT, BAND = 480, 130000, .2

def sha(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()

def unmark(im):
    """제미나이 반짝이(오른쪽 아래, 768x1376 기준 중심 (w-120, h-121), 지름 약 50px)를 위쪽 무늬로 덮는다."""
    w, h = im.size
    s = w / 768
    cx, cy, r = round(w - 120 * s), round(h - 121 * s), round(34 * s)
    lift = round(r * 2.4)
    patch = im.crop((cx - r - 12, cy - r - 12 - lift, cx + r + 12, cy + r + 12 - lift))
    mask = Image.new('L', patch.size, 0)
    ImageDraw.Draw(mask).ellipse((12 - 4, 12 - 4, 12 + 2 * r + 4, 12 + 2 * r + 4), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(5))
    out = im.copy()
    out.paste(patch, (cx - r - 12, cy - r - 12), mask)
    return out

def loop(im):
    """위 띠에 아래 띠를 섞어(위 끝 0줄은 아래 띠의 첫 줄과 같다) 아래 띠를 잘라 낸다 → 위아래가 이어진다."""
    w, h = im.size
    b = round(h * BAND)
    # 자르는 줄을 이웃 줄과 가장 비슷한 곳(판자 끝·벽 모서리가 아닌 곳)으로 ±24줄 안에서 고른다.
    g = im.convert('L')
    def jump(y):
        r0, r1 = g.crop((0, y - 1, w, y)), g.crop((0, y, w, y + 1))
        return sum(abs(a - c) for a, c in zip(r0.tobytes(), r1.tobytes()))
    b = min(range(b - 24, b + 25), key=lambda k: jump(h - k))
    top, bottom = im.crop((0, 0, w, b)), im.crop((0, h - b, w, h))
    ramp = Image.linear_gradient('L').resize((w, b))  # 0(위) → 255(아래): 위쪽은 아래 띠, 아래로 갈수록 원래 위쪽
    blended = Image.composite(top, bottom, ramp)
    out = im.crop((0, 0, w, h - b))
    out.paste(blended, (0, 0))
    return out

def shrink(im):
    """줄일 때도 위아래를 이어 둔 채 줄인다(끝줄 위아래에 반대편 줄을 덧대고 줄인 뒤 잘라 냄). 그냥 줄이면 끝줄이 번져 이음매가 생긴다."""
    w, h = im.size
    pad = 32
    tall = Image.new('RGB', (w, h + 2 * pad))
    tall.paste(im.crop((0, h - pad, w, h)), (0, 0)); tall.paste(im, (0, pad)); tall.paste(im.crop((0, 0, w, pad)), (0, h + pad))
    s = WIDTH / w
    out = tall.resize((WIDTH, round((h + 2 * pad) * s)), Image.LANCZOS)
    p, nh = round(pad * s), round(h * s)
    return out.crop((0, p, WIDTH, p + nh))

def save(im, path):
    for q in (86, 82, 78, 74, 70, 66, 62):
        buf = io.BytesIO()
        im.save(buf, 'JPEG', quality=q, optimize=True, progressive=True)
        if buf.tell() <= LIMIT:
            open(path, 'wb').write(buf.getvalue())
            return buf.tell(), q
    raise ValueError('too big: ' + path)

def main():
    src = sys.argv[1]
    table = json.load(open('docs/v43/vmaps.json'))
    manifest_path = os.path.join(OUT, 'manifest.json')
    manifest = json.load(open(manifest_path))
    done, missing = [], []
    for prefix, row in sorted(table['maps'].items()):
        p = os.path.join(src, prefix + '.png')
        if not os.path.exists(p):
            missing.append(prefix)
            continue
        im = Image.open(p).convert('RGB')
        im = loop(unmark(im))
        im = shrink(im)
        h = im.height
        name = 'bg-loop-' + row['scene'] + '.jpg'
        size, q = save(im, os.path.join(OUT, name))
        manifest[name] = {'bytes': size, 'size': [WIDTH, h], 'group': 'bgs', 'loop': True, 'quality': q,
                          'source': 'drive:' + row['driveId'], 'sourceTitle': row['title'], 'sourceSha256': sha(p),
                          'table': 'docs/v43/vmaps.json'}
        done.append(prefix)
    json.dump(manifest, open(manifest_path, 'w'), indent=1, ensure_ascii=False, sort_keys=True)
    print(len(done), 'loop maps;', 'missing:', missing)

if __name__ == '__main__':
    main()
