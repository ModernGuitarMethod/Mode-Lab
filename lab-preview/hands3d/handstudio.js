(function(){
  let THREE=null, ready=null;
  const loadScript=src=>new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
  function loadThree(){ if(ready) return ready; ready=(async()=>{ if(!window.THREE) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'); if(!window.THREE.GLTFLoader) await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js'); if(!window.THREE.OrbitControls){ try{ await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js'); }catch(e){} }   /* lets learners turn and zoom the hand */ THREE=window.THREE; const c=document.createElement('canvas'); if(!(c.getContext('webgl')||c.getContext('experimental-webgl'))) throw new Error('no WebGL'); return THREE; })(); return ready; }
  /* one studio = its own hand, scene and camera */
  function makeStudio(box,opts){ return loadThree().then(()=>new Promise((res,rej)=>{
    const PXCM=1; let bones={}, bind={}, axes={}, group=new THREE.Group(), ARM=null; const CH={}, FN={1:'index',2:'middle',3:'ring',4:'pinky'};
    const V=(x,y,z)=>new THREE.Vector3(x,y,z); const wpos=n=>{ const v=new THREE.Vector3(); bones[n].getWorldPosition(v); return v; };
    /* studio copy of the joint engine: the WebXR hand's joints are independent (a flat list, positioned directly by a headset), so bending
   is done here with forward kinematics: each joint rotates, carrying every joint beyond it with it. */
function setupAxes(){ group.position.set(0,0,0); group.quaternion.identity(); group.scale.set(1,1,1); group.updateMatrixWorld(true);
  ARM=bones['wrist'].parent;
  const L=nm=>bones[nm].position.clone();                     /* armature-space positions */
  Object.keys(FN).forEach(n=>{ const f=FN[n]; CH[n]=['metacarpal','phalanx-proximal','phalanx-intermediate','phalanx-distal','tip'].map(j=>`${f}-finger-${j}`); });
  CH.T=['thumb-metacarpal','thumb-phalanx-proximal','thumb-phalanx-distal','thumb-tip'];
  Object.keys(bones).forEach(nm=>{ bind[nm]={p:bones[nm].position.clone(),q:bones[nm].quaternion.clone()}; });
  /* de-mitten: fan the finger roots apart across the palm and set a diagonal knuckle line (middle highest, pinky lowest).
     Moves the bind pose of each finger's chain from the proximal joint out; the skin follows the bones. */
  { const Kd=L('pinky-finger-phalanx-proximal').sub(L('index-finger-phalanx-proximal')), pw=Kd.length(); Kd.normalize(); const Fd0=L('middle-finger-tip').sub(L('wrist')).normalize();
    const SPR={1:-0.07,2:-0.02,3:0.03,4:0.09}, RISE={1:0.03,2:0.05,3:0.0,4:-0.07}; window.__DEMITTEN=window.__DEMITTEN!==false;
    if(window.__DEMITTEN) Object.keys(FN).forEach(n=>{ const off=Kd.clone().multiplyScalar(SPR[n]*pw).add(Fd0.clone().multiplyScalar(RISE[n]*pw)); CH[n].slice(1).forEach(nm=>{ bind[nm].p.add(off); bones[nm].position.copy(bind[nm].p); }); }); }
  const K=L('pinky-finger-phalanx-proximal').sub(L('index-finger-phalanx-proximal')).normalize();
  const Fd=L('middle-finger-tip').sub(L('wrist')).normalize();
  let N=new THREE.Vector3().crossVectors(Fd,K).normalize(); if(N.dot(L('thumb-tip').sub(L('middle-finger-phalanx-proximal')))<0) N.negate();
  const Fo=new THREE.Vector3().crossVectors(N,K).normalize(); if(Fo.dot(Fd)<0) Fo.negate();
  axes.K=K; axes.F=Fo; axes.N=N; axes.sign=1;
  /* which rotation direction curls toward the palm? */
  const t0=L('index-finger-tip'); setFinger(1,{m:0.5,p:0,d:0,a:0}); const moved=L('index-finger-tip').sub(t0); axes.sign=moved.dot(N)>0?1:-1; setFinger(1,{m:0,p:0,d:0,a:0});
  /* tuck the thumb up behind the neck, as in real playing */
  tuckThumb();
  /* armature space → world: hand orientation built from the armature's own axes */
  const Kw=V(-1,0,0), Nw=V(0,0,-1), Fw=V(0,1,0); const mW=new THREE.Matrix4().makeBasis(Kw,Fw,Nw), mM=new THREE.Matrix4().makeBasis(K,Fo,N);
  const armQ=new THREE.Quaternion(); ARM.getWorldQuaternion(armQ);
  axes.base=new THREE.Quaternion().setFromRotationMatrix(mW.multiply(mM.invert())).multiply(armQ.clone().invert());
  const s=new THREE.Vector3(); ARM.getWorldScale(s); axes.armScale=s.x||1; axes.scale=PXCM*100/axes.armScale; }
function fk(chain,rots){ /* rots: [[jointIndex, quaternion], …] applied in order, each about its joint's current position */
  const P=chain.map(nm=>bind[nm].p.clone()), Q=chain.map(nm=>bind[nm].q.clone());
  rots.forEach(([j,r])=>{ const pv=P[j].clone(); for(let k=j;k<chain.length;k++){ if(k>j){ P[k].sub(pv).applyQuaternion(r).add(pv); } Q[k].premultiply(r); } });
  chain.forEach((nm,k)=>{ bones[nm].position.copy(P[k]); bones[nm].quaternion.copy(Q[k]); }); }
function setFinger(n,q){ const S=axes.sign, K=axes.K, N=axes.N;
  const abd=new THREE.Quaternion().setFromAxisAngle(N,q.a||0);
  const Kr=K.clone().applyQuaternion(abd);
  const r1=new THREE.Quaternion().setFromAxisAngle(Kr,S*q.m).multiply(abd), r2=new THREE.Quaternion().setFromAxisAngle(Kr,S*q.p), r3=new THREE.Quaternion().setFromAxisAngle(Kr,S*q.d);
  fk(CH[n],[[1,r1],[2,r2],[3,r3]]); }
function thumbBaseShift(o){ /* thumb-only reach: slide the thumb's metacarpal base (CMC/web) by a small world offset o=[x,y,z] cm */
  const c=CH.T, b0=bones[c[0]], par=b0.parent; par.updateMatrixWorld(true); const w0=bind[c[0]].p.clone(); const wp=par.localToWorld(w0.clone()); const wl=par.worldToLocal(wp.clone().add(new THREE.Vector3(o[0],o[1],o[2]))); return wl.sub(w0); }
function setThumb(q){ const c=CH.T, K=axes.K, F=axes.F, N=axes.N;
  const yaw=new THREE.Quaternion().setFromAxisAngle(F,q.y), pitch=new THREE.Quaternion().setFromAxisAngle(K,q.p);
  const base=yaw.multiply(pitch); const fa=K.clone().applyQuaternion(base);
  fk(c,[[0,base],[1,new THREE.Quaternion().setFromAxisAngle(fa,q.f)],[2,new THREE.Quaternion().setFromAxisAngle(fa,q.f*0.8)]]); if(q.o&&(q.o[0]||q.o[1]||q.o[2])){ const d=thumbBaseShift(q.o); for(const nm of c) bones[nm].position.add(d); } }
function solveThumb(tgt){ /* tgt: world point on the back of the neck */
  const err=q=>{ setThumb(q); const t=wpos('thumb-tip'); return t.distanceToSquared(tgt); };
  let best={y:0,p:0,f:0.2}, be=err(best);
  for(let y=-2.6;y<=2.6;y+=0.2) for(let p=-2.6;p<=2.6;p+=0.2) for(let f=0;f<=1.6;f+=0.2){ const q={y,p,f}, e=err(q); if(e<be){ be=e; best=q; } }
  let st=0.1; for(let it=0;it<5;it++){ let imp=true,g=0; while(imp&&g++<25){ imp=false; for(const k of ['y','p','f']) for(const sg of [-1,1]){ const q=Object.assign({},best); q[k]+=sg*st; if(k==='f') q.f=Math.max(0,Math.min(1.7,q.f)); const e=err(q); if(e<be){ be=e; best=q; imp=true; } } } st/=2; }
  best.miss=Math.sqrt(be); return best; }
/* thumb-only reach solve, fingers untouched: joint angles plus up to OMAX cm of base slide; tip kept behind the neck (z<=zMax) */
function solveThumbX(tgt,zMax,OMAX){ OMAX=OMAX||1.4; const b0=solveThumb(tgt); if(b0.miss<0.15) return b0;
  const err=q=>{ setThumb(q); const t=wpos('thumb-tip'); const on=Math.hypot(...q.o); let e=t.distanceToSquared(tgt)+0.02*on*on; if(t.z>zMax) e+=50*(t.z-zMax)*(t.z-zMax); if(on>OMAX) e+=100*(on-OMAX)*(on-OMAX); return e; };
  let best=Object.assign({},b0,{o:[0,0,0]}), be=err(best); const ST={y:0.1,p:0.1,f:0.1,ox:0.4,oy:0.4,oz:0.4};
  for(let it=0;it<6;it++){ let imp=true,g=0; while(imp&&g++<30){ imp=false; for(const k in ST) for(const sg of [-1,1]){ const q=Object.assign({},best,{o:best.o.slice()}); const dv=sg*ST[k]/(1<<it); if(k[0]==='o') q.o['xyz'.indexOf(k[1])]+=dv; else q[k]+=dv; q.f=Math.max(0,Math.min(1.7,q.f)); const e=err(q); if(e<be){ be=e; best=q; imp=true; } } } }
  setThumb(best); best.miss=wpos('thumb-tip').distanceTo(tgt); return best; }
function tuckThumb(){ const c=CH.T; const base=bind[c[0]].p, tip=bind[c[3]].p; const dir=tip.clone().sub(base).normalize();
  const want=axes.F.clone().multiplyScalar(0.55).add(axes.N.clone().multiplyScalar(0.85)).normalize();   /* up toward the neck and into it */
  const r=new THREE.Quaternion().setFromUnitVectors(dir,want); fk(c,[[0,r]]); }
/* place the whole hand for a hand position: knuckles just below the treble edge, leaning toward the headstock less as it moves up the neck */
function placeHand(pos){ /* wrist dropped straight down: fingers meet the strings at close to a right angle */ const lean=THREE.MathUtils.degToRad(Math.max(1.5,6-(pos-1)*0.5));
  const q=new THREE.Quaternion().setFromAxisAngle(V(0,0,1),-lean).multiply(new THREE.Quaternion().setFromAxisAngle(V(1,0,0),THREE.MathUtils.degToRad(46))).multiply(axes.base);
  group.quaternion.copy(q); group.scale.setScalar(axes.scale); group.position.set(0,0,0); group.updateMatrixWorld(true);
  const mc=wpos('middle-finger-phalanx-proximal'); const L=NS-1, xs=noteXY(L,pos+1.2), tx=xs[0]-PXCM*0.3, ty=-(P(L,pos+1.2)[1]+SPACE*0.85+PXCM*2.1);
  group.position.set(tx-mc.x, ty-mc.y, -PXCM*0.3-mc.z); group.updateMatrixWorld(true); }
/* solve one finger: the joint angles that put the fingertip on its target, touching the fretboard (z≈0) */

    const canvas=document.createElement('canvas'); canvas.className='hs-canvas'; box.appendChild(canvas);
    const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true}); renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1)); renderer.outputEncoding=THREE.sRGBEncoding;
    const scene=new THREE.Scene(); const cam=new THREE.PerspectiveCamera(30,1,0.01,10);
    scene.add(new THREE.HemisphereLight(0xfff2e4,0x6a4a3a,0.9)); const key=new THREE.DirectionalLight(0xffffff,0.9); key.position.set(-0.4,0.8,1); scene.add(key); const fill=new THREE.DirectionalLight(0xffe2cc,0.35); fill.position.set(0.6,-0.2,0.5); scene.add(fill);
    scene.add(group);
    const b64=window.__KL_HANDGLB; const bin=atob(b64), u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i);
    new THREE.GLTFLoader().parse(u.buffer,'',g=>{ group.add(g.scene);
      g.scene.traverse(o=>{ if(o.isSkinnedMesh){ o.material=new THREE.MeshStandardMaterial({color:0xdca286,roughness:0.58,metalness:0,skinning:true,emissive:0x2a120a,emissiveIntensity:0.25,side:THREE.DoubleSide}); o.frustumCulled=false; }
        if(o.isBone||o.type==='Bone'||/finger|thumb|wrist/.test(o.name)) bones[o.name]=o; });
      setupAxes();
      /* a forearm from the wrist out of view, so the hand never shows the model's open wrist */
      { const w=bind['wrist'].p.clone(), m=bind['middle-finger-phalanx-proximal'].p.clone(); const dir=w.clone().sub(m).normalize(); const L=/[?&]hand=seg/.test(location.search)?0.30:0.2;
        const geo=new THREE.CylinderGeometry(/[?&]hand=seg/.test(location.search)?0.037:0.03,/[?&]hand=seg/.test(location.search)?0.026:0.027,L,28,1,true); const arm=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0xdca286,roughness:0.6,metalness:0,emissive:0x2a120a,emissiveIntensity:0.25,side:THREE.DoubleSide}));
        arm.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir); arm.position.copy(w.clone().add(dir.clone().multiplyScalar(L/2-0.012))); arm.scale.set(1,1,0.78);
        const holder=new THREE.Group(); holder.add(arm); const armPar=bones['wrist'].parent; armPar.add(holder); }
      /* knuckle ridge: a small skin-coloured bulge riding on each knuckle joint */
      if(/[?&]hand=seg/.test(location.search)) { const kmat=new THREE.MeshStandardMaterial({color:0xd89c80,roughness:0.6,metalness:0,emissive:0x2a120a,emissiveIntensity:0.25});
        Object.keys(FN).forEach(n=>{ const b=bones[FN[n]+'-finger-phalanx-proximal']; if(!b) return; const k=new THREE.Mesh(new THREE.SphereGeometry(1,16,10),kmat); const r=({1:0.0088,2:0.0092,3:0.0085,4:0.0072})[n]; k.scale.set(r,r*0.8,r); b.add(k); }); }
      if(opts.right) group.scale.x=-1; group.updateMatrixWorld(true);
      /* the thumb with each joint bent on its own, for shapes like the L of a thumb hooked round a neck */
      const setThumb2=q=>{ const c=CH.T, K=axes.K, F=axes.F; const yaw=new THREE.Quaternion().setFromAxisAngle(F,q.y), pitch=new THREE.Quaternion().setFromAxisAngle(K,q.p);
        const base=yaw.multiply(pitch); const fa=K.clone().applyQuaternion(base); fk(c,[[0,base],[1,new THREE.Quaternion().setFromAxisAngle(fa,q.f1)],[2,new THREE.Quaternion().setFromAxisAngle(fa,q.f2)]]); };
      res({THREE,scene,cam,renderer,canvas,group,bones,axes,wpos,setFinger,setThumb,setThumb2,solveThumb,solveThumbX,FN,CH,V}); },rej); })); }
  window.KL_HANDSTUDIO={ make:makeStudio, load:loadThree };
})();
