#!/usr/bin/env bash
# HARD RULE guard: the approved Gibson headstock must never change.
# Fails (exit 1) if the locked asset, its per-part geometry/texture/material hashes, the body GLB or lpglb.js stop honouring the lock.
set -euo pipefail
D="$(cd "$(dirname "$0")/.." && pwd)"; A="$D/assets"; fail(){ echo "HEADSTOCK GUARD FAIL: $*" >&2; exit 1; }
( cd "$A" && sha256sum -c --quiet headstock-locked.glb.sha256 ) || fail "headstock-locked.glb checksum differs from headstock-locked.glb.sha256"
python3 - "$A" <<'PY' || exit 1
import json,struct,hashlib,sys,re
A=sys.argv[1]; HS=re.compile(r'^(headstock|inlay_diamond|truss_|hs_|tuner_|bushing|post)')
def load(p):
  d=open(p,'rb').read();n=struct.unpack('<I',d[12:16])[0];return json.loads(d[20:20+n]),d[20+n+8:]
j,b=load(A+'/headstock-locked.glb')
def bv(i): v=j['bufferViews'][i]; o=v.get('byteOffset',0); return b[o:o+v['byteLength']]
want=json.load(open(A+'/headstock-locked.parts.json')); got={'nodes':{},'images':{},'materials':{}}
for nd in j['nodes']:
  if 'mesh' not in nd: continue
  h=hashlib.sha256(json.dumps([nd.get('translation'),nd.get('rotation'),nd.get('scale')]).encode())
  for pr in j['meshes'][nd['mesh']]['primitives']:
    dr=pr.get('extensions',{}).get('KHR_draco_mesh_compression'); h.update(bv(dr['bufferView']) if dr else b''); h.update(j['materials'][pr.get('material',0)]['name'].encode())
  got['nodes'][nd['name']]=h.hexdigest()[:16]
for im in j.get('images',[]): got['images'][im['name']]=hashlib.sha256(bv(im['bufferView'])).hexdigest()[:16]
for m in j['materials']: got['materials'][m['name']]=hashlib.sha256(json.dumps(m,sort_keys=True).encode()).hexdigest()[:16]
bad=[(k,n) for k in want for n in set(want[k])|set(got[k]) if want[k].get(n)!=got[k].get(n)]
if bad: print('HEADSTOCK GUARD FAIL: part hashes differ:',bad,file=sys.stderr); sys.exit(1)
jb,_=load(A+'/lp-body.glb'); leak=[nd['name'] for nd in jb['nodes'] if HS.match(nd.get('name',''))]
if leak: print('HEADSTOCK GUARD FAIL: body GLB carries headstock parts:',leak,file=sys.stderr); sys.exit(1)
print('parts ok:',len(got['nodes']),'meshes,',len(got['images']),'textures,',len(got['materials']),'materials; body GLB clean')
PY
H=$(cut -c1-12 "$A/headstock-locked.glb.sha256")
grep -q "assets/headstock-locked.glb?h=$H" "$D/lpglb.js" || fail "lpglb.js does not load assets/headstock-locked.glb?h=$H"
grep -q "addLockedHeadstock(src,m,T)" "$D/lpglb.js" || fail "lpglb.js no longer adds the locked headstock"
grep -q "q.userData&&q.userData.locked) return" "$D/lpglb.js" || fail "material tweaks no longer skip the locked headstock"
if grep -qF "load('assets/lp.glb" "$D/lpglb.js" || grep -qF "ld('assets/lp.glb" "$D/lpglb.js"; then fail "lpglb.js loads the old combined lp.glb"; fi
echo "headstock lock OK ($H)"
