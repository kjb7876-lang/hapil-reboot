#!/usr/bin/env python3
"""Verify chapter2 partial11 publisher bytes/pixels; copy unchanged small atlases.

This imports four authored keyposes per selected form, not animation or combat
certification. Existing assets and source art are never changed or replaced.
"""
from pathlib import Path
import argparse,hashlib,json,math,re,shutil,zipfile
from PIL import Image
EXPECTED_MANIFEST='072b8aa847edb4af6b46dcce27b2afc382fe9ea9341aee32cda83ee655656a69'
GUIDE='https://drive.google.com/file/d/1dDOazbWjgcugZ2lBE-UYcNRSz1AnmUG6/view'
ALIASES={'b06b-boss-child':'b06b-boss','b07-boss-human':'b07-boss','b08-boss-human':'b08-boss'}
ANCHORS={
 'mb-ep1b01':[[128,115],[128,128],[128,131],[128,111]],
 'b02-boss':[[130,119],[129,128],[132,131],[130,125]],
 'mb-ep1b02':[[128,113],[130,120],[128,122],[129,114]],
 'mb-ep1b04':[[128,112],[128,117],[128,114],[129,108]],
 'mb-ep1b05':[[128,111],[128,123],[128,128],[128,111]],
 'mb-ep1b06':[[133,110],[132,115],[128,124],[137,111]],
 'b06b-boss-child':[[134,113],[139,119],[138,119],[132,105]],
 'mb-ep1b06b':[[132,115],[126,122],[129,123],[130,116]],
 'b07-boss-human':[[142,112],[130,105],[132,105],[135,108]],
 'b08-boss-human':[[131,105],[134,111],[135,114],[130,105]],
 'mb-ep1b07':[[132,108],[127,103],[125,109],[128,105]],
}
NOTES={
 'mb-ep1b01':'Dark/gold masked figure with intrinsic orbiting seal plaques; four distinct upper-body/arm downcasting poses. Plaques are identity equipment, not independently authored projectile frames.',
 'b02-boss':'Corpulent seated human with skull/thorn throne and two reaching/recovering arms. Hand-shaped chair carvings remain furniture; no anatomical count claim about hidden structure.',
 'mb-ep1b02':'Green shell sentinel with lattice/spikes and bedhead shield. Crouch, forward shield and recovery visibly differ; shell/chest registration is a display convention.',
 'mb-ep1b04':'Secondary furnace-bellied twin-cleaver chef. Downward cleaver strokes and body compression are visible; this does not cover main b04 pig/toad required form.',
 'mb-ep1b05':'Secondary stage director with crown, mask, red streamers and two tethered heart lanterns. Lowered hands/lanterns and torso bow differ; not main b05 form coverage.',
 'mb-ep1b06':'Dial-headed ledger watcher with open book, chains and claws. Book stays in the same side hand while opposite claw reaches down and recovers.',
 'b06b-boss-child':'Existing b06b-boss child form, not a new encounter: black-haired child, scarf, candy hand, attached yo-yo and shadow tail. Adult primary placeholder is not silently replaced.',
 'mb-ep1b06b':'Selected v3 snow/thorn branch body with blue eyes and long claws. Explicit canonical selection conflicts with old molten/gold vault primary; no runtime-primary identity parity is claimed.',
 'b07-boss-human':'Human janitor phase0 context: dark clothes and intact broom. This is not demon/bear/wolf/dragon form coverage.',
 'b08-boss-human':'Human phase0 chairman context: gray hair and white three-piece suit, downward palm motion. No brain/screens, flying chair, sigil or demon form is supplied.',
 'mb-ep1b07':'Corrected v2 firefighter knight: shield stays viewer-left and nozzle viewer-right in all four poses, with backpack/hose. Furnace light is intrinsic; emitted flame/projectile art is absent.',
}
def sha(body):return hashlib.sha256(body).hexdigest()
def safe_path(name):
 path=Path(name);assert name and not path.is_absolute() and '..' not in path.parts and '\\' not in name,name
 return path

def main():
 project=Path(__file__).resolve().parents[1]
 parser=argparse.ArgumentParser();parser.add_argument('--source',type=Path,default=project/'drive-story-chapter2');args=parser.parse_args();source=args.source.resolve();extract=source/'extracted'
 guide=(source/'guide.md').read_text();download=[];paths=set()
 for name,url,count,expected in re.findall(r'\[([^\]]+\.zip)\]\((https:[^)]+)\)\s+(\d+)B SHA256 `([0-9a-f]{64})`',guide):
  raw=(source/'raw'/name).read_bytes();assert len(raw)==int(count) and sha(raw)==expected,name
  with zipfile.ZipFile(source/'raw'/name) as archive:
   assert archive.testzip() is None,name
   for entry in archive.infolist():
    safe_path(entry.filename);assert entry.filename not in paths,entry.filename;assert not entry.is_dir(),entry.filename;paths.add(entry.filename)
    assert (extract/entry.filename).read_bytes()==archive.read(entry),entry.filename
  download.append({'file':name,'driveURL':url,'bytes':len(raw),'sha256':expected})
 assert len(download)==17 and sum(row['bytes'] for row in download)==40391924
 metadata=json.loads((source/'drive-metadata.json').read_text());assert len(metadata)==17
 for record in metadata:
  entry,info=record['entry'],record['metadata'];assert info['id']==entry['id'] and info['mime_type']=='application/zip' and int(info['size'])==entry['bytes'] and info['title']==entry['name']
 index_raw=(project/'docs/story/LIVE-ASSET-INDEX-r5.json').read_bytes();index=json.loads(index_raw);assert index['revision']==5
 batch=next(row for row in index['accepted_batches'] if row['id']=='chapter2-partial11-20261026')
 assert batch['manifest_sha256']==EXPECTED_MANIFEST and batch['zip_count']==17 and batch['bytes']==40391924 and set(batch['form_ids'])==set(ANCHORS)
 manifest_raw=(extract/'MANIFEST.json').read_bytes();assert sha(manifest_raw)==EXPECTED_MANIFEST
 manifest=json.loads(manifest_raw);assert manifest['source_sheets']==11 and manifest['keyposes']==44 and manifest['all_chapter_required_forms_complete'] is False
 for relative,entry in manifest['files'].items():
  safe_path(relative);raw=(extract/relative).read_bytes();assert len(raw)==entry['bytes'] and sha(raw)==entry['sha256'],relative
 assert paths==set(manifest['files'])|{'MANIFEST.json'} and len(paths)==167
 assert {path.relative_to(extract).as_posix() for path in extract.rglob('*') if path.is_file()}==paths
 selection=json.loads((extract/'FORM-SELECTION.json').read_text());assert selection['batch_id']=='chapter2-partial11-20261026' and selection['supersedes_prior_batches'] is False
 assert {row[1] for row in selection['forms']}==set(ANCHORS)
 canonical=json.JSONDecoder().raw_decode((project/'src/story-data.js').read_text().split('return ',1)[1])[0];encounters={row['id']:row for row in canonical['encounters']}
 addendum=json.loads((project/'docs/story/required-forms-addendum.json').read_text());forms=addendum['requiredForms']
 target=project/'media/story-chapter2';target.mkdir(exist_ok=True)
 checks={'sourceReconstructedFrames':0,'atlasCellComparisons':0,'runtimeAtlasFilesCopiedByteExact':0,'runtimeRGBABytes':0,'opaqueDisplayAnchors':0,'opaqueThreadPoints':0,'zeroAlphaOuter8pxFrames':0}
 bodies=[]
 for group,identity,source_name in selection['forms']:
  combat_id=ALIASES.get(identity,identity);assert combat_id in encounters
  folder=extract/'derived'/identity;derivation_raw=(folder/'DERIVATION.json').read_bytes();derive=json.loads(derivation_raw);original=extract/'originals'/(identity+'.png');original_raw=original.read_bytes();assert sha(original_raw)==derive['source_sha256']
  assert Path(derive['source']).name==source_name and derive['authored_keyposes']==4 and derive['fully_interpolated_animation'] is False
  source_image=Image.open(original).convert('RGBA');frames={};poses=[]
  for frame in derive['frames']:
   x,y,w,h=frame['source_rect'];assert x>=0 and y>=0 and x+w<=source_image.width and y+h<=source_image.height
   common=tuple(frame.get('common_canvas',(w,h)));base=Image.new('RGBA',common);base.paste(source_image.crop((x,y,x+w,y+h)),tuple(frame.get('rect_translation',(0,0))))
   resized=base.resize(tuple(round(n*frame['uniform_scale']) for n in common),Image.Resampling.LANCZOS);expected=Image.new('RGBA',(frame['size'],frame['size']));expected.paste(resized,tuple(frame['translation']))
   actual_path=folder/frame['path'];actual=Image.open(actual_path).convert('RGBA');assert actual.size==expected.size and actual.tobytes()==expected.tobytes(),frame['path'];assert sha(actual_path.read_bytes())==frame['sha256'];frames[frame['path']]=actual;checks['sourceReconstructedFrames']+=1
  for cell,atlas_size in [(256,512),(512,1024)]:
   atlas=Image.open(folder/f'{identity}-atlas-{atlas_size}.png').convert('RGBA');assert atlas.size==(atlas_size,atlas_size)
   for index in range(4):
    box=((index%2)*cell,(index//2)*cell,(index%2+1)*cell,(index//2+1)*cell);assert atlas.crop(box).tobytes()==frames[f'{identity}-pose-{index+1}-{cell}.png'].tobytes();checks['atlasCellComparisons']+=1
  for index,anchor in enumerate(ANCHORS[identity]):
   frame=frames[f'{identity}-pose-{index+1}-256.png'];alpha=frame.getchannel('A');assert alpha.getpixel(tuple(anchor))>=128,(identity,index,'transparent anchor');checks['opaqueDisplayAnchors']+=1
   assert not any(alpha.crop(box).getbbox() for box in [(0,0,256,8),(0,248,256,256),(0,0,8,256),(248,0,256,256)]);checks['zeroAlphaOuter8pxFrames']+=1
   x,y=anchor[0],anchor[1]-20;candidates=[(xx,yy) for yy in range(max(8,y-12),min(248,y+13)) for xx in range(max(8,x-12),min(248,x+13)) if alpha.getpixel((xx,yy))>=128];assert candidates
   silk=min(candidates,key=lambda pair:(pair[0]-x)**2+(pair[1]-y)**2);checks['opaqueThreadPoints']+=1
   bounds=alpha.point(lambda value:255 if value>=8 else 0).getbbox();assert bounds
   poses.append({'index':index,'name':['prepare','downstroke','follow','recover'][index],'anchor':anchor,'silk':list(silk),'alpha8Bounds':list(bounds),'rgba_sha256':sha(frame.tobytes()),'sourceRect':next(frame['source_rect'] for frame in derive['frames'] if frame['path']==f'{identity}-pose-{index+1}-256.png')})
  # A conservative presentation size, not a validated collision/root transform.
  upper=max(pose['anchor'][1]-pose['alpha8Bounds'][1]+abs(pose['anchor'][0]-pose['alpha8Bounds'][0])*.009 for pose in poses);scale=math.floor(min(.70,48/max(1,upper))*10000)/10000
  runtime=folder/f'{identity}-atlas-512.png';destination=target/runtime.name;raw=runtime.read_bytes()
  if destination.exists():assert destination.read_bytes()==raw,'Refusing to replace different existing atlas: '+str(destination)
  else:shutil.copyfile(runtime,destination)
  assert destination.read_bytes()==raw;checks['runtimeAtlasFilesCopiedByteExact']+=1;checks['runtimeRGBABytes']+=512*512*4
  context=identity in ('b07-boss-human','b08-boss-human');required=[form['formID'] for form in forms if form['bossID']==combat_id]
  bodies.append({'formId':identity,'combatId':combat_id,'nativeCombatId':identity==combat_id,'sameBossFormAlias':identity!=combat_id,'contextFormOnly':context,'key':'storyChapter2'+''.join(part[0].upper()+part[1:] for part in identity.split('-')),'file':destination.relative_to(project).as_posix(),'sha256':sha(raw),'bytes':len(raw),'width':512,'height':512,'cell':256,'scale':scale,'poses':poses,'canonicalSceneId':encounters[combat_id]['sceneId'],'canonicalName':encounters[combat_id].get('canonicalName',encounters[combat_id]['sourceName']),'sourceOriginalSHA256':sha(original_raw),'sourceSheetDimensions':list(source_image.size),'derivationSHA256':sha(derivation_raw),'sourceBodyRGBAReconstructionExact':True,'runtimeAtlasOriginalBytesPreserved':True,'authoredKeyposes':4,'fullAnimationCycles':0,'manualTorsoAnchors':identity not in ('mb-ep1b02','mb-ep1b06b'),'manualDisplayAnchors':True,'registrationSemantic':'manually inspected upper-body display registration; shell/armor reference for nonhumanoid sentinel; not anatomical or physical pivot certification','physicalPivotsCertified':False,'requiredFormsForCombat':required,'requiredFormsCertifiedByThisImport':[],'allRequiredFormsComplete':False,'bodyCanonicalClearance':'keypose-only selected form candidate; independent of unverified required-form behavior and integration','reviewNotes':NOTES[identity],'gameBrowserGPUPhysicalMobileVerified':False})
 report={'schema':'hapil.story-chapter2-keyposes.v1','batch':'chapter2-partial11-20261026','liveAssetIndexRevision':5,'liveAssetIndexSHA256':sha(index_raw),'guideURL':GUIDE,'manifestSHA256':EXPECTED_MANIFEST,'sourceSheets':11,'authoredKeyposes':44,'sourceDerivedFrameFiles':88,'sourceDerivedAtlasFiles':22,'runtimeAtlasFiles':11,'fullyInterpolatedAnimation':False,'allChapterRequiredFormsComplete':False,'allRequiredFormsComplete':False,'physicalPivotsCertified':False,'gameBrowserGPUPhysicalMobileVerified':False,'existingMediaReplaced':False,'scope':'11 selected form sets, including three same-boss aliases. All source sheets and supplied atlases were visually inspected in comparison contacts; byte/RGBA reconstruction verifies packing, not topology, source approval, temporal playback or engine behavior. No image generation or repainting.','sourceValidation':{'metadataReadBeforeRawFetch':True,'officialDriveRawFileURIUsed':True,'archives':download,'archiveBytes':sum(row['bytes'] for row in download),'payloadFileCount':len(manifest['files']),'uniqueZipPaths':len(paths),'crcVerified':True,'safePaths':True,'manifestPayloadBytesAndHashesVerified':True,'checks':checks},'budget':{'runtimeEncodedPNGBytes':sum(body['bytes'] for body in bodies),'runtimeDecodedRGBABytesAllAtlases':checks['runtimeRGBABytes'],'runtimeDecodedRGBABytesPerAtlas':512*512*4,'recommendedLoading':'Load only active form atlas; no all-atlas texture preload assumed. Numbers exclude GPU copies, browser overhead, originals, 1024 atlases and contacts.','sourceOriginalPNGBytes':sum((extract/'originals'/(identity+'.png')).stat().st_size for _,identity,_ in selection['forms'])},'aliases':[{'formId':identity,'combatId':combat_id,'newEncounter':False,'contextOnly':identity in ('b07-boss-human','b08-boss-human')} for identity,combat_id in ALIASES.items()],'canonicalLimits':['b06b-boss-child is an existing boss child form; no extra encounter is added.','b07-boss-human supplies janitor phase0 only, not required bear/wolf/dragon forms.','b08-boss-human supplies white-suit phase0 only, not required brain/screens form.','mb-ep1b06b snow/thorn v3 is explicit canonical selection, not parity with the retained molten/gold vault primary.','Secondary chef/director forms do not satisfy separate main-boss canonical forms.','Static body packing and qualitative identity review do not certify form behavior, motion time/root stability, damaging warning readability or GPU/mobile results.'],'pendingValidation':['runtime body/form binding and required-form implementation','temporal playback and root/chest drift','event synchronization and damaging-warning readability','collision and combat outcome validation','real browser GPU presentation','physical mobile performance and readability'],'reviewContactFiles':[f'drive-story-chapter2/review/source-atlas-review-{index}.jpg' for index in range(1,4)],'bodies':bodies}
 output=project/'docs/story-assets/chapter2-r5.json';output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'forms':len(bodies),'checks':checks,'budget':report['budget'],'aliases':report['aliases']},indent=2))
if __name__=='__main__':main()
