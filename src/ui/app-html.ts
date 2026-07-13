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
        <a class="btn ghost" href="/imports" style="text-decoration:none">Import old work →</a>
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
      trackGuideEvent('Guide Chat Sent');
      const r=await api('/chat',{method:'POST',body:JSON.stringify({sessionId,message:text,day:today})});
      addMsg('guide','Leo · the guide',r.answer);
      $('diaryDate').textContent=fmtDate(r.diary.day);
      $('turnCount').textContent=r.diary.turnCount;
      if(r.receipt) $('receipt').innerHTML='session  <b>'+r.receipt.sessionId+'</b>\\npage     <b>'+fmtDate(r.diary.day)+'</b>\\ngate     <b>open</b>\\ncontext  <b>'+(r.receipt.contextPrompt?'flagged':'clear')+'</b>';
    }catch(err){ addMsg('guide','Leo · the guide','Error: '+err.message); }
  });
  $('compressBtn').addEventListener('click',async()=>{
    if(!account||!account.paid){ location.href='/enter'; return; }
    try{ trackGuideEvent('Guide Diary Compressed'); const r=await api('/diary/'+today+'/compress',{method:'POST',body:JSON.stringify({sessionId})}); $('compressBtn').textContent='Compressed '+r.entry.turnCount+' turns into entry '+r.entry.id; }catch(err){ $('compressBtn').textContent='Compression error: '+err.message; }
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
  <section class="heatmap-panel" aria-labelledby="heatmapTitle">
    <div class="heatmap-head">
      <div>
        <span class="annot">Log shape calendar <span class="dot">·</span> one square per day</span>
        <h3 id="heatmapTitle">The shape of the log over time.</h3>
      </div>
      <span class="annot dim" id="heatmapMeta">— active days <span class="dot">·</span> — turns</span>
    </div>
    <div class="heatmap-wrap" role="img" aria-label="Calendar heat map of diary activity">
      <div class="heatmap-months" id="heatmapMonths"></div>
      <div class="heatmap-axis" aria-hidden="true"><span>Mon</span><span>Wed</span><span>Fri</span></div>
      <div class="heatmap-grid" id="heatmapGrid"></div>
    </div>
    <div class="heatmap-foot">
      <span class="annot dim">less</span>
      <span class="heatkey l0"></span><span class="heatkey l1"></span><span class="heatkey l2"></span><span class="heatkey l3"></span><span class="heatkey l4"></span>
      <span class="annot dim">more</span>
      <span class="annot dim heatmap-shapes">shape: blank · note · conversation · import · analysis · mixed</span>
    </div>
  </section>
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
  async function loadHeatmap(){
    try{
      const r=await api('/diary/heatmap?weeks=53',{method:'GET'});
      renderHeatmap(r.heatmap);
    }catch(e){
      $('heatmapGrid').innerHTML='<p class="annot ember">Heatmap unavailable: '+e.message+'</p>';
    }
  }
  function renderHeatmap(h){
    const grid=$('heatmapGrid'); const months=$('heatmapMonths'); const meta=$('heatmapMeta');
    grid.innerHTML=''; months.innerHTML='';
    const cells=h.cells||[];
    const byMonth=[]; let last='';
    cells.forEach(function(c,i){
      const month=c.day.slice(0,7);
      if(month!==last){byMonth.push({month:month,week:Math.floor(i/7)}); last=month;}
      const d=document.createElement('button');
      d.type='button'; d.className='heatcell l'+c.level+' shape-'+c.shape;
      d.title=c.day+' · '+c.shape+' · heat '+c.heatScore+' · '+c.turnCount+' turns · '+c.charCount+' chars · '+c.questionCount+' questions'+(c.entryCompressed?' · compressed':'');
      d.setAttribute('aria-label',d.title);
      d.onclick=function(){ $('searchDiary').value=c.day; load(c.day); };
      grid.appendChild(d);
    });
    byMonth.forEach(function(m){
      const s=document.createElement('span'); s.textContent=monthName(m.month); s.style.gridColumn=(m.week+1)+' / span 4'; months.appendChild(s);
    });
    meta.innerHTML=h.totals.activeDays+' active days <span class="dot">·</span> '+h.totals.turns+' turns <span class="dot">·</span> '+h.totals.flares+' flares';
  }
  function monthName(ym){return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(ym.slice(5,7))-1]||ym;}
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
  await loadHeatmap();
  await load('');
  $('searchForm').addEventListener('submit',async e=>{ e.preventDefault(); const q=$('searchDiary').value.trim(); await load(q); });
})();
</script>`;

const importsBody = `
<section class="imports" id="imports" aria-labelledby="importsTitle">
  <div class="imports-head">
    <div>
      <span class="annot">Guide accounts <span class="dot">·</span> imports <span class="dot">·</span> provenance first</span>
      <h1 id="importsTitle">Bring the old work aboard.</h1>
      <p>Medium, Substack, Ghost, YouTube, RSS, generic URLs, and X archive JSON all become account-owned artifacts. The import is not the memory; the receipt is.</p>
    </div>
    <a class="btn ghost" href="/app" style="width:auto;text-decoration:none">← Today's page</a>
  </div>

  <div class="imports-grid">
    <section class="panel" aria-labelledby="addSourceTitle">
      <h2 class="annot" id="addSourceTitle">Add import source</h2>
      <div class="imports-form-row">
        <select id="importKind" aria-label="Import type">
          <option value="rss">RSS / Atom feed</option>
          <option value="substack">Substack</option>
          <option value="ghost">Ghost blog</option>
          <option value="generic_url">Single URL</option>
          <option value="youtube_feed">YouTube feed</option>
          <option value="x_archive_json">X archive JSON seed</option>
        </select>
        <input type="text" id="importLabel" placeholder="Label — e.g. White Mirror, Medium, @hitchhiker">
      </div>
      <input type="text" id="importUrl" placeholder="URL — feed, publication, post, blog, or YouTube feed">
      <input type="text" id="importHandle" placeholder="Optional handle / channel id — e.g. UC..., username, substack slug">
      <textarea id="importSeed" placeholder='Optional JSON seed for X/archive imports: [{"externalId":"1","url":"https://x.com/...","title":"...","text":"...","createdAt":"2026-01-01"}]'></textarea>
      <p class="seed-help">For X/Twitter, start with archive/export JSON. Live API can come later; paid reads are a meter, not a memory.</p>
      <button class="btn solid" id="addImportSource">Add source</button>
      <p class="import-status" id="importCreateStatus">No source added yet.</p>
    </section>

    <section class="panel" aria-labelledby="sourcesTitle">
      <h2 class="annot" id="sourcesTitle">Sources</h2>
      <p class="note">Run imports manually. A source that cannot fetch reports failure; it should not pretend the void produced content.</p>
      <div class="imports-list" id="importSources"></div>
    </section>
  </div>

  <section class="panel" style="margin-top:24px" aria-labelledby="itemsTitle">
    <div class="atlas-head" style="margin-bottom:0">
      <h2 id="itemsTitle">Imported artifacts</h2>
      <span class="annot dim" id="importsMeta">— items aboard</span>
    </div>
    <form class="imports-search" id="importSearchForm">
      <input type="text" id="importSearch" placeholder="Search imported posts, essays, transcripts, tweets">
      <button type="submit" class="btn">Search</button>
    </form>
    <div class="imports-list" id="importItems"></div>
  </section>
</section>

<script>
(async function(){
  await refreshMe();
  if(!account||!account.paid){ location.href='/enter'; return; }
  const sourcesEl=$('importSources');
  const itemsEl=$('importItems');
  const metaEl=$('importsMeta');
  const createStatus=$('importCreateStatus');
  let sources=[];

  function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function short(v,n){v=String(v||'');return v.length>n?v.slice(0,n-1)+'…':v;}
  function sourceDescriptor(s){return s.url||s.handle||'manual seed';}
  function readSeed(){
    const raw=$('importSeed').value.trim();
    if(!raw) return undefined;
    const parsed=JSON.parse(raw);
    if(!Array.isArray(parsed)) throw new Error('Seed JSON must be an array of items.');
    return parsed.map(function(item){return {externalId:item.externalId,url:item.url,title:item.title,text:item.text,createdAt:item.createdAt};});
  }
  function sourcePayload(){
    const payload={kind:$('importKind').value,label:$('importLabel').value.trim()};
    const url=$('importUrl').value.trim();
    const handle=$('importHandle').value.trim();
    const items=readSeed();
    if(url) payload.url=url;
    if(handle) payload.handle=handle;
    if(items&&items.length) payload.items=items;
    return payload;
  }

  async function loadSources(){
    const r=await api('/imports/sources',{method:'GET'});
    sources=r.sources||[];
    renderSources();
  }
  async function loadItems(q){
    const r=await api('/imports/items?limit=50'+(q?'&query='+encodeURIComponent(q):''),{method:'GET'});
    renderItems(r.items||[]);
  }
  function renderSources(){
    sourcesEl.innerHTML='';
    if(!sources.length){sourcesEl.innerHTML='<p class="annot dim">No sources yet. Add the first one on the left.</p>';return;}
    sources.forEach(function(s){
      const node=document.createElement('article');
      node.className='import-source';
      const last=s.lastRun?('last run: '+s.lastRun.imported+' imported · '+s.lastRun.skipped+' skipped · '+s.lastRun.failed+' failed'):'not run yet';
      node.innerHTML='<span class="annot">'+esc(s.kind)+'</span><h3>'+esc(s.label)+'</h3><p><code>'+esc(sourceDescriptor(s))+'</code></p><p>'+esc(last)+'</p><div class="source-actions"><button class="btn run-source" data-id="'+esc(s.id)+'">Run import</button><button class="btn ghost filter-source" data-id="'+esc(s.id)+'">Show items</button></div><p class="import-status" id="status-'+esc(s.id)+'"></p>';
      sourcesEl.appendChild(node);
    });
    sourcesEl.querySelectorAll('.run-source').forEach(function(btn){btn.addEventListener('click',async function(){await runSource(btn.dataset.id);});});
    sourcesEl.querySelectorAll('.filter-source').forEach(function(btn){btn.addEventListener('click',async function(){await loadItemsForSource(btn.dataset.id);});});
  }
  async function runSource(id){
    const status=$('status-'+id);
    setStatus(status,'Running import…');
    try{
      const r=await api('/imports/sources/'+id+'/run',{method:'POST',body:JSON.stringify({limit:50})});
      setStatus(status,'Imported '+r.summary.imported+' · skipped '+r.summary.skipped+' · failed '+r.summary.failed,!!r.summary.failed);
      await loadSources(); await loadItems($('importSearch').value.trim());
    }catch(err){setStatus(status,'Import error: '+err.message,true);}
  }
  async function loadItemsForSource(id){
    const r=await api('/imports/items?limit=50&sourceId='+encodeURIComponent(id),{method:'GET'});
    renderItems(r.items||[]);
  }
  function renderItems(items){
    itemsEl.innerHTML='';
    if(metaEl)metaEl.innerHTML=items.length+' items aboard';
    if(!items.length){itemsEl.innerHTML='<p class="annot dim">No imported artifacts match yet.</p>';return;}
    items.forEach(function(item){
      const node=document.createElement('article');
      node.className='import-item';
      const href=item.url?'<a class="annot dim" href="'+esc(item.url)+'" target="_blank" rel="noreferrer">open source ↗</a>':'';
      node.innerHTML='<div class="meta"><span class="annot">'+esc(item.sourceKind)+'</span><span class="annot dim">'+esc(item.day)+'</span><span class="annot dim">'+esc(item.wordCount)+' words</span>'+href+'</div><h3>'+esc(item.title)+'</h3><p><code>'+esc(item.sourceLabel)+'</code></p><p class="text">'+esc(short(item.text,900))+'</p>';
      itemsEl.appendChild(node);
    });
  }

  $('addImportSource').addEventListener('click',async function(){
    try{
      const payload=sourcePayload();
      if(!payload.label) throw new Error('Label is required.');
      if(!payload.url&&!payload.handle&&!(payload.items&&payload.items.length)) throw new Error('Add a URL, handle, or JSON seed.');
      setStatus(createStatus,'Adding source…');
      const r=await api('/imports/sources',{method:'POST',body:JSON.stringify(payload)});
      setStatus(createStatus,'Added '+r.source.label+'. Run it when ready.');
      $('importLabel').value=''; $('importUrl').value=''; $('importHandle').value=''; $('importSeed').value='';
      await loadSources();
    }catch(err){setStatus(createStatus,'Source error: '+err.message,true);}
  });
  $('importSearchForm').addEventListener('submit',async function(e){e.preventDefault();await loadItems($('importSearch').value.trim());});
  await loadSources();
  await loadItems('');
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
export const importsHtml = pageShell('imports', importsBody, '');
