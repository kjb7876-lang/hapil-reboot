#!/usr/bin/env python3
"""임시 그림(닷츠 CX-0157AW 결과가 오기 전까지): 사몽각성 교주·악몽 군집체.
새 그림을 그리지 않고 같은 인물의 저장소 원화만 다시 짠다(임시본 — 최종 아트가 아니다).
 - 사몽각성 교주: 교주 정면 걷기 4칸(media/boss-art-v43/cultist-down.webp). 옷(흰 예복·붉은 안감)은 그대로 두고 살빛·머리칼만 재빛 검보라로, 머리에 뿔, 등 뒤에 크게 드리운 악마 그림자, 뒤에 검보라 사몽 기운.
 - 악몽 군집체: 악몽의 우두머리 정면 걷기 4칸(media/drive-v43/b50-down.webp)을 여럿 겹쳐 한 덩어리로(뒤쪽은 어둡고 작게).
만든 원본은 media/arcade-v43-temp/*.png → tools/arcade-art-v43/forms.json 이 읽어 media/arcade-v43/<키>.webp 로 줄인다(python3 tools/build-boss-forms-v43.py).
실행: python3 tools/build-awake-temp-v43.py (저장소 루트)"""
import colorsys, math, random
from PIL import Image, ImageFilter, ImageChops, ImageDraw
OUT = 'media/arcade-v43-temp'

def feather(f, top=.16, side=.13, bottom=.04):
    """칸 가장자리를 먹 번짐처럼 녹인다(심사 11-20: 그림자·덩어리 위와 옆에 네모 판 경계가 보임)."""
    w, h = f.size; m = Image.new('L', (w, h), 0); d = ImageDraw.Draw(m)
    d.rounded_rectangle((w * side, h * top, w * (1 - side), h * (1 - bottom)), radius=min(w, h) * .2, fill=255)
    m = m.filter(ImageFilter.GaussianBlur(min(w, h) * .075))
    f.putalpha(ImageChops.multiply(f.getchannel('A'), m)); return f

def cells(path, n):
    im = Image.open(path).convert('RGBA'); w = im.width // n
    return [im.crop((i * w, 0, i * w + w, im.height)) for i in range(n)]

def awake_cell(c, k):
    px = c.load(); w, h = c.size
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0)); o = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if not a: continue
            hh, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255); deg = hh * 360
            skin = 10 <= deg <= 50 and .24 <= s <= .7 and v > .3             # 살빛·뼈빛 갈고리
            hair = s < .14 and .45 < v < .9 and y < h * .3                   # 머리칼(위쪽의 은회색)
            if skin:   hh, s, v = .76, .38, v * .5                           # 재빛 검보라 살
            elif hair: hh, s, v = .78, .30, v * .42
            r2, g2, b2 = colorsys.hsv_to_rgb(hh, s, v)
            o[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    return out

def aura(size, k, color=(92, 38, 150)):
    w, h = size; im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im); rnd = random.Random(61 + k)
    for i in range(26):
        ang = math.pi * (1.05 + .9 * i / 25) + rnd.uniform(-.08, .08); rad = h * (.30 + .16 * rnd.random()) * (1 + .05 * math.sin(k * 1.57 + i))
        x = w / 2 + math.cos(ang) * rad * .9; y = h * .52 + math.sin(ang) * rad; r = h * (.07 + .07 * rnd.random())
        d.ellipse((x - r, y - r, x + r, y + r), fill=color + (int(70 + 60 * rnd.random()),))
    return im.filter(ImageFilter.GaussianBlur(h * .035))

def horns(size, ox, oy, k):
    """머리 양옆에서 위로 휘는 뿔 한 쌍(먹빛). ox, oy = 칸 안에서 몸 그림이 놓인 자리."""
    im = Image.new('RGBA', size, (0, 0, 0, 0)); d = ImageDraw.Draw(im); hx, hy = ox + 122, oy + 30 + (k % 2)
    for sgn in (-1, 1):
        pts_out, pts_in = [], []
        for t in range(13):
            u = t / 12; ang = math.radians(200 - 95 * u) if sgn < 0 else math.radians(-20 + 95 * u)
            cx = hx + sgn * 12 + math.cos(ang) * 30 * u * 1.25; cy = hy - 4 - u * 44 + math.sin(ang) * 6; wdt = 6.5 * (1 - u) + .6
            pts_out.append((cx - sgn * wdt, cy)); pts_in.append((cx + sgn * wdt, cy))
        d.polygon(pts_out + pts_in[::-1], fill=(34, 22, 44, 255))
        d.line(pts_out, fill=(96, 70, 120, 255), width=1)
    return im

def build_awake():
    src = cells('media/boss-art-v43/cultist-down.webp', 4); pad = 62; frames = []
    for k, c in enumerate(src):
        w, h = c.width + pad * 2, c.height + pad
        f = Image.new('RGBA', (w, h), (0, 0, 0, 0)); f.alpha_composite(aura((w, h), k))
        body = awake_cell(c, k)
        # 등 뒤에 드리운 큰 악마 그림자: 같은 몸을 1.34배로 키워 검보라 먹빛으로(갈고리가 몸 밖으로 크게 뻗는다)
        big = c.resize((int(c.width * 1.34), int(c.height * 1.34)), Image.LANCZOS)
        shade = Image.new('RGBA', big.size, (30, 18, 46, 0)); shade.putalpha(big.getchannel('A').point(lambda v: int(v * .62)))  # 그림자 위를 지나는 탄이 읽히게 옅게(심사 11-20)
        f.alpha_composite(shade, (pad - int(c.width * .17), max(0, pad - int(c.height * .30))))
        # 사몽 기운이 옷자락 끝을 물들인다: 아래 3분의 1에 검보라를 옅게 곱한다
        tint = Image.new('RGBA', body.size, (70, 30, 120, 0)); grad = Image.linear_gradient('L').resize(body.size); tint.putalpha(ImageChops.multiply(grad.point(lambda v: max(0, v - 150) * 2), body.getchannel('A')))
        body.alpha_composite(tint); f.alpha_composite(body, (pad, pad))
        f = feather(f); f.alpha_composite(body, (pad, pad))  # 가장자리를 녹인 뒤 몸은 또렷하게 다시 얹는다
        f.alpha_composite(horns((w, h), pad, pad, k))
        frames.append(f)
    sheet = Image.new('RGBA', (frames[0].width * 4, frames[0].height), (0, 0, 0, 0))
    for i, f in enumerate(frames): sheet.paste(f, (i * f.width, 0))
    sheet.save(f'{OUT}/cultist-awake-temp.png'); print('cultist-awake-temp', sheet.size)

def build_swarm():
    src = cells('media/drive-v43/b50-down.webp', 4); cw, ch = src[0].size; W, H = int(cw * 2.3), int(ch * 1.36); frames = []
    spots = [(0, -.02, 1.32, .22), (-.56, .0, .9, .3), (.56, .0, .9, .3), (-.36, .02, .78, .42), (.36, .02, .78, .42), (-.2, -.02, .86, .6), (.2, -.02, .86, .6)]  # 뒤에서 앞으로: x, y, 크기, 밝기
    for k in range(4):
        f = Image.new('RGBA', (W, H), (0, 0, 0, 0)); f.alpha_composite(aura((W, H), k, (60, 40, 110)))
        for i, (dx, dy, sc, lum) in enumerate(spots):
            c = src[(k + i + 1) % 4]; c = c.resize((int(cw * sc), int(ch * sc)), Image.LANCZOS)
            if i % 2: c = c.transpose(Image.FLIP_LEFT_RIGHT)
            dark = Image.merge('RGBA', [ch_.point(lambda v, m=m: int(v * m)) for ch_, m in zip(c.split()[:3], (lum * .8, lum * .7, lum))] + [c.getchannel('A')])
            f.alpha_composite(dark, (int(W / 2 + dx * cw - c.width / 2), int(H - c.height - (.06 - dy) * ch)))
        f = feather(f, top=.1, side=.08); f.alpha_composite(src[k], (int(W / 2 - cw / 2), H - ch))
        frames.append(f)
    sheet = Image.new('RGBA', (W * 4, H), (0, 0, 0, 0))
    for i, f in enumerate(frames): sheet.paste(f, (i * W, 0))
    sheet.save(f'{OUT}/chief-swarm-temp.png'); print('chief-swarm-temp', sheet.size)

build_awake(); build_swarm()
