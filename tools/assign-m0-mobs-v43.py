#!/usr/bin/env python3
"""m0 지역표(docs/v43/m0-mobs.json)대로 장면마다 잡몹 그림을 배정한다.
입력: docs/v43/m0-mobs.json, media/m0-v43/index.json(tools/import-m0-mobs-v43.py 결과), media/drive-v43/index.json
출력: tools/arcade-art-v43/m0.json (그림 배정표: 몹 키 m0_…, 동작 side·attack)
      src/arcade-skins-v43.js    (장면 → 그 지도의 몹 그림 키 목록. 화면 쪽이 cast 순서대로 입힌다)
규칙: 드라이브 v3 정면 걷기(그 몹의 m0 그림 기준)가 있으면 그것이 기본. 다음으로 드라이브에 그 몹의 정면 걷기(exact)가 있으면 그것이 기본, m0 이동 스트립이 옆 걷기. 없으면 m0 이동 스트립이 기본(오른쪽을 본다).
      m0 그림이 모자란 시간탑(kair)·기억계(u2xx) 장면은 같은 지역 묶음의 몹을 빌려 3종까지 채운다(borrowed에 적는다).
실행: python3 tools/assign-m0-mobs-v43.py  (저장소 루트)"""
import glob, json, os, re, subprocess

table = json.load(open('docs/v43/m0-mobs.json'))
m0 = json.load(open('media/m0-v43/index.json'))['mobs']
_items = json.load(open('media/drive-v43/index.json'))['items']
drive = {i['id']: i for i in _items if i.get('file') and i.get('kind') != 'mob-v3'}
# 드라이브 v3 걷기 세트: m0가 실제로 그리는 그림(m0Key) 기준으로 그린 정면(아래) 걷기. 그 그림을 쓰는 몹의 기본 그림이 된다.
v3 = [i for i in _items if i.get('kind') == 'mob-v3' and i.get('file')]
def v3_of(art):
    for i in v3:
        if any(k and k in (art or '') for k in i.get('m0Key') or []): return i
    return None
POOLS = {'kair': re.compile(r'^kair'), 'u2': re.compile(r'^u2')}
FILL = 3
DOWN = json.load(open('docs/v43/m0-down.json'))['mobs']

def key_of(mid):
    return 'm0_' + re.sub(r'[^a-z0-9]+', '_', mid.lower()).strip('_')

mobs, skins, borrowed, own = {}, {}, {}, {}
for scene, row in table['scenes'].items():
    keys = []
    for m in row['mobs']:
        mid = m['m0Id']
        front = v3_of(m.get('m0ArtPath'))
        dn = DOWN.get(mid)
        d = drive.get(m.get('driveId') or '')
        exact = d and m.get('match') == 'exact' and os.path.exists('media/drive-v43/' + d['file'])
        if mid not in m0 and not front and not dn and not exact: continue  # 11-17: m0 이동 스트립이 없어도 드라이브 정면 걷기(exact)가 있으면 쓴다
        k, e = key_of(mid), m0.get(mid) or {}
        move = {'src': 'media/m0-v43/' + e['move']['file'], 'strip': e['move']['frames'], 'fps': 7, 'facing': 'right'} if e else None
        if not move and front and front.get('sideFile'): move = {'src': 'media/drive-v43/' + front['sideFile'], 'strip': 4, 'fps': 8, 'facing': 'right'}
        if front:
            spec = {'src': 'media/drive-v43/' + front['file'], 'strip': 4, 'fps': 8, 'motions': ({'side': move} if move else {})}
        elif d and m.get('match') == 'exact' and os.path.exists('media/drive-v43/' + d['file']):
            spec = {'src': 'media/drive-v43/' + d['file'], 'strip': d.get('frames', 4), 'fps': 6, 'motions': ({'side': move} if move else {})}
        elif move:
            spec = dict(move); spec['motions'] = {}
        else:
            spec = {'motions': {}}
        if e.get('attack'):
            spec['motions']['attack'] = {'src': 'media/m0-v43/' + e['attack']['file'], 'strip': e['attack']['frames'], 'fps': 8, 'facing': 'right'}
        if dn:  # 스토리월드 최신본이 이 몹의 아래 걷기로 쓰는 시트(docs/v43/m0-down.json). 같은 인물로 그려진 옆 걷기·공격만 남긴다.
            side = move if spec.get('facing') else spec['motions'].get('side')
            keep = {'side': side, 'attack': spec['motions'].get('attack')}
            spec = {'src': 'media/m0-v43/down/' + (dn.get('down') or dn['float']).split('/')[-1], 'strip': dn.get('frames', 4), 'fps': 8,
                    'motions': {n: keep[n] for n in dn['keep'] if keep.get(n)}}
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
    keys.sort(key=lambda k: 'facing' in mobs[k])  # 정면 걷기 그림을 앞에 둔다. 몹 종류가 하나뿐인 스테이지는 첫 그림만 쓰므로 옆모습보다 정면이 먼저여야 한다.
    if keys: skins[scene] = keys

# 사용자 11-16·11-17 기록은 docs/v43/mob-recast.json(모션이 어색한 몹·다른 몹으로 바뀌는 동작·화풍이 다른 몹).
recast = json.load(open('docs/v43/mob-recast.json'))
for k in recast['noSide']:
    mobs[k].get('motions', {}).pop('side', None)
    if not mobs[k].get('motions'): mobs[k].pop('motions', None)
# 정면·공격 그림이 다른 몹, 공격이 한 칸뿐인 몹은 공격 동작을 빼고 일관된 걷기만 쓴다.
for k, v in mobs.items():
    a = v.get('motions', {}).get('attack')
    if k in recast.get('noAttack', {}) or (a and a.get('strip', 4) < 2):
        v.get('motions', {}).pop('attack', None)
        if not v.get('motions'): v.pop('motions', None)

# 사용자 11-17 "몹이 다른테마에 중복되서 나오지 않았으면", "서사에 맞는 몹과 보스만": 장면마다 그 지도(m0 지역표)의 몹만 쓴다.
# 같은 그림(원본 파일)은 한 테마에서만 나온다. 테마 = 장면. 지역표가 같은 몹 목록을 준 장면(09-2·04, 살인 사건 53~55)과
# 그림이 모자란 연작 지역(시간탑 kair·통제자 기억계 u2·살인 사건 murder·고블린 숲 last304·305)은 한 테마로 묶어 서로 빌린다.
# 보스·중간보스 그림도 같은 규칙: 다른 테마의 보스 그림을 몹으로 쓰지 않는다.
POOL_OF = [('kair', r'^kair'), ('u2', r'^u2'), ('murder', r'^murder'), ('goblin', r'^last30[45]$')]
order = list(table['scenes'])
def group(scene):
    m = table['scenes'][scene]['map']
    for name, rx in POOL_OF:
        if re.match(rx, m): return name
    roster = tuple(sorted(x['m0Id'] for x in table['scenes'][scene]['mobs']))
    twin = next(s for s in order if tuple(sorted(x['m0Id'] for x in table['scenes'][s]['mobs'])) == roster)
    return 'scene:' + twin
cast = json.loads(subprocess.run(['node', '-e', 'const A=require("./src/arcade-v43.js");const o={};A.STAGES.forEach((g,i)=>{o[g.scene]={need:(g.cast||[]).length,actors:[...new Set(A.SEGMENTS.filter(s=>s.stage===i&&s.kind==="card").map(s=>s.actor))]}});console.log(JSON.stringify(o))'], capture_output=True, text=True, check=True).stdout)
owner = {}  # 원본 그림 → 그 그림을 쓰는 테마
for f in sorted(glob.glob('tools/arcade-art-v43/*.json')):
    if f.endswith('m0.json'): continue
    actors = json.load(open(f)); actors = actors.get('actors', actors)
    for scene, c in cast.items():
        for a in c['actors']:
            if isinstance(actors.get(a), dict) and actors[a].get('src'): owner.setdefault(actors[a]['src'], set()).add(group(scene))
def free(k, g):
    return all(x == g for x in owner.get(mobs[k]['src'], {g}))
def fronts_first(keys):
    return [k for k in keys if 'facing' not in mobs[k]] + [k for k in keys if 'facing' in mobs[k]]
front, front_borrowed, chosen = {}, {}, {}
for scene in order:
    if scene not in skins: continue  # m0 몹이 없는 장면은 원래 몹(cast) 그림을 그대로 쓴다
    g, need = group(scene), max(1, cast.get(scene, {}).get('need', 1))
    good = lambda k: k not in recast['stiff'] and k not in recast.get('style', {}) and free(k, g)
    keys = fronts_first([k for k in own[scene] if good(k)])
    if not keys:  # 같은 테마의 다른 장면 몹을 빌린다(아직 아무 장면도 안 쓴 그림부터)
        mates = [s for s in order if s != scene and s in own and group(s) == g]
        pool = fronts_first([k for s in mates for k in own[s] if good(k)])
        taken = {k for s in chosen for k in chosen[s]}
        keys = sorted(dict.fromkeys(pool), key=lambda k: k in taken)[:need]
        if keys: borrowed[scene] = list(dict.fromkeys(list(keys) + borrowed.get(scene, [])))
    if not keys: keys = fronts_first([k for k in own[scene] if free(k, g)])  # 마지막 수단: 칸이 고른 몹도 쓴다
    picked = keys[:need]
    for k in picked: owner.setdefault(mobs[k]['src'], set()).add(g)
    chosen[scene] = picked
    f = [k for k in picked if 'facing' not in mobs[k]]
    if f: front[scene] = f  # 아래로 걷는 정면 그림이 있으면 그것만(옆모습 몹이 아래로 미끄러지지 않게)
    rest = [k for k in skins[scene] if k not in picked and free(k, g)]
    skins[scene] = picked + rest
    if scene in borrowed: front_borrowed[scene] = [k for k in f if k in borrowed[scene]]
    if not front_borrowed.get(scene): front_borrowed.pop(scene, None)
for scene in list(borrowed):
    if scene not in chosen: continue
    borrowed[scene] = [k for k in borrowed[scene] if k in skins[scene]]
    if not borrowed[scene]: del borrowed[scene]

# 사용자 11-16: 모션이 어색한 몹(정면·옆 그림이 다른 몹, 칸이 거의 같은 몹)을 빼고 서사 테마에 맞는 몹으로 바꾼다(docs/v43/mob-recast.json).
recast = json.load(open('docs/v43/mob-recast.json'))
for k in recast['noSide']:
    mobs[k].get('motions', {}).pop('side', None)
    if not mobs[k].get('motions'): mobs[k].pop('motions', None)
for scene, keys in recast['front'].items():
    for k in keys:
        assert k in mobs and 'facing' not in mobs[k] and 'drive-v43' in mobs[k]['src'], scene + ' ' + k
        assert k not in recast['stiff'], scene + ' stiff ' + k
    front[scene] = list(keys)
    front_borrowed[scene] = [k for k in keys if k not in fronts(scene)]
    if not front_borrowed[scene]: del front_borrowed[scene]
for scene, keys in front.items():
    front[scene] = [k for k in keys if k not in recast['stiff']] or keys

art = {'mobs': {k: {a: b for a, b in v.items() if a != 'name'} for k, v in sorted(mobs.items())}}
json.dump(art, open('tools/arcade-art-v43/m0.json', 'w'), indent=1, ensure_ascii=False)
names = {k: v['name'] for k, v in sorted(mobs.items())}
body = json.dumps({'scenes': skins, 'front': front, 'names': names, 'borrowed': borrowed, 'frontBorrowed': front_borrowed}, ensure_ascii=False, indent=1)
open('src/arcade-skins-v43.js', 'w').write(
    '/* 장면마다 m0 지역표의 잡몹 그림을 입힌다. tools/assign-m0-mobs-v43.py가 만든다(손으로 고치지 않는다). */\n'
    '(function(root,data){if(typeof module===\'object\'&&module.exports)module.exports=data;else root.ArcadeSkins=data;})'
    '(typeof self!==\'undefined\'?self:this,' + body + ');\n')
print(len(mobs), 'mob pictures,', len(skins), 'scenes;', 'no m0 mob:', [s for s in table['scenes'] if s not in skins])
print('front scenes:', len(front), 'front borrowed:', len(front_borrowed))
print('v3 front walk:', sum(1 for v in mobs.values() if '/v3-' in v['src']), 'drive base:', sum(1 for v in mobs.values() if 'drive-v43' in v['src']), 'borrowed:', borrowed)
