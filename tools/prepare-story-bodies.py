#!/usr/bin/env python3
"""Verify accepted first-eight keypose assets, copy unchanged runtime atlases.

No image generation/repainting. Coordinates are manually inspected display
registrations and opaque puppet-thread points, not certified physical pivots.
The batch contains four authored keyposes/body and does not certify all forms.
"""
from pathlib import Path
import argparse,hashlib,json,math,re,shutil,zipfile
from PIL import Image
EXPECTED_MANIFEST='a435ddf61c522d5395ad68ade89e8d370b3c505bc5b7904f4e9577b75e9ee957'
ANCHORS={
 'dist00-boss':[[140,117],[112,122],[140,112],[118,103]],
 'mb-dist03':[[132,102],[128,112],[138,103],[140,91]],
 'mb-dist04':[[133,85],[109,89],[147,100],[124,78]],
 'mb-dist05':[[133,91],[121,99],[141,100],[131,81]],
 'mb-dist06':[[131,115],[132,122],[135,132],[131,117]],
 'mb-ep1a07':[[138,87],[137,91],[152,96],[138,89]],
 'mb-ep1a08':[[128,105],[136,115],[143,96],[140,80]],
 'mb-ep1a10':[[129,105],[131,119],[134,120],[139,83]],
}
SEMANTICS={'mb-dist06':'central plated lava core; nonhumanoid, no anatomical torso claim','mb-ep1a07':'upper cranial/carapace registration; nonhumanoid, no anatomical torso claim'}
def sha(b):return hashlib.sha256(b).hexdigest()
def safe_path(n):
 p=Path(n)
 assert n and not p.is_absolute() and '..' not in p.parts and '\\' not in n,n
 return p

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--source',type=Path,default=Path(__file__).resolve().parents[2]/'drive-story-first8');args=parser.parse_args()
 project=Path(__file__).resolve().parents[1];source=args.source.resolve();extract=source/'extracted';manifest_bytes=(extract/'MANIFEST.json').read_bytes();assert sha(manifest_bytes)==EXPECTED_MANIFEST
 manifest=json.loads(manifest_bytes);guide=(source/'guide.md').read_text();download=[];paths=set()
 for name,url,count,expected in re.findall(r'\[([^\]]+\.zip)\]\((https:[^)]+)\)\s+(\d+)B SHA256 `([0-9a-f]{64})`',guide):
  path=source/'raw'/name;b=path.read_bytes();assert len(b)==int(count) and sha(b)==expected,name
  with zipfile.ZipFile(path) as z:
   assert z.testzip() is None,name
   for info in z.infolist():
    safe_path(info.filename);assert info.filename not in paths,info.filename;paths.add(info.filename)
    if not info.is_dir():assert (extract/info.filename).read_bytes()==z.read(info),info.filename
  download.append({'file':name,'driveURL':url,'bytes':len(b),'sha256':expected})
 assert len(download)==14 and sum(x['bytes'] for x in download)==32978246
 for relative,entry in manifest['files'].items():
  safe_path(relative);b=(extract/relative).read_bytes();assert len(b)==entry['bytes'] and sha(b)==entry['sha256'],relative
 assert set(manifest['files'])|{'MANIFEST.json'}==paths
 roster=json.loads((project/'docs/story-source/boss-scope-manifest.json').read_text());rows={r['bossID']:r for r in roster['rows']}
 # Read canonical encounter metadata without executing a browser/runtime.
 story_text=(project/'src/story-data.js').read_text();story=json.JSONDecoder().raw_decode(story_text.split('return ',1)[1])[0];encounters={r['id']:r for r in story['encounters']}
 target=project/'media/story-bodies';target.mkdir(parents=True,exist_ok=True);bodies=[];checks={'sourceReconstructedFrames':0,'atlasCellComparisons':0,'opaqueThreadPoints':0,'runtimeAtlasFilesCopiedByteExact':0,'runtimeRGBABytes':0}
 for identity,anchors in ANCHORS.items():
  assert identity in rows and identity in encounters,identity
  folder=extract/'derived'/identity;derive=json.loads((folder/'DERIVATION.json').read_text());original=extract/'originals'/(identity+'.png');original_bytes=original.read_bytes();assert sha(original_bytes)==derive['source_sha256']
  src=Image.open(original).convert('RGBA');frames={};poses=[]
  for f in derive['frames']:
   x,y,w,h=f['source_rect'];crop=src.crop((x,y,x+w,y+h));common=tuple(f.get('common_canvas',(w,h)));base=Image.new('RGBA',common);base.paste(crop,tuple(f.get('rect_translation',(0,0))));scaled=tuple(round(n*f['uniform_scale']) for n in common);expected=Image.new('RGBA',(f['size'],f['size']));expected.paste(base.resize(scaled,Image.Resampling.LANCZOS),tuple(f['translation']));actual=Image.open(folder/f['path']).convert('RGBA');assert actual.size==expected.size and actual.tobytes()==expected.tobytes(),f['path'];assert sha((folder/f['path']).read_bytes())==f['sha256'];checks['sourceReconstructedFrames']+=1;frames[f['path']]=actual
  for cell,atlas_size in [(256,512),(512,1024)]:
   atlas=Image.open(folder/f'{identity}-atlas-{atlas_size}.png').convert('RGBA');assert atlas.size==(atlas_size,atlas_size)
   for i in range(4):
    actual=atlas.crop(((i%2)*cell,(i//2)*cell,(i%2+1)*cell,(i//2+1)*cell));assert actual.tobytes()==frames[f'{identity}-pose-{i+1}-{cell}.png'].tobytes();checks['atlasCellComparisons']+=1
  for i,anchor in enumerate(anchors):
   frame=frames[f'{identity}-pose-{i+1}-256.png'];alpha=frame.getchannel('A');assert not alpha.crop((0,0,256,8)).getbbox() and not alpha.crop((0,248,256,256)).getbbox() and not alpha.crop((0,0,8,256)).getbbox() and not alpha.crop((248,0,256,256)).getbbox()
   offset=35 if identity=='mb-dist06' else 20;x,y=anchor[0],anchor[1]-offset
   candidates=[(xx,yy) for yy in range(max(8,y-16),min(248,y+17)) for xx in range(max(8,x-16),min(248,x+17)) if alpha.getpixel((xx,yy))>=128];assert candidates,(identity,i,'no opaque thread candidate');silk=min(candidates,key=lambda v:(v[0]-x)**2+(v[1]-y)**2)
   assert alpha.getpixel(silk)>=128;checks['opaqueThreadPoints']+=1
   alpha8=alpha.point(lambda p:255 if p>=8 else 0);bounds=alpha8.getbbox();assert bounds
   poses.append({'index':i,'name':['prepare','downstroke','follow','recover'][i],'anchor':anchor,'silk':list(silk),'alpha8Bounds':list(bounds),'rgba_sha256':sha(frame.tobytes()),'sourceRect':next(f['source_rect'] for f in derive['frames'] if f['path']==f'{identity}-pose-{i+1}-256.png')})
  # One display scale/identity, conservatively keeping visible alpha below
  # HUD y64 when the combat registration point is (180,116), lean +/-0.009.
  upper=max(p['anchor'][1]-p['alpha8Bounds'][1]+abs(p['anchor'][0]-p['alpha8Bounds'][0])*.009 for p in poses);scale=math.floor(min(.70,48/max(1,upper))*10000)/10000
  key='storyBody'+''.join(part[0].upper()+part[1:] for part in identity.split('-'));runtime=folder/f'{identity}-atlas-512.png';destination=target/f'{identity}-atlas-512.png';tmp=destination.with_suffix('.tmp');tmp.write_bytes(runtime.read_bytes());tmp.replace(destination);assert destination.read_bytes()==runtime.read_bytes();checks['runtimeAtlasFilesCopiedByteExact']+=1;checks['runtimeRGBABytes']+=512*512*4
  current=encounters[identity];source_row=rows[identity]
  bodies.append({'combatId':identity,'sourceName':source_row['name'],'canonicalName':current.get('canonicalName',current['sourceName']),'canonicalSceneId':current['sceneId'],'sourceZone':source_row['zone'],'sourceSection':source_row['storySection'],'sourceAnchors':source_row['sourceAnchors'],'key':key,'file':destination.relative_to(project).as_posix(),'sha256':sha(destination.read_bytes()),'bytes':destination.stat().st_size,'width':512,'height':512,'cell':256,'scale':scale,'poses':poses,'registrationSemantic':SEMANTICS.get(identity,'manually inspected upper torso display registration'),'manualTorsoAnchors':True,'physicalPivotsCertified':False,'authoredKeyposes':4,'fullAnimationCycles':0,'allRequiredFormsComplete':False,'acceptedFormScope':'root-bound-seraph body candidate only; separate black-root-overgrowth not supplied' if identity=='dist00-boss' else 'one accepted body-keypose candidate; mandatory form completeness not certified','sourceOriginalSHA256':sha(original_bytes),'derivationSHA256':sha((folder/'DERIVATION.json').read_bytes()),'sourceBodyRGBAReconstructionExact':True,'runtimeAtlasOriginalBytesPreserved':True})
 report={'schema':'hapil.story-body-keyposes.v1','batch':'first-eight-body-keyposes','liveAssetIndexRevision':3,'guideURL':'https://drive.google.com/file/d/1j-6Uskk_8Gi-Gf0nF146G74FFtrxYNJv/view?usp=drivesdk','manifestSHA256':EXPECTED_MANIFEST,'sourceSheets':8,'authoredKeyposes':32,'fullyInterpolatedAnimation':False,'allRequiredFormsComplete':False,'physicalPivotsCertified':False,'gameBrowserGPUPhysicalMobileVerified':False,'scope':'Verified source bytes/pixels and manually inspected presentation anchors. Game integration is owned by a separate runtime adapter. No invented or substituted boss identities.','sourceValidation':{'archives':download,'payloadFileCount':len(manifest['files']),'uniqueZipPaths':len(paths),'crcVerified':True,'safePaths':True,'manifestPayloadBytesAndHashesVerified':True,'checks':checks},'canonicalMappingNotes':[{'combatId':'mb-ep1a07','sourceZone':'ep1a07','currentStorySceneId':encounters['mb-ep1a07']['sceneId'],'sourceSection':rows['mb-ep1a07']['storySection'],'note':'Source ID exists in story data, but ep1a07 is currently assigned to the dist06 scene; this grouping must be explicitly reviewed in narrative integration.'},{'combatId':'mb-dist04','note':'Purple spectral knight follows accepted normalized reference; older teal skeletal variant was excluded by independent asset review. No direct prose color conflict established.'},{'combatId':'dist00-boss','note':'Root-bound seraph candidate does not certify separate black-root-overgrowth required form.'}],'bodies':bodies}
 output=project/'docs/story-assets/first-eight-r3.json';output.parent.mkdir(parents=True,exist_ok=True);tmp=output.with_suffix('.tmp');tmp.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');tmp.replace(output);print(json.dumps({'bodies':len(bodies),'checks':checks,'allRequiredFormsComplete':False,'files':[x['file'] for x in bodies]},indent=2))
if __name__=='__main__':main()
