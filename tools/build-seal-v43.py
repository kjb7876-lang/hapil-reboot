#!/usr/bin/env python3
"""봉인 낙관(도장) 그림을 굽는다: media/arcade-v43/seal-v43.webp (192×192, 투명 바탕).
직접 그린 그림이다(다른 게임 자산 아님). 인주색 바탕에 '封' 한 글자를 음각으로 파고, 가장자리를 닳게 하고 인주가 덜 묻은 얼룩을 넣는다.
글꼴: Noto Serif KR Bold (SIL OFL 1.1, media/fonts/LICENSE-NotoSerifKR-OFL.txt 와 같은 글꼴). 사용:
  python3 tools/build-seal-v43.py <NotoSerifKR-Bold.otf>"""
import sys, random, pathlib
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
root = pathlib.Path(__file__).resolve().parent.parent
N, S = 192, 4                      # 결과 크기, 그릴 때 배율
random.seed(20261120)
big = N * S
mask = Image.new('L', (big, big), 0); d = ImageDraw.Draw(mask)
m = 14 * S
d.rounded_rectangle([m, m, big - m, big - m], radius=20 * S, fill=255)
# 음각: 안쪽 테두리 선과 글자를 파낸다
cut = Image.new('L', (big, big), 0); c = ImageDraw.Draw(cut)
i = m + 11 * S
c.rounded_rectangle([i, i, big - i, big - i], radius=12 * S, outline=255, width=4 * S)
font = ImageFont.truetype(sys.argv[1], 118 * S)
box = c.textbbox((0, 0), '封', font=font)
c.text(((big - (box[2] - box[0])) / 2 - box[0], (big - (box[3] - box[1])) / 2 - box[1] - 1 * S), '封', font=font, fill=255)
mask = ImageChops.subtract(mask, cut)
# 닳은 가장자리·덜 묻은 얼룩: 굵은 잡음으로 조금 깎는다
noise = Image.effect_noise((big // 6, big // 6), 70).resize((big, big), Image.BICUBIC).filter(ImageFilter.GaussianBlur(S * 1.5))
worn = noise.point(lambda v: 255 if v > 176 else 0).filter(ImageFilter.GaussianBlur(S * .8))
edge = ImageChops.subtract(mask, mask.filter(ImageFilter.MinFilter(4 * S + 1)))          # 가장자리 띠에서만 크게 닳는다
mask = ImageChops.subtract(mask, ImageChops.multiply(edge, worn))
speck = Image.effect_noise((big // 2, big // 2), 90).resize((big, big), Image.BICUBIC).point(lambda v: 255 if v > 232 else 0)
mask = ImageChops.subtract(mask, speck.point(lambda v: v // 2))
mask = mask.filter(ImageFilter.GaussianBlur(S * .45))
# 인주색: 고르게 찍히지 않아 농담이 있다
tone = Image.effect_noise((big // 10, big // 10), 40).resize((big, big), Image.BICUBIC).filter(ImageFilter.GaussianBlur(S * 3))
base = Image.merge('RGB', [tone.point(lambda v, a=a, b=b: max(0, min(255, int(a + (v - 128) * b)))) for a, b in ((172, .34), (54, .16), (40, .14))])
out = Image.merge('RGBA', (*base.split(), mask)).resize((N, N), Image.LANCZOS)
dst = root / 'media/arcade-v43/seal-v43.webp'
out.save(dst, 'WEBP', quality=92, method=6)
print(dst, dst.stat().st_size, 'bytes')
