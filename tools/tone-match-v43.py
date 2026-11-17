#!/usr/bin/env python3
"""보스 공격 스트립의 색을 같은 보스의 걷기 시트 색에 맞춘다(사용자 11-17 "이미지·모션 간 일관성").
걷기(드라이브 정면 시트)와 공격(m0 r104 스트립)이 같은 인물인데 공격만 채도·색이 달라 공격할 때 다른 그림으로 바뀌어 보이던 것을 고친다.
불투명 픽셀만 Lab 채널별 평균·표준편차를 걷기 쪽에 맞춘다(모양·투명도는 그대로). 원본은 두고 <이름>-tone.webp 를 새로 쓴다.
실행: python3 tools/tone-match-v43.py (저장소 루트)"""
import numpy as np
from PIL import Image

PAIRS = [  # (걷기 시트, 공격 스트립, 방식)
    ('media/drive-v43/b12-down.webp', 'media/m0-v43/boss/a11-boss-attack.webp', 'full'),      # 루시퍼
    ('media/drive-v43/b11-down.webp', 'media/m0-v43/boss/mb-ep1a11-attack.webp', 'full'),     # 초천사의 웃는 가면
    # 발록: 불칼은 걷기도 주황이라 밝기만 맞추고 색은 채도만 줄인다(색상까지 옮기면 칼 색이 바뀐다)
    ('media/drive-v43/b08-down.webp', 'media/m0-v43/boss/dist06-boss-attack.webp', 'light'),
]
M = np.array([[.4124, .3576, .1805], [.2126, .7152, .0722], [.0193, .1192, .9505]]); WP = np.array([.95047, 1., 1.08883])

def to_lab(rgb):
    c = rgb / 255.; c = np.where(c > .04045, ((c + .055) / 1.055) ** 2.4, c / 12.92)
    xyz = c @ M.T / WP; f = np.where(xyz > .008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)

def to_rgb(lab):
    fy = (lab[..., 0] + 16) / 116; fx = fy + lab[..., 1] / 500; fz = fy - lab[..., 2] / 200
    f = np.stack([fx, fy, fz], -1); xyz = np.where(f ** 3 > .008856, f ** 3, (f - 16 / 116) / 7.787) * WP
    c = xyz @ np.linalg.inv(M).T; c = np.clip(c, 0, 1)
    c = np.where(c > .0031308, 1.055 * c ** (1 / 2.4) - .055, 12.92 * c)
    return np.clip(c * 255 + .5, 0, 255).astype(np.uint8)

def load(path):
    a = np.asarray(Image.open(path).convert('RGBA')).astype(np.float64)
    return to_lab(a[..., :3]), a[..., 3]

for base, attack, mode in PAIRS:
    bl, ba = load(base); al, aa = load(attack)
    bm, am = ba > 160, aa > 160
    out = al.copy()
    for c in range(3):
        bs, as_ = bl[..., c][bm], al[..., c][am]
        k = bs.std() / max(as_.std(), 1e-6)
        if mode == 'light' and c:
            out[..., c] = al[..., c] * min(1, k)  # 무채색(0)을 기준으로 채도만 줄인다
        else:
            out[..., c] = (al[..., c] - as_.mean()) * k + bs.mean()
    img = Image.fromarray(np.dstack([to_rgb(out), aa.astype(np.uint8)]), 'RGBA')
    dst = attack.replace('.webp', '-tone.webp')
    img.save(dst, 'WEBP', quality=90, method=6)
    print(dst, img.size, mode)
