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
def ink_pixel(r, g, b, a, rnd):
    if a == 0: return (0, 0, 0, 0)
    lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    sat = (max(r, g, b) - min(r, g, b)) / 255
    k = min(1.0, lum * 1.35 + sat * .25)  # 빛의 세기
    alpha = a / 255 * min(1.0, k ** .75 * 1.25)
    if alpha < .03: return (0, 0, 0, 0)
    # 세기에 따라 담묵(옅은 회색) → 농묵(짙은 먹)
    t = min(1.0, k ** .9 * 1.1)
    tone = .78 - .68 * t
    if lum > .9 and rnd.random() < .55:  # 빛 한가운데: 마른 붓이 남긴 흰 자리(비백)
        tone = .97
    c = tuple(int(INK[i] + (PAPER[i] - INK[i]) * tone) for i in range(3))
    return c + (int(alpha * 255),)
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
            q[x, y] = ink_pixel(*px[x, y], rnd)
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
