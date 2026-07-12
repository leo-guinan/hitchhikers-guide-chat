export const themeCss = `
:root{
  --void:#0b0814; --void-2:#120d1e; --void-3:#181129;
  --gold:#d4a94e; --gold-bright:#eccb7e; --gold-faint:rgba(212,169,78,.26); --gold-ghost:rgba(212,169,78,.10);
  --ember:#e2542c; --ember-glow:rgba(226,84,44,.35);
  --plum:#6b5590; --plum-dim:#3a2f55;
  --ink:#eae2d0; --ink-dim:#9d92ae;
  --mono:'Space Mono',ui-monospace,monospace;
  --sans:'Archivo',system-ui,sans-serif;
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{
  background:var(--void); color:var(--ink); font-family:var(--sans);
  font-size:16px; line-height:1.55; overflow-x:hidden;
}
::selection{background:var(--gold);color:var(--void)}
.field{position:fixed;inset:0;z-index:0;pointer-events:none;
  background:
    radial-gradient(1100px 700px at 85% 12%, rgba(107,85,144,.14), transparent 60%),
    radial-gradient(900px 900px at 8% 90%, rgba(58,47,85,.22), transparent 55%),
    var(--void);
}
.field svg{position:absolute;inset:0;width:100%;height:100%}
.wrap{position:relative;z-index:1;max-width:1240px;margin:0 auto;padding:0 28px}
.annot{font-family:var(--mono);font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:var(--gold)}
.annot .dot{color:var(--gold-faint);padding:0 .35em}
.annot.dim{color:var(--ink-dim)}
.annot.ember{color:var(--ember)}
header{display:flex;align-items:center;gap:18px;flex-wrap:wrap;padding:26px 0 22px;border-bottom:1px solid var(--gold-ghost)}
.sigil{width:38px;height:38px;flex:none}
header .name{font-family:var(--mono);font-weight:700;font-size:12px;letter-spacing:.34em;text-transform:uppercase;color:var(--ink)}
header nav{margin-left:auto;display:flex;gap:22px;align-items:center;flex-wrap:wrap}
header nav a{color:var(--ink-dim);text-decoration:none;font-family:var(--mono);font-size:11px;letter-spacing:.24em;text-transform:uppercase}
header nav a:hover{color:var(--gold)}
header nav a.cta{color:var(--gold);border:1px solid var(--gold-faint);border-radius:8px;padding:9px 14px}
header nav a.cta:hover{background:var(--gold-ghost)}
.pip{width:7px;height:7px;border-radius:50%;background:var(--gold);box-shadow:0 0 8px var(--gold);animation:pulse 3.2s ease-in-out infinite}
@keyframes pulse{50%{opacity:.35}}
.panel{background:linear-gradient(160deg,var(--void-2),rgba(18,13,30,.6));border:1px solid var(--gold-ghost);border-radius:14px;padding:24px;position:relative}
.panel::before{content:"";position:absolute;inset:8px;pointer-events:none;border-radius:9px;
  background:
    linear-gradient(var(--gold-faint),var(--gold-faint)) top left/10px 1px,
    linear-gradient(var(--gold-faint),var(--gold-faint)) top left/1px 10px,
    linear-gradient(var(--gold-faint),var(--gold-faint)) bottom right/10px 1px,
    linear-gradient(var(--gold-faint),var(--gold-faint)) bottom right/1px 10px;
  background-repeat:no-repeat}
.panel h2{margin-bottom:16px}
.panel .annot{display:block}
.panel + .panel{margin-top:22px}
.panel .note{font-family:var(--mono);font-size:11px;letter-spacing:.08em;color:var(--ink-dim);margin-top:12px}
input[type=email],input[type=text],textarea,select{
  width:100%;background:rgba(10,8,18,.8);border:1px solid var(--plum-dim);border-radius:9px;
  color:var(--ink);font-family:var(--sans);font-size:15px;padding:12px 14px;margin-bottom:12px;
}
textarea{resize:vertical;min-height:72px}
input::placeholder,textarea::placeholder{color:#5f5673}
input:focus-visible,textarea:focus-visible,select:focus-visible,button:focus-visible,a:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;border:1px solid var(--gold);border-radius:9px;background:transparent;color:var(--gold);font-family:var(--mono);font-size:12px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;padding:13px 16px;cursor:pointer;transition:background .18s,color .18s,box-shadow .18s}
.btn:hover{background:var(--gold-ghost)}
.btn.solid{background:var(--gold);color:var(--void)}
.btn.solid:hover{background:var(--gold-bright);box-shadow:0 0 24px rgba(212,169,78,.25)}
.btn.ghost{border-color:var(--plum-dim);color:var(--ink-dim)}
.btn.ghost:hover{border-color:var(--gold-faint);color:var(--gold)}
.btn + .btn,input + .btn{margin-top:2px}
.grid{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:26px;padding-bottom:40px}
.rail>.panel+.panel{margin-top:22px}
.receipt pre{font-family:var(--mono);font-size:11px;line-height:1.7;letter-spacing:.04em;color:var(--ink-dim);white-space:pre-wrap;word-break:break-all}
.receipt pre b{color:var(--gold);font-weight:400}
footer{border-top:1px solid var(--gold-ghost);padding:34px 0 44px;margin-top:30px;display:flex;gap:16px;flex-wrap:wrap;align-items:center}
footer .annot{font-size:10px}
footer .right{margin-left:auto}
@media (max-width:980px){.grid{grid-template-columns:1fr}}
@media (max-width:720px){
  body{font-size:15px;line-height:1.5}
  .wrap{padding:0 16px;max-width:none}
  .field svg{opacity:.55}
  .annot{font-size:9px;letter-spacing:.18em;line-height:1.7}
  .annot .dot{padding:0 .2em}
  header{padding:18px 0 14px;gap:10px;align-items:flex-start}
  .sigil{width:30px;height:30px}
  header .name{font-size:10px;letter-spacing:.18em;line-height:1.45;max-width:calc(100% - 44px)}
  header nav{width:100%;margin-left:0;gap:8px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
  header nav a{font-size:9px;letter-spacing:.16em;text-align:center;border:1px solid var(--gold-ghost);border-radius:8px;padding:9px 8px;background:rgba(18,13,30,.42)}
  header nav a.cta{padding:9px 8px}
  .panel{padding:18px;border-radius:12px}
  .panel::before{inset:6px}
  input[type=email],input[type=text],textarea,select{font-size:16px;padding:12px;margin-bottom:10px}
  .btn{font-size:10px;letter-spacing:.16em;padding:12px 13px;min-height:44px}
  .grid{gap:18px;padding-bottom:22px}
  footer{display:none}
}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}html{scroll-behavior:auto}}
`;
