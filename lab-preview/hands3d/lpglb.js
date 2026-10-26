/* Blender Les Paul (assets/lp.glb, Draco) replaces the code-built electric visuals. Physics, strings, capo and control hit-targets stay from buildGuitar.
   ?lp=code or ?raw=1 keeps the old guitar. */
window.LPGLB=(function(){
  let P=null;
  const on=()=>{ const q=new URLSearchParams(location.search); return q.get('lp')!=='code'&&!q.get('raw'); };
  function addScript(src){ return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
  function load(T){ if(P) return P; P=(async()=>{ if(!T.DRACOLoader) await addScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/DRACOLoader.js');
      const L=new T.GLTFLoader(), D=new T.DRACOLoader(); D.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.1/'); L.setDRACOLoader(D);
      const g=await new Promise((res,rej)=>L.load('assets/lp.glb',res,undefined,rej)); return g.scene; })(); return P; }
  const G0=()=>typeof GUIT!=='undefined'?GUIT:null;
  function hide(G){ G.children.forEach(c=>{ if(c===G.userData.strG||c.name==='LP_GLB'||c.name==='capo') return;
    c.traverse(o=>{ if(!o.material) return; (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{ if(m&&!m.isMeshBasicMaterial) m.visible=false; }); }); }); }
  function sync(){ const G=G0(); const L=G&&G.userData.lpglb; if(!L) return; hide(G);
    G.traverse(g=>{ const pt=g.userData&&g.userData.part; if(!pt) return;
      const k=/^k(\d)$/.exec(pt.n||''); if(k&&L.knobs[k[1]-1]){ const cyl=g.children.find(c=>c.isMesh&&c.geometry&&c.geometry.type==='CylinderGeometry'); if(cyl) L.knobs[k[1]-1].forEach(o=>{ if(o) o.rotation.z=cyl.rotation.y; }); }
      if(pt.n==='switch'&&L.piv) L.piv.rotation.x=g.userData.lever?g.userData.lever.rotation.x:0; }); }
  function wrap(){ if(window._lpWrap||typeof window.render3d!=='function') return; window._lpWrap=1; const r=window.render3d; window.render3d=function(){ sync(); return r.apply(this,arguments); }; }
  function apply(G,I,inst){ if(inst!=='electric'||!on()||!window.S3||!G) return; const T=S3.THREE; wrap();
    load(T).then(src=>{ if(G!==G0()||G.userData.lpglb) return; const m=src.clone(true); m.name='LP_GLB';
      m.traverse(o=>{ if(/^string\d/.test(o.name)) o.visible=false; if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; const ms=Array.isArray(o.material)?o.material:[o.material]; ms.forEach(x=>{ if(x&&x.map) x.map.anisotropy=8; }); } });
      const lev=m.getObjectByName('switch_lever'), tip=m.getObjectByName('switch_tip'); let piv=null;
      if(lev&&tip){ piv=new T.Group(); piv.position.copy(lev.position); lev.parent.add(piv); lev.position.set(0,0,0); lev.rotation.set(0,0,0); tip.position.set(0,0,1.65); tip.rotation.set(0,0,0); piv.add(lev); piv.add(tip); }
      G.userData.lpglb={root:m,piv,knobs:[1,2,3,4].map(k=>[m.getObjectByName('knob'+k),m.getObjectByName('knob'+k+'_cap')])};
      G.add(m); window._shN=-1; window.LPGLB_READY=1; window.render3d(); }).catch(e=>console.warn('lp.glb not loaded, keeping the code guitar',e)); }
  return {apply,on,sync};
})();
