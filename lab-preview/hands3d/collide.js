/* Hand-vs-instrument collision: skinned-hand vertices against the radiused fretboard, the neck's C-profile and the real string cylinders.
   COL.fix(P): after a pose is solved, lift any finger that penetrates (0 mm tolerance) and re-seat pressing pads on their string (<=1 mm);
   COL.check(ids): per-event report (penetration, contact error of pressing pads, hover height/clearance of free fingers, thumb clearance). */
window.HCOL=(function(){ let DW=null;
  let M=null, FID=null, IDX=null, BN=null; const v=()=>new S3.THREE.Vector3();
  function init(){ if(M) return true; let mesh=null; S3.group.traverse(o=>{ if(o.isSkinnedMesh&&!mesh) mesh=o; }); if(!mesh) return false; M=mesh;
    const g=mesh.geometry, si=g.attributes.skinIndex, sw=g.attributes.skinWeight, B=mesh.skeleton.bones, n=g.attributes.position.count; FID=new Int8Array(n); const idx=[];
    const fOf=nm=>/metacarpal/i.test(nm)&&!/thumb/i.test(nm)?0:/index/i.test(nm)?1:/middle/i.test(nm)?2:/ring/i.test(nm)?3:/pinky|little/i.test(nm)?4:/thumb/i.test(nm)?5:0;
    for(let i=0;i<n;i++){ let bw=-1,bi=0; for(let c=0;c<4;c++){ const w=sw.array[i*4+c]; if(w>bw){ bw=w; bi=si.array[i*4+c]; } } FID[i]=fOf(B[bi].name); { let dw=0; for(let c=0;c<4;c++){ const nm=B[si.array[i*4+c]].name; if(sw.array[i*4+c]>0.001&&/finger-(phalanx-distal|tip)$/.test(nm)) dw+=sw.array[i*4+c]; } (DW||(DW=new Float32Array(n)))[i]=dw; } (BN||(BN=new Int16Array(n)))[i]=bi; if(FID[i]>=1&&FID[i]<=4||i%4===0) idx.push(i); }
    IDX=Int32Array.from(idx); return true; }
  function verts(){ S3.group.updateMatrixWorld(true); M.skeleton.update(); const out=new Float32Array(IDX.length*3), t=v(); const inv=new S3.THREE.Matrix4().copy(GUIT.matrixWorld).invert();
    for(let k=0;k<IDX.length;k++){ M.boneTransform(IDX[k],t); t.applyMatrix4(M.matrixWorld).applyMatrix4(inv); { const f=FID[IDX[k]], FP=window.FLATP; if(FP&&FP.v&&f>=1&&f<=4&&DW[IDX[k]]>0.5){ const pl=FP.v.getComponent(f-1); if(pl>-1e3&&t.z<pl){ const w=Math.min(1,Math.max(0,(DW[IDX[k]]-0.5)/0.4)); t.z+=(pl-t.z)*w*w*(3-2*w); } } } out[k*3]=t.x; out[k*3+1]=t.y; out[k*3+2]=t.z; } return out; }
  function strSegs(){ const G=GUIT.userData.strG; if(!G) return []; const S=[]; const up=new S3.THREE.Vector3(0,1,0);
    G.children.forEach(m=>{ const h=m.geometry.parameters.height, r=m.geometry.parameters.radiusTop; const d=up.clone().applyQuaternion(m.quaternion).multiplyScalar(h/2); S.push({a:m.position.clone().sub(d),b:m.position.clone().add(d),r}); }); return S; }
  function segDist(p,s){ const ax=s.a.x,ay=s.a.y,az=s.a.z, bx=s.b.x-ax,by=s.b.y-ay,bz=s.b.z-az; const t=Math.max(0,Math.min(1,((p.x-ax)*bx+(p.y-ay)*by+(p.z-az)*bz)/(bx*bx+by*by+bz*bz))); const dx=p.x-ax-bx*t,dy=p.y-ay-by*t,dz=p.z-az-bz*t; return Math.sqrt(dx*dx+dy*dy+dz*dz); }
  /* signed penetration (cm, >0 = inside) of point p into board+neck solid */
  function neckPen(I,x,y,z,dir){ const px=x/2.54*I.S, xN=I.nut[0][0], xE=GUIT.userData.xE, x0=fretPx(I,I.join); if(px>xN+0.3/2.54*I.S||px<xE) return -1;
    const yT=GUIT.userData.yTop(Math.min(px,xN)), yB=GUIT.userData.yBot(Math.min(px,xN)), yc=(yT+yB)/2, hw=(yT-yB)/2, dy=Math.abs(y-yc); if(dy>hw) return -1;
    const zb=-boardDrop(I,Math.min(px,xN),y); if(z>zb) return -1; const fbT=0.6; let zbot;
    if(px<x0) zbot=zb-fbT; else { const dep=neckDepAt(I,px); zbot=dy<hw*0.98?-fbT-(dep-fbT)*Math.sqrt(Math.max(0,1-Math.pow(dy/(hw*0.98),2))):-fbT; }
    if(z<zbot) return -1; if(dir==='back') return z-zbot+1e-4; if(dir==='top') return Math.min(zb-z,hw-dy)+1e-4; return Math.min(zb-z,z-zbot,hw-dy); }
  /* full measure of the current applied pose */
  function measure(e){ if(e&&typeof solveEv==='function') e=solveEv(e); init(); const I=INSTR[INST]; const V=verts(), segs=strSegs(), p=v(); const F={}; for(let k=1;k<=5;k++) F[k]={pen:0,penObj:'',minStr:1e9,minZ:1e9,clear:1e9};
    for(let q=0;q<IDX.length;q++){ const f=FID[IDX[q]]; p.set(V[q*3],V[q*3+1],V[q*3+2]); const R=F[f]||(F[f]={pen:0,penObj:'',minStr:1e9,minZ:1e9,clear:1e9});
      const np=neckPen(I,p.x,p.y,p.z,(f===5||f===0)?'back':'top'); if(np>R.pen){ R.pen=np; R.penObj='board/neck:'+M.skeleton.bones[BN[IDX[q]]].name; }
      if(p.z<1.2&&p.z>-0.4) for(const s of segs){ const d=segDist(p,s)-s.r; if(-d>R.pen){ R.pen=-d; R.penObj='string'; } if(d<R.minStr) R.minStr=d; }
      if(np<0){ const px=p.x/2.54*I.S; if(px>GUIT.userData.xE&&px<I.nut[0][0]){ const yT=GUIT.userData.yTop(px), yB=GUIT.userData.yBot(px); if(p.y<yT&&p.y>yB&&p.z>-0.1) R.clear=Math.min(R.clear,p.z+boardDrop(I,px,p.y)); } } }
    /* v13 hard fret check: every pressed note's assigned pad must sit inside its own fret space (1 mm clear of both wires). Error (cm) is added to that finger's pen so every fix step treats leaving the fret like penetration; penReal keeps the true penetration for reporting. */
    for(let k=0;k<=5;k++) if(F[k]) F[k].penReal=F[k].pen;
    /* v13 hard string check: a pressing finger's pad must sit over its string (within 2.5 mm sideways; double-stop = between its two strings; barres skipped) */
    if(window.LATGUARD&&e&&e.notes&&typeof padPoint==='function'){ const by={}; e.notes.forEach((n,j)=>{ const k=e.fingers[j]; if(k>=1&&k<=4&&n.f>0&&!n.harm) (by[k]=by[k]||[]).push(n); });
      for(const k in by){ const ns=by[k]; if(ns.length>2) continue; const fs=new Set(ns.map(n=>n.f)); if(ns.length===2&&(fs.size>1||Math.abs(ns[0].s-ns[1].s)!==1)) continue; const y=ns.reduce((a,n)=>a+noteWorld(n.s,n.f,strTopZ(n.s)).y,0)/ns.length; const err=Math.max(0,Math.abs(padPoint(+k).y-y)-0.25); if(err>0&&F[k]){ F[k].pen+=err; F[k].lat=(F[k].lat||0)+err; if(!/lat/.test(F[k].penObj)) F[k].penObj=(F[k].penObj?F[k].penObj+'+':'')+'lat'; } } }
    if(!window.NOFRETGUARD&&e&&e.notes) e.notes.forEach((n,j)=>{ const k=e.fingers[j]; if(!(k>=1&&k<=4)||!(n.f>0)||n.harm||typeof padPoint!=='function') return; const fx=f=>CM(I,fretR(I,f)); const lo=fx(n.f)+0.1, hi=fx(n.f-1)-0.1; const x=padPoint(k).x; const err=Math.max(0,lo-x,x-hi); if(err>0){ F[k].pen+=err; F[k].fret=(F[k].fret||0)+err; if(!/fret/.test(F[k].penObj)) F[k].penObj=(F[k].penObj?F[k].penObj+'+':'')+'fret'; } });
    return F; }
  function pressInfo(e,P){ const on={}; for(let k=1;k<=4;k++) on[k]=!!(P.fing[k]&&P.fing[k].on); return on; }
  /* lift a penetrating finger by stepping its MCP flex until clear; then re-seat pressing pads down to contact */
  const HOV=[0.6,1.4];   /* duck-bill hover: free fingertips 6-14 mm above the strings */
  function obj(F,on){ let o=0; for(let k=0;k<=5;k++){ const R=F[k]; if(!R) continue; o+=R.pen*400; if(k>=1&&k<=4){ if(on[k]) o+=Math.max(0,R.minStr-0.05)*4; else o+=Math.max(0,HOV[0]-R.minStr)*2+Math.max(0,R.minStr-HOV[1])*1.5; } } return o; }
  /* anatomical joint limits (same as the IK clamp): no MCP hyperextension beyond -0.2 rad, no negative PIP/DIP */
  const lim=q=>{ if(q.m!=null) q.m=Math.max(0,Math.min(1.6,q.m)); if(q.p!=null&&q.d!=null){ q.d=Math.max(q.p*0.45,Math.min(q.p*0.95+0.15,q.d)); } if(q.p!=null) q.p=Math.max(0,Math.min(1.9,q.p)); if(q.d!=null) q.d=Math.max(0,Math.min(1.5,q.d)); if(q.a!=null) q.a=Math.max(-0.4,Math.min(0.4,q.a)); return q; };
  function stamp(){ return GUIT?GUIT.uuid+'|'+(GUIT.userData.strG?GUIT.userData.strG.children.length:0)+'|'+(GUIT.userData.xE?1:0):''; }
  function fix0(P,e){ if(!P||!init()||!GUIT||!GUIT.userData.yTop||!GUIT.userData.xE||!GUIT.userData.strG) return P; if(P._colfix===stamp()||P._colfix===1) return P; P._colfix=stamp(); applyPose(P); for(let k=1;k<=4;k++) if(P.fing[k]){ lim(P.fing[k]); S3.setFinger(k,P.fing[k]); } const on=pressInfo(e,P); let F=measure(e), best=obj(F,on);
    const tryStep=(apply,undo)=>{ apply(); const F2=measure(e), o2=obj(F2,on); if(o2<best-1e-4){ best=o2; F=F2; return true; } undo(); return false; };
    const g=S3.group, p0=P.G.pos.clone();
    const objHand=F2=>((F2[0]?F2[0].pen:0)+(F2[5]?F2[5].pen:0))*400+[1,2,3,4].reduce((s,k)=>s+(F2[k]?F2[k].pen:0),0)*400+obj(F2,on)*0.02;
    for(let round=0;round<3;round++){
    /* 1) whole hand: clear palm/thumb out of the neck only (finger penetration is fixed by flexing in step 3), coarse-to-fine, max 4 cm */
    if((F[0]&&F[0].pen>0)||(F[5]&&F[5].pen>0)){ let bh=objHand(F); for(const st of [0.25,0.1,0.04,0.015,0.006]) for(let it=0;it<40;it++){ let moved=false; for(const ax of (window.FIXZ?['z']:['z','y','x'])) for(const d of [st,-st]){ if(Math.abs(P.G.pos[ax]+d-p0[ax])>4.0) continue; P.G.pos[ax]+=d; g.position.copy(P.G.pos); g.updateMatrixWorld(true); const F2=measure(e), o2=objHand(F2); if(o2<bh-1e-5){ bh=o2; F=F2; moved=true; } else { P.G.pos[ax]-=d; g.position.copy(P.G.pos); g.updateMatrixWorld(true); } } if(!moved) break; } best=obj(F,on); }
    /* 2) thumb: greedy on its own parameters */
    if(P.thumb&&F[5]&&F[5].pen>0){ const keys=[]; for(const k in P.thumb){ if(typeof P.thumb[k]==='number'&&k!=='miss') keys.push([k,null]); else if(Array.isArray(P.thumb[k])) P.thumb[k].forEach((_,j)=>keys.push([k,j])); }
      for(const st of [0.12,0.05,0.02,0.008]) for(let it=0;it<30&&F[5].pen>0;it++){ let moved=false; for(const [k,j] of keys) for(const d of [st,-st]){ const get=()=>j==null?P.thumb[k]:P.thumb[k][j], set=v=>{ if(j==null) P.thumb[k]=v; else P.thumb[k][j]=v; }; const v0=get(); if(tryStep(()=>{ set(v0+d); S3.setThumb(P.thumb); },()=>{ set(v0); S3.setThumb(P.thumb); })) moved=true; } if(!moved) break; } }
    /* 2b) thumb still inside the neck: minimise the thumb's own penetration only (joint angles + base slide o), the thumb never touches the strings so nothing else is traded */
    if(P.thumb&&F[5]&&F[5].pen>0){ const T=P.thumb; if(!Array.isArray(T.o)) T.o=[0,0,0]; const ks=[['y',null],['p',null],['f',null],['o',0],['o',1],['o',2]]; let pb=F[5].pen;
      for(const st of [0.15,0.06,0.025,0.01]) for(let it=0;it<30&&pb>0;it++){ let moved=false; for(const [k,j] of ks) for(const d of [st,-st]){ const get=()=>j==null?T[k]:T[k][j], set=v=>{ if(j==null) T[k]=v; else T[k][j]=v; }; const v0=get(); if(typeof v0!=='number') continue; set(v0+d); S3.setThumb(T); const F2=measure(e); if(F2[5].pen<pb-1e-6&&[1,2,3,4].every(q=>!F2[q]||F2[q].pen<=(F[q]?F[q].pen:0)+1e-6)){ pb=F2[5].pen; F=F2; moved=true; } else { set(v0); S3.setThumb(T); } } if(!moved) break; } best=obj(F,on); }
    /* 3) each finger: flex until pressing pads touch their string (no penetration) and free fingers hover in the duck-bill band */
    for(let k=1;k<=4;k++){ const q=P.fing[k]; if(!q) continue; for(const st of [0.05,0.02,0.008]) for(let it=0;it<25;it++){ let moved=false; for(const [f,d] of [['m',st],['m',-st],['p',st],['p',-st]]){ if(q[f]==null) continue; const v0=q[f]; if(tryStep(()=>{ q[f]=v0+d; if(f==='p'&&q.d!=null&&!on[k]) q.d=q.p*0.68; S3.setFinger(k,lim(q)); },()=>{ q[f]=v0; if(f==='p'&&q.d!=null&&!on[k]) q.d=q.p*0.68; S3.setFinger(k,lim(q)); })) moved=true; } if(!moved) break; } }
    /* 4) hard guarantee: any finger still inside the board/neck/strings is opened or curled (whichever clears it) until the pen is 0 */
    for(let k=1;k<=4;k++){ const q=P.fing[k]; if(!q||!F[k]||F[k].penReal<=0) continue; for(const sg of [-1,1]){ const s0={m:q.m,p:q.p,d:q.d}; let ok=false; for(let it=0;it<40;it++){ if(q.m!=null) q.m+=sg*0.025; if(q.p!=null) q.p+=sg*0.025; if(q.d!=null) q.d=q.p*0.68; S3.setFinger(k,lim(q)); const F2=measure(e); if(F2[k].penReal<=0&&(F2[k].fret||0)<=(F[k].fret||0)+1e-6){ F=F2; ok=true; break; } } if(ok) break; Object.assign(q,s0); S3.setFinger(k,lim(q)); } }
    /* 5) last resort: slide the whole hand straight out of the instrument (shortest of +z / ±y) until nothing penetrates */
    { const tot=F2=>[0,1,2,3,4,5].reduce((m,k)=>Math.max(m,F2[k]?F2[k].pen:0),0); if(tot(F)>0){ const base=P.G.pos.clone(); let bestD=null,bestP=tot(F),bestF=F;
      for(const [ax,sg] of (window.FIXZ?[['z',1]]:[['z',1],['y',1],['y',-1],['x',1],['x',-1]])){ for(let d=0.1;d<=3.0+1e-6;d+=0.1){ P.G.pos.copy(base); P.G.pos[ax]+=sg*d; g.position.copy(P.G.pos); g.updateMatrixWorld(true); const F2=measure(e), t=tot(F2); if(t<bestP-1e-6||(t<=0&&bestP<=0&&bestD&&d<bestD.d)){ bestP=t; bestF=F2; bestD={ax,sg,d}; } if(t<=0) break; } }
      P.G.pos.copy(base); if(bestD) P.G.pos[bestD.ax]+=bestD.sg*bestD.d; g.position.copy(P.G.pos); g.updateMatrixWorld(true); F=bestF; } }
    best=obj(F,on);
    const pen=[0,1,2,3,4,5].reduce((m,k)=>Math.max(m,F[k]?F[k].pen:0),0); if(pen<=0) break; }
    /* 6) re-seat pressing pads (gap -> 0) without creating any penetration */
    const maxPen=F2=>[0,1,2,3,4,5].reduce((m,k)=>Math.max(m,F2[k]?F2[k].pen:0),0);
    { const gap=F2=>[1,2,3,4].reduce((s2,k)=>s2+(on[k]&&F2[k]?Math.max(0,F2[k].minStr):0),0); if(gap(F)>0.03){ const p0=maxPen(F);
      for(const st of [0.1,0.04,0.015,0.006,0.0025,0.001]) for(let it=0;it<30;it++){ let moved=false; for(const ax of (window.FIXZ?['z']:['z','y','x'])) for(const d of [st,-st]){ P.G.pos[ax]+=d; g.position.copy(P.G.pos); g.updateMatrixWorld(true); const F2=measure(e); if(gap(F2)<gap(F)-1e-5&&maxPen(F2)<=p0+1e-6){ F=F2; moved=true; } else { P.G.pos[ax]-=d; g.position.copy(P.G.pos); g.updateMatrixWorld(true); } } if(!moved) break; } } }
    for(let k=1;k<=4;k++){ const q=P.fing[k]; if(!q||!on[k]||!F[k]||F[k].minStr<=0.03) continue; const p0=maxPen(F);
      for(const st of [0.08,0.03,0.012,0.005,0.002,0.0008]) for(let it=0;it<40&&F[k].minStr>0.015;it++){ let moved=false; for(const [f,d] of [['m',st],['p',st],['m',-st],['p',-st],['d',st],['d',-st],['a',st],['a',-st]]){ if(q[f]==null) continue; const v0=q[f]; q[f]=v0+d; S3.setFinger(k,lim(q)); const F2=measure(e); if(Math.max(0,F2[k].minStr)<Math.max(0,F[k].minStr)-1e-5&&maxPen(F2)<=p0+1e-6){ F=F2; moved=true; } else { q[f]=v0; S3.setFinger(k,lim(q)); } } if(!moved) break; } }
    /* 7) final clean-up inside the joint limits: any finger still touching inside the board/strings is moved to pen 0 with the smallest pad gap (lexicographic) */
    for(let k=1;k<=4;k++){ const q=P.fing[k]; if(!q||!F[k]||F[k].penReal<=0) continue; const J=F2=>F2[k].pen*1000+(on[k]?Math.max(0,F2[k].minStr)*10:0)+[0,1,2,3,4,5].reduce((m2,j)=>j!==k&&F2[j]?m2+F2[j].pen*1000:m2,0); let bj=J(F);
      for(const st of [0.04,0.015,0.006,0.0025,0.001,0.0004]) for(let it=0;it<40;it++){ let moved=false; for(const f of ['m','p','d','a']) for(const d of [st,-st]){ if(q[f]==null) continue; const v0=q[f]; q[f]=v0+d; S3.setFinger(k,lim(q)); const F2=measure(e), j2=J(F2); if(j2<bj-1e-6){ bj=j2; F=F2; moved=true; } else { q[f]=v0; S3.setFinger(k,lim(q)); } } if(!moved) break; } }
    { const fp=F2=>[1,2,3,4].reduce((m2,j)=>Math.max(m2,F2[j]?F2[j].pen:0),0); if(fp(F)>0){ const z0=P.G.pos.z; for(let dz=0.01;dz<=0.3+1e-6;dz+=0.01){ P.G.pos.z=z0+dz; g.position.copy(P.G.pos); g.updateMatrixWorld(true); const F2=measure(e); if(fp(F2)<=0&&maxPen(F2)<=0){ F=F2; break; } if(dz>0.295){ P.G.pos.z=z0; g.position.copy(P.G.pos); g.updateMatrixWorld(true); F=measure(e); } } } }
    /* 8) v13 re-seat lifted pressing pads: joints of that finger plus small whole-hand moves, accepted only if its gap shrinks, real penetration stays <= max(start, 0.3 mm), no finger's fret error grows and no other pressing pad lifts */
    if(!window.NOSEAT){ const latOf=F2=>[1,2,3,4].map(j=>F2[j]?(F2[j].lat||0):0); const realMax=F2=>[0,1,2,3,4,5].reduce((m2,j)=>Math.max(m2,F2[j]?(F2[j].penReal!=null?F2[j].penReal:F2[j].pen):0),0), fretOf=F2=>[1,2,3,4].map(j=>F2[j]?(F2[j].fret||0):0);
      const pressK=[1,2,3,4].filter(k=>on[k]&&P.fing[k]&&e.notes.some((n,j)=>e.fingers[j]===k&&n.f>0));
      for(const k of pressK){ if(!F[k]||F[k].minStr<=0.03) continue; const q=P.fing[k]; const cap=Math.max(realMax(F),0.03);
        const ok=F2=>{ if(realMax(F2)>cap+1e-6) return false; const a=fretOf(F),b=fretOf(F2); for(let j=0;j<4;j++) if(b[j]>a[j]+1e-6) return false; const la=latOf(F),lb=latOf(F2); for(let j=0;j<4;j++) if(lb[j]>la[j]+1e-6) return false; for(const j of pressK) if(j!==k&&F2[j]&&F[j]&&Math.max(0,F2[j].minStr)>Math.max(0,F[j].minStr)+0.005) return false; return Math.max(0,F2[k].minStr)<Math.max(0,F[k].minStr)-1e-5; };
        for(const st of [0.1,0.04,0.015,0.006,0.002]) for(let it=0;it<40&&F[k].minStr>0.02;it++){ let moved=false;
          for(const f of ['m','p','d','a']) for(const d of [st,-st]){ if(q[f]==null) continue; const v0=q[f]; q[f]=v0+d; S3.setFinger(k,lim(q)); const F2=measure(e); if(ok(F2)){ F=F2; moved=true; } else { q[f]=v0; S3.setFinger(k,lim(q)); } }
          for(const [dy,dz] of (window.FIXZ?[[0,st*0.5],[0,-st*0.5]]:[[st,st*0.5],[-st,st*0.5],[st,-st*0.5],[-st,-st*0.5],[st*0.5,0],[-st*0.5,0],[0,st*0.5],[0,-st*0.5]])){ P.G.pos.y+=dy; P.G.pos.z+=dz; g.position.copy(P.G.pos); g.updateMatrixWorld(true); const F2=measure(e); if(ok(F2)){ F=F2; moved=true; } else { P.G.pos.y-=dy; P.G.pos.z-=dz; g.position.copy(P.G.pos); g.updateMatrixWorld(true); } }
          if(false) for(const ax of ['z','y']) for(const d of [st*0.5,-st*0.5]){ P.G.pos[ax]+=d; g.position.copy(P.G.pos); g.updateMatrixWorld(true); const F2=measure(e); if(ok(F2)){ F=F2; moved=true; } else { P.G.pos[ax]-=d; g.position.copy(P.G.pos); g.updateMatrixWorld(true); } }
          if(!moved) break; } } }
    P._col=F; return P; }
  /* v14 hybrid: try a z-only fix first (keeps the solver's string and fret placement); fall back to the full fix only if z-only leaves penetration, a fret miss or a lifted pad */
  const cloneP=P=>{ const T=S3.THREE; const f={}; for(const k in P.fing){ const F=Object.assign({},P.fing[k]); ['tgt','str'].forEach(t=>{ if(F[t]&&F[t].isVector3) F[t]=F[t].clone(); }); f[k]=F; } const c=Object.assign({},P,{G:{pos:P.G.pos.clone(),q:P.G.q.clone(),scale:P.G.scale},fing:f}); delete c._colfix; return c; };
  const score=(P,e)=>{ applyPose(P); for(let k=1;k<=4;k++) if(P.fing[k]) S3.setFinger(k,P.fing[k]); const F=measure(e); let pen=0,bad=0,lat=0; for(let k=0;k<=5;k++){ if(!F[k]) continue; pen=Math.max(pen,F[k].penReal!=null?F[k].penReal:F[k].pen); if(k>=1&&k<=4){ if(F[k].fret>0) bad+=10; } }
    e.notes.forEach((n,j)=>{ const k=e.fingers[j]; if(k<1||k>4||!(n.f>0)||!P.fing[k]||!P.fing[k].on) return; if(F[k].minStr>0.1) bad++; if(!barreInfo(e,k)) lat+=Math.abs(padPoint(k).y-noteWorld(n.s,n.f,strTopZ(n.s)).y); }); return {pen,bad,lat,F}; };
  function fix(P,e){ if(typeof solveEv==='function') e=solveEv(e); if(!window.HYBRID||!P||!e||P._colfix===1||(GUIT&&P._colfix===stamp())) return fix0(P,e);
    const FZ=window.FIXZ; const A=cloneP(P); window.FIXZ=1; fix0(A,e); window.FIXZ=FZ; const sa=score(A,e);
    let W=A, sw=sa; if(!(sa.pen<=0.05&&sa.bad===0)){ const B=cloneP(P); window.FIXZ=0; fix0(B,e); window.FIXZ=FZ; const sb=score(B,e); const c=s=>s.bad*3+Math.max(0,s.pen-0.05)*200+s.lat*0.5; if(c(sb)<c(sa)){ W=B; sw=sb; } }
    P.G=W.G; P.fing=W.fing; P._col=sw.F; P._colfix=W._colfix; applyPose(P); return P; }
  function check(ids){ init(); const out=[]; for(const i of ids){ const P=poseFor(i); if(!P) continue; applyPose(P); const F=measure(RES.events[i]); const on=pressInfo(RES.events[i],P), e=RES.events[i];
      for(let k=0;k<=5;k++){ const R=F[k]; if(!R) continue; const pressing=k>0&&k<5&&on[k]&&e.notes.some((n,j)=>e.fingers[j]===k&&n.f>0);
        out.push({ev:i,bar:e.bar,finger:k,pressing,penMm:+((R.penReal!=null?R.penReal:R.pen)*10).toFixed(2),fretErrMm:+((R.fret||0)*10).toFixed(1),latErrMm:+((R.lat||0)*10).toFixed(1),penObj:R.penObj,contactErrMm:pressing?+(Math.max(0,R.minStr)*10).toFixed(2):null,hoverMm:(!pressing&&k<5&&R.clear<1e8)?+(R.clear*10).toFixed(1):null,strClearMm:!pressing?+(R.minStr*10).toFixed(2):null}); } }
    return out; }
  return {init,measure,fix,check,neckPen,stamp};
})();
