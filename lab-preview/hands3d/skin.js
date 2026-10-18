/* Hand skin: physical material with per-vertex tone (warmer fingertips/palm), darker knuckle creases, lighter pink nails on the dorsal tip of each distal phalanx,
   and a cheap subsurface term (red wrap-around light) injected into the shader. Self-made, no textures. */
window.HSKIN=(function(){
  function apply(){ if(!window.S3||!S3.group) return false; let done=false; S3.group.traverse(o=>{ if(!o.isSkinnedMesh||o.userData.skin) return; o.userData.skin=1; done=true; const T=S3.THREE, g=o.geometry, P=g.attributes.position, N=g.attributes.normal, si=g.attributes.skinIndex, sw=g.attributes.skinWeight, B=o.skeleton.bones, n=P.count;
    const fOf=nm=>/index/i.test(nm)?1:/middle/i.test(nm)?2:/ring/i.test(nm)?3:/pinky|little/i.test(nm)?4:/thumb/i.test(nm)?5:0;
    const bp=o.skeleton.boneInverses.map(m=>new T.Vector3().setFromMatrixPosition(m.clone().invert()));
    const isDistal=B.map((b,i)=>fOf(b.name)&&!b.children.some(c=>fOf(c.name)===fOf(b.name)));
    const joints=B.map((b,i)=>fOf(b.name)?bp[i]:null).filter(Boolean);
    /* hand size: wrist-to-middle-tip span → mm scale */ let span=0; for(let i=0;i<n;i++) span=Math.max(span,Math.hypot(P.array[i*3],P.array[i*3+1],P.array[i*3+2])); const mm=span/185;
    const col=new Float32Array(n*3), base=new T.Color(0xd9a184), tip=new T.Color(0xd88f7a), crease=new T.Color(0x9a5f4c), nail=new T.Color(0xf0c7bd), c=new T.Color(), p=new T.Vector3(), nm=new T.Vector3();
    /* dorsal axis in bind space: average normal of the back-of-hand (non-finger) vertices facing the same way as the majority */ const d=new T.Vector3(); for(let i=0;i<n;i++){ let bw=-1,bi=0; for(let k=0;k<4;k++){ const w=sw.array[i*4+k]; if(w>bw){bw=w;bi=si.array[i*4+k];} } if(!fOf(B[bi].name)){ nm.fromArray(N.array,i*3); if(nm.y>0) d.add(nm); } } d.normalize(); if(d.lengthSq()<0.5) d.set(0,1,0);
    for(let i=0;i<n;i++){ let bw=-1,bi=0; for(let k=0;k<4;k++){ const w=sw.array[i*4+k]; if(w>bw){bw=w;bi=si.array[i*4+k];} } p.fromArray(P.array,i*3); nm.fromArray(N.array,i*3); c.copy(base);
      const f=fOf(B[bi].name); if(f){ const dj=Math.min(...joints.map(j=>j.distanceTo(p)))/mm; if(dj<4) c.lerp(crease,0.35*(1-dj/4)*(nm.dot(d)<0?1:0.5)); }
      if(isDistal[bi]){ const L=p.distanceTo(bp[bi])/mm; c.lerp(tip,Math.min(1,L/14)*0.6); if(nm.dot(d)>0.55&&L>5) c.lerp(nail,Math.min(1,(nm.dot(d)-0.55)/0.2)*0.85); }
      c.offsetHSL(0,0,((Math.sin(p.x*91/mm)*Math.sin(p.z*57/mm))*0.012)); c.convertSRGBToLinear(); col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b; }
    g.setAttribute('color',new T.Float32BufferAttribute(col,3));
    const m=new T.MeshPhysicalMaterial({vertexColors:true,color:0xffffff,roughness:0.52,metalness:0,clearcoat:0.08,clearcoatRoughness:0.5,sheen:new T.Color(0x3a1a12),skinning:true,side:T.DoubleSide,envMapIntensity:0.7});
    m.onBeforeCompile=sh=>{ sh.fragmentShader=sh.fragmentShader.replace('#include <lights_fragment_end>','#include <lights_fragment_end>\n reflectedLight.indirectDiffuse += diffuseColor.rgb*vec3(0.20,0.05,0.025); reflectedLight.directDiffuse *= vec3(1.0,0.93,0.9);'); };
    o.material=m; });
  S3.group.traverse(o=>{ if(o.isMesh&&!o.isSkinnedMesh&&!o.userData.skin&&o.material&&o.material.color&&[0xdca286,0xd89c80].includes(o.material.color.getHex())){ o.userData.skin=1; o.material=new S3.THREE.MeshPhysicalMaterial({color:new S3.THREE.Color(0xd9a184).convertSRGBToLinear(),roughness:0.55,sheen:new S3.THREE.Color(0x3a1a12),side:S3.THREE.DoubleSide}); } }); if(done&&window.render3d) render3d(); return done; }
  const iv=setInterval(()=>{ try{ apply(); }catch(e){ console.warn('skin',e.message); clearInterval(iv); } },500);
  return {apply};
})();
