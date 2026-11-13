#!/usr/bin/env python3
"""ARCADE 모드용 경량 그림 묶음을 기존 원화에서 만든다. 원화는 수정하지 않는다.
인물은 투명 여백을 잘라 한 장으로, 2×2 시트는 왼쪽 위 칸만, 배경은 세로 화면에 맞게 잘라 줄인다.
실행: python3 tools/build-arcade-art-v41.py  (저장소 루트에서)"""
import json, os, hashlib
from PIL import Image

OUT = 'media/arcade-v41'
ACTOR, MOB, PROP = 260, 140, 200
# 키: (원본 경로, 긴 변 픽셀, 2×2 시트 여부)
SOURCES = {
    'violet': ('media/boss.webp', ACTOR, False), 'horn': ('media/horn.webp', ACTOR, False), 'balrog': ('media/balrog-idle.webp', ACTOR, False),
    'mask': ('media/actors-v7/mask-idle.png', ACTOR, False), 'lucifer': ('media/actors-v7/lucifer-idle.png', ACTOR, False),
    'asmodeus': ('media/sins-v13/asmodeus-atlas-512.png', ACTOR, True), 'pride': ('media/sins-v13/pride-atlas-512.png', ACTOR, True),
    'belphegor': ('media/sins-v13/belphegor-atlas-512.png', MOB + 40, True), 'mammon': ('media/sins-v13/mammon-atlas-512.png', MOB + 40, True),
    'controller': ('media/chapter3-v18/controller-idle.webp', ACTOR, False), 'goblin': ('media/story-v19/goblin.webp', ACTOR, False),
    'knight': ('media/story-v19/knight-idle.webp', ACTOR, False), 'insomnia': ('media/story-v19/insomnia-idle.webp', ACTOR, False),
    'arbelia': ('media/story-v19/arbelia-idle.webp', ACTOR, False), 'siren': ('media/story-v19/siren-idle.webp', ACTOR, False),
    'chief': ('media/story-v19/chief-idle.webp', ACTOR, False), 'executor': ('media/story-v19/executor-idle.webp', ACTOR, False),
    'rian': ('media/story-v19/rian-idle.webp', ACTOR, False), 'cultist': ('media/cult-v17/cult-leader-atlas.png', ACTOR, True),
    'spider': ('media/spider.webp', MOB, False), 'slime': ('media/actors-v6/swamp-idle.png', MOB, False), 'ember': ('media/actors-v6/ember-idle.png', MOB, False),
    'drone': ('media/chapter3-v18/drone-idle.png', MOB, False), 'mobgoblin': ('media/story-v19/mob-goblin.png', MOB, False), 'wolf': ('media/story-v19/mob-wolf.png', MOB, False),
    'nightmare': ('media/story-v19/mob-nightmare.webp', MOB, False), 'collector': ('media/story-v19/time-collector.png', MOB, False), 'leech': ('media/story-v19/mob-cult-leech.webp', MOB, False),
    'guardian': ('media/story-v19/lower-guardian.webp', MOB + 40, False), 'warden': ('media/story-v19/upper-guardian.webp', MOB + 40, False),
    'sword-violet': ('media/weapon-v12/violet-sword.png', PROP, False), 'cleaver': ('media/weapon-v12/horn-cleaver.png', PROP, False), 'sword-balrog': ('media/weapon-v12/balrog-sword.png', PROP, False),
    'obelisk': ('media/story-v19/deletion-obelisk.webp', PROP, False), 'spire': ('media/story-v19/neural-obelisk.webp', PROP, False), 'twin-blade': ('media/story-v19/chief-blade.webp', PROP, False),
    'crescent': ('media/story-v19/chrono-crescent.webp', PROP, False), 'tissue': ('media/projectiles-hapil1-v25/sloth-tissue.webp', 120, False), 'money': ('media/projectiles-hapil1-v25/greed-money.webp', 120, False),
    'heel': ('media/projectiles-hapil1-v24/lust-heel.webp', 140, False), 'feather': ('media/weapon-v12/mask-feather.png', 160, False), 'cross': ('media/story-v19/rian-cross.webp', 180, False),
    'gear': ('media/story-v19/chrono-engine.webp', PROP, False),
}
BACKGROUNDS = {'forest': 'media/forest.jpg', 'hospital': 'media/maps/map09.webp', 'rings': 'media/story-v19/rings-map.jpg', 'nexus': 'media/chapter3-v18/nexus.jpg',
               'insomnia': 'media/story-v19/insomnia-map.jpg', 'siren': 'media/story-v19/siren-map.webp', 'chief': 'media/story-v19/chief-map.jpg',
               'executor': 'media/story-v19/executor-map.jpg', 'cult': 'media/story-v19/cult-map.jpg'}

def sha(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()

def main():
    os.makedirs(OUT, exist_ok=True)
    manifest = {}
    for key, (src, size, sheet) in SOURCES.items():
        im = Image.open(src).convert('RGBA')
        if sheet:
            im = im.crop((0, 0, im.width // 2, im.height // 2))
        box = im.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
        im = im.crop(box)
        im.thumbnail((size, size), Image.LANCZOS)
        out = f'{OUT}/{key}.webp'
        im.save(out, quality=84, method=6)
        manifest[key] = {'source': src, 'sourceSha256': sha(src), 'file': out, 'size': list(im.size), 'bytes': os.path.getsize(out)}
    for key, src in BACKGROUNDS.items():
        im = Image.open(src).convert('RGB')
        scale = max(480 / im.width, 800 / im.height)
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
        left, top = (im.width - 480) // 2, (im.height - 800) // 2
        im = im.crop((left, top, left + 480, top + 800))
        out = f'{OUT}/bg-{key}.jpg'
        im.save(out, quality=58, optimize=True)
        manifest['bg-' + key] = {'source': src, 'sourceSha256': sha(src), 'file': out, 'size': [480, 800], 'bytes': os.path.getsize(out)}
    json.dump(manifest, open(f'{OUT}/manifest.json', 'w'), indent=1, ensure_ascii=False)
    total = sum(v['bytes'] for v in manifest.values())
    print(len(manifest), 'files', total, 'bytes; largest', max(manifest.items(), key=lambda kv: kv[1]['bytes'])[0], max(v['bytes'] for v in manifest.values()))

main()
