#!/usr/bin/env python3
"""Verify official r5 static FX archives and copy publisher-sized candidates.

No art generation, repainting, alpha edits, rotation, collision geometry, or
animation is performed. Core-art uses publisher 64px PNGs; accents use 96px.
"""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import shutil
import stat
import zipfile
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_SHA = '809c5cb66d2d019107cda6da9175567b9870f01647f9a71f3853cb3842e852b6'
INDEX_SHA = '88b5dda6e17854312c1cbb89657ca690683683ef224ea65b35df35fbb5b6d6a7'
GUIDE = 'https://drive.google.com/file/d/1ulPFcq4GL64Zfjg0R2k6EBvvONavUqbU/view?usp=drivesdk'
ARCHIVES = [
    ('HAPIL-signature-next8-FX-01-of04.zip', '1z7A5nWllUuiQdFhxL7QmYF9AF9x7V06O', 2570048, '33272d61a424f94d8f91366e29ffda41bc3a32ea339732574c29238731bb8278'),
    ('HAPIL-signature-next8-FX-02-of04.zip', '1E6tAWOfrMIXa5jviftiSdZAmSTsTIjr0', 2780609, '12d6b353cfc6cdb39b69c11e83e7a6e7df9d50b06d190acc17c2c37a51daf3cf'),
    ('HAPIL-signature-next8-FX-03-of04.zip', '1AGt7PvTm0ZR1Xvu_W5xTfnnFR__hh7EM', 2745325, '2b39e47dc1f56a2c9304741fa6490d5921c57d905258ccb6111b41402635636f'),
    ('HAPIL-signature-next8-FX-04-of04.zip', '1c-9ISVSee4a2UYnQxv2v1aNTgWjy3A9r', 638667, '27de8ff94582324e0d817720e89a645537741850668ef254e264491489b2d578'),
]


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, default=ROOT.parent / 'drive-story-first8-fx')
    parser.add_argument('--output', type=Path, default=ROOT / 'media/story-first8-fx')
    parser.add_argument('--report', type=Path, default=ROOT / 'docs/story-assets/first8-fx-r5.json')
    parser.add_argument('--live-index', type=Path, default=ROOT.parent / 'hapil-story-work/LIVE-ASSET-INDEX-r5.json')
    args = parser.parse_args()
    index = None
    if args.live_index.exists():
        raw = args.live_index.read_bytes()
        require(sha(raw) == INDEX_SHA, 'Live index SHA mismatch')
        index = json.loads(raw)
        require(index['revision'] == 5, 'Expected live index revision 5')
    payload, archive_records = {}, []
    for name, drive_id, size, digest in ARCHIVES:
        path = args.input / name
        raw = path.read_bytes()
        require(len(raw) == size and sha(raw) == digest, f'Archive bytes/SHA mismatch: {name}')
        with zipfile.ZipFile(path) as archive:
            require(archive.testzip() is None, f'Archive CRC failure: {name}')
            for info in archive.infolist():
                member = PurePosixPath(info.filename)
                require(not member.is_absolute() and '..' not in member.parts and '\\' not in info.filename
                        and all(':' not in part for part in member.parts), f'Unsafe path: {info.filename}')
                require(not stat.S_ISLNK(info.external_attr >> 16), f'Symlink member: {info.filename}')
                require(not info.is_dir(), f'Unexpected directory entry: {info.filename}')
                content = archive.read(info)
                require(info.filename not in payload or payload[info.filename] == content,
                        f'Conflicting duplicate ZIP path: {info.filename}')
                payload[info.filename] = content
        archive_records.append(dict(file=name, driveURL=f'https://drive.google.com/file/d/{drive_id}/view?usp=drivesdk',
                                    bytes=size, sha256=digest, mimeType='application/zip', crcVerified=True, safePaths=True))
    require(len(payload) == 77, 'Expected 77 unique delivered files')
    require(sha(payload['MANIFEST.json']) == MANIFEST_SHA, 'Publisher MANIFEST SHA mismatch')
    manifest = json.loads(payload['MANIFEST.json'])
    require(set(manifest['files']) == set(payload) - {'MANIFEST.json'}, 'Manifest payload coverage mismatch')
    for name, expected in manifest['files'].items():
        require(len(payload[name]) == expected['bytes'] and sha(payload[name]) == expected['sha256'],
                f'Payload manifest mismatch: {name}')
    extracted = args.input / 'extracted'
    for name, content in payload.items():
        path = extracted / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
    selected = json.loads(payload['manifests/SELECTED-MANIFEST.json'])
    derivation = json.loads(payload['derived/DERIVATION.json'])
    require(selected['selectedDrawings'] == 16 and selected['newDrawings'] == 11
            and selected['reusedDrawings'] == 5 and selected['animatedFrames'] == 0, 'Drawing counts mismatch')
    require(len(selected['assets']) == 16 and len(derivation['rows']) == 16, 'Selected/derived row mismatch')
    variants = {}
    for row in derivation['rows']:
        require(sha(payload[row['source']]) == row['source_sha256'], f'Derivation source mismatch: {row["id"]}')
        require({v['size'] for v in row['variants']} == {32, 64, 96}, f'Expected 32/64/96 variants: {row["id"]}')
        for variant in row['variants']:
            key = 'derived/' + variant['path']
            require(sha(payload[key]) == variant['sha256'], f'Derived SHA mismatch: {key}')
            with Image.open(extracted / key) as image:
                require(image.size == (variant['size'], variant['size']) and image.mode == 'RGBA', f'Derived format mismatch: {key}')
                image.load()
        variants[row['id']] = row['variants']
    args.output.mkdir(parents=True, exist_ok=True)
    assets = []
    for row in selected['assets']:
        require(sha(payload[row['path']]) == row['sha256'] and len(payload[row['path']]) == row['bytes'], f'Selected source mismatch: {row["id"]}')
        size = 64 if row['role'] == 'core-art' else 96
        variant = next(v for v in variants[row['id']] if v['size'] == size)
        source_file = extracted / 'derived' / variant['path']
        output_file = args.output / variant['path']
        shutil.copyfile(source_file, output_file)
        require(output_file.read_bytes() == source_file.read_bytes(), f'Copy differs: {row["id"]}')
        relative = 'media/story-first8-fx/' + output_file.name
        restrictions = ['Separate engine collision body and readable outline/telegraph required.',
                        'Static decorative artwork must not be the sole damage cue.']
        orientation = 'unspecified; no runtime transform certified'
        if row['id'] == 'blood_core':
            orientation = 'authored down-left; not screen-down; engine must explicitly choose and verify a forward transform'
            restrictions.append('Do not silently assume this artwork points screen-down.')
        if row['id'] in ('root_core', 'root_hit'):
            restrictions.append('Low contrast on dark backgrounds; never use alone as a hazard warning.')
        if row['bossID'] == 'mb-ep1a08':
            restrictions.append('Perception-world imagery only; preserve medical helpers and hallucination/reality distinction.')
        assets.append(dict(combatId=row['bossID'], id=row['id'], role=row['role'],
                           key='storyFirst8Fx' + ''.join(p.title() for p in row['id'].replace('-', '_').split('_')),
                           file=relative, sha256=sha(output_file.read_bytes()), bytes=output_file.stat().st_size,
                           width=size, height=size, selectedVariantSize=size, sourcePath=row['path'],
                           sourceSHA256=row['sha256'], newDrawing=row['newGeneration'],
                           frames=1, loop=False, animatedFrames=0, orientation=orientation,
                           publisherVariantCopiedByteExact=True, eligibleAsSoleDangerCue=False,
                           collisionGeometryCertified=False, runtimeValidationStatus='consumer_codex_pending', restrictions=restrictions))
    rgba_bytes = sum(r['width'] * r['height'] * 4 for r in assets)
    receipt_path = args.input / 'drive-retrieval-receipt.json'
    receipt = json.loads(receipt_path.read_text()) if receipt_path.exists() else None
    if receipt:
        require(len(receipt['files']) == 4, 'Drive receipt file count mismatch')
        for metadata, archive in zip(receipt['files'], archive_records):
            require(metadata['filename'] == archive['file'] and metadata['metadataSize'] == archive['bytes']
                    and metadata['metadataMimeType'] == 'application/zip', 'Drive metadata receipt mismatch')
    report = dict(schema='hapil.story-first8-static-fx.v1', batch='signature-first8-static-fx', liveAssetIndexRevision=5,
                  guideURL=GUIDE, liveAssetIndexSHA256=INDEX_SHA, manifestSHA256=MANIFEST_SHA,
                  newStaticDrawings=11, reusedStaticDrawings=5, staticDrawings=16, derivedVariants=48,
                  animatedFrames=0, runtimeFiles=16, runtimeRGBABytes=rgba_bytes,
                  sourceValidation=dict(archives=archive_records, totalArchiveBytes=sum(r['bytes'] for r in archive_records),
                                        officialDriveMetadataAndRawFileUriReceipt=receipt,
                                        uniqueZipPaths=77, manifestPayloadFiles=76, manifestPayloadBytesAndHashesVerified=True,
                                        crcVerified=True, safePaths=True, all48VariantsSHAAndRGBAFormatVerified=True,
                                        runtimeFilesCopiedByteExact=True),
                  runtimeSelection='Publisher-provided 64px core-art and 96px cast/impact PNGs; no resizing, repainting or rotation.',
                  visualReview=dict(method='view_image original-size dark/light 16-row diagnostics covering all 48 variants, plus individually viewed actual 96px PNGs for all 16 drawings',
                                    reviewedDrawingIds=[r['id'] for r in assets], reviewedVariantCount=48,
                                    darkAndLightBackgroundsReviewed=True,
                                    findings=['root_core and root_hit have low contrast on dark diagnostics.',
                                              'blood_core visibly points down-left, not screen-down.',
                                              'All are static motifs; a glowing transparent accent is not certified collision geometry.']),
                  parentAssetOnlyStatus=json.loads(payload['review/PARENT-INDEPENDENT-STATIC-REVIEW.json'])['status'],
                  completionContract=index.get('completion_contract') if index else None,
                  allRequiredFormAssetsComplete=False, consumerRuntimeValidation='consumer_codex_pending',
                  allStorymodeAssetsComplete=False, combatQAVerified=False, telegraphQAVerified=False,
                  collisionQAVerified=False, gameBrowserGPUVerified=False, physicalMobileVerified=False,
                  assets=assets)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Verified 4 ZIPs / 77 files / 48 variants; copied 16 static candidates ({rgba_bytes} RGBA bytes). Runtime QA remains pending.')


if __name__ == '__main__':
    main()
