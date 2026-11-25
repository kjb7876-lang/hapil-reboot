#!/usr/bin/env python3
"""닷츠 CX-0191BS(11~52스테이지 보스 스킬 시트 37장)를 게임용 그림과 판정표로 만든다.

사용: python3 -I tools/import-cx0191-v43.py <ZIP 폴더> [--check]
  ZIP 이름: CX-0191BS_r<판>_<스테이지 두 자리>_<보스 키>_<영문 주제>.zip  (같은 스테이지·키는 가장 높은 판)
  - 원본: 24칸(6열×4행, 칸 256), 0~7 예고 · 8~15 공격 · 16~23 사라짐, 가운데 세로 길(칸 x 108~147)은 비어 있음.
  - 그림: media/phase2-sheets/s<NN>-<키>.webp (칸 192, 1152×768). 원본 PNG 는 앱에 넣지 않는다.
  - 판정: 공격 칸(8~15)의 알파 174 이상(닷츠 규격)을 48×64 격자로 줄인 비트표 → src/arcade-phase2-sheets-art-v43.js
    격자 한 칸의 절반 이상이 짙은 먹이면 판정. 가운데 길 격자(20~27열)가 한 칸이라도 막히면 그 시트는 넣지 않는다.
"""
import base64, glob, hashlib, io, json, os, re, sys, zipfile
from PIL import Image

OUT_DIR = 'media/phase2-sheets'
ART_JS = 'src/arcade-phase2-sheets-art-v43.js'
CELL, SRC_CELL, COLS, ROWS = 192, 256, 6, 4
GW, GH, HARD = 48, 64, 174
LANE = (20, 28)  # 칸 x 108~147 → 격자 열 20~27
NAME = re.compile(r'CX-0191BS_r(\d+)_(\d\d)_(.+)\.zip$')


def keys_of(stem, known):
    # stem = '<키>_<주제>' : 아는 배우 키 가운데 가장 긴 접두어
    best = ''
    for k in known:
        if stem.startswith(k + '_') and len(k) > len(best): best = k
    return best, stem[len(best) + 1:]


def main():
    zdir, check = sys.argv[1], '--check' in sys.argv
    known = set()
    for p in glob.glob('tools/arcade-art-v43/*.json'):
        known |= set((json.load(open(p)).get('actors') or {}).keys())
    best = {}
    for z in sorted(os.listdir(zdir)):
        m = NAME.match(z)
        if not m: continue
        rev, stage = int(m.group(1)), int(m.group(2))
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
        alpha = im.getchannel('A')
        frames = {}
        lane_hit = False
        for f in range(8, 16):
            cx, cy = (f % COLS) * SRC_CELL, (f // COLS) * SRC_CELL
            hard = alpha.crop((cx, cy, cx + SRC_CELL, cy + SRC_CELL)).point(lambda v: 255 if v >= HARD else 0)
            grid = hard.resize((GW, GH), Image.BOX)  # 격자 칸 안 짙은 먹 비율
            px = grid.load()
            bits = bytearray(GW * GH // 8)
            for y in range(GH):
                for x in range(GW):
                    if px[x, y] >= 128:
                        if LANE[0] <= x < LANE[1]: lane_hit = True
                        i = y * GW + x; bits[i >> 3] |= 1 << (i & 7)
            frames[str(f)] = base64.b64encode(bytes(bits)).decode()
        if lane_hit: skipped.append((z, 'centre lane blocked')); continue
        small = Image.new('RGBA', (CELL * COLS, CELL * ROWS))
        for f in range(24):
            cx, cy = (f % COLS) * SRC_CELL, (f // COLS) * SRC_CELL
            small.paste(im.crop((cx, cy, cx + SRC_CELL, cy + SRC_CELL)).resize((CELL, CELL), Image.LANCZOS), ((f % COLS) * CELL, (f // COLS) * CELL))
        out = f'{OUT_DIR}/s{stage:02d}-{key}.webp'
        buf = io.BytesIO(); small.save(buf, 'WEBP', quality=78, method=6); data = buf.getvalue()
        if not check: open(out, 'wb').write(data)
        sha = hashlib.sha256(data).hexdigest()
        theme = f'sheet-{stage:02d}-{key}'
        art[theme] = {
            'theme': theme, 'stage': stage, 'actor': key, 'topic': res.get('theme') or topic,
            'url': f'{out}?v={sha[:12]}', 'sha256': sha, 'bytes': len(data),
            'style': 'arena', 'frameCount': 24, 'columns': COLS, 'cellWidth': CELL, 'cellHeight': CELL,
            'framesByPhase': {'telegraph': [0, 7], 'active': [8, 15], 'decay': [16, 23]},
            'mask': {'w': GW, 'h': GH, 'frames': frames},
            'source': {'zip': z, 'pngSha256': hashlib.sha256(raw).hexdigest()},
        }
        print(f'{theme:32s} {len(data)//1024:4d}KB  <- {z}')
    for z, why in skipped: print('SKIP', z, why)
    if not check:
        body = json.dumps(art, ensure_ascii=False, indent=1, sort_keys=True)
        open(ART_JS, 'w').write('(function(root,art){\n  // 닷츠 CX-0191BS 스킬 시트(tools/import-cx0191-v43.py 가 만든다. 손으로 고치지 않는다).\n'
                                '  if(typeof module==="object"&&module.exports)module.exports=art;else root.HapilPhase2SheetsArt=art;\n'
                                '})(typeof globalThis==="undefined"?this:globalThis,' + body + ');\n')
    print(len(art), 'sheets,', len(skipped), 'skipped')


if __name__ == '__main__':
    main()
