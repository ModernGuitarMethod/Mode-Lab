/* motion.js v1.0 (Guitar Lab shared motion layer). Transform/opacity only; no audio or layout work.
   Loaded once per lab after pwa.js. Respects prefers-reduced-motion. Public: window.MX.{ok,bad,beat,pop,settle,stats} */
(function(){
  if(window.MX) return;
  var D=document, RM=window.matchMedia?matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
  var css='\
:where(button:not(.fret-cell),select,[role=button],a.action,.pill,.chip){transition:background-color .14s ease,border-color .14s ease,color .14s ease,box-shadow .14s ease,opacity .14s ease,transform .12s ease}\
:where(button:not(.fret-cell):not(:disabled):active,[role=button]:active,a.action:active,.pill:active,.chip:active){transform:scale(.97)}\
.mx-fx{position:fixed;left:0;top:0;pointer-events:none;z-index:2147483000;border-radius:50%;will-change:transform,opacity}\
.mx-fx.ok{border:3px solid #d4a017;box-shadow:0 0 14px 2px rgba(212,160,23,.75);border-radius:12px;animation:mxOk .3s ease-out forwards}\
.mx-fx.down{background:radial-gradient(circle,rgba(212,160,23,.55),rgba(212,160,23,0) 70%);border:2px solid rgba(255,214,90,.95);animation:mxDown .26s ease-out forwards}\
.mx-fx.ok.round{border-radius:50%}.mx-fx.rect{border-radius:12px}.mx-fx.rect.down{background:none;box-shadow:0 0 18px 4px rgba(212,160,23,.85);border-width:3px;animation-name:mxDownR}.mx-fx.rect.beat{box-shadow:0 0 10px 1px rgba(74,222,128,.6);animation-name:mxBeatR}\
@keyframes mxDownR{0%{opacity:1;transform:var(--mxp) scale(1)}100%{opacity:0;transform:var(--mxp) scale(1.14)}}@keyframes mxBeatR{0%{opacity:.85;transform:var(--mxp) scale(1)}100%{opacity:0;transform:var(--mxp) scale(1.07)}}\
.mx-fx.beat{border:2px solid rgba(74,222,128,.7);animation:mxBeat .18s ease-out forwards}\
@keyframes mxOk{0%{opacity:.95;transform:var(--mxp) scale(1)}100%{opacity:0;transform:var(--mxp) scale(1.12)}}\
@keyframes mxDown{0%{opacity:1;transform:var(--mxp) scale(1)}100%{opacity:0;transform:var(--mxp) scale(2.3)}}\
@keyframes mxBeat{0%{opacity:.8;transform:var(--mxp) scale(1)}100%{opacity:0;transform:var(--mxp) scale(1.6)}}\
.mx-bad{animation:mxShake .25s cubic-bezier(.36,.07,.19,.97)!important}\
@keyframes mxShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-4px)}40%{transform:translateX(4px)}60%{transform:translateX(-3px)}80%{transform:translateX(2px)}}\
.mx-hit-down{animation:mxOrbD .2s ease-out!important}.mx-hit{animation:mxOrb .15s ease-out!important}\
@keyframes mxOrbD{0%{transform:scale(1.38)}100%{transform:scale(1.15)}}@keyframes mxOrb{0%{transform:scale(1.18)}100%{transform:scale(1.05)}}\
.fret-cell .dot.mx-pop{animation:mxPop .15s ease-out!important}\
@keyframes mxPop{0%{transform:scale(1.1)}50%{transform:scale(1.27)}100%{transform:scale(1.1)}}\
.mx-in{animation:mxIn .2s ease-out both}\
@keyframes mxIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}\
.mx-settle{animation:mxSettle .2s ease-out}\
@keyframes mxSettle{from{opacity:.35;transform:translateY(4px)}to{opacity:1;transform:none}}\
@media (prefers-reduced-motion:reduce){.mx-fx{display:none!important}.mx-bad,.mx-hit,.mx-hit-down,.fret-cell .dot.mx-pop,.mx-in,.mx-settle{animation:none!important}:where(button,select,[role=button],a.action,.pill,.chip){transition:none!important}:where(button,[role=button],a.action,.pill,.chip):active{transform:none!important}}';
  var st=D.createElement('style'); st.id='mx-css'; st.textContent=css; (D.head||D.documentElement).appendChild(st);
  var S={calls:0,ms:0,max:0,ok:0,bad:0,beat:0,down:0,pop:0,settle:0,fin:0};
  function rm(){ return RM.matches; }
  function cls(el){ return (el.getAttribute&&el.getAttribute('class'))||''; }
  function has(s,c){ return (' '+s+' ').indexOf(' '+c+' ')>=0; }
  function vis(el){ return el&&el.isConnected&&el.getClientRects().length>0; }
  function fx(el,kind,ms){
    if(rm()||!vis(el)) return; var r=el.getBoundingClientRect(); if(r.width<2) return;
    var pad=kind==='ok'?3:0, f=D.createElement('div'); f.className='mx-fx '+kind;
    f.style.width=(r.width+pad*2)+'px'; f.style.height=(r.height+pad*2)+'px';
    f.style.setProperty('--mxp','translate('+(r.left-pad)+'px,'+(r.top-pad)+'px)');
    f.style.transform='translate('+(r.left-pad)+'px,'+(r.top-pad)+'px)';
    D.body.appendChild(f); setTimeout(function(){ f.remove(); }, ms+60);
  }
  function restart(el,c,ms){ if(rm()||!el) return; clearTimeout(el['_'+c]); function on(){ el.classList.add(c); el['_'+c]=setTimeout(function(){ el.classList.remove(c); }, ms); } if(el.classList.contains(c)){ el.classList.remove(c); requestAnimationFrame(on); } else on(); }
  var MX={
    ok:function(el){ S.ok++; var d=el.querySelector&&el.querySelector('.dot'); fx(d&&vis(d)?d:el,d&&vis(d)?'ok round':'ok',300); },
    bad:function(el){ S.bad++; restart(el,'mx-bad',260); },
    beat:function(el,accent){ var rect=false; if(!vis(el)){ el=D.querySelector('[data-mx-beat]'); rect=true; if(!vis(el)) return; }
      if(accent){S.down++; fx(el,'down'+(rect?' rect':''),260); if(!rect) restart(el,'mx-hit-down',210);} else {S.beat++; fx(el,'beat'+(rect?' rect':''),180); if(!rect) restart(el,'mx-hit',160);} },
    pop:function(dot){ S.pop++; restart(dot,'mx-pop',160); },
    settle:function(){ if(rm()) return; S.settle++; D.querySelectorAll('#neckOuter,#neck,#neckHost,#timeline,#chordBox,#chordStrip,#chords').forEach(function(e){ if(vis(e)) restart(e,'mx-settle',210); }); },
    stats:S
  };
  window.MX=MX;
  var BEAT_IDS={beatOrb:1,orb:1};
  function onMut(list){
    var t0=performance.now(), first=new Map(), added=[];
    for(var i=0;i<list.length;i++){ var m=list[i];
      if(m.type==='attributes'){ if(!first.has(m.target)) first.set(m.target,m.oldValue||''); }
      else if(m.type==='childList'){
        if(BEAT_IDS[m.target.id]&&!first.has(m.target)) first.set(m.target,'');
        for(var j=0;j<m.addedNodes.length;j++){ var n=m.addedNodes[j]; if(n.nodeType===1&&!has(cls(n),'mx-fx')) added.push(n); } }
    }
    var beatDone=false;
    first.forEach(function(old,el){
      var now=cls(el);
      function g(c){ return has(now,c)&&!has(old,c); }
      if(g('correct')||g('right')) MX.ok(el);
      if(g('wrong')||g('miss')) MX.bad(el);
      if(has(now,'fret-cell')&&(g('next')||g('lit'))){ var d=el.querySelector('.dot'); if(d) MX.pop(d); }
      if(!beatDone&&(BEAT_IDS[el.id]||el.id==='tempoDot')&&(g('on')||g('pulse')||g('pulse-green')||g('accent'))){
        if(el.id==='tempoDot'&&(vis(D.getElementById('beatOrb'))||first.has(D.getElementById('beatOrb')))) return;
        var acc=has(now,'accent')||has(now,'downbeat')||(el.id==='orb'&&el.textContent.trim()==='1');
        if(el.id==='tempoDot'){ var o=old; acc=acc||has(o,'downbeat'); }
        beatDone=true; MX.beat(el,acc);
      }
    });
    var k=0;
    added.forEach(function(n){
      if(rm()||k>=10) return;
      var p=n.parentNode, inCard=p&&(p.id==='card'||p.id==='hubGrid')&&!has(cls(n),'lv-bar');
      if(inCard||has(cls(n),'sec-card')||has(cls(n),'swv-card')||has(cls(n),'vz-card')){ n.style.animationDelay=(k*35)+'ms'; n.classList.add('mx-in'); (function(x,t){ setTimeout(function(){ x.classList.remove('mx-in'); x.style.animationDelay=''; },t); })(n,240+k*35); k++; S.fin++; }
    });
    var dt=performance.now()-t0; S.calls++; S.ms+=dt; if(dt>S.max) S.max=dt;
  }
  function start(){
    new MutationObserver(onMut).observe(D.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class'],attributeOldValue:true});
    var last=0;
    function go(){ var n=performance.now(); if(n-last<250) return; last=n; requestAnimationFrame(MX.settle); }
    D.addEventListener('change',function(e){ if(e.target&&e.target.tagName==='SELECT') go(); },true);
    D.addEventListener('click',function(e){ var b=e.target&&e.target.closest&&e.target.closest('button'); if(b&&/^\s*(Generate|New loop|New)\b/i.test(b.textContent||'')) go(); },true);
    D.querySelectorAll('#card > *, #hubGrid > .tile, .sec-card').forEach(function(n,i){ if(i<10&&!rm()){ S.fin++; n.style.animationDelay=(i*35)+'ms'; restart(n,'mx-in',230+i*35);} });
  }
  if(D.body) start(); else D.addEventListener('DOMContentLoaded',start);
})();
