/* ml-narrator.js — Mode Lab's ONE narrator (v1.90 Study Lab engine, shared).
   The code below is Study-Lab-v1.90's narrator, moved here unchanged except that the page-specific bits
   (voice on/off, Female/Male choice, the talking indicator, Study's repeat-name filter, "started") come in as hooks.
   Study Lab and every lab that plays lesson cues use this same engine: same ranked Australian voice
   (female by default), same kl-instructor choice, same prosody/rate/pitch, same per-sentence live-voice
   re-resolve, same no-restart rule and the same stop. */
(function(){
"use strict";
if(window.MLNarrator) return;
function create(H){
H=H||{};
H.isOn=H.isOn||function(){ try{ return localStorage.getItem('anat-voice')!=='off'; }catch(e){ return true; } };
H.instructor=H.instructor||function(){ try{ const s=localStorage.getItem('kl-instructor'); if(s==='f'||s==='m') return s; }catch(e){} return 'f'; };
H.talking=H.talking||function(){};
H.isTalking=H.isTalking||function(){ return false; };
H.filterParts=H.filterParts||function(p){ return p; };
H.onStart=H.onStart||function(){};
const hasTTS=('speechSynthesis' in window) && ('SpeechSynthesisUtterance' in window);
/* The instructor: always an Australian voice, the best-sounding one on this device.
   Learners can ask for a female or male instructor; "Best" simply takes the most natural voice. */
const FEMALE=/\b(Matilda|Karen|Catherine|Natasha|Annette|Carly|Elsie|Freya|Joanne|Kim|Tina)\b/i;
const MALE=/\b(Lee|Gordon|William|Darren|Duncan|Ken|Neil|Tim|James)\b/i;
const FEMALE_EN=/\b(Samantha|Serena|Kate|Stephanie|Ava|Allison|Susan|Zoe|Moira|Fiona|Tessa|Isha|Veena|Victoria|Martha|Sonia|Libby|Maisie|Jenny|Aria|Emma|Hazel|Zira|Female)\b/i;
const MALE_EN=/\b(Daniel|Oliver|Arthur|Rishi|Aaron|Fred|Tom|Evan|Nathan|Alex|Reed|Ralph|Ryan|Thomas|Guy|Davis|Christopher|Eric|Brian|George|Mark|David|Male)\b/i;
function voiceGender(v){ return FEMALE.test(v.name)||FEMALE_EN.test(v.name)?'f':MALE.test(v.name)||MALE_EN.test(v.name)?'m':'?'; }
function voiceTier(v){ const n=v.name;
  if(/Premium/i.test(n)) return 'Premium'; if(/Natural|Neural|Online/i.test(n)) return 'Natural';
  if(/network/i.test(n)) return 'Natural'; if(/Enhanced/i.test(n)) return 'Enhanced'; return 'Standard'; }
/* v1.90 ranking. Default narrator: the best Australian female voice; the best Australian male is
   found too. Female: Matilda Premium/Enhanced > Matilda > Microsoft Natasha (Natural) > Google en-AU female
   > Karen > Catherine. Male: Microsoft William (Natural) > Lee Premium/Enhanced > Lee > Google en-AU male > Gordon.
   With no Australian voice of that kind: other Natural/Premium/Enhanced English, Google UK, then any English. */
function vlang(v){ return String(v.lang||'').replace('_','-').toLowerCase(); }
function hq(n){ return /Premium|Enhanced/i.test(n); }
function auRank(v,g){
  const n=v.name||''; if(!/^en-au/.test(vlang(v))) return 0;
  if(g==='f'){
    if(/\bMatilda\b/i.test(n)) return hq(n)?(/Premium/i.test(n)?100:99):95;
    if(/Natasha/i.test(n)) return /Natural|Online/i.test(n)?90:70;
    if(/^Google\b/i.test(n)) return 80;                     // Google en-AU (female on Chrome/Android)
    if(/\bKaren\b/i.test(n)) return hq(n)?76:75;
    if(/\bCatherine\b/i.test(n)) return 65;
    if(voiceGender(v)==='f') return 60;
  } else {
    if(/William/i.test(n)) return /Natural|Online/i.test(n)?100:70;
    if(/\bLee\b/i.test(n)) return hq(n)?(/Premium/i.test(n)?96:95):90;
    if(/^Google\b/i.test(n)&&/male/i.test(n)&&!/female/i.test(n)) return 80;
    if(/\bGordon\b/i.test(n)) return hq(n)?76:75;
    if(/\bJames\b/i.test(n)) return 65;
    if(voiceGender(v)==='m') return 60;
  }
  return 0;
}
function voiceScore(v){ const n=v.name||'', l=vlang(v);
  if(!/^en/.test(l)) return 0;
  if(/Premium|Enhanced|Natural|Neural/i.test(n)) return 50+(/^en-gb/.test(l)?1:0);
  if(/^Google\b/i.test(n)&&/^en-gb/.test(l)) return 40;
  return 30; }
function auVoices(){ return hasTTS ? speechSynthesis.getVoices().filter(v=>/en[-_]AU/i.test(v.lang)) : []; }
function enVoices(){ return hasTTS ? speechSynthesis.getVoices().filter(v=>/^en/i.test(v.lang)) : []; }
let voiceNote='';
/* v1.90 root cause of "always Karen": a SpeechSynthesisVoice object captured before Safari's
   voiceschanged goes stale; Safari then silently falls back to the en-AU default (Karen) because
   u.lang stays en-AU. Matilda Enhanced/Premium also scored no higher than standard voices.
   Now: explicit rankings, the choice is cached by voiceURI, and every sentence re-resolves a live
   voice object from getVoices(). The voice actually used is logged (console.info, window.__klVoice). */
/* v1.90: back to the simple Female/Male narrator control (as v1.86). No voice-list dropdown; old per-voice picks are ignored. */
let klVoicePick=''; try{ localStorage.removeItem('ml-voice-pick'); }catch(e){}
let klLoggedVoice='';
function allVoices(){ try{ return hasTTS?speechSynthesis.getVoices():[]; }catch(e){ return []; } }
function liveVoice(uri){ if(!uri) return null; const a=allVoices(); return a.find(v=>v.voiceURI===uri)||a.find(v=>v.name===uri)||null; }
function rankedVoices(){ return allVoices().filter(v=>/^en/.test(vlang(v))).sort((x,y)=>(Math.max(auRank(y,'f'),auRank(y,'m'))-Math.max(auRank(x,'f'),auRank(x,'m')))||(voiceScore(y)-voiceScore(x))||x.name.localeCompare(y.name)); }
function bestFor(g){ const a=allVoices(); let best=null,bs=0;
  for(const v of a){ const r=auRank(v,g); if(r>bs){ bs=r; best=v; } }
  return best; }
function bestEnglish(g){ const a=allVoices().filter(v=>/^en/.test(vlang(v))).sort((x,y)=>voiceScore(y)-voiceScore(x));
  return a.find(v=>voiceGender(v)===g)||null; }
function pickVoice(pref){
  pref=pref||H.instructor(); voiceNote=''; if(!hasTTS) return null;
  if(klVoicePick&&!/^auto-/.test(klVoicePick)){ const f=liveVoice(klVoicePick); if(f) return f; }
  if(!allVoices().length) return null;
  let v=bestFor(pref); if(v) return v;
  v=bestEnglish(pref);
  if(v){ voiceNote=pref==='m'
      ?`No Australian male voice is installed, so you\u2019re hearing ${v.name.replace(/^(Microsoft|Google) /,'')} instead. To hear an Australian man, download <b>Lee</b>: Settings \u2192 Accessibility \u2192 Spoken Content \u2192 Voices \u2192 English \u2192 English (Australia).`
      :`No Australian female voice is installed, so you\u2019re hearing ${v.name.replace(/^(Microsoft|Google) /,'')} instead. For the best voice, download <b>Matilda</b>: Settings \u2192 Accessibility \u2192 Spoken Content \u2192 Voices \u2192 English \u2192 English (Australia).`; return v; }
  /* v1.90.1: never cross genders. No voice of the chosen gender: leave it to the system default voice. */
  voiceNote=`There\u2019s no ${pref==='m'?'male':'female'} voice installed on this device, so you\u2019ll hear the device\u2019s default voice for now.`;
  return null;
}
window.ModeLabVoices=function(){ const f=bestFor('f'), m=bestFor('m'); return {female:f&&f.name, male:m&&m.name, using:window.__klVoice||null}; };
function sayable(s){
  s=String(s).replace(/(\d+)fr\b/g,'fret $1');
  /* "barre" is said "bar" (the written word is unchanged) */
  s=s.replace(/\b([Bb])arre(s?)\b/g,(m,b,pl)=>(b==='B'?'Bar':'bar')+pl);
  /* hyphenated note and number sequences: "C-E-G" and "1-2-4" are read as "C, E, G" and "1, 2, 4" */
  s=String(s).replace(/(\b[A-G][#b\u266F\u266D]?|\b\d)-(?=(?:[A-G][#b\u266F\u266D]?|\d)\b)/g,'$1, ');
  /* Roman-numeral chords are read as numbers, the way a teacher says them: "I–V–vi–IV" → "one, five, six, four" */
  { const RN={i:'one',ii:'two',iii:'three',iv:'four',v:'five',vi:'six',vii:'seven'};
    const tok='(?:[\u266D\u266F])?(?:VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(?:\u00B0|7)?';
    const say1=t=>{ const m=t.match(/^([\u266D\u266F]?)([ivIV]+)(\u00B0|7)?$/); if(!m) return t; return (m[1]==='\u266D'?'flat ':m[1]==='\u266F'?'sharp ':'')+RN[m[2].toLowerCase()]+(m[3]==='\u00B0'?' diminished':m[3]==='7'?' seven':''); };
    s=s.replace(new RegExp('(?<![A-Za-z])('+tok+')/('+tok+')(?![A-Za-z])','g'),(x,a,b)=>say1(a)+' of '+say1(b));
    s=s.replace(new RegExp('(?<![A-Za-z])'+tok+'(?:\\s*[\u2013\u2014-]\\s*'+tok+'|\\s+'+tok+'){1,}(?![A-Za-z])','g'),x=>x.split(/\s*[\u2013\u2014-]\s*|\s+/).map(say1).join(', '));
    s=s.replace(new RegExp('(?<![A-Za-z])('+tok+')(?= chords?\\b)','g'),(x,a)=>say1(a));
    s=s.replace(new RegExp('(?<![A-Za-z])('+tok+') of ('+tok+')(?![A-Za-z])','g'),(x,a,b)=>say1(a)+' of '+say1(b));
    /* any other clearly-Roman chord label: II to VII, ii to vii, or with a flat or sharp in front (never a lone I, i or v) */
    s=s.replace(new RegExp('(?<![A-Za-z])((?:[\u266D\u266F](?:VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)|VII|VI|IV|III|II|vii|vi|iv|iii|ii)(?:\u00B0|7)?)(?![A-Za-z])','g'),(x,a)=>say1(a)); }
  /* a dash between two note or chord names is a range or a move: "B\u2013C" is read "B to C" */
  s=s.replace(/\b([A-G][#b\u266F\u266D]?(?:m|maj7|m7|7|dim)?)\s*\u2013\s*(?=[A-G](?:[#b\u266F\u266D]|m|\b|\d))/g,'$1 to ');
  /* chord symbols: "Cm" is "C minor" (not centimetres), "Cmaj7" is "C major seven" */
  s=s.replace(/\b([A-G][#\u266F\u266Db]?)maj7\b/g,'$1 major seven').replace(/\b([A-G][#\u266F\u266Db]?)m7\u266D5\b/g,'$1 minor seven flat five').replace(/\b([A-G][#\u266F\u266Db]?)m7\b/g,'$1 minor seven').replace(/\b([A-G][#\u266F\u266Db]?)mMaj7\b/gi,'$1 minor major seven').replace(/\b([A-G](?:[#\u266F\u266D]|b(?=m\b))?)m\b/g,'$1 minor');
  s=String(s).replace(/&lt;(\d+)&gt;/g,'$1 in angle brackets').replace(/&lt;|&gt;/g,'').replace(/&amp;/g,' and ');
  s=String(s).replace(/\s*\(((?:whole|half|quarter|eighth|sixteenth) (?:note|rest)|half step|whole step)\)/gi,(x,w)=>', alternatively known as '+(/^[aeiou]/i.test(w)?'an ':'a ')+w+',').replace(/,\s*([:.;])/g,'$1');
  s=String(s).replace(/(?<![A-Za-z])([TS](?:\s*[-\u2013]\s*[TS]){3,})(?![A-Za-z])/g,(x)=>x.split(/\s*[-\u2013]\s*/).map(c=>c==='T'?'tone':'semitone').join(', '));
  return s.replace(/<br\s*\/?>/g,'. ').replace(/<[^>]+>/g,'')
    .replace(/E A D G B E/g,'E, A, D, G, B, E').replace(/C\u266F/g,'C sharp').replace(/\u266F/g,' sharp')
    .replace(/3\+3/g,'three plus three').replace(/\u266D\u266D/g,' double flat').replace(/\u266D/g,' flat').replace(/\u266E/g,' natural').replace(/\u00BD/g,' and a half').replace(/\u00BC/g,' a quarter').replace(/vii\u00B0/g,'seven diminished').replace(/\u00B0/g,' diminished').replace(/\u2192/g,' to ').replace(/\u2193/g,' down ').replace(/\u2191/g,' up ').replace(/(\d)\/(\d)/g,'$1 $2').replace(/\u00d7/g,' times ').replace(/\u2013|\u2014/g,', ').replace(/(\d+) kg/g,'$1 kilograms').replace(/\u00b7/g,',').replace(/\s+/g,' ').trim();
}
let talkId=0;
/* v1.90 voice: the whole script is split into sentences (long ones at commas, so no single
   utterance runs into Chrome's ~15 s cut-off) and ALL of them are queued at once, in order.
   Nothing depends on one utterance's onend firing (iPad drops it), utterances are kept
   referenced (Safari garbage-collects them mid-queue), and a lab or section name is said
   only once per visit. */
function klChunks(text){
  let parts=(sayable(text).replace(/\s?&(?=[\s,.;:!?]|$)/g,' and ').match(/[^.!?]+[.!?]+["\u201d\u2019)]*|[^.!?]+$/g)||[String(text)]).map(x=>x.trim()).filter(Boolean);
  const out=[];
  parts.forEach(pt=>{ if(pt.length<=180){ out.push(pt); return; }
    let cur=''; pt.split(/(?<=[,;:\u2013\u2014])\s+/).forEach(w=>{ if((cur+' '+w).trim().length>180 && cur){ out.push(cur.trim()); cur=w; } else cur=(cur+' '+w).trim(); });
    if(cur) out.push(cur.trim()); });
  return out;
}

let klNowText='', klDog=0;
function speak(text,mood){
  if(!hasTTS || !H.isOn()) return;
  const v0=pickVoice(); /* v1.90: voices not loaded yet (Safari/Chrome load late): speak anyway, never block */
  /* v1.90: the same script that is already being read is never restarted (a re-render, a tap,
     the notation font arriving), so the teacher is not cut off and nothing repeats. */
  const key=String(text||'').trim();
  if(key && key===klNowText && H.isTalking()) return;
  const parts=H.filterParts(klChunks(text)); if(!parts.length) return;
  speechSynthesis.cancel(); const id=++talkId; klNowText=key;
  window.__klUtts=[]; clearTimeout(klDog);
  /* v1.90: one sentence at a time, like v1.80: each sentence gets its own delivery and a breath
     after it. A watchdog moves on if a browser (iPad) never fires onend, so nothing stalls. */
  let i=0;
  const next=()=>{
    clearTimeout(klDog);
    if(id!==talkId) return;
    if(i>=parts.length){ klNowText=''; H.talking(false); return; }
    const k=i++, txt=parts[k];
    const v=(v0&&liveVoice(v0.voiceURI))||pickVoice()||null;
    const u=new SpeechSynthesisUtterance(txt); if(v){ u.voice=v; u.lang=v.lang; }
    const vn=v?v.name+' ('+v.lang+')':'system default (en-AU)'; window.__klVoice=vn; if(vn!==klLoggedVoice){ klLoggedVoice=vn; try{ console.info('[ModeLab narrator] voice: '+vn); }catch(_){} }
    const pr=prosody(txt,k,parts.length,mood); u.rate=pr.rate; u.pitch=pr.pitch; u.volume=1;
    let done=false; const fin=()=>{ if(done) return; done=true; clearTimeout(klDog); if(id===talkId) setTimeout(next,pr.pause); };
    u.onstart=()=>{ H.onStart(); };
    u.onend=fin; u.onerror=(e)=>{ if(e&&(e.error==='interrupted'||e.error==='canceled')) return; fin(); };
    window.__klUtts.push(u);
    const est=Math.max(2500, txt.length*85/pr.rate)+4000;
    const dog=()=>{ if(done||id!==talkId) return; try{ if(speechSynthesis.speaking && !speechSynthesis.paused){ klDog=setTimeout(dog,2000); return; } }catch(_){} fin(); };
    klDog=setTimeout(dog,est);
    speechSynthesis.speak(u);
  };
  H.talking(true); next();
}
/* coming back to the page: Safari/Chrome pause speech in the background, so resume it */
document.addEventListener('visibilitychange',()=>{ try{ if(!document.hidden && hasTTS && speechSynthesis.paused) speechSynthesis.resume(); }catch(e){} });
/* Dynamic delivery: each sentence gets its own speed and pitch, like a teacher who's into it.
   Exciting moments lift; questions rise; recaps and safety notes settle; key instructions slow a touch.
   A small, repeatable variation stops neighbouring sentences sounding identical. */
const DELIVERY={base:{rate:1.0,pitch:1.07}};
function prosody(t,k,n,mood){
  const s=t.trim(), words=s.split(/\s+/).length;
  let rate=DELIVERY.base.rate, pitch=DELIVERY.base.pitch, pause=230;
  const excited=(mood==='excited'&&k===0) || /!$/.test(s) || /^(well done|great|nice|brilliant|yes|perfect|correct|awesome|excellent|that's it|three stars|you just|you've)\b/i.test(s);
  const question=/\?$/.test(s);
  const tip=/^(teacher's tip|tip|pro tip|top tip|remember)\b/i.test(s);
  const calm=/^(quick recap|recap|teacher's tip|remember|important|careful|stop)\b/i.test(s) || /\b(pain|injur|rest)\b/i.test(s);
  const action=/^(try it|now|your turn|tap|play|press|strum|pluck|slide|listen|watch|count|find)\b/i.test(s);
  const title=k===0 && words<=7 && !question && !excited;
  if(excited){ rate*=1.06; pitch*=1.04; pause=340; }
  else if(question){ rate*=0.98; pitch*=1.03; pause=480; }
  else if(tip){ rate*=0.96; pitch*=0.98; pause=420; }
  else if(/^your turn\b/i.test(s)){ rate*=1.02; pitch*=1.03; pause=420; }
  else if(calm){ rate*=0.95; pitch*=0.97; pause=300; }
  else if(action){ rate*=1.02; pitch*=1.02; pause=300; }
  else if(title){ rate*=0.97; pitch*=1.02; pause=420; }
  else if(words>26){ rate*=1.02; }                     // long explanations move along a little
  const wob=Math.sin((k+1)*2.39+words*0.7);            // gentle, repeatable variation sentence to sentence
  rate*=1+wob*0.02; pitch*=1+wob*0.015;
  if(/[,;:\u2014]/.test(s)&&words>14) pause+=60;      // longer sentences get a little more breath
  return {rate:Math.max(0.9,Math.min(1.08,rate)), pitch:Math.max(1.0,Math.min(1.12,pitch)), pause};
}
function stopVoice(){ talkId++; klNowText=''; clearTimeout(klDog); window.__klUtts=[]; if(hasTTS) speechSynthesis.cancel(); H.talking(false); }
return {
  hasTTS:hasTTS, speak:speak, stop:stopVoice, pickVoice:pickVoice, prosody:prosody, sayable:sayable, klChunks:klChunks,
  bestFor:bestFor, auRank:auRank, allVoices:allVoices, liveVoice:liveVoice, voiceGender:voiceGender, voiceTier:voiceTier,
  rankedVoices:rankedVoices, bestEnglish:bestEnglish, auVoices:auVoices, enVoices:enVoices, vlang:vlang, voiceScore:voiceScore,
  get voiceNote(){ return voiceNote; }, get talkId(){ return talkId; }, get klVoicePick(){ return klVoicePick; }, set klVoicePick(v){ klVoicePick=v; }
};
}
window.MLNarrator={create:create, KEY_INSTRUCTOR:'kl-instructor', KEY_VOICE:'anat-voice'};
})();
