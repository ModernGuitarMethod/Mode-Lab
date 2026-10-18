/* Les Paul photoreal layer: crisp procedural/vector textures (photo = reference + colour sampling only), PBR materials,
   modelled hardware detail, CC0 HDRI studio lighting (Poly Haven "studio_small_09", CC0), ACES + bloom (+ optional DOF).
   Quality: ?q=high|low, the Quality menu (localStorage 'h3dq'), default low on phones/tablets. */
window.PR=(function(){
  const qs=location.search, EX='https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/';
  const mobile=/iPad|iPhone|iPod|Android|Mobile/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&/Mac/.test(navigator.platform));
  const pickQ=()=>{ const m=qs.match(/[?&]q=(high|low)/); if(m) return m[1]; let s=null; try{ s=localStorage.getItem('h3dq'); }catch(_){} return s==='high'||s==='low'?s:(mobile?'low':'high'); };
  const Q=pickQ(); let S=null,T=null,comp=null,bokeh=null,maxAn=8; const TX={};
  const ls=src=>new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=()=>rej(new Error('load '+src)); document.head.appendChild(s); });
  let seed=12345; const rnd=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
  const cnv=(w,h)=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; };
  function tex(c,o){ o=o||{}; const t=new T.CanvasTexture(c); if(o.srgb) t.encoding=T.sRGBEncoding; if(o.wrap){ t.wrapS=t.wrapT=T.RepeatWrapping; } if(o.rep) t.repeat.set(o.rep[0],o.rep[1]); t.anisotropy=maxAn; return t; }
  const sstep=(a,b,x)=>{ const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };
  /* ---------- small shared maps ---------- */
  function maps(){ if(TX.ok) return TX; TX.ok=1;
    /* clearcoat roughness: polish swirls, dust, two fingerprints (G channel) */
    { const c=cnv(2048,2048), x=c.getContext('2d'); x.fillStyle='rgb(30,30,30)'; x.fillRect(0,0,2048,2048);
      for(let k=0;k<14;k++){ const cx=rnd()*2048, cy=rnd()*2048; for(let r=20;r<520;r+=3+rnd()*5){ x.strokeStyle=`rgba(255,255,255,${0.03+rnd()*0.05})`; x.lineWidth=0.6+rnd(); x.beginPath(); const a0=rnd()*6.28; x.arc(cx,cy,r,a0,a0+0.3+rnd()*1.4); x.stroke(); } }
      for(let k=0;k<2600;k++){ x.fillStyle=`rgba(255,255,255,${0.15+rnd()*0.5})`; x.fillRect(rnd()*2048,rnd()*2048,1+rnd()*1.6,1+rnd()*1.6); }
      [[1500,620],[560,1450]].forEach(([fx,fy])=>{ x.save(); x.translate(fx,fy); x.rotate(rnd()*3); x.scale(1,1.35); for(let r=4;r<62;r+=3.2){ x.strokeStyle='rgba(255,255,255,0.22)'; x.lineWidth=1.3; x.beginPath(); x.ellipse(0,0,r,r*0.8,0,0.2,6.0); x.stroke(); } x.restore(); });
      TX.imperf=tex(c,{wrap:1}); }
    /* brushed metal roughness (fine streaks along U) */
    { const c=cnv(1024,1024), x=c.getContext('2d'); x.fillStyle='rgb(150,150,150)'; x.fillRect(0,0,1024,1024); for(let k=0;k<5000;k++){ const v=110+rnd()*120|0; x.fillStyle=`rgba(${v},${v},${v},0.35)`; x.fillRect(rnd()*1024,rnd()*1024,40+rnd()*500,0.6+rnd()*0.8); } TX.brushed=tex(c,{wrap:1,rep:[2,2]}); }
    /* binding ply (bands along the edge, v = around the tube) */
    { const c=cnv(8,256), x=c.getContext('2d'); const B=[['#f1e9d4',0,150],['#111',150,166],['#f1e9d4',166,184],['#111',184,198],['#f1e9d4',198,256]]; B.forEach(([col,a,b])=>{ x.fillStyle=col; x.fillRect(0,a,8,b-a); }); TX.ply=tex(c,{srgb:1,wrap:1}); }
    /* knurl bump for knob sides */
    { const c=cnv(256,8), x=c.getContext('2d'); for(let i=0;i<256;i+=8){ const g=x.createLinearGradient(i,0,i+8,0); g.addColorStop(0,'#000'); g.addColorStop(0.5,'#fff'); g.addColorStop(1,'#000'); x.fillStyle=g; x.fillRect(i,0,8,8); } TX.knurl=tex(c,{wrap:1,rep:[6,1]}); }
    /* fret wear: ends duller and rougher (U = along the fret) */
    { const c=cnv(512,8), x=c.getContext('2d'); for(let i=0;i<512;i++){ const e=Math.min(i,511-i)/512; const v=255-Math.round(150*(1-sstep(0,0.09,e))); x.fillStyle=`rgb(${v},${v},${v})`; x.fillRect(i,0,1,8); } TX.fretCol=tex(c,{srgb:1});
      const r=cnv(512,8), y=r.getContext('2d'); for(let i=0;i<512;i++){ const e=Math.min(i,511-i)/512; const v=60+Math.round(170*(1-sstep(0,0.09,e)))+(rnd()*20|0); y.fillStyle=`rgb(${v},${v},${v})`; y.fillRect(i,0,1,8); } TX.fretRough=tex(r); }
    /* soft contact shadow (AO decal) */
    { const c=cnv(256,256), x=c.getContext('2d'); const g=x.createRadialGradient(128,128,10,128,128,128); g.addColorStop(0,'rgba(0,0,0,0.85)'); g.addColorStop(0.55,'rgba(0,0,0,0.45)'); g.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=g; x.fillRect(0,0,256,256); TX.ao=tex(c); }
    { const c=cnv(8,64), x=c.getContext('2d'); const g=x.createLinearGradient(0,0,0,64); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(0.5,'rgba(0,0,0,0.75)'); g.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=g; x.fillRect(0,0,8,64); TX.aoLine=tex(c); }
    return TX; }
  /* mother-of-pearl fill inside the current clip */
  function pearl(x,X,Y,W,H){ x.fillStyle='#e9e6dd'; x.fillRect(X,Y,W,H); const n=Math.max(30,(W*H)/180|0); const cols=['255,240,245','225,245,240','230,235,255','255,255,250','205,200,195','245,230,215'];
    for(let k=0;k<n;k++){ const cx=X+rnd()*W, cy=Y+rnd()*H, r=Math.max(W,H)*(0.05+rnd()*0.25); const g=x.createRadialGradient(cx,cy,0,cx,cy,r); g.addColorStop(0,`rgba(${cols[k%6]},${0.25+rnd()*0.35})`); g.addColorStop(1,`rgba(${cols[k%6]},0)`); x.fillStyle=g; x.fillRect(X,Y,W,H); }
    for(let k=0;k<n/3;k++){ x.strokeStyle=`rgba(${rnd()<0.5?'180,175,170':'255,255,255'},${0.15+rnd()*0.2})`; x.lineWidth=0.5+rnd()*1.2; x.beginPath(); const sx=X+rnd()*W, sy=Y+rnd()*H; x.moveTo(sx,sy); x.quadraticCurveTo(sx+(rnd()-0.5)*W*0.6,sy+(rnd()-0.5)*H*0.6,sx+(rnd()-0.5)*W,sy+(rnd()-0.5)*H); x.stroke(); } }
  /* smooth hi-res inside mask from a low-res alpha: blur-upscale, then threshold with a 1.5 px AA ramp */
  function hiMask(src,W2,H2,blur,test){ const c=cnv(W2,H2), x=c.getContext('2d'); x.imageSmoothingQuality='high'; x.filter=`blur(${blur}px)`; x.drawImage(src,0,0,W2,H2); x.filter='none';
    const d=x.getImageData(0,0,W2,H2).data, A=new Float32Array(W2*H2); for(let q=0;q<A.length;q++){ const v=test?test(d,q*4):d[q*4+3]; A[q]=sstep(108,148,v); } return A; }
  function dist(A,W2,H2,edgeRight){ const D=new Float32Array(W2*H2); for(let q=0;q<D.length;q++) D[q]=A[q]>0.5?1e6:0;
    for(let y=0;y<H2;y++) for(let x=0;x<W2;x++){ const q=y*W2+x; if(!D[q]) continue; let v=D[q]; if(x>0) v=Math.min(v,D[q-1]+1); if(y>0){ v=Math.min(v,D[q-W2]+1); if(x>0) v=Math.min(v,D[q-W2-1]+1.4142); if(x<W2-1) v=Math.min(v,D[q-W2+1]+1.4142); } D[q]=v; }
    for(let y=H2-1;y>=0;y--) for(let x=W2-1;x>=0;x--){ const q=y*W2+x; if(!D[q]) continue; let v=D[q]; if(x<W2-1) v=Math.min(v,D[q+1]+1); if(y<H2-1){ v=Math.min(v,D[q+W2]+1); if(x<W2-1) v=Math.min(v,D[q+W2+1]+1.4142); if(x>0) v=Math.min(v,D[q+W2-1]+1.4142); } D[q]=v; } return D; }
  /* binding colour at distance dm (mm) from the edge; plies: [[mm,colour],...] */
  const CREAM=[241,233,212], BLK=[10,10,11];
  function plyAt(dm,P){ let a=0; for(const [w,c] of P){ if(dm<a+w){ return [c,Math.min(dm-a,a+w-dm)]; } a+=w; } return null; }
  /* lacquer albedo + binding into an ImageData, inside mask A, distances D (px), pxmm */
  function paintLacquer(img,A,D,W2,H2,pxmm,P,lim,LF,LFw,LFh){ const d=img.data; for(let y=0;y<H2;y++) for(let x=0;x<W2;x++){ const q=y*W2+x, o=q*4; const a=A[q]; if(a<=0){ d[o+3]=0; continue; }
      let col=BLK; let lf=0; if(LF){ const u=Math.min(LFw-1,x*LFw/W2|0), v=Math.min(LFh-1,y*LFh/H2|0); lf=LF[v*LFw+u]; }
      if(x<lim){ const dm=D[q]/pxmm; const pl=plyAt(dm,P); if(pl){ const [c,e]=pl; const t=sstep(0,0.09,e); const nb=BLK; col=[nb[0]+(c[0]-nb[0])*t,nb[1]+(c[1]-nb[1])*t,nb[2]+(c[2]-nb[2])*t]; if(c===CREAM){ const f=0.97+0.03*Math.sin(x*0.02+y*0.013); col=col.map(v=>v*f); } d[o]=col[0]; d[o+1]=col[1]; d[o+2]=col[2]; d[o+3]=255*a; continue; } }
      const k=1+lf; d[o]=Math.max(0,Math.min(40,BLK[0]*k)); d[o+1]=Math.max(0,Math.min(40,BLK[1]*k)); d[o+2]=Math.max(0,Math.min(42,BLK[2]*k*1.03)); d[o+3]=255*a; } }
  /* low-frequency "character" from the photo (heavily blurred luminance → ±35 % albedo variation, no visible pixels) */
  function lowFreq(src){ const w=128,h=Math.max(8,Math.round(128*src.height/src.width)); const c=cnv(w,h), x=c.getContext('2d'); x.filter='blur(3px)'; x.drawImage(src,0,0,w,h); const d=x.getImageData(0,0,w,h).data; const L=new Float32Array(w*h); let s=0,n=0;
    for(let q=0;q<w*h;q++){ if(d[q*4+3]<100) continue; L[q]=Math.min(120,(d[q*4]+d[q*4+1]+d[q*4+2])/3); s+=L[q]; n++; } const m=s/(n||1); for(let q=0;q<w*h;q++) L[q]=Math.max(-0.3,Math.min(0.35,(L[q]-m)/90)); return [L,w,h]; }
  const TOP_PLY=[[2.3,CREAM],[0.35,BLK],[0.35,CREAM],[0.35,BLK],[0.35,CREAM],[0.35,BLK],[0.35,CREAM]];   /* LP Custom: 7-ply top */
  const BACK_PLY=[[2.0,CREAM],[0.35,BLK],[0.35,CREAM]];   /* 3-ply back */
  const HS_PLY=[[1.5,CREAM],[0.3,BLK],[0.3,CREAM],[0.3,BLK],[0.3,CREAM]];   /* 5-ply headstock */
  /* ---------- front (top + fretboard) ---------- */
  function front(I,cv,o){ T=S3.THREE; maps(); const K=Q==='high'?Math.min(2.2,4400/o.CW):Math.min(1.4,2800/o.CW); const W2=Math.round(o.CW*K), H2=Math.round(o.CH*K), pxmm=I.S/25.4*K;
    const A=hiMask(cv,W2,H2,0.8*K); const lim=Math.round(o.xJ*K); for(let y=0;y<H2;y++) for(let x=lim;x<W2;x++) A[y*W2+x]=0; const Ad=A.slice(); for(let y=0;y<H2;y++) for(let x=lim-2;x<lim;x++) if(A[y*W2+x]>0.5) for(let k=0;k<12;k++) Ad[y*W2+x+k]=1;
    const D=dist(Ad,W2,H2); const out=cnv(W2,H2), x=out.getContext('2d'); const img=x.createImageData(W2,H2); const [LF,lw,lh]=lowFreq(cv);
    paintLacquer(img,A,D,W2,H2,pxmm,TOP_PLY,lim,LF,lw,lh); x.putImageData(img,0,0);
    x.save(); x.scale(K,K); x.translate(o.pL,o.pT); const py=wy=>-wy/2.54*I.S; const xE=o.xE, xN=o.xN;
    /* fretboard: ebony grain, edge binding, Custom block inlays */
    x.beginPath(); x.moveTo(xE,py(o.yTop(xE))); x.lineTo(xN+3,py(o.yTop(xN))); x.lineTo(xN+3,py(o.yBot(xN))); x.lineTo(xE,py(o.yBot(xE))); x.closePath(); x.save(); x.clip();
    x.fillStyle='#120e0b'; x.fillRect(xE-5,0,xN-xE+10,o.CH); for(let k=0;k<1400;k++){ const yy=py(o.yTop(xE))+(py(o.yBot(xE))-py(o.yTop(xE))+20)*rnd()-10, x0=xE+rnd()*(xN-xE), L=30+rnd()*260; const l=rnd()<0.5; x.strokeStyle=l?`rgba(70,52,40,${0.05+rnd()*0.12})`:`rgba(0,0,0,${0.1+rnd()*0.2})`; x.lineWidth=0.15+rnd()*0.5; x.beginPath(); x.moveTo(x0,yy); x.bezierCurveTo(x0+L*0.3,yy+(rnd()-0.5)*1.2,x0+L*0.7,yy+(rnd()-0.5)*1.2,x0+L,yy+(rnd()-0.5)*1.5); x.stroke(); }
    for(let k=0;k<900;k++){ x.fillStyle=`rgba(0,0,0,${0.3+rnd()*0.4})`; x.fillRect(xE+rnd()*(xN-xE),py(o.yTop(xE))+rnd()*(py(o.yBot(xE))-py(o.yTop(xE))),0.6+rnd()*1.6,0.18); }
    const fp=n=>I.nut[0][0]-I.S*I.SL*(1-Math.pow(2,-n/12));
    [1,3,5,7,9,12,15,17,19,21].forEach(f=>{ const a=fp(f-1), b=fp(f); if(b<xE) return; const sp=a-b, w=Math.max(sp*0.42,0.24*I.S), cx=(a+b)/2; const yt=py(o.yTop(cx)), yb=py(o.yBot(cx)), h=(yb-yt)*0.74, cy=(yt+yb)/2;
      x.save(); x.beginPath(); x.rect(cx-w/2,cy-h/2,w,h); x.clip(); pearl(x,cx-w/2,cy-h/2,w,h); x.restore(); x.strokeStyle='rgba(20,15,10,0.8)'; x.lineWidth=0.35; x.strokeRect(cx-w/2,cy-h/2,w,h); });
    x.restore();
    /* neck binding along both edges (single ply, ~1.6 mm seen from the top) */
    const bw=1.6/25.4*I.S; [[o.yTop,1],[o.yBot,-1]].forEach(([fy,s])=>{ x.beginPath(); x.moveTo(xE,py(fy(xE))); x.lineTo(xN+3,py(fy(xN))); x.lineTo(xN+3,py(fy(xN))+s*bw); x.lineTo(xE,py(fy(xE))+s*bw); x.closePath(); x.fillStyle='#efe7d2'; x.fill(); });
    /* selector-switch washer (RHYTHM / TREBLE) */
    const sw=I.parts.find(q=>q.n==='switch'); if(sw){ const [sx,sy,sr]=sw.c; x.save(); x.translate(sx,sy); x.beginPath(); x.arc(0,0,sr*1.55,0,7); x.fillStyle='#ece3cb'; x.fill(); x.beginPath(); x.arc(0,0,sr*0.62,0,7); x.fillStyle='#0b0b0b'; x.fill(); x.fillStyle='#1a1a1a'; x.font=`bold ${sr*0.42}px Helvetica,Arial,sans-serif`; x.textAlign='center'; x.textBaseline='middle'; x.fillText('RHYTHM',0,-sr*1.05); x.fillText('TREBLE',0,sr*1.05); x.restore(); }
    x.restore(); return out; }
  /* ---------- back photo → lacquer + binding at the photo's own (2x) resolution ---------- */
  function back(I,im,xLimPhoto){ T=S3.THREE; const W2=im.width, H2=im.height, sc=W2/I.W, pxmm=I.S/25.4*sc; const A=hiMask(im,W2,H2,1.2); const lim=Math.round(xLimPhoto*sc); const Ad=A.slice(); for(let y=0;y<H2;y++) for(let x=lim;x<W2;x++) if(A[y*W2+x]>0.5) Ad[y*W2+x]=1; const D=dist(Ad,W2,H2);
    const out=cnv(W2,H2), x=out.getContext('2d'), img=x.createImageData(W2,H2); const [LF,lw,lh]=lowFreq(im); paintLacquer(img,A,D,W2,H2,pxmm,BACK_PLY,lim,LF,lw,lh); x.putImageData(img,0,0); return out; }
  /* ---------- sides strip ---------- */
  function sides(){ const c=cnv(4096,512), x=c.getContext('2d'); x.fillStyle='#0a0a0b'; x.fillRect(0,0,4096,512); const rpc=256/5.0; /* rows per cm (5 cm deep body) */
    [0,256].forEach(h=>{ const band=(r0,P)=>{ let r=r0; P.forEach(([mm,col])=>{ const hh=mm/10*rpc; x.fillStyle=col===CREAM?'#efe7d2':'#0b0b0b'; x.fillRect(0,r,4096,hh); r+=hh; }); };
      band(h,[[4.2,CREAM],[0.35,BLK],[0.35,CREAM],[0.35,BLK],[0.35,CREAM]]); const r1=h+256-(2.6/10*rpc); band(r1,[[0.35,CREAM],[0.35,BLK],[1.9,CREAM]]); });
    return c; }
  /* ---------- headstock (photo = shape + pearl layout reference; output is redrawn at 3x) ---------- */
  function headstock(I,hs){ T=S3.THREE; const K=Q==='high'?3:2, W2=hs.width*K, H2=hs.height*K, pxmm=I.S/25.4*K; const A=hiMask(hs,W2,H2,0.9*K); const D=dist(A,W2,H2);
    const out=cnv(W2,H2), x=out.getContext('2d'), img=x.createImageData(W2,H2); paintLacquer(img,A,D,W2,H2,pxmm,HS_PLY,W2,null); 
    /* pearl / white elements: bright, unsaturated photo pixels well inside the binding; upscaled + thresholded so edges are crisp */
    /* low-res pearl mask with a 5x5 majority vote (drops glare speckles), then smooth-upscaled */
    const lw=hs.width, lh=hs.height, sd=hs.getContext('2d').getImageData(0,0,lw,lh).data, PM=new Uint8Array(lw*lh); for(let q=0;q<lw*lh;q++){ const o=q*4,r=sd[o],g=sd[o+1],b=sd[o+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b); PM[q]=sd[o+3]>100&&mx>150&&(mx-mn)/mx<0.3?1:0; }
    const pmc=cnv(lw,lh), pmx=pmc.getContext('2d'), pmi=pmx.createImageData(lw,lh); for(let y=2;y<lh-2;y++) for(let x=2;x<lw-2;x++){ let n=0; for(let j=-2;j<=2;j++) for(let i=-2;i<=2;i++) n+=PM[(y+j)*lw+x+i]; const o=(y*lw+x)*4; pmi.data[o+3]=n>=14?255:0; } pmx.putImageData(pmi,0,0);
    const P=hiMask(pmc,W2,H2,0.8*K);
    const pc=cnv(W2,H2), px=pc.getContext('2d'); seed=777; pearl(px,0,0,W2,H2); const pd=px.getImageData(0,0,W2,H2).data, d=img.data;
    for(let q=0;q<W2*H2;q++){ const a=P[q]; if(a<=0||D[q]/pxmm<3.2||q%W2<3*pxmm) continue; const o=q*4; for(let c=0;c<3;c++) d[o+c]=d[o+c]*(1-a)+pd[o+c]*a; }
    x.putImageData(img,0,0); return out; }
  /* ---------- materials + modelled detail on the built guitar ---------- */
  function phys(m,ex){ const p=new T.MeshPhysicalMaterial({color:m.color?m.color.clone():0xffffff,map:m.map||null,alphaMap:m.alphaMap||null,transparent:m.transparent,alphaTest:m.alphaTest,side:m.side,roughness:m.roughness,metalness:m.metalness}); Object.assign(p,ex||{}); return p; }
  function upgrade(G,I,inst){ if(!S3||!I.archTop||G.userData.prDone) return; G.userData.prDone=1; T=S3.THREE; maps(); const CMf=CM;
    const goldM=new T.MeshPhysicalMaterial({color:0xe0b866,metalness:1,roughness:0.42,roughnessMap:TX.brushed,clearcoat:0.3,clearcoatRoughness:0.15,envMapIntensity:1.15});
    const goldP=new T.MeshPhysicalMaterial({color:0xe4bd6c,metalness:1,roughness:0.24,envMapIntensity:1.2});
    const plast=new T.MeshPhysicalMaterial({color:0x0a0a0a,roughness:0.25,clearcoat:0.8,clearcoatRoughness:0.08});
    const fretM=new T.MeshPhysicalMaterial({color:0xd8d6d0,map:TX.fretCol,metalness:1,roughness:0.35,roughnessMap:TX.fretRough,envMapIntensity:1});
    const plyM=new T.MeshPhysicalMaterial({color:0xffffff,map:TX.ply,roughness:0.3,clearcoat:1,clearcoatRoughness:0.06});
    const black=new T.Color(I.tint), bodyG=[];
    G.traverse(o=>{ if(!o.isMesh||!o.material) return; const m=o.material; if(m.map) m.map.anisotropy=maxAn;
      if(m.isMeshPhysicalMaterial&&m.clearcoat===1&&m.map&&m.alphaTest===0.4&&!o.userData.pr){ o.userData.pr=1; m.roughness=0.32; m.clearcoatRoughness=0.22; m.clearcoatRoughnessMap=TX.imperf; m.envMapIntensity=1.0; m.needsUpdate=true; bodyG.push(o.parent); return; }
      if(m.color&&m.color.getHex()===0xece4cf){ o.material=plyM; return; }
      if(m.color&&m.color.getHex()===0xf0e2bf){ o.material=plyM; return; }
      if(m.color&&m.color.getHex()===0xb9b4aa&&m.metalness===1){ o.material=fretM; return; }
      if(m.color&&(m.color.getHex()===0xc9a24a||m.color.getHex()===0xbfa25a)&&!m.map){ o.material=goldP; return; }
      if(m.isMeshStandardMaterial&&!m.isMeshPhysicalMaterial&&m.color&&m.color.equals(black)){ o.material=phys(m,{roughness:0.3,clearcoat:1,clearcoatRoughness:0.2,clearcoatRoughnessMap:TX.imperf,envMapIntensity:1}); return; }
      if(m.isMeshStandardMaterial&&!m.isMeshPhysicalMaterial&&m.map&&m.color&&m.color.getHex()===0xffffff&&m.alphaMap){ o.material=phys(m,{roughness:0.3,clearcoat:1,clearcoatRoughness:0.2,clearcoatRoughnessMap:TX.imperf}); } });
    (G.userData.strMat||[]).forEach((m,i)=>{ const w=!!m.bumpMap; m.metalness=1; m.roughness=w?0.3:0.12; m.color.set(w?0xcfc6b4:0xefede8); if(w){ m.bumpScale=0.03; } m.envMapIntensity=1.2; m.needsUpdate=true; });
    const bg=bodyG[0]; const carve=G.userData.carveAt||(()=>0); const det=new T.Group(); det.userData.prDetail=1; if(bg) bg.add(det);
    const P=(x,y,z)=>new T.Vector3(CMf(I,x),-CMf(I,y),z);
    const decal=(cx,cy,w,h,z,op)=>{ const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:TX.ao,transparent:true,depthWrite:false,opacity:op||0.75,color:0x000000})); m.position.copy(P(cx,cy,z)); m.renderOrder=2; det.add(m); };
    const screw=(x,y,z,r)=>{ const s=new T.Mesh(new T.SphereGeometry(r,18,8,0,Math.PI*2,0,Math.PI/2),goldP); s.rotation.x=Math.PI/2; s.position.copy(P(x,y,z)); s.scale.y=0.45; det.add(s); const sl=new T.Mesh(new T.BoxGeometry(r*1.7,r*0.28,0.03),new T.MeshStandardMaterial({color:0x2a2010,roughness:0.6})); sl.position.copy(P(x,y,z+r*0.43)); sl.rotation.z=rnd()*3; det.add(sl); };
    const nS=I.nut.length;
    if(bg) bg.children.filter(g=>g.userData&&g.userData.part).forEach(pg=>{ const pt=pg.userData.part;
      if(pt.b){ const [x,y,w2,h2]=pt.b, cx=x+w2/2, cy=y+h2/2, base=Math.min(carve(x,y),carve(x+w2,y),carve(x,y+h2),carve(x+w2,y+h2),carve(cx,cy)), top=carve(cx,cy)+pt.h;
        decal(cx,cy,CMf(I,w2)*1.35,CMf(I,h2)*1.15,carve(cx,cy)+0.015,0.7);
        if(pt.k==='pu'){ pg.children.forEach(c=>{ if(c.isMesh&&c.geometry.type==='PlaneGeometry') c.material=goldM; else if(c.isMesh) c.material=goldP; }); }
        if(pt.k==='ring'){ pg.children.forEach(c=>{ if(c.isMesh) c.material=plast; }); [[x+7,y+8],[x+w2-7,y+8],[x+7,y+h2-8],[x+w2-7,y+h2-8]].forEach(([sx,sy])=>screw(sx,sy,top+0.005,0.13)); }
        if(pt.k==='gold'){ while(pg.children.length) pg.remove(pg.children[0]); const L=CMf(I,h2), X=CMf(I,cx), Y=-CMf(I,cy);
          if(pt.n==='tail'){ const r=0.55, bar=new T.Mesh(new T.CylinderGeometry(r,r,L-2*r,40),goldP); bar.position.set(X,Y,top-r); pg.add(bar); [1,-1].forEach(s=>{ const e=new T.Mesh(new T.SphereGeometry(r,32,16),goldP); e.position.set(X,Y+s*(L/2-r),top-r); pg.add(e); const st=new T.Mesh(new T.CylinderGeometry(0.42,0.42,top-base,24),goldP); st.rotation.x=Math.PI/2; st.position.set(X,Y+s*(L/2-r),base+(top-base)/2-0.4); pg.add(st); });
            const lip=new T.Mesh(new T.BoxGeometry(0.5,L-1.2,0.35),goldM); lip.position.set(X+0.35,Y,top-0.25); pg.add(lip); }
          else { const bw=0.95, bh=0.5, body=new T.Mesh(new T.BoxGeometry(bw,L*0.94,bh),goldM); body.position.set(X,Y,top-0.25-bh/2); pg.add(body);
            [1,-1].forEach(s=>{ const yy=Y+s*(L*0.47-0.35); const post=new T.Mesh(new T.CylinderGeometry(0.2,0.2,top-base,16),goldP); post.rotation.x=Math.PI/2; post.position.set(X,yy,base+(top-base)/2); pg.add(post); const tw=new T.Mesh(new T.CylinderGeometry(0.5,0.5,0.2,32),new T.MeshPhysicalMaterial({color:0xd8b060,metalness:1,roughness:0.35,bumpMap:TX.knurl,bumpScale:0.02})); tw.rotation.x=Math.PI/2; tw.position.set(X,yy,base+0.45); pg.add(tw); });
            for(let i=0;i<nS;i++){ const px=cx+(i<3?2.5:1)-(i===nS-1?0:0), sy=-CMf(I,strY(I,i,px)); const sd=new T.Mesh(new T.BoxGeometry(0.42,0.28,0.26),goldP); sd.position.set(CMf(I,px),sy,top-0.13); pg.add(sd); const sc=new T.Mesh(new T.CylinderGeometry(0.07,0.07,0.5,10),goldP); sc.rotation.z=Math.PI/2; sc.position.set(CMf(I,px)-0.3,sy,top-0.18); pg.add(sc); }
            const wire=new T.Mesh(new T.CylinderGeometry(0.035,0.035,L*0.86,8),goldP); wire.position.set(X-0.35,Y,top-0.08); pg.add(wire); } } }
      else { const [x,y,r]=pt.c, top=carve(x,y)+pt.h; decal(x,y,CMf(I,r)*3,CMf(I,r)*3,carve(x,y)+0.015,0.7);
        if(pt.k==='knob'){ pg.children.forEach(c=>{ if(!c.isMesh) return; if(c.geometry.type==='CircleGeometry'){ const cc=cnv(512,512), k=cc.getContext('2d'); const g=k.createRadialGradient(256,256,30,256,256,256); g.addColorStop(0,'#1a1a1a'); g.addColorStop(1,'#060606'); k.fillStyle=g; k.fillRect(0,0,512,512);
              k.fillStyle='#d9c08a'; k.font='bold 54px Helvetica,Arial,sans-serif'; k.textAlign='center'; k.textBaseline='middle'; for(let n=0;n<=10;n++){ const a=-Math.PI*0.75+n*Math.PI*1.5/10-Math.PI/2; k.save(); k.translate(256+Math.cos(a)*190,256+Math.sin(a)*190); k.rotate(a+Math.PI/2); k.fillText(String(n),0,0); k.restore(); }
              k.beginPath(); k.arc(256,256,226,0,7); k.strokeStyle='#2a2a2a'; k.lineWidth=10; k.stroke(); c.material=new T.MeshPhysicalMaterial({map:tex(cc,{srgb:1}),roughness:0.25,clearcoat:1,clearcoatRoughness:0.05}); }
            else c.material=new T.MeshPhysicalMaterial({color:0x0b0b0b,roughness:0.3,clearcoat:1,clearcoatRoughness:0.1,bumpMap:TX.knurl,bumpScale:0.05}); }); }
        if(pt.n==='switch'){ pg.children.forEach(c=>{ if(c.isMesh&&c.geometry.type==='CircleGeometry') c.visible=false; else if(c.isMesh&&c.geometry.type==='CylinderGeometry'&&c.geometry.parameters.radiusTop>0.3) c.material=plast; else if(c.isMesh&&c.material.color&&c.material.color.getHex()===0xc9a24a) c.material=goldP; }); } } });
    /* contact shadows along each fret on the board, and under the strings at the nut */
    if(I.radius){ const fp=n=>I.nut[0][0]-I.S*I.SL*(1-Math.pow(2,-n/12)); const N=G.userData.neck; const mat=new T.MeshBasicMaterial({map:TX.aoLine,transparent:true,depthWrite:false,color:0x000000,opacity:0.55});
      for(let f=1;f<=22;f++){ const x=fp(f); const y0=strY(I,0,x), y1=strY(I,nS-1,x), sp=(y1-y0)/(nS-1); const ya=-CMf(I,y0-sp*0.75), yb=-CMf(I,y1+sp*0.75); const pos=[], uv=[], idx=[]; const hw=0.22;
        for(let k=0;k<=12;k++){ const wy=ya+(yb-ya)*k/12, z=-boardDrop(I,x,wy)+0.004; pos.push(CMf(I,x)-hw,wy,z, CMf(I,x)+hw,wy,z); uv.push(k/12,0,k/12,1); if(k){ const a=(k-1)*2; idx.push(a,a+1,a+2,a+1,a+3,a+2); } }
        const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('uv',new T.Float32BufferAttribute(uv,2)); g.setIndex(idx); const m=new T.Mesh(g,mat); m.renderOrder=2; G.add(m); } }
    /* headstock: gold tuner bushings + posts on the face */
    const hsG=G.children.find(g=>g.isGroup&&g.rotation.y!==0&&g.position.x>0); if(hsG&&I.tuners){ const xN=I.nut[0][0]; I.tuners.forEach(([tx,ty])=>{ const X=CMf(I,tx-xN), Y=-CMf(I,ty); const nut=new T.Mesh(new T.CylinderGeometry(0.42,0.42,0.18,6),goldP); nut.rotation.x=Math.PI/2; nut.position.set(X,Y,0.09); hsG.add(nut); const post=new T.Mesh(new T.CylinderGeometry(0.2,0.2,1.1,20),goldP); post.rotation.x=Math.PI/2; post.position.set(X,Y,0.6); hsG.add(post); const hole=new T.Mesh(new T.CylinderGeometry(0.05,0.05,0.42,8),new T.MeshBasicMaterial({color:0x000000})); hole.position.set(X,Y,0.85); hsG.add(hole); }); }
    G.traverse(o=>{ if(o.isMesh&&o.material&&!o.material.transparent){ o.castShadow=true; } });
  }
  /* ---------- renderer: HDRI, tone mapping, post ---------- */
  async function boot(S0){ S=S0; T=S.THREE; maxAn=S.renderer.capabilities.getMaxAnisotropy(); const R=S.renderer;
    R.toneMapping=T.ACESFilmicToneMapping; R.toneMappingExposure=1.05; R.physicallyCorrectLights=false;
    if(Q==='low'){ R.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1)); maxAn=Math.min(maxAn,4); const key=S.scene.children.find(o=>o.isDirectionalLight); if(key&&key.shadow){ key.shadow.mapSize.set(1024,1024); } }
    try{ await ls(EX+'loaders/RGBELoader.js'); const hdr=await new Promise((res,rej)=>new T.RGBELoader().setDataType(T.UnsignedByteType).load('assets/studio_small_09_1k.hdr',res,undefined,rej));
      const pm=new T.PMREMGenerator(R); const env=pm.fromEquirectangular(hdr).texture; hdr.dispose(); pm.dispose(); S.scene.environment=env; S.scene.children.filter(o=>o.isLight&&!o.isDirectionalLight).forEach(l=>l.intensity*=0.6); window.PR_HDRI=true; }catch(e){ console.warn('HDRI fallback (soft-box env kept)',e&&e.message); }
    if(Q==='high'&&!/[?&]post=0/.test(qs)){ try{ for(const f of ['shaders/CopyShader','shaders/LuminosityHighPassShader','shaders/GammaCorrectionShader','postprocessing/EffectComposer','postprocessing/RenderPass','postprocessing/ShaderPass','postprocessing/UnrealBloomPass']) await ls(EX+f+'.js');
        const dof=/[?&]dof=1/.test(qs); if(dof){ await ls(EX+'shaders/BokehShader.js'); await ls(EX+'postprocessing/BokehPass.js'); }
        const sz=R.getSize(new T.Vector2()); const RTC=(R.capabilities.isWebGL2&&T.WebGLMultisampleRenderTarget)?T.WebGLMultisampleRenderTarget:T.WebGLRenderTarget; const rt=new RTC(sz.x*R.getPixelRatio(),sz.y*R.getPixelRatio(),{type:T.HalfFloatType}); comp=new T.EffectComposer(R,rt); comp.addPass(new T.RenderPass(S.scene,S.cam));
        comp.addPass(new T.UnrealBloomPass(new T.Vector2(sz.x,sz.y),0.16,0.35,0.9)); if(dof){ bokeh=new T.BokehPass(S.scene,S.cam,{focus:120,aperture:0.00006,maxblur:0.004,width:sz.x,height:sz.y}); comp.addPass(bokeh); }
        comp.addPass(new T.ShaderPass(T.GammaCorrectionShader));
        const bc=cnv(512,512), x=bc.getContext('2d'); const g=x.createRadialGradient(256,200,10,256,256,380); g.addColorStop(0,'#22180a'); g.addColorStop(1,'#0b0906'); x.fillStyle=g; x.fillRect(0,0,512,512); const bt=new T.CanvasTexture(bc); bt.encoding=T.sRGBEncoding; S.scene.background=bt;
        window.PR_POST=true; }catch(e){ console.warn('post fallback',e&&e.message); comp=null; } }
  }
  function render(){ if(!comp) return false; const R=S.renderer, v=R.getSize(new T.Vector2()); const k=v.x+'x'+v.y+'@'+R.getPixelRatio(); if(k!==comp._k){ comp._k=k; comp.setPixelRatio(R.getPixelRatio()); comp.setSize(v.x,v.y); }
    if(bokeh&&window.ORB){ bokeh.uniforms.focus.value=S.cam.position.distanceTo(ORB.target); }
    const tm=R.toneMapping; comp.render(); return true; }
  return {Q,boot,front,back,sides,headstock,upgrade,render,maps,mobile};
})();
