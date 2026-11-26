#!/usr/bin/env python3
"""11~52스테이지 보스 스킬 시트를 게임용 그림과 판정표로 만든다.

사용: python3 -I tools/import-cx0191-v43.py <ZIP 폴더> [--check]
     python3 -I tools/import-cx0191-v43.py --render-elder  # 49스테이지만 갱신
  ZIP 이름: CX-0191BS_r<판>_<스테이지 두 자리>_<보스 키>_<영문 주제>.zip  (같은 스테이지·키는 가장 높은 판)
  - 원본: 24칸(6열×4행, 칸 256), 0~7 예고 · 8~15 공격 · 16~23 사라짐, 가운데 세로 길(칸 x 108~147)은 비어 있음.
  - 그림: media/phase2-sheets/s<NN>-<키>.webp (칸 192, 1152×768). 원본 PNG 는 앱에 넣지 않는다.
  - 판정: 공격 칸(8~15)의 알파 174 이상(닷츠 규격)을 48×64 격자로 줄인 비트표 → src/arcade-phase2-sheets-art-v43.js
    격자 한 칸의 절반 이상이 짙은 먹이면 판정. 가운데 길 격자(20~27열)가 한 칸이라도 막히면 그 시트는 넣지 않는다.
"""
import base64, glob, hashlib, io, json, math, os, re, sys, zipfile
from PIL import Image, ImageChops, ImageDraw

OUT_DIR = 'media/phase2-sheets'
ART_JS = 'src/arcade-phase2-sheets-art-v43.js'
CELL, SRC_CELL, COLS, ROWS = 192, 256, 6, 4
GW, GH, HARD = 48, 64, 174
LANE = (20, 28)  # 칸 x 108~147 → 격자 열 20~27
NAME = re.compile(r'CX-0191BS_r(\d+)_(\d\d)_(.+)\.zip$')
ELDER = 'p8_brainwashed_elder'


def keys_of(stem, known):
    # stem = '<키>_<주제>' : 아는 배우 키 가운데 가장 긴 접두어
    best = ''
    for k in known:
        if stem.startswith(k + '_') and len(k) > len(best): best = k
    return best, stem[len(best) + 1:]


def elder_frame(f):
    """An inscribed seal draws two curtains of ink, leaving the path down its centre open."""
    pulse = math.sin(f * math.pi / 4)
    warning = f < 8
    opacity = (38 + f * 8) / 255 if warning else 1 if f < 16 else (24 - f) / 9
    side = Image.new('RGBA', (SRC_CELL, SRC_CELL))
    draw = ImageDraw.Draw(side)

    def color(rgb, alpha):
        return (*rgb, round(alpha * opacity))

    ink, dry, vermilion, chalk = (49, 23, 28), (96, 43, 38), (158, 53, 42), (236, 204, 163)
    seal_y = 53 + round(pulse * 3)
    # Rippling strands start at the seal and unroll toward the bottom of the field.
    for i in range(4):
        path = [(57 + (i - 1.5) * (5 + .052 * y) + 10 * math.sin(.034 * y + f * .26), y)
                for y in range(seal_y + 10, 247 - i * 5, 3)]
        width = 2 if warning else 15 - i * 2
        draw.line(path, fill=color(dry if i % 2 else ink, 235), width=width)
        draw.line([(x - 2, y) for x, y in path], fill=color(vermilion, 218), width=max(1, width // 5))
        if not warning:
            for j in (5, 13):
                draw.line([(x + j / 2, y) for x, y in path[j::2]], fill=color(chalk, 101 - 3 * j), width=1)
    # Other silhouettes stay outside the wake, leaving the boss visible above it.
    for i in range(14):
        y = 89 + (i * 37 + f * 7) % 146
        x = 14 + (i * 19 + f * 3) % 88
        draw.line([(x - 4, y - 8), (x + 3, y + 4)], fill=color(vermilion, 55), width=1)
    draw.polygon([(57, seal_y - 30), (84, seal_y - 11), (84, seal_y + 12), (57, seal_y + 30),
                  (30, seal_y + 12), (30, seal_y - 11)], fill=color(ink, 208), outline=color(vermilion, 244), width=3)
    draw.ellipse((41, seal_y - 16, 73, seal_y + 16), outline=color(chalk, 186), width=2)
    draw.line([(46, seal_y - 3), (53, seal_y - 9), (62, seal_y - 9), (68, seal_y - 3),
               (62, seal_y + 4), (53, seal_y + 4), (46, seal_y - 3)], fill=color(vermilion, 246), width=2)
    draw.line((57, seal_y - 13, 57, seal_y + 13), fill=color(chalk, 239), width=2)
    draw.line((49, seal_y + 9, 65, seal_y + 9), fill=color(chalk, 210), width=2)
    draw.line((45, 10, 57, seal_y - 30), fill=color(vermilion, 175), width=2)
    draw.line((70, 14, 57, seal_y - 30), fill=color(ink, 192), width=2)
    # 108..147 is the protected escape lane, including translucent paint.
    side.paste((0, 0, 0, 0), (108, 0, SRC_CELL, SRC_CELL))
    return ImageChops.lighter(side, side.transpose(Image.Transpose.FLIP_LEFT_RIGHT))


def pack(stage, key, topic, im, source, check, *, quality=78):
    frames = {}
    alpha = im.getchannel('A')
    for f in range(8, 16):
        cx, cy = (f % COLS) * SRC_CELL, (f // COLS) * SRC_CELL
        hard = alpha.crop((cx, cy, cx + SRC_CELL, cy + SRC_CELL)).point(lambda v: 255 if v >= HARD else 0)
        grid = hard.resize((GW, GH), Image.BOX)
        px = grid.load()
        bits = bytearray(GW * GH // 8)
        for y in range(GH):
            for x in range(GW):
                if px[x, y] >= 128:
                    if LANE[0] <= x < LANE[1]:
                        raise ValueError('centre lane blocked')
                    i = y * GW + x
                    bits[i >> 3] |= 1 << (i & 7)
        frames[str(f)] = base64.b64encode(bytes(bits)).decode()
    small = Image.new('RGBA', (CELL * COLS, CELL * ROWS))
    for f in range(24):
        cx, cy = (f % COLS) * SRC_CELL, (f // COLS) * SRC_CELL
        small.paste(im.crop((cx, cy, cx + SRC_CELL, cy + SRC_CELL)).resize((CELL, CELL), Image.LANCZOS),
                    ((f % COLS) * CELL, (f // COLS) * CELL))
    out = f'{OUT_DIR}/s{stage:02d}-{key}.webp'
    buf = io.BytesIO()
    small.save(buf, 'WEBP', quality=quality, method=6)
    data = buf.getvalue()
    if not check:
        open(out, 'wb').write(data)
    sha = hashlib.sha256(data).hexdigest()
    return {
        'theme': f'sheet-{stage:02d}-{key}', 'stage': stage, 'actor': key, 'topic': topic,
        'url': f'{out}?v={sha[:12]}', 'sha256': sha, 'bytes': len(data),
        'style': 'arena', 'frameCount': 24, 'columns': COLS, 'cellWidth': CELL, 'cellHeight': CELL,
        'framesByPhase': {'telegraph': [0, 7], 'active': [8, 15], 'decay': [16, 23]},
        'mask': {'w': GW, 'h': GH, 'frames': frames}, 'source': source,
    }


def add_elder(art, check):
    sheet = Image.new('RGBA', (SRC_CELL * COLS, SRC_CELL * ROWS))
    for f in range(24):
        sheet.paste(elder_frame(f), ((f % COLS) * SRC_CELL, (f // COLS) * SRC_CELL))
    d = pack(49, ELDER, '세뇌된 장로: 복종의 각인', sheet, {'generator': 'elder_frame'}, check, quality=64)
    d['waitForClear'] = True
    art.pop('sheet-49-p8_lauren', None)
    art[d['theme']] = d


def write_art(art):
    body = json.dumps(art, ensure_ascii=False, indent=1, sort_keys=True)
    open(ART_JS, 'w').write('(function(root,art){\n  // 스킬 시트(tools/import-cx0191-v43.py 가 만든다. 손으로 고치지 않는다).\n'
                            '  if(typeof module==="object"&&module.exports)module.exports=art;else root.HapilPhase2SheetsArt=art;\n'
                            '})(typeof globalThis==="undefined"?this:globalThis,' + body + ');\n')


def main():
    zdir, check = sys.argv[1], '--check' in sys.argv
    if zdir == '--render-elder':
        body = open(ART_JS).read().split('this:globalThis,', 1)[1].rsplit(');', 1)[0]
        art = json.loads(body)
        add_elder(art, check)
        if not check:
            write_art(art)
        return
    known = set()
    for p in glob.glob('tools/arcade-art-v43/*.json'):
        known |= set((json.load(open(p)).get('actors') or {}).keys())
    best = {}
    for z in sorted(os.listdir(zdir)):
        m = NAME.match(z)
        if not m: continue
        rev, stage = int(m.group(1)), int(m.group(2))
        if stage == 49: continue  # Stage 49's original elder sheet is rendered locally.
        key, topic = keys_of(m.group(3), known)
        if not key: print('NO KEY', z); continue
        if (stage, key) not in best or best[(stage, key)][0] < rev: best[(stage, key)] = (rev, z, topic)
    os.makedirs(OUT_DIR, exist_ok=True)
    art, skipped = {}, []
    for (stage, key), (rev, z, topic) in sorted(best.items()):
        zf = zipfile.ZipFile(os.path.join(zdir, z))
        res = json.loads(zf.read([n for n in zf.namelist() if n.endswith('result.json')][0]))
        png = [n for n in zf.namelist() if n.endswith('.png')][0]
        raw = zf.read(png)
        im = Image.open(io.BytesIO(raw)).convert('RGBA')
        if im.size != (SRC_CELL * COLS, SRC_CELL * ROWS): skipped.append((z, 'size %s' % (im.size,))); continue
        source = {'zip': z, 'pngSha256': hashlib.sha256(raw).hexdigest()}
        try:
            d = pack(stage, key, res.get('theme') or topic, im, source, check)
        except ValueError as e:
            skipped.append((z, str(e)))
            continue
        art[d['theme']] = d
        print(f"{d['theme']:32s} {d['bytes']//1024:4d}KB  <- {z}")
    for z, why in skipped: print('SKIP', z, why)
    add_elder(art, check)
    if not check:
        write_art(art)
    print(len(art), 'sheets,', len(skipped), 'skipped')


if __name__ == '__main__':
    main()
