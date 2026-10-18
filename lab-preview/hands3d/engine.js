/* Mode Lab finger-test: automatic tab fingering engine (Viterbi over hand positions).
   Strings: s=0 is the highest string (Mode Lab / tab order). p = fret under the index finger (1..22). */
(function(G){
const MAXP=22;
const C={ stretch1:1.6, stretch2:4.5, barreIdx:0.2, barreOther:0.9, offShape:0.7, nearShape:0.3, height:0.025,
  shiftBase:2.2, shiftPerFret:1.1, easyShift:0.35, openFree:0.3, slideShift:0.25, legatoShift:1.8, bMismatch:0.8, bRoll:0.15, boxBonus:0.5, fanCross:4, bigShiftPerFret:1.2, lowIdx:6.0, legIdx:5.0 };
/* SOLVER v26 (Dale, Little Wing vs lessons): no index barre across a gap of unpressed strings; chords prefer the index on their lowest fret */
const gapBarre=(ev,fg)=>{ const ks=[]; fg.forEach((f,k)=>{ if(f===1&&ev.notes[k].f>0) ks.push(k); }); if(ks.length<2) return false; const fr1=ev.notes[ks[0]].f; const ss=ks.map(k=>ev.notes[k].s); for(let s=Math.min(...ss);s<=Math.max(...ss);s++){ if(ss.includes(s)) continue; if(!ev.notes.some(n=>n.s===s&&n.f>fr1)) return true; } return false; };
/* Mode Lab shape positions for a key centre: index-finger fret for shape 1 (root under 4th), 2 (root under 2nd), 3 (root under 1st),
   from roots on the lowest three strings. */
function shapePositions(rootPc, opens){
  const out={}; const n=opens.length;
  [n-1,n-2].forEach(s=>{ if(s<0) return; let f=((rootPc-opens[s])%12+12)%12;
    for(;f<=24;f+=12){ [[1,-3],[2,-1],[3,0]].forEach(([sh,o])=>{ const p=f+o; if(p>=0&&p<=MAXP&&!out[p]) out[p]=sh; }); } });
  return out; // p -> shape number
}
/* Finger assignment for one event at position p. Returns {cost, fingers[], stretch} or null if impossible. */
function bshift(opens){ const n=opens.length, sh=new Array(n).fill(0); let acc=0; for(let s=n-2;s>=0;s--){ if(opens[s]-opens[s+1]===4) acc=1; sh[s]=acc; } return sh; }
let ASSIGN_OPTS={};
function assign(ev, p, b, BS){
  const fr=ev.notes.filter(n=>n.f>0);
  if(!fr.length) return {cost:0, fingers:ev.notes.map(()=>0), stretch:0};
  let cost=0, lo=false, hi=false, stretch=0; const fing=[], byFinger={};
  for(const n of ev.notes){
    if(n.f===0){ fing.push(0); continue; }
    const off=n.f-p-((b&&BS&&BS[n.s])?1:0); let f;
    if(ASSIGN_OPTS.bass124&&p<7&&fr.length>1&&fr.every(m=>m.f-p>=0&&m.f-p<=2)&&off>=0&&off<=2) f=[1,2,4][off];   /* bass, low positions: 1-2-4 (ring doubles the pinky) */
    else if(off>=0&&off<=3) f=off+1;
    else if(off===-1&&p>=1){ f=1; cost+=C.stretch1; lo=true; stretch=Math.max(stretch,1); }
    else if(off===4){ f=4; cost+=C.stretch1; hi=true; stretch=Math.max(stretch,1); }
    else if(off===-2&&p>=3){ f=1; cost+=C.stretch2; lo=true; stretch=2; }
    else if(off===5&&p>=4){ f=4; cost+=C.stretch2; hi=true; stretch=2; }
    else return null;
    if(byFinger[f]!=null && byFinger[f]!==n.f) return null; // one finger, two frets
    byFinger[f]=n.f; fing.push(f);
  }
  if(lo&&hi) return null; // hand can't stretch both ways at once
  /* standard chord grips: a middle/ring finger doubled on one fret hands the higher string to the next free finger (F barre: A3 ring, D3 pinky) */
  for(const f0 of [3,2]){ const ks=[]; fing.forEach((f,k)=>{ if(f===f0) ks.push(k); }); if(ks.length===2 && !fing.includes(f0+1) && f0+1<=4){ const hiK=ev.notes[ks[0]].s<ev.notes[ks[1]].s?ks[0]:ks[1]; fing[hiK]=f0+1; } }
  /* a middle/ring finger mapped onto non-adjacent strings at one fret (gap with unpressed strings): hand the extra strings to the next free fingers, thicker string = lower finger (e.g. 5x545x: 2-3-4 with the index on the 4th fret) */
  for(const f0 of [2,3]){ const ks=[]; fing.forEach((f,k)=>{ if(f===f0) ks.push(k); }); if(ks.length<2) continue; const fr0=ev.notes[ks[0]].f; if(!ks.every(k=>ev.notes[k].f===fr0)) continue; const S=ks.map(k=>ev.notes[k].s);
    let gap=false; for(let s=Math.min(...S);s<=Math.max(...S);s++){ if(!S.includes(s)&&!ev.notes.some(n=>n.s===s&&n.f>fr0)) gap=true; } if(!gap) continue;
    ks.sort((x,y)=>ev.notes[y].s-ev.notes[x].s); let nf=f0; for(let j=1;j<ks.length;j++){ nf++; while(nf<=4&&fing.includes(nf)) nf++; if(nf>4) return null; fing[ks[j]]=nf; } cost+=0.3; }
  /* no index barre across non-adjacent strings with unpressed strings in between (they would be muted or sound open):
     keep the index on the thickest group and give the other contiguous groups separate fingers (ring for a 2-string group, middle for one) */
  { const iK=[]; fing.forEach((f,k)=>{ if(f===1) iK.push(k); }); if(iK.length>1){ const fr1=ev.notes[iK[0]].f; if(iK.every(k=>ev.notes[k].f===fr1)){ const ss=iK.map(k=>ev.notes[k].s).sort((a,b)=>a-b);
      let gap=false; for(let s=ss[0];s<=ss[ss.length-1];s++){ if(ss.includes(s)) continue; if(!ev.notes.some(n=>n.s===s&&n.f>fr1)) gap=true; }
      if(gap){ const groups=[]; ss.forEach(s=>{ const g=groups[groups.length-1]; if(g&&s===g[g.length-1]+1) g.push(s); else groups.push([s]); }); groups.sort((A,B)=>Math.max(...B)-Math.max(...A));
        const free=[3,2,4].filter(f=>!fing.includes(f)); for(let gi=1;gi<groups.length;gi++){ const G2=groups[gi]; let f=G2.length===2?free.find(x=>x===3||x===2):free.find(x=>x===2||x===3); if(G2.length>3) return null; if(G2.length===3) f=free.includes(3)?3:null; if(f==null) f=free[0]; if(f==null) return null; free.splice(free.indexOf(f),1);
          iK.forEach(k=>{ if(G2.includes(ev.notes[k].s)) fing[k]=f; }); } cost+=0.4; } } } }
  // barres: same finger on several strings
  const cnt={}; fing.forEach(f=>{ if(f>0) cnt[f]=(cnt[f]||0)+1; });
  /* a non-index finger can only flatten across neighbouring strings (2, or 3 for the ring finger, as in an A-shape); never across a gap */
  { const ss={}; fing.forEach((f,k)=>{ if(f>1) (ss[f]=ss[f]||[]).push(ev.notes[k].s); }); for(const f in ss){ const L=ss[f]; if(L.length<2) continue; const span=Math.max(...L)-Math.min(...L); if(span>(+f===3?2:1)||span!==L.length-1) return null; } }
  Object.keys(cnt).forEach(f=>{ if(cnt[f]>1) cost+= (+f===1?C.barreIdx:C.barreOther)*(cnt[f]-1); });
  // a barre must not sit across a lower-fret fretted note on a string between its ends (index barre is the lowest fret, so OK)
  /* same fret, different strings: the lower-numbered finger takes the lower-pitched (farther) string, as in an A-shape (2-3-4 from the bass side);
     the reverse crosses the fingers over each other */
  for(let x=0;x<ev.notes.length;x++) for(let y=0;y<ev.notes.length;y++){ const A=ev.notes[x],B=ev.notes[y]; if(A.f>0&&A.f===B.f&&A.s>B.s&&fing[x]>fing[y]&&fing[x]>0&&fing[y]>0) cost+=3; }
  /* chords: the index anchors the lowest fret (a hand doesn't hover its index over an empty fret below a grip) */
  if(fr.length>1&&!fing.includes(1)) cost+=0.6;
  return {cost, fingers:fing, stretch};
}
function solve(events, opts){
  opts=opts||{}; ASSIGN_OPTS={bass124:!!opts.bass124}; const opens=opts.opens||[64,59,55,50,45,40]; const BS=bshift(opens);
  const SP=opts.rootPc==null?{}:shapePositions(opts.rootPc, opens); const BX=opts.boxes||{};
  Object.keys(BX).forEach(p=>{ SP[p]=BX[p][0].shape; }); if(opts.onlyBoxes){ Object.keys(SP).forEach(p=>{ if(!BX[p]) delete SP[p]; }); }
  const inBox1=(ev,bx)=>{ const fr=ev.notes.map(n=>n.f>0?bx.map[n.s+'|'+n.f]:0); if(fr.some(x=>x==null)) return null; const seen={}; for(let j=0;j<fr.length;j++){ const f=fr[j]; if(!f) continue; const fret=ev.notes[j].f; if(seen[f]!=null&&seen[f]!==fret) return null; seen[f]=fret; } return fr; };
  const crosses=(ev,fg)=>{ for(let x=0;x<ev.notes.length;x++) for(let y=0;y<ev.notes.length;y++){ const A=ev.notes[x],B=ev.notes[y]; if(A.f>0&&A.f===B.f&&A.s>B.s&&fg[x]>fg[y]&&fg[y]>0) return true; } return false; };
  /* a box's per-string numbers are for single notes; a chord that would cross fingers on one fret is gripped normally instead */
  /* fan rule: fingers 2-4 all down: their order must follow string order one way or the other (no finger reaching across two others) */
  const nonMono=(ev,fg)=>{ const fs={}; ev.notes.forEach((n,j)=>{ const f=fg[j]; if(f>1&&n.f>0){ (fs[f]=fs[f]||[]).push(n.s); } }); const ks=Object.keys(fs).map(Number).sort((a,b)=>a-b); if(ks.length<3) return false;
    const mid=ks.map(k=>fs[k].reduce((a,b)=>a+b,0)/fs[k].length); let up=true,dn=true; for(let i=1;i<mid.length;i++){ if(mid[i]<mid[i-1]) up=false; if(mid[i]>mid[i-1]) dn=false; } return !(up||dn); };
  const inBox=(ev,p)=>{ const L=BX[p]; if(!L) return null; for(const bx of L){ const r=inBox1(ev,bx); if(r&&!(ev.notes.length>1&&(crosses(ev,r)||nonMono(ev,r)))) return r; } return null; };
  const N=events.length; if(!N) return {events:[], shapes:SP};
  const K=(MAXP+1)*2; const P=k=>k>>1, B=k=>k&1;
  const usesB=ev=>ev.notes.some(n=>n.f>0&&BS[n.s]);
  const emis=(i,k)=>{ const p=P(k), b=B(k), ev=events[i]; if(b&&!BS.some(x=>x)) return null;
    const a=assign(ev,p,b,BS); if(!a) return null;
    const hasFret=ev.notes.some(n=>n.f>0); if(!hasFret) return {c:0,a};
    let c=a.cost + (nonMono(ev,a.fingers)?C.fanCross:0) + (SP[p]?0:(SP[p-1]||SP[p+1])?C.nearShape:C.offShape) + C.height*p;
    if(p===0 && !SP[0]) c+=2;
    if(opts.onlyBoxes && !SP[p]) c+=3;           // index over the nut only for a Mode Lab shape
    const lowIdx=(fg)=>{ const fr=ev.notes.filter(n=>n.f>0); if(fr.length<2) return 0; const mn=Math.min(...fr.map(n=>n.f)); return ev.notes.some((n,j)=>n.f===mn&&fg[j]===1)?0:C.lowIdx; };
    c+=lowIdx(a.fingers);
    if(i>0&&ev.notes.length===1&&ev.notes[0].f>0&&(ev.notes[0].legato||ev.legatoArrive)){ const pv=events[i-1]; if(pv.notes.length===1&&pv.notes[0].s===ev.notes[0].s&&pv.notes[0].f>0){ const d=Math.abs(ev.notes[0].f-pv.notes[0].f), lo=Math.min(ev.notes[0].f,pv.notes[0].f); if((d===2||d===3)&&p!==lo) c+=C.legIdx; } }
    const ib=inBox(ev,p); if(ib){ c=C.height*p-C.boxBonus+lowIdx(ib)+(gapBarre(ev,ib)?50:0); if(usesB(ev)){ const want=(SP[p]===1||SP[p]===3)?1:0; if(b!==want) c+=C.bMismatch; } return {c,a,ib}; }
    if(usesB(ev)){ const want=(SP[p]===1||SP[p]===3)?1:0; if(b!==want) c+=C.bMismatch; }
    return {c,a}; };
  let prev=new Array(K).fill(Infinity); const back=[];
  for(let k=0;k<K;k++){ const e=emis(0,k); prev[k]=e?e.c:Infinity; }
  for(let i=1;i<N;i++){
    const a=events[i-1], b=events[i];
    let m=1;
    if(b.restBefore || a.dur>=960) m=C.easyShift;
    if(!a.notes.some(n=>n.f>0)) m=Math.min(m,C.openFree);
    const slide=a.notes.length===1&&b.notes.length===1&&a.notes[0].slide&&a.notes[0].s===b.notes[0].s;
    if(slide) m=Math.min(m,C.slideShift);
    if(!slide && b.notes.some(n=>n.legato)) m=Math.max(m,C.legatoShift);
    const cur=new Array(K).fill(Infinity), bk=new Array(K).fill(0);
    for(let k=0;k<K;k++){ const e=emis(i,k); if(!e) continue; const p=P(k);
      let best=Infinity, bp=0;
      for(let q=0;q<K;q++){ if(prev[q]===Infinity) continue; const d=Math.abs(p-P(q));
        let t= d===0?0 : m*(C.shiftBase + C.shiftPerFret*d + (d>5?C.bigShiftPerFret*(d-5):0));
        if(B(q)!==B(k)) t+=C.bRoll;
        const v=prev[q]+t; if(v<best){best=v;bp=q;} }
      cur[k]=best+e.c; bk[k]=bp; }
    back.push(bk); prev=cur;
  }
  let k=0; for(let q=0;q<K;q++) if(prev[q]<prev[k]) k=q;
  if(prev[k]===Infinity) throw new Error('No playable fingering found');
  const path=new Array(N); path[N-1]=k;
  for(let i=N-1;i>0;i--){ path[i-1]=back[i-1][path[i]]; }
  let lastP=null;
  const out=events.map((ev,i)=>{ const p=P(path[i]), bb=B(path[i]); const a=assign(ev,p,bb,BS); const ib=inBox(ev,p); if(ib) a.fingers=ib; const hasFret=ev.notes.some(n=>n.f>0);
    const r={...ev, pos:p, bShift:bb, fingers:a.fingers, stretch:a.stretch, shape:SP[p]||0, modeLabBox:!!ib, shift: hasFret&&lastP!=null&&p!==lastP ? p-lastP : 0};
    /* natural harmonics on one fret: one finger laid lightly over the wire for all of them */
    const hf=ev.notes.filter(n=>n.f>0); if(hf.length>1&&hf.every(n=>n.harm&&n.f===hf[0].f)) r.fingers=ev.notes.map(n=>n.f>0?1:0);
    if(hasFret) lastP=p; return r; });
  return {events:out, shapes:SP, bStrings:BS};
}
/* Rule audit: returns a list of {i, kind, msg} */
function audit(res){
  const issues=[]; const E=res.events;
  E.forEach((e,i)=>{
    const prevOpen=i>0&&!E[i-1].notes.some(n=>n.f>0);
    const fr=e.notes.map((n,k)=>({n,f:e.fingers[k]})).filter(x=>x.n.f>0);
    fr.forEach(x=>{ if(x.f<1||x.f>4) issues.push({i,kind:'error',msg:'finger out of range'}); });
    const s=[...fr].sort((a,b)=>a.n.f-b.n.f); for(let k=1;k<s.length;k++){ if(s[k].n.f>s[k-1].n.f && s[k].f<=s[k-1].f) issues.push({i,kind:'error',msg:'fingers cross'}); }
    if(e.stretch===2 && !e.modeLabBox) issues.push({i,kind:'warn',msg:'2-fret stretch'});
    if(Math.abs(e.shift)>=5 && !e.restBefore && !prevOpen) issues.push({i,kind:'warn',msg:'big shift '+e.shift});
    if(e.shift && !e.restBefore && i>0 && E[i-1].dur<960 && !prevOpen && !(E[i-1].notes[0]&&E[i-1].notes[0].slide)) issues.push({i,kind:'note',msg:'shift mid-phrase ('+(e.shift>0?'+':'')+e.shift+')'});
    if(e.shift && !prevOpen && e.notes.some(n=>n.legato)) issues.push({i,kind:'warn',msg:'shift during hammer/pull'});
  });
  return issues;
}
/* Mode Lab boxes for a key: p -> {shape, map:{'s|f':finger}} using Mode Lab's own mlBoxEngine (if loaded). */
function modeLabBoxes(rootPc, iv, opens, onlyShape, instrument){
  const out={}; if(typeof mlBoxEngine!=='function') return out;
  for(const shape of (onlyShape?[onlyShape]:[1,2,3])) for(const register of ['low','high']) for(const rootChoice of [0,1]){
    let E; try{ E=mlBoxEngine({opens,rpc:rootPc,iv,instrument:instrument||'guitar',shape,register,rootChoice,range:'two',direction:'up'}); }catch(e){ continue; }
    const rf=E.rootFret; let p=rf+(shape===1?-3:shape===3?0:-1);
    if(shape===2){ const hi2=rf<3?Math.max(rf+2,4):rf+2; p=Math.max(rf-1,hi2-3); }
    if(p<0||p>MAXP) continue;
    const list=out[p]||(out[p]=[]); const box={shape,map:{}}; list.push(box);
    Object.keys(E.positions).forEach(m=>E.positions[m].forEach(x=>{ if(x[3]) return; const key=x[0]+'|'+x[1]; if(box.map[key]==null) box.map[key]=x[2]; }));
  }
  return out;
}
/* Mode Lab's box shapes are defined for standard tuning (any transposition: E, Eb, D...; 7-string adds a low 4th; bass all 4ths).
   For altered tunings (drop D, DADGAD, open G/D/E...) the boxes are derived from the actual tuning: one finger per fret over a
   4-fret window placed like Mode Lab's shapes (root under finger 4 / 2 / 1 on the lowest two strings), every scale note in the window. */
function isStandard(opens){ const lo=[...opens].reverse(); const d=lo.slice(1).map((x,i)=>x-lo[i]); const k=d.join(',');
  return ['5,5,5,4,5','5,5,5,5,4,5','5,5,5','5,5,5,5','5,5,5,5,5'].includes(k); }
function tuningBoxes(rootPc, iv, opens, onlyShape){ const out={}, n=opens.length, pcs=new Set(iv.map(x=>(x+rootPc)%12));
  [n-1,n-2].forEach(rs=>{ let f=((rootPc-opens[rs])%12+12)%12; for(;f<=21;f+=12){ [[1,-3],[2,-1],[3,0]].forEach(([sh,o])=>{ if(onlyShape&&sh!==onlyShape) return; const p=f+o; if(p<1||p>MAXP) return;
      const box={shape:sh,map:{},derived:true}; for(let s=0;s<n;s++) for(let q=p;q<=p+3;q++) if(pcs.has(((opens[s]+q)%12+12)%12)) box.map[s+'|'+q]=q-p+1;
      (out[p]=out[p]||[]).push(box); }); } }); return out; }
function boxesFor(rootPc, iv, opens, onlyShape, instrument){ return isStandard(opens)?modeLabBoxes(rootPc,iv,opens,onlyShape,instrument):tuningBoxes(rootPc,iv,opens,onlyShape); }
G.FingerEngine={modeLabBoxes,tuningBoxes,boxesFor,isStandard,solve,audit,assign,shapePositions,COST:C};
})(typeof window!=='undefined'?window:globalThis);
