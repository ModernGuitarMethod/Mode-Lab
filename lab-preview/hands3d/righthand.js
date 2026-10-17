/* Right (picking) hand: the same Study Lab hand mesh (KL_HANDSTUDIO, right:true = mirrored), grip copied from the
   Study Lab "Holding a pick" demo (index curled, pick on the side of the fingertip segment, thumb clamped on it).
   Guitar: pick between the neck pickup and the bridge (soundhole on the acoustic), forearm over the upper body edge.
   Bass: fingerstyle, index/middle alternate rest strokes, thumb anchored on the pickup.
   Time: each event's attack = the moment showEvent fires + ATT (showEvent runs 60 ms ahead of the audio). */
(function(){
const RH={ready:false, ATT:60, SCALE:0.92}; window.RH=RH;
let R=null, THREE=null, pick=null, loc={}, cur=null;
const box=document.createElement('div'); box.style.cssText='position:absolute;width:2px;height:2px;left:-10px;top:-10px;overflow:hidden';
function pickMesh(){ const s=new THREE.Shape(); const w=0.0125, h=0.027;
  s.moveTo(0,h*0.5); s.bezierCurveTo(w*0.55,h*0.5,w,h*0.42,w,h*0.18); s.bezierCurveTo(w,-h*0.05,w*0.35,-h*0.35,0,-h*0.5); s.bezierCurveTo(-w*0.35,-h*0.35,-w,-h*0.05,-w,h*0.18); s.bezierCurveTo(-w,h*0.42,-w*0.55,h*0.5,0,h*0.5);
  const g=new THREE.ExtrudeGeometry(s,{depth:0.0009,bevelEnabled:true,bevelThickness:0.0003,bevelSize:0.0004,bevelSegments:2}); g.translate(0,0,-0.00045);
  const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0xd4a017,roughness:0.35,metalness:0.1,side:THREE.DoubleSide})); m.renderOrder=3; return m; }
const isBass=()=>INSTR[INST].bass;
/* ---- the grip, in the hand's own (metre, mirrored) frame ---- */
function grip(){ const g=R.group; g.position.set(0,0,0); g.quaternion.identity(); g.scale.set(-1,1,1); g.updateMatrixWorld(true); const wp=R.wpos;
  if(isBass()){ pick.visible=false; [1,2].forEach(n=>R.setFinger(n,{m:0.55,p:0.5,d:0.3,a:0})); [3,4].forEach(n=>R.setFinger(n,{m:0.9,p:1.1,d:0.7,a:0})); R.setThumb({y:0.3,p:-0.1,f:0.1}); g.updateMatrixWorld(true);
    loc.tip=g.worldToLocal(wp('index-finger-tip')); loc.tipM=g.worldToLocal(wp('middle-finger-tip')); loc.wrist=g.worldToLocal(wp('wrist')); loc.thumb=g.worldToLocal(wp('thumb-tip')); return; }
  R.setFinger(1,{m:1.0,p:1.35,d:0.75,a:0}); [2,3,4].forEach(n=>R.setFinger(n,{m:1.25,p:1.55,d:0.95,a:0})); g.updateMatrixWorld(true);
  const dip=wp('index-finger-phalanx-distal'), tip=wp('index-finger-tip');
  const side=wp('index-finger-phalanx-proximal').sub(wp('pinky-finger-phalanx-proximal')).normalize();
  const dir=tip.clone().sub(dip).normalize(); const nrm=side.clone().sub(dir.clone().multiplyScalar(side.dot(dir))).normalize(); const x=new THREE.Vector3().crossVectors(dir,nrm).normalize();
  const point=tip.clone().add(dir.clone().multiplyScalar(0.006)); const M=new THREE.Matrix4().makeBasis(x,dir,nrm);
  const pos=point.clone().sub(dir.clone().multiplyScalar(0.0135)).add(nrm.clone().multiplyScalar(0.007)); M.setPosition(pos);
  R.solveThumb(pos.clone().add(nrm.clone().multiplyScalar(0.0075))); g.updateMatrixWorld(true);
  const L=new THREE.Matrix4().copy(g.matrixWorld).invert().multiply(M); pick.matrixAutoUpdate=false; pick.matrix.copy(L); pick.visible=true;
  loc.tip=g.worldToLocal(pos.clone().add(dir.clone().multiplyScalar(0.0135))); loc.dir=g.worldToLocal(pos.clone().add(dir)).sub(g.worldToLocal(pos.clone())).normalize(); loc.wrist=g.worldToLocal(wp('wrist')); }
/* place the hand so the pick tip (bass: index tip) sits at world point T with the forearm along A */
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
function place(T,useM){ const k=R.axes.scale*RH.SCALE, g=R.group; const Sv=v=>V(-v.x*k,v.y*k,v.z*k); const TL=useM&&loc.tipM?loc.tipM:loc.tip;
  const a=Sv(loc.wrist.clone().sub(loc.tip)).normalize(); let b=isBass()?V(0,0,1):Sv(loc.dir).normalize(); b.sub(a.clone().multiplyScalar(a.dot(b))).normalize();
  const A=V(-0.32,0.9,0.28).normalize(); let B=isBass()?V(0,0,1):V(0,-0.3,-1).normalize(); B.sub(A.clone().multiplyScalar(A.dot(B))).normalize();
  const m1=new THREE.Matrix4().makeBasis(a,b,a.clone().cross(b)), m2=new THREE.Matrix4().makeBasis(A,B,A.clone().cross(B)); const q=new THREE.Quaternion().setFromRotationMatrix(m2.multiply(m1.transpose()));
  g.scale.set(-k,k,k); g.quaternion.copy(q); g.position.copy(T.clone().sub(Sv(TL).applyQuaternion(q))); g.updateMatrixWorld(true); }
/* geometry helpers on the 3D guitar (world cm) */
function pickPx(I){ if(I.hole) return I.hole.x; const L=I.S*I.SL; return Math.max(...I.sad.map(q=>q[0]))+(I.bass?0.15:0.17)*L*0.5; }
function sY(I,s,px){ return -CM(I,strY(I,Math.max(0,Math.min(I.nut.length-1,s)),px)); }
function sZ(I,s,px){ const i=Math.max(0,Math.min(I.nut.length-1,s)); return typeof restZ==='function'&&I.radius?restZ(I,i,px):0.16+I.gauge[i]/2; }
/* stroke plan for an event: tip path in y from y0 to y1, crossing the target strings at the attack */
function plan(e){ const I=INSTR[INST]; let px=pickPx(I); if(e&&e.pm) px=Math.max(...I.sad.map(q=>q[0]))+1.4/2.54*I.S;
  const ss=(e&&e.notes||[]).filter(n=>!n.support).map(n=>photoStr(n.s)).sort((a,b)=>a-b); const dir=e&&e.pick&&e.pick.dir||'D';
  if(!ss.length) return {px,y0:sY(I,2,px),y1:sY(I,2,px),z:sZ(I,2,px)+0.6,s:[],dir};
  const lo=ss[0], hi=ss[ss.length-1], sp=Math.abs(sY(I,1,px)-sY(I,0,px)), z=Math.max(...ss.map(s=>sZ(I,s,px)))+0.02;
  const yTop=sY(I,lo,px)+sp*0.45, yBot=sY(I,hi,px)-sp*0.45;   /* low E is +y: a downstroke moves -y */
  let d2=dir; if(e&&e.brush) d2=(e.brush===2||e.brush===4)?'D':'U';   /* rake / brush direction from the file */
  return d2==='D'?{px,y0:yTop,y1:yBot,z,s:ss,dir:d2,sp}:{px,y0:yBot,y1:yTop,z,s:ss,dir:d2,sp}; }
/* tip position u ms after showEvent */
function tipAt(P,u,e){ const I=INSTR[INST]; const att=RH.ATT, n=P.s.length; const yc=n?(sY(I,P.s[0],P.px)+sY(I,P.s[n-1],P.px))/2:P.y0;
  const sweep=e&&e.brush?Math.max(140,Math.min(400,e.brushDur||200)):n>=3?90:36; let t=(u-(att-sweep/2))/sweep; t=Math.max(0,Math.min(1,t)); if(n<3&&n){ /* single note: cross exactly at the attack */ }
  let y=P.y0+(P.y1-P.y0)*t; if(n>=1&&n<3&&!(e&&e.brush)){ y=yc+(P.y1-P.y0)*(t-0.5); }
  let z=P.z+(t<=0||t>=1?0.35:0.0);
  const tPre=att-sweep/2; if(cur&&cur.from&&u<tPre&&!(e&&e.tremolo)){ const w=Math.max(0,u)/Math.max(1,tPre), ww=w*w*(3-2*w); const pre=V(CM(I,P.px),y,z); return cur.from.clone().lerp(pre,ww).add(V(0,0,Math.sin(Math.PI*ww)*0.3)); }
  /* pick slide: the pick edge stays on the wound string and scrapes along it (5 = down: toward the neck, 6 = up: toward the bridge) */
  const ps=e&&e.notes&&e.notes.find(q=>q.slideOut===5||q.slideOut===6);
  if(ps&&u>att){ const dms=window.EVDURMS||500, w=Math.min(1,(u-att)/(dms*0.85)), ww=w*w*(3-2*w); const sy=sY(I,photoStr(ps.s),P.px); const dx=(ps.slideOut===5?1:-1)*CM(I,I.S*2.0)*ww;
    RH.pickSlide={w:+ww.toFixed(2),dxCm:+dx.toFixed(2)}; return V(CM(I,P.px)+dx,sy,P.z-0.03); }
  if(e&&e.tremolo&&u>att){ const w=Math.sin((u-att)/1000*2*Math.PI*12); y=yc+w*(P.sp||0.4)*0.4; z=P.z; }
  return V(CM(I,P.px),y,z); }
RH.show=(i,e)=>{ if(!RH.ready) return; if(RH.gi!==INST){ grip(); RH.gi=INST; } if(!isBass()) [2,3,4].forEach(n=>R.setFinger(n,{m:1.25,p:1.55,d:0.95,a:0})); cur={i,e,P:plan(e),t0:performance.now(),from:RH.lastTip?RH.lastTip.clone():null}; if(isBass()) cur.f=e&&e.pick&&e.pick.f==='m'?2:1; };
function bassFinger(T,n){ /* small IK: the plucking finger's tip onto T, the other stays relaxed */ const wp=R.wpos; let best=null,be=1e9;
  for(let m=0.1;m<=1.4;m+=0.1) for(let p=0.1;p<=1.4;p+=0.15){ R.setFinger(n,{m,p,d:p*0.6,a:0}); const e=wp((n===1?'index':'middle')+'-finger-tip').distanceToSquared(T); if(e<be){ be=e; best={m,p}; } }
  R.setFinger(n,{m:best.m,p:best.p,d:best.p*0.6,a:0}); return Math.sqrt(be); }
RH.pose=(u)=>{ if(!RH.ready||!cur) return null; const I=INSTR[INST];
  if(isBass()){ const px=pickPx(I); const ss=(cur.e&&cur.e.notes||[]).filter(n=>!n.support).map(n=>photoStr(n.s)); const s0=ss.length?ss[0]:0; const f=cur.f||1;
    /* rest stroke: the plucking fingertip draws through the string toward the low E and comes to rest on the next string (or the pickup) */
    [1,2].forEach(n=>R.setFinger(n,n===f?{m:0.5,p:0.45,d:0.27,a:0}:{m:0.9,p:0.9,d:0.55,a:0})); R.group.updateMatrixWorld(true);
    const nm=(f===2?'middle':'index')+'-finger-tip'; loc.tipM=R.group.worldToLocal(R.wpos(nm)); const sp=Math.abs(sY(I,1,px)-sY(I,0,px));
    const tr=Math.max(-0.5,Math.min(1,(u-RH.ATT)/70)); const T=V(CM(I,px),sY(I,s0,px)+tr*sp*0.9,sZ(I,s0,px)+(tr<0?0:0)-0.02);
    if(cur.e&&cur.e.slap){ R.setThumb({y:0.3,p:-0.1,f:0.05}); R.group.updateMatrixWorld(true); loc.tipM=R.group.worldToLocal(R.wpos('thumb-tip')); const b=u<RH.ATT?(RH.ATT-u)/RH.ATT:Math.min(1,(u-RH.ATT)/80); const Ts=V(CM(I,px)+CM(I,I.S*3),sY(I,s0,px),sZ(I,s0,px)+0.05+b*1.2); place(Ts,true); RH.lastTip=Ts; RH.miss=0; RH.slapT=true; return R.group; }
    RH.slapT=false; let T2=T; if(cur.e&&cur.e.pop){ const a=Math.max(0,Math.min(1,(u-RH.ATT)/60)); T2=V(T.x,sY(I,s0,px)-0.1,sZ(I,s0,px)-0.12+a*0.9); }
    place(T2,true); RH.lastTip=T2; RH.miss=0;
    /* thumb anchored on the pickup (rests on the E string when playing the higher strings) */ const key=s0+':'+f; RH.TH=RH.TH||{}; if(!RH.TH[key]){ /* thumb rests on the low E (or the pickup edge above it when plucking the E): best reachable point along the string */ let bb=null;
      for(let dx=-6;dx<=6;dx+=1){ const anc=s0>0?V(CM(I,px)+dx,sY(I,0,px)+0.1,sZ(I,0,px)+0.12):V(CM(I,px)+dx,sY(I,0,px)+1.2,sZ(I,0,px)+0.4); const q=R.solveThumbX?R.solveThumbX(anc,9,1.4):R.solveThumb(anc); if(!bb||q.miss<bb.miss){ bb=q; bb.anc=anc; } }
      RH.TH[key]=bb; } R.setThumb(RH.TH[key]); R.group.updateMatrixWorld(true); RH.thumbMiss=+R.wpos('thumb-tip').distanceTo(RH.TH[key].anc).toFixed(2);
    return R.group; }
  if(cur.e&&cur.e.tap&&cur.e.notes&&cur.e.notes.length){ /* right-hand tapping: pick tucked in the curled index, the middle finger taps the fret and flicks off */
    const n=cur.e.notes[0]; const Pn=noteWorld(n.s,n.f,strTopZ(n.s)); const down=u<RH.ATT?1-(RH.ATT-u)/RH.ATT*0.6:u<RH.ATT+150?1:Math.max(0,1-(u-RH.ATT-150)/120);
    R.setFinger(2,{m:0.35,p:0.3,d:0.18,a:0}); R.group.updateMatrixWorld(true); loc.tipM=R.group.worldToLocal(R.wpos('middle-finger-tip')); const T=Pn.clone(); T.z+=(1-down)*1.0; T.y-=(u>RH.ATT+150?(u-RH.ATT-150)/120*0.5:0); place(T,true); RH.lastTip=T; RH.miss=R.wpos('middle-finger-tip').distanceTo(T); cur.tapF=2; return R.group; }
  const T=tipAt(cur.P,u,cur.e); place(T); RH.lastTip=T;
  if(cur.e&&cur.e.notes&&cur.e.notes.some(n=>n.harmType===3)){ const env=u<RH.ATT?0:u>RH.ATT+90?0:Math.sin(Math.PI*(u-RH.ATT)/90); if(env>0){ const th=R.wpos('thumb-tip'); const s0=cur.P.s[0]; const tgt=V(th.x,sY(INSTR[INST],s0,cur.P.px),sZ(INSTR[INST],s0,cur.P.px)+0.12); R.group.position.add(tgt.sub(th).multiplyScalar(env)); R.group.updateMatrixWorld(true); RH.pinch=+env.toFixed(2); } }
  return R.group; };
RH.update=(now)=>{ if(!RH.ready||!cur) return; RH.pose(window.RHT!=null?window.RHT:now-cur.t0); };
/* verify: at the attack the pick tip (bass: plucking tip) must be on each target string */
RH.check=(i,e)=>{ RH.show(i,e); const I=INSTR[INST]; const P=cur.P; const out=[];
  if(e&&e.tap&&!isBass()){ const n=e.notes[0]; RH.pose(RH.ATT+40); const T=R.wpos('middle-finger-tip'), Pn=noteWorld(n.s,n.f,strTopZ(n.s)); return [{s:photoStr(n.s),tap:true,latMm:+(Math.abs(T.y-Pn.y)*10).toFixed(2),xMm:+((T.x-Pn.x)*10).toFixed(2),zAboveMm:+((T.z-Pn.z)*10).toFixed(2),ikMissMm:+(RH.miss*10).toFixed(2)}]; }
  if(!P.s.length) return out; const n=P.s.length, sweep=e&&e.brush?400:n>=3?90:36;
  P.s.forEach((s,k)=>{ const ys=sY(I,s,P.px); let best=1e9,bu=0; for(let u=RH.ATT-sweep;u<=RH.ATT+sweep;u+=1){ RH.pose(u); const T=RH.tipWorld(); const d=Math.abs(T.y-ys); if(d<best){ best=d; bu=u; } }
    RH.pose(bu); const T=RH.tipWorld(); out.push({s:s, crossMs:bu-RH.ATT, latMm:+(Math.abs(T.y-ys)*10).toFixed(2), zAboveMm:+((T.z-sZ(I,s,P.px))*10).toFixed(2), xMm:+((T.x-CM(I,P.px))*10).toFixed(2)}); });
  return out; };
RH.tipWorld=()=>{ if(RH.slapT) return R.wpos('thumb-tip'); if(cur&&cur.tapF&&cur.e&&cur.e.tap) return R.wpos('middle-finger-tip'); if(isBass()) return R.wpos((cur&&cur.f===2?'middle':'index')+'-finger-tip'); return R.group.localToWorld(loc.tip.clone()); };
RH.init=()=>{ if(RH.busy) return; RH.busy=1; document.body.appendChild(box); return KL_HANDSTUDIO.make(box,{right:true}).then(st=>{ R=st; THREE=S3.THREE; RH.R=R; pick=pickMesh(); R.group.add(pick); S3.scene.add(R.group); RH.regrip(); RH.ready=true; if(typeof CURI!=='undefined'&&RES&&RES.events[CURI]) RH.show(CURI,RES.events[CURI]); }); };
RH.regrip=()=>{ if(R) grip(); };
})();
