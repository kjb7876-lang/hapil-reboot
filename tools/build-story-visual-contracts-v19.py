#!/usr/bin/env python3
from pathlib import Path
import json,copy
import argparse
args=argparse.ArgumentParser(description='Rebuild the source-only v19 story visual table; no source images or combat code are modified.')
args.add_argument('--metadata',default='docs/V19-SOURCE-VISUAL-CONTRACTS-20261030.json')
args.add_argument('--projectiles',default='docs/V19-STORY-PROJECTILE-CONTRACTS-20261030.json')
opt=args.parse_args();root=Path(__file__).resolve().parents[1]
meta=json.loads((root/opt.metadata).read_text(encoding='utf-8'));pr=json.loads((root/opt.projectiles).read_text(encoding='utf-8'));ac=meta['actorContracts'];images=meta['images']
def body(name,**patch):
 a=copy.deepcopy(ac[name]);a.update(patch);return a
def static(name,**patch):
 a=body(name);a['frames']=[a['frames'][0]];a['poseMap']={'idle':0,'charge':0,'release':0,'recover':0};a['authoredKeyposes']=1;a.update(patch);return a
def skill(s):
 return {'key':s['key'],'width':s['width'],'height':s['height'],'crop':s.get('objectCrop',s.get('crop',[0,0,s['width'],s['height']])),'authoredFrames':1,'turn':.12}
def source(key,crop=None):
 i=images.get(key)
 sizes={'cultDriveFold':(512,512),'cultDriveStitch':(512,512),'cultDriveImpact':(512,512),'cultLance':(512,192)}
 w,h=(i['width'],i['height']) if i else sizes[key]
 return {'key':key,'width':w,'height':h,'crop':crop or [0,0,w,h],'authoredFrames':1,'turn':.12}
rows=[
(19,'goblin-chief','last305','Goblin','storyGoblinMap','MobWolf'),
(20,'fallen-knight','last301','Knight','storyKnightMap','MobGoblin'),
(21,'insomnia','last303','Insomnia','storyInsomniaMap','MobNightmare'),
(22,'academy-defense','kair01','NeuralObelisk','storyAcademyMap','TimeCollector'),
(23,'harvest-lower','kair05','LowerGuardian','storyLowerMap','TimeCollector'),
(24,'harvest-upper','kair06','UpperGuardian','storyUpperMap','TimeCollector'),
(25,'workshop-links','kair07','CommandRing','storyWorkshopMap','TimeCollector'),
(26,'neuron-gate','kair08','NeuralObelisk','storyNeuralMap','TimeCollector'),
(27,'oblivion-links','kair09','DeletionObelisk','storyDeletionMap','TimeCollector'),
(28,'command-rings','kair10','CommandRing','storyRingsMap','TimeCollector'),
(29,'arbelia','kair02','CommandRing','storyArbeliaMap','TimeCollector'),
(30,'siren-mor','kair03','Siren','storySirenMap','TimeCollector'),
(31,'nightmare-chief','hando03','Chief','storyChiefMap','MobNightmare'),
(32,'blue-executor','murder03','Executor','storyExecutorMap','MobNightmare'),
(33,'cult-circuit','cult01','CultCircuit','storyCultMap','MobCultLeech'),
(34,'cult-pair','cult03','CultCircuit','storyPairMap','MobCultLeech'),
(35,'cult-leader','cult04',None,None,'MobCultLeech')]
# Runtime identity comes from the pure engine; this script does not define lore.
import subprocess
roster=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify(require('./src/core.js').CAMPAIGN_BOSSES.slice(18)))"],cwd=root,text=True,encoding='utf-8'))
entries=[]
for g,identity,scene,name,mapkey,mob in rows:
 identity=roster[g-19]['id'];e={'group':g,'id':identity,'sceneIds':[scene],'actors':[], 'supportActors':[], 'projectiles':pr[str(g)]}
 chapter=roster[g-19]['chapter']; e['chapter']=chapter
 if name:
  a=body(name,id=identity)
  if name=='LowerGuardian':a['scale']=.72
  if name in ['NeuralObelisk','DeletionObelisk','CultCircuit']:a['scale']=.27
  if name=='CommandRing':a['scale']=.27
  if g==34:a['scale']=.13
  e['actors']=[a]
 else:
  anchors=[[424,160],[373,198],[415,205],[381,157]]
  e['actors']=[{'id':identity,'key':'cultLeaderAtlas','width':1536,'height':1024,'frames':[{'rect':[i%2*768,i//2*512,768,512],'anchor':anchor,'pose':['idle','charge','attack','recover'][i]} for i,anchor in enumerate(anchors)],'poseMap':{'idle':0,'charge':1,'release':2,'recover':3},'scale':.30,'authoredKeyposes':4,'fullAnimationCycles':0,'sourcePivotsCertified':False}]
 e['terrain']=copy.deepcopy(meta['terrains'][mapkey]) if mapkey else {'key':'cultArena','width':1600,'height':1000,'floor':[500,270,600,300],'scene':'cult04-throne'}
 e['terrain']['scene']=scene
 e['minion']=static(mob,scale=.09 if mob=='TimeCollector' else .105)
 e['player']=body('PlayerSeoha' if chapter==5 else 'PlayerHando')
 sk=pr[str(g)];e['skills']={'cast':skill(sk['rotor']),'release':skill(sk['blade']),'laser':skill(sk['beam'])}
 shotkey='storyPlayerSeohaSlash' if chapter==5 else 'storyPlayerHandoSlash';e['playerShot']=source(shotkey,[17,24,328,313] if chapter==5 else [52,88,399,185]);e['playerShot']['displayWidth']=26
 if g==20:
  e['echoActorIndex']=0
  e['targetMarker']={'key':'storyKnightSword','width':512,'height':341,'crop':[109,2,89,329],'anchor':[154,164],'display':[20,48],'label':'검격 표식'}
 if g==22:e['supportActors']=[static('ChronoEngine',id='protected-first-command-core',scale=.14,position=[280,145],label='보호 · 최초명령 코어',stages=['boss','transition'])]
 if g==25:e['supportActors']=[static('ChronoEngine',id='preserved-time-pipes',scale=.14,position=[280,145],label='보존 · 시간 배관',stages=['boss','transition'])]
 if g==27:e['supportActors']=[static('MemoryFragment',id='protected-living-memory',scale=.25,position=[280,145],label='보호 · 살아 있는 기억',stages=['boss','transition'])]
 if g==29:e['supportActors']=[static('Arbelia',id='arbelia-autonomous-self',scale=.30,position=[280,140],label='보호 · 아르벨리아',stages=['boss','transition'])]
 if g==34:
  e['actors']=[body('Rian',participantId='han-rian',scale=.28,introScaleLimit=1.15,label='한리안'),body('Ion',participantId='baek-ion',scale=.28,introScaleLimit=1.15,label='백이온'),e['actors'][0]]
  e['actors'][2]['introScaleLimit']=1.5
  e['skills']['participants']={pid:{'cast':skill(p['rotor']),'release':skill(p['blade']),'laser':skill(p['beam'])} for pid,p in sk['participants'].items()}
  # The shared target is a circuit; no generic central human cast is invented.
  e['skills'].pop('cast',None)
 if g==35:
  e['skills']={'cast':[source('cultDriveFold'),source('cultDriveStitch'),source('cultDriveFold')],'release':[source('cultLance'),source('cultDriveStitch'),source('cultDriveImpact')],'laser':source('cultLance')}
  awake=body('PlayerAwakening');frame=copy.deepcopy(awake['frames'][0]);frame['scale']=awake['scale'];e['player']['frames'].append(frame);e['player']['awakenedFrame']=1;e['player']['authoredKeyposes']=2
 entries.append(e)
p=root/'src/story-assets.js';s=p.read_text(encoding='utf-8')
start='  /* BEGIN STORY VISUAL DATA */';end='  /* END STORY VISUAL DATA */'
if start not in s:s=s.replace('  var ENTRIES = [];',start+'\n  var ENTRIES = [];\n'+end)
a=s.index(start);b=s.index(end,a)+len(end);s=s[:a]+start+'\n  var ENTRIES = '+json.dumps(entries,ensure_ascii=False,separators=(',',':'))+';\n'+end+s[b:];p.write_text(s,encoding='utf-8')

print('Built',len(entries),'entries',len(s),'characters')
