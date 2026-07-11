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
    <a class="cta" href="/">Open the diary</a>
  </nav>
</header>`;

const footerHtml = `
<footer>
  <span class="annot dim">chart plate 01 <span class="dot">·</span> destination RA 17h 45m · DEC −29° 00′ <span class="dot">·</span> printed 2026.07.11</span>
  <span class="annot dim right">mostly harmless <span class="dot">·</span> don't forget your towel</span>
</footer>`;

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
      <span class="annot dim">/ month <span class="dot">·</span> one plan <span class="dot">·</span> the answer, obviously</span>
    </div>
  </div>
  ${orbfigSvg}
</section>`;

const accountPanel = `
<section class="panel" id="account" aria-labelledby="accTitle">
  <h2 class="annot" id="accTitle">Account <span class="dot">·</span> sign-in by starlight</h2>
  <input type="email" id="email" placeholder="you@example.com" autocomplete="email">
  <button class="btn" id="sendCode">Send sign-in code</button>
  <div style="height:12px"></div>
  <input type="text" id="code" inputmode="numeric" placeholder="6-digit code">
  <button class="btn ghost" id="verifyBtn">Verify email</button>
  <p class="note" id="accStatus">Signed out.</p>
</section>`;

const payPanel = `
<section class="panel" aria-labelledby="payTitle">
  <h2 class="annot" id="payTitle">Paywall <span class="dot">·</span> the toll</h2>
  <p style="color:var(--ink-dim);font-size:14.5px;margin-bottom:16px">Sign in first, then subscribe. One plan, whole sky.</p>
  <button class="btn solid" id="payBtn">Start at $42/month</button>
  <p class="note">stripe price: price_1Ts6ceGzXpChNrVvnNrQ44Ms</p>
</section>`;

const futurePanel = `
<section class="panel" aria-labelledby="futTitle">
  <h2 class="annot" id="futTitle">Send chat log to the future</h2>
  <select id="window">
    <option value="24h">Last 24 hours</option>
    <option value="72h">Last 72 hours</option>
    <option value="1w">Last 7 days</option>
    <option value="all">This entire diary</option>
  </select>
  <textarea id="futureNote" placeholder="Optional: what should future analysis look for?"></textarea>
  <button class="btn" id="futureBtn">Send to the future</button>
  <p class="note" id="futureStatus">No future review queued yet.</p>
</section>`;

const humanPanel = `
<section class="panel" id="human" aria-labelledby="humTitle">
  <h2 class="annot" id="humTitle">Human context request</h2>
  <p style="color:var(--ink-dim);font-size:14.5px;margin-bottom:16px">
    When the Guide's chart runs out, a human operator can look something up
    or add context to your diary.
  </p>
  <textarea id="humanAsk" placeholder="What should a human look up or add?"></textarea>
  <select id="urgency">
    <option value="normal">Normal orbit</option>
    <option value="soon">Elevated · this week</option>
    <option value="blocked">Flare · as soon as a human wakes</option>
  </select>
  <input type="text" id="contact" placeholder="Optional contact / delivery note">
  <button class="btn" id="humanBtn">Request human context</button>
  <p class="note" id="humanStatus">No request sent yet. Requests are logged for operator review.</p>
</section>`;

const receiptPanel = `
<section class="panel receipt" aria-labelledby="rcTitle">
  <h2 class="annot" id="rcTitle">Operator receipt</h2>
  <pre id="receipt">session  <b>—</b>
page     <b>—</b>
gate     <b>locked</b>
requests logged for operator review</pre>
</section>`;

const sharedScript = `
const $=id=>document.getElementById(id);
const sessionId=localStorage.guideSessionId ||= crypto.randomUUID();
const today=new Date().toISOString().slice(0,10);
let token=localStorage.guideAuthToken||'';let account=null;
function authHeaders(){return token?{authorization:'Bearer '+token}:{};}
function fmtDate(iso){return iso?iso.replace(/-/g,'.'):'—';}
async function api(path,opts={}){const res=await fetch(path,{headers:{'content-type':'application/json',...authHeaders(),...(opts.headers||{})},...opts});const text=await res.text();const data=text?JSON.parse(text):{};if(!res.ok)throw new Error(data.error||text||res.statusText);return data;}
function setStatus(el,msg,ember){el.textContent=msg;el.style.color=ember?'#e8a48d':'';}
function setGate(){const signed=!!account;const paid=!!account?.paid;$('accStatus').textContent=signed?account.email+' // '+(paid?'paid':'unpaid'):'Signed out.';$('payStatus') && ($('payStatus').textContent=paid?'Paid account active. Diary open.':'Signed in. Subscribe to unseal the diary.');const veil=$('veil');if(veil)veil.style.display=(paid?'none':'flex');if($('composer')){$('composer').style.opacity=paid?1:.4;$('composer').style.pointerEvents=paid?'auto':'none';}const pay=$('payBtn');if(pay)pay.disabled=!signed||paid;if($('receipt')){$('receipt').innerHTML='session  <b>'+sessionId+'</b>\\npage     <b>'+fmtDate(today)+'</b>\\ngate     <b>'+(paid?'open':'locked')+'</b>\\nrequests logged for operator review';}}
async function refreshMe(){try{const r=await api('/auth/me',{method:'GET'});account=r.account;setGate();}catch{account=null;setGate();}}
$('sendCode').onclick=async()=>{const em=$('email').value.trim();if(!em){setStatus($('accStatus'),'Enter an email first — the code needs somewhere to land.',true);return;}try{const r=await api('/auth/request-code',{method:'POST',body:JSON.stringify({email:em})});setStatus($('accStatus'),'Code sent. Dev code: '+(r.devCode||'check your inbox'));}catch(err){setStatus($('accStatus'),'Auth error: '+err.message,true);}};
$('verifyBtn').onclick=async()=>{const em=$('email').value.trim();const co=$('code').value.trim();if(co.trim().length<6){setStatus($('accStatus'),'That code is short a few digits.',true);return;}try{const r=await api('/auth/verify',{method:'POST',body:JSON.stringify({email:em,code:co})});token=r.token;localStorage.guideAuthToken=token;account=r.account;setGate();}catch(err){setStatus($('accStatus'),'Verify error: '+err.message,true);}};
$('payBtn').onclick=async()=>{if(!account){setStatus($('accStatus'),'Sign in first, then subscribe.',true);$('email').focus();return;}try{$('payBtn').textContent='Creating Checkout…';const r=await api('/checkout/session',{method:'POST',body:JSON.stringify({sessionId,successUrl:location.origin+'/?checkout=success',cancelUrl:location.origin+'/?checkout=cancelled'})});if(r.checkout.url){location.href=r.checkout.url;return;}$('payBtn').textContent='Start at $42/month';setStatus($('accStatus'),r.checkout.error||'Stripe is not configured yet.',true);}catch(err){$('payBtn').textContent='Start at $42/month';setStatus($('accStatus'),'Stripe checkout not ready: '+err.message,true);}};
$('futureBtn').onclick=async()=>{try{const r=await api('/future-analysis',{method:'POST',body:JSON.stringify({sessionId,day:today,delay:delayFor($('window').value),question:$('futureNote').value||undefined})});setStatus($('futureStatus'),'Queued '+r.request.id+' ('+$('window').value+') for delayed human review.');}catch(err){setStatus($('futureStatus'),'Future queue error: '+err.message,true);}};
function delayFor(v){return v==='24h'?'24h':v==='72h'?'72h':v==='1w'?'1w':'all';}
$('humanBtn').onclick=async()=>{const q=$('humanAsk').value.trim();if(!q){setStatus($('humanStatus'),'Tell the human what to look up first.',true);return;}try{const r=await api('/context-requests',{method:'POST',body:JSON.stringify({sessionId,userMessage:lastUserMessage||'(manual context request)',missingContext:q,urgency:$('urgency').value,contact:$('contact').value||undefined,source:'manual',diaryDay:today})});setStatus($('humanStatus'),'Request '+r.request.id+' logged ('+$('urgency').value+'). An operator will pick it up.');}catch(err){setStatus($('humanStatus'),'Error: '+err.message,true);}};
let lastUserMessage='';
setGate();refreshMe();
`;

export function pageShell(activeNav: string, bodyHtml: string, script: string): string {
  const field = `<div class="field" aria-hidden="true">${fieldSvg}</div>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hitchhiker's Guide to the Future</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet"><style>${themeCss}</style><style>${extraCss}</style></head><body>${field}<div class="wrap">${headerHtml}${bodyHtml}${footerHtml}</div><script>${sharedScript}${script}</script></body></html>`;
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
.orbfig figcaption{position:absolute;bottom:-4px;right:0;text-align:right}
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
.starline{position:relative;margin:10px 0 6px}
.starline svg{width:100%;height:auto;display:block}
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
.atlas .searchrow{display:flex;gap:12px;margin-top:30px;max-width:560px}
.atlas .searchrow input{margin:0}
.atlas .searchrow .btn{width:auto;padding:0 24px}
@media (max-width:980px){.hero{grid-template-columns:1fr;padding-top:64px}.orbfig{max-width:420px;margin:0 auto}}
`;
