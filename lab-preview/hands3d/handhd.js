/* HD hand: render-only refinement of the Study Lab hand mesh (both hands). The collision/contact mesh is untouched:
   the original SkinnedMesh stays in place (hidden) so HCOL measures exactly the same surface; a Phong-tessellated copy
   (interpolating, so it never moves off the original vertices) shares the same skeleton and carries the skin shader.
   Skin detail is procedural per fragment in bind space (resolution independent, nothing to download):
   pores + micro-relief, joint creases, palm lines, dorsal knuckle wrinkles, extensor tendons, veins, nails with cuticle,
   lunula and free edge, reddened tips/knuckles, wrap-lighting subsurface with red scatter and thin-finger back-light.
   Quality: ?q=low / mobile = 1 tessellation level, no pores; high = 2 levels. No external textures (all self-made). */
window.HANDHD=(function(){
  const PRESS={x:0,y:0,z:0,w:0,set(a,b,c,d){this.x=a;this.y=b;this.z=c;this.w=d;}};
  /* v11 pressure flattening: per pressing finger, the pad skin that would go below the string top is flattened onto it (guitar frame, cm). Shared with collide.js/tipAudit via window.FLATP */
  const FLAT={}; const flatInit=()=>{ if(!FLAT.v){ FLAT.v=new THREE.Vector4(-1e4,-1e4,-1e4,-1e4); FLAT.g=new THREE.Matrix4(); FLAT.gi=new THREE.Matrix4(); } return FLAT; }; window.FLATP=FLAT;   /* per-finger pressure 0..1 -> fingertip pad spreads sideways (render mesh only) */
  const LOW=window.PR?PR.Q==='low':/Mobi|iPad|Android/.test(navigator.userAgent);
  const fOf=nm=>/index/i.test(nm)?1:/middle/i.test(nm)?2:/ring/i.test(nm)?3:/pinky|little/i.test(nm)?4:/thumb/i.test(nm)?5:0;
  /* ---------- Phong tessellation of a skinned indexed geometry ---------- */
  function weldNormals(g){ const P=g.attributes.position.array, N=g.attributes.normal.array, m=new Map(), n=P.length/3; for(let i=0;i<n;i++){ const k=P[i*3].toFixed(5)+','+P[i*3+1].toFixed(5)+','+P[i*3+2].toFixed(5); let e=m.get(k); if(!e){ e=[0,0,0,[]]; m.set(k,e); } e[0]+=N[i*3]; e[1]+=N[i*3+1]; e[2]+=N[i*3+2]; e[3].push(i); }
    const SI=g.attributes.skinIndex&&g.attributes.skinIndex.array, SW=g.attributes.skinWeight&&g.attributes.skinWeight.array;
    for(const e of m.values()){ const l=Math.hypot(e[0],e[1],e[2])||1; const i0=e[3][0]; for(const i of e[3]){ N[i*3]=e[0]/l; N[i*3+1]=e[1]/l; N[i*3+2]=e[2]/l; if(i!==i0){ P[i*3]=P[i0*3]; P[i*3+1]=P[i0*3+1]; P[i*3+2]=P[i0*3+2]; } if(SI&&i!==i0) for(let c=0;c<4;c++){ SI[i*4+c]=SI[i0*4+c]; SW[i*4+c]=SW[i0*4+c]; } } }   /* split vertices share one skin binding, so seams cannot open under pose */
    g.attributes.normal.needsUpdate=true; }
  function tess(g,levels){ const T=THREE; g=g.clone(); g.attributes.position=g.attributes.position.clone(); g.attributes.skinIndex=g.attributes.skinIndex.clone(); g.attributes.skinWeight=g.attributes.skinWeight.clone(); weldNormals(g); for(let L=0;L<levels;L++){ const P=g.attributes.position.array, N=g.attributes.normal.array, U=g.attributes.uv?g.attributes.uv.array:null, SI=g.attributes.skinIndex.array, SW=g.attributes.skinWeight.array; const I=g.index.array;
      const pos=Array.from(P), nor=Array.from(N), uv=U?Array.from(U):null, si=Array.from(SI), sw=Array.from(SW); const emap=new Map(); const idx=[];
      const keyP=i=>P[i*3].toFixed(6)+','+P[i*3+1].toFixed(6)+','+P[i*3+2].toFixed(6);
      const mid=(a,b)=>{ const ka=keyP(a), kb=keyP(b); const key=ka<kb?ka+'|'+kb:kb+'|'+ka;   /* weld across UV/normal seams: one midpoint per geometric edge, no cracks */ let v=emap.get(key); if(v!=null) return v;
        const A=[P[a*3],P[a*3+1],P[a*3+2]], B=[P[b*3],P[b*3+1],P[b*3+2]], na=[N[a*3],N[a*3+1],N[a*3+2]], nb=[N[b*3],N[b*3+1],N[b*3+2]]; const q=[0,1,2].map(k=>(A[k]+B[k])/2);
        const proj=(o,n)=>{ const d=(q[0]-o[0])*n[0]+(q[1]-o[1])*n[1]+(q[2]-o[2])*n[2]; return [q[0]-d*n[0],q[1]-d*n[1],q[2]-d*n[2]]; }; const pa=proj(A,na), pb=proj(B,nb); const al=0.75;
        v=pos.length/3; for(let k=0;k<3;k++) pos.push(q[k]*(1-al)+(pa[k]+pb[k])/2*al); let n=[na[0]+nb[0],na[1]+nb[1],na[2]+nb[2]]; const l=Math.hypot(...n)||1; nor.push(n[0]/l,n[1]/l,n[2]/l);
        if(uv) uv.push((U[a*2]+U[b*2])/2,(U[a*2+1]+U[b*2+1])/2);
        const w={}; for(const s of [a,b]) for(let c=0;c<4;c++){ const j=SI[s*4+c], ww=SW[s*4+c]; if(ww>0) w[j]=(w[j]||0)+ww/2; } const top=Object.entries(w).sort((x,y)=>y[1]-x[1]).slice(0,4); const tot=top.reduce((s,x)=>s+x[1],0)||1; for(let c=0;c<4;c++){ si.push(top[c]?+top[c][0]:0); sw.push(top[c]?top[c][1]/tot:0); }
        emap.set(key,v); return v; };
      for(let t=0;t<I.length;t+=3){ const a=I[t],b=I[t+1],c=I[t+2]; const ab=mid(a,b), bc=mid(b,c), ca=mid(c,a); idx.push(a,ab,ca, ab,b,bc, ca,bc,c, ab,bc,ca); }
      const G=new T.BufferGeometry(); G.setAttribute('position',new T.Float32BufferAttribute(pos,3)); G.setAttribute('normal',new T.Float32BufferAttribute(nor,3)); if(uv) G.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
      G.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4)); G.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4)); G.setIndex(idx); g=G; }
    return g; }
  /* ---------- anatomical frame + per-vertex region attributes (bind space) ---------- */
  function regions(g,mesh){ const T=THREE, B=mesh.skeleton.bones, n=g.attributes.position.count, P=g.attributes.position.array, N=g.attributes.normal.array, SI=g.attributes.skinIndex.array, SW=g.attributes.skinWeight.array;
    const bp=mesh.skeleton.boneInverses.map(m=>new T.Vector3().setFromMatrixPosition(m.clone().invert())); const bi=nm=>B.findIndex(b=>b.name===nm);
    const J=nm=>bp[bi(nm)]; const wr=J('wrist'), mI=J('index-finger-phalanx-proximal'), mM=J('middle-finger-phalanx-proximal'), mR=J('ring-finger-phalanx-proximal'), mP=J('pinky-finger-phalanx-proximal'), tM=J('thumb-metacarpal');
    const ax=mM.clone().sub(wr); const LEN=ax.length(); ax.normalize(); let lat=mI.clone().sub(mP); lat.sub(ax.clone().multiplyScalar(lat.dot(ax))).normalize(); let pn=new T.Vector3().crossVectors(ax,lat).normalize();
    const cen=mI.clone().add(mM).add(mR).add(mP).multiplyScalar(0.25).add(wr).multiplyScalar(0.5); if(tM.clone().sub(cen).dot(pn)>0) pn.negate(); if(window.PNSIGN) pn.multiplyScalar(PNSIGN);   /* pn points to the palm (checked on renders: veins/nails must land on the back) */
    const dThumb=lat.clone().multiplyScalar(0.7).sub(pn.clone().multiplyScalar(0.7)).normalize();   /* thumbnail faces outward + dorsal */
    const mm=LEN/95;   /* wrist→middle MCP ≈ 95 mm */
    /* the WebXR hand skeleton is flat (every joint parented to the Armature), so chain the segments by name */
    const SEQ=['metacarpal','phalanx-proximal','phalanx-intermediate','phalanx-distal','tip'];
    const child=B.map(b=>{ const f=fOf(b.name); if(!f) return -1; const k=SEQ.findIndex(q=>b.name.endsWith(q)); if(k<0) return -1; for(let j=k+1;j<SEQ.length;j++){ const c=B.findIndex(x=>fOf(x.name)===f&&x.name.endsWith(SEQ[j])); if(c>=0) return c; } return -1; });
    const END=B.map((b,i)=>child[i]>=0&&!/tip$/.test(b.name)?bp[child[i]]:null);
    const width=new Float32Array(B.length);
    const dom=new Int16Array(n); for(let i=0;i<n;i++){ let bw=-1,b=0; for(let c=0;c<4;c++){ if(SW[i*4+c]>bw){ bw=SW[i*4+c]; b=SI[i*4+c]; } } dom[i]=b; }
    const p=new T.Vector3(), nn=new T.Vector3(), d=new T.Vector3();
    for(let i=0;i<n;i++){ const b=dom[i]; if(!END[b]||!fOf(B[b].name)) continue; p.fromArray(P,i*3); d.copy(END[b]).sub(bp[b]); const L=d.length(); d.normalize(); const r=p.clone().sub(bp[b]); const l2=r.clone().sub(d.clone().multiplyScalar(r.dot(d))); const la=new T.Vector3().crossVectors(d,pn).normalize(); width[b]=Math.max(width[b],Math.abs(l2.dot(la))); }
    const JN=[]; ['index','middle','ring','pinky'].forEach(f=>{ const seq=['phalanx-proximal','phalanx-intermediate','phalanx-distal','tip'].map(q=>J(f+'-finger-'+q)); for(let k=1;k<3;k++) JN.push([seq[k],seq[k+1].clone().sub(seq[k]).normalize()]); });   /* PIP + DIP only: no fold line across the finger base */
    { const th=['thumb-phalanx-proximal','thumb-phalanx-distal','thumb-tip'].map(J); for(let k=1;k<2;k++) JN.push([th[k],th[k+1].clone().sub(th[k]).normalize()]); }
    const aB=new Float32Array(n*3), aR=new Float32Array(n*4), aJ=new Float32Array(n*4), aP=new Float32Array(n*4);
    const knuck=['index','middle','ring','pinky'].flatMap(f=>[J(f+'-finger-phalanx-proximal'),J(f+'-finger-phalanx-intermediate'),J(f+'-finger-phalanx-distal')]).concat([J('thumb-phalanx-proximal'),J('thumb-phalanx-distal')]);
    for(let i=0;i<n;i++){ p.fromArray(P,i*3); nn.fromArray(N,i*3); const rel=p.clone().sub(wr); aB[i*3]=rel.dot(lat)/mm; aB[i*3+1]=rel.dot(ax)/mm; aB[i*3+2]=rel.dot(pn)/mm;
      const b=dom[i], f=fOf(B[b].name), c=child[b], dor=f===5?nn.dot(dThumb):-nn.dot(pn);
      let u=0,v=0,isD=0,j0=99,j1=99,thin=0.3,pu=0,pv=0,isP=0; 
      if(f&&END[b]){ d.copy(END[b]).sub(bp[b]); const L=d.length(); d.normalize(); const r=p.clone().sub(bp[b]); const t=r.dot(d)/L; const la=new T.Vector3().crossVectors(d,f===5?dThumb:pn).normalize(); const w=width[b]||L*0.3;
        const isDist=/distal/.test(B[b].name); u=t; v=r.dot(la)/w; isD=isDist?1:0; j0=t*L/mm; j1=(1-t)*L/mm; thin=f===5?0.7:1.0; if(/metacarpal/.test(B[b].name)){ thin=0.35; j0=99; } }
      
      { pv=rel.dot(ax)/LEN; const span=mI.clone().sub(mP).dot(lat); pu=(rel.dot(lat)-mP.clone().sub(wr).dot(lat))/span; if(!f||/metacarpal/.test(B[b].name)) isP=1; }   /* palm coords everywhere (continuous), mask separately */
      let kr=0; for(const k of knuck){ const dd=p.distanceTo(k)/mm; kr=Math.max(kr,Math.exp(-dd*dd/40)); } kr*=Math.max(0,dor);
      /* continuous crease coords: nearest finger joint (no dependence on the dominant bone, so no stepped seams) */
      let sa=0,sr=0,sw=0,bd=1e9; for(const [jc,jd] of JN){ const r=p.clone().sub(jc); const dd=r.length(); bd=Math.min(bd,dd); const a=r.dot(jd)/mm, rr=Math.sqrt(Math.max(0,dd*dd-r.dot(jd)**2))/mm, w=Math.exp(-Math.pow(dd/mm/5,2))+1e-30; sa+=a*w; sr+=rr*w; sw+=w; } let ja=sw>1e-20?sa/sw:99, jr=sw>1e-20?sr/sw:99; if(bd/mm>40){ ja=99; jr=99; }   /* soft-blended over nearby joints: smooth across finger borders */
      aR.set([dor,u,v,isD],i*4); aJ.set([ja,jr,f,thin],i*4); aP.set([pu,pv,isP,kr],i*4); }
    g.setAttribute('aB',new T.BufferAttribute(aB,3)); g.setAttribute('aR',new T.BufferAttribute(aR,4)); g.setAttribute('aJ',new T.BufferAttribute(aJ,4)); g.setAttribute('aP',new T.BufferAttribute(aP,4));
    /* anatomical relief on the render mesh only (dorsal knuckle bumps, thenar/hypothenar mass); the contact mesh is untouched */
    const KN=[]; ['index','middle','ring','pinky'].forEach(f=>{ KN.push([J(f+'-finger-phalanx-proximal'),1.7,7]); KN.push([J(f+'-finger-phalanx-intermediate'),0.9,5]); KN.push([J(f+'-finger-phalanx-distal'),0.45,4]); });
    const thenar=tM.clone().lerp(J('thumb-phalanx-proximal'),0.35), hyp=wr.clone().lerp(mP,0.45);
    for(let i=0;i<n;i++){ p.fromArray(P,i*3); nn.fromArray(N,i*3); const dor=-nn.dot(pn); let dsp=0; for(const [c,A,S] of KN){ const dd=p.distanceTo(c)/mm; dsp+=A*Math.exp(-dd*dd/(S*S))*Math.max(0,dor); }
      const dt=p.distanceTo(thenar)/mm, dh=p.distanceTo(hyp)/mm; dsp+=Math.max(0,-dor)*(1.4*Math.exp(-dt*dt/196)+0.9*Math.exp(-dh*dh/256));
      P[i*3]+=nn.x*dsp*mm; P[i*3+1]+=nn.y*dsp*mm; P[i*3+2]+=nn.z*dsp*mm; }
    g.attributes.position.needsUpdate=true; g.computeVertexNormals(); weldNormals(g); }
  /* ---------- skin shader ---------- */
  const NOISE=`
  float h31(vec3 p){ p=fract(p*0.3183099+vec3(0.1,0.2,0.3)); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float vn(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f); return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z); }
  float fbm(vec3 p){ return vn(p)*0.55+vn(p*2.03)*0.28+vn(p*4.1)*0.17; }
  float cell(vec3 p){ vec3 i=floor(p), f=fract(p); float m=1.0; for(int z=-1;z<=1;z++) for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec3 o=vec3(float(x),float(y),float(z)); vec3 r=o+vec3(h31(i+o),h31(i+o+11.1),h31(i+o+27.3))-f; m=min(m,dot(r,r)); } return sqrt(m); }
  float line(float d,float w){ return exp(-(d*d)/(w*w)); }`;
  function material(skinned,LOWQ){ const T=THREE; const m=new T.MeshPhysicalMaterial({color:0xffffff,roughness:0.5,metalness:0,clearcoat:1.0,clearcoatRoughness:0.12,skinning:skinned,side:T.FrontSide,envMapIntensity:0.55,sheen:new T.Color(0x2a1410)});
    m.extensions={derivatives:true}; m.defines={LOWQ:LOWQ?1:0};
    m.onBeforeCompile=sh=>{
      sh.uniforms.uPress={value:PRESS}; flatInit(); sh.uniforms.uFlat={value:FLAT.v}; sh.uniforms.uGi={value:FLAT.gi}; sh.uniforms.uG={value:FLAT.g}; sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform vec4 uPress; uniform vec4 uFlat; uniform mat4 uGi; uniform mat4 uG; attribute vec3 aB; attribute vec4 aR; attribute vec4 aJ; attribute vec4 aP; varying vec3 vB; varying vec4 vR; varying vec4 vJ; varying vec4 vP;')
        .replace('#include <begin_vertex>','#include <begin_vertex>\nvB=aB; vR=aR; vJ=aJ; vP=aP;\n { int fi=int(aJ.z+0.5); float pr=fi==1?uPress.x:fi==2?uPress.y:fi==3?uPress.z:fi==4?uPress.w:0.0; float pad=aR.w*smoothstep(0.35,0.75,aR.y)*smoothstep(0.1,-0.5,aR.x); float side=smoothstep(0.35,0.95,abs(aR.z)); transformed+=objectNormal*pr*pad*side*0.00055; }').replace('#include <skinning_vertex>','#include <skinning_vertex>\n { int fj=int(aJ.z+0.5); float pl=fj==1?uFlat.x:fj==2?uFlat.y:fj==3?uFlat.z:fj==4?uFlat.w:-1e4; float wd=smoothstep(0.5,0.9,aR.w); if(pl>-1e3&&wd>0.0){ vec4 gp=uGi*(modelMatrix*vec4(transformed,1.0)); float dz=pl-gp.z; if(dz>0.0){ gp.z+=dz*wd; transformed=(inverse(modelMatrix)*(uG*gp)).xyz; } } }');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vB; varying vec4 vR; varying vec4 vJ; varying vec4 vP; float gNail; float gThin;'+NOISE+`
  /* returns albedo (linear), roughness, height (mm) and nail mask */
  void skinField(out vec3 alb,out float rough,out float h,out float nail){
    vec3 p=vB; float dor=vR.x, u=vR.y, v=vR.z, isD=vR.w, j0=vJ.x, j1=vJ.y, fid=vJ.z, pu=vP.x, pv=vP.y, isP=vP.z, kr=vP.w; float palm=clamp(-dor*1.4,0.0,1.0), back=clamp(dor*1.4,0.0,1.0);
    vec3 base=vec3(0.45,0.21,0.13); vec3 pink=vec3(0.55,0.24,0.16); vec3 tanC=vec3(0.40,0.19,0.115);
    alb=mix(base,pink,palm*0.6); alb=mix(alb,tanC,back*0.4);
    float mott=fbm(p*0.12); alb*=0.92+0.16*mott; alb=mix(alb,alb*vec3(1.08,0.9,0.88),smoothstep(0.55,0.8,fbm(p*0.05+3.0))*0.5);
    float tip=isD*smoothstep(0.35,1.0,u); alb=mix(alb,alb*vec3(1.1,0.78,0.74),tip*0.55+kr*0.45);
    h=0.0; rough=0.6-palm*0.05;
    /* pores / micro relief (fades with pixel footprint to avoid aliasing) */
    float fw=length(fwidth(p)); float pf=LOWQ==1?0.0:(1.0-smoothstep(0.08,0.35,fw));
    float c1=cell(p*3.4); h+=pf*(smoothstep(0.0,0.22,c1)-1.0)*0.010; h+=pf*(fbm(p*2.2)-0.5)*0.016+pf*(fbm(p*0.7)-0.5)*0.02; rough+=pf*(0.5-c1)*0.05;   /* fine pores + soft micro relief */
    /* palm side: dermal ridges on finger pads and palm */
    float ridges=sin(dot(p,vec3(0.7,0.3,0.0))*9.0+fbm(p*0.6)*6.0); h+=pf*palm*(isD*0.6+isP*0.3)*ridges*0.008;
    /* joint creases: palm side = deep folds, back = wrinkle bundles */
    { float ja=j0, jr=j1; float fm=exp(-jr*jr/90.0);
      /* palm side: double flexion fold just distal to each joint; back: soft wrinkle bundle centred on the knuckle */
      float fold=line(ja-1.2,0.55)+line(ja-2.6,0.45)*0.7; h-=fm*palm*fold*0.07; alb*=1.0-fm*palm*fold*0.13;
      float wb=fm*back*exp(-ja*ja/10.0)*(0.5+0.5*sin(ja*3.4+fbm(p*0.4)*2.0)); h-=wb*0.045; alb*=1.0-wb*0.08; }
    /* palm lines (heart, head, life) */
    { float pm=smoothstep(1.0,0.86,pv)*smoothstep(-0.1,0.05,pv); float pd=pm*palm*smoothstep(0.05,0.2,pv); float wob=(fbm(p*0.35)-0.5)*0.05;
      float heart=line(pv-(0.83-0.12*pu*pu)+wob,0.02), head=line(pv-(0.66+0.12*(pu-0.3))+wob,0.02), life=line(length(vec2((pu-0.95)*1.0,(pv-0.62)*1.3))-0.48+wob,0.02);
      float pl=pd*max(heart,max(head*step(0.1,pu),life*step(pu,0.95)*step(0.2,pv))); h-=pl*0.09; alb*=1.0-pl*0.10;
      /* extensor tendons + veins on the back of the hand */
      float tb=pm*back*smoothstep(0.15,0.55,pv)*smoothstep(1.05,0.8,pv); float ten=0.0; for(int k=0;k<4;k++){ float ux=float(k)/3.0; float c=mix(0.5,ux,pv); ten=max(ten,line(pu-c,0.03)); } h+=tb*ten*0.12;
      float vb=pm*back*smoothstep(0.0,0.3,pv)*smoothstep(1.0,0.7,pv); float vw=(fbm(p*0.08)-0.5)*0.25; float vein=max(line(pu-0.32-vw-0.1*sin(pv*6.0),0.022),line(pu-0.66+vw-0.08*sin(pv*5.0+1.0),0.02)); vein=max(vein,line(pu+pv*0.6-0.95+vw,0.018)*step(0.4,pv));
      h+=vb*vein*0.14; alb=mix(alb,alb*vec3(0.9,0.93,1.04),vb*vein*0.45); }
    /* nails: plate on the dorsal distal segment, cuticle, lunula, free edge */
    nail=0.0; { float dm=smoothstep(0.97,1.0,isD); float e=length(vec2(v/0.6,(u-0.66)/0.36)); float nm=dm*smoothstep(1.0,0.94,e)*smoothstep(0.25,0.5,dor); nail=nm;
      float cut=dm*line(e-1.0,0.05)*smoothstep(0.25,0.5,dor)*smoothstep(0.7,0.6,u); h+=nm*(0.16+0.10*(1.0-clamp(v*v/0.36,0.0,1.0)))-cut*0.06;   /* transverse curvature: domed plate */ 
      vec3 plate=mix(vec3(0.72,0.34,0.30),vec3(0.66,0.40,0.34),smoothstep(0.55,0.9,u));   /* pinker nail bed toward the cuticle */ float lun=smoothstep(0.32,0.24,u-0.2+abs(v)*0.15)*nm; plate=mix(plate,vec3(0.78,0.62,0.55),lun*0.6); float free_=smoothstep(0.92,0.98,u)*nm; plate=mix(plate,vec3(0.86,0.8,0.72),free_);
      plate*=0.95+0.1*sin(v*40.0)*0.5; alb=mix(alb,plate,nm); alb=mix(alb,alb*vec3(0.85,0.7,0.68),cut*0.5); rough=mix(rough,0.14,nm); }
    gThin=vJ.w; }`);
      sh.fragmentShader=sh.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n vec3 sAlb; float sRough, sH, sNail; skinField(sAlb,sRough,sH,sNail); diffuseColor.rgb=sAlb; gNail=sNail;')
        .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n roughnessFactor=sRough;')
        .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   { vec3 zSp=-vViewPosition; vec3 zDx=dFdx(zSp); vec3 zDy=dFdy(zSp); float zHx=dFdx(sH)*0.1; float zHy=dFdy(sH)*0.1; vec3 zR1=cross(zDy,normal); vec3 zR2=cross(normal,zDx); float zDet=dot(zDx,zR1); vec3 zG=sign(zDet)*(zHx*zR1+zHy*zR2); normal=normalize(abs(zDet)*normal-zG); }`)
        .replace('#include <lights_physical_fragment>','#include <lights_physical_fragment>\n #ifdef CLEARCOAT\n material.clearcoat=clearcoat*(0.06+0.94*gNail);\n #endif')
        .replace('reflectedLight.directDiffuse += ( 1.0 - clearcoatDHR ) * irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );',
          `{ float nl=dot(geometry.normal,directLight.direction); vec3 w=vec3(0.32,0.12,0.07)*(1.0-gNail);   /* per-channel wrap: red light bleeds past the terminator */
             vec3 wrapD=clamp((vec3(nl)+w)/(1.0+w),0.0,1.0); vec3 E=directLight.color; 
             #ifndef PHYSICALLY_CORRECT_LIGHTS
             E*=PI;
             #endif
             reflectedLight.directDiffuse += ( 1.0 - clearcoatDHR ) * E * wrapD * BRDF_Diffuse_Lambert( material.diffuseColor );
             float bl=pow(clamp(dot(-geometry.normal,directLight.direction),0.0,1.0),1.5)*gThin; reflectedLight.directDiffuse += E*bl*vec3(0.20,0.035,0.018)*(1.0-gNail); }`)
        .replace('#include <lights_fragment_end>','#include <lights_fragment_end>\n reflectedLight.indirectDiffuse*=vec3(1.04,0.97,0.95);');
    };
    return m; }
  function fabric(){ const T=THREE; const m=new T.MeshPhysicalMaterial({color:new T.Color(0x1d2433).convertSRGBToLinear(),roughness:0.92,metalness:0,sheen:new T.Color(0x2a3550),side:T.DoubleSide}); m.extensions={derivatives:true};
    m.onBeforeCompile=sh=>{ sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vO;').replace('#include <begin_vertex>','#include <begin_vertex>\nvO=position;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vO;'+NOISE).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      { float zA=atan(vO.x,vO.z); float zH=((sin(zA*90.0)*0.5+0.5)*0.6+vn(vO*900.0)*0.4)*0.06; vec3 zSp=-vViewPosition; vec3 zDx=dFdx(zSp); vec3 zDy=dFdy(zSp); float zHx=dFdx(zH); float zHy=dFdy(zH); vec3 zR1=cross(zDy,normal); vec3 zR2=cross(normal,zDx); float zDet=dot(zDx,zR1); normal=normalize(abs(zDet)*normal-sign(zDet)*(zHx*zR1+zHy*zR2)); }`)
      .replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb*=0.85+0.3*vn(vO*600.0);'); };
    return m; }
  /* ---------- apply to every hand in the scene ---------- */
  /* v8 fleshy fingertip pad: palmar skin of the distal segment bulges below the bone (max ~PB mm at 55-80% along the pad),
     with a flattened underside (soft plateau) like a pad under light pressure. Applied in bind space to the base mesh so
     the contact/collision mesh and the HD render mesh share the same shape. */
  function padBulge(g,mesh){ if(g.userData&&g.userData.padBulge) return; const T=THREE, B=mesh.skeleton.bones, n=g.attributes.position.count, P=g.attributes.position.array, SI=g.attributes.skinIndex.array, SW=g.attributes.skinWeight.array;
    const bp=mesh.skeleton.boneInverses.map(m=>new T.Vector3().setFromMatrixPosition(m.clone().invert())); const bi=nm=>B.findIndex(b=>b.name===nm); const J=nm=>bp[bi(nm)];
    const wr=J('wrist'), mI=J('index-finger-phalanx-proximal'), mM=J('middle-finger-phalanx-proximal'), mR=J('ring-finger-phalanx-proximal'), mP=J('pinky-finger-phalanx-proximal'), tM=J('thumb-metacarpal');
    const ax=mM.clone().sub(wr); const mm=ax.length()/95; ax.normalize(); let lat=mI.clone().sub(mP); lat.sub(ax.clone().multiplyScalar(lat.dot(ax))).normalize(); let pn=new T.Vector3().crossVectors(ax,lat).normalize();
    const cen=mI.clone().add(mM).add(mR).add(mP).multiplyScalar(0.25).add(wr).multiplyScalar(0.5); if(tM.clone().sub(cen).dot(pn)>0) pn.negate(); if(window.PNSIGN) pn.multiplyScalar(PNSIGN);
    const PB=(window.PADBULGE!=null?PADBULGE:1.6)*mm; const F=['index','middle','ring','pinky']; const D={}, Tp={};
    F.forEach(f=>{ D[bi(f+'-finger-phalanx-distal')]=f; Tp[f]=[J(f+'-finger-phalanx-distal'),J(f+'-finger-tip')]; });
    const tipB=new Set(F.map(f=>bi(f+'-finger-tip')));
    const p=new T.Vector3();
    const fw=i=>{ let w=0, f=null; for(let c=0;c<4;c++){ const b=SI[i*4+c]; const nm=B[b]&&B[b].name; const ff=SW[i*4+c]>0.001&&F.find(x=>nm===x+'-finger-phalanx-distal'||nm===x+'-finger-tip'); if(ff){ w+=SW[i*4+c]; f=ff; } } return [w,f]; };
    /* per-finger skin axis: DIP joint to the centroid of the far end of the skin */
    const AX={}; F.forEach(f=>{ const [A,E]=Tp[f]; const d0=E.clone().sub(A).normalize(); const vs=[]; for(let i=0;i<n;i++){ const [w,ff]=fw(i); if(ff!==f||w<0.5) continue; p.fromArray(P,i*3); vs.push(p.clone()); } let tm=-1e9; vs.forEach(q=>tm=Math.max(tm,q.clone().sub(A).dot(d0))); const far=vs.filter(q=>q.clone().sub(A).dot(d0)>tm-2*mm); const c=far.reduce((a,q)=>a.add(q),new T.Vector3()).multiplyScalar(1/Math.max(1,far.length)); const d=c.sub(A).normalize(); let te=-1e9; vs.forEach(q=>te=Math.max(te,q.clone().sub(A).dot(d))); const pf=pn.clone().sub(d.clone().multiplyScalar(pn.dot(d))).normalize(); AX[f]={A,d,d0,te,pf0:pn.clone().sub(d0.clone().multiplyScalar(pn.dot(d0))).normalize(),pf,nvs:vs.length,nfar:far.length,tm:tm/mm}; });
    const PBD={n:0,maxAmt:0,maxRet:0,nv:n,te:F.map(f=>[AX[f].te/mm,AX[f].nvs,AX[f].nfar,AX[f].tm])}; (window._PBD=window._PBD||[]).push(PBD);
    for(let i=0;i<n;i++){ const [w,f]=fw(i); if(i===400) PBD.pre400=[w,f,[0,1,2,3].map(c=>[B[SI[i*4+c]].name,SW[i*4+c]])]; if(!f||w<0.05) continue;
      const {A,d,d0,te,pf,pf0}=AX[f]; p.fromArray(P,i*3); const r=p.clone().sub(A); const t=r.dot(d)/te; const rp=r.clone().sub(d0.clone().multiplyScalar(r.dot(d0))); const rl=rp.length(); if(rl<1e-6) continue; const s=(window.RSIGN!=null?RSIGN:-1)*rp.dot(pf0)/rl;   /* -1: pad side = the side that faces the board when the distal is shallow (checked: lowest point moves off the nail end) */
      /* v11 fleshy pad: palmar flesh below the distal bone, fullest a few mm behind the end; nail side of the end drawn back so the pad, not the nail, is the end of the finger */
      const TC=window.PADTC!=null?PADTC:0.72, TW=window.PADTW!=null?PADTW:0.22; const bell=Math.exp(-Math.pow((t-TC)/TW,2)); const fade=t>0.9?Math.max(0,1-(t-0.9)/0.12):1;
      const amt=(s>0?PB*w*Math.pow(s,1.4)*bell*fade:0); const u=Math.min(1,Math.max(0,(t-0.7)/0.3)), uu=u*u*(3-2*u);
      const ret=(window.TIPRET!=null?TIPRET:2.2)*mm*w*uu*Math.max(0,0.4-s)/1.4, ext=(window.TIPEXT!=null?TIPEXT:0.5)*mm*w*uu*Math.max(0,s);
      if(i===400) PBD.v400={t,s,w,f,amt:amt/mm,ret:ret/mm,ext:ext/mm,bm:mesh.bindMatrix.elements.slice(0,4)};      PBD.n++; PBD.maxAmt=Math.max(PBD.maxAmt,amt/mm); PBD.maxRet=Math.max(PBD.maxRet,ret/mm);
      p.add(pf.clone().multiplyScalar(amt)).add(d.clone().multiplyScalar(ext-ret)); { const dd=Math.hypot(p.x-P[i*3],p.y-P[i*3+1],p.z-P[i*3+2])/mm; if(dd>(PBD.maxD||0)){ PBD.maxD=dd; PBD.maxI=i; } } P[i*3]=p.x; P[i*3+1]=p.y; P[i*3+2]=p.z; }
    g.attributes.position.needsUpdate=true; g.computeVertexNormals(); g.computeBoundingSphere(); g.userData=g.userData||{}; g.userData.padBulge=1; }
  function upgrade(root){ if(/[?&]hd=0/.test(location.search)){ root.traverse(o=>{ if(o.isSkinnedMesh&&o.skeleton&&o.skeleton.bones.some(b=>/index-finger/.test(b.name))) padBulge(o.geometry,o); }); return 0; } let k=0; const todo=[];
    root.traverse(o=>{ if(o.isSkinnedMesh&&!o.userData.hd&&!o.userData.hdCopy&&o.skeleton&&o.skeleton.bones.some(b=>/index-finger/.test(b.name))) todo.push(o); });
    todo.forEach(o=>{ o.userData.hd=1; padBulge(o.geometry,o); o.userData.skin=1; const g=tess(o.geometry,LOW?1:2); regions(g,o); g.computeBoundingSphere(); const hd=new THREE.SkinnedMesh(g,material(true,LOW)); hd.userData.hdCopy=1; hd.frustumCulled=false; hd.castShadow=true; hd.receiveShadow=true;
      hd.bind(o.skeleton,o.bindMatrix); o.parent.add(hd); o.material.colorWrite=false; o.material.depthWrite=false; o.visible=true; o.material.transparent=true; o.material.opacity=0; o.renderOrder=-1; k++;
      /* forearm: skin material + sleeve on the far half */
      const arms=[]; const wb=o.skeleton.bones.find(b=>b.name==='wrist'); const ap=wb&&wb.parent; ap&&ap.traverse(a=>{ if(a.isMesh&&!a.isSkinnedMesh&&a.geometry&&a.geometry.type==='CylinderGeometry'&&a.geometry.parameters.openEnded&&!a.userData.hdArm) arms.push(a); });
      arms.forEach(a=>armHD(a,o)); });
    if(k&&window.render3d) render3d(); return k; }
  function armHD(a,hand){ const T=THREE; a.userData.hdArm=1; const gp=a.geometry.parameters, L=gp.height, r0=gp.radiusTop, r1=gp.radiusBottom;
    /* tapered forearm with an elliptical, slightly flattened section and a soft wrist (lathe profile) */
    const NS=64, NL=24, pos=[], idx=[], nor=[];
    const wristB=hand.skeleton.bones.find(b=>b.name==='wrist'); const wp=new T.Vector3(); wristB.getWorldPosition(wp); const top=a.localToWorld(new T.Vector3(0,L/2,0)), bot=a.localToWorld(new T.Vector3(0,-L/2,0)); const wristAtTop=top.distanceTo(wp)<bot.distanceTo(wp);
    for(let i=0;i<=NL;i++){ const t=i/NL; const y=(wristAtTop?1:-1)*(L/2-t*L); const tw=t; let r=r0+(r1-r0)*(wristAtTop?tw:1-tw); const sm=Math.min(1,tw/0.22); r*=(0.84+0.16*sm*sm*(3-2*sm))*(1.0+0.07*Math.sin(Math.min(1,tw*1.6)*Math.PI*0.5));
      for(let j=0;j<=NS;j++){ const ang=j/NS*Math.PI*2; const ex=1.0+0.05*Math.cos(ang*2); const x=Math.cos(ang)*r*ex, z=Math.sin(ang)*r*(1.02-0.04*Math.cos(ang*2)); pos.push(x,y,z); nor.push(Math.cos(ang),0,Math.sin(ang)); } }
    for(let i=0;i<NL;i++) for(let j=0;j<NS;j++){ const p0=i*(NS+1)+j, p1=p0+NS+1; idx.push(p0,p1,p0+1, p0+1,p1,p1+1); }
    const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setIndex(idx); g.computeVertexNormals();
    const n=pos.length/3, aB=new Float32Array(n*3), aR=new Float32Array(n*4), aJ=new Float32Array(n*4), aP=new Float32Array(n*4); for(let i=0;i<n;i++){ aB[i*3]=pos[i*3]*1000; aB[i*3+1]=pos[i*3+1]*1000; aB[i*3+2]=pos[i*3+2]*1000; aR[i*4]=0.45; aJ.set([99,99,0,0.2],i*4); }
    g.setAttribute('aB',new T.BufferAttribute(aB,3)); g.setAttribute('aR',new T.BufferAttribute(aR,4)); g.setAttribute('aJ',new T.BufferAttribute(aJ,4)); g.setAttribute('aP',new T.BufferAttribute(aP,4));
    a.geometry=g; a.material=material(false,LOW); a.material.side=T.DoubleSide;   /* the open forearm tube end meets the wrist: render its inside too, so no dark shards show through */ a.castShadow=true;
    /* sleeve: knit cuff + sleeve over the far 45 %, with a rolled edge */
    const sl=0.45*L, sy=(wristAtTop?-1:1)*(L/2-sl/2), rr=Math.max(r0,r1)*1.22;
    const sleeve=new T.Mesh(new T.CylinderGeometry(rr*(wristAtTop?1:1.06),rr*(wristAtTop?1.06:1),sl,64,1,true),fabric()); sleeve.position.y=sy; sleeve.userData.hdArm=1; a.add(sleeve);
    const cuffY=sy+(wristAtTop?1:-1)*(sl/2-0.006); const cuff=new T.Mesh(new T.CylinderGeometry(rr*1.05,rr*1.05,0.012,64,1,true),fabric()); cuff.position.y=cuffY; cuff.userData.hdArm=1; a.add(cuff); }
  let tries=0; const iv=setInterval(()=>{ try{ let k=0; if(window.S3&&S3.scene) k+=upgrade(S3.scene); if(window.RH&&RH.R&&RH.R.scene) k+=upgrade(RH.R.scene); if(++tries>240) clearInterval(iv); }catch(e){ console.warn('handhd',e.message); clearInterval(iv); } },500);
  function setFlat(P){ flatInit(); const G=(typeof GUIT!=='undefined')?GUIT:null; if(!G||window.NOFLAT||!window.FLATON){ FLAT.v.set(-1e4,-1e4,-1e4,-1e4); return; } G.updateMatrixWorld(true); FLAT.g.copy(G.matrixWorld); FLAT.gi.copy(G.matrixWorld).invert(); const z=[1,2,3,4].map(k=>{ const F=P&&P.fing&&P.fing[k]; if(!F||!F.on||!F.str) return -1e4; const q=new THREE.Vector3(F.str.x,F.str.y,F.str.z).applyMatrix4(FLAT.gi); return q.z-(window.FLATSINK!=null?FLATSINK:0); }); FLAT.v.set(z[0],z[1],z[2],z[3]); }
  window.setFlat=setFlat;
  function hook(){ if(!window.applyPose||applyPose._hd) return; const ap=applyPose; window.applyPose=function(P){ const r=ap.apply(this,arguments); try{ PRESS.set(...[1,2,3,4].map(k=>P&&P.fing&&P.fing[k]&&P.fing[k].on?1:0)); }catch(e){} try{ setFlat(P); }catch(e){} return r; }; window.applyPose._hd=1; }
  const hv=setInterval(()=>{ if(window.applyPose){ hook(); clearInterval(hv); } },300);
  return {upgrade,tess,PRESS};
})();
