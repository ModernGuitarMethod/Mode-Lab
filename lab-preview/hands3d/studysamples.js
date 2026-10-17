/* Study Lab's own recordings (study-audio/*.bin, manifest in klaudio.js = Study-Lab-v1.87's KL_AUDIO), played per instrument.
   Same mapping as Study Lab: sample s{i}f{g}, i = string from the LOWEST (0) up, g = recorded fret (0-9, bass 0-12);
   higher frets reuse the nearest recorded fret below, pitch-shifted by playbackRate = 2^((f-g)/12) (exactly as Study Lab's sampleFor). */
(function(){
  const TONE={acoustic:{lp:17200,gain:1},electric:{lp:9000,gain:1.35},bass:{lp:5200,gain:1.3}}, MAXF={acoustic:9,electric:9,bass:12};
  let ac=null, master=null; const BANK={}, LOADING={};
  function ctx(){ if(!ac){ ac=new (window.AudioContext||window.webkitAudioContext)(); master=ac.createGain(); master.gain.value=0.8; master.connect(ac.destination); } return ac; }
  function load(inst){ if(LOADING[inst]) return LOADING[inst]; const M=window.KL_AUDIO.manifest[inst], B=BANK[inst]={};
    return LOADING[inst]=(async()=>{ const a=ctx(); for(const part of ['open','rest']){ const p=M[part]; const ab=await (await fetch(window.KL_AUDIO.base+p.file)).arrayBuffer();
        await Promise.all(p.items.filter(([nm])=>/^s\d+f\d+$/.test(nm)).map(async([nm,o,l])=>{ try{ const buf=await a.decodeAudioData(ab.slice(o,o+l)); const d=buf.getChannelData(0); let pk=0,k=0;
          for(let i=0;i<Math.min(d.length,buf.sampleRate);i++) pk=Math.max(pk,Math.abs(d[i])); while(k<d.length&&Math.abs(d[k])<pk*0.05) k++; B[nm]={buf,off:Math.max(0,k/buf.sampleRate-0.004)}; }catch(e){ console.warn('sample',nm,e); } })); }
      return Object.keys(B).length; })(); }
  function pick(inst,i,f){ const B=BANK[inst]||{}; for(let g=Math.min(f,MAXF[inst]); g>=0; g--){ const it=B['s'+i+'f'+g]; if(it) return {it,g,rate:Math.pow(2,(f-g)/12)}; } return null; }
  /* i: string from lowest (Study numbering), f: fret, when: AudioContext time, dur: seconds */
  function play(inst,i,f,when,dur,vel,rateOverride){ const a=ctx(), sm=pick(inst,i,Math.max(0,f)); const log={inst,i,f,when:+when.toFixed(3),dur:+dur.toFixed(3)};
    if(!sm){ log.missing=true; (window.NOTELOG=window.NOTELOG||[]).push(log); return log; }
    const T=TONE[inst], s=a.createBufferSource(), lp=a.createBiquadFilter(), g=a.createGain(); s.buffer=sm.it.buf; if(rateOverride) sm.rate=sm.rate*rateOverride; s.playbackRate.value=sm.rate; lp.type='lowpass'; lp.frequency.value=T.lp;
    const t=Math.max(a.currentTime,when), v=(vel||0.8)*T.gain*0.6, end=t+Math.max(0.12,dur);
    g.gain.setValueAtTime(v,t); g.gain.setTargetAtTime(0,end,0.06); s.connect(lp); lp.connect(g); g.connect(master); s.start(t,sm.it.off); s.stop(end+0.5);
    Object.assign(log,{sample:'s'+i+'f'+sm.g,rate:+sm.rate.toFixed(4)}); Object.defineProperty(log,'src',{value:s,enumerable:false}); Object.defineProperty(log,'t0',{value:t,enumerable:false}); (window.NOTELOG=window.NOTELOG||[]).push(log); return log; }
  /* by sounding pitch (tuning + capo already in it): the recorded sample nearest in pitch, preferring the same string; rate covers the rest */
  const OPN={acoustic:[40,45,50,55,59,64],electric:[40,45,50,55,59,64],bass:[28,33,38,43]};
  function playPitch(inst,midi,prefI,when,dur,vel){ const O=OPN[inst]; let best=null;
    for(let i=0;i<O.length;i++) for(let g=0;g<=MAXF[inst];g++){ if(!(BANK[inst]||{})['s'+i+'f'+g]) continue; const d=Math.abs(midi-(O[i]+g))+0.25*Math.abs(i-Math.min(O.length-1,Math.max(0,prefI))); if(!best||d<best.d) best={d,i,g}; }
    if(!best) return play(inst,prefI,0,when,dur,vel); const lg=play(inst,best.i,best.g,when,dur,vel,Math.pow(2,(midi-(O[best.i]+best.g))/12)); lg.midi=midi; return lg; }
  window.StudySamples={ctx,load,play,playPitch,pick,stopAll(){ if(master){ master.disconnect(); master=ac.createGain(); master.gain.value=0.8; master.connect(ac.destination); } }};
})();
