/* Guitar controls: Les Paul 2x volume, 2x tone (neck/bridge), 3-way toggle (RHYTHM / both / TREBLE), turnable in 3D and in the panel,
   driving a Web Audio chain on the Study Lab samples. Defaults (10/10/10/10, TREBLE) are acoustically transparent.
   Bass: one volume + one tone (panel only). Acoustic: none (passive acoustic). */
window.GCTL=(function(){
  const ST={nVol:10,nTone:10,bVol:10,bTone:10,sw:'bridge',vol:10,tone:10}; let A=null, CH=null; const TC=0.015;
  const nyq=()=>A.sampleRate/2-200;
  /* 500k audio-taper tone pot + 22 nF cap: corner falls from "open" (beyond hearing) to ~450 Hz, mild resonant bump mid-travel */
  const toneF=v=>{ const t=v/10; if(t>=0.999) return nyq(); return 450*Math.pow(Math.min(20000,nyq())/450,Math.pow(t,1.6)); };
  const toneQ=v=>{ const t=v/10; return t>=0.999?0:3*Math.sin(Math.PI*Math.min(1,t*1.1)); };   /* WebAudio lowpass Q is in dB */
  /* audio-taper volume (log), plus treble bleed loss when rolled back */
  const volG=v=>{ const t=v/10; return t<=0?0:Math.pow(t,2.2); };
  const volHS=v=>-7*Math.pow(1-v/10,0.8);
  function pickupChain(kind){ const eqL=A.createBiquadFilter(), eqH=A.createBiquadFilter(), hs=A.createBiquadFilter(), lp=A.createBiquadFilter(), g=A.createGain(), mix=A.createGain();
    eqL.type='lowshelf'; eqL.frequency.value=220; eqH.type='highshelf'; eqH.frequency.value=2600; hs.type='highshelf'; hs.frequency.value=3500; lp.type='lowpass';
    if(kind==='neck'){ eqL.gain.value=3; eqH.gain.value=-6; } else { eqL.gain.value=0; eqH.gain.value=0; }   /* neck: warmer/rounder; bridge = the recorded reference (brightest) */
    eqL.connect(eqH); eqH.connect(lp); lp.connect(hs); hs.connect(g); g.connect(mix); return {in:eqL,lp,hs,g,mix}; }
  function build(){ if(CH) return CH; A=StudySamples.ctx(); const input=A.createGain(), scoop=A.createBiquadFilter(), out=A.createGain();
    scoop.type='peaking'; scoop.frequency.value=750; scoop.Q.value=0.9; scoop.gain.value=0;
    const N=pickupChain('neck'), B=pickupChain('bridge'); input.connect(N.in); input.connect(B.in); N.mix.connect(scoop); B.mix.connect(scoop); scoop.connect(out); out.connect(A.destination);
    CH={input,scoop,N,B,out}; apply(true); StudySamples.setOutput(input); return CH; }
  const set=(p,v,now)=>{ if(now){ p.cancelScheduledValues(0); p.value=v; } else p.setTargetAtTime(v,A.currentTime,TC); };
  function apply(now){ if(!CH) return; const inst=INST; let nM=0,bM=1,sc=0;
    if(inst==='bass'||inst==='acoustic'){ nM=0; bM=1; const v=inst==='bass'?ST.vol:10, t=inst==='bass'?ST.tone:10; set(CH.B.g.gain,volG(v),now); set(CH.B.hs.gain,volHS(v),now); set(CH.B.lp.frequency,toneF(t),now); set(CH.B.lp.Q,toneQ(t),now); }
    else { if(ST.sw==='neck'){ nM=1; bM=0; } else if(ST.sw==='both'){ nM=0.55; bM=0.55; sc=-2.5; }
      set(CH.N.g.gain,volG(ST.nVol),now); set(CH.N.hs.gain,volHS(ST.nVol),now); set(CH.N.lp.frequency,toneF(ST.nTone),now); set(CH.N.lp.Q,toneQ(ST.nTone),now);
      set(CH.B.g.gain,volG(ST.bVol),now); set(CH.B.hs.gain,volHS(ST.bVol),now); set(CH.B.lp.frequency,toneF(ST.bTone),now); set(CH.B.lp.Q,toneQ(ST.bTone),now); }
    set(CH.N.mix.gain,nM,now); set(CH.B.mix.gain,bM,now); set(CH.scoop.gain,sc,now); }
  /* ---------- panel ---------- */
  const KN={k2:['nVol','Neck volume'],k4:['nTone','Neck tone'],k1:['bVol','Bridge volume'],k3:['bTone','Bridge tone']};
  function panel(){ const el=document.getElementById('ctl'); if(!el) return; const inst=INST; const sl=(k,l)=>`<label title="${l}">${l} <input type="range" min="0" max="10" step="0.1" data-k="${k}" value="${ST[k]}"><b data-v="${k}">${(+ST[k]).toFixed(1)}</b></label>`;
    if(inst==='electric') el.innerHTML='<span class="ctlh">Controls</span>'+sl('nVol','Neck vol')+sl('nTone','Neck tone')+sl('bVol','Bridge vol')+sl('bTone','Bridge tone')+'<span class="sw3">'+[['neck','Rhythm'],['both','Both'],['bridge','Treble']].map(([v,l])=>`<button data-sw="${v}" class="${ST.sw===v?'on':''}">${l}</button>`).join('')+'</span>';
    else if(inst==='bass') el.innerHTML='<span class="ctlh">Controls</span>'+sl('vol','Volume')+sl('tone','Tone');
    else el.innerHTML='<span class="ctlh" style="opacity:.6">Acoustic: no onboard controls</span>';
    el.querySelectorAll('input[data-k]').forEach(i=>i.oninput=()=>setVal(i.dataset.k,+i.value,'ui')); el.querySelectorAll('button[data-sw]').forEach(b=>b.onclick=()=>setSw(b.dataset.sw)); }
  function syncUI(k){ const el=document.getElementById('ctl'); if(!el) return; const i=el.querySelector(`input[data-k="${k}"]`), b=el.querySelector(`b[data-v="${k}"]`); if(i) i.value=ST[k]; if(b) b.textContent=(+ST[k]).toFixed(1); el.querySelectorAll('button[data-sw]').forEach(x=>x.classList.toggle('on',x.dataset.sw===ST.sw)); }
  function setVal(k,v,src){ ST[k]=Math.max(0,Math.min(10,Math.round(v*10)/10)); if(src!=='ui') syncUI(k); else { const b=document.querySelector(`#ctl b[data-v="${k}"]`); if(b) b.textContent=ST[k].toFixed(1); } if(A) apply(); pose3d(); }
  function setSw(v){ ST.sw=v; syncUI(); if(A) apply(); pose3d(); }
  /* ---------- 3D ---------- */
  let M3={}; const ANG=v=>(5-v)/10*(300*Math.PI/180);   /* 0 at ~7 o'clock, 10 at ~5 o'clock, 300° travel */
  function skirtTex(T,label){ const c=document.createElement('canvas'); c.width=2048; c.height=192; const x=c.getContext('2d'); x.fillStyle='#0a0a0a'; x.fillRect(0,0,2048,192);
    for(let i=0;i<2048;i+=16){ x.fillStyle='#161616'; x.fillRect(i,150,8,42); }   /* knurled lower skirt */
    x.fillStyle='#e2c784'; x.font='bold 70px Helvetica,Arial,sans-serif'; x.textAlign='center'; x.textBaseline='middle';
    for(let n=0;n<=10;n++){ const a=(n/10)*300-150; const u=((180+a)/360)*2048; x.fillText(String(n),u,80); }
    const t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; t.anisotropy=8; return t; }
  function topTex(T,label){ const c=document.createElement('canvas'); c.width=512; c.height=512; const x=c.getContext('2d'); const g=x.createRadialGradient(256,256,20,256,256,256); g.addColorStop(0,'#d9b866'); g.addColorStop(0.92,'#b8913f'); g.addColorStop(1,'#6a5020'); x.fillStyle=g; x.beginPath(); x.arc(256,256,256,0,7); x.fill();
    x.fillStyle='#1a1408'; x.font='bold 62px Georgia,serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(label,256,256); x.fillStyle='#fff8'; x.fillRect(250,40,12,70); const t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; t.anisotropy=8; return t; }
  function attach3d(){ M3={}; if(INST!=='electric'||typeof GUIT==='undefined'||!GUIT||!S3) return; const T=S3.THREE;
    GUIT.traverse(g=>{ const pt=g.userData&&g.userData.part; if(!pt) return;
      if(pt.k==='knob'&&KN[pt.n]){ const cyl=g.children.find(c=>c.isMesh&&c.geometry.type==='CylinderGeometry'), cap=g.children.find(c=>c.isMesh&&c.geometry.type==='CircleGeometry'); if(!cyl) return;
        cyl.material=[new T.MeshPhysicalMaterial({map:skirtTex(T),roughness:0.3,clearcoat:1,clearcoatRoughness:0.08}),new T.MeshPhysicalMaterial({color:0x0a0a0a,roughness:0.3}),new T.MeshPhysicalMaterial({color:0x0a0a0a,roughness:0.3})];
        if(cap){ cap.material=new T.MeshPhysicalMaterial({map:topTex(T,/Vol/.test(KN[pt.n][1])?'VOLUME':'TONE'),metalness:0.9,roughness:0.3}); }
        [cyl,cap].forEach(m=>{ if(m){ m.userData.ctl=pt.n; } }); M3[pt.n]={cyl,cap,k:KN[pt.n][0]}; }
      if(pt.n==='switch'&&!g.userData.lever){ const lev=g.children.filter(c=>c.isMesh&&c.geometry.type==='CylinderGeometry'&&c.geometry.parameters.radiusTop<0.2), tip=g.children.find(c=>c.isMesh&&c.geometry.type==='SphereGeometry');
        if(!lev.length||!tip) return; const L=lev[0]; const base=L.position.clone(); base.z-=1.05; const piv=new T.Group(); piv.position.copy(base); g.add(piv);
        const nl=new T.Mesh(new T.CylinderGeometry(0.12,0.16,2.2,20),L.material); nl.rotation.x=Math.PI/2; nl.position.set(0,0,1.1); piv.add(nl); const nt=new T.Mesh(new T.SphereGeometry(0.34,24,16),tip.material); nt.position.set(0,0,2.2); nt.scale.z=1.25; piv.add(nt);
        L.visible=false; tip.visible=false; [nl,nt].forEach(m=>m.userData.ctl='switch'); g.userData.lever=piv; M3.sw=piv; } });
    pose3d(); }
  function pose3d(){ Object.values(M3).forEach(o=>{ if(o&&o.k!=null){ const a=ANG(ST[o.k]); if(o.cyl) o.cyl.rotation.y=a; if(o.cap) o.cap.rotation.z=a; } }); if(M3.sw){ M3.sw.rotation.x=ST.sw==='neck'?-0.32:ST.sw==='both'?0:0.32; } if(window.render3d) render3d(); }
  /* drag: vertical or circular motion turns a knob; tap/drag the toggle to move it; orbit is blocked while you hold a control */
  function pointer(){ const st=document.getElementById('stage'); if(!st||st._ctl) return; st._ctl=1; let drag=null; const ray=new S3.THREE.Raycaster(), v=new S3.THREE.Vector2();
    const hit=e=>{ if(typeof GUIT==='undefined'||!GUIT) return null; const r=S3.renderer.domElement.getBoundingClientRect(); v.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1); ray.setFromCamera(v,S3.cam); const hs=ray.intersectObject(GUIT,true); for(const h of hs){ if(!h.object.visible) continue; return h.object.userData.ctl||null; } return null; };
    st.addEventListener('pointerdown',e=>{ const c=hit(e); if(!c) return; e.stopPropagation(); e.preventDefault(); build(); if(A.state!=='running') A.resume();
      if(c==='switch'){ drag={sw:1,y:e.clientY,s0:ST.sw}; } else drag={k:KN[c][0],y:e.clientY,x:e.clientX,v0:ST[KN[c][0]]}; try{ st.setPointerCapture(e.pointerId); }catch(_){} },true);
    st.addEventListener('pointermove',e=>{ if(!drag) return; e.stopPropagation(); e.preventDefault(); if(drag.sw){ const dy=e.clientY-drag.y; const ord=['neck','both','bridge']; const i0=ord.indexOf(drag.s0); const i=Math.max(0,Math.min(2,i0+Math.round(dy/28))); if(ord[i]!==ST.sw) setSw(ord[i]); drag.moved=Math.abs(dy)>6; }
      else setVal(drag.k,drag.v0+(drag.y-e.clientY)/16+(e.clientX-drag.x)/40); },true);
    const up=e=>{ if(!drag) return; e.stopPropagation(); if(drag.sw&&!drag.moved){ const ord=['neck','both','bridge']; setSw(ord[(ord.indexOf(ST.sw)+1)%3]); } drag=null; }; st.addEventListener('pointerup',up,true); st.addEventListener('pointercancel',up,true);
    st.addEventListener('wheel',e=>{ const c=hit(e); if(!c||c==='switch') return; e.stopPropagation(); e.preventDefault(); build(); const k=KN[c][0]; setVal(k,ST[k]-Math.sign(e.deltaY)*0.5); },{capture:true,passive:false});
    st.addEventListener('pointermove',e=>{ if(drag) return; st.style.cursor=hit(e)?'grab':''; }); }
  function onInstrument(){ panel(); if(A) apply(); setTimeout(()=>{ attach3d(); },0); }
  return {ST,build,apply,panel,attach3d,pointer,onInstrument,setVal,setSw,_f:{toneF,toneQ,volG,volHS}};
})();
