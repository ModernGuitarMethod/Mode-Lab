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
  window.addEventListener("beforeinstallprompt",function(e){ e.preventDefault(); deferred=e; });
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
#mlx .b.big{min-height:56px;font-size:17.5px}#mlx .b.big .sh{width:20px;height:20px}\
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
  function speak(){ try{ if(!window.speechSynthesis) return; if(navigator.userActivation&&!navigator.userActivation.hasBeenActive) return; var u=new SpeechSynthesisUtterance(SAY); u.lang="en-AU"; var vs=speechSynthesis.getVoices().filter(function(v){ return /^en[-_]AU/i.test(v.lang); }); var R=[/Matilda.*(Premium|Enhanced)/i,/Matilda/i,/Natasha.*(Natural|Online)/i,/^Google/i,/Karen/i,/Catherine/i]; for(var i=0;i<R.length;i++){ var f=vs.filter(function(v){ return R[i].test(v.name); })[0]; if(f){ u.voice=f; break; } } u.pitch=1.05; speechSynthesis.speak(u); }catch(e){} }
  function open(force){
    if(box) return;
    if(!force&&(standalone||ls("modelab.installed")==="1"||ss("ml-pwa-later")==="1")) return;
    if(!document.getElementById("mlxCss")){ var st=document.createElement("style"); st.id="mlxCss"; st.textContent=CSS; document.head.appendChild(st); }
    var dale=document.querySelector(".logo-dale-full"); var daleSrc=dale&&dale.getAttribute("src");
    var enc=encodeURIComponent, msg=SHARE_TEXT+" "+SITE;
    box=document.createElement("div"); box.id="mlx"; box.setAttribute("role","dialog"); box.setAttribute("aria-modal","true"); box.setAttribute("aria-labelledby","mlxT");
    if(light()) box.classList.add("lt");
    var install=(standalone||ls("modelab.installed")==="1")?'':'<h2 id="mlxT">Add ModeLab to your Home Screen</h2><p>'+esc(device==="device"?SAY.replace("this iPad","this device"):SAY.replace("this iPad","this "+device))+'</p>'+
      '<button class="b big" id="mlxAdd" type="button"><svg class="sh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg> Add to Home Screen</button>';
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
    var ib=document.getElementById("mlxAdd"); if(ib) ib.onclick=function(){ if(deferred){ var d=deferred; d.prompt(); d.userChoice.then(function(c){ if(c&&c.outcome==="accepted"){ ls("modelab.installed","1"); close(); } }).catch(function(){}); deferred=null; return; } guide(); };
    var ok=document.getElementById("mlxOk");
    function copy(){ var done=function(){ ok.textContent="Link copied"; setTimeout(function(){ if(ok) ok.textContent=""; },2500); };
      try{ if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(SITE).then(done,function(){ fallback(); done(); }); return; } }catch(e){}
      fallback(); done(); }
    function fallback(){ try{ var t=document.createElement("textarea"); t.value=SITE; t.setAttribute("readonly",""); t.style.position="fixed"; t.style.opacity="0"; document.body.appendChild(t); t.select(); document.execCommand("copy"); document.body.removeChild(t); }catch(e){} }
    document.getElementById("mlxCopy").onclick=copy;
    document.getElementById("mlxShare").onclick=function(){ if(navigator.share){ navigator.share({title:"ModeLab",text:SHARE_TEXT,url:SITE}).catch(function(){}); } else copy(); };
    speak();
    var f=box.querySelector(ib?"#mlxAdd":"#mlxShare"); try{ f.focus({preventScroll:true}); }catch(e){}
  }

  /* ---------- guided Add to Home Screen walkthrough ---------- */
  var iosVer=(function(){ var m=ua.match(/OS (\d+)_(\d+)/); return m?(+m[1])+(+m[2])/100:(iOS?17:0); })();
  var iosBrowser=/CriOS/.test(ua)?"chrome":/FxiOS/.test(ua)?"firefox":/EdgiOS/.test(ua)?"edge":/OPiOS|OPT\//.test(ua)?"opera":"safari";
  var isAndroid=/Android/.test(ua), isEdge=/Edg\//.test(ua), isFirefox=/Firefox\//.test(ua)&&!/Seamonkey/.test(ua), isSamsung=/SamsungBrowser/.test(ua);
  var isMacSafari=!iOS&&/Macintosh/.test(ua)&&/Safari\//.test(ua)&&!/Chrome|Chromium|Edg\//.test(ua);
  var PLUS='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
  var DOTS3='<b class="kb">\u22ee</b>', DOTSH='<b class="kb">\u2026</b>';
  function sheetMock(hi){ return '<div class="mock sheet"><div class="mrow"><span class="mi">\u2398</span>Copy</div><div class="mrow"><span class="mi">\u2606</span>Add to Favourites</div><div class="mrow hi"><span class="mi">'+PLUS+'</span>Add to Home Screen</div><div class="mrow"><span class="mi">\u270e</span>Markup</div></div>'; }
  function addMock(){ return '<div class="mock addbar"><span>Cancel</span><b>Add to Home Screen</b><span class="addbtn">Add</span></div><div class="mock appcard"><img src="icon-192.png" alt="" width="44" height="44"><div><b>ModeLab</b><small>modelab.app</small></div></div>'; }
  function steps(){
    var shareIco='<span class="kb">'+SHARE_SVG+'</span>';
    if(iOS){
      var where=device==="iPad"?"at the top right of the Safari toolbar":"in the bar at the bottom of Safari";
      if(iosBrowser==="safari") return {arrow:device==="iPad"?"tr":"bc",list:[
        {t:"Tap the Share button",d:"It\u2019s the square with an arrow "+shareIco+" "+where+". If you can\u2019t see the bar, scroll up a little, or tap \u2026 first.",m:'<div class="mock big-ico">'+SHARE_SVG+'</div>'},
        {t:"Scroll and tap Add to Home Screen",d:"Scroll down the share sheet and tap <b>Add to Home Screen</b>, the row with the "+PLUS.replace('width="22" height="22"','width="16" height="16" class="inl"')+" icon.",m:sheetMock()},
        {t:"Tap Add",d:"Tap <b>Add</b> at the top right. ModeLab appears on your Home Screen. Open it from there from now on.",m:addMock()}]};
      if(iosVer>=16.4&&iosBrowser==="chrome") return {arrow:"tr",list:[
        {t:"Tap the Share button",d:"In Chrome, tap Share "+shareIco+" at the top right, next to the address bar.",m:'<div class="mock big-ico">'+SHARE_SVG+'</div>'},
        {t:"Tap Add to Home Screen",d:"Scroll the list and tap <b>Add to Home Screen</b>.",m:sheetMock()},
        {t:"Tap Add",d:"Tap <b>Add</b>. ModeLab appears on your Home Screen.",m:addMock()}]};
      if(iosVer>=16.4&&(iosBrowser==="firefox"||iosBrowser==="edge")) return {arrow:"bc",list:[
        {t:"Open the menu",d:"Tap the menu button ("+(iosBrowser==="firefox"?"\u2261":DOTSH)+") at the bottom, then tap <b>Share</b> "+shareIco+".",m:'<div class="mock big-ico">'+SHARE_SVG+'</div>'},
        {t:"Tap Add to Home Screen",d:"Scroll the share sheet and tap <b>Add to Home Screen</b>.",m:sheetMock()},
        {t:"Tap Add",d:"Tap <b>Add</b>. ModeLab appears on your Home Screen.",m:addMock()}]};
      return {arrow:null,safari:true,list:[
        {t:"Open ModeLab in Safari",d:"This browser can\u2019t add apps to your Home Screen. Copy the link, open <b>Safari</b>, paste it into the address bar, then tap <b>Add to Home Screen</b> again.",m:'<button class="b g" type="button" id="mlxGCopy">Copy link</button><div class="ok" id="mlxGOk" aria-live="polite"></div>'}]};
    }
    if(isAndroid) return {arrow:"tr",list:[
      {t:"Open the browser menu",d:"Tap "+(isSamsung?"the menu \u2261 at the bottom":DOTS3+" at the top right")+".",m:'<div class="mock big-ico kb2">'+(isSamsung?"\u2261":"\u22ee")+'</div>'},
      {t:"Tap Install app",d:"Tap <b>Install app</b> or <b>Add to Home screen</b>.",m:'<div class="mock sheet"><div class="mrow">New tab</div><div class="mrow">Bookmarks</div><div class="mrow hi"><span class="mi">'+PLUS+'</span>Add to Home screen</div><div class="mrow">Settings</div></div>'},
      {t:"Tap Install",d:"Confirm with <b>Install</b> or <b>Add</b>. ModeLab appears on your Home Screen.",m:addMock()}]};
    if(isMacSafari) return {arrow:"tr",list:[
      {t:"Open the File menu",d:"In Safari\u2019s menu bar, choose <b>File</b>, or tap Share "+shareIco+" in the toolbar.",m:'<div class="mock big-ico">'+SHARE_SVG+'</div>'},
      {t:"Choose Add to Dock",d:"Choose <b>Add to Dock\u2026</b>.",m:'<div class="mock sheet"><div class="mrow">New Window</div><div class="mrow hi"><span class="mi">'+PLUS+'</span>Add to Dock\u2026</div><div class="mrow">Share</div></div>'},
      {t:"Click Add",d:"Click <b>Add</b>. ModeLab opens from your Dock like an app.",m:addMock()}]};
    return {arrow:"tr",list:[
      {t:"Open the browser menu",d:"Click "+(isEdge?DOTSH:DOTS3)+" at the top right of "+(isEdge?"Edge":isFirefox?"Firefox":"Chrome")+". In Chrome you can also click the install icon in the address bar.",m:'<div class="mock big-ico kb2">'+(isEdge?"\u2026":"\u22ee")+'</div>'},
      {t:isEdge?"Apps \u203a Install this site as an app":"Install ModeLab",d:isEdge?"Choose <b>Apps</b>, then <b>Install this site as an app</b>.":isFirefox?"Firefox on desktop can\u2019t install apps yet. Use Chrome or Edge, or bookmark ModeLab.":"Choose <b>Cast, save and share</b> \u203a <b>Install page as app</b>, or <b>Install ModeLab</b>.",m:'<div class="mock sheet"><div class="mrow">New tab</div><div class="mrow hi"><span class="mi">'+PLUS+'</span>Install ModeLab\u2026</div><div class="mrow">Settings</div></div>'},
      {t:"Click Install",d:"Click <b>Install</b>. ModeLab opens in its own window and from your apps.",m:addMock()}]};
  }
  var GCSS='\
#mlxg{position:fixed;inset:0;z-index:100002;display:flex;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top)) 16px max(16px,env(safe-area-inset-bottom));background:rgba(0,0,0,.66);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);opacity:0;transition:opacity .25s ease;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Helvetica,Arial,sans-serif}\
#mlxg.in{opacity:1}\
#mlxg .gc{width:min(440px,100%);max-height:calc(100dvh - 120px);overflow:auto;background:linear-gradient(180deg,#17150f,#0d0c0a);color:#f4efe4;border:1px solid rgba(212,160,23,.5);border-radius:22px;padding:20px;box-shadow:0 30px 80px rgba(0,0,0,.6);transform:translateY(14px);transition:transform .35s cubic-bezier(.2,.9,.25,1.15)}\
#mlxg.in .gc{transform:none}\
#mlxg .kick{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#d4a017;font-weight:800;margin-bottom:6px}\
#mlxg h3{margin:0 0 8px;font-size:20px;line-height:1.25;color:#fff}\
#mlxg p{margin:0 0 14px;font-size:15.5px;line-height:1.5;color:#ddd5c5}\
#mlxg .kb{display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:26px;padding:0 5px;border-radius:7px;border:1px solid rgba(212,160,23,.6);color:#f1d27a;vertical-align:-7px;font-weight:800}\
#mlxg .kb .sh{width:16px;height:16px}\
#mlxg .inl{vertical-align:-3px}\
#mlxg .mock{margin:0 0 14px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12)}\
#mlxg .big-ico{display:flex;align-items:center;justify-content:center;height:96px;color:#0a84ff;font-size:44px;font-weight:900}\
#mlxg .big-ico .sh{width:46px;height:46px;animation:mlxPulse 1.6s ease-in-out infinite}\
#mlxg .kb2{color:#f1d27a}\
#mlxg .sheet{padding:4px 0}\
#mlxg .mrow{display:flex;align-items:center;gap:12px;padding:11px 14px;font-size:15px;border-top:1px solid rgba(255,255,255,.07);color:#e9e2d4}\
#mlxg .mrow:first-child{border-top:0}\
#mlxg .mi{display:inline-flex;width:24px;justify-content:center;opacity:.85}\
#mlxg .mrow.hi{background:rgba(212,160,23,.16);color:#fff;font-weight:700;box-shadow:inset 3px 0 0 #d4a017;animation:mlxGlow 1.8s ease-in-out infinite}\
#mlxg .addbar{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;font-size:14px;color:#cfc6b4;margin-bottom:8px}\
#mlxg .addbar b{color:#fff}\
#mlxg .addbtn{color:#0a84ff;font-weight:800;padding:4px 10px;border-radius:999px;box-shadow:0 0 0 2px #d4a017;animation:mlxGlow 1.8s ease-in-out infinite}\
#mlxg .appcard{display:flex;align-items:center;gap:12px;padding:12px 14px}\
#mlxg .appcard img{border-radius:10px}\
#mlxg .appcard small{display:block;color:#a99f8c;font-size:12px}\
#mlxg .dots{display:flex;gap:7px;justify-content:center;margin:2px 0 14px}\
#mlxg .dots i{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.22);transition:all .2s}\
#mlxg .dots i.on{width:22px;border-radius:999px;background:#d4a017}\
#mlxg .nav{display:flex;gap:10px}\
#mlxg .nav .b{flex:1}\
#mlxg .b{display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;border-radius:999px;border:1px solid #d4a017;background:linear-gradient(180deg,#e2b12a,#c99512);color:#16120a;font-weight:800;font-size:16px;cursor:pointer;width:100%;transition:transform .12s ease}\
#mlxg .b:active{transform:scale(.97)}\
#mlxg .b.g{background:transparent;color:#f4efe4;border-color:rgba(255,255,255,.22);font-weight:700}\
#mlxg .b[disabled]{opacity:.35}\
#mlxg .ok{min-height:18px;margin:-6px 0 10px;text-align:center;font-size:13px;color:#22c55e;font-weight:700}\
#mlxg .arrow{position:fixed;width:64px;height:64px;color:#d4a017;filter:drop-shadow(0 4px 12px rgba(0,0,0,.6));pointer-events:none}\
#mlxg .arrow.bc{left:50%;bottom:max(8px,env(safe-area-inset-bottom));margin-left:-32px;animation:mlxDown 1.1s ease-in-out infinite}\
#mlxg .arrow.tr{right:18px;top:max(6px,env(safe-area-inset-top));transform:rotate(180deg);animation:mlxUp 1.1s ease-in-out infinite}\
#mlxg .x{position:absolute;top:12px;right:12px}\
#mlxg :focus-visible{outline:2px solid #d4a017;outline-offset:2px}\
@keyframes mlxDown{0%,100%{transform:translateY(-6px)}50%{transform:translateY(6px)}}\
@keyframes mlxUp{0%,100%{transform:rotate(180deg) translateY(-6px)}50%{transform:rotate(180deg) translateY(6px)}}\
@keyframes mlxPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}\
@keyframes mlxGlow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.25)}}\
#mlxg.lt{background:rgba(40,32,20,.4)}\
#mlxg.lt .gc{background:linear-gradient(180deg,#fffdf8,#f6f0e3);color:#2a2118;border-color:rgba(176,128,10,.5)}\
#mlxg.lt h3{color:#1c1812}#mlxg.lt p{color:#4a3f2e}\
#mlxg.lt .mock{background:#fff;border-color:rgba(0,0,0,.1)}#mlxg.lt .mrow{color:#2a2118;border-color:rgba(0,0,0,.07)}#mlxg.lt .mrow.hi{background:rgba(212,160,23,.18);color:#1c1812}\
#mlxg.lt .addbar,#mlxg.lt .addbar b{color:#2a2118}#mlxg.lt .kb{color:#7a5806;border-color:rgba(176,128,10,.6)}\
#mlxg.lt .dots i{background:rgba(0,0,0,.15)}#mlxg.lt .dots i.on{background:#d4a017}#mlxg.lt .b.g{color:#2a2118;border-color:rgba(0,0,0,.2)}\
@media (prefers-reduced-motion:reduce){#mlxg,#mlxg .gc{transition:none!important}#mlxg *{animation:none!important}#mlxg .arrow.tr{transform:rotate(180deg)}}';
  var ARROW='<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 6v40" stroke="currentColor" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M14 32l18 20 18-20" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
  var g=null;
  function guide(startAt){
    if(!document.getElementById("mlxgCss")){ var st=document.createElement("style"); st.id="mlxgCss"; st.textContent=GCSS; document.head.appendChild(st); }
    var S=steps(), i=startAt||0, n=S.list.length;
    if(g&&g.parentNode) g.parentNode.removeChild(g);
    g=document.createElement("div"); g.id="mlxg"; g.setAttribute("role","dialog"); g.setAttribute("aria-modal","true"); g.setAttribute("aria-labelledby","mlxgT");
    if(light()) g.classList.add("lt");
    document.body.appendChild(g);
    function render(){
      var st=S.list[i];
      g.innerHTML=((S.arrow&&i===0)?'<div class="arrow '+S.arrow+'">'+ARROW+'</div>':'')+
        '<div class="gc" style="position:relative"><div class="kick">'+(n>1?'Step '+(i+1)+' of '+n:'Add to Home Screen')+'</div><h3 id="mlxgT">'+st.t+'</h3><p>'+st.d+'</p>'+st.m+
        (n>1?'<div class="dots" aria-hidden="true">'+S.list.map(function(_,k){ return '<i class="'+(k===i?'on':'')+'"></i>'; }).join('')+'</div>':'')+
        '<div class="nav">'+(n>1?'<button class="b g" type="button" id="mlxgBack"'+(i===0?' disabled':'')+'>Back</button>':'<button class="b g" type="button" id="mlxgBack">Back</button>')+
        '<button class="b" type="button" id="mlxgNext">'+(i<n-1?'Next':'Done')+'</button></div></div>';
      var bk=document.getElementById("mlxgBack"), nx=document.getElementById("mlxgNext");
      bk.onclick=function(){ if(n===1||i===0){ end(); return; } i--; render(); };
      nx.onclick=function(){ if(i<n-1){ i++; render(); } else end(); };
      var gc=document.getElementById("mlxGCopy"); if(gc) gc.onclick=function(){ var ok=document.getElementById("mlxGOk");
        var done=function(){ if(ok){ ok.textContent="Link copied"; } };
        try{ navigator.clipboard.writeText(SITE).then(done,done); }catch(e){ done(); } };
      try{ nx.focus({preventScroll:true}); }catch(e){}
    }
    function end(){ var x=g; g=null; if(!x) return; x.classList.remove("in"); setTimeout(function(){ if(x.parentNode) x.parentNode.removeChild(x); },260); }
    g.addEventListener("click",function(e){ if(e.target===g) end(); });
    render(); requestAnimationFrame(function(){ requestAnimationFrame(function(){ if(g) g.classList.add("in"); }); });
    window.__mlxGuide={go:function(k){ i=k; render(); },n:n,arrow:S.arrow};
  }
  window.ModeLabInstall=function(){ if(deferred){ var d=deferred; deferred=null; d.prompt(); return; } guide(); };
  window.ModeLabShare=function(){ open(true); };
  function ready(fn){ if(document.readyState==="complete") fn(); else window.addEventListener("load",fn); }
  ready(function(){ setTimeout(function(){ open(false); },700); });
})();
