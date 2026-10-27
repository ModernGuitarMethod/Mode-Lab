#!/usr/bin/env python3
"""Per-frame (60 fps virtual clock) hand-vs-instrument check over whole files.
Fails if any displayed frame has thumb/palm through the neck or a finger through the fretboard/neck
(> TOL mm), and reports joint pops (per-frame joint speed spikes).
usage: check_frames.py BASE_URL OUTJSON FILE[,FILE...]   (FILE 'LW' = default song; paths relative to the page)"""
import asyncio,sys,json,time
from playwright.async_api import async_playwright
BASE,OUT,FILES=sys.argv[1],sys.argv[2],sys.argv[3].split(',')
TOL=float(sys.argv[4]) if len(sys.argv)>4 else 0.3
RUN="""(async (o)=>{ const tol=o.tol/10; window._warmGen=(window._warmGen||0)+1000; window.FREEZE=1; window.NORENDER3D=1; const _R3=window.render3d; window.render3d=()=>{}; const E=RES.events; const bpm=(api.score&&api.score.tempo)||70, tps=960*bpm/60;
  const lastT=(E[E.length-1].tick+E[E.length-1].dur-E[0].tick)/tps; const NF=Math.ceil(lastT*60)+30; let i=0; window.PREVP=null; showEvent(0); const T0=performance.now(); window.FAKE=T0; window.VNOW=T0; window.PREVP=null; showEvent(0);
  const bad=[], pops=[], st={frames:0,thumb:0,palm:0,finger:0,maxThumbMm:0,maxPalmMm:0,maxFingerMm:0,popFrames:0,clampFrames:0}; let prev=null, pv=null; const t0=performance.now();
  const jv=()=>{ const r=[]; for(let k=1;k<=4;k++){ const q=window.SHOWNQ&&SHOWNQ[k]||CUR.fing[k]; r.push(q.m,q.p,q.d,q.a||0); } const T=window.SHOWNT||CUR.thumb; r.push(T.y,T.p,T.f); return r; };
  for(let f=0;f<NF;f++){ const t=f/60; window.FAKE=T0+f*1000/60; const tick=E[0].tick+t*tps; while(i<E.length-1&&E[i+1].tick<=tick){ i++; showEvent(i); } window.VNOW=window.FAKE=T0+f*1000/60; if(o.trace) window.FCTR=[]; frame(window.VNOW);
    const F=HCOL.measure(E[i]); st.frames++; if(window.CLAMPED) st.clampFrames++;
    const pr=k=>F[k]?Math.max(0,F[k].penReal!=null?F[k].penReal:F[k].pen):0; const onNeck=k=>F[k]&&/board|neck/.test(F[k].penObj||'');
    const th=onNeck(5)?pr(5):0, pa=onNeck(0)?pr(0):0; let fi=0, fk=0; for(let k=1;k<=4;k++) if(onNeck(k)&&pr(k)>fi){ fi=pr(k); fk=k; }
    st.maxThumbMm=Math.max(st.maxThumbMm,th*10); st.maxPalmMm=Math.max(st.maxPalmMm,pa*10); st.maxFingerMm=Math.max(st.maxFingerMm,fi*10);
    if(th>tol||pa>tol||fi>tol){ if(th>tol) st.thumb++; if(pa>tol) st.palm++; if(fi>tol) st.finger++; if(bad.length<400) bad.push({f,ev:i,bar:E[i].bar,thumbMm:+(th*10).toFixed(2),palmMm:+(pa*10).toFixed(2),fingerMm:+(fi*10).toFixed(2),k:fk,obj:fk?F[fk].penObj:(th>tol?F[5].penObj:F[0].penObj),trace:o.trace?JSON.stringify(window.FCTR).slice(0,400):undefined,clamped:window.CLAMPED,err:window._fcErrN}); }
    { const e=(typeof solveEv==='function')?solveEv(E[i]):E[i]; const u=(tick-E[i].tick)/Math.max(1,E[i].dur); if(u>0.4&&u<0.8){ const I=INSTR[INST]; const fx=f=>CM(I,fretR(I,f)); const pk=new Set(); e.notes.forEach((n,j)=>{ const k=e.fingers[j]; if(k>=1&&k<=4&&n.f>0&&!n.harm){ pk.add(k); if(!(barreInfo(e,1)&&k===1)){ const x=padPoint(k).x; const lo=fx(n.f), hi=fx(n.f-1); const d=(x-lo)*10*Math.sign(hi-lo); st.padN=(st.padN||0)+1; if(d<1.5) st.padOnWire=(st.padOnWire||0)+1; (st._pd||(st._pd=[])).push(+d.toFixed(1)); } } });
      for(const k of pk){ if(F[k]&&F[k].minStr>0.1){ st.liftedMid=(st.liftedMid||0)+1; if(!st._lf) st._lf=[]; if(st._lf.length<50){ applyPose(TGT); const Ft=HCOL.measure(e); st._lf.push({f,ev:i,k,gapMm:+(F[k].minStr*10).toFixed(1),tgtGapMm:+(Ft[k].minStr*10).toFixed(1),u:+u.toFixed(2)}); } if(TGT){ applyPose(TGT); const Ft=HCOL.measure(e); if(Ft[k].minStr>0.1) st.liftedTgt=(st.liftedTgt||0)+1; } } }
      for(let k=1;k<=4;k++){ if(pk.has(k)||!F[k]) continue; st.freeN=(st.freeN||0)+1; const c=F[k].minStr*10; if(c<1.0){ st.freeTouch=(st.freeTouch||0)+1; } (st._fc||(st._fc=[])).push(+c.toFixed(1)); } } }
    const v=jv(); if(prev){ const d=v.map((x,j)=>x-prev[j]); if(pv){ let mx=0,mj=-1; d.forEach((x,j)=>{ const a=Math.abs(x-pv[j]); if(a>mx){ mx=a; mj=j; } }); if(mx>(o.popAcc||0.12)){ st.popFrames++; if(pops.length<300) pops.push({f,ev:i,bar:E[i].bar,joint:mj,acc:+mx.toFixed(3)}); } } pv=d; } prev=v; }
  window.FAKE=null; st.ms=Math.round(performance.now()-t0); const q=(a,p)=>{ if(!a||!a.length) return null; const b=a.slice().sort((x,y)=>x-y); return b[Math.min(b.length-1,Math.floor(p*b.length))]; }; st.padBehindMm_p10_p50_p90=[q(st._pd,0.1),q(st._pd,0.5),q(st._pd,0.9)]; st.freeClearMm_p10_p50_p90=[q(st._fc,0.1),q(st._fc,0.5),q(st._fc,0.9)]; st.liftedList=st._lf; delete st._pd; delete st._fc; delete st._lf; window.NORENDER3D=0; window.render3d=_R3; return {st,bad,pops}; })"""
async def main():
  res={}; fail=0
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    for FILE in FILES:
      pg=await b.new_page(viewport={'width':800,'height':500}); pg.set_default_timeout(3600000); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:200])); await pg.add_init_script("(()=>{ const rn=performance.now.bind(performance); window.FAKE=null; performance.now=()=>window.FAKE!=null?window.FAKE:rn(); })()")
      t=time.time(); await pg.goto(BASE,timeout=0); await pg.wait_for_function('window.S3&&window.RES&&GUIT&&GUIT.userData.xE&&window.HCOL&&(window.WARM||window.HEADREADY)',timeout=3600000)
      if FILE!='LW':
        await pg.evaluate("window._R0=RES,0")
        await pg.evaluate("(f=>fetch(f).then(r=>f.endsWith('.atex')?r.text().then(t=>api.tex(t,[0])):r.blob().then(b=>loadScoreFile(new File([b],f.split('/').pop())))))('%s')"%FILE)
        await pg.wait_for_function("window.RES!==window._R0&&(window.WARM||window.HEADREADY)",timeout=3600000)
      r=await pg.evaluate(RUN,{'tol':TOL,'trace':bool(__import__('os').environ.get('TRACE'))}); r['errors']=errs; r['secs']=round(time.time()-t); res[FILE]=r
      s=r['st']; bad=s['thumb']+s['palm']+s['finger']; fail+=bad+len(errs)
      print(FILE,json.dumps(s),'errors',len(errs),flush=True); await pg.close()
    await b.close()
  json.dump(res,open(OUT,'w'),indent=1); print('FAIL' if fail else 'PASS', 'bad frames', fail); sys.exit(1 if fail else 0)
asyncio.run(main())
