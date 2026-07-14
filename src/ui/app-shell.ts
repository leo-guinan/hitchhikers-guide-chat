import { themeCss } from './theme';

const fieldSvg = `
<svg viewBox="0 0 1440 1000" preserveAspectRatio="xMidYMid slice">
  <g fill="#d4a94e">
    <circle cx="120" cy="140" r="1.2" opacity=".7"/><circle cx="340" cy="80" r="1" opacity=".4"/>
    <circle cx="760" cy="60" r="1.4" opacity=".6"/><circle cx="1180" cy="120" r="1" opacity=".5"/>
    <circle cx="220" cy="520" r="1" opacity=".35"/><circle cx="90" cy="760" r="1.3" opacity=".5"/>
    <circle cx="540" cy="880" r="1" opacity=".4"/><circle cx="980" cy="820" r="1.2" opacity=".45"/>
    <circle cx="1350" cy="640" r="1" opacity=".5"/><circle cx="660" cy="420" r="1" opacity=".3"/>
    <circle cx="1240" cy="380" r="1.2" opacity=".4"/><circle cx="420" cy="260" r="1" opacity=".35"/>
  </g>
  <g fill="none" stroke="#d4a94e" stroke-opacity=".10">
    <ellipse cx="1250" cy="180" rx="640" ry="640"/>
    <ellipse cx="1250" cy="180" rx="820" ry="820" stroke-dasharray="2 9"/>
    <ellipse cx="-60" cy="980" rx="520" ry="520" stroke-dasharray="1 7"/>
  </g>
</svg>`;

const headerHtml = `
<header>
  <svg class="sigil" viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="17" fill="none" stroke="#d4a94e" stroke-opacity=".5"/>
    <circle cx="20" cy="20" r="17" fill="none" stroke="#d4a94e" stroke-dasharray="1 5" stroke-opacity=".8"/>
    <circle cx="20" cy="20" r="6.5" fill="#0b0814" stroke="#e2542c" stroke-width="1.4"/>
    <circle cx="27" cy="9" r="1.6" fill="#d4a94e"/>
  </svg>
  <span class="name">Hitchhiker's Guide to the Future</span>
  <nav>
    <a href="/">Today</a>
    <a href="/search">Atlas</a>
    <a href="/hotspots">Hotspots</a>
    <a href="/imports">Imports</a>
    <a href="#" id="bookReopen">The book</a>
    <a class="cta" href="/enter">Open the diary</a>
  </nav>
</header>`;

const footerHtml = `
<footer>
  <span class="annot dim">chart plate 01 <span class="dot">·</span> destination RA 17h 45m · DEC −29° 00′ <span class="dot">·</span> printed 2026.07.11</span>
  <span class="annot dim right">mostly harmless <span class="dot">·</span> don't forget your towel</span>
</footer>

<div class="book-overlay" id="book" aria-hidden="true">
  <div class="book-stage" role="dialog" aria-modal="true" aria-label="The Guide, a book">
    <button class="book-close" id="bookClose" aria-label="Skip the book">✕</button>
    <div class="book-pages">
      <section class="book-page" data-i="0">
        <span class="annot">Chapter I <span class="dot">·</span> the cover</span>
        <h2>Don't panic<br>about the future.</h2>
        <p>This is not a chatbot with a login wall. It's a <em>guide</em> — a book you write with an AI, one page a day, with a human on call for the parts the machine can't reach.</p>
        <p class="book-foot">Turn the page →</p>
      </section>
      <section class="book-page" data-i="1">
        <span class="annot">Chapter II <span class="dot">·</span> today</span>
        <h2>Each day<br>is a page.</h2>
        <p>Talk to Leo, your guide. One fresh conversation per day. At night it's compressed into a small, dense diary entry that's actually yours.</p>
        <p class="book-foot">Turn the page →</p>
      </section>
      <section class="book-page" data-i="2">
        <span class="annot">Chapter III <span class="dot">·</span> the atlas</span>
        <h2>The Atlas<br>remembers.</h2>
        <p>Every entry becomes a waypoint on the star-line. Search it, wander it. Days that drifted too far are flagged with a quiet ember flare.</p>
        <p class="book-foot">Turn the page →</p>
      </section>
      <section class="book-page" data-i="3">
        <span class="annot">Chapter IV <span class="dot">·</span> the human</span>
        <h2>When the chart<br>runs out of sky.</h2>
        <p>The Guide knows its limits. When it needs context it doesn't have, it asks a human operator to look things up and write them back into your diary.</p>
        <p class="book-foot">Turn the page →</p>
      </section>
      <section class="book-page" data-i="4">
        <span class="annot ember">The last page <span class="dot">·</span> your move</span>
        <h2>Your journey<br>begins.</h2>
        <p>Open the diary with email, or claim a Kipper founder pass while the first audience is forming. Then the book is yours to keep writing.</p>
        <button class="btn solid" id="bookStart">Don't panic · start your journey</button>
      </section>
    </div>
    <div class="book-nav">
      <button class="book-arrow" id="bookPrev" aria-label="Previous page">←</button>
      <span class="book-dots" id="bookDots"></span>
      <button class="book-arrow" id="bookNext" aria-label="Next page">→</button>
    </div>
  </div>
</div>`;

const orbfigSvg = `
<figure class="orbfig" aria-label="Engraved chart of a dark star with travelers walking toward it">
  <svg viewBox="0 0 480 420">
    <defs>
      <radialGradient id="corona" cx="50%" cy="50%" r="50%">
        <stop offset="52%" stop-color="#0b0814"/>
        <stop offset="62%" stop-color="#e2542c" stop-opacity=".9"/>
        <stop offset="74%" stop-color="#e2542c" stop-opacity=".25"/>
        <stop offset="100%" stop-color="#e2542c" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <g fill="none" stroke="#d4a94e" stroke-opacity=".35">
      <circle cx="356" cy="132" r="118" stroke-dasharray="2 6"/>
      <circle cx="356" cy="132" r="96"/>
      <ellipse cx="356" cy="132" rx="150" ry="60" transform="rotate(-24 356 132)" stroke-opacity=".2"/>
    </g>
    <circle cx="356" cy="132" r="86" fill="url(#corona)"/>
    <circle cx="356" cy="132" r="46" fill="#060410"/>
    <circle cx="356" cy="132" r="46" fill="none" stroke="#e2542c" stroke-width="1.6"/>
    <path id="pilgrimPath" d="M18 400 C 120 380, 170 330, 216 288 C 258 249, 292 210, 322 176" fill="none" stroke="#d4a94e" stroke-opacity=".6" stroke-dasharray="1 8" stroke-width="1.6" stroke-linecap="round"/>
    <g stroke="#d4a94e" stroke-width="1.1" fill="#eccb7e">
      <g transform="translate(70 356)">
        <line x1="0" y1="0" x2="6" y2="-14"/><line x1="6" y1="-14" x2="4" y2="-26"/>
        <line x1="6" y1="-14" x2="14" y2="-6"/><line x1="4" y1="-26" x2="-4" y2="-20"/>
        <line x1="4" y1="-26" x2="12" y2="-30"/>
        <circle cx="0" cy="0" r="1.8"/><circle cx="6" cy="-14" r="1.8"/><circle cx="14" cy="-6" r="1.8"/>
        <circle cx="4" cy="-26" r="1.8"/><circle cx="-4" cy="-20" r="1.8"/><circle cx="12" cy="-30" r="1.8"/>
        <circle cx="4" cy="-33.5" r="3.2" fill="none"/>
      </g>
      <g transform="translate(232 268) scale(.85)">
        <line x1="0" y1="0" x2="6" y2="-14"/><line x1="6" y1="-14" x2="4" y2="-26"/>
        <line x1="6" y1="-14" x2="13" y2="-5"/><line x1="4" y1="-26" x2="-3" y2="-19"/>
        <line x1="4" y1="-26" x2="13" y2="-29"/>
        <circle cx="0" cy="0" r="2"/><circle cx="6" cy="-14" r="2"/><circle cx="13" cy="-5" r="2"/>
        <circle cx="4" cy="-26" r="2"/><circle cx="-3" cy="-19" r="2"/><circle cx="13" cy="-29" r="2"/>
        <circle cx="4" cy="-34" r="3.4" fill="none"/>
      </g>
    </g>
    <g font-family="'Space Mono',monospace" font-size="9" letter-spacing="2.5" fill="#d4a94e">
      <text x="18" y="418">DEPARTURE · TODAY</text>
      <text x="284" y="252" fill="#e2542c">THE FUTURE · ETA UNKNOWN</text>
    </g>
  </svg>
  <figcaption class="annot dim">Fig. 01 <span class="dot">·</span> the road so far <span class="dot">·</span> do not panic</figcaption>
</figure>`;

const heroHtml = `
<section class="hero">
  <div>
    <span class="annot hero-annot">Expedition log <span class="dot">·</span> one traveler <span class="dot">·</span> one guide <span class="dot">·</span> T−∞ and counting</span>
    <h1>Each day is a <em>page</em>.<br>Every page points<br>at the same star.</h1>
    <p class="lede">
      The Guide keeps a diary with you — one chat context per day, compressed each night into
      an entry on the map. Wander with Leo, flag the days that drift too far, and when the
      Guide runs out of sky, <a href="#human">ask a human to look something up</a>.
      Old pages live in <a href="/search">the Atlas</a>.
    </p>
    <div class="price-line">
      <span class="price">$42</span>
      <span class="annot dim">/ month <span class="dot">·</span> Kipper founders enter free <span class="dot">·</span> the answer, obviously</span>
    </div>
  </div>
  ${orbfigSvg}
</section>`;

const sharedScript = `
const $=id=>document.getElementById(id);
function trackGuideEvent(name){try{if(window.fathom)window.fathom.trackEvent(name);}catch{}}
const sessionId=localStorage.guideSessionId ||= crypto.randomUUID();
const today=new Date().toISOString().slice(0,10);
let token=localStorage.guideAuthToken||'';let account=null;
function authHeaders(){return token?{authorization:'Bearer '+token}:{};}
function fmtDate(iso){return iso?iso.replace(/-/g,'.'):'—';}
async function api(path,opts={}){const res=await fetch(path,{headers:{'content-type':'application/json',...authHeaders(),...(opts.headers||{})},...opts});const text=await res.text();const data=text?JSON.parse(text):{};if(!res.ok)throw new Error(data.error||text||res.statusText);return data;}
function setStatus(el,msg,ember){if(!el)return;el.textContent=msg;el.style.color=ember?'#e8a48d':'';}
function guideHasAccess(){return !!account&&(account.paid||account.access==='paid'||account.access==='kipper_free');}
function setGate(){const signed=!!account;const access=guideHasAccess();const label=account?.access==='kipper_free'?'kipper founder':account?.paid?'paid':'unpaid';const identity=account?.kipperHandle?'@'+account.kipperHandle:account?.email;const acc=$('accStatus');if(acc)acc.textContent=signed?identity+' // '+label:'Signed out.';$('payStatus') && ($('payStatus').textContent=access?'Diary open. Query receipts are being logged.':signed?'Signed in. Subscribe or claim a Kipper founder pass to unseal the diary.':'No toll paid yet.');const ks=$('kipperStatus');if(ks&&account?.access==='kipper_free')ks.textContent='Kipper founder pass active. Query receipts are being logged for the future Quai→OpenRouter bridge.';const veil=$('veil');if(veil)veil.style.display=(access?'none':'flex');if($('composer')){$('composer').style.opacity=access?1:.4;$('composer').style.pointerEvents=access?'auto':'none';}const pay=$('payBtn');if(pay)pay.disabled=!!account?.paid;const kb=$('kipperBtn');if(kb)kb.disabled=account?.access==='kipper_free';if($('receipt')){$('receipt').innerHTML='session  <b>'+sessionId+'</b>\\npage     <b>'+fmtDate(today)+'</b>\\ngate     <b>'+(access?'open':'locked')+'</b>\\naccess   <b>'+label+'</b>\\nqueries  <b>receipted</b>';}}
async function refreshMe(){try{const r=await api('/auth/me',{method:'GET'});account=r.account;setGate();}catch{account=null;setGate();}}
const sendCode=$('sendCode');
if(sendCode)sendCode.onclick=async()=>{const em=$('email').value.trim();if(!em){setStatus($('accStatus'),'Enter an email first — the code needs somewhere to land.',true);return;}try{trackGuideEvent('Guide Sign In Code Requested');const r=await api('/auth/request-code',{method:'POST',body:JSON.stringify({email:em})});$('gateReturn')&&$('gateReturn').classList.add('codesent');if(r.delivery&&r.delivery.sent){setStatus($('accStatus'),'Code sent by email. Check your inbox.');}else{setStatus($('accStatus'),'Email delivery is not configured. Dev code: '+(r.devCode||'unavailable'),true);}$('code')&&$('code').focus();}catch(err){setStatus($('accStatus'),'Auth error: '+err.message,true);}};
const verifyBtn=$('verifyBtn');
if(verifyBtn)verifyBtn.onclick=async()=>{const em=$('email').value.trim();const co=$('code').value.trim();if(co.trim().length<6){setStatus($('accStatus'),'That code is short a few digits.',true);return;}try{trackGuideEvent('Guide Sign In Code Submitted');const r=await api('/auth/verify',{method:'POST',body:JSON.stringify({email:em,code:co})});token=r.token;localStorage.guideAuthToken=token;account=r.account;setGate();trackGuideEvent(account&&account.paid?'Guide Sign In Paid':'Guide Sign In Unpaid');if(account&&account.paid)location.href='/app';}catch(err){setStatus($('accStatus'),'Verify error: '+err.message,true);}};
const payBtn=$('payBtn');
if(payBtn)payBtn.onclick=async()=>{const signupEmail=$('email2')?.value.trim()||'';const checkoutEmail=account?.email||signupEmail;if(!checkoutEmail){setStatus($('payStatus'),'Enter an email first — it becomes your account.',true);$('email2')&&$('email2').focus();return;}try{trackGuideEvent('Guide Checkout Started');payBtn.textContent='Creating Checkout…';setStatus($('payStatus'),'Charting course to Stripe checkout…');const successUrl=account?location.origin+'/app?checkout=success':location.origin+'/enter?checkout=success';const r=await api('/checkout/session',{method:'POST',body:JSON.stringify({sessionId,email:checkoutEmail,successUrl,cancelUrl:location.origin+'/enter?checkout=cancelled'})});if(r.checkout.url){location.href=r.checkout.url;return;}payBtn.textContent='Start at $42/month →';setStatus($('payStatus'),r.checkout.error||'Stripe is not configured yet.',true);}catch(err){payBtn.textContent='Start at $42/month →';setStatus($('payStatus'),'Stripe checkout not ready: '+err.message,true);}};
const kipperBtn=$('kipperBtn');
if(kipperBtn)kipperBtn.onclick=async()=>{const handle=($('kipperHandle')?.value||'').trim().replace(/^@+/,'');const quaiAddress=($('quaiAddress')?.value||'').trim();if(!handle){setStatus($('kipperStatus'),'Enter your X handle first. Kipper is already wired into that surface.',true);$('kipperHandle')&&$('kipperHandle').focus();return;}try{trackGuideEvent('Guide Kipper Signup Started');kipperBtn.textContent='Writing Kipper receipt…';const body={handle};if(quaiAddress)body.quaiAddress=quaiAddress;const r=await api('/auth/kipper',{method:'POST',body:JSON.stringify(body)});token=r.token;localStorage.guideAuthToken=token;account=r.account;localStorage.guideKipperReceipt=JSON.stringify(r.receipt);setGate();trackGuideEvent('Guide Kipper Signup Completed');setStatus($('kipperStatus'),'Founder pass active for @'+account.kipperHandle+'. Opening the diary…');location.href='/app';}catch(err){kipperBtn.textContent='Claim free Kipper access →';setStatus($('kipperStatus'),'Kipper signup error: '+err.message,true);}};
const futureBtn=$('futureBtn');
if(futureBtn)futureBtn.onclick=async()=>{try{const r=await api('/future-analysis',{method:'POST',body:JSON.stringify({sessionId,day:today,delay:delayFor($('window').value),question:$('futureNote').value||undefined})});setStatus($('futureStatus'),'Queued '+r.request.id+' ('+$('window').value+') for delayed human review.');}catch(err){setStatus($('futureStatus'),'Future queue error: '+err.message,true);}};
function delayFor(v){return v==='24h'?'24h':v==='72h'?'72h':v==='1w'?'1w':'all';}
const humanBtn=$('humanBtn');
if(humanBtn)humanBtn.onclick=async()=>{const q=$('humanAsk').value.trim();if(!q){setStatus($('humanStatus'),'Tell the human what to look up first.',true);return;}try{const r=await api('/context-requests',{method:'POST',body:JSON.stringify({sessionId,userMessage:lastUserMessage||'(manual context request)',missingContext:q,urgency:$('urgency').value,contact:$('contact').value||undefined,source:'manual',diaryDay:today})});setStatus($('humanStatus'),'Request '+r.request.id+' logged ('+$('urgency').value+'). An operator will pick it up.');}catch(err){setStatus($('humanStatus'),'Error: '+err.message,true);}};
let lastUserMessage='';
(function bookOnboarding(){
  const overlay=$('book'); if(!overlay) return;
  const pages=[...overlay.querySelectorAll('.book-page')];
  const dots=$('bookDots'); const prev=$('bookPrev'); const next=$('bookNext');
  let i=0;
  if(dots){ pages.forEach((_,n)=>{ const d=document.createElement('i'); if(n===0)d.className='on'; dots.appendChild(d); }); }
  const dotEls=[...dots?dots.children:[]];
  function show(n){
    i=Math.max(0,Math.min(pages.length-1,n));
    pages.forEach((p,n)=>p.classList.toggle('active',n===i));
    dotEls.forEach((d,n)=>d.classList.toggle('on',n===i));
    if(prev) prev.disabled=i===0;
    if(next) next.disabled=i===pages.length-1;
  }
  function open(){ overlay.classList.add('open'); overlay.setAttribute('aria-hidden','false'); show(0); }
  function close(){ overlay.classList.remove('open'); overlay.setAttribute('aria-hidden','true'); try{ localStorage.guideBookSeen='1'; }catch{} }
  if(next) next.onclick=()=>show(i+1);
  if(prev) prev.onclick=()=>show(i-1);
  const x=$('bookClose'); if(x) x.onclick=close;
  overlay.addEventListener('click',e=>{ if(e.target===overlay) close(); });
  document.addEventListener('keydown',e=>{ if(!overlay.classList.contains('open'))return; if(e.key==='Escape')close(); if(e.key==='ArrowRight')show(i+1); if(e.key==='ArrowLeft')show(i-1); });
  const start=$('bookStart'); if(start) start.onclick=()=>{ close(); location.href='/enter'; };
  const reopen=$('bookReopen'); if(reopen) reopen.onclick=e=>{ e.preventDefault(); open(); };
  let seen=false; try{ seen=localStorage.guideBookSeen==='1'; }catch{}
  if(!seen && !location.search.includes('checkout=')) setTimeout(open, 600);
})();
setGate();refreshMe().finally(()=>{if(location.search.includes('checkout=success')){setStatus($('payStatus'),'Checkout complete. Use Gate I with the same email to open the diary.');setStatus($('accStatus'),'Payment recorded. Request a sign-in code with the same email.');}});
`;

export function pageShell(activeNav: string, bodyHtml: string, script: string): string {
  const field = `<div class="field" aria-hidden="true">${fieldSvg}</div>`;
  const { html, scripts } = extractInlineScripts(bodyHtml);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hitchhiker's Guide to the Future</title><script src="https://cdn.usefathom.com/script.js" data-site="LLFJJYXQ" defer></script><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet"><style>${themeCss}</style><style>${extraCss}</style></head><body>${field}<div class="wrap">${headerHtml}${html}${footerHtml}</div><script>${sharedScript}${scripts.join('\n')}${script}</script></body></html>`;
}

function extractInlineScripts(html: string): { html: string; scripts: string[] } {
  const scripts: string[] = [];
  const cleanHtml = html.replace(/<script>([\s\S]*?)<\/script>/g, (_match, body: string) => {
    scripts.push(body);
    return '';
  });
  return { html: cleanHtml, scripts };
}

const extraCss = `
.hero{position:relative;padding:84px 0 60px;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(300px,.85fr);gap:56px;align-items:start}
.hero h1{font-weight:800;font-size:clamp(42px,6vw,76px);line-height:.98;letter-spacing:-.015em}
.hero h1 em{font-style:normal;color:var(--gold)}
.hero .lede{margin-top:26px;max-width:52ch;color:var(--ink-dim);font-size:17px}
.hero .lede a{color:var(--gold);text-underline-offset:3px}
.price-line{margin-top:34px;display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}
.price-line .price{font-weight:800;font-size:44px;letter-spacing:-.02em}
.hero-annot{position:absolute;top:34px;left:0}
.orbfig{position:relative;min-height:340px}
.orbfig svg{width:100%;height:auto;display:block}
.orbfig figcaption{position:static;margin-top:14px;text-align:right;line-height:1.9;max-width:100%;white-space:normal}
.diary{display:flex;flex-direction:column;min-height:620px}
.diary-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding-bottom:18px;border-bottom:1px dashed var(--gold-ghost)}
.diary-head .turns{margin-left:auto}
.chatlog{flex:1;padding:26px 2px;display:flex;flex-direction:column;gap:18px;overflow-y:auto;max-height:520px}
.msg{max-width:78%;padding:14px 18px;border-radius:12px;font-size:15.5px}
.msg.guide{align-self:flex-start;background:var(--void-3);border:1px solid var(--gold-ghost);border-left:2px solid var(--gold)}
.msg.you{align-self:flex-end;background:rgba(107,85,144,.16);border:1px solid var(--plum-dim)}
.msg .who{font-family:var(--mono);font-size:10px;letter-spacing:.26em;text-transform:uppercase;color:var(--gold);display:block;margin-bottom:6px}
.msg.you .who{color:var(--plum)}
.composer{display:flex;gap:12px;padding-top:18px;border-top:1px dashed var(--gold-ghost)}
.composer textarea{flex:1;margin:0;min-height:54px}
.composer .btn{width:auto;padding:0 26px}
.diary-tools{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px}
.diary-tools .btn{width:auto;flex:1;min-width:200px}
.veil{position:absolute;inset:0;z-index:3;border-radius:14px;background:linear-gradient(180deg,rgba(11,8,20,.55),rgba(11,8,20,.92));backdrop-filter:blur(2px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:30px}
.veil p{max-width:38ch;color:var(--ink-dim)}
.veil .btn{width:auto;padding:13px 30px}
.atlas{padding:70px 0 30px}
.atlas-head{display:flex;align-items:baseline;gap:20px;flex-wrap:wrap;margin-bottom:8px}
.atlas-head h2{font-weight:800;font-size:clamp(28px,3.4vw,40px);letter-spacing:-.01em}
.atlas-head .annot{margin-left:auto}
.heatmap-panel{margin-top:28px;background:linear-gradient(160deg,rgba(18,13,30,.92),rgba(11,8,20,.72));border:1px solid var(--gold-ghost);border-radius:14px;padding:22px;overflow:hidden}
.heatmap-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap;margin-bottom:16px}
.heatmap-head h3{font-size:22px;line-height:1.1;margin-top:8px;letter-spacing:-.01em}
.heatmap-wrap{display:grid;grid-template-columns:30px minmax(760px,1fr);grid-template-rows:18px auto;gap:7px 10px;overflow-x:auto;padding-bottom:8px}
.heatmap-months{grid-column:2;display:grid;grid-template-columns:repeat(53,14px);gap:4px;min-width:950px;font-family:var(--mono);font-size:10px;letter-spacing:.12em;color:var(--ink-dim);text-transform:uppercase}
.heatmap-axis{grid-column:1;grid-row:2;display:grid;grid-template-rows:repeat(7,14px);gap:4px;font-family:var(--mono);font-size:9px;color:var(--ink-dim);align-items:center}
.heatmap-axis span:nth-child(1){grid-row:2}.heatmap-axis span:nth-child(2){grid-row:4}.heatmap-axis span:nth-child(3){grid-row:6}
.heatmap-grid{grid-column:2;grid-row:2;display:grid;grid-auto-flow:column;grid-template-rows:repeat(7,14px);grid-auto-columns:14px;gap:4px;min-width:950px}
.heatcell{width:14px;height:14px;border-radius:3px;border:1px solid rgba(212,169,78,.08);background:rgba(234,226,208,.045);padding:0;cursor:pointer;position:relative}
.heatcell:hover{outline:1px solid var(--gold-bright);outline-offset:1px}
.heatcell.l0{background:rgba(234,226,208,.045)}.heatcell.l1{background:rgba(107,85,144,.42)}.heatcell.l2{background:rgba(212,169,78,.34)}.heatcell.l3{background:rgba(212,169,78,.72)}.heatcell.l4{background:var(--ember);box-shadow:0 0 10px var(--ember-glow)}
.heatcell.shape-import{border-radius:2px 7px 2px 7px}.heatcell.shape-analysis::after{content:"";position:absolute;inset:3px;border:1px solid rgba(11,8,20,.7);border-radius:2px}.heatcell.shape-mixed{transform:rotate(45deg) scale(.82)}
.heatmap-foot{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:10px}
.heatkey{width:12px;height:12px;border-radius:3px;display:inline-block;border:1px solid rgba(212,169,78,.08)}
.heatkey.l0{background:rgba(234,226,208,.045)}.heatkey.l1{background:rgba(107,85,144,.42)}.heatkey.l2{background:rgba(212,169,78,.34)}.heatkey.l3{background:rgba(212,169,78,.72)}.heatkey.l4{background:var(--ember)}
.heatmap-shapes{margin-left:auto}
.starline{position:relative;margin:10px 0 6px}
.starline svg{width:100%;height:auto;display:block}
.source-tabs{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0 4px}
.source-tabs .btn{width:auto;padding:9px 13px;font-size:10px;letter-spacing:.16em}
.source-tabs .btn.active{border-color:var(--gold);color:var(--gold);background:rgba(212,169,78,.08)}
.source-tabs span{color:var(--ink);margin-left:4px}
.entries{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:22px;margin-top:26px}
.entry{background:var(--void-2);border:1px solid var(--gold-ghost);border-radius:12px;padding:22px;text-decoration:none;color:var(--ink);transition:transform .18s,border-color .18s;position:relative}
.entry:hover{transform:translateY(-3px);border-color:var(--gold-faint)}
.entry h3{font-weight:700;font-size:18px;margin:10px 0 8px}
.entry p{color:var(--ink-dim);font-size:14.5px}
.entry .annot{font-size:10px}
.entry.hot{border-color:rgba(226,84,44,.4)}
.entry.hot::after{content:"";position:absolute;top:16px;right:16px;width:9px;height:9px;background:var(--ember);transform:rotate(45deg);box-shadow:0 0 12px var(--ember-glow)}
.entry.hot .annot:first-child{color:var(--ember)}
.hotnote{margin-top:14px;padding:10px 12px;border-left:2px solid var(--ember);background:rgba(226,84,44,.06);border-radius:0 8px 8px 0;font-family:var(--mono);font-size:11px;letter-spacing:.06em;color:#e8a48d}
.hotspots{padding:58px 0 34px}
.hotspots-hero{border:1px solid var(--gold-faint);border-radius:18px;padding:clamp(28px,5vw,58px);background:linear-gradient(160deg,rgba(18,13,30,.86),rgba(11,8,20,.56));position:relative;overflow:hidden}
.hotspots-hero::after{content:"";position:absolute;right:-120px;top:-140px;width:360px;height:360px;border-radius:50%;background:radial-gradient(circle,var(--ember-glow),transparent 62%);opacity:.42;pointer-events:none}
.hotspots h1{font-weight:800;font-size:clamp(40px,5.4vw,68px);line-height:1.02;letter-spacing:-.02em;max-width:12ch;margin-top:18px}
.hotspots .lede{margin-top:20px;max-width:72ch;color:var(--ink-dim);font-size:17px}
.hotspot-summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:30px;position:relative;z-index:1}
.hotspot-summary-grid div{border:1px solid var(--gold-ghost);border-radius:12px;padding:16px;background:rgba(6,4,16,.35)}
.hotspot-summary-grid b{display:block;font-size:28px;color:var(--gold)}
.hotspot-summary-grid span{display:block;color:var(--ink-dim);font-size:13px;margin-top:4px}
.hotspot-panel,.hotspot-flow>div,.hotspot-card{background:rgba(10,8,18,.58);border:1px solid var(--gold-ghost);border-radius:14px;padding:22px}
.hotspot-panel{margin-top:24px}
.hotspot-panel h2,.hotspot-flow h3,.hotspot-card h2{letter-spacing:-.01em}
.hotspot-panel p,.hotspot-card p,.hotspot-flow p{color:var(--ink-dim);margin-top:10px}
.hotspot-flow{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:20px}
.hotspot-index{display:flex;gap:10px;flex-wrap:wrap;margin:24px 0}
.hotspot-index a{font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);text-decoration:none;border:1px solid var(--gold-ghost);border-radius:999px;padding:8px 10px;background:rgba(212,169,78,.04)}
.hotspot-list{display:grid;gap:18px}
.hotspot-card-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap;margin-bottom:10px}
.hotspot-pills{display:flex;gap:8px;flex-wrap:wrap}
.hotspot-pill{font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);border:1px solid var(--gold-ghost);border-radius:999px;padding:5px 8px;background:rgba(212,169,78,.05)}
.hotspot-thesis{font-size:17px;color:var(--ink)!important;max-width:76ch}
.hotspot-metrics{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}
.hotspot-metrics span{font-family:var(--mono);font-size:11px;letter-spacing:.08em;color:var(--ink-dim);border:1px solid rgba(107,85,144,.35);border-radius:8px;padding:8px 10px;background:rgba(107,85,144,.08)}
.hotspot-metrics b{color:var(--gold);font-size:13px}
.hotspot-risk{border-left:2px solid var(--ember);padding:10px 12px;background:rgba(226,84,44,.06);border-radius:0 8px 8px 0;color:#e8a48d!important}
.atlas .searchrow{display:flex;gap:12px;margin-top:30px;max-width:560px}
.atlas .searchrow input{margin:0}
.atlas .searchrow .btn{width:auto;padding:0 24px}
.imports{padding:52px 0 34px}
.imports-head{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:24px}
.imports-head h1{font-weight:800;font-size:clamp(34px,4.4vw,54px);line-height:1.04;letter-spacing:-.01em;margin-top:10px}
.imports-head p{color:var(--ink-dim);max-width:62ch;margin-top:12px}
.imports-grid{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:24px;align-items:start}
.imports-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.imports-list{display:grid;gap:12px;margin-top:14px}
.import-source,.import-item{background:rgba(10,8,18,.55);border:1px solid var(--gold-ghost);border-radius:12px;padding:16px;position:relative}
.import-source h3,.import-item h3{font-size:16px;margin:8px 0 6px}
.import-source p,.import-item p{color:var(--ink-dim);font-size:14px}
.import-source code,.import-item code{font-family:var(--mono);font-size:11px;color:var(--gold);word-break:break-all}
.source-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
.source-actions .btn{width:auto;padding:10px 13px;font-size:10px;letter-spacing:.16em}
.imports-search{display:flex;gap:12px;margin:16px 0 12px}
.imports-search input{margin:0}
.imports-search .btn{width:auto;padding:0 20px}
.import-item .meta{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px}
.import-item .text{margin-top:10px;max-height:130px;overflow:auto;border-top:1px dashed var(--gold-ghost);padding-top:10px}
.import-status{font-family:var(--mono);font-size:11px;letter-spacing:.08em;color:var(--ink-dim);margin-top:12px;min-height:18px}
.seed-help{font-size:12px;color:var(--ink-dim);margin:-4px 0 12px}
.book-overlay{position:fixed;inset:0;z-index:50;display:none;align-items:center;justify-content:center;background:rgba(6,4,16,.86);backdrop-filter:blur(4px);padding:24px}
.book-overlay.open{display:flex;animation:bookIn .4s ease both}
@keyframes bookIn{from{opacity:0}to{opacity:1}}
.book-stage{position:relative;width:min(760px,94vw);max-height:90vh;background:linear-gradient(160deg,var(--void-2),rgba(18,13,30,.92));border:1px solid var(--gold-faint);border-radius:18px;padding:54px 48px 40px;box-shadow:0 40px 120px rgba(0,0,0,.6);overflow:hidden}
.book-stage::before{content:"";position:absolute;top:14px;left:14px;right:14px;bottom:14px;pointer-events:none;border:1px solid var(--gold-ghost);border-radius:12px}
.book-close{position:absolute;top:16px;right:18px;z-index:2;background:none;border:none;color:var(--ink-dim);font-size:18px;cursor:pointer;font-family:var(--mono)}
.book-close:hover{color:var(--gold)}
.book-pages{position:relative;min-height:300px}
.book-page{display:none;animation:pageIn .45s ease both}
.book-page.active{display:block}
@keyframes pageIn{from{opacity:0;transform:translateX(22px)}to{opacity:1;transform:none}}
.book-page .annot{display:block;margin-bottom:18px}
.book-page h2{font-weight:800;font-size:clamp(32px,5vw,54px);line-height:1.05;letter-spacing:-.01em;margin-bottom:20px}
.book-page h2 em{font-style:normal;color:var(--gold)}
.book-page p{color:var(--ink-dim);font-size:18px;max-width:54ch;margin-bottom:14px}
.book-page .book-foot{margin-top:24px;font-family:var(--mono);font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--gold)}
.book-page .btn{width:auto;padding:14px 28px;margin-top:10px}
.book-nav{display:flex;align-items:center;justify-content:center;gap:22px;margin-top:30px}
.book-arrow{width:42px;height:42px;border-radius:50%;border:1px solid var(--gold-faint);background:transparent;color:var(--gold);font-size:18px;cursor:pointer;transition:background .18s}
.book-arrow:hover:not(:disabled){background:var(--gold-ghost)}
.book-arrow:disabled{opacity:.3;cursor:default}
.book-dots{display:flex;gap:10px}
.book-dots i{width:8px;height:8px;border-radius:50%;background:var(--plum-dim);display:block;transition:background .2s}
.book-dots i.on{background:var(--gold);box-shadow:0 0 8px var(--gold)}
@media (max-width:600px){.book-stage{padding:46px 24px 34px}.book-page p{font-size:16px}}
.boarding{padding:48px 0 54px}
.boarding-plate{border:1px solid var(--gold-faint);border-radius:18px;padding:clamp(28px,5vw,64px);background:linear-gradient(165deg,rgba(18,13,30,.75),rgba(11,8,20,.4));position:relative}
.boarding-plate::before{content:"";position:absolute;inset:10px;pointer-events:none;border-radius:12px;border:1px dashed var(--gold-ghost)}
.boarding-head{max-width:60ch}
.boarding-head h1{font-weight:800;font-size:clamp(40px,5.4vw,64px);line-height:1.06;letter-spacing:.005em;word-spacing:.05em;margin:16px 0 18px}
.boarding-head p{color:var(--ink-dim);font-weight:300;font-size:18px;max-width:52ch}
.boarding-head p strong{color:var(--ink);font-weight:500}
.boarding-fork{margin:34px 0 10px}
.boarding-fork svg{width:100%;max-width:760px;height:auto;display:block}
.boarding-gates{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:8px;position:relative}
.boarding-gate{background:var(--void-2);border:1px solid var(--gold-ghost);border-radius:14px;padding:30px;position:relative;display:flex;flex-direction:column}
.boarding-gate::before{content:"";position:absolute;inset:8px;pointer-events:none;border-radius:9px;background:linear-gradient(var(--gold-faint),var(--gold-faint)) top left/10px 1px,linear-gradient(var(--gold-faint),var(--gold-faint)) top left/1px 10px,linear-gradient(var(--gold-faint),var(--gold-faint)) bottom right/10px 1px,linear-gradient(var(--gold-faint),var(--gold-faint)) bottom right/1px 10px;background-repeat:no-repeat}
.boarding-gate h2{margin-bottom:6px}
.boarding-gate .sub{color:var(--ink-dim);font-size:15px;margin-bottom:22px;font-weight:300}
.boarding-gate .sub strong{color:var(--ink);font-weight:500}
.boarding-gate.new{border-color:var(--gold-faint);background:linear-gradient(170deg,#171026,var(--void-2))}
.boarding-gate .note{font-family:var(--mono);font-size:11px;letter-spacing:.08em;color:var(--ink-dim);margin-top:14px}
.boarding-gate .fine{margin-top:auto;padding-top:18px;color:var(--ink-dim);font-size:13px;font-weight:300}
.codestep{display:none;margin-top:12px}
.boarding-gate.codesent .codestep{display:block}
.boarding-backrow{margin-top:34px;display:flex;align-items:center;flex-wrap:wrap;gap:16px}
.boarding-backrow a{color:var(--gold);font-family:var(--mono);font-size:11px;letter-spacing:.26em;text-transform:uppercase;text-decoration:underline;text-underline-offset:4px}
.boarding-backrow .annot{margin-left:auto}
@media (max-width:820px){.boarding-gates{grid-template-columns:1fr}}
@media (max-width:860px){
  .hero{grid-template-columns:1fr;gap:28px;padding:56px 0 36px;align-items:start}
  .hero-annot{position:static;display:block;margin-bottom:16px}
  .hero h1{font-size:clamp(40px,13vw,62px);line-height:1.03;letter-spacing:-.025em}
  .hero .lede{font-size:16px;margin-top:20px;max-width:44ch}
  .price-line{margin-top:26px;gap:10px}
  .price-line .price{font-size:38px}
  .orbfig{min-height:0;max-width:440px;margin:4px auto 0;width:100%}
  .orbfig figcaption{text-align:center;margin-top:8px}
}
@media (max-width:720px){
  .hero{padding:34px 0 28px;gap:20px}
  .hero h1{font-size:clamp(36px,15vw,54px)}
  .hero .lede{font-size:15.5px;line-height:1.55;margin-top:18px}
  .price-line{align-items:flex-start;flex-direction:column;margin-top:22px}
  .price-line .price{font-size:34px}
  .orbfig svg{max-height:300px;object-fit:contain}
  .orbfig figcaption{font-size:8px;letter-spacing:.14em;line-height:1.6}
  .boarding{padding:28px 0 32px}
  .boarding-plate{padding:22px 18px;border-radius:14px}
  .boarding-plate::before{inset:7px}
  .boarding-head h1{font-size:clamp(36px,14vw,52px)}
  .boarding-head p{font-size:15.5px;line-height:1.55}
  .boarding-fork{margin:24px -4px 6px;overflow:hidden}
  .boarding-gates{gap:16px}
  .boarding-gate{padding:20px 18px}
  .boarding-backrow{margin-top:24px;display:block}
  .boarding-backrow .annot{display:block;margin:12px 0 0}
  .diary{min-height:0}
  .diary-head{gap:8px;padding-bottom:12px}
  .diary-head .turns{margin-left:0;width:100%}
  .chatlog{max-height:none;min-height:260px;padding:18px 0;gap:12px}
  .msg{max-width:100%;font-size:14.5px;padding:12px 14px}
  .msg .who{font-size:9px;letter-spacing:.18em}
  .composer{flex-direction:column;gap:10px;padding-top:14px}
  .composer textarea{min-height:96px;width:100%}
  .composer .btn{width:100%;padding:12px 13px}
  .diary-tools{gap:10px;margin-top:12px}
  .diary-tools .btn{min-width:0;width:100%;flex-basis:100%}
  .veil{padding:20px;gap:10px}
  .veil .btn{width:100%;padding:12px 13px}
  .rail{display:grid;gap:18px}
  .atlas{padding:34px 0 24px}
  .atlas-head{display:block;margin-bottom:12px}
  .atlas-head h2{font-size:32px;line-height:1.05;margin-bottom:10px}
  .atlas-head .annot{margin-left:0}
  .heatmap-panel{padding:16px;margin-top:22px}
  .heatmap-head h3{font-size:18px}
  .heatmap-wrap{grid-template-columns:26px minmax(760px,1fr)}
  .heatmap-shapes{width:100%;margin-left:0}
  .starline{margin:4px -8px 0;overflow:hidden}
  .entries{grid-template-columns:1fr;gap:14px;margin-top:20px}
  .hotspot-summary-grid,.hotspot-flow{grid-template-columns:1fr}
  .hotspots h1{font-size:clamp(34px,13vw,54px)}
  .entry{padding:18px}
  .atlas .searchrow{flex-direction:column;gap:10px;margin-top:22px;max-width:none}
  .atlas .searchrow .btn{width:100%;padding:12px 13px}
  .imports{padding:30px 0 24px}
  .imports-grid{grid-template-columns:1fr;gap:18px}
  .imports-form-row{grid-template-columns:1fr;gap:0}
  .imports-search{flex-direction:column;gap:10px}
  .imports-search .btn,.source-actions .btn{width:100%;padding:12px 13px}
  .book-overlay{padding:12px;align-items:flex-start;overflow:auto}
  .book-stage{width:100%;max-height:none;margin-top:10px;padding:42px 18px 24px;border-radius:14px}
  .book-stage::before{inset:8px}
  .book-pages{min-height:0}
  .book-page h2{font-size:clamp(31px,11vw,44px)}
  .book-page p{font-size:15.5px;line-height:1.55}
  .book-page .btn{width:100%;padding:13px 14px}
  .book-nav{margin-top:22px;gap:14px}
}
`;

