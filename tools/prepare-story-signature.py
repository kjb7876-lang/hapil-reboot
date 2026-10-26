#!/usr/bin/env python3
"""Verify and select compact, pre-existing signature-static-r3 art.

Requires the six official independent ZIPs already downloaded and extracted at
../drive-story-signature/extracted. Never executes scripts from the source pack.
No new drawings, re-painting, alpha thresholding, or generated frames occur.
The selected runtime PNGs are byte-identical publisher 64/96px derivatives.
"""
from pathlib import Path
import hashlib,json,math
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT.parent/'drive-story-signature'/'extracted'
TRANSFER=SOURCE.parent
OUTPUT=ROOT/'media'/'story-signature'
REPORT=ROOT/'docs'/'story-assets'/'signature-static-r3.json'
MANIFEST_SHA='f447b945259bf6f973dc2de1f1dbf90bf3a62bf82082ab295d962bd726e22552'
sha=lambda b:hashlib.sha256(b).hexdigest()
manifest_bytes=(SOURCE/'MANIFEST.json').read_bytes()
assert sha(manifest_bytes)==MANIFEST_SHA,'Publisher manifest SHA mismatch'
manifest=json.loads(manifest_bytes)
actual={p.relative_to(SOURCE).as_posix() for p in SOURCE.rglob('*') if p.is_file()}
assert actual==set(manifest['files'])|{'MANIFEST.json'},'Unexpected or missing files'
for relative,spec in manifest['files'].items():
 data=(SOURCE/relative).read_bytes();assert len(data)==spec['bytes'];assert sha(data)==spec['sha256'],relative
selected=json.loads((SOURCE/'manifests'/'SELECTED-MANIFEST.json').read_text())
derivation=json.loads((SOURCE/'derived'/'DERIVATION.json').read_text())
assert len(selected['assets'])==13 and selected['animatedFrames']==0
assert manifest['new_static_drawings']==7 and manifest['reused_static_drawings']==6 and manifest['animated_frames']==0
assert len(derivation['rows'])==13 and derivation['static_only'] and derivation['alpha_edits'] is False
OUTPUT.mkdir(exist_ok=True,parents=True);REPORT.parent.mkdir(exist_ok=True,parents=True)
records=[];source_checks=[];variant_checks=[];keys_by_boss={}
contrast={'violet':'The violet knot is faint on light backgrounds, especially at 32px.',
 'horn':'The swamp cast is faint on dark backgrounds, especially at 32px.',
 'balrog':'No contrast waiver: actual combat-screen contrast is still unverified.',
 'mask':'The ivory/red fan is faint on light backgrounds, especially at 32px.',
 'lucifer':'The ivory/blue ring is faint on light backgrounds, especially at 32px.'}
for asset in selected['assets']:
 source_path=SOURCE/asset['path'];source=Image.open(source_path).convert('RGBA')
 assert sha(source_path.read_bytes())==asset['sha256']
 assert list(source.size)==asset['size']
 assert list(source.getchannel('A').getextrema())==asset['alphaExtrema']
 assert list(source.getchannel('A').getbbox())==asset['alphaBBox']
 source_checks.append({'id':asset['id'],'sha256':asset['sha256'],'size':list(source.size),'rgba_sha256':sha(source.tobytes()),'alpha_bbox':list(source.getchannel('A').getbbox()),'alpha_extrema':list(source.getchannel('A').getextrema())})
 row=next(v for v in derivation['rows'] if v['id']==asset['id'])
 assert row['source']==asset['path'] and row['source_sha256']==asset['sha256']
 for variant in row['variants']:
  file=SOURCE/'derived'/variant['path'];published=Image.open(file).convert('RGBA');assert published.size==(variant['size'],variant['size'])
  assert sha(file.read_bytes())==variant['sha256']
  # Reproduce the declared full-source uniform scale and transparent padding.
  # paste without a mask preserves original resized alpha instead of multiplying it.
  resized=source.resize((round(source.width*variant['scale']),round(source.height*variant['scale'])),Image.Resampling.LANCZOS)
  expected=Image.new('RGBA',published.size,(0,0,0,0));expected.paste(resized,tuple(variant['translation']))
  assert expected.tobytes()==published.tobytes(),asset['id']+' published derivative mismatch'
  variant_checks.append({'id':asset['id'],'size':variant['size'],'file':file.relative_to(SOURCE).as_posix(),'sha256':variant['sha256'],'rgba_exact_to_declared_full_canvas_derivation':True})
 size=96 if asset['role']=='cast' else 64
 variant=next(v for v in row['variants'] if v['size']==size)
 source_variant=SOURCE/'derived'/variant['path'];target=OUTPUT/(asset['id']+'.png');data=source_variant.read_bytes()
 temporary=target.with_suffix('.tmp');temporary.write_bytes(data);temporary.replace(target)
 runtime=Image.open(target).convert('RGBA');assert sha(target.read_bytes())==variant['sha256']
 key='signature'+''.join(word[:1].upper()+word[1:] for word in asset['id'].replace('_','-').split('-'))
 authored_direction=None
 if asset['id'] in ['violet_blade_spindle','swamp_needle_reedthorn','balrog_blade_slagfang']:authored_direction=0
 if asset['id']=='mask-feather-core-static':authored_direction=math.pi/2
 record={'key':key,'id':asset['id'],'boss':asset['boss'],'publisher_role':asset['role'],'source_origin':'reused' if asset['reuse'] else 'new_static_in_publisher_pack',
  'source_file':asset['path'],'source_sha256':asset['sha256'],'source_dimensions':asset['size'],
  'file':target.relative_to(ROOT).as_posix(),'sha256':sha(data),'bytes':len(data),'dimensions':[size,size],'rgba_bytes':size*size*4,'rgba_sha256':sha(runtime.tobytes()),'alpha_sha256':sha(runtime.getchannel('A').tobytes()),
  'publisher_derivative_file':source_variant.relative_to(SOURCE).as_posix(),'publisher_derivative_sha256':variant['sha256'],'publisher_derivative_bytes_unchanged':True,
  'derivation':{'source_canvas_cropped':False,'source_rgba_repainted':False,'alpha_threshold_used':False,'uniform_scale':variant['scale'],'translation_px':variant['translation'],'exact_rgba_reproduced':True},
  'frame_count':1,'animated_frames':0,'loop':False,'proposed_anchor_px':[size/2,size/2],'anchor_status':'canvas-center placement proposal, not a verified physical/contact/emitter pivot','authored_direction_radians':authored_direction,'direction_status':'visual observation only; collision/flight orientation not certified',
  'damage_geometry_status':'unverified original art; do not derive collision from raster alpha or use as sole hazard warning',
  'cast_usage':'single static decoration with consumer-authored fade/motion only; not an authored continuous animation','game_integration_status':'pending','visual_review_caveat':contrast[asset['boss']]}
 records.append(record);keys_by_boss.setdefault(asset['boss'],[]).append(key)
archive=json.loads((TRANSFER/'archive-verification.json').read_text())
report={'schema':'Hapil.story-signature-static-r3.v1','status':'VERIFIED_STATIC_DERIVATIVES_PENDING_GAME_INTEGRATION','source_guide_url':archive['guideURL'],'source_manifest_sha256':MANIFEST_SHA,
 'source_counts':{'new_static_drawings':7,'reused_static_drawings':6,'total_static_drawings':13,'published_size_derivatives':39,'animated_frames':0},
 'verification':{'archive_parts':archive['parts'],'zip_total_bytes':archive['zipTotalBytes'],'archive_crc_passed':6,'safe_unique_paths':60,'manifest_declared_files_sha_verified':59,'manifest_self_sha_verified':True,'source_images_dimensions_alpha_and_sha_verified':13,'publisher_derivative_exact_rgba_reproductions':39,'runtime_files_sha_verified':13},
 'runtime_summary':{'asset_count':len(records),'decoded_rgba_bytes':sum(r['rgba_bytes'] for r in records),'encoded_bytes':sum(r['bytes'] for r in records),'cast_size_px':96,'core_art_size_px':64,'static_only':True,'new_drawings_created_by_consumer':0,'new_animation_frames_created_by_consumer':0},
 'mapping_basis':'Exact publisher boss and asset IDs only. This package supplies no R90 native boss-ID mapping and no new canonical named skills.',
 'asset_keys_by_boss':keys_by_boss,'assets':records,'source_image_checks':source_checks,'publisher_variant_checks':variant_checks,
 'source_review':{'readme_sha256':sha((SOURCE/'README.md').read_bytes()),'selected_manifest_sha256':sha((SOURCE/'manifests'/'SELECTED-MANIFEST.json').read_bytes()),'independent_review_sha256':sha((SOURCE/'review'/'INDEPENDENT-STATIC-FX-REVIEW.md').read_bytes()),'source_visual_review':'All 13 selected source drawings and both provided dark/light 32/64/96px contact sheets inspected. Static families distinguish cocoon/crystal, swamp seed/reed, lava, ivory/red feather and ivory-opal/blue-gold ring. Contrast caveats retained.', 'actual_game_execution_verified':False,'actual_browser_gpu_verified':False,'physical_mobile_verified':False},
 'integration_constraints':['Cast images are decoration only and must never become the sole damaging attack or laser-warning indicator.','Keep authoritative circle/capsule/beam damage, committed warning geometry and timing independent from image alpha.','Source originals have not been certified as normalized danger-body assets.','Any static fade/translation/rotation is consumer motion, not publisher-authored continuous animation.','Actual emission/contact pivots, collision silhouette, screen overlap/contrast and game/GPU/mobile tests remain pending.']}
REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':report['status'],'runtime':report['runtime_summary'],'source_checks':len(source_checks),'exact_variants':len(variant_checks),'registry':str(REPORT)},ensure_ascii=False))
