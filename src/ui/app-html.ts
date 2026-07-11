export const appHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Hitchhiker's Guide to the Future</title>
<style>
:root{color-scheme:dark;--bg:#03040a;--panel:#0d111c;--ink:#f6efe2;--muted:rgba(246,239,226,.66);--dim:rgba(246,239,226,.42);--line:rgba(255,196,95,.24);--gold:#ffc45f;--gold2:#ffdf8b;--red:#ff6868;--green:#78e0b8}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 20% 12%,rgba(120,190,255,.16),transparent 28rem),radial-gradient(circle at 78% 18%,rgba(255,196,95,.16),transparent 26rem),linear-gradient(180deg,#050713,#03040a 52%,#010205);color:var(--ink);font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif}main{width:min(1240px,100%);margin:0 auto;padding:28px;display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:18px}.hero,.chat,.side,.diary{border:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.025)),rgba(10,13,23,.78);box-shadow:0 24px 80px rgba(0,0,0,.46);border-radius:24px}.hero{padding:26px}.eyebrow{display:inline-flex;gap:10px;align-items:center;margin:0 0 18px;padding:7px 11px;border:1px solid rgba(255,196,95,.25);border-radius:999px;color:var(--gold2);font:12px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase}.eyebrow:before{content:"";width:8px;height:8px;border-radius:50%;background:var(--red);box-shadow:0 0 18px var(--red)}h1{margin:0;font-size:clamp(38px,6vw,70px);line-height:.95;letter-spacing:-.055em;max-width:12ch}p{line-height:1.5;color:var(--muted)}.price{display:flex;align-items:baseline;gap:8px;margin-top:20px}.price strong{font-size:44px;letter-spacing:-.05em}.chat{grid-column:1;padding:0;overflow:hidden}.messages{height:430px;overflow:auto;padding:18px;display:flex;flex-direction:column;gap:12px}.bubble{max-width:82%;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:13px 15px;white-space:pre-wrap;line-height:1.45}.assistant{align-self:flex-start;background:rgba(255,196,95,.08)}.user{align-self:flex-end;background:rgba(120,190,255,.10)}.composer{border-top:1px solid var(--line);padding:14px;display:grid;grid-template-columns:1fr auto;gap:10px;background:rgba(0,0,0,.2)}textarea,input,select{width:100%;border:1px solid rgba(255,196,95,.25);background:#070a10;color:var(--ink);border-radius:14px;padding:12px;font:inherit}textarea{min-height:54px;resize:vertical}button{border:0;border-radius:14px;background:linear-gradient(180deg,var(--gold2),var(--gold));color:#180f02;font-weight:850;padding:11px 14px;cursor:pointer}.ghost{background:#172132;color:#dcecff;border:1px solid #314056}.side{padding:18px;display:flex;flex-direction:column;gap:14px}.card,.diary{padding:14px}.card{border:1px solid rgba(255,196,95,.18);border-radius:18px;background:rgba(255,196,95,.045)}.card h2,.diary h2{font-size:14px;margin:0 0 8px;text-transform:uppercase;letter-spacing:.12em;color:var(--gold2)}.fine{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--dim)}.request{display:grid;gap:8px}.pill{display:inline-block;border:1px solid rgba(120,224,184,.28);color:var(--green);border-radius:999px;padding:5px 9px;font:11px ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:uppercase;letter-spacing:.1em}.diary{grid-column:1 / -1}.diary-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.entry{border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px;background:rgba(0,0,0,.18);white-space:pre-wrap}@media(max-width:900px){main{grid-template-columns:1fr;padding:16px}.chat,.diary{grid-column:auto}.messages{height:390px}.diary-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<main>
  <section class="hero">
    <p class="eyebrow">Guide online // diary page active</p>
    <h1>Each day is a chat context.</h1>
    <p>The basic unit is a diary page: today’s chat stays together, then compresses into a searchable entry after the day ends.</p>
    <p>When a page needs slower judgment, send the chat log to the future. That queues delayed human review — 24 hours, 72 hours, or a week — so context can be added after the immediate momentum cools.</p>
    <div class="price"><strong>$42</strong><span>/ month. One plan.</span></div><p><button id="checkoutBtn" type="button">Start at $42/month</button></p><p class="fine" id="checkoutStatus">Stripe price: price_1Ts6ceGzXpChNrVvnNrQ44Ms</p>
  </section>

  <aside class="side">
    <div class="card"><h2>Diary page</h2><p class="fine" id="dayLabel">loading day…</p><p id="diaryStats">Today has 0 turns.</p><button class="ghost" id="compressBtn">Compress today into diary entry</button></div>
    <div class="card"><h2>Send chat log to the future</h2><div class="request"><select id="futureDelay"><option value="24h">24 hours</option><option value="72h">72 hours</option><option value="1w">1 week</option></select><textarea id="futureQuestion" placeholder="Optional: what should future analysis look for?"></textarea><button class="ghost" id="futureBtn">Send to the future</button><p class="fine" id="futureStatus">No future review queued yet.</p></div></div>
    <div class="card"><h2>Human context request</h2><div class="request"><textarea id="missingContext" placeholder="What should a human look up or add?"></textarea><select id="urgency"><option value="normal">normal</option><option value="soon">soon</option><option value="blocked">blocked</option></select><input id="contact" placeholder="optional contact / delivery note" /><button class="ghost" id="requestBtn">Request human context</button><p class="fine" id="requestStatus">No request sent yet.</p></div></div>
    <div class="card"><h2>Operator receipt</h2><p class="fine" id="receipt">session initializing…</p></div>
  </aside>

  <section class="chat">
    <div class="messages" id="messages"><div class="bubble assistant">Hi, I'm Leo. I'm a Hitchhiker to the Future, and I'm here to help. What are you curious about?</div></div>
    <form class="composer" id="chatForm"><textarea id="message" placeholder="Ask the Guide…"></textarea><button id="sendBtn" type="submit">Send</button></form>
  </section>

  <section class="diary">
    <h2>Searchable diary</h2>
    <div class="diary-grid"><div><input id="diarySearch" placeholder="Search compressed entries and chat logs…" /></div><div><button class="ghost" id="searchBtn">Search diary</button></div></div>
    <div id="entryOut" class="entry">No compressed entry yet.</div>
    <div id="searchOut"></div>
  </section>
</main>
<script>
const $=id=>document.getElementById(id);
const sessionId=localStorage.guideSessionId ||= crypto.randomUUID();
const today=new Date().toISOString().slice(0,10);
let lastUserMessage='';
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function add(role,text){const el=document.createElement('div');el.className='bubble '+role;el.textContent=text;$('messages').appendChild(el);$('messages').scrollTop=$('messages').scrollHeight;}
async function api(path,opts={}){const res=await fetch(path,{headers:{'content-type':'application/json'},...opts});if(!res.ok)throw new Error(await res.text());return res.json();}
function renderEntry(entry){$('entryOut').innerHTML=entry?'<b>'+esc(entry.title)+'</b>\n\n'+esc(entry.summary)+'\n\nOpen loops:\n- '+esc((entry.openLoops||[]).join('\n- ')):'No compressed entry yet.';}
async function refreshDiary(){const r=await api('/diary/'+today+'?sessionId='+encodeURIComponent(sessionId));$('dayLabel').textContent='Today: '+today+' // session '+sessionId.slice(0,8);$('diaryStats').textContent='Today has '+r.page.turns.length+' turns.';renderEntry(r.page.entry);}
$('receipt').textContent='session '+sessionId+' // diary page '+today+' // context requests are logged for operator review';
$('checkoutBtn').onclick=async()=>{try{$('checkoutStatus').textContent='Creating Stripe Checkout session…';const r=await api('/checkout/session',{method:'POST',body:JSON.stringify({sessionId,successUrl:location.origin+location.pathname+'?checkout=success',cancelUrl:location.origin+location.pathname+'?checkout=cancelled'})});if(r.checkout.url){location.href=r.checkout.url;return;}$('checkoutStatus').textContent=r.checkout.error||'Stripe is not configured yet.';}catch(err){$('checkoutStatus').textContent='Stripe checkout not ready: '+err.message;}};
$('chatForm').onsubmit=async e=>{e.preventDefault();const msg=$('message').value.trim();if(!msg)return;lastUserMessage=msg;$('message').value='';add('user',msg);$('sendBtn').disabled=true;try{const r=await api('/chat',{method:'POST',body:JSON.stringify({sessionId,message:msg,day:today})});add('assistant',r.answer);$('missingContext').value=r.contextPrompt;$('receipt').textContent=JSON.stringify(r.receipt);$('diaryStats').textContent='Today has '+r.diary.turnCount+' turns.';}catch(err){add('assistant','Error: '+err.message);}finally{$('sendBtn').disabled=false;}};
$('compressBtn').onclick=async()=>{try{const r=await api('/diary/'+today+'/compress',{method:'POST',body:JSON.stringify({sessionId})});renderEntry(r.entry);$('diaryStats').textContent='Compressed '+r.entry.turnCount+' turns into diary entry.';}catch(err){$('entryOut').textContent='Compression error: '+err.message;}};
$('futureBtn').onclick=async()=>{try{const r=await api('/future-analysis',{method:'POST',body:JSON.stringify({sessionId,day:today,delay:$('futureDelay').value,question:$('futureQuestion').value||undefined})});$('futureStatus').textContent='Queued '+r.request.id+' for '+r.request.delay+' delayed human review. Context request '+r.request.contextRequestId+' opened.';}catch(err){$('futureStatus').textContent='Future queue error: '+err.message;}};
$('requestBtn').onclick=async()=>{const missing=$('missingContext').value.trim();if(!missing){$('requestStatus').textContent='Name the missing context first.';return;}try{const r=await api('/context-requests',{method:'POST',body:JSON.stringify({sessionId,userMessage:lastUserMessage||'(manual context request)',missingContext:missing,urgency:$('urgency').value,contact:$('contact').value||undefined,source:'manual',diaryDay:today})});$('requestStatus').textContent='Request '+r.request.id+' logged. Human context can now be added without pretending the model knew it.';}catch(err){$('requestStatus').textContent='Error: '+err.message;}};
$('searchBtn').onclick=async()=>{try{const r=await api('/diary?query='+encodeURIComponent($('diarySearch').value));$('searchOut').innerHTML=r.pages.map(p=>'<div class="entry"><b>'+esc(p.day)+' — '+esc((p.entry&&p.entry.title)||'uncompressed')+'</b><p>'+esc((p.entry&&p.entry.summary)||('Raw turns: '+p.turns.length))+'</p></div>').join('')||'<p class="fine">No diary matches.</p>';}catch(err){$('searchOut').textContent='Search error: '+err.message;}};
refreshDiary().catch(err=>$('dayLabel').textContent=err.message);
</script>
</body>
</html>`;
