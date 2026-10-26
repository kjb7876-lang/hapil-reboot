#!/usr/bin/env python3
"""Build the story-only, source-bound UMD data. Never include the later expansion.

Inputs may live outside this repository. The generated JavaScript contains only
canonical storymode lines 92–919, not the source book or its later chapters.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE_SHA = '4b981a3d64c203a6b5b7d0b429aac452e22b43077a1f961a16afa5fc30406a90'
MANIFEST_SHA = '7f16e287b95bda27dfc96a49ffa79457220fa9db0ef1a362b83000c07207145e'
DEFAULT_SOURCE = ROOT / 'docs/story-source/canonical-original.txt'
DEFAULT_MANIFEST = ROOT / 'docs/story-source/boss-scope-manifest.json'


def verified(path, expected):
    raw = path.read_bytes()
    actual = hashlib.sha256(raw).hexdigest()
    if actual != expected:
        raise ValueError(f'{path.name}: SHA256 mismatch: {actual}; expected {expected}')
    return raw


def build(source, manifest):
    raw = verified(source, SOURCE_SHA)
    roster = json.loads(verified(manifest, MANIFEST_SHA))
    lines = raw.decode('utf-8-sig').replace('\r\n', '\n').replace('\r', '\n').splitlines(keepends=True)
    scene_re = re.compile(r'^\[(\d+) · ([^\]]+)\] (.+)$')
    chapter_re = re.compile(r'^제(\d+)부 — ')
    narrator_re = re.compile(r'^〈(.+)의 기억〉$')
    scenes, pending_chapter_start, chapter = [], None, 0
    for line_no in range(92, 920):
        line = lines[line_no - 1].rstrip('\n')
        if line_no == 92:
            scenes.append(dict(id='prologue', sequence=0, chapter=0, zone='prologue', title=line.split(' — ', 1)[1], start=92, headerLine=92))
        match = chapter_re.match(line)
        if match:
            chapter = int(match.group(1))
            pending_chapter_start = line_no
        match = scene_re.match(line)
        if match:
            number, zone, title = match.groups()
            scenes.append(dict(id=zone, sequence=int(number), chapter=chapter, zone=zone, title=title,
                               start=pending_chapter_start or line_no, headerLine=line_no))
            pending_chapter_start = None
        if line.startswith('최종장 — '):
            scenes.append(dict(id='ending', sequence=62, chapter=9, zone='ending', title=line.split(' — ', 1)[1], start=line_no, headerLine=line_no))
    assert len(scenes) == 63
    by_number = {str(s['sequence']).zfill(2): s for s in scenes if 1 <= s['sequence'] <= 61}
    primary, conditional, encounters = [], [], []
    canonical_names = {
        'mb-dist01': '보라검 천사', 'mb-dist02': '늪지대의 뿔악마',
        'dist06-boss': '발록', 'a11-boss': '루시퍼',
        'a11-cosmic-v31318': '루시퍼', 'mb-ep1a11': '초천사의 웃는 가면',
        'b02-boss': '나태의 귀 벨페고르', 'b03-boss': '레비아탄',
        'b04-boss': '베엘제붑', 'b05-boss': '서윤 · 아스모데우스',
        'b06-boss': '총지배인 · 맘몬', 'b06b-boss': '총지배인의 어린 시절 · 맘몬',
        'b07-boss': '청소부 · 분노의 귀', 'b08-boss': '회장', 'b09-boss': '회장 · 생체 부트로더',
        'u203-boss': '통제자 · 기억의 문', 'l305-boss': '고블린 두목',
        'l301-boss': '타락천사 기사', 'l303-boss': '불면귀',
        'kair-great-03': '아르벨리아', 'k103-boss': '세이렌 모르',
        'h103-boss': '악몽의 우두머리', 'c103-mid': '한리안', 'c103-boss': '백이온',
        'c104-boss': '교만의 사이보그 교주'
    }
    relation_groups = {
        'mb-ep1a11': 'lucifer', 'a11-boss': 'lucifer', 'a11-cosmic-v31318': 'lucifer',
        'b06-boss': 'hotel-general-manager-mammon', 'b06b-boss': 'hotel-general-manager-mammon',
        'b08-boss': 'hotel-chairman', 'b09-boss': 'hotel-chairman',
        'u203-boss': 'controller-memory-door', 'u203-mid': 'controller-memory-door'
    }
    for row in roster['rows']:
        scene = by_number[row['storySection']['scene']]
        is_conditional = row['status'] == 'conditional-no-new-independent-boss'
        (conditional if is_conditional else primary).append(row['bossID'])
        encounters.append(dict(id=row['bossID'], sourceName=row['name'],
                               canonicalName=canonical_names.get(row['bossID'], row['name']),
                               role=row['role'], chapter=scene['chapter'], sceneId=scene['id'],
                               conditional=is_conditional, sourceAnchors=row['sourceAnchors'],
                               sourceSection=row['storySection'],
                               relationGroup=relation_groups.get(row['bossID'], row['bossID'])))
    explicit_groups = {
        'ep1a11': [['mb-ep1a11'], ['a11-boss']],
        'u203': [['u203-mid'], ['u203-boss']],
        'cult03': [['c103-mid'], ['c103-boss']],
        'cult04': [['c104-mid'], ['c104-boss']]
    }
    outcomes = {
        'dist06': 'survive-and-fall', 'ep1a09': 'narrative', 'ep1a11': 'victory',
        'ep1b09': 'survive-and-fall', 'u203': 'end-command-link',
        'last301': 'survive-and-fall', 'kair01': 'defend-core',
        'kair02': 'restore-ally', 'hando01': 'survive-and-fall', 'hando02': 'defend-core',
        'murder01': 'investigation', 'murder02': 'investigation', 'murder04': 'investigation',
        'murder03': 'end-command-link', 'cult05': 'narrative', 'cult06': 'narrative',
        'cult04': 'authority-cut', 'ending': 'ending'
    }
    narrator = None
    for index, scene in enumerate(scenes):
        start, end = scene.pop('start'), scenes[index + 1]['start'] - 1 if index + 1 < len(scenes) else 919
        header_line = scene.pop('headerLine')
        chunk = ''.join(lines[start - 1:end])
        narrator_changes = []
        # Inherited opening speaker keeps the line of the original attribution.
        for line_no in range(start, end + 1):
            match = narrator_re.match(lines[line_no - 1].rstrip('\n'))
            if match:
                if not narrator_changes and narrator and line_no > header_line:
                    # A narrator immediately following a scene heading replaces
                    # the prior speaker before any prose, not mid-scene.
                    prose_before = [v for v in lines[header_line:line_no - 1] if v.strip()]
                    if prose_before:
                        narrator_changes.append(dict(narrator))
                narrator = dict(name=match.group(1), line=line_no)
                narrator_changes.append(dict(narrator))
        if not narrator_changes and narrator:
            narrator_changes.append(dict(narrator))
        required = [e['id'] for e in encounters if e['sceneId'] == scene['id'] and not e['conditional']]
        held = [e['id'] for e in encounters if e['sceneId'] == scene['id'] and e['conditional']]
        scene.update(sourceRange=[start, end], text=chunk, narrators=narrator_changes,
                     requiredCombatIds=required, conditionalCombatIds=held,
                     combatOrderGroups=explicit_groups.get(scene['id'], [required] if required else []),
                     outcome=outcomes.get(scene['id'], 'victory' if required else 'narrative'))
    assert len(primary) == 69 and len(conditional) == 3
    return dict(schemaVersion=1, contentRevision='storymode-canonical-1', canonicalSHA256=SOURCE_SHA,
                manifestSHA256=MANIFEST_SHA, storymodeLineRange=[92, 919], scenes=scenes,
                encounters=encounters, primaryCombatIds=primary, conditionalCombatIds=conditional)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=DEFAULT_SOURCE)
    parser.add_argument('--manifest', type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument('--output', type=Path, default=ROOT / 'src/story-data.js')
    args = parser.parse_args()
    data = build(args.source, args.manifest)
    payload = json.dumps(data, ensure_ascii=False, indent=2)
    js = "/* Generated by tools/build-story-data.py. Canonical storymode only. */\n(function(root,factory){\n'use strict';\nvar data=factory();\nif(typeof module==='object'&&module.exports)module.exports=data;\nif(root)root.HapilStoryData=data;\n}(typeof globalThis!=='undefined'?globalThis:this,function(){\n'use strict';\nreturn " + payload + ";\n}));\n"
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(js, encoding='utf-8', newline='\n')
    print(f'Built {args.output.name}: {len(data["scenes"])} scenes, 69 required + 3 conditional encounter IDs')


if __name__ == '__main__':
    main()
