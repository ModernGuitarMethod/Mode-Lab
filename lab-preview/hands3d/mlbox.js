function mlBoxEngine(P){
  const instrument = P.instrument==="bass" ? "bass" : "guitar", stringOpt = P.opens.length;
  const scaleShape = (+P.shape===1||+P.shape===3) ? +P.shape : 2, scaleRegister = P.register==="high" ? "high" : "low";
  const rootStringChoice = P.rootChoice|0, rangeMode = P.range || "two", direction = P.direction || "up";
  let scale = [], positions = {}, windowStart = 4, windowEnd = 9, windowRootFret = 5;
  let scaleRootMidi = null, lowOctaveString = -1, boxWinStart = 4, boxWinEnd = 9;
  const currentOpens = () => P.opens, rootPc = () => ((P.rpc%12)+12)%12, modeData = () => ({iv:P.iv});
  const stringCount = () => P.opens.length, stringNames = () => P.opens.map(String);
  const midiToNote = m => m, noteToMidi = m => +m;
  const BOX_PINKY_ADDS = true;
    let shiftMarks = [];
  function boxBassIndex(){
    const n = stringCount();
    if(instrument==="bass") return n===5 ? 3 : n-1; // E string; 5-string B sits below
    return n >= 6 ? 5 : n - 1;
  }
  function rootStringOptions(){
    const names = stringNames();
    const n = names.length;
    let idxs;
    if(instrument==="bass" && n===5) idxs=[n-1,n-2,n-3];
    else {
      const e = boxBassIndex();
      idxs=[e, e-1, e-2];
    }
    return idxs.filter(i=>i>=0 && i<n).map(i=>({i, name:names[i]}));
  }
  function chosenRootStringIndex(){
    const opts=rootStringOptions();
    if(!opts.length) return boxBassIndex();
    const k=Math.max(0, Math.min(opts.length-1, rootStringChoice|0));
    return opts[k].i;
  }
  function shapeIndexOff(){
    if(scaleShape===1) return -3;
    if(scaleShape===3) return 0;
    return -1;
  }
  function stringThirdShift(opens){
    /* After a major-3rd string pair (standard G→B), higher strings sit +1 fret vs all-fourths.
       All Fourths / bass fourths: no shift. Open tunings with odd intervals: no CAGED shift. */
    opens=opens||currentOpens();
    const n=opens.length, sh=new Array(n).fill(0);
    let acc=0;
    for(let s=n-2;s>=0;s--){
      const iv=opens[s]-opens[s+1];
      if(iv===4) acc=1;
      sh[s]=acc;
    }
    return sh;
  }
  function shapeFinger(rootFret, fret, stringIndex){
    const sh=stringThirdShift();
    const adj=fret-((stringIndex>=0&&sh[stringIndex])?sh[stringIndex]:0);
    if(scaleShape===1){
      const rel=adj-(rootFret-3);
      if(rel<=0) return 1;
      if(rel===1) return 2;
      if(rel===2) return 3;
      return 4;
    }
    if(scaleShape===3){
      const d=adj-rootFret;
      if(d<=0) return 1;
      if(d===1) return 2;
      if(d===2) return 3;
      return 4;
    }
    /* v1.86 fingerfix: the shape-2 box (shapeSlotList) is rootFret-2..hi on EVERY string, so B/e are not
       shifted here. Index finger sits on rootFret-1 (stretching down one fret); near the nut the hand
       window is hi-3..hi (first position), so frets 1-4 get fingers 1-4 instead of collapsing to 4. */
    const hi2 = rootFret<3 ? Math.max(rootFret+2,4) : rootFret+2;
    const low2 = Math.max(rootFret-1, hi2-3);
    const rel=fret-low2;
    if(rel<=0) return 1;
    if(rel===1) return 2;
    if(rel===2) return 3;
    return 4;
  }
  function normalizeBoxFingers(map){
    const byS={};
    Object.keys(map).forEach(function(k){ (map[k]||[]).forEach(function(p){ (byS[p[0]]=byS[p[0]]||[]).push(p); }); });
    function mono(list, anchorTop){
      if(!list.length) return;
      list.sort(function(a,b){ return a[1]-b[1]; });
      if(anchorTop){ for(let i=list.length-1, v=4;i>=0;i--, v--) list[i][2]=Math.max(1,v); return; }
      for(let i=0;i<list.length;i++){
        let v=Math.max(1, Math.min(4, list[i][2]|0));
        if(i>0 && v<=list[i-1][2]) v=list[i-1][2]+1;
        list[i][2]=v;
      }
      for(let i=list.length-1;i>=0;i--){
        const cap=(i===list.length-1)?4:list[i+1][2]-1;
        if(list[i][2]>cap) list[i][2]=Math.max(1,cap);
      }
    }
    Object.keys(byS).forEach(function(s){
      const fretted=[];
      byS[s].forEach(function(p){ if(p[1]===0) p[2]=0; else fretted.push(p); });
      const late=[]; for(let i=fretted.length-1;i>=0;i--){ if(fretted[i][3]===1){ late.push(fretted[i]); fretted.splice(i,1); } }
      const fr=fretted.map(function(p){ return p[1]; }), span=fr.length?Math.max.apply(null,fr)-Math.min.apply(null,fr):0; /* v1.86 E8: a 7th/8th string wider than one hand splits at the box edge */
      const ext=(+s>boxBassIndex()) && span>5 && fretted.some(function(p){ return p[1]<windowStart || p[1]>windowEnd; });
      /* v1.86 E7: notes placed above fret 15 join the shift group above the box; the box's own numbers never change */
      if(fretted.length<=4 && !ext){ mono(fretted, false); mono(late, true); return; }
      /* 5+ fretted notes on one string cannot fit one hand position: box notes, then the shift group */
      const inBox=[], above=[], below=[];
      fretted.forEach(function(p){
        if(p[1]>windowEnd) above.push(p);
        else if(p[1]<windowStart) below.push(p);
        else inBox.push(p);
      });
      mono(below, false); mono(inBox, false); mono(above.concat(late), true);
    });
    return map;
  }
  function scalePitchClasses(){
    const set={};
    const rpc=rootPc();
    modeData().iv.forEach(x=>{ set[((rpc+x)%12+12)%12]=true; });
    return set;
  }
  function shapeFretRange(rootFret){
    if(scaleShape===1) return [rootFret-3, rootFret+1]; /* lower strings: index at rootFret-3, pinky may reach one past the root fret */
    if(scaleShape===3) return [rootFret-2, rootFret+4];
    return [rootFret-2, rootFret<3 ? Math.max(rootFret+2,4) : rootFret+2];
  }
  function shapeSlotList(rootS, rootFret, nStr){
    const slots=[];
    const opens=currentOpens();
    const pcs=scalePitchClasses();
    const add=(s,fs)=>{ if(s<0||s>=nStr) return; fs.forEach(f=>{ if(f>=0&&f<=21) slots.push({s,f}); }); };
    const tones=(s,lo,hi)=>{
      const fs=[];
      for(let f=lo;f<=hi && f<=21;f++){
        if(f<0) continue;
        if(pcs[((opens[s]+f)%12+12)%12]) fs.push(f);
      }
      return fs;
    };
    if(scaleShape===1){
      // 4th finger on the root, then across to the next string (A-string fret 2 in A). Never skip up the E string.
      add(rootS, [rootFret]);
      {
        const sh=stringThirdShift(opens);
        for(let s=rootS-1;s>=0;s--){
          const stretch=sh[s]||0;
          add(s, tones(s, rootFret-3, rootFret+stretch));
        }
      }
    } else if(scaleShape===3){
      // 1st finger on root: 3-notes-per-string in a 5-fret stretch (A major 5-7-9)
      for(let s=rootS;s>=0;s--) add(s, tones(s, rootFret, rootFret+4).slice(0,3));
    } else {
      // 2nd finger on the root; index may stretch one extra fret so Dorian/Mixo b3 and b7 stay in the box
      const hi = rootFret<3 ? Math.max(rootFret+2,4) : rootFret+2;
      add(rootS, tones(rootS, rootFret-2, hi));
      for(let s=rootS-1;s>=0;s--) add(s, tones(s, rootFret-2, hi));
    }
    /* v1.86 theory fix: high root string (e.g. root on D): the run's lower octave sits on the strings below the
       root inside the same shape, instead of the 2nd octave running up the 1st string. */
    if(lowOctaveString>rootS && scaleRootMidi!=null){
      const rg=shapeFretRange(rootFret), lowRoot=scaleRootMidi-12, rootMidiHere=opens[rootS]+rootFret;
      if(scaleShape===3){
        /* 3 notes per string, climbing from the lower root */
        let cur=lowRoot;
        for(let s=lowOctaveString;s>rootS;s--){
          let n=0;
          for(let m=cur;m<rootMidiHere && n<3;m++){
            const f=m-opens[s];
            if(f<0||f>21) continue;
            if(pcs[((m%12)+12)%12]){ slots.push({s,f}); n++; cur=m+1; }
          }
        }
      } else {
        for(let s=lowOctaveString;s>rootS;s--){
          tones(s, rg[0], rg[1]).forEach(f=>{ const m=opens[s]+f; if(m>=lowRoot && m<rootMidiHere && f>=0 && f<=21) slots.push({s,f}); });
        }
      }
    }
    return slots;
  }
  function highRegisterFits(r, opens, sIdx){
    opens = opens || currentOpens();
    if (sIdx == null) sIdx = chosenRootStringIndex();
    if (r + (scaleShape===1 ? 1 : scaleShape===3 ? 4 : 2) > 21) return false;
    const rootMidi = opens[sIdx] + r;
    let runTop = rootMidi + 24;
    if (sIdx + 1 < 5) {
      const rg = shapeFretRange(r), lowRoot = rootMidi - 12;
      for (let s = sIdx + 1; s < opens.length; s++) { const f = lowRoot - opens[s]; if (f >= 0 && f >= rg[0] && f <= rg[1]) { runTop = rootMidi + 12; break; } }
    }
    return runTop - opens[0] <= 21;
  }
  function buildScaleNotes(){
    const md = modeData();
    const rpc = rootPc();
    const opens = currentOpens();
    const bass = boxBassIndex();
    const openLow = opens[bass];
    const sIdx = chosenRootStringIndex();
    const openRoot = opens[sIdx];

    // Shape 2 = classic A-position box (2nd finger on the root). Shape = which finger owns the root.
    let rootFret = ((rpc - (((openRoot % 12) + 12) % 12)) + 120) % 12;
    /* v1.86 E7: High moves the box up an octave only when the whole box (shape + 2-octave run) fits at or below fret 21 */
    if (scaleRegister === "high" && highRegisterFits(rootFret + 12, opens, sIdx)) rootFret += 12;
    /* v1.86 E2: a 4th-finger-on-root box can't sit below fret 3 (the index would be behind the nut), so it moves up an octave */
    if (scaleShape === 1 && rootFret < 3 && rootFret + 12 <= 21) rootFret += 12;
    if (rootFret < 0) rootFret = 0;
    if (rootFret > 21) rootFret = 21;
    let rootMidi = openRoot + rootFret;
    scaleRootMidi = rootMidi; lowOctaveString = -1;
    /* v1.86 theory fix: with fewer than 5 strings from the root string up (root on D on a 6-string), two
       octaves can't fit above the root inside the shape, so the 2nd octave used to run up the 1st string
       (and could drop notes past fret 15). Span the octave below the root instead, on the lower strings of
       the same shape, when that lower root is inside the shape; otherwise keep the old run. */
    if (sIdx + 1 < 5) {
      const lowRoot = rootMidi - 12, rg = shapeFretRange(rootFret);
      for (let s = sIdx + 1; s < opens.length; s++) {
        const f = lowRoot - opens[s];
        if (f >= 0 && f >= rg[0] && f <= rg[1]) { lowOctaveString = s; break; }
      }
      if (lowOctaveString >= 0) rootMidi = lowRoot;
    }

    // Two octaves + top root. Works for 5, 6, 7 or 8-note scales.
    const iv = md.iv;
    const nDeg = iv.length;
    const core = [];
    for (let step = 0; step <= nDeg * 2; step++) {
      const deg = step % nDeg;
      const oct = Math.floor(step / nDeg);
      core.push(midiToNote(rootMidi + iv[deg] + oct * 12));
    }

    // 7/8-string only: the extension runs from the lowest open string up to the run's root, in the key, with no gap.
    const extra = [];
    if (opens.length > 6) {
      const pcs = {};
      iv.forEach(x => { pcs[((rpc+x)%12+12)%12] = true; }); /* v1.86 E8: scale tones of THIS key (was C-relative) */
      const floor = opens[opens.length-1];
      for (let m = floor; m < rootMidi; m++){
        if (pcs[((m%12)+12)%12]) extra.push(midiToNote(m));
      }
    }
    return { extra, core };
  }
  function computePositions(notes){
    const opens = currentOpens();
    const nStr = opens.length;
    const rootS = chosenRootStringIndex();
    const map = {};
    const firstMidi = noteToMidi(notes[0]);

    let rootFret = (scaleRootMidi!=null ? scaleRootMidi : firstMidi) - opens[rootS];
    if (rootFret < 0 || rootFret > 24) {
      for (let s = rootS; s >= 0; s--) {
        const f = firstMidi - opens[s];
        if (f >= 0 && f <= 24) { rootFret = f; break; }
      }
    }
    rootFret = Math.max(0, Math.min(21, rootFret));
    windowRootFret = rootFret;
    const slots = shapeSlotList(rootS, rootFret, nStr);
    const fs = slots.map(sl=>sl.f);
    windowStart = fs.length ? Math.max(0, Math.min.apply(null, fs)) : Math.max(0, rootFret + shapeIndexOff());
    windowEnd = fs.length ? Math.min(21, Math.max.apply(null, fs)) : windowStart + 5;
    boxWinStart = windowStart; boxWinEnd = windowEnd;

    const used={};
    notes.forEach(note=>{
      const midi=noteToMidi(note);
      let best=null;
      for(let i=0;i<slots.length;i++){
        const sl=slots[i];
        const key=sl.s+"|"+sl.f;
        if(used[key]) continue;
        if(opens[sl.s]+sl.f===midi){ best=sl; break; }
      }
      if(!best){
        for(let s=0;s<nStr;s++){
          const f=midi-opens[s];
          if(f<windowStart||f>windowEnd) continue;
          const key=s+"|"+f;
          if(used[key]) continue;
          if(s>rootS) continue;
          best={s,f}; break;
        }
      }
      if(!best){
        let pick=null;
        for(let s=0;s<nStr;s++){
          const f=midi-opens[s];
          if(f<0||f>15) continue;
          const key=s+"|"+f;
          if(used[key]) continue;
          if(pick==null || f<pick.f || (f===pick.f && s>pick.s)) pick={s,f};
        }
        best=pick;
      }
      if(!best){
        /* v1.86 E7: a run note above fret 15 still goes on the neck (up to fret 21), as close to the box as possible */
        let pick=null, pd=99;
        for(let s=0;s<nStr;s++){
          const f=midi-opens[s];
          if(f<16||f>21||used[s+"|"+f]) continue;
          const d=f<windowStart?windowStart-f:f>windowEnd?f-windowEnd:0;
          if(d<pd){ pd=d; pick={s,f,late:1}; }
        }
        best=pick;
      }
      if(best){
        used[best.s+"|"+best.f]=1;
        map[note]=[[best.s, best.f, shapeFinger(rootFret, best.f, best.s)]];
        if(best.late) map[note][0].push(1); /* placed by the fret-16..21 fallback: fingered as a shift, never renumbers the box */
      }
    });
    return map;
  }
  function fingerFor(fret, s){
    return shapeFinger(typeof windowRootFret==="number"?windowRootFret:windowStart, fret, s);
  }
  function placeExtraBass(extra, map){
    /* v1.86 E8: the 7/8-string extension continues the box downward from the root: each scale tone below the root
       goes on a string at or below the root string, inside the box (one fret either side, or an open string), and
       the extension stops at the first tone the hand can't reach there, so the run stays gap-free. Returns the
       notes placed. */
    const placed = [];
    if(!extra || !extra.length) return placed;
    const opens = currentOpens();
    const rootS = chosenRootStringIndex();
    const lo = windowStart - 1, hi = windowEnd + 1;
    const used = {};
    Object.keys(map).forEach(k => (map[k]||[]).forEach(p => { used[p[0]+"|"+p[1]] = 1; }));
    for (let i = extra.length - 1; i >= 0; i--) {
      const note = extra[i];
      if (map[note]) { placed.unshift(note); continue; }
      const midi = noteToMidi(note);
      let best = null, bd = 99;
      for (let s = opens.length - 1; s >= rootS; s--) {
        const f = midi - opens[s];
        if (f < 0 || f > 21 || used[s+"|"+f]) continue;
        if (f !== 0 && (f < lo || f > hi)) continue;
        const d = f<windowStart ? windowStart-f : f>windowEnd ? f-windowEnd : 0;
        if (d < bd) { bd = d; best = {s, f}; }
      }
      if (!best) break;
      used[best.s+"|"+best.f] = 1;
      map[note] = [[best.s, best.f, fingerFor(best.f, best.s)]];
      placed.unshift(note);
    }
    return placed;
  }
  function buildScale(){
    const built = buildScaleNotes();
    const core = built.core || [];
    const nDeg = (modeData().iv || []).length || 7;
    const map = computePositions(core);
    const extra = placeExtraBass(built.extra || [], map);
    let notes;
    if(rangeMode==="two") notes = core.slice();               /* v1.86: root → root two octaves up */
    else if(rangeMode==="oct1") notes = extra.concat(core.slice(0, nDeg + 1));
    else if(rangeMode==="oct2") notes = core.slice(nDeg);
    else notes = extra.concat(core);
    if(direction==="down") notes = notes.slice().reverse();
    else if(direction==="both"){
      const up=notes.slice();
      const down=notes.slice(0,-1).reverse();
      notes=up.concat(down);
    }
    scale = notes;
    positions = normalizeBoxFingers(map);
    if(BOX_PINKY_ADDS) applyPinkyAdds();
    /* v1.86 E1/E9: every note of the run is drawn. The neck widens to any run note outside the shape (a position
       shift, e.g. the 2nd octave up the top string); those notes are marked "shift" on the neck. */
    scale.forEach(n => { const p = positions[n]; if (!p) return; const f = p[0][1]; if (f < windowStart) windowStart = f; if (f > windowEnd) windowEnd = f; });
    shiftMarks = computeShiftMarks();
    return scale;
  }
  function isShiftFret(f){ return f<boxWinStart || f>boxWinEnd; }
  function boxIndexFret(cells, s){
    const rf=windowRootFret, rootS=chosenRootStringIndex();
    if(lowOctaveString>=0 && s>rootS){
      const one=cells.filter(c=>c.s>rootS && c.f>0 && c.g===1).map(c=>c.f);
      if(one.length) return Math.min.apply(null, one);
    }
    let p;
    if(scaleShape===1) p=rf-3;
    else if(scaleShape===3) p=rf;
    else { const hi2 = rf<3 ? Math.max(rf+2,4) : rf+2; p=Math.max(rf-1, hi2-3); }
    return Math.max(1, p);
  }
  function boxHandProblems(cells){
    const F=cells.filter(c=>c.f>0), bad={};
    if(!F.length) return bad;
    const fs=F.map(c=>c.f);
    if(Math.max.apply(null,fs)-Math.min.apply(null,fs)>=5) bad.U2=1;
    const by={}; F.forEach(c=>{ (by[c.s]=by[c.s]||[]).push(c.f); });
    Object.keys(by).forEach(k=>{ if(Math.max.apply(null,by[k])-Math.min.apply(null,by[k])>=5) bad.U1=1; });
    for(let i=0;i<F.length;i++) for(let j=i+1;j<F.length;j++){
      const a=F[i], c=F[j];
      if(a.g===c.g && a.f!==c.f && Math.abs(a.f-c.f)>=2) bad[a.s===c.s?"U3s":"U3x"]=1;
    if(a.s===c.s&&a.f!==c.f&&a.g!==c.g&&(a.f<c.f)!==(a.g<c.g)) bad.U4=1;
    }
    return bad;
  }
  function boxStringOk(cells, s, f, g){
    const L=cells.filter(c=>c.s===s && c.f>0);
    if(L.some(c=>c.f===f || c.g===g)) return false;
    for(const c of L){
      if((c.f<f)!==(c.g<g)) return false;
      if(Math.abs(c.f-f)>Math.abs(c.g-g)+1) return false;
    }
    const fs=L.map(c=>c.f).concat([f]);
    return Math.max.apply(null,fs)-Math.min.apply(null,fs)<=4;
  }
  function applyPinkyAdds(){
    const opens=currentOpens(), top=boxBassIndex();
    const run=[], seen={};
    scale.forEach(n=>{ const m=noteToMidi(n); if(seen[m]) return; seen[m]=1; const p=positions[n]; run.push({n, m, s:p?p[0][0]:-1, f:p?p[0][1]:-1, g:p?p[0][2]:-1}); });
    run.sort((a,b)=>a.m-b.m);
    const inBox=c=>c.s>=0 && c.s<=top && (c.f===0 ? boxWinStart===0 : (c.f>=boxWinStart && c.f<=boxWinEnd));
    const needs=c=>c.s<0 || (c.s<=top && (c.f===0 ? boxWinStart>0 : c.f<boxWinStart));
    const base=run.filter(inBox);
    run.forEach(c=>{
      if(!needs(c)) return;
      const lo=base.filter(x=>x.m<c.m), hi=base.filter(x=>x.m>c.m);
      const prev=lo.length?lo.reduce((a,b)=>b.m>a.m?b:a):null, next=hi.length?hi.reduce((a,b)=>b.m<a.m?b:a):null;
      const ss={}; [prev,next].forEach(x=>{ if(x){ ss[x.s-1]=1; ss[x.s]=1; ss[x.s+1]=1; } });
      const strs=Object.keys(ss).map(Number).filter(s=>s>=0 && s<=top).sort((a,b)=>a-b);
      const before=boxHandProblems(base);
      const clean=nc=>{
        const after=boxHandProblems(base.concat([nc]));
        if(["U1","U2","U3s"].some(k=>after[k] && !before[k])) return false;
        return !base.some(x=>x.f>0 && x.g===nc.g && Math.abs(x.f-nc.f)>=2);
      };
      let best=null;
      strs.forEach(s=>{
        const f=c.m-opens[s], P0=boxIndexFret(base, s);
        if(f<1 || f>21) return;
        if(f>=P0 && f<=P0+3){
          const g0=f-P0+1;
          [1,2,3,4].sort((a,b)=>(Math.abs(a-g0)-Math.abs(b-g0))||(a-b)).some(g=>{
            if(!boxStringOk(base, s, f, g) || !clean({s, f, g, m:c.m})) return false;
            const sc=Math.abs(g-g0)+(s===c.s?0:0.1);
            if(!best || best.opt>1 || sc<best.sc) best={opt:1, sc, s, f, g};
            return true;
          });
        } else if(f===P0+4 && boxStringOk(base, s, f, 4) && clean({s, f, g:4, m:c.m})){
          if(!best) best={opt:2, sc:0, s, f, g:4};
        }
      });
      if(!best) return;
      positions[c.n]=[[best.s, best.f, best.g]];
      c.s=best.s; c.f=best.f; c.g=best.g; base.push(c);
    });
  }
  function computeShiftMarks(){
    const run=[], seen={};
    scale.forEach(n=>{ const m=noteToMidi(n); if(seen[m]) return; seen[m]=1; const p=positions[n]; if(p) run.push({m, s:p[0][0], f:p[0][1], g:p[0][2]}); });
    run.sort((a,b)=>a.m-b.m);
    const cuts=[]; let start=0;
    for(let i=0;i<run.length;i++){
      const b=boxHandProblems(run.slice(start,i+1));
      if(b.U1||b.U2||b.U3s||b.U3x||b.U4){ cuts.push(i); start=i; }
    }
    const hpos=S=>{ const one=S.filter(c=>c.f>0 && c.g===1).map(c=>c.f); if(one.length) return Math.min.apply(null,one);
      const F=S.filter(c=>c.f>0).map(c=>c.f-c.g+1); return F.length?Math.min.apply(null,F):null; };
    const bounds=[0].concat(cuts,[run.length]), marks=[];
    cuts.forEach((i,k)=>{
      const a=run.slice(bounds[k], i), c=run.slice(i, bounds[k+2]), c0=run[i];
      const pa=hpos(a); let pc=hpos(c);
      let d=(pa!=null && pc!=null) ? pc-pa : 0;
      if(d===0 && pa!=null){ const own=c0.f-c0.g+1; if(own!==pa){ pc=own; d=own-pa; } }
      const label = d>0 ? "shift up "+d+" (index to "+pc+")" : d<0 ? "shift down "+(-d)+" (index to "+pc+")" : "reset hand (index at "+pc+")";
      marks.push({s:c0.s, f:c0.f, m:c0.m, d, to:pc, label, cut:i});
    });
    return marks;
  }
  buildScale();
  const rootS = chosenRootStringIndex();
  return {scale, positions, windowStart, windowEnd, boxWinStart, boxWinEnd, rootFret:windowRootFret, rootS,
    slots:shapeSlotList(rootS, windowRootFret, P.opens.length), lowOctaveString, scaleRootMidi, isShiftFret, shiftMarks};
}
