/* GK-3 demo: holding the guitar and first notes. Behind the neck (thumb), then the player's view, slow first-notes clip. */
(function(){
  const TEX='\\title "First notes"\n\\tempo 80\n.\n\\track "Guitar"\n\\staff {tabs}\n\\tuning e4 b3 g3 d3 a2 e2\n:4 1.6 2.6 3.6 4.6 | 4.6 3.6 2.6 1.6 | 1.5 2.5 3.5 4.5 | 4.5 3.5 2.5 1.5 |';
  const CAP=[['Thumb rests behind the neck, roughly opposite your 2nd finger.',0],['Keep the thumb relaxed. It balances the fingers; it does not squeeze.',7],['From your own view: fingertips land just behind each fret.',13],['One finger per fret: 1 2 3 4 on the low E, then the A string.',19]];
  const $=id=>document.getElementById(id);
  function ui(){ const st=$('stage'); st.style.position='relative';
    const c=document.createElement('div'); c.id='demoCap'; c.style.cssText='position:absolute;left:50%;top:44px;transform:translateX(-50%);max-width:88%;padding:10px 16px;border-radius:12px;background:rgba(10,8,4,.82);color:#f3e6c4;font:600 16px/1.35 system-ui,sans-serif;text-align:center;border:1px solid #c9a227;z-index:5;pointer-events:none';
    c.textContent='Lesson GK-3 · Holding & first sound'; st.appendChild(c);
    const b=document.createElement('button'); b.id='demoGo'; b.textContent='▶ Start the demo'; b.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:6;padding:14px 22px;font:700 18px system-ui;border-radius:12px;background:#c9a227;color:#111;border:0;cursor:pointer'; st.appendChild(b);
    return {c,b}; }
  function behind(){ window.CAMV=null; window.ORBITED=1; const p=S3.wpos('thumb-tip').clone().lerp(padPoint(2),0.5); ORB.target.copy(p); orbit(200,-25,24); }
  function player(){ window.ORBITED=0; camView('player'); }
  let timers=[];
  function run(U){ timers.forEach(clearTimeout); timers=[]; U.b.style.display='none'; $('speed').value='0.5'; if(api) api.playbackSpeed=0.5;
    behind(); samplePlay(null,null,0);
    CAP.forEach(([t,s])=>timers.push(setTimeout(()=>{ U.c.textContent=t; if(s===13) player(); },s*1000)));
    timers.push(setTimeout(()=>{ U.b.textContent='↻ Watch again'; U.b.style.display=''; },26000)); }
  const w=setInterval(()=>{ if(!(window.S3&&window.RES&&window.WARM&&window.LPGLB_READY&&typeof ORB!=='undefined'&&ORB)) return; clearInterval(w);
    const R0=window.RES; api.tex(TEX,[0]); const w2=setInterval(()=>{ if(window.RES===R0) return; clearInterval(w2); const U=ui(); window.DEMO_READY=1; setTimeout(()=>{ restPose(); behind(); },400); U.b.onclick=()=>run(U); },200); },300);
})();
