/* Picking-hand stroke rules (Dale):
   1. explicit pick-stroke marks in the file win (alphaTab beat.pickStroke: 1 = up, 2 = down)
   2. legato arrivals (hammer-on, pull-off, slide destination, left-hand tap) are not picked
   3. semibreves, minims and crotchets (dur >= 1 beat) are downstrokes
   4. quavers and faster: alternate picking locked to the grid (pendulum): downs on the beat and strong
      subdivisions, ups on the offbeats; the motion keeps going through rests
   5. metal mode: quavers and semiquavers all downstrokes
   Bass: alternate index / middle (slap = thumb, pop = index). */
(function(G){
const TPB=960;
function assign(events,opt){ opt=opt||{}; const metal=opt.mode==='metal', bass=!!opt.bass; let alt=0;
  /* grid per beat: semiquaver if any event starting in that beat is shorter than a quaver */
  const fine=new Set(); events.forEach(e=>{ if(e.dur<TPB/2-1) fine.add(Math.floor(e.tick/TPB)); });
  events.forEach(e=>{ const n0=e.notes&&e.notes[0]||{};
    if(e.legatoArrive){ e.pick={kind:'none',dir:null,label:'legato: not picked'}; return; }
    if(e.tap&&!bass){ e.pick={kind:'tap',dir:null,label:'right-hand tap'}; return; }
    if(bass){ if(e.slap){ e.pick={kind:'slap',f:'p',dir:'D'}; return; } if(e.pop){ e.pick={kind:'pop',f:'i',dir:'U'}; return; }
      const f=(alt++%2)?'m':'i'; e.pick={kind:'finger',f,dir:'D'}; return; }
    const strum=(e.notes||[]).filter(n=>!n.tie&&!n.support).length>=3;
    let dir=null, src='';
    if(e.pickStroke===2){ dir='D'; src='file'; } else if(e.pickStroke===1){ dir='U'; src='file'; }
    else if(e.dur>=TPB-1){ dir='D'; src='long'; }
    else if(metal){ dir='D'; src='metal'; }
    else { const b=Math.floor(e.tick/TPB), g=fine.has(b)?TPB/4:TPB/2; const k=Math.round((e.tick-b*TPB)/g); dir=k%2?'U':'D'; src='grid'+(g===TPB/4?'16':'8'); }
    e.pick={kind:strum?'strum':'pick',dir,src}; });
  return events; }
G.Strokes={assign,TPB};
if(typeof module!=='undefined') module.exports=G.Strokes;
})(typeof window!=='undefined'?window:globalThis);
