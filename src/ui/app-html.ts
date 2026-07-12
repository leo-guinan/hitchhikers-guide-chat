import { pageShell } from './app-shell';

const entryBody = `
<section class="hero">
  <div>
    <span class="annot hero-annot">Expedition log <span class="dot">·</span> one traveler <span class="dot">·</span> one guide <span class="dot">·</span> T−∞ and counting</span>
    <h1>Each day is a <em>page</em>.<br>Every page points<br>at the same star.</h1>
    <p class="lede">
      The Guide keeps a diary with you — one chat context per day, compressed each night into
      an entry on the map. Wander with Leo, flag the days that drift too far, and when the
      Guide runs out of sky, ask a human to look something up.
    </p>
    <div class="price-line">
      <span class="price">$42</span>
      <span class="annot dim">/ month <span class="dot">·</span> one plan <span class="dot">·</span> the answer, obviously</span>
    </div>
  </div>
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
      <path d="M18 400 C 120 380, 170 330, 216 288 C 258 249, 292 210, 322 176" fill="none" stroke="#d4a94e" stroke-opacity=".6" stroke-dasharray="1 8" stroke-width="1.6" stroke-linecap="round"/>
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
  </figure>
</section>`;

const enterBody = `
<section class="boarding" aria-labelledby="boardingTitle">
  <div class="boarding-plate">
    <div class="boarding-head">
      <span class="annot">Boarding <span class="dot">·</span> two gates <span class="dot">·</span> one star</span>
      <h1 id="boardingTitle">Open the diary.</h1>
      <p>
        One plan, whole sky — <strong>$42/month</strong>. Been aboard before?
        Sign in on the left. New here? Pay the toll on the right and
        <strong>your account is created in the same motion</strong>.
        Both gates lead to the same place.
      </p>
    </div>

    <div class="boarding-fork" aria-hidden="true">
      <svg viewBox="0 0 760 120">
        <path d="M20 100 C 130 96, 200 80, 280 62" fill="none" stroke="#d4a94e" stroke-opacity=".55" stroke-dasharray="1 8" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M20 24 C 130 28, 200 44, 280 62" fill="none" stroke="#d4a94e" stroke-opacity=".55" stroke-dasharray="1 8" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M280 62 C 430 62, 560 62, 672 62" fill="none" stroke="#d4a94e" stroke-opacity=".55" stroke-dasharray="1 8" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="20" cy="24" r="4.5" fill="#d4a94e"/>
        <rect x="15.5" y="95.5" width="9" height="9" transform="rotate(45 20 100)" fill="#d4a94e"/>
        <circle cx="280" cy="62" r="3" fill="#eccb7e"/>
        <circle cx="700" cy="62" r="13" fill="#060410" stroke="#e2542c" stroke-width="1.5"/>
        <circle cx="700" cy="62" r="20" fill="none" stroke="#e2542c" stroke-opacity=".3" stroke-dasharray="2 5"/>
        <g font-family="'Space Mono',monospace" font-size="9" letter-spacing="2.5" fill="#d4a94e">
          <text x="34" y="20">RETURNING</text>
          <text x="34" y="112">NEW TRAVELER</text>
          <text x="640" y="98" fill="#e2542c">THE DIARY</text>
        </g>
      </svg>
    </div>

    <div class="boarding-gates">
      <section class="boarding-gate" id="gateReturn" aria-labelledby="returnTitle">
        <h2 class="annot" id="returnTitle">Gate I <span class="dot">·</span> Returning traveler</h2>
        <p class="sub">Already have an account? <strong>Sign in by starlight</strong> — we email you a code, no password to remember.</p>
        <label class="annot dim" for="email" hidden>Email</label>
        <input type="email" id="email" placeholder="you@example.com" autocomplete="email">
        <button class="btn" id="sendCode">Send sign-in code</button>
        <div class="codestep" id="codestep">
          <label class="annot dim" for="code" hidden>Code</label>
          <input type="text" id="code" inputmode="numeric" autocomplete="one-time-code" placeholder="6-digit code">
          <button class="btn solid" id="verifyBtn">Verify &amp; open the diary</button>
        </div>
        <p class="note" id="accStatus">Signed out.</p>
        <p class="fine">Your subscription is attached to your email. Sign in and today's page unseals.</p>
      </section>

      <section class="boarding-gate new" id="gateNew" aria-labelledby="newTitle">
        <h2 class="annot" id="newTitle">Gate II <span class="dot">·</span> New traveler</h2>
        <p class="sub">First time aboard? <strong>Pay the toll and your account is made</strong> — one step, no separate signup.</p>
        <label class="annot dim" for="email2" hidden>Email for your new account</label>
        <input type="email" id="email2" placeholder="you@example.com — becomes your account" autocomplete="email">
        <button class="btn solid" id="payBtn">Start at $42/month →</button>
        <p class="note">checkout by stripe <span class="dot">·</span> cancel anytime</p>
        <p class="note" id="payStatus" style="margin-top:8px">No toll paid yet.</p>
        <p class="fine">The Atlas and every diary entry stay yours. A sign-in code arrives after checkout.</p>
      </section>
    </div>

    <div class="boarding-backrow">
      <a href="/">← Back to the cover</a>
      <span class="annot dim">mostly harmless <span class="dot">·</span> don't forget your towel</span>
    </div>
  </div>
</section>`;

const appBody = `
<div class="grid">
  <main>
    <section class="panel diary gated" aria-labelledby="todayTitle">
      <div class="diary-head">
        <span class="annot" id="todayTitle">Today's page <span class="dot">·</span> <span id="diaryDate">—</span></span>
        <span class="annot dim turns"><span id="turnCount">0</span> turns logged</span>
      </div>
      <div class="chatlog" id="chatlog" aria-live="polite">
        <div class="msg guide"><span class="who">Leo · the guide</span>Hi, I'm Leo. I'm a Hitchhiker to the Future, and I'm here to help. This page is blank so far — what are you curious about?</div>
      </div>
      <form class="composer" id="composer">
        <textarea id="ask" placeholder="Ask the Guide…"></textarea>
        <button type="submit" class="btn solid">Send</button>
      </form>
      <div class="diary-tools">
        <button class="btn ghost" id="compressBtn">Compress today into a diary entry</button>
        <a class="btn ghost" href="/search" style="text-decoration:none">Open the Atlas →</a>
      </div>
      <div class="veil" id="veil">
        <span class="annot ember">Sealed page <span class="dot">·</span> account gated</span>
        <p>Today's chat context is behind the gate. <a href="/enter">Open the diary</a> to sign in and subscribe.</p>
        <a class="btn solid" href="/enter" id="veilBtn">Start at $42/month</a>
      </div>
    </section>
  </main>

  <aside class="rail">
    ${futurePanelToday()}
    ${humanPanelToday()}
    ${receiptPanelToday()}
  </aside>
</div>

<script>
(async function(){
  const today=new Date().toISOString().slice(0,10);
  $('diaryDate').textContent=fmtDate(today);
  async function loadDiary(){
    if(!account) return;
    try{
      const r=await api('/diary/today',{method:'GET'});
      $('diaryDate').textContent=fmtDate(r.page.day);
      $('turnCount').textContent=r.page.turns.length;
    }catch(e){}
  }
  await refreshMe();
  if(!account||!account.paid){ location.href='/enter'; return; }
  if(account&&account.paid) await loadDiary();
  $('composer').addEventListener('submit',async e=>{
    e.preventDefault();
    const box=$('ask'); const text=box.value.trim(); if(!text) return;
    if(!account||!account.paid){ location.href='/enter'; return; }
    addMsg('you','You',text); box.value=''; lastUserMessage=text;
    try{
      const r=await api('/chat',{method:'POST',body:JSON.stringify({sessionId,message:text,day:today})});
      addMsg('guide','Leo · the guide',r.answer);
      $('diaryDate').textContent=fmtDate(r.diary.day);
      $('turnCount').textContent=r.diary.turnCount;
      if(r.receipt) $('receipt').innerHTML='session  <b>'+r.receipt.sessionId+'</b>\\npage     <b>'+fmtDate(r.diary.day)+'</b>\\ngate     <b>open</b>\\ncontext  <b>'+(r.receipt.contextPrompt?'flagged':'clear')+'</b>';
    }catch(err){ addMsg('guide','Leo · the guide','Error: '+err.message); }
  });
  $('compressBtn').addEventListener('click',async()=>{
    if(!account||!account.paid){ location.href='/enter'; return; }
    try{ const r=await api('/diary/'+today+'/compress',{method:'POST',body:JSON.stringify({sessionId})}); $('compressBtn').textContent='Compressed '+r.entry.turnCount+' turns into entry '+r.entry.id; }catch(err){ $('compressBtn').textContent='Compression error: '+err.message; }
  });
  function addMsg(cls,who,text){
    const d=document.createElement('div'); d.className='msg '+cls;
    const w=document.createElement('span'); w.className='who'; w.textContent=who; d.appendChild(w);
    d.appendChild(document.createTextNode(text));
    $('chatlog').appendChild(d); $('chatlog').scrollTop=$('chatlog').scrollHeight;
    const n=parseInt($('turnCount').textContent||'0',10)+1; $('turnCount').textContent=n;
  }
})();
</script>`;

const atlasBody = `
<section class="atlas" id="atlas" aria-labelledby="atlasTitle">
  <div class="atlas-head">
    <h2 id="atlasTitle">The Atlas of previous pages</h2>
    <span class="annot dim" id="atlasMeta">— entries charted <span class="dot">·</span> — flares</span>
  </div>
  <p style="color:var(--ink-dim);max-width:62ch">
    Every compressed day becomes a waypoint on the line. <span style="color:#e8a48d">Ember flares</span> mark
    hot days — pages where the conversation drifted a bit far from the safe orbit, worth revisiting.
  </p>
  <div class="starline" aria-hidden="true">
    <svg viewBox="0 0 1180 150">
      <path d="M20 118 C 220 96, 420 122, 600 92 C 780 62, 960 84, 1120 46" fill="none" stroke="#d4a94e" stroke-opacity=".5" stroke-dasharray="1 8" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="1146" cy="40" r="14" fill="#060410" stroke="#e2542c" stroke-width="1.4"/>
      <circle cx="1146" cy="40" r="21" fill="none" stroke="#e2542c" stroke-opacity=".3" stroke-dasharray="2 5"/>
      <g id="waypoints"></g>
    </svg>
  </div>
  <div class="entries" id="entries"></div>
  <form class="searchrow" id="searchForm">
    <input type="text" id="searchDiary" placeholder="Search the diary — a word, a date, a hunch">
    <button type="submit" class="btn">Search</button>
  </form>
  <a class="annot dim" href="/app" style="display:block;margin-top:18px">← back to today's page</a>
</section>

<script>
(async function(){
  await refreshMe();
  if(!account||!account.paid){ location.href='/enter'; return; }
  const entriesEl=$('entries'); const metaEl=$('atlasMeta');
  async function load(q){
    entriesEl.innerHTML='';
    let pages=[];
    try{ const r=await api('/diary'+(q?'?query='+encodeURIComponent(q):''),{method:'GET'}); pages=r.pages; }
    catch(e){ entriesEl.innerHTML='<p class="annot ember">Search needs a paid account. <a href="/enter">Open the diary</a>.</p>'; return; }
    const total=pages.length; let flares=0;
    pages.forEach(p=>{
      const e=p.entry;
      const isHot=!!(p.contextRequests&&p.contextRequests.length)|| (e&&/flare|hot|drift/i.test(e.summary||''));
      if(isHot) flares++;
      const a=document.createElement('a'); a.className='entry'+(isHot?' hot':''); a.href='#';
      const title=e?.title||('Day '+fmtDate(p.day));
      const summary=e?.summary||(p.turns.length?('Raw page, '+p.turns.length+' turns, not yet compressed.'):'Blank page.');
      a.innerHTML='<span class="annot">'+fmtDate(p.day)+(isHot?' <span class="dot">·</span> flare':'')+'</span><h3></h3><p></p>'+(isHot?'<div class="hotnote">HOT DAY · drifted past safe orbit · operator note: worth a second pass with a human aboard</div>':'');
      a.querySelector('h3').textContent=title; a.querySelector('p').textContent=summary;
      entriesEl.appendChild(a);
    });
    metaEl.innerHTML=total+' entries charted <span class="dot">·</span> '+flares+' flares';
  }
  await load('');
  $('searchForm').addEventListener('submit',async e=>{ e.preventDefault(); const q=$('searchDiary').value.trim(); await load(q); });
})();
</script>`;

function futurePanelToday() {
  return `<section class="panel" aria-labelledby="futTitle"><h2 class="annot" id="futTitle">Send chat log to the future</h2><select id="window"><option value="24h">Last 24 hours</option><option value="72h">Last 72 hours</option><option value="1w">Last 7 days</option><option value="all">This entire diary</option></select><textarea id="futureNote" placeholder="Optional: what should future analysis look for?"></textarea><button class="btn" id="futureBtn">Send to the future</button><p class="note" id="futureStatus">No future review queued yet.</p></section>`;
}
function humanPanelToday() {
  return `<section class="panel" id="human" aria-labelledby="humTitle"><h2 class="annot" id="humTitle">Human context request</h2><p style="color:var(--ink-dim);font-size:14.5px;margin-bottom:16px">When the Guide's chart runs out, a human operator can look something up or add context to your diary.</p><textarea id="humanAsk" placeholder="What should a human look up or add?"></textarea><select id="urgency"><option value="normal">Normal orbit</option><option value="soon">Elevated · this week</option><option value="blocked">Flare · as soon as a human wakes</option></select><input type="text" id="contact" placeholder="Optional contact / delivery note"><button class="btn" id="humanBtn">Request human context</button><p class="note" id="humanStatus">No request sent yet. Requests are logged for operator review.</p></section>`;
}
function receiptPanelToday() {
  return `<section class="panel receipt" aria-labelledby="rcTitle"><h2 class="annot" id="rcTitle">Operator receipt</h2><pre id="receipt">session  <b>—</b>\npage     <b>—</b>\ngate     <b>locked</b>\nrequests logged for operator review</pre></section>`;
}

export const appHtml = pageShell('today', entryBody, '');
export const enterHtml = pageShell('enter', enterBody, '');
export const appPageHtml = pageShell('today', appBody, '');
export const searchHtml = pageShell('atlas', atlasBody, '');
