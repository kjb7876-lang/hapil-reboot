#!/usr/bin/env python3
"""닷츠 보스 동작 그림(CX-0190BM 피격·쓰러짐·정지 보스 보충, CX-0192AF 공격)을 배정표에 잇는다.

사용: python3 tools/import-cx0190-v43.py <ZIP 폴더> [--check]
  ZIP 이름: CX-<번호>_r<판>_<보스 키>-<동작>.zip  (동작: hit · death · attack · down · hover)
  - 같은 키·동작이 여러 판이면 가장 높은 판만 쓴다(r3 > r2 > r1).
  - hit·death·attack → 배정표 actors.<키>.motions.<동작> (원래 동작 목록은 그대로 둔다).
  - down·hover → 정지·2칸뿐이던 보스의 기본 그림(걷기·떠 있기)을 닷츠 4칸으로 바꾼다.
  - 원본 PNG 는 media/drive-v43/cx0190/<키>-<동작>.webp 로 줄여 보관(앱 묶음에는 안 들어감).
  - 닷츠가 보류라고 한 것(HOLD 목록)은 건너뛴다.
그다음 python3 tools/build-arcade-art-v43.py 로 게임용 그림(media/arcade-v43)을 굽는다."""
import glob, io, json, os, re, sys, zipfile
from PIL import Image

SRC_DIR = 'media/drive-v43/cx0190'
# 닷츠 다운로드 목록 r12: p6_demons 기본형 쓰러짐(배경 안개가 칸 사이로 이어짐)은 보류. r1 p3_body-hit 은 r2 로 대체.
HOLD = {('p6_demons', 'death')}
NAME = re.compile(r'CX-(\d+)[A-Z]{2}_r(\d+)_(.+)-(hit|death|attack|down|hover)\.zip$')

def tables():
    out = {}
    for p in sorted(glob.glob('tools/arcade-art-v43/*.json')):
        t = json.load(open(p))
        for k in (t.get('actors') or {}): out[k] = p
    return out

def main():
    zdir, check = sys.argv[1], '--check' in sys.argv
    where = tables()
    best = {}
    for z in sorted(os.listdir(zdir)):
        m = NAME.match(z)
        if not m: continue
        task, rev, key, motion = m.group(1), int(m.group(2)), m.group(3), m.group(4)
        if (key, motion) in HOLD: print('HOLD', z); continue
        if key not in where: print('NO KEY', z); continue
        if (key, motion) not in best or best[(key, motion)][0] < (rev, task): best[(key, motion)] = ((rev, task), z)
    os.makedirs(SRC_DIR, exist_ok=True)
    changed = {}
    for (key, motion), (_, z) in sorted(best.items()):
        zf = zipfile.ZipFile(os.path.join(zdir, z))
        res = json.loads(zf.read([n for n in zf.namelist() if n.endswith('result.json')][0]))
        files = res.get('files') or []
        info = files[0] if files else {}
        png = [n for n in zf.namelist() if n.endswith('.png')][0]
        im = Image.open(io.BytesIO(zf.read(png))).convert('RGBA')
        n = int(info.get('frame_count') or info.get('frames') or round(im.width / im.height))
        fps = int(info.get('fps') or 8)
        src = f'{SRC_DIR}/{key}-{motion}.webp'
        if not check: im.save(src, quality=88, method=6)
        path = where[key]
        t = changed.get(path) or json.load(open(path))
        a = t['actors'][key]
        note = f'닷츠 {z[:-4]} {n}칸'
        if motion in ('down', 'hover'):
            keep = {k: v for k, v in a.items() if k in ('size', 'motions', 'facing')}
            a.clear(); a.update({'src': src, 'strip': n, 'fps': fps}); a.update(keep); a['note'] = note
        else:
            a.setdefault('motions', {})[motion] = {'src': src, 'strip': n, 'fps': fps, 'note': note}
        changed[path] = t
        print(f'{key:22s} {motion:6s} {n} frames {fps} fps  <- {z}')
    if not check:
        for path, t in changed.items():
            json.dump(t, open(path, 'w'), indent=1, ensure_ascii=False); open(path, 'a').write('\n')
    print(len(best), 'motions,', len(changed), 'tables')

if __name__ == '__main__':
    main()
