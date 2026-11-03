// Postcard renderer shared by the editor, the opening page and previews.
// Everything is drawn as HTML strings; user text always goes through esc().
let cur={s:{photoURL:'',message:''},t:null};
export const TEMPLATES=[
  {id:'classic',name:'Classic cream'},{id:'vintage',name:'Vintage deckle'},{id:'stamp',name:'Perforated'},
  {id:'letter',name:'Photo stamp'},{id:'cinema',name:'Movie night'},{id:'gig',name:'Gig poster'},
  {id:'stub',name:'Ticket stub'},{id:'date',name:'Save the date'},{id:'member',name:'Member ticket'}
];
export const TEMPLATE_IDS=TEMPLATES.map(t=>t.id);
export const MAX_MESSAGE=200;
export function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
/* ---------- card parts ---------- */
let pmId=0;
function postmark(kind){
  const id='pm'+(++pmId);
  const waves=[22,36,50,64].map(y=>{let d=`M0 ${y}`;for(let i=0;i<8;i++)d+=` q7.5 ${i%2?6:-6} 15 0`;return `<path d="${d}"/>`}).join('');
  const ring=kind==='waves'?'':`<circle cx="150" cy="45" r="37"/><circle cx="150" cy="45" r="29" stroke-width="1.4"/>
    <defs><path id="${id}" d="M150 45 m-33 0 a33 33 0 1 1 66 0 a33 33 0 1 1 -66 0"/></defs>
    <text font-size="8.5" letter-spacing="2.2"><textPath href="#${id}">POSTED WITH LOVE · POSTMARK ·</textPath></text>
    <text x="150" y="44" font-size="13" text-anchor="middle">${cur.t.day} ${cur.t.mon}</text>
    <text x="150" y="58" font-size="10" text-anchor="middle">${cur.t.year}</text>`;
  return `<svg class="pm" viewBox="0 0 200 90" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.2">${waves}${ring}</g></svg>`;
}
function stamp(){return `<div class="stamp"><div class="stamp-img" style="background-image:url('${cur.s.photoURL}')"></div><span class="stamp-val">1♥</span></div>`}
let wordCount=0;
function words(msg){
  let i=0;
  const html=esc(msg).split('\n').map(line=>line.split(/\s+/).filter(Boolean).map(w=>`<span class="w" style="--i:${i++}">${w}</span>`).join(' ')).join('<br>');
  wordCount=i;return html;
}
function msgSize(base){const n=cur.s.message.length;const k=n<60?1.18:n<110?1:n<160?.88:.8;return (base*k).toFixed(2)+'cqw'}

function now(s){
  let d=new Date(s&&s.sentAt?s.sentAt:Date.now());if(isNaN(d))d=new Date();
  let tz=s&&s.tz;try{if(tz)new Intl.DateTimeFormat('en',{timeZone:tz})}catch(e){tz=undefined}
  const o=tz?{timeZone:tz}:{};const f=(opt,loc='en')=>d.toLocaleString(loc,{...o,...opt});
  const day=+f({day:'numeric'});const ord=(day%10===1&&day!==11)?'st':(day%10===2&&day!==12)?'nd':(day%10===3&&day!==13)?'rd':'th';
  return {day,ord,year:+f({year:'numeric'}),mon:f({month:'short'}).toUpperCase(),month:f({month:'long'}),wd:f({weekday:'long'}),wds:f({weekday:'short'}).toUpperCase(),
    hm:d.toLocaleTimeString('en-GB',{...o,hour:'2-digit',minute:'2-digit'}),t12:d.toLocaleTimeString('en-US',{...o,hour:'numeric',minute:'2-digit'})}
}
let sealId=0;
function seal(text,center){const id='sl'+(++sealId);
  return `<div class="stamp seal"><svg viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="currentColor"><circle cx="50" cy="50" r="46" stroke-width="3"/><circle cx="50" cy="50" r="33" stroke-width="1.6"/></g>
  <defs><path id="${id}" d="M50 50 m-39.5 0 a39.5 39.5 0 1 1 79 0 a39.5 39.5 0 1 1 -79 0"/></defs>
  <text font-size="10" letter-spacing="2.2"><textPath href="#${id}">${text}</textPath></text>
  <text x="50" y="${center.length>1?56:60}" text-anchor="middle" font-size="${center.length>1?16:26}">${center}</text></svg></div>`}
function barcode(seed,dir){const r=mulberry(seed);let p=0,stops=[];while(p<100){const w=.8+r()*3.2,g=.8+r()*2.4;stops.push(`currentColor ${p.toFixed(1)}% ${(p+w).toFixed(1)}%`,`transparent ${(p+w).toFixed(1)}% ${(p+w+g).toFixed(1)}%`);p+=w+g}
  return `<div class="barcode" style="background:linear-gradient(${dir||'to bottom'},${stops.join(',')})"></div>`}
const ORN=`<svg viewBox="0 0 20 80" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M10 9 C2 14,2 22,10 26 S18 36,10 40 S2 50,10 54 S18 64,10 71"/><path d="M10 26c-3 3-6 1-5-2M10 40c3 3 6 1 5-2M10 54c-3 3-6 1-5-2"/><path d="M10 9c-2-4-6-2-4 1l4 4 4-4c2-3-2-5-4-1z" fill="currentColor"/><path d="M10 71c-2-4-6-2-4 1l4 4 4-4c2-3-2-5-4-1z" fill="currentColor"/><circle cx="4" cy="33" r="1" fill="currentColor"/><circle cx="16" cy="47" r="1" fill="currentColor"/><circle cx="4" cy="61" r="1" fill="currentColor"/></svg>`;

/* card outlines, drawn in a 300×200 box (the card is always 3:2) */
function concave(W,H,r,i){const R=r+i,a=Math.sqrt(R*R-i*i).toFixed(2);
  return `M${a} ${i}L${W-a} ${i}A${R} ${R} 0 0 0 ${W-i} ${a}L${W-i} ${H-a}A${R} ${R} 0 0 0 ${W-a} ${H-i}L${a} ${H-i}A${R} ${R} 0 0 0 ${i} ${H-a}L${i} ${a}A${R} ${R} 0 0 0 ${a} ${i}Z`}
function bites(cy,br,rc,scallop){const W=300,H=200;
  let bottom;
  if(scallop){const n=38,st=W/n;bottom=`V${H-4}`;for(let k=1;k<=n;k++)bottom+=`A${st/2} ${st/2} 0 0 1 ${(W-k*st).toFixed(2)} ${H-4}`;}
  else bottom=`V${H-rc}A${rc} ${rc} 0 0 1 ${W-rc} ${H}H${rc}A${rc} ${rc} 0 0 1 0 ${H-rc}`;
  return `M${rc} 0H${W-rc}A${rc} ${rc} 0 0 1 ${W} ${rc}V${cy-br}A${br} ${br} 0 0 0 ${W} ${cy+br}${bottom}V${cy+br}A${br} ${br} 0 0 0 0 ${cy-br}V${rc}A${rc} ${rc} 0 0 1 ${rc} 0Z`}
function torn(seed){const r=mulberry(seed);let d=`M0 ${(3+r()*4).toFixed(1)}`;
  for(let x=4;x<=300;x+=4)d+=`L${x} ${(1.5+r()*5+(r()<.08?3:0)).toFixed(1)}`;
  for(let x=300;x>=0;x-=4)d+=`L${x} ${(198.5-r()*5-(r()<.08?3:0)).toFixed(1)}`;return d+'Z'}
const SHAPES={cinema:()=>concave(300,200,20,0),date:()=>concave(300,200,14,0),stub:()=>bites(100,16,8),member:()=>bites(140,9,10,true),gig:i=>torn(21+i*9)};
function maskURL(d,W,H){return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}' preserveAspectRatio='none'><path d='${d}'/></svg>`)}")`}
function setMask(el,m){for(const p of ['maskImage','webkitMaskImage'])el.style[p]=m;for(const p of ['maskSize','webkitMaskSize'])el.style[p]='100% 100%';for(const p of ['maskRepeat','webkitMaskRepeat'])el.style[p]='no-repeat'}
function frame(paths){return `<svg class="frame" viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true">${paths.map(([d,w])=>`<path d="${d}" stroke-width="${w}"/>`).join('')}</svg>`}

function front(s){
  const bg=`background-image:url('${s.photoURL}')`;
  const photo=`<div class="photo" style="${bg}"></div>`;
  const box=(inner,isSeal)=>`<div class="stampbox${isSeal?' has-seal':''}">${inner}</div>`;
  const classicBox=box(stamp()+postmark(s.template==='classic'?'waves':'round'));
  switch(s.template){
    case 'vintage':return `<div class="face front">${photo}<div class="grain"></div>${classicBox}</div>`;
    case 'cinema':return `<div class="face front"><div class="grain"></div>${frame([[concave(300,200,20,7),1.6],[concave(300,200,20,11),.8]])}<div class="cin-photo" style="${bg}"></div>${box(seal('ADMIT ONE · ADMIT ONE · ','♥'),1)}</div>`;
    case 'gig':return `<div class="face front"><div class="halftone"></div>${photo}<div class="gig-box"></div>${box(seal('ONE NIGHT ONLY · ONE NIGHT ONLY · ','★'),1)}</div>`;
    case 'stub':return `<div class="face front"><div class="grain"></div><div class="stub-photo" style="${bg}"></div><div class="perf"></div>${barcode(5)}${box(seal('ADMIT ONE · ADMIT ONE · ','1'),1)}</div>`;
    case 'date':return `<div class="face front"><div class="grain"></div>${frame([[concave(300,200,14,6),1.2]])}${photo}${box(seal('SAVE THE DATE · SAVE THE DATE · ','♥'),1)}</div>`;
    case 'member':return `<div class="face front">${photo}<div class="mem-fade"></div><div class="mem-line"></div>${box(seal('MEMBER TICKET · MEMBER TICKET · ','★'),1)}</div>`;
    default:return `<div class="face front">${photo}${classicBox}</div>`;
  }
}
function back(s){
  const to=esc(s.to.trim()||'you'),from=esc(s.from.trim()||'me'),t=cur.t;
  const msg=words(s.message.trim()||'Thinking of you.');
  const after=`style="--after:${wordCount*55+500}ms"`;
  switch(s.template){
  case 'classic':return `<div class="face back">
    <div class="b-left"><div class="b-title">Thinking<br>of you</div><div class="b-sub">for ${to}</div></div>
    <div class="b-rule"></div>
    <div class="b-right">${postmark('waves')}<div class="b-msg" style="font-size:${msgSize(2.75)}">${msg}</div><div class="b-sign reveal" ${after}>— ${from}</div></div></div>`;
  case 'vintage':return `<div class="face back"><div class="grain"></div>
    <div class="b-left"><div class="b-head">DEAR ${to.toUpperCase()},</div><div class="b-msg" style="font-size:${msgSize(3.1)}">${msg}</div></div>
    <div class="b-rule"></div>
    <div class="b-right">${stamp()}${postmark('round')}<div class="b-sign reveal" ${after}>love, ${from}</div></div></div>`;
  case 'stamp':return `<div class="face back">
    <div class="b-msg" style="font-size:${msgSize(2.9)}">${msg}</div>
    <div class="b-rule"></div>
    <div class="b-right">${postmark('round')}<div class="ln">to ${to}</div><div class="ln">thinking of you</div><div class="ln reveal" ${after}>love, ${from}</div></div></div>`;
  case 'letter':return `<div class="face back">
    <div class="b-left"><div class="b-title">Post card for ${to}</div>
      <div class="b-field">From: <em>${from}</em></div><div class="b-field">Sent: <em>${t.day} ${t.mon}</em></div>
      <div class="seals">${postmark('round')}</div></div>
    <div class="b-right">${stamp()}${postmark('waves')}<div class="b-msg" style="font-size:${msgSize(4.6)}">${msg}</div></div></div>`;
  case 'cinema':return `<div class="face back"><div class="grain"></div>${frame([[concave(300,200,20,7),1.6],[concave(300,200,20,11),.8]])}
    <div class="cin-orn">${ORN}</div>
    <div class="cin-body"><div class="cin-msg" style="font-size:${msgSize(4.4)}">${msg}</div><div class="cin-time reveal" ${after}>${t.hm}</div><div class="cin-for reveal" ${after}>for ${to} · from ${from}</div></div>
    <div class="cin-orn">${ORN}</div></div>`;
  case 'gig':return `<div class="face back"><div class="halftone"></div><div class="gig-grid">
    <div class="g-row g-top"><div>${t.wds}<br>${t.day} ${t.mon}</div><div>A postcard for<br>${to}</div><div>Sent at<br>${t.hm}</div></div>
    <div class="g-main"><div class="g-msg" style="font-size:${msgSize(4.6)}">${msg}</div></div>
    <div class="g-row g-bot reveal" ${after}><div>From ${from}</div><div>★ One night only ★</div><div>Admit one</div></div></div></div>`;
  case 'stub':return `<div class="face back"><div class="grain"></div>
    <div class="stub-side"><span class="vtext">ADMIT ONE</span>${barcode(9)}</div><div class="perf"></div>
    <div class="stub-main"><div class="s-date">${t.wd} ${t.day} ${t.mon}</div><div class="s-title">For ${to}</div><div class="s-msg" style="font-size:${msgSize(3.5)}">${msg}</div><div class="s-from reveal" ${after}>From ${from}</div></div></div>`;
  case 'date':return `<div class="face back"><div class="grain"></div>${frame([[concave(300,200,14,6),1.2]])}
    <div class="d-strip">• SENT WITH LOVE · SENT WITH LOVE •</div>
    <div class="d-band"><span class="d-script">for ${to}</span></div>
    <div class="d-msg"><div style="font-size:${msgSize(3.7)}">${msg}</div></div>
    <div class="d-foot reveal" ${after}><div class="d-day"><i>${t.wd}</i><b>${t.mon} ${t.day}<sup>${t.ord}</sup></b></div><div class="d-from">with love,<br><b>${from}</b></div></div>
    <div class="d-strip">• SENT WITH LOVE · SENT WITH LOVE •</div></div>`;
  case 'member':return `<div class="face back">
    <div class="m-top"><span class="m-eyebrow">✦ Postcard · for ${to}</span><div class="m-msg" style="font-size:${msgSize(5.3)}">${msg}</div></div>
    <div class="m-line"></div>
    <div class="m-meta reveal" ${after}><div><small>DATE</small>${t.wd},<br>${t.month} ${t.day}</div><div><small>TIME</small>${t.t12}</div><div><small>FROM</small>${from}</div></div></div>`;
  }
}
function deckle(seed){
  const r=mulberry(seed);const p=[];const j=()=>r()*1.2;
  for(let x=0;x<=100;x+=1.6)p.push(`${x.toFixed(1)}% ${j().toFixed(2)}%`);
  for(let y=0;y<=100;y+=2.4)p.push(`${(100-j()*.67).toFixed(2)}% ${y.toFixed(1)}%`);
  for(let x=100;x>=0;x-=1.6)p.push(`${x.toFixed(1)}% ${(100-j()).toFixed(2)}%`);
  for(let y=100;y>=0;y-=2.4)p.push(`${(j()*.67).toFixed(2)}% ${y.toFixed(1)}%`);
  return `polygon(${p.join(',')})`;
}
function cardHTML(s,{flipped=false,frontOnly=false}={}){
  cur={s,t:now(s)};
  return `<div class="card t-${s.template}${flipped?' flipped':''}">${front(s)}${frontOnly?'':back(s)}</div>`;
}
const cinPhotoMask=maskURL(concave(268,168,14,0),268,168);
function mount(el,s,opts){
  el.innerHTML=cardHTML(s,opts);
  if(s.template==='vintage')el.querySelectorAll('.face').forEach((f,i)=>{const c=deckle(11+i*5);f.style.clipPath=c;f.style.webkitClipPath=c});
  const shape=SHAPES[s.template];
  if(shape)el.querySelectorAll('.face').forEach((f,i)=>setMask(f,maskURL(shape(i),300,200)));
  el.querySelectorAll('.cin-photo').forEach(p=>setMask(p,cinPhotoMask));
  return el.firstElementChild;
}
export function lastWordCount(){return wordCount}
export {cardHTML,mount,esc};
