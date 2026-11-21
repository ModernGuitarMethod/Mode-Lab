/* lesson-kit.js — Mode Lab lessons (v1.91 build).
   1) Deep-link params every lab understands (tempo, dir, loop, game, play, shape, inversion, quality, voicing,
      length, chords, countin, click, feel, mixer, file, view, clef, section …), applied through the lab's own controls.
   2) Lesson context: a lab opened from a Study lesson (from=study&ret=<Study route>&lid=<lesson>) shows the lesson bar
      (title, part, Back to lesson, Next part, checklist) and plays the lesson's narration cues with Mode Lab's one narrator.
      Lesson settings apply to that visit only; the learner's shared defaults are left as they were.
   A fresh lab visit (no from=study) opens exactly as before: at the top, no bar, no narration. */
(function(){
"use strict";
if(window.MLLesson) return;
var W=window, D=document, LOC=location;
var Q=new URLSearchParams(LOC.search||"");
var FILE=(LOC.pathname.split("/").pop()||"").toLowerCase();
var PAGE=/^(study|know)-lab/.test(FILE)?"study":((FILE.match(/^(mode|fret|jam|chord|tab|songwriter)-lab/)||[])[1]||"other");
var LABS={mode:"Mode",fret:"Fret",jam:"Jam",chord:"Chord",tab:"Tab",song:"Songwriter",songwriter:"Songwriter",study:"Study"};
var LAB_KEY={mode:"mode",fret:"fret",jam:"jam",chord:"chord",tab:"tab",songwriter:"song",study:"study"};
var SS=(function(){ try{ var s=W.sessionStorage; s.setItem("__t","1"); s.removeItem("__t"); return s; }catch(e){ return null; } })();
function ssGet(k){ try{ return SS?JSON.parse(SS.getItem(k)||"null"):null; }catch(e){ return null; } }
function ssSet(k,v){ try{ if(SS){ if(v==null) SS.removeItem(k); else SS.setItem(k,JSON.stringify(v)); } }catch(e){} }

/* ---------- canonical links ---------- */
function base(){
  /* on modelab.app the canonical route is https://modelab.app/?lab=… ; a local or preview copy stays on its own folder */
  if(/(^|\.)modelab\.app$/i.test(LOC.hostname)) return "https://modelab.app/";
  var p=LOC.pathname; return LOC.origin+p.slice(0,p.lastIndexOf("/")+1);
}
function relRoute(u){ /* the ret value: same-origin path + query */ var x=new URL(u,LOC.href); return x.pathname+x.search; }
function studyRoute(o){ /* o: {subject, lesson, step, lid, part} */
  var q=new URLSearchParams(); q.set("lab","study");
  ["subject","lesson","step","part","lid"].forEach(function(k){ if(o[k]!=null && o[k]!=="") q.set(k,String(o[k])); });
  return base()+"?"+q.toString();
}
function labURL(lesson, retRoute){
  var L=lesson.lab; if(!L) return null;
  var q=new URLSearchParams(); q.set("lab",L.lab);
  Object.keys(L.params||{}).forEach(function(k){ q.set(k,String(L.params[k])); });
  if(retRoute){ q.set("from","study"); q.set("lid",lesson.id); q.set("ret",relRoute(retRoute)); }
  return base()+"?"+q.toString();
}
function validRet(r){
  if(!r || r.length>700) return null;
  try{
    var u=new URL(r, LOC.href); if(u.origin!==LOC.origin || u.hash) return null;
    var f=(u.pathname.split("/").pop()||"");
    var isStudy=((u.searchParams.get("lab")||"").toLowerCase()==="study" && (f===""||/^index(\.html)?$/i.test(f))) || /^Study-Lab-v[\d.]+(\.html)?$/i.test(f);
    if(!isStudy || u.searchParams.has("ret") || u.searchParams.has("from")) return null;
    var ok=true; ["subject","lesson","step","lid","part"].forEach(function(k){ var v=u.searchParams.get(k); if(v!=null && !/^[\w:.\-]{1,64}$/.test(v)) ok=false; });
    return ok ? u.pathname+u.search : null;
  }catch(e){ return null; }
}
var CTX=null;
if(PAGE!=="study" && PAGE!=="other" && Q.get("from")==="study"){
  var r=validRet(Q.get("ret")), lid=Q.get("lid");
  if(r && (!lid || /^\d{1,2}\.\d{1,2}$/.test(lid))) CTX={ret:r, lid:lid||null, lab:PAGE};
}

/* ---------- lesson visits leave the learner's shared defaults alone ---------- */
if(CTX){
  try{
    var OV={"modelab.shared.v1":1,"modelab.shared.ping":1,"fretlab.timeSig.v1":1,"chordlab.spell.v1":1};
    if(PAGE==="songwriter" && Q.has("chords")) OV["guitarlab.songwriter.v132"]=1;   /* a lesson chart never overwrites the learner's own song */
    var SP=Storage.prototype, rg=SP.getItem, rs=SP.setItem, rr=SP.removeItem, mem={}, LSO=null;
    try{ LSO=W.localStorage; }catch(e){}
    SP.getItem=function(k){ if(this===LSO && OV[k] && Object.prototype.hasOwnProperty.call(mem,k)) return mem[k]; return rg.call(this,k); };
    SP.setItem=function(k,v){ if(this===LSO && OV[k]){ mem[k]=String(v); return; } return rs.call(this,k,v); };
    SP.removeItem=function(k){ if(this===LSO && OV[k]){ mem[k]=null; return; } return rr.call(this,k); };
  }catch(e){}
}

/* ---------- param aliases, before the lab reads its URL ---------- */
(function(){
  try{
    var ch=false;
    if(Q.has("dir") && !Q.get("direction")){ Q.set("direction", (Q.get("dir")||"").toLowerCase()); ch=true; }
    if(ch) history.replaceState(history.state,"",LOC.pathname+"?"+Q.toString()+LOC.hash);
  }catch(e){}
})();

/* ---------- event log (also read by the automated checks) ---------- */
var LOG=W.__mlLessonLog=[];
function log(type,data){
  var ev={t:type, lab:PAGE, lid:(CTX&&CTX.lid)||(data&&data.lid)||null, at:Date.now()}; if(data) for(var k in data) ev[k]=data[k];
  LOG.push(ev);
  var all=ssGet("ml-lesson-log")||[]; all.push(ev); if(all.length>300) all=all.slice(-300); ssSet("ml-lesson-log",all);
  try{ D.dispatchEvent(new CustomEvent("ml-lesson",{detail:ev})); }catch(e){}
}

/* ---------- manifest ---------- */
var MAN=null, MANP=null;
function manifest(){
  if(MANP) return MANP;
  MANP=fetch("lessons.json?v=1.91",{cache:"no-cache"}).then(function(r){ return r.json(); }).then(function(j){
    var by={}, bySt={}; j.lessons=j.lessons.filter(function(L){ return !L.hidden; }); /* hidden = held drafts: kept in the file, not on the path */ j.lessons.forEach(function(L,i){ L.index=i; by[L.id]=L; if(L.study) bySt[L.study.subject+"|"+L.study.lesson]=L; });
    MAN={list:j.lessons, byId:by, byStudy:bySt}; return MAN; });
  return MANP;
}

/* ---------- progress (durable): visited / self-reported / verified, per lesson part ---------- */
var PKEY="ml-lesson-state-v1";
function prog(){ try{ var o=JSON.parse(localStorage.getItem(PKEY)||"{}"); return (o && o.v===1)?o:{v:1,lessons:{}}; }catch(e){ return {v:1,lessons:{}}; } }
function setPart(lid,part,status,extra){
  if(!lid) return; var o=prog(), L=o.lessons[lid]=o.lessons[lid]||{}, p=L[part]=L[part]||{};
  var rank={visited:1,self:2,verified:3};
  if(!p.status || (rank[status]||0)>=(rank[p.status]||0)) p.status=status;
  if(extra) for(var k in extra) p[k]=extra[k];
  p.at=Date.now(); try{ localStorage.setItem(PKEY,JSON.stringify(o)); }catch(e){}
  renderChecklist();
}
function parts(L){
  var out=[{id:"learn", label:"Learn", where:"Study Lab"}];
  if(L && L.lab) out.push({id:"practise", label:"Practise in "+L.lab.name, where:L.lab.name});
  var playing=!!(L && L.lab && {mode:1,fret:1,chord:1,tab:1}[L.lab.lab]); /* v1.91: playing lessons pass on one correct play */
  out.push({id:"check", label:playing?"Check: play it once":(L&&L.game)?"Check: Test me":"Check", where:playing?L.lab.name:"Study Lab"});
  return out;
}

/* ---------- narrator (the same engine and settings as Study Lab) ---------- */
var NAR=null, narTalking=false;
function narrator(){
  if(NAR || !W.MLNarrator) return NAR;
  NAR=W.MLNarrator.create({ talking:function(on){ narTalking=!!on; var b=D.getElementById("mlbVoice"); if(b) b.classList.toggle("talking",!!on); },
    isTalking:function(){ return narTalking; }, onStart:function(){ narStarted=true; } });
  return NAR;
}
var narStarted=false, cueKicked=false, cueByGesture=false, pendingCue=null;
/* play-once, the same rule as Study: try as soon as voices are ready; if the browser holds it back until the
   first touch, that first touch starts it once; nothing after that restarts it */
function playCue(type, text){
  pendingCue={type:type,text:text};
  var N=narrator(); if(!N || !text) return;
  var go=function(gesture){
    if(!pendingCue) return;
    if(gesture){ if(cueByGesture) return; cueByGesture=true; if(narStarted) return; }
    else if(cueKicked) return;
    if(N.hasTTS && (N.pickVoice()||N.allVoices().length)){ cueKicked=!gesture||cueKicked; N.speak(pendingCue.text); }
  };
  narStarted=false; cueKicked=false; cueByGesture=false;
  if(N.hasTTS){
    try{ speechSynthesis.getVoices(); }catch(e){}
    try{ speechSynthesis.addEventListener("voiceschanged",function(){ if(!narStarted) go(false); }); }catch(e){}
    setTimeout(function(){ if(!narStarted) go(false); },150);
    setTimeout(function(){ if(!narStarted && !cueKicked){ cueKicked=true; if(pendingCue) N.speak(pendingCue.text); } },1800);
    var ft=function(){ go(true); D.removeEventListener("pointerdown",ft,true); D.removeEventListener("keydown",ft,true); };
    D.addEventListener("pointerdown",ft,true); D.addEventListener("keydown",ft,true);
  }
}
function stopNarration(){ pendingCue=null; if(NAR) NAR.stop(); }

/* ---------- deep-link params through each lab's own controls ---------- */
function $(id){ return D.getElementById(id); }
function fire(el,types){ (types||["input","change"]).forEach(function(t){ try{ el.dispatchEvent(new Event(t,{bubbles:true})); }catch(e){} }); }
function setSel(id,val){ var el=$(id); if(!el || val==null) return false; var ok=[].some.call(el.options||[],function(o){ return o.value===String(val); }); if(!ok) return false; if(el.value!==String(val)){ el.value=String(val); fire(el); } return true; }
function setRange(id,val){ var el=$(id); if(!el || val==null) return false; var n=parseInt(val,10); if(!n) return false; if(String(el.value)!==String(n)){ el.value=String(n); fire(el); } return true; }
function setChk(id,on){ var el=$(id); if(!el) return false; if(el.checked!==!!on){ el.checked=!!on; fire(el,["input","change"]); } return true; }
function onOff(v){ return /^(1|on|yes|true)$/i.test(String(v)); }
function sharedTempo(n){ try{ var p=W.GLShared.load(); p.tempo=parseInt(n,10)||p.tempo; W.GLShared.save(p); return true; }catch(e){ return false; } }
function pillOn(sel){ var b=D.querySelector(sel); if(!b) return false; if(!b.classList.contains("on")) b.click(); return true; }
var JAM_VOICE={triads:"triad",triad:"triad",sevenths:"7",seventh:"7","7":"7",ninths:"9",ninth:"9","9":"9",auto:"auto"};
var CH_VOICE={triad:"triad","7th":"7","7":"7","9th":"9","9":"9","13th":"13","13":"13",power:"power"};
var CH_MARK={degrees:"int",degree:"int",int:"int",fingers:"finger",finger:"finger",frets:"fret",fret:"fret"};
var TAB_VIEW={both:"scoretab",scoretab:"scoretab",notation:"score",score:"score",staff:"score",tab:"tab"};
var TAB_FILES={"little-wing":"Little-Wing.gp3"};
/* v1.91 one short exercise per Tab lesson (tab-exercises/Lx-y.alphatex); its score title starts "Lesson x.y" */
["1.12","1.13","1.22","1.23","1.24","1.25","2.4","2.5","2.6","2.7","2.13","2.16","2.17","2.18","2.19","2.20","2.21","2.33"].forEach(function(id){ TAB_FILES["l"+id.replace(".","-")]="tab-exercises/L"+id.replace(".","-")+".alphatex"; });
function tabFileTitleOk(key,got){ key=String(key||"").toLowerCase(); if(key==="little-wing") return /little wing/i.test(got); var m=key.match(/^l(\d+)-(\d+)$/); return !!(m && new RegExp("^Lesson "+m[1]+"\\."+m[2]+"\\b").test(got)); }
var APPLY={
  mode:{ tempo:function(v){ return setRange("tempo",v); }, dir:function(v){ return setSel("dirSel",v); }, direction:function(v){ return setSel("dirSel",v); }, loop:function(v){ return setSel("loopSel",onOff(v)?"on":"off"); } },
  fret:{ game:function(v){ return setSel("gameSelect",v); }, tempo:function(v){ return setRange("tempo",v); }, dir:function(v){ return setSel("dirSelect",v); }, loop:function(v){ return setSel("loopSelect",onOff(v)?"on":"off"); },
         view:function(v){ return pillOn('.view-pill[data-view="'+({both:"both",neck:"neck",score:"score",staff:"score"}[v]||"both")+'"]'); },
         play:function(v){ var id=v==="test"?"btnTest":"btnPractice", b=$(id); if(!b) return false; b.classList.add("ml-arm"); b.setAttribute("data-ml-arm","1"); return true; } },
  jam:{ tempo:function(v){ return setRange("bpm",v); }, length:function(v){ return setSel("lenSel",v); }, chords:function(v){ return setSel("chordsSel",v); },
        voicing:function(v){ return setSel("voiceSel",JAM_VOICE[v]||v); }, click:function(v){ return setChk("clickOn",onOff(v)); }, countin:function(v){ return setChk("countIn",onOff(v)); },
        feel:function(v){ return setChk("swing",v==="swing"); }, mixer:function(v){ var m=String(v).match(/^(bass|keys|guitar|drums)-off$/); if(!m) return false; return setChk({bass:"onB",keys:"onK",guitar:"onG",drums:"onD"}[m[1]],false); },
        dir:function(v){ return setSel("dirSel",v); },
        prog:function(v){ return !!(W.__jamProg && W.__jamProg(v)); } },
  chord:{ tempo:function(v){ return sharedTempo(v); }, voicing:function(v){ return setSel("voiceSel",CH_VOICE[v]||v); }, inversion:function(v){ return setSel("invSel",String(parseInt(v,10)||0)); },
          i:function(v){ var H=W.__chLesson; return !!(H && H.degree(v)); },
          quality:function(v){ var H=W.__chLesson; return !!(H && H.quality(v)); }, markers:function(v){ return setSel("markSelDrop",CH_MARK[v]||v); }, caged:function(v){ return setSel("cagedSel",String(v).toUpperCase()); },
          shape:function(v){ if(v!=="open") return false; var b=[].find.call(D.querySelectorAll("#cagedStrip .caged-mini"),function(x){ return /·\s*open$/.test((x.textContent||"").trim()); }); if(!b) return false; if(!b.classList.contains("on")) b.click(); return true; },
          dir:function(v){ return setSel("dirSel",v); } },
  tab:{ tempo:function(v){ var el=$("tempoNum"); if(!el) return false; var n=parseInt(v,10); if(!n) return false; el.value=String(n); fire(el,["input","change"]); return true; },
        view:function(v){ var k=TAB_VIEW[v]; if(!k) return false; return pillOn('#viewSwitch .pill[data-view="'+k+'"]'); },
        clef:function(v){ return setSel("tlClef",v); },
        file:function(v){ var f=TAB_FILES[String(v).toLowerCase()]; var lb=G("loadBytes"); if(!f || typeof lb!=="function") return false;
          fetch(f).then(function(r){ return r.arrayBuffer(); }).then(function(buf){ try{ lb(f.split("/").pop(),buf); }catch(e){} }); return true; } },
  songwriter:{ tempo:function(v){ var el=$("fTempo"); if(!el) return false; el.value=String(parseInt(v,10)||""); fire(el,["input","change"]); return true; },
        section:function(v){ var H=W.__swLesson; return !!(H && H.section(v)); },
        chords:function(v){ var H=W.__swLesson; return !!(H && H.chords(v)); } }
};
var READ={
  mode:{ tempo:function(){ return ($("tempo")||{}).value; }, dir:function(){ return ($("dirSel")||{}).value; }, loop:function(){ return ($("loopSel")||{}).value; }, range:function(){ return ($("rangeSel")||{}).value; }, shape:function(){ return ($("shapeSel")||{}).value; }, root:function(){ return ($("rootSelect")||{}).value; }, mode:function(){ return ($("modeSel")||{}).value; }, family:function(){ return ($("familySel")||{}).value; }, inst:function(){ return ($("instSel")||{}).value; } },
  fret:{ game:function(){ return ($("gameSelect")||{}).value; }, tempo:function(){ return ($("tempo")||{}).value; }, play:function(){ var a=D.querySelector("[data-ml-arm]"); return a?(a.id==="btnTest"?"test":"practice"):""; }, root:function(){ return ($("rootSelect")||{}).value; }, mode:function(){ return ($("modeSelect")||{}).value; }, inst:function(){ return ($("instSelect")||{}).value; }, view:function(){ var b=D.querySelector(".view-pill.on"); return b?b.getAttribute("data-view"):""; }, dir:function(){ return ($("dirSelect")||{}).value; } },
  jam:{ prog:function(){ var c=W.__jamCard&&W.__jamCard(), want=Q.get("prog"); if(!c) return ""; return (want && W.__jamResolve && W.__jamResolve(want)===c.id)?want:c.id; }, card:function(){ var c=W.__jamCard&&W.__jamCard(); return c?c.name+": "+c.chords.join(" "):""; }, tempo:function(){ return ($("bpm")||{}).value; }, length:function(){ return ($("lenSel")||{}).value; }, chords:function(){ return ($("chordsSel")||{}).value; }, voicing:function(){ return ($("voiceSel")||{}).value; }, click:function(){ return $("clickOn")&&$("clickOn").checked?"on":"off"; }, countin:function(){ return $("countIn")&&$("countIn").checked?"1":"0"; }, feel:function(){ return $("swing")&&$("swing").checked?"swing":"straight"; }, mixer:function(){ return $("onB")&&!$("onB").checked?"bass-off":"all-on"; }, genre:function(){ return ($("genreSel")||{}).value; }, root:function(){ return ($("keySel")||{}).value; }, mode:function(){ return ($("modeSel")||{}).value; }, inst:function(){ return ($("instSel")||{}).value; } },
  chord:{ tempo:function(){ try{ return String(W.GLShared.load().tempo); }catch(e){ return ""; } }, voicing:function(){ return ($("voiceSel")||{}).value; }, inversion:function(){ return ($("invSel")||{}).value; }, quality:function(){ return ($("allQualSel")||{}).value; }, i:function(){ var H=W.__chLesson; return H?String(H.current().i):""; }, chord:function(){ var H=W.__chLesson; return H?H.current().name:""; }, notes:function(){ var H=W.__chLesson; return H?H.current().notes.join(" "):""; }, markers:function(){ return ($("markSelDrop")||{}).value; }, shape:function(){ var b=D.querySelector("#cagedStrip .caged-mini.on"); return b&&/·\s*open$/.test(b.textContent.trim())?"open":(b?b.textContent.trim():""); }, root:function(){ return ($("rootSelect")||{}).value; }, mode:function(){ return ($("modeSel")||{}).value; }, caged:function(){ return ($("cagedSel")||{}).value; } },
  tab:{ tempo:function(){ return ($("tempoNum")||{}).value; }, view:function(){ var b=D.querySelector("#viewSwitch .pill.on"); return b?b.getAttribute("data-view"):""; }, clef:function(){ return ($("tlClef")||{}).value; }, timeSig:function(){ return ($("tlTimeSig")||{}).value; }, file:function(){ var t=$("songTitle"); return t?t.textContent.trim():""; } },
  songwriter:{ section:function(){ var H=W.__swLesson; return H?H.current():""; }, chords:function(){ var H=W.__swLesson; return H?H.chart():""; }, root:function(){ return ($("rootSelect")||{}).value; }, mode:function(){ return ($("modeSel")||{}).value; }, tempo:function(){ return ($("fTempo")||{}).value; } }
};
/* expected control value for a URL param, to check the visit really shows what the lesson asked for */
function expectFor(lab,k,v){
  v=String(v);
  if(lab==="jam"){ if(k==="voicing") return JAM_VOICE[v]||v; if(k==="click") return onOff(v)?"on":"off"; if(k==="countin") return onOff(v)?"1":"0"; if(k==="feel") return v==="swing"?"swing":"straight"; }
  if(lab==="chord"){ if(k==="voicing") return CH_VOICE[v]||v; if(k==="markers") return CH_MARK[v]||v; if(k==="inversion") return String(parseInt(v,10)||0); if(k==="caged") return v.toUpperCase(); }
  if(lab==="mode"||lab==="fret"){ if(k==="loop") return onOff(v)?"on":"off"; }
  if(lab==="fret" && k==="view") return {both:"both",neck:"neck",score:"score",staff:"score"}[v]||"both";
  if(lab==="tab" && k==="view") return TAB_VIEW[v]||v;
  if(lab==="songwriter" && k==="section") return v;
  if(lab==="songwriter" && k==="chords") return v;
  return v;
}
var DL_KEYS={mode:["tempo","dir","loop"],fret:["game","tempo","dir","loop","view","play"],jam:["tempo","length","chords","voicing","click","countin","feel","mixer","prog"],
  chord:["tempo","voicing","i","quality","caged","shape","inversion","markers"],tab:["tempo","view","clef","file"],songwriter:["section","chords","tempo"]};
var applied={};
function applyParams(){
  var A=APPLY[PAGE], keys=DL_KEYS[PAGE]; if(!A||!keys) return {};
  var scr=keepScroll();
  keys.forEach(function(k){ var v=Q.get(k); if(k==="dir" && v==null) return; if(v==null||v==="") return; try{ applied[k]={want:v, ok:!!A[k](v)}; }catch(e){ applied[k]={want:v, ok:false}; } });
  scr();
  return applied;
}
function keepScroll(){ /* a deep link never moves the page: labs open at the top */
  var els=[D.scrollingElement].concat([].slice.call(D.querySelectorAll(".card,.col-stack,.app"))), at=els.map(function(e){ return e?e.scrollTop:0; });
  return function(){ els.forEach(function(e,i){ if(e && e.scrollTop!==at[i]) e.scrollTop=at[i]; }); };
}
function state(){
  var R=READ[PAGE]||{}, o={}; Object.keys(R).forEach(function(k){ try{ o[k]=R[k](); }catch(e){ o[k]=null; } }); return o;
}
function verify(){
  var R=READ[PAGE]||{}, bad=[];
  Object.keys(applied).forEach(function(k){ var want=expectFor(PAGE,k,applied[k].want), got=R[k]?String(R[k]()):"";
    if(k==="file"){ if(!tabFileTitleOk(applied[k].want,got)) bad.push(k); return; }
    if(PAGE==="songwriter" && k==="section"){ if(!(got===want || got.indexOf(want+"-")===0)) bad.push(k); return; }
    /* Jam's whole-form rule (v1.90 J6) moves Length to the nearest length that holds whole forms of the chosen style */
    if(PAGE==="jam" && k==="length" && got!==want){ var note=""; try{ note=String(G("jgLenNote")||""); }catch(e){}
      if(/^Length set to/.test(note)){ adjusted[k]={want:want, got:got, why:note}; return; } }
    if(got!==want) bad.push(k); });
  return bad;
}
var dlDone=false, adjusted={};
function bootParams(){
  if(dlDone) return; dlDone=true;
  applyParams();
  setTimeout(function(){ var bad=verify(); if(bad.length){ /* a lab's own late boot may reset a control once: apply again */ dlDone=false; applied={}; applyParams(); dlDone=true; }
    W.__mlDeepLink={applied:applied, bad:verify(), adjusted:adjusted, state:state()}; log("deeplink",{bad:W.__mlDeepLink.bad});
    try{ D.dispatchEvent(new CustomEvent("ml-deeplink-ready",{detail:W.__mlDeepLink})); }catch(e){}
    if(CTX) arrival(); }, 900);
}

/* ---------- the lesson bar ---------- */
var LES=null;
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
var CSS=""
+"#mlLessonBar.mlb-fixed{position:fixed;top:0;margin:0;box-sizing:border-box}"
+"#mlLessonBar{position:sticky;top:0;z-index:950;margin:0 0 .45rem;background:linear-gradient(180deg,#191510,#12100c);border:1px solid rgba(212,160,23,.55);border-radius:12px;color:#f3efe3;font:600 13px/1.25 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.35)}"
+"#mlLessonBar .mlb-row{display:flex;align-items:center;gap:.5rem;padding:.4rem .55rem;flex-wrap:nowrap;min-width:0}"
+"#mlLessonBar .mlb-t{flex:1 1 auto;min-width:0;display:flex;flex-direction:column}"
+"#mlLessonBar .mlb-k{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#d4a017;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"
+"#mlLessonBar .mlb-h{font-size:14px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"
+"#mlLessonBar .mlb-p{font-size:12px;color:#cfc6b4;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"
+"#mlLessonBar .mlb-b{flex:0 0 auto;display:flex;gap:.4rem;align-items:center}"
+"#mlLessonBar button,#mlLessonBar a.mlb-btn{appearance:none;min-height:40px;min-width:40px;padding:0 .8rem;border-radius:999px;border:1px solid #d4a017;background:#141414;color:#d4a017;font:800 12.5px/1 system-ui,-apple-system,sans-serif;letter-spacing:.02em;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:.3rem;text-decoration:none;white-space:nowrap}"
+"#mlLessonBar .mlb-next{background:#d4a017;color:#111}"
+"#mlLessonBar .mlb-ico{padding:0;width:40px}"
+"#mlLessonBar button:focus-visible{outline:2px solid #fff;outline-offset:2px}"
+"#mlLessonBar #mlbVoice.talking{box-shadow:0 0 0 3px rgba(212,160,23,.35)}"
+"#mlLessonBar .mlb-panel{display:none;border-top:1px solid rgba(212,160,23,.3);padding:.5rem .65rem .6rem}"
+"#mlLessonBar.open .mlb-panel{display:block}"
+"#mlLessonBar .mlb-list{list-style:none;margin:0 0 .5rem;padding:0;display:grid;gap:.3rem}"
+"#mlLessonBar .mlb-list li{display:flex;align-items:center;gap:.5rem;font-weight:600}"
+"#mlLessonBar .mlb-list i{flex:0 0 18px;height:18px;border-radius:50%;border:2px solid #6f6550;display:inline-flex;align-items:center;justify-content:center;font-style:normal;font-size:11px;color:#111}"
+"#mlLessonBar .mlb-list li.visited i{border-color:#d4a017}"
+"#mlLessonBar .mlb-list li.self i,#mlLessonBar .mlb-list li.verified i{background:#d4a017;border-color:#d4a017}"
+"#mlLessonBar .mlb-list li.now span{color:#d4a017}"
+"#mlLessonBar .mlb-list small{color:#a99f8a;font-weight:600;margin-left:.2rem}"
+"#mlLessonBar .mlb-acts{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center}"
+"#mlLessonBar .mlb-seg{display:inline-flex;border:1px solid #d4a017;border-radius:999px;overflow:hidden}"
+"#mlLessonBar .mlb-seg button{border:0;border-radius:0;min-width:64px}"
+"#mlLessonBar .mlb-seg button[aria-pressed=true]{background:#d4a017;color:#111}"
+"#mlLessonBar .mlb-msg{margin:.45rem 0 0;color:#e9dfc6;font-weight:600;font-size:12.5px}"
+".ml-arm{box-shadow:0 0 0 3px rgba(212,160,23,.55)!important}"
+"html[data-theme=light] #mlLessonBar,body.light #mlLessonBar{background:linear-gradient(180deg,#fbf6ea,#f3ecdb);color:#1d1a15}"
+"html[data-theme=light] #mlLessonBar .mlb-p,body.light #mlLessonBar .mlb-p{color:#5b5240}"
+"html[data-theme=light] #mlLessonBar button,body.light #mlLessonBar button,html[data-theme=light] #mlLessonBar a.mlb-btn{background:#fffdf7;color:#8a6508;border-color:#b8891f}"
+"html[data-theme=light] #mlLessonBar .mlb-next,body.light #mlLessonBar .mlb-next{background:#b8891f;color:#fff}"
+"#mlLessonBar .mlb-chkrow{display:flex;flex-wrap:wrap;align-items:center;gap:.35rem .5rem;padding:.3rem .6rem .4rem;border-top:1px solid rgba(212,160,23,.25)}"
+"#mlLessonBar .mlb-chk{flex:1 1 220px;margin:0;font-size:12.5px;font-weight:700;color:#e9dfc6;min-width:0}"
+"#mlLessonBar .mlb-chk.ok{color:#7fdc8a}#mlLessonBar .mlb-chk.bad{color:#ff9a8a}"
+"#mlLessonBar .mlb-chkacts{display:inline-flex;gap:.35rem;flex-wrap:wrap}"
+"#mlLessonBar .mlb-tappad{flex:1 1 100%}#mlLessonBar .mlb-tapq{margin:.1rem 0 .35rem;font-size:12.5px}"
+"#mlLessonBar .mlb-taps{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:.3rem}"
+"#mlLessonBar .mlb-taps button{min-width:0;padding:0 .2rem;font-size:12px}#mlLessonBar .mlb-taps button[aria-pressed=true]{background:#d4a017;color:#111}#mlLessonBar .mlb-taps button.bad{border-color:#ff7a6a;color:#ff9a8a}"
+"html[data-theme=light] #mlLessonBar .mlb-chk,body.light #mlLessonBar .mlb-chk{color:#3b3426}"
+"@media (max-width:820px){#mlLessonBar .mlb-row{flex-wrap:wrap;gap:.35rem}#mlLessonBar .mlb-t{flex:1 1 100%}#mlLessonBar .mlb-b{flex:1 1 100%;justify-content:space-between}#mlLessonBar .mlb-b .mlb-main{flex:1 1 auto}}"
+"@media (max-width:480px){#mlLessonBar{border-radius:10px;font-size:12px}#mlLessonBar .mlb-h{font-size:13px}#mlLessonBar button{padding:0 .55rem;font-size:12px}#mlLessonBar .mlb-b{gap:.3rem}}"
+"@media (prefers-reduced-motion:reduce){#mlLessonBar *{transition:none!important;animation:none!important}}";
function partIndex(L,id){ var P=parts(L); for(var i=0;i<P.length;i++) if(P[i].id===id) return i; return 0; }
function renderChecklist(){
  var ul=D.getElementById("mlbList"); if(!ul || !LES) return;
  var st=(prog().lessons[LES.id])||{}, P=parts(LES), here=CTX?"practise":"learn";
  ul.innerHTML=P.map(function(p,i){ var s=(st[p.id]||{}).status||"", lab=s==="verified"?"done":s==="self"?"practised (self-reported)":s==="visited"?"opened":"not started";
    if(p.id==="check" && s==="verified") lab="passed"+(st.check.source==="mic"?" (heard on the mic)":st.check.source==="tap"?" (tapped, no mic)":"")+(st.check.stars!=null?" · "+st.check.stars+" of 3 stars":"");
    else if(p.id==="check" && st.check && st.check.stars!=null) lab=st.check.stars+" of 3 stars";
    return '<li class="'+s+(p.id===here?' now':'')+'"><i aria-hidden="true">'+(s==="self"||s==="verified"?"✓":"")+'</i><span>'+(i+1)+'. '+esc(p.label)+'</span><small>'+esc(lab)+'</small></li>'; }).join("");
}
function bar(L){
  if(D.getElementById("mlLessonBar")) return;
  var st=D.createElement("style"); st.id="mlLessonBarCss"; st.textContent=CSS; D.head.appendChild(st);
  var P=parts(L), pi=partIndex(L,"practise");
  var b=D.createElement("div"); b.id="mlLessonBar"; b.setAttribute("role","region"); b.setAttribute("aria-label","Lesson");
  var lessonNo=L?("Level "+L.level+" · Lesson "+L.n):"Lesson";
  var inst=(function(){ try{ var s=localStorage.getItem("kl-instructor"); return s==="m"?"m":"f"; }catch(e){ return "f"; } })();
  var von=(function(){ try{ return localStorage.getItem("anat-voice")!=="off"; }catch(e){ return true; } })();
  b.innerHTML='<div class="mlb-row">'
    +'<div class="mlb-t"><span class="mlb-k">'+esc(lessonNo)+'</span><span class="mlb-h">'+esc(L?L.title:"Your lesson")+'</span><span class="mlb-p">Part '+(pi+1)+' of '+P.length+' · '+esc(P[pi]?P[pi].label:"Practise")+'</span></div>'
    +'<div class="mlb-b"><button type="button" class="mlb-main" id="mlbBack" aria-label="Back to lesson">← Back to lesson</button>'
    +'<button type="button" class="mlb-main mlb-next" id="mlbNext">Next part →</button>'
    +'<button type="button" class="mlb-ico" id="mlbList_t" aria-expanded="false" aria-controls="mlbPanel" aria-label="Lesson checklist" title="Lesson checklist">☰</button></div></div>'
    +'<div class="mlb-panel" id="mlbPanel"><ul class="mlb-list" id="mlbList"></ul><div class="mlb-acts">'
    +'<button type="button" id="mlbDone">I’ve practised this</button><button type="button" id="mlbCoach">Coach</button>'
    +'<button type="button" id="mlbVoice" aria-pressed="'+(von?"true":"false")+'">'+(von?"Voice on":"Voice off")+'</button>'
    +'<span class="mlb-seg" role="group" aria-label="Instructor"><button type="button" data-i="f" aria-pressed="'+(inst==="f")+'">Female</button><button type="button" data-i="m" aria-pressed="'+(inst==="m")+'">Male</button></span>'
    +'<button type="button" id="mlbExit">Exit lesson</button></div><p class="mlb-msg" id="mlbMsg" hidden></p></div>';
  var hdr=D.querySelector(".app > header")||D.querySelector("header");
  if(hdr && hdr.parentNode) hdr.parentNode.insertBefore(b, hdr.nextSibling); else D.body.insertBefore(b, D.body.firstChild);
  /* sticky fallback: some labs make <body> its own (non-scrolling) overflow box, which disables position:sticky */
  var ph=D.createElement("div"); ph.className="mlb-ph"; ph.setAttribute("aria-hidden","true"); ph.style.cssText="display:none;margin:0 0 .45rem"; b.parentNode.insertBefore(ph,b);
  var pin=function(){ if(!b.isConnected){ ph.remove(); return; } var fixed=b.classList.contains("mlb-fixed"), r=(fixed?ph:b).getBoundingClientRect(), sy=W.scrollY||(D.scrollingElement||D.documentElement).scrollTop||0;
    var want=sy>0 && r.top<0;
    if(want){ if(!fixed){ ph.style.height=b.offsetHeight+"px"; ph.style.display="block"; b.classList.add("mlb-fixed"); } var pr=ph.getBoundingClientRect(); b.style.left=pr.left+"px"; b.style.width=pr.width+"px"; ph.style.height=b.offsetHeight+"px"; }
    else if(fixed){ b.classList.remove("mlb-fixed"); b.style.left=""; b.style.width=""; ph.style.display="none"; } };
  W.addEventListener("scroll",pin,{passive:true}); W.addEventListener("resize",pin);
  renderChecklist();
  $("mlbBack").onclick=function(){ go("back"); };
  $("mlbNext").onclick=function(){ go("next"); };
  $("mlbList_t").onclick=function(){ var o=b.classList.toggle("open"); this.setAttribute("aria-expanded",o?"true":"false"); pin(); };
  $("mlbDone").onclick=function(){ setPart(L&&L.id,"practise","self"); log("result",{source:"self",pass:true}); cue("success"); msg("Marked as practised (self-reported)."); };
  $("mlbCoach").onclick=function(){ cue("in-lab"); };
  $("mlbVoice").onclick=function(){ var on=this.getAttribute("aria-pressed")!=="true"; try{ localStorage.setItem("anat-voice",on?"on":"off"); }catch(e){} this.setAttribute("aria-pressed",on?"true":"false"); this.textContent=on?"Voice on":"Voice off"; if(!on) stopNarration(); };
  [].forEach.call(b.querySelectorAll(".mlb-seg [data-i]"),function(x){ x.onclick=function(){
    var i=x.getAttribute("data-i"); try{ localStorage.removeItem("ml-voice-pick"); localStorage.setItem("kl-instructor",i); }catch(e){}
    [].forEach.call(b.querySelectorAll(".mlb-seg [data-i]"),function(y){ y.setAttribute("aria-pressed",y===x?"true":"false"); });
    var vb=$("mlbVoice"); if(vb && vb.getAttribute("aria-pressed")!=="true"){ vb.click(); }
    var N=narrator(); if(N){ N.pickVoice(); if(N.voiceNote) msg(N.voiceNote.replace(/<[^>]+>/g,"")); N.speak(i==="f"?"Hi, I'll be your instructor.":"G'day, I'll be your instructor."); } }; });
  $("mlbExit").onclick=function(){ stopNarration(); log("exit",{}); ssSet("ml-lesson-active",null);
    try{ ["from","ret","lid"].forEach(function(k){ Q.delete(k); }); var u=new URL(LOC.href); ["from","ret","lid"].forEach(function(k){ u.searchParams.delete(k); }); history.replaceState(history.state,"",u.pathname+u.search); }catch(e){}
    b.remove(); CTX=null; };
}
function msg(t){ var m=$("mlbMsg"); if(!m) return; m.textContent=t; m.hidden=!t; var b=$("mlLessonBar"); if(b && t) b.classList.add("open"); }
function cue(type){
  if(!LES || !LES.cues) return; var txt=LES.cues[type]; if(!txt) return;
  log("cue",{cue:type, id:"L"+LES.id+"."+type}); playCue(type, txt);
}
function go(where){
  stopNarration();
  var target;
  if(where==="back"){ target=CTX.ret; ssSet("ml-lesson-return",{route:CTX.ret, lid:CTX.lid, from:PAGE, kind:"back", at:Date.now()}); }
  else {
    var u=new URL(CTX.ret, LOC.href), hasCheck=true;
    if(hasCheck){ u.searchParams.delete("step"); u.searchParams.set("part","check"); target=u.pathname+u.search; }
    ssSet("ml-lesson-return",{route:target, lid:CTX.lid, from:PAGE, kind:"next", at:Date.now()});
  }
  log(where==="back"?"back-tap":"next-tap",{to:target});
  LOC.assign(target);
}
/* keep lesson context through the lab header (Study pill returns to the lesson) */
function carryContext(ev){
  if(!CTX) return; var a=ev.target && ev.target.closest && ev.target.closest("a[href]"); if(!a || a.closest("#mlLessonBar")) return;
  var h=a.getAttribute("href")||"";
  if(/Study-Lab-v[\d.]+\.html/.test(h) || a.id==="studySwap"){ a.setAttribute("href",CTX.ret); ssSet("ml-lesson-return",{route:CTX.ret, lid:CTX.lid, from:PAGE, kind:"back", at:Date.now()}); return; }
  if(/(Mode|Jam|Fret|Chord|Tab|Songwriter)-Lab-v[\d.]+\.html/.test(h) && !/[?&]from=study/.test(h)){
    var j=h.indexOf("?"), qq=new URLSearchParams(j>=0?h.slice(j+1):""); qq.set("from","study"); qq.set("ret",CTX.ret); if(CTX.lid) qq.set("lid",CTX.lid);
    a.setAttribute("href",(j>=0?h.slice(0,j):h)+"?"+qq.toString());
  }
}
function arrival(){
  var pend=ssGet("ml-lesson-pending");
  var fresh=pend && pend.lid===CTX.lid && (Date.now()-pend.at)<15*60*1000;
  setPart(CTX.lid,"practise","visited");
  ssSet("ml-lesson-active",{lid:CTX.lid, ret:CTX.ret, lab:PAGE, at:Date.now()});
  if(fresh){ ssSet("ml-lesson-pending",null); var bad=(W.__mlDeepLink||{}).bad||[]; cue(bad.length?"to-lab-fallback":"to-lab"); }
}
/* lab results feed the lesson.
   v1.91 (Dale, 14 Nov 2026): a playing check passes on ONE correct play, heard through the lab's own listening engine
   (Fret / Mode Test me YIN, Chord Test me chroma; Tab uses the same YIN detector below). Taps count only when there is no mic. */
function G(name){ try{ return (0,eval)('typeof '+name+'!=="undefined"?'+name+':undefined'); }catch(e){ return undefined; } }
var PLAY_LABS={fret:1,mode:1,chord:1,tab:1}, passed=false, micBlocked=false;
function micWatch(){ /* any lab's mic request: remember a refusal so the tap fallback can open */
  var md=navigator.mediaDevices;
  if(!md || !md.getUserMedia){ micBlocked=true; return; }
  if(md.getUserMedia.__mlKit) return;
  var orig=md.getUserMedia.bind(md), w=function(c){ return orig(c).then(function(st){ micBlocked=false; stripMsg(); return st; }, function(e){ micBlocked=true; stripMsg(); throw e; }); };
  w.__mlKit=true; w.__ml=md.getUserMedia.__ml; try{ md.getUserMedia=w; }catch(e){}
}
function playPass(source, detail){
  if(passed) return; passed=true;
  if(LES){ setPart(LES.id,"practise","verified",{source:source}); setPart(LES.id,"check","verified",{source:source}); renderChecklist(); }
  log("result",{source:source, pass:true, detail:detail||""});
  W.__mlPlayPass={source:source, detail:detail||"", at:Date.now()};
  stripSet(source==="mic"?"Passed: heard it on the mic. \u2713":"Passed: tapped it (no mic). \u2713", "ok");
  cue("success");
}
/* Fret: one correct Test me answer. The mic marks _fretHeardAt just before it scores. */
function fretWatch(){
  var orig=G("markAnswer"); if(typeof orig!=="function" || orig.__mlKit) return;
  var w=function(ok){ var q=G("currentQ")||W.currentQ, heard=(performance.now()-(W._fretHeardAt||-1e9))<400;
    var r=orig.apply(this,arguments);
    try{ if(ok && G("phase")==="test" && !passed){ var live=typeof W._fretMicLive==="function" && W._fretMicLive();
        var micGame=!!(q && {"staff-neck":1,"name-fret":1,"first-four":1,"semitone":1,"one-string":1,"flash":1,"scale-next":1,"intervals":1}[q.type]);
        if(heard) playPass("mic", q&&q.type);
        else if(!live || !micGame) playPass("tap", q&&q.type);
        else stripSet("Play it on your instrument: the mic is listening. Taps count only without a mic.", "ask"); } }catch(e){}
    return r; };
  w.__mlKit=true; W.markAnswer=w;
}
/* Mode: one complete Test me run (every note of the scale, in order). Mode Lab calls __mlModeNote as each note lands. */
function modeWatch(){
  if(W.__mlModeNote) return; var run={mic:0,tap:0};
  W.__mlModeNote=function(n){ try{ if(n.idx===0) run={mic:0,tap:0}; run[n.heard?"mic":"tap"]++;
    if(n.assess && !passed && n.len && n.idx===n.len-1){
      if(!run.tap) playPass("mic", n.len+" notes");
      else if(!n.micLive) playPass("tap", n.len+" notes");
      else stripSet("Play the run on your instrument: the mic is listening. Taps count only without a mic.", "ask"); } }catch(e){} };
}
/* Chord: Test me's own "Got it!" (mic chroma vs the grip's tones). Chord Lab calls __mlChordHeard. */
function chordWatch(){
  if(W.__mlChordHeard) return;
  W.__mlChordHeard=function(){ try{ var H=W.__chLesson; playPass("mic", H&&H.current()?H.current().name:""); }catch(e){} };
}
/* Tab: the same YIN detector as Mode/Fret (copied from Fret Lab's "Mode Lab pitch detector"), following the exercise note by note. */
function yinDetect(buffer, sampleRate, preferHz){
  var SIZE=buffer.length, rms=0, i, tau;
  for(i=0;i<SIZE;i++) rms+=buffer[i]*buffer[i];
  rms=Math.sqrt(rms/SIZE);
  if(rms<0.000028) return {hz:null,rms:rms,clarity:0};
  var minLag=Math.floor(sampleRate/1100), maxLag=Math.min(Math.floor(SIZE/2)-2, Math.floor(sampleRate/80)), half=Math.floor(SIZE/2);
  var d=new Float32Array(maxLag+2);
  for(tau=minLag;tau<=maxLag;tau++){ var sm=0; for(i=0;i<half;i++){ var df=buffer[i]-buffer[i+tau]; sm+=df*df; } d[tau]=sm; }
  var run=0, cm=new Float32Array(maxLag+2); cm[0]=1;
  for(tau=1;tau<=maxLag;tau++){ run+=d[tau]; cm[tau]=run? d[tau]*tau/run : 1; }
  function search(a,b,th){ a=Math.max(minLag,a); b=Math.min(maxLag,b);
    for(var t=a;t<=b;t++){ if(cm[t]<th){ var best=t; while(t+1<=b&&cm[t+1]<th){ t++; if(cm[t]<cm[best]) best=t; } return best; } }
    var best=a,bv=cm[a]; for(var t2=a+1;t2<=b;t2++) if(cm[t2]<bv){bv=cm[t2];best=t2;} return bv<0.42?best:-1; }
  var tauBest=-1;
  if(preferHz&&isFinite(preferHz)){ [1,0.5,2].some(function(mul){ var hz=preferHz*mul; if(hz<80||hz>1100) return false; tauBest=search(Math.floor(sampleRate/hz*0.94), Math.floor(sampleRate/hz*1.06), 0.22); return tauBest>0; }); }
  if(tauBest<0) tauBest=search(minLag,maxLag,0.15);
  if(tauBest<0) return {hz:null,rms:rms,clarity:0};
  for(var k=0;k<2;k++){ var hl=Math.round(tauBest/2); if(hl<minLag) break; var hb=-1, hv=1e9;
    for(var t3=hl-2;t3<=hl+2;t3++){ if(t3>=minLag && t3<=maxLag && cm[t3]<hv){ hv=cm[t3]; hb=t3; } }
    if(hb>0 && hv<Math.max(0.25, cm[tauBest]*1.5+0.05)) tauBest=hb; else break; }
  var y0=cm[tauBest-1]||cm[tauBest], y1=cm[tauBest], y2=cm[tauBest+1]||cm[tauBest], den=2*(y0-2*y1+y2), shift=den?(y0-y2)/den:0;
  var hz2=sampleRate/(tauBest+shift), clarity=Math.max(0,Math.min(1,1-y1));
  if(hz2<75||hz2>1200||!isFinite(hz2)) return {hz:null,rms:rms,clarity:0};
  return {hz:hz2,rms:rms,clarity:clarity};
}
var NOTE12=["C","C\u266f/D\u266d","D","D\u266f/E\u266d","E","F","F\u266f/G\u266d","G","G\u266f/A\u266d","A","A\u266f/B\u266d","B"];
function tabTargets(){ /* the loaded exercise, first 8 bars of the shown track: one step per sounding beat (a chord = any of its notes) */
  var api=G("api"), sc=api&&api.score; if(!sc) return [];
  var tr=(api.tracks&&api.tracks[0])||sc.tracks[0], st=tr&&tr.staves[0], out=[]; if(!st) return [];
  st.bars.slice(0,8).forEach(function(b,bi){ (b.voices[0]?b.voices[0].beats:[]).forEach(function(bt){ if(bt.isRest) return;
    var ns=bt.notes.filter(function(n){ return !n.isDead && !n.isTieDestination; }).map(function(n){ return {m:n.realValue, s:n.string, f:n.fret}; });
    if(ns.length) out.push({bar:bi+1, notes:ns}); }); });
  return out;
}
var TL=null; /* Tab listening state */
function tabListen(){
  if(TL&&TL.on){ tabStop("Stopped. Tap Start listening to try again."); return; }
  var seq=tabTargets(); if(!seq.length){ stripSet("Open the lesson exercise first, then start listening.","ask"); return; }
  TL={on:true, seq:seq, i:0, hold:0, release:null, rel:0, quiet:0};
  var md=navigator.mediaDevices; if(!md||!md.getUserMedia){ micBlocked=true; stripMsg(); TL.on=false; return; }
  md.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}}).then(function(stream){
    if(!TL||!TL.on){ stream.getTracks().forEach(function(t){ t.stop(); }); return; }
    var ctx=new (W.AudioContext||W.webkitAudioContext)(), src=ctx.createMediaStreamSource(stream), an=ctx.createAnalyser(), anF=ctx.createAnalyser();
    an.fftSize=2048; an.smoothingTimeConstant=0; src.connect(an);
    anF.fftSize=16384; anF.smoothingTimeConstant=0.5; src.connect(anF); /* chords: fine frequency bins, every chord note must sound */
    TL.ctx=ctx; TL.stream=stream; TL.an=an; TL.anF=anF; TL.buf=new Float32Array(an.fftSize); TL.fbuf=new Float32Array(anF.frequencyBinCount); tabProgress(); tabTick();
  }).catch(function(){ if(TL) TL.on=false; stripMsg(); });
  stripButtons();
}
function tabStop(t){ if(!TL) return; TL.on=false; try{ TL.stream&&TL.stream.getTracks().forEach(function(x){ x.stop(); }); }catch(e){} try{ TL.ctx&&TL.ctx.close(); }catch(e){} if(t) stripSet(t,"ask"); stripButtons(); }
function tabProgress(){ var s=TL.seq[TL.i]; if(!s) return; var n=s.notes;
  var names=n.map(function(x){ return NOTE12[((x.m%12)+12)%12].split("/")[0]; });
  stripSet("Listening\u2026 note "+(TL.i+1)+" of "+TL.seq.length+" (bar "+s.bar+": "+(n.length>1?"chord "+names.join(" "):names[0])+")", "ask"); }
function hzOf(m){ return 440*Math.pow(2,(m-69)/12); }
/* chord beat: every chord note's exact pitch (\u00b145 cents) must stand out in the spectrum at once */
function tabChordHeard(want){
  var an=TL.anF, fb=TL.fbuf, sr=TL.ctx.sampleRate, bw=sr/an.fftSize; an.getFloatFrequencyData(fb);
  var top=-Infinity, k; for(k=2;k<fb.length;k++) if(fb[k]>top) top=fb[k];
  if(!(top>-75)) return false;
  /* sound must be there now (the 2048-sample buffer), and the spectrum must be peaky: the long window still holds the edge of a note
     starting or stopping for a moment, and that edge spreads across every bin */
  var e=0, i; for(i=0;i<TL.buf.length;i++) e+=TL.buf[i]*TL.buf[i]; if(Math.sqrt(e/TL.buf.length)<0.00005) return false;
  var band=[], b0=Math.floor(60/bw), b1=Math.min(fb.length-1,Math.ceil(2000/bw)); for(i=b0;i<=b1;i++) band.push(fb[i]); band.sort(function(a,b){ return a-b; });
  var floor=band[Math.floor(band.length/2)];
  /* peak within +/-100c, interpolate the bin, then apply the +/-45c limit (FFT bins alone are too coarse) */
  return want.notes.every(function(x){ var f=hzOf(x.m), lo=Math.floor(f*Math.pow(2,-100/1200)/bw), hi=Math.ceil(f*Math.pow(2,100/1200)/bw), best=-Infinity, pk=-1, b;
    for(b=Math.max(1,lo);b<=hi&&b<fb.length;b++) if(fb[b]>best){ best=fb[b]; pk=b; }
    if(!(best>=top-20 && best>=floor+25) || pk<1 || pk+1>=fb.length) return false;
    var a=fb[pk-1], bb=fb[pk], c=fb[pk+1], den=a-2*bb+c, p=den?0.5*(a-c)/den:0, fp=(pk+p)*bw;
    return Math.abs(1200*Math.log2(fp/f))<45; });
}
function tabTick(){
  if(!TL||!TL.on||!TL.an) return;
  TL.an.getFloatTimeDomainData(TL.buf);
  var api=G("api"), playing=false; try{ playing=!!(api && (api.playerState===1)); }catch(e){}
  var want=TL.seq[TL.i];
  if(playing){ TL.hold=0; TL.raf=requestAnimationFrame(tabTick); return; }
  var advance=function(tag){ TL.hold=0; TL.release=tag; TL.rel=0; TL.i++; if(TL.i>=TL.seq.length){ tabStop(); playPass("mic", TL.seq.length+" notes"); return true; } tabProgress(); return false; };
  if(want.notes.length>1){ /* chord */
    var ok=tabChordHeard(want), tag="c"+want.notes.map(function(x){ return x.m; }).join(",");
    /* timed in ms, not frames, so a slow page counts the same: 150 ms of the full chord (a pick or strum transient lights every bin for a moment,
       and a short flicker while it rings doesn't reset it); the same chord again needs 80 ms of letting go first */
    var now=performance.now(), dt=Math.min(100, now-(TL.lastT||now)); TL.lastT=now;
    if(TL.release!=null){ if(TL.release===tag && ok){ TL.rel=0; } else if((TL.rel+=dt)>=80) TL.release=null; }
    if(TL.release==null){ if(ok){ if((TL.hold+=dt)>=150 && advance(tag)) return; } else TL.hold=Math.max(0,TL.hold-2*dt); }
  } else {
    var r=yinDetect(TL.buf, TL.ctx.sampleRate, hzOf(want.notes[0].m));
    if(r.hz && r.clarity>=0.9 && r.rms>=0.000035){
      var midi=Math.round(69+12*Math.log2(r.hz/440));
      if(TL.release!=null){ if(midi===TL.release) TL.rel=0; else TL.rel++; if(TL.rel>=6) TL.release=null; }
      if(TL.release==null){
        /* exact pitch, no octave fold (Dr. Music gate 4): the right note in the wrong octave doesn't count */
        /* the preferHz hint can snap a note a tone away (or the next note, if one is skipped) onto the expected one, or pull it an octave:
           an unhinted read must agree on the note, and it decides the octave (3D Lab fix + Dr. Music gate 4: exact pitch, no octave fold) */
        var hzx=r.hz, r0=yinDetect(TL.buf, TL.ctx.sampleRate);
        var okk=!!(r0&&r0.hz);
        if(r0.hz){ var c0=1200*Math.log2(r0.hz/r.hz), oc=Math.round(c0/1200); if(Math.abs(c0-oc*1200)>=45) okk=false; else hzx=r.hz*Math.pow(2,oc); }
        var c=1200*Math.log2(hzx/hzOf(want.notes[0].m)); okk=okk && Math.abs(c)<45;
        if(okk){ if(++TL.hold>=3 && advance(midi)) return; }
        else TL.hold=0;
      }
    } else { TL.hold=0; if(TL.release!=null && ++TL.rel>=6) TL.release=null; }
  }
  TL.raf=requestAnimationFrame(tabTick);
}
/* tap fallback (no mic): Chord = tap the chord's notes; Tab = tap the exercise's notes in order. A wrong tap just asks again. */
var TAP=null;
function tapStart(){
  if(PAGE==="chord"){ var H=W.__chLesson, c=H&&H.current(); if(!c) return; TAP={kind:"set", need:{}, got:{}, label:c.name};
    c.notes.forEach(function(n){ TAP.need[pcOfName(n)]=1; }); }
  else { var seq=tabTargets(); if(!seq.length){ stripSet("Open the lesson exercise first.","ask"); return; } TAP={kind:"seq", seq:seq, i:0}; }
  tapRender();
}
function pcOfName(n){ var b={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[String(n).charAt(0).toUpperCase()]||0, a=String(n).slice(1); return (b+(a.match(/#|\u266f/g)||[]).length*1-(a.match(/b|\u266d/g)||[]).length+(a.match(/x|\ud834\udd2a/g)||[]).length*2+120)%12; }
function tapRender(){
  var box=$("mlTapPad"); if(!box) return; box.hidden=false;
  var head=TAP.kind==="set" ? "Tap each note of "+TAP.label+" ("+Object.keys(TAP.got).length+" of "+Object.keys(TAP.need).length+")"
    : "Tap the notes in order: note "+(TAP.i+1)+" of "+TAP.seq.length+" (bar "+TAP.seq[TAP.i].bar+(TAP.seq[TAP.i].notes.length>1?", a chord: tap each of its notes":"")+")";
  box.innerHTML='<p class="mlb-tapq">'+esc(head)+'</p><div class="mlb-taps">'+NOTE12.map(function(n,i){ return '<button type="button" data-pc="'+i+'"'+(TAP.got&&TAP.got[i]?' aria-pressed="true"':'')+'>'+esc(n)+'</button>'; }).join("")+'</div>';
  [].forEach.call(box.querySelectorAll("button[data-pc]"),function(b){ b.onclick=function(){ tapPick(+b.getAttribute("data-pc"), b); }; });
}
function tapPick(pc,b){
  if(!TAP) return; var ok;
  if(TAP.kind==="set"){ ok=!!TAP.need[pc]; if(ok) TAP.got[pc]=1; }
  else { var st=TAP.seq[TAP.i], pcs={}; st.notes.forEach(function(x){ pcs[((x.m%12)+12)%12]=1; });
    ok=!!pcs[pc]; if(ok){ TAP.got=TAP.got||{}; TAP.got[pc]=1; if(Object.keys(pcs).every(function(k){ return TAP.got[k]; })){ TAP.i++; TAP.got={}; } } }
  if(!ok){ stripSet("Not that one. Try again.","bad"); b.classList.add("bad"); setTimeout(function(){ b.classList.remove("bad"); },500); return; }
  var done=TAP.kind==="set" ? Object.keys(TAP.got).length>=Object.keys(TAP.need).length : TAP.i>=TAP.seq.length;
  if(done){ var bx=$("mlTapPad"); if(bx) bx.hidden=true; TAP=null; playPass("tap"); return; }
  stripSet("Yes. Keep going.","ok"); tapRender();
}
/* the check strip under the lesson bar */
function stripHow(){ return {fret:"Check: tap Test me and play the answer once. The mic listens.", mode:"Check: tap Test me and play the run once. The mic listens.",
  chord:"Check: tap Test me and play the chord once. The mic listens.", tab:"Check: play the exercise once. Tap Start listening, then play."}[PAGE]||""; }
function stripSet(t,cls){ var el=$("mlbChk"); if(!el) return; el.textContent=t; el.className="mlb-chk "+(cls||""); }
function stripButtons(){ var a=$("mlbChkActs"); if(!a) return; var h="";
  if(PAGE==="tab" && !passed) h+='<button type="button" id="mlbListen">'+(TL&&TL.on?"Stop listening":"Start listening")+'</button>';
  if((PAGE==="tab"||PAGE==="chord") && micBlocked && !passed) h+='<button type="button" id="mlbTap">No mic? Tap the notes</button>';
  a.innerHTML=h; var l=$("mlbListen"); if(l) l.onclick=tabListen; var t=$("mlbTap"); if(t) t.onclick=tapStart; }
function stripMsg(){ if(passed) return; if(micBlocked) stripSet(PAGE==="fret"||PAGE==="mode" ? "No mic: tap the answer on the neck instead. That counts without a mic." : "No mic: tap the notes instead. That counts without a mic.", "ask"); stripButtons(); }
function checkStrip(){
  var b=$("mlLessonBar"); if(!b || $("mlbChkRow") || !PLAY_LABS[PAGE]) return;
  var row=D.createElement("div"); row.id="mlbChkRow"; row.className="mlb-chkrow";
  row.innerHTML='<p class="mlb-chk" id="mlbChk" role="status" aria-live="polite"></p><span class="mlb-chkacts" id="mlbChkActs"></span><div class="mlb-tappad" id="mlTapPad" hidden></div>';
  var pnl=$("mlbPanel"); b.insertBefore(row, pnl);
  var st=LES&&(prog().lessons[LES.id]||{}).check; if(st && st.status==="verified"){ passed=false; }
  stripSet(stripHow(),"ask"); stripButtons();
  var arm={fret:"btnTest",mode:"startBtn",chord:"testMeBtn"}[PAGE]; if(arm && Q.get("chk")){ var ab=$(arm); if(ab) ab.classList.add("ml-arm"); }
}
function playWatch(){
  if(!PLAY_LABS[PAGE]) return; micWatch();
  var tries=0, t=setInterval(function(){ tries++;
    try{ if(PAGE==="fret") fretWatch(); if(PAGE==="mode") modeWatch(); if(PAGE==="chord") chordWatch(); }catch(e){}
    if(tries>20) clearInterval(t); }, 500);
}
function result(r){
  if(!CTX && PAGE!=="study") return;
  log("result",r);
  if(LES){ if(r.pass) setPart(LES.id,"practise","verified",{correct:r.correct,total:r.total}); }
  cue(r.pass?"success":"retry");
}

/* ---------- public API (Study uses it to build links and hand over cues) ---------- */
W.MLLesson={ page:PAGE, ctx:function(){ return CTX; }, base:base, studyRoute:studyRoute, labURL:labURL, validRet:validRet, manifest:manifest,
  log:log, prog:prog, setPart:setPart, parts:parts, state:state, applied:function(){ return applied; }, verify:verify, result:result,
  narrator:narrator, playPass:function(){ return W.__mlPlayPass||null; }, ssGet:ssGet, ssSet:ssSet, expectFor:expectFor, DL_KEYS:DL_KEYS };

function boot(){
  if(PAGE!=="study" && PAGE!=="other"){
    D.addEventListener("pointerdown",carryContext,true); D.addEventListener("click",carryContext,true);
    if(CTX){ manifest().then(function(M){ LES=(CTX.lid && M.byId[CTX.lid])||null; bar(LES); renderChecklist(); checkStrip(); }).catch(function(){ bar(null); });
      playWatch(); W.addEventListener("pagehide",function(){ stopNarration(); try{ tabStop(); }catch(e){} }); }
    var start=function(){ setTimeout(bootParams, 450); };
    if(D.readyState==="complete") start(); else W.addEventListener("load", start);
  }
}
if(D.readyState==="loading") D.addEventListener("DOMContentLoaded", boot); else boot();
})();
