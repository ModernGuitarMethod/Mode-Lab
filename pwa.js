/* ModeLab app shell: install + share screen, service worker, automatic updates, persistent storage.
   Progress and settings live in this browser's localStorage and are never cleared here. */
(function(){
  "use strict";
  var SITE="https://modelab.app";
  var SHARE_TEXT="Share to 5 of your friends. ModeLab is free. It does not store any of your data or track you. We\u2019re just trying to share the love of music.";
  var SAY="Add Mode Lab to your Home Screen so your practice stays on this iPad.";
  var standalone=false;
  try{ standalone=(matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true; }catch(e){}
  function ls(k,v){ try{ if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k,v); }catch(e){ return null; } }
  function ss(k,v){ try{ if(v===undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k,v); }catch(e){ return null; } }
  if(standalone) ls("modelab.installed","1");

  /* ---------- keep saved progress: ask the browser not to evict this site's storage ---------- */
  try{ if(navigator.storage&&navigator.storage.persist) navigator.storage.persisted().then(function(p){ if(!p) navigator.storage.persist().catch(function(){}); }).catch(function(){}); }catch(e){}

  /* ---------- always the newest build ---------- */
  var m=location.pathname.match(/\/(Study|Mode|Fret|Jam|Chord|Tab|Songwriter|Know)-Lab-v(\d+\.\d+)(\.html)?$/);
  function checkVersion(){
    if(!m) return;
    fetch("version.json?t="+Date.now(),{cache:"no-store"}).then(function(r){ return r.ok?r.json():null; }).then(function(j){
      if(!j||!j.version||j.version===m[2]) return;
      var target=m[1]+"-Lab-v"+j.version+".html";
      if(ss("ml-vjump")===target) return;                 /* never loop */
      ss("ml-vjump",target);
      location.replace(target+location.search+location.hash);
    }).catch(function(){});
  }
  if("serviceWorker" in navigator && location.protocol!=="file:"){
    var reloaded=false;
    navigator.serviceWorker.register("sw.js",{scope:"./",updateViaCache:"none"}).then(function(reg){
      function upd(){ try{ reg.update().catch(function(){}); }catch(e){} }
      upd(); document.addEventListener("visibilitychange",function(){ if(!document.hidden){ upd(); checkVersion(); } });
    }).catch(function(){});
    var hadController=!!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange",function(){
      if(!hadController){ hadController=true; return; }      /* first install: nothing to refresh */
      if(reloaded) return; var last=+ss("ml-swreload")||0; if(Date.now()-last<15000) return;
      reloaded=true; ss("ml-swreload",String(Date.now())); location.reload();
    });
  }
  checkVersion();

  /* ---------- install + share screen ---------- */
  var deferred=null;
  window.addEventListener("beforeinstallprompt",function(e){ e.preventDefault(); deferred=e; var b=document.getElementById("mlxInstall"); if(b){ b.hidden=false; var s=document.getElementById("mlxSteps"); if(s) s.hidden=true; } });
  window.addEventListener("appinstalled",function(){ ls("modelab.installed","1"); close(); });
  var ua=navigator.userAgent||"";
  var iOS=/iPad|iPhone|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1);
  var device=/iPad/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1)?"iPad":/iPhone|iPod/.test(ua)?"iPhone":"device";
  var CSS='\
#mlx{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:max(14px,env(safe-area-inset-top)) 14px max(14px,env(safe-area-inset-bottom));background:rgba(0,0,0,.62);-webkit-backdrop-filter:blur(10px) saturate(1.1);backdrop-filter:blur(10px) saturate(1.1);opacity:0;transition:opacity .28s ease;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Helvetica,Arial,sans-serif}\
#mlx.in{opacity:1}\
#mlx [hidden]{display:none!important}\
#mlx.lt .by img{filter:brightness(0) saturate(100%);opacity:.85}\
@media (min-width:700px){#mlx .c{width:min(520px,100%);padding:26px 26px 22px}#mlx .wm{font-size:34px}}\
#mlx .c{position:relative;width:min(460px,100%);max-height:calc(100dvh - 28px);overflow:auto;-webkit-overflow-scrolling:touch;background:linear-gradient(180deg,#17150f 0%,#0d0c0a 100%);color:#f4efe4;border:1px solid rgba(212,160,23,.45);border-radius:22px;padding:22px 20px 18px;box-shadow:0 30px 80px rgba(0,0,0,.55),0 2px 0 rgba(255,255,255,.04) inset;transform:translateY(18px) scale(.97);transition:transform .38s cubic-bezier(.2,.9,.25,1.15)}\
#mlx.in .c{transform:none}\
#mlx .x{position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:inherit;font-size:18px;line-height:1;cursor:pointer}\
#mlx .hd{display:flex;align-items:center;gap:14px;margin:0 0 12px}\
#mlx .ic{width:64px;height:64px;border-radius:15px;box-shadow:0 8px 22px rgba(0,0,0,.45),0 0 0 1px rgba(212,160,23,.35);flex:0 0 auto;background:#000}\
#mlx .wm{font-family:"Arial Black","Helvetica Neue Black",Impact,Arial,sans-serif;font-weight:900;letter-spacing:-.055em;font-size:30px;line-height:.95;text-transform:uppercase;-webkit-text-stroke:1px currentColor;paint-order:stroke fill;white-space:nowrap}\
#mlx .wm .m{color:#22c55e}#mlx .wm .l{color:#fff}\
#mlx .by{display:flex;align-items:center;gap:6px;margin-top:5px;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#d4a017;font-weight:700}\
#mlx .by img{height:16px;width:auto}\
#mlx h2{margin:4px 0 6px;font-size:19px;line-height:1.25;font-weight:800;color:#fff}\
#mlx p{margin:0 0 12px;font-size:15px;line-height:1.5;color:#d9d1c1}\
#mlx .steps{margin:0 0 14px;padding:12px 14px 12px 34px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:14px;font-size:14.5px;line-height:1.5;color:#e9e2d4}\
#mlx .steps li{margin:3px 0}\
#mlx .sh{display:inline-block;vertical-align:-3px;width:16px;height:16px}\
#mlx .b{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:48px;border-radius:999px;border:1px solid #d4a017;background:linear-gradient(180deg,#e2b12a,#c99512);color:#16120a;font-weight:800;font-size:16px;cursor:pointer;box-shadow:0 6px 18px rgba(212,160,23,.28);transition:transform .12s ease,box-shadow .12s ease,filter .12s ease;text-decoration:none}\
#mlx .b:active{transform:scale(.97);box-shadow:0 2px 8px rgba(212,160,23,.25)}\
#mlx .b.g{background:transparent;color:#f4efe4;border-color:rgba(255,255,255,.22);box-shadow:none;font-weight:700}\
#mlx .sep{height:1px;background:linear-gradient(90deg,transparent,rgba(212,160,23,.5),transparent);margin:16px 0 14px}\
#mlx .love{font-size:15px;color:#f4efe4}\
#mlx .row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0 4px}\
#mlx .p{display:flex;align-items:center;justify-content:center;min-height:40px;padding:0 8px;border-radius:999px;border:1px solid rgba(212,160,23,.55);background:rgba(212,160,23,.08);color:#f1d27a;font-weight:700;font-size:13px;text-decoration:none;cursor:pointer;transition:transform .12s ease,background .12s ease;white-space:nowrap}\
#mlx .p:active{transform:scale(.95);background:rgba(212,160,23,.2)}\
#mlx .ok{min-height:18px;margin:6px 0 0;text-align:center;font-size:13px;color:#22c55e;font-weight:700}\
#mlx .ft{margin-top:12px}\
#mlx :focus-visible{outline:2px solid #d4a017;outline-offset:2px}\
#mlx.lt{background:rgba(40,32,20,.35)}\
#mlx.lt .c{background:linear-gradient(180deg,#fffdf8 0%,#f6f0e3 100%);color:#2a2118;border-color:rgba(176,128,10,.45);box-shadow:0 30px 70px rgba(60,40,10,.25)}\
#mlx.lt h2,#mlx.lt .love{color:#1c1812}#mlx.lt p{color:#4a3f2e}#mlx.lt .wm .l{color:#1c1812}\
#mlx.lt .steps{background:rgba(0,0,0,.035);border-color:rgba(0,0,0,.1);color:#2a2118}\
#mlx.lt .x{background:rgba(0,0,0,.05);border-color:rgba(0,0,0,.12)}\
#mlx.lt .b.g{color:#2a2118;border-color:rgba(0,0,0,.2)}\
#mlx.lt .p{color:#7a5806;background:rgba(212,160,23,.1);border-color:rgba(176,128,10,.5)}\
#mlx.lt .ok{color:#15803d}\
@media (max-width:380px){#mlx .row{grid-template-columns:repeat(2,1fr)}#mlx .wm{font-size:26px}}\
@media (prefers-reduced-motion:reduce){#mlx,#mlx .c,#mlx .b,#mlx .p{transition:none!important}#mlx .c{transform:none}}';
  var SHARE_SVG='<svg class="sh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
  function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;"); }
  function light(){ return document.body.classList.contains("light")||document.documentElement.getAttribute("data-theme")==="light"; }
  var box=null;
  function close(){ if(!box) return; var b=box; box=null; b.classList.remove("in"); setTimeout(function(){ if(b.parentNode) b.parentNode.removeChild(b); },300); document.removeEventListener("keydown",onKey,true); }
  function onKey(e){ if(e.key==="Escape"){ ss("ml-pwa-later","1"); close(); } }
  function speak(){ try{ if(!window.speechSynthesis) return; if(navigator.userActivation&&!navigator.userActivation.hasBeenActive) return; var u=new SpeechSynthesisUtterance(SAY); u.lang="en-AU"; speechSynthesis.speak(u); }catch(e){} }
  function open(force){
    if(box) return;
    if(!force&&(standalone||ls("modelab.installed")==="1"||ss("ml-pwa-later")==="1")) return;
    if(!document.getElementById("mlxCss")){ var st=document.createElement("style"); st.id="mlxCss"; st.textContent=CSS; document.head.appendChild(st); }
    var dale=document.querySelector(".logo-dale-full"); var daleSrc=dale&&dale.getAttribute("src");
    var enc=encodeURIComponent, msg=SHARE_TEXT+" "+SITE;
    box=document.createElement("div"); box.id="mlx"; box.setAttribute("role","dialog"); box.setAttribute("aria-modal","true"); box.setAttribute("aria-labelledby","mlxT");
    if(light()) box.classList.add("lt");
    var install=standalone?'':'<h2 id="mlxT">Add ModeLab to your Home Screen</h2><p>'+esc(device==="device"?SAY.replace("this iPad","this device"):SAY.replace("this iPad","this "+device))+'</p>'+
      '<button class="b" id="mlxInstall" type="button"'+(deferred?'':' hidden')+'>Install ModeLab</button>'+
      '<ol class="steps" id="mlxSteps"'+(deferred?' hidden':'')+'>'+(iOS?
        '<li>Tap the <b>Share</b> button '+SHARE_SVG+' in Safari.</li><li>Scroll and tap <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>. ModeLab appears on your Home Screen.</li>':
        '<li>Open your browser menu (\u22ee or \u2026).</li><li>Choose <b>Install app</b> or <b>Add to Home screen</b>.</li><li>Open ModeLab from your Home Screen or app list.</li>')+'</ol>';
    box.innerHTML='<div class="c"><button class="x" type="button" aria-label="Close" id="mlxX">\u2715</button>'+
      '<div class="hd"><img class="ic" src="icon-192.png" alt="" width="64" height="64"><div><div class="wm" aria-label="Mode Lab"><span class="m">MODE</span><span class="l">LAB</span></div>'+
      '<div class="by">'+(daleSrc?'<img src="'+esc(daleSrc).replace(/"/g,"&quot;")+'" alt="Dale Taylor">':'Dale Taylor')+'</div></div></div>'+
      install+(standalone?'':'<div class="sep"></div>')+
      '<p class="love" id="mlxShareText">'+esc(SHARE_TEXT)+'</p>'+
      '<button class="b" id="mlxShare" type="button">'+SHARE_SVG+' Share ModeLab</button>'+
      '<div class="row">'+
        '<a class="p" href="sms:?&body='+enc(msg)+'" target="_blank" rel="noopener">Messages</a>'+
        '<a class="p" href="https://wa.me/?text='+enc(msg)+'" target="_blank" rel="noopener">WhatsApp</a>'+
        '<a class="p" href="https://www.facebook.com/sharer/sharer.php?u='+enc(SITE)+'" target="_blank" rel="noopener">Facebook</a>'+
        '<a class="p" href="https://twitter.com/intent/tweet?text='+enc(SHARE_TEXT)+'&url='+enc(SITE)+'" target="_blank" rel="noopener">X</a>'+
        '<a class="p" href="mailto:?subject='+enc("ModeLab")+'&body='+enc(msg)+'" target="_blank" rel="noopener">Email</a>'+
        '<button class="p" type="button" id="mlxCopy">Copy link</button>'+
      '</div><div class="ok" id="mlxOk" aria-live="polite"></div>'+
      '<div class="ft"><button class="b g" type="button" id="mlxLater">'+(standalone?'Close':'Continue in browser')+'</button></div></div>';
    document.body.appendChild(box);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ if(box) box.classList.add("in"); }); });
    var later=function(){ ss("ml-pwa-later","1"); close(); };
    box.addEventListener("click",function(e){ if(e.target===box) later(); });
    document.getElementById("mlxX").onclick=later; document.getElementById("mlxLater").onclick=later;
    document.addEventListener("keydown",onKey,true);
    var ib=document.getElementById("mlxInstall"); if(ib) ib.onclick=function(){ if(!deferred) return; deferred.prompt(); deferred.userChoice.then(function(c){ if(c&&c.outcome==="accepted"){ ls("modelab.installed","1"); close(); } deferred=null; }).catch(function(){}); };
    var ok=document.getElementById("mlxOk");
    function copy(){ var done=function(){ ok.textContent="Link copied"; setTimeout(function(){ if(ok) ok.textContent=""; },2500); };
      try{ if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(SITE).then(done,function(){ fallback(); done(); }); return; } }catch(e){}
      fallback(); done(); }
    function fallback(){ try{ var t=document.createElement("textarea"); t.value=SITE; t.setAttribute("readonly",""); t.style.position="fixed"; t.style.opacity="0"; document.body.appendChild(t); t.select(); document.execCommand("copy"); document.body.removeChild(t); }catch(e){} }
    document.getElementById("mlxCopy").onclick=copy;
    document.getElementById("mlxShare").onclick=function(){ if(navigator.share){ navigator.share({title:"ModeLab",text:SHARE_TEXT,url:SITE}).catch(function(){}); } else copy(); };
    speak();
    var f=box.querySelector(ib&&!ib.hidden?"#mlxInstall":"#mlxShare"); try{ f.focus({preventScroll:true}); }catch(e){}
  }
  window.ModeLabShare=function(){ open(true); };
  function ready(fn){ if(document.readyState==="complete") fn(); else window.addEventListener("load",fn); }
  ready(function(){ setTimeout(function(){ open(false); },700); });
})();
