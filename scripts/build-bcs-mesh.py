"""GLB ilustrativo derivado das formas do módulo original; exige revisão anatômica.
Reproduzir: python scripts/build-bcs-mesh.py. Não é um modelo clínico validado.
"""
import json,math,struct,re,ast
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=(root/'public/bcs-fase14.html').read_text()
parts=[]
# Preserva as superfícies autoradas, com a mesma geometria e regiões do módulo.
for group,name,pos,scale,mat,region in re.findall(r"ellipsoid\((skinGroup|markings|faceGroup),'([^']+)',(\[[^\]]+\]),(\[[^\]]+\]),(\w+)(?:,'([^']+)')?\);",source):
 if 'side' in pos:continue
 parts.append((name,ast.literal_eval(pos),ast.literal_eval(scale),mat,region or 'fixed'))
for side in [-1,1]:
 for name,pos,scale,region in [('frontUpper',[.45,.29*side,.76],[.17,.17,.42],'limb'),('frontLower',[.48,.29*side,.37],[.105,.11,.36],'fixed'),('frontPaw',[.60,.29*side,.08],[.23,.15,.09],'fixed'),('rearThigh',[-.92,.27*side,.72],[.25,.22,.42],'limb'),('rearHock',[-.82,.27*side,.33],[.11,.12,.35],'fixed'),('rearPaw',[-.67,.27*side,.08],[.24,.15,.09],'fixed')]:parts.append((name,pos,scale,'skinMat',region))
 for name,pos,scale,mat in [('sock',[.51,.30*side,.25],[.115,.12,.17],'markMat'),('eye',[1.31,.265*side,1.57],[.064,.032,.054],'eyeMat'),('pupil',[1.325,.292*side,1.57],[.027,.012,.029],'noseMat'),('innerEar',[1.08,.265*side,1.80],[.11,.022,.19],'markMat')]:parts.append((name,pos,scale,mat,'fixed'))
for i in range(6):parts.append(('tail',[-1.45-.25*i,0,.91-.12*i],[.25,.15-.014*i,.15-.014*i],'markMat' if i>=5 else 'skinMat','tail'))
regions={'thorax':[.03,-.05,.34,-.16,.20,-.08,0,0],'abdomen':[.06,-.08,.62,-.30,.58,-.35,-.20,.12],'pelvis':[.08,-.04,.48,-.14,.28,-.10,-.05,.02],'tail':[.18,-.05,.70,-.12,.62,-.12,-.04,.01],'neck':[.04,-.03,.22,-.07,.20,-.06,-.02,.01],'limb':[.02,-.03,.13,-.08,.12,-.06,-.01,.01],'fixed':[0,0,.02,-.02,.02,-.02,0,0]}
def point(part,u,score=5,mcs=0):
 name,pos,scale,mat,region=part;v=regions[region];lean=max(0,(5-score)/4);obese=max(0,(score-5)/4)
 factors=[1+v[j]*obese+v[j+1]*lean for j in [0,2,4]];offset=v[6]*obese+v[7]*lean
 effect=0;muscle=0
 if 'head' in name.lower():effect=.20;muscle=1
 elif any(n in name.lower() for n in ['neck','thorax','frontupper']):effect=.12;muscle=.78
 elif 'abdomen' in name.lower():effect=.12;muscle=.90
 elif any(n in name.lower() for n in ['pelvis','rearthigh']):effect=.16;muscle=1
 if mat=='skinMat':
  for j,mult in enumerate([.25,1,.65]):factors[j]*=1-effect*mult*mcs/3*muscle
 return [pos[j]+u[j]*scale[j]*factors[j]+(offset if j==2 else 0) for j in range(3)]
materials=[('skinMat',[.025,.047,.067,1]),('markMat',[.67,.65,.60,1]),('noseMat',[.006,.009,.014,1]),('eyeMat',[.1,.36,.65,1])]
bin_data=bytearray();views=[];accessors=[]
def array(vals,kind='VEC3',indices=False,bounds=False):
 while len(bin_data)%4:bin_data.append(0)
 flat=vals if indices else [c for v in vals for c in v];offset=len(bin_data)
 bin_data.extend(struct.pack('<'+('I' if indices else 'f')*len(flat),*flat));view=len(views);views.append({'buffer':0,'byteOffset':offset,'byteLength':len(bin_data)-offset,'target':34963 if indices else 34962})
 entry={'bufferView':view,'componentType':5125 if indices else 5126,'count':len(vals),'type':kind}
 if bounds:entry.update(min=[min(v[j] for v in vals) for j in range(3)],max=[max(v[j] for v in vals) for j in range(3)])
 accessors.append(entry);return len(accessors)-1
names=[f'BCS{i}' for i in range(1,10)]+['MCS_MILD','MCS_MODERATE','MCS_SEVERE'];primitives=[]
for material_index,(material_name,_) in enumerate(materials):
 vertices=[];normals=[];indices=[];morphs=[[] for _ in names]
 for part in parts:
  if part[3]!=material_name:continue
  start=len(vertices);w=28;h=18
  for iy in range(h+1):
   theta=math.pi*iy/h
   for ix in range(w+1):
    phi=2*math.pi*ix/w;u=[math.sin(theta)*math.cos(phi),math.sin(theta)*math.sin(phi),math.cos(theta)];base=point(part,u);vertices.append(base)
    n=[u[j]/part[2][j] for j in range(3)];length=math.sqrt(sum(k*k for k in n));normals.append([k/length for k in n])
    for k in range(12):
     target=point(part,u,k+1 if k<9 else 5,0 if k<9 else k-8);morphs[k].append([target[j]-base[j] for j in range(3)])
  for iy in range(h):
   for ix in range(w):
    a=start+iy*(w+1)+ix;b=a+w+1;indices.extend([a,b,a+1,b,b+1,a+1])
 if not vertices:continue
 primitives.append({'attributes':{'POSITION':array(vertices,bounds=True),'NORMAL':array(normals)},'indices':array(indices,'SCALAR',True),'material':material_index,'targets':[{'POSITION':array(m)} for m in morphs]})
doc={'asset':{'version':'2.0','generator':'Meu Bichu — modelo ilustrativo, revisão anatômica pendente'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'mesh':0,'name':'Border Collie — ilustrativo'}],'meshes':[{'primitives':primitives,'weights':[0]*12,'extras':{'targetNames':names}}],'materials':[{'name':n,'pbrMetallicRoughness':{'baseColorFactor':c,'metallicFactor':0,'roughnessFactor':.72}} for n,c in materials],'buffers':[{'byteLength':len(bin_data)}],'bufferViews':views,'accessors':accessors}
encoded=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode();encoded+=b' '*((-len(encoded))%4);bin_data+=b'\0'*((-len(bin_data))%4)
blob=struct.pack('<III',0x46546c67,2,12+8+len(encoded)+8+len(bin_data))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(bin_data),0x004e4942)+bin_data
path=root/'public/models/border-collie-illustrative.glb';path.write_bytes(blob);print(f'{path.name}: {len(parts)} superfícies, {len(blob)} bytes, 12 alvos técnicos')
