#!/usr/bin/env python3
"""m0 지역표(docs/v43/m0-mobs.json)대로 장면마다 잡몹 그림을 배정한다.
입력: docs/v43/m0-mobs.json, media/m0-v43/index.json(tools/import-m0-mobs-v43.py 결과), media/drive-v43/index.json
출력: tools/arcade-art-v43/m0.json (그림 배정표: 몹 키 m0_…, 동작 side·attack)
      src/arcade-skins-v43.js    (장면 → 그 지도의 몹 그림 키 목록. 화면 쪽이 cast 순서대로 입힌다)
규칙: 드라이브에 그 몹의 정면 걷기(exact)가 있으면 그것이 기본, m0 이동 스트립이 옆 걷기. 없으면 m0 이동 스트립이 기본(오른쪽을 본다).
      m0 그림이 모자란 시간탑(kair)·기억계(u2xx) 장면은 같은 지역 묶음의 몹을 빌려 3종까지 채운다(borrowed에 적는다).
실행: python3 tools/assign-m0-mobs-v43.py  (저장소 루트)"""
import json, os, re

table = json.load(open('docs/v43/m0-mobs.json'))
m0 = json.load(open('media/m0-v43/index.json'))['mobs']
drive = {i['id']: i for i in json.load(open('media/drive-v43/index.json'))['items'] if i.get('file')}
POOLS = {'kair': re.compile(r'^kair'), 'u2': re.compile(r'^u2')}
FILL = 3

def key_of(mid):
    return 'm0_' + re.sub(r'[^a-z0-9]+', '_', mid.lower()).strip('_')

mobs, skins, borrowed, own = {}, {}, {}, {}
for scene, row in table['scenes'].items():
    keys = []
    for m in row['mobs']:
        mid = m['m0Id']
        if mid not in m0: continue
        k, e = key_of(mid), m0[mid]
        move = {'src': 'media/m0-v43/' + e['move']['file'], 'strip': e['move']['frames'], 'fps': 7, 'facing': 'right'}
        d = drive.get(m.get('driveId') or '')
        if d and m.get('match') == 'exact' and os.path.exists('media/drive-v43/' + d['file']):
            spec = {'src': 'media/drive-v43/' + d['file'], 'strip': d.get('frames', 4), 'fps': 6, 'motions': {'side': move}}
        else:
            spec = dict(move); spec['motions'] = {}
        if e.get('attack'):
            spec['motions']['attack'] = {'src': 'media/m0-v43/' + e['attack']['file'], 'strip': e['attack']['frames'], 'fps': 8, 'facing': 'right'}
        if not spec['motions']: del spec['motions']
        spec['name'] = m.get('nameNow') or m['name']
        mobs[k] = spec
        if k not in keys: keys.append(k)
    own[scene] = keys
for scene, row in table['scenes'].items():
    keys = list(own[scene])
    for pname, rx in POOLS.items():
        if rx.match(row['map']) and len(keys) < FILL:
            order = list(table['scenes'])
            i = order.index(scene)
            near = sorted((s for s in order if rx.match(table['scenes'][s]['map']) and s != scene), key=lambda s: abs(order.index(s) - i))
            for s in near:
                for k in own[s]:
                    if len(keys) < FILL and k not in keys and 'academy' not in k:
                        keys.append(k); borrowed.setdefault(scene, []).append(k)
    if keys: skins[scene] = keys

art = {'mobs': {k: {a: b for a, b in v.items() if a != 'name'} for k, v in sorted(mobs.items())}}
json.dump(art, open('tools/arcade-art-v43/m0.json', 'w'), indent=1, ensure_ascii=False)
names = {k: v['name'] for k, v in sorted(mobs.items())}
body = json.dumps({'scenes': skins, 'names': names, 'borrowed': borrowed}, ensure_ascii=False, indent=1)
open('src/arcade-skins-v43.js', 'w').write(
    '/* 장면마다 m0 지역표의 잡몹 그림을 입힌다. tools/assign-m0-mobs-v43.py가 만든다(손으로 고치지 않는다). */\n'
    '(function(root,data){if(typeof module===\'object\'&&module.exports)module.exports=data;else root.ArcadeSkins=data;})'
    '(typeof self!==\'undefined\'?self:this,' + body + ');\n')
print(len(mobs), 'mob pictures,', len(skins), 'scenes;', 'no m0 mob:', [s for s in table['scenes'] if s not in skins])
print('drive base:', sum(1 for v in mobs.values() if 'drive-v43' in v['src']), 'borrowed:', borrowed)
