/* Blender Les Paul (assets/lp.glb, Draco) replaces the code-built electric visuals. Physics, strings, capo and control hit-targets stay from buildGuitar.
   ?lp=code or ?raw=1 keeps the old guitar. */
window.LPGLB=(function(){
  let P=null;
  const on=()=>{ const q=new URLSearchParams(location.search); return q.get('lp')!=='code'&&!q.get('raw'); };
  function addScript(src){ return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
  function load(T){ if(P) return P; P=(async()=>{ if(!T.DRACOLoader) await addScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/DRACOLoader.js');
      const L=new T.GLTFLoader(), D=new T.DRACOLoader(); D.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.1/'); L.setDRACOLoader(D);
      const g=await new Promise((res,rej)=>L.load('assets/lp.glb?v=19',res,undefined,rej)); return g.scene; })(); return P; }
  const G0=()=>typeof GUIT!=='undefined'?GUIT:null;
  function hide(G){ G.children.forEach(c=>{ if(c===G.userData.strG||c.name==='LP_GLB'||c.name==='capo') return;
    c.traverse(o=>{ if(!o.material) return; (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{ if(m&&!m.isMeshBasicMaterial) m.visible=false; }); }); }); }
  function sync(){ const G=G0(); const L=G&&G.userData.lpglb; if(!L) return; hide(G);
    G.traverse(g=>{ const pt=g.userData&&g.userData.part; if(!pt) return;
      const k=/^k(\d)$/.exec(pt.n||''); if(k&&L.knobs[k[1]-1]){ const cyl=g.children.find(c=>c.isMesh&&c.geometry&&c.geometry.type==='CylinderGeometry'); if(cyl) L.knobs[k[1]-1].forEach(o=>{ if(o) o.rotation.z=cyl.rotation.y; }); }
      if(pt.n==='switch'&&L.piv) L.piv.rotation.x=g.userData.lever?g.userData.lever.rotation.x:0; }); }
  function wrap(){ if(window._lpWrap||typeof window.render3d!=='function') return; window._lpWrap=1; const r=window.render3d; window.render3d=function(){ sync(); return r.apply(this,arguments); }; }
  /* v16: the GLB knobs sit off the body; put each knob+cap on the real Les Paul control spots (lower bout, treble side, the code-built k1..k4 positions over the control cavity), seated on the carved top */
  function placeKnobs(G,I,m,T){ m.updateMatrixWorld(true); const top=m.getObjectByName('body_top_2'); if(!top) return; const rc=new T.Raycaster(); const zAt=(x,y)=>{ rc.set(new T.Vector3(x,y,30),new T.Vector3(0,0,-1)); const h=rc.intersectObject(top,true); return h.length?h[0].point.z:null; };
    (I.parts||[]).filter(p=>/^k\d$/.test(p.n)&&p.c).forEach(p=>{ const k=+p.n[1]; const kn=m.getObjectByName('knob'+k), cap=m.getObjectByName('knob'+k+'_cap'); if(!kn) return;
      [kn,cap].forEach(o=>{ if(o) o.rotation.set(0,0,0); }); m.updateMatrixWorld(true);
      /* the knob meshes had their pivot at the model origin, so turning a knob swung it off the guitar: move the pivot to the knob's own axis */
      const b=new T.Box3().setFromObject(kn), c=b.getCenter(new T.Vector3()); const piv=new T.Vector3(c.x,c.y,b.min.z);
      [kn,cap].forEach(o=>{ if(!o) return; const lp=o.parent.worldToLocal(piv.clone()); const g=o.geometry.clone(); const off=lp.clone().sub(o.position); g.translate(-off.x,-off.y,-off.z); o.geometry=g; o.position.copy(lp); }); m.updateMatrixWorld(true);
      const tx=CM(I,p.c[0]), ty=-CM(I,p.c[1]); const zs=[[0,0],[1,0],[-1,0],[0,1],[0,-1]].map(([a,b2])=>zAt(tx+a,ty+b2)).filter(z=>z!=null); if(!zs.length) return; const zt=Math.min(...zs);
      const d=new T.Vector3(tx-piv.x,ty-piv.y,zt-0.05-piv.z); window.KNOBMOVE=(window.KNOBMOVE||[]).concat([[k,+d.x.toFixed(2),+d.y.toFixed(2),+d.z.toFixed(2)]]);
      [kn,cap].forEach(o=>{ if(!o) return; const w=o.getWorldPosition(new T.Vector3()).add(d); o.position.copy(o.parent.worldToLocal(w)); }); }); m.updateMatrixWorld(true); }
  /* v16: smooth body shading. The body rings are low-poly, so flat facets showed on the lower bout and bottom edge. Rebuild normals with a crease angle (smooth across facets, keep the real edges) */
  function creaseNormals(o,T,deg,qq){ qq=qq||500; let g=o.geometry; if(g.index) g=g.toNonIndexed(); const P=g.attributes.position, n=P.count/3|0, cos=Math.cos(deg*Math.PI/180); const fn=new Float32Array(n*3), a=new T.Vector3(), b=new T.Vector3(), c=new T.Vector3();
    for(let f=0;f<n;f++){ a.fromBufferAttribute(P,f*3); b.fromBufferAttribute(P,f*3+1); c.fromBufferAttribute(P,f*3+2); const nn=c.clone().sub(b).cross(a.clone().sub(b)); const L=nn.length(); if(L>0){ nn.divideScalar(L); } fn[f*3]=nn.x; fn[f*3+1]=nn.y; fn[f*3+2]=nn.z; }
    const key=i=>Math.round(P.getX(i)*qq)+','+Math.round(P.getY(i)*qq)+','+Math.round(P.getZ(i)*qq); const M=new Map(); for(let i=0;i<P.count;i++){ const k=key(i); let L=M.get(k); if(!L) M.set(k,L=[]); L.push(i); }
    const N=new Float32Array(P.count*3); for(let i=0;i<P.count;i++){ const f=i/3|0; let x=0,y=0,z=0; for(const j of M.get(key(i))){ const h=j/3|0; const d=fn[f*3]*fn[h*3]+fn[f*3+1]*fn[h*3+1]+fn[f*3+2]*fn[h*3+2]; if(d>=cos){ x+=fn[h*3]; y+=fn[h*3+1]; z+=fn[h*3+2]; } } const L=Math.hypot(x,y,z)||1; N[i*3]=x/L; N[i*3+1]=y/L; N[i*3+2]=z/L; }
    g.setAttribute('normal',new T.BufferAttribute(N,3)); o.geometry=g; }
  /* v16: the body outline was a low-res, slightly wobbly ring (lumpy lower bout and bottom edge). Taubin-smooth the outline in x/y only (z profile kept), moving coincident vertices of every body part together so no seams open. */
  function smoothOutline(m,T){ const parts=[]; m.updateMatrixWorld(true); m.traverse(o=>{ if(o.isMesh&&/^body_(top|side|back)/.test(o.name)) parts.push(o); }); if(!parts.length) return;
    const Q=v=>Math.round(v.x*(window.OQ||40))+','+Math.round(v.y*(window.OQ||40))+','+Math.round(v.z*(window.OQ||40)); const node=new Map(); const v=new T.Vector3(); const refs=[];
    parts.forEach(o=>{ const P=o.geometry.attributes.position; for(let i=0;i<P.count;i++){ v.fromBufferAttribute(P,i).applyMatrix4(o.matrixWorld); const k=Q(v); let nd=node.get(k); if(!nd){ nd={p:v.clone(),nb:new Set(),ring:false}; node.set(k,nd); } refs.push([o,i,nd]); if(/^body_side|_1$|_3$/.test(o.name)) nd.ring=true; } });
    parts.forEach(o=>{ const P=o.geometry.attributes.position, ix=o.geometry.index; const tri=ix?ix.count/3:P.count/3; const g=i=>ix?ix.getX(i):i; const key=i=>{ v.fromBufferAttribute(P,i).applyMatrix4(o.matrixWorld); return node.get(Q(v)); };
      for(let t=0;t<tri;t++){ const a=key(g(t*3)), b=key(g(t*3+1)), c=key(g(t*3+2)); [[a,b],[b,c],[c,a]].forEach(([x,y])=>{ if(x&&y&&x!==y&&Math.abs(x.p.z-y.p.z)<0.08){ x.nb.add(y); y.nb.add(x); } }); } });
    const R=[...node.values()].filter(n=>n.ring&&n.nb.size>=2); R.forEach(n=>{ n.x0=n.p.x; n.y0=n.p.y; });
    const step=lam=>{ const d=R.map(n=>{ let x=0,y=0,c=0; n.nb.forEach(q=>{ if(!q.ring) return; x+=q.p.x; y+=q.p.y; c++; }); return c>=2?[(x/c-n.p.x)*lam,(y/c-n.p.y)*lam]:[0,0]; }); R.forEach((n,i)=>{ n.p.x+=d[i][0]; n.p.y+=d[i][1]; }); };
    for(let it=0;it<(window.OUTLINE_IT||24);it++){ step(0.5); step(-0.53); }
    /* the tail end had a pinched spot at the strap button: refit the tail outline (x as a smooth quartic in y, per height band) and blend it in over x 0-6 cm */
    { const xs=R.map(n=>n.p.x); const x0=Math.min(...xs); const band=new Map(); R.forEach(n=>{ if(n.p.x-x0<7){ const k=Math.round(n.p.z*4); let L=band.get(k); if(!L) band.set(k,L=[]); L.push(n); } });
      const solve=(A,b)=>{ const m=A.length; for(let i=0;i<m;i++){ let p=i; for(let r=i+1;r<m;r++) if(Math.abs(A[r][i])>Math.abs(A[p][i])) p=r; [A[i],A[p]]=[A[p],A[i]]; [b[i],b[p]]=[b[p],b[i]]; for(let r=0;r<m;r++){ if(r===i||!A[i][i]) continue; const f=A[r][i]/A[i][i]; for(let c=i;c<m;c++) A[r][c]-=f*A[i][c]; b[r]-=f*b[i]; } } return b.map((v,i)=>A[i][i]?v/A[i][i]:0); };
      band.forEach(L=>{ if(L.length<12) return; const ym=L.reduce((s,n)=>s+n.p.y,0)/L.length; const D=6; const A=Array.from({length:D},()=>new Array(D).fill(0)), bb=new Array(D).fill(0);
        L.forEach(n=>{ const t=(n.p.y-ym)/10; const ph=[1,t,t*t,t**3,t**4,t**5]; for(let i=0;i<D;i++){ bb[i]+=ph[i]*n.p.x; for(let j=0;j<D;j++) A[i][j]+=ph[i]*ph[j]; } }); const c=solve(A,bb);
        L.forEach(n=>{ const t=(n.p.y-ym)/10; const fx=c[0]+c[1]*t+c[2]*t*t+c[3]*t**3+c[4]*t**4+c[5]*t**5; const w=Math.max(0,Math.min(1,(6-(n.p.x-x0))/3)); n.p.x+=(fx-n.p.x)*w; }); }); }
    window.OUTLINE_STATS={nodes:node.size,ring:R.length,moved:R.reduce((m,n)=>Math.max(m,Math.hypot(n.p.x-n.x0,n.p.y-n.y0)),0)};
    const inv=new Map(); refs.forEach(([o,i,nd])=>{ if(!nd.ring) return; let M=inv.get(o); if(!M){ M=new T.Matrix4().copy(o.matrixWorld).invert(); inv.set(o,M); } v.copy(nd.p).applyMatrix4(M); o.geometry.attributes.position.setXYZ(i,v.x,v.y,v.z); });
    parts.forEach(o=>{ o.geometry.attributes.position.needsUpdate=true; o.geometry.computeBoundingBox(); o.geometry.computeBoundingSphere(); }); }
  function smoothBody(m,T){ if(window.BODYSMOOTH===0) return; /* the thin black ply rings coincide with binding and finish and speckle through them: hide them */ if(window.PLY!==1) m.traverse(o=>{ if(o.isMesh&&/^body_(top|back|side)_3$/.test(o.name)) o.visible=false; }); /* binding drawn in front of the coincident ply/finish layers (no dotted z-fighting along the edge) */ m.traverse(o=>{ if(o.isMesh&&/^body_/.test(o.name)&&o.material&&o.material.name==='bind'){ o.material=o.material.clone(); o.material.polygonOffset=true; o.material.polygonOffsetFactor=-2; o.material.polygonOffsetUnits=-8; } }); parts0(m).forEach(o=>{ o.geometry=o.geometry.clone(); }); try{ smoothOutline(m,T); }catch(e){ window.OUTLINE_ERR=String(e&&e.stack||e); } m.traverse(o=>{ if(o.isMesh&&/^(body_(top|side|back)|neck$)/.test(o.name)) try{ creaseNormals(o,T,/^body_side/.test(o.name)?(window.SIDECREASE||80):(window.CREASE||55),/^body_side/.test(o.name)?(window.SIDEQ||25):500); }catch(e){} }); m.traverse(o=>{ if(o.isMesh&&/^body_top/.test(o.name)&&o.material&&o.material.name==='finish'&&window.TOPSMOOTH!==0) try{ smoothNormals(o,T,window.TOPSMOOTH||6); }catch(e){} }); }
  /* v19: pickup covers and rings sat exactly in the plane of the pole pieces, slugs and ring screws, so they flickered: draw covers/rings slightly behind their hardware, smooth the cover chamfers, and add a normal bias so curved gold and the carved top don't self-shadow (shadow acne) */
  function fixPickups(m,T){ m.traverse(o=>{ if(!o.isMesh) return; if(/^pu_.*_(cover|ring)$/.test(o.name)||/^cover_(control|toggle)$|^jack_plate$|^switch_ring$/.test(o.name)){ o.material=o.material.clone(); o.material.polygonOffset=true; o.material.polygonOffsetFactor=1; o.material.polygonOffsetUnits=window.PUOFF||6; try{ creaseNormals(o,T,40,2000); }catch(e){} } });
    if(window.S3&&S3.scene) S3.scene.traverse(l=>{ if(l.isLight&&l.castShadow&&l.shadow){ if(!l.shadow.normalBias) l.shadow.normalBias=window.NBIAS||0.04; } }); }
  /* v19b: smooth the carved-top shading. Vertex normals of the black finish are averaged with their welded neighbours a few times (positions untouched), so reflections slide smoothly over the carve instead of showing facets */
  function smoothNormals(o,T,it){ const g=o.geometry, P=g.attributes.position, N=g.attributes.normal; if(!N) return; const q=200, key=i=>Math.round(P.getX(i)*q)+','+Math.round(P.getY(i)*q)+','+Math.round(P.getZ(i)*q);
    const id=new Int32Array(P.count), M=new Map(); for(let i=0;i<P.count;i++){ const k=key(i); let v=M.get(k); if(v==null){ v=M.size; M.set(k,v); } id[i]=v; }
    const n=M.size, nb=Array.from({length:n},()=>new Set()); const ix=g.index; const tri=ix?ix.count/3:P.count/3; const gi=t=>ix?ix.getX(t):t;
    for(let t=0;t<tri;t++){ const a=id[gi(t*3)], b=id[gi(t*3+1)], c=id[gi(t*3+2)]; nb[a].add(b); nb[a].add(c); nb[b].add(a); nb[b].add(c); nb[c].add(a); nb[c].add(b); }
    let A=new Float32Array(n*3); for(let i=0;i<P.count;i++){ const v=id[i]; A[v*3]+=N.getX(i); A[v*3+1]+=N.getY(i); A[v*3+2]+=N.getZ(i); }
    const nrm=X=>{ for(let v=0;v<n;v++){ const L=Math.hypot(X[v*3],X[v*3+1],X[v*3+2])||1; X[v*3]/=L; X[v*3+1]/=L; X[v*3+2]/=L; } }; nrm(A);
    for(let k=0;k<it;k++){ const B=new Float32Array(n*3); for(let v=0;v<n;v++){ let x=A[v*3],y=A[v*3+1],z=A[v*3+2]; nb[v].forEach(u=>{ x+=A[u*3]; y+=A[u*3+1]; z+=A[u*3+2]; }); B[v*3]=x; B[v*3+1]=y; B[v*3+2]=z; } nrm(B); A=B; }
    for(let i=0;i<P.count;i++){ const v=id[i]; N.setXYZ(i,A[v*3],A[v*3+1],A[v*3+2]); } N.needsUpdate=true; }
  const parts0=m=>{ const a=[]; m.traverse(o=>{ if(o.isMesh&&/^(body_(top|side|back)|neck$)/.test(o.name)) a.push(o); }); return a; };
  function apply(G,I,inst){ if(inst!=='electric'||!on()||!window.S3||!G) return; const T=S3.THREE; wrap();
    load(T).then(src=>{ if(G!==G0()||G.userData.lpglb) return; const m=src.clone(true); m.name='LP_GLB';
      m.traverse(o=>{ if(/^string\d/.test(o.name)) o.visible=false; if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; const ms=Array.isArray(o.material)?o.material:[o.material]; ms.forEach(x=>{ if(x&&x.map) x.map.anisotropy=8; }); } });
      const lev=m.getObjectByName('switch_lever'), tip=m.getObjectByName('switch_tip'); let piv=null;
      if(lev&&tip){ piv=new T.Group(); piv.position.copy(lev.position); lev.parent.add(piv); lev.position.set(0,0,0); lev.rotation.set(0,0,0); tip.position.set(0,0,1.65); tip.rotation.set(0,0,0); piv.add(lev); piv.add(tip); }
      G.userData.lpglb={root:m,piv,knobs:[1,2,3,4].map(k=>[m.getObjectByName('knob'+k),m.getObjectByName('knob'+k+'_cap')])};
      G.add(m); smoothBody(m,T); fixPickups(m,T); placeKnobs(G,I,m,T); window._shN=-1; window.LPGLB_READY=1; window.render3d(); }).catch(e=>console.warn('lp.glb not loaded, keeping the code guitar',e)); }
  return {apply,on,sync};
})();
