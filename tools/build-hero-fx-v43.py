#!/usr/bin/env python3
"""기억사수(세로판 영웅) 성장형 공격·필살기 이펙트 시트를 m0 원본(Dots 제작, 사용자 승인)에서 만든다.
원본은 읽기만 하고, 줄인 원색판(?ink=0 화면)과 수묵판(기본 화면)을 media/arcade-v43-hero/ 에 쓴다.
수묵판: 빛의 밝기를 먹의 짙기로 바꾼다(밝은 빛줄기 = 짙은 농묵, 옅은 번짐 = 담묵), 빛 한가운데 가장 흰 곳은 한지색 비백으로 남긴다.
색은 먹 농담만 쓴다(인주색은 하트·붉은 탄·경고 전용). 사용법: python3 tools/build-hero-fx-v43.py [m0 경로]"""
import sys, os, json, hashlib, random
from PIL import Image, ImageFilter
M0 = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/m0'
SRC = os.path.join(M0, 'r96/runtime-text/assets')
OUT = os.path.join(os.path.dirname(__file__), '..', 'media', 'arcade-v43-hero')
INK = (30, 26, 24); PAPER = (242, 233, 214)
# 이름: (원본 경로, 원본 칸 수, 원본 칸 크기, 새 칸 크기, 쓰임)
SHEETS = {
  'shard':  ('r912/pj04-fly.webp', 8, 256, 96, '기억 결정탄(3단계 이상 주포·유도탄) — Dots CX-0084PJ 기억사수 기본탄 비행'),
  'shatter':('r912/pj04-hit.webp', 6, 256, 128, '결정탄 적중·필살기 파편 — Dots CX-0084PJ 기억사수 기본탄 적중'),
  'bolt':   ('r292/fx/gunner/e.webp', 8, 384, 192, '기억 번개(5단계 이상 추격 번개·필살기 4단계 이상) — Dots 07_gunner_E 팬텀 블링크'),
  'burst':  ('r292/fx/gunner/r.webp', 12, 384, 192, '필살기 본 폭발 — Dots 07_gunner_R 궁극기'),
}
LIGHT = {'shard': .55}  # 영웅 탄은 적 탄(짙은 먹 방울)보다 한 단계 옅게(심사 1차: 탄막을 가렸다)
def ink_pixel(r, g, b, a, rnd, light=1.0):
    if a == 0: return (0, 0, 0, 0)
    lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    sat = (max(r, g, b) - min(r, g, b)) / 255
    k = min(1.0, lum * 1.35 + sat * .25)  # 빛의 세기
    alpha = a / 255 * min(1.0, k ** .75 * 1.25)
    if alpha < .03: return (0, 0, 0, 0)
    # 세기에 따라 담묵(옅은 회색) → 농묵(짙은 먹)
    t = min(1.0, k ** .9 * 1.1)
    tone = .78 - .68 * t * light
    if lum > .9:  # 빛 한가운데는 물기 많은 옅은 먹(흰 점 잡음 없이 매끈하게, 심사 1차)
        tone = max(tone, .5 + .3 * (lum - .9) / .1)
    c = tuple(int(INK[i] + (PAPER[i] - INK[i]) * tone) for i in range(3))
    return c + (int(alpha * 255),)
def unspoke(im, n, cell):
    """+× 여덟 살이 십자로 읽히지 않게, 22.5° 돌린 사본을 겹쳐 열여섯 갈래 국화꽃 같은 터짐으로 만든다(살 사이도 먹으로 메운다)."""
    for f in range(n):
        box = (f * cell, 0, f * cell + cell, cell); fr = im.crop(box)
        r = fr.rotate(22.5, resample=Image.BICUBIC, center=(cell / 2, cell / 2))
        a = r.split()[3].point(lambda v: int(v * .8)); r.putalpha(a)
        out = Image.new('RGBA', fr.size); out.alpha_composite(r); out.alpha_composite(fr)
        im.paste(out, box)
def build(name, spec):
    path, n, cell, new, use = spec
    src = Image.open(os.path.join(SRC, path)).convert('RGBA')
    assert src.size == (n * cell, cell), (path, src.size)
    small = src.resize((n * new, new), Image.LANCZOS)
    small.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=88, method=6)
    rnd = random.Random(20261116)
    ink = Image.new('RGBA', small.size)
    px = small.load(); q = ink.load()
    for y in range(small.size[1]):
        for x in range(small.size[0]):
            q[x, y] = ink_pixel(*px[x, y], rnd, LIGHT.get(name, 1.0))
    if name == 'burst':  # 폭발 가운데 +× 방사 살이 십자처럼 읽힌다(심사 1차) → 45° 배수 방향의 곧은 살을 칸마다 지운다
        unspoke(ink, n, new); unspoke(small, n, new)
    # 먹 번짐: 살짝 흐린 사본을 아래에 깔아 가장자리가 한지에 스민 것처럼
    soft = ink.filter(ImageFilter.GaussianBlur(new / 64))
    sa = soft.split()[3].point(lambda v: int(v * .55))
    soft.putalpha(sa)
    base = Image.new('RGBA', small.size); base.alpha_composite(soft); base.alpha_composite(ink)
    base.save(os.path.join(OUT, name + '-ink.webp'), 'WEBP', quality=88, method=6)
    sha = hashlib.sha256(open(os.path.join(SRC, path), 'rb').read()).hexdigest()
    return {'frames': n, 'cell': new, 'source': 'm0 r96/runtime-text/assets/' + path, 'sourceSha256': sha, 'use': use}
if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    index = {k: build(k, v) for k, v in SHEETS.items()}
    json.dump(index, open(os.path.join(OUT, 'index.json'), 'w'), ensure_ascii=False, indent=1)
    print(json.dumps(index, ensure_ascii=False, indent=1))

# ── 필살기 컷씬 초상(사용자 11-16 "필살기사용시 영웅 짧은컷씬도 간지나게", "수묵화풍") ──
# 원천: m0 r96/runtime-text/assets/r108/heroes/gunner.webp(기억사수 초상, 384×512, 어두운 밤하늘 바탕).
# 수묵판: 밝기를 먹 농담 다섯 단으로 묶고(흰 후드는 한지 여백, 갑옷은 농묵), 어두운 바탕은 인물 둘레의 먹 번짐이 되도록
# 고르지 않은 붓 테두리 가면으로 바깥을 비운다. 원색판(?ink=0)은 같은 가면만 씌운다.
def build_cutin():
    import math
    src = os.path.join(SRC, 'r108/heroes/gunner.webp')
    im = Image.open(src).convert('RGB'); w, h = im.size
    rnd = random.Random(1116)
    # 가면: 인물 중심 타원 + 저주파 잡음으로 둘레를 붓처럼 들쭉날쭉하게
    grid = [[rnd.random() for _ in range(9)] for _ in range(12)]
    def noise(x, y):
        gx, gy = x / w * 8, y / h * 11; x0, y0 = int(gx), int(gy); tx, ty = gx - x0, gy - y0
        a = grid[y0][x0] * (1 - tx) + grid[y0][x0 + 1] * tx; b = grid[y0 + 1][x0] * (1 - tx) + grid[y0 + 1][x0 + 1] * tx
        return a * (1 - ty) + b * ty
    mask = Image.new('L', (w, h)); mp = mask.load()
    for y in range(h):
        for x in range(w):
            dx, dy = (x - w * .5) / (w * .5), (y - h * .47) / (h * .55)
            d = math.sqrt(dx * dx + dy * dy) + (noise(x, y) - .5) * .3
            mp[x, y] = int(255 * max(0, min(1, (1.0 - d) / .22)))
    mask = mask.filter(ImageFilter.GaussianBlur(3))
    col = im.copy().convert('RGBA'); col.putalpha(mask)
    col.save(os.path.join(OUT, 'cutin.webp'), 'WEBP', quality=86, method=6)
    ink = Image.new('RGBA', (w, h)); px = im.load(); pxs = im.filter(ImageFilter.MedianFilter(3)).load(); q = ink.load(); m = mask.load()
    for y in range(h):
        for x in range(w):
            r, g, b = pxs[x, y]; v = (0.299 * r + 0.587 * g + 0.114 * b) / 255
            v = min(1, v * 1.25); v = v * v * (3 - 2 * v)
            qb = v * 5; qf = int(qb); qr = qb - qf; qr = 0 if qr < .3 else 1 if qr > .7 else (qr - .3) / .4; v = (qf + qr) / 5  # 다섯 단 농담
            tone = .06 + .94 * v
            if tone > .8 and rnd.random() < .08: tone = 1.0  # 비백
            c = tuple(int(INK[i] + (PAPER[i] - INK[i]) * tone) for i in range(3))
            a = m[x, y] / 255
            a *= 1 - max(0, tone - .86) / .14 * .85  # 가장 밝은 곳(흰 후드)은 한지가 비쳐 보이게 옅게
            q[x, y] = c + (int(255 * a),)
    # 윤곽 붓선: 밝은 면과 어두운 면의 경계를 먹으로 한 겹
    edge = im.convert('L').filter(ImageFilter.GaussianBlur(1.6)).filter(ImageFilter.FIND_EDGES).point(lambda v: 255 if v > 22 else 0).filter(ImageFilter.GaussianBlur(.6))
    ep = edge.load()
    for y in range(h):
        for x in range(w):
            e = ep[x, y] / 255 * m[x, y] / 255
            if e > .05:
                p = q[x, y]; k = .75 * e; q[x, y] = tuple(int(p[i] * (1 - k) + INK[i] * k) for i in range(3)) + (max(p[3], int(255 * e * .9)),)
    ink.save(os.path.join(OUT, 'cutin-ink.webp'), 'WEBP', quality=86, method=6)
    return {'size': [w, h], 'source': 'm0 r96/runtime-text/assets/r108/heroes/gunner.webp', 'sourceSha256': hashlib.sha256(open(src, 'rb').read()).hexdigest(), 'use': '필살기 컷씬 초상(기억사수)'}
if __name__ == '__main__':
    idx = json.load(open(os.path.join(OUT, 'index.json')))
    idx['cutin'] = build_cutin()
    json.dump(idx, open(os.path.join(OUT, 'index.json'), 'w'), ensure_ascii=False, indent=1)
