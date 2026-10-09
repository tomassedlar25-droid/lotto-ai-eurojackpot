import {RELEASE,HISTORY_URL,parseCsv,toCsv,mergeDraws,frequency,ranking,generateTickets,backtest} from './core.mjs';
const $=id=>document.getElementById(id);
const STORE='lotto-ai-eurojackpot-history-v1';
let draws=[],historyShown=12,toastTimer=null,generated=null,generationCounter=0;
const dateCZ=iso=>iso?new Intl.DateTimeFormat('cs-CZ',{day:'numeric',month:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(iso+'T12:00:00Z')):'—';
const comma=n=>new Intl.NumberFormat('cs-CZ').format(n);
const balls=(values,euro=false)=>values.map(x=>`<span class="ball${euro?' euro':''}">${x}</span>`).join('');
const ticketBalls=(m,e)=>`${balls(m)}<span class="ball-sep">+</span>${balls(e,true)}`;
const settings=()=>({strategy:$('strategy').value,count:Number($('ticketCount').value),pool:Number($('pool').value),filter:$('positionalFilter').checked,maxOverlap:Number($('maxOverlap').value)});
function toast(message,error=false){const el=$('toast');el.textContent=message;el.className='toast visible'+(error?' error':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.className='toast',5000);}
function getSaved(){try{return localStorage.getItem(STORE);}catch{return null;}}
function clearSaved(){try{localStorage.removeItem(STORE);}catch{}}
function store(){try{localStorage.setItem(STORE,toCsv(draws));return true;}catch{toast('Úložiště prohlížeče je plné nebo zakázané. Exportuj CSV.',true);return false;}}
function setData(data,notify){draws=data;store();renderAll();if(notify)toast(notify);}
function renderAll(){
 const last=draws.at(-1),first=draws[0];
 $('heroCount').textContent=comma(draws.length);$('heroLatest').textContent=last?dateCZ(last.date):'—';
 $('statDraws').textContent=comma(draws.length);$('statSpan').textContent=first?`${dateCZ(first.date)} – ${dateCZ(last.date)}`:'Žádná data';
 $('statDate').textContent=last?dateCZ(last.date):'—';$('latestTitle').textContent=last?dateCZ(last.date):'Žádná losování';
 $('latestBalls').innerHTML=last?ticketBalls(last.main,last.euro):'<span class="fine-print">Importuj výsledky losování.</span>';
 $('archiveCount').textContent=`${comma(draws.length)} uložených losování`;
 $('archiveRange').textContent=first?`${dateCZ(first.date)} – ${dateCZ(last.date)}`:'Zatím bez historie';
 $('connectBadge').textContent=draws.length?'● DATA READY':'● ČEKÁ NA DATA';
 renderStats();renderHistory();
}
function renderStats(){
 if(!draws.length){$('mainFrequency').textContent='Zatím žádná data.';$('euroFrequency').textContent='—';return;}
 const p=Number($('periodSelect').value),count=Math.min(draws.length,p);
 const freq=frequency(draws,'main',count).sort((a,b)=>b.count-a.count||a.num-b.num).slice(0,8);
 const max=freq[0]?.count||1;
 $('mainFrequency').innerHTML=freq.map(o=>`<div class="bar-item"><strong class="bar-num">${o.num}</strong><div class="bar-track"><div class="bar-fill" style="width:${o.count/max*100}%"></div></div><span class="bar-value">${o.count}×</span></div>`).join('');
 const euros=frequency(draws,'euro',count);
 $('euroFrequency').innerHTML=euros.map(o=>`<div class="euro-stat"><strong>${o.num}</strong><span class="${o.ratio>1.1?'high':o.ratio<.9?'low':''}">${o.expected?Math.round(o.ratio*100)+' %':'—'}</span></div>`).join('');
}
function renderHistory(){
 const show=draws.slice(-historyShown).reverse();$('shownCount').textContent=`${show.length} / ${draws.length}`;
 $('historyList').innerHTML=show.map(d=>`<div class="history-item"><time datetime="${d.date}">${dateCZ(d.date)}</time><div class="ball-row">${ticketBalls(d.main,d.euro)}</div></div>`).join('')||'<p class="body-copy">Žádné záznamy. Importuj CSV.</p>';
 $('showMore').style.display=historyShown>=draws.length?'none':'flex';
}
function showTab(name){document.querySelectorAll('.tab').forEach(b=>{const active=b.dataset.tab===name;b.classList.toggle('active',active);b.setAttribute('aria-current',active?'page':'false');});document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===name));window.scrollTo({top:190,behavior:'smooth'});}
function generate(){try{
 generated=generateTickets(draws,{...settings(),seed:++generationCounter});const config=settings();
 $('ticketResults').innerHTML=`<div class="result-head"><div><h3>Vygenerované kombinace</h3><p>${config.strategy==='trend'?'Trend Z 5/75':config.strategy==='antitrend'?'Antitrend Z 5/75':config.strategy==='frequency'?'Četnost':'Náhodná metoda'} · ${generated.tickets.length} sloupců</p></div><button class="btn mini" id="downloadTickets" type="button">↓ Uložit</button></div>
 ${generated.tickets.map((t,i)=>`<div class="ticket"><div class="ticket-index">${String(i+1).padStart(2,'0')}</div><div class="ticket-balls">${ticketBalls(t.main,t.euro)}</div></div>`).join('')}
 <div class="panel"><div class="eyebrow">MODEL A OMEZENÍ</div><div class="ticket-meta"><strong>Kandidáti:</strong> ${generated.candidates.join(', ')}<br><strong>Euro dvojice:</strong> ${generated.euroPairs.map(p=>p.join(' + ')).join(' / ')}<br><strong>Vyřazeno:</strong> ${generated.blacklist.length?generated.blacklist.join(', '):'nic'}</div><div class="fine-print">${generated.overlapWarnings?`U ${generated.overlapWarnings} kombinací nebylo možné splnit limit překryvu; počet kandidátů nebo limit je příliš přísný.`:'Všechny kombinace dodržují nastavený maximální překryv.'} Euročísla vycházejí z četností posledních 15 tahů. Jde o experiment, nikoliv předpověď s ověřenou výhodou.</div></div>`;
 $('downloadTickets').addEventListener('click',()=>download('lotto-ai-tikety.txt',`LOTTO AI • ${draws.at(-1).date}\nStrategie: ${config.strategy}\n`+generated.tickets.map((t,i)=>`${i+1}. ${t.main.join(' ')} | ${t.euro.join(' ')}`).join('\n')+'\n','text/plain;charset=utf-8'));
 toast('Tikety připravené – bez záruky výhry.');
 }catch(e){toast(e.message,true);}}
function evaluateHTML(name,stats,drawCount,columnCount,highlight){
 const sum=Object.values(stats.tiers).reduce((a,b)=>a+b,0);
 return `<div class="compare-card${highlight?' highlight':''}"><div class="eyebrow">${name}</div><div class="headline">${stats.threePlus}</div><div class="label">tiketů s 3+ hlavními čísly</div><div class="subline"><strong>${sum}</strong> zásahů výherní třídy<br><strong>${stats.drawsWithPrize}/${drawCount}</strong> tahů s výherní třídou<br><strong>${(stats.totalMain/(drawCount*columnCount)).toFixed(2)}</strong> hlavních zásahů / tiket</div></div>`;
}
function runTest(){const btn=$('runBacktest');btn.disabled=true;btn.textContent='Probíhá simulace…';
 setTimeout(()=>{try{
 const s={...settings(),count:Number($('backtestTickets').value),testDraws:Number($('backtestCount').value)};
 const r=backtest(draws,s);
 const tiers=[['5+2',1],['5+1',2],['5+0',3],['4+2',4],['4+1',5],['3+2',6],['4+0',7],['2+2',8],['3+1',9],['3+0',10],['1+2',11],['2+1',12]];
 $('backtestResults').innerHTML=`<div class="result-head"><div><h3>Výsledek ${r.tested} losování</h3><p>${dateCZ(r.first)} – ${dateCZ(r.last)} · ${r.columns} tiketů na tah</p></div><span class="pill">Bez úniku dat</span></div><div class="comparisons">${evaluateHTML('VYBRANÝ MODEL',r.model,r.tested,r.columns,true)}${evaluateHTML('NÁHODNÝ BENCHMARK',r.baseline,r.tested,r.columns,false)}</div><article class="panel"><h3>Vyhodnocení výherních tříd</h3><div class="table-scroller"><table class="results-table"><thead><tr><th>Třída</th><th>Model</th><th>Náhoda</th></tr></thead><tbody>${tiers.map(([title,k])=>`<tr><td>${title}</td><td class="model">${r.model.tiers[k]||0}</td><td>${r.baseline.tiers[k]||0}</td></tr>`).join('')}</tbody></table></div></article><article class="panel soft"><h3>Jak test funguje</h3><p class="body-copy">Pro každé z ${r.tested} testovaných losování vzniklo ${r.columns} tiketů pouze z dřívějších výsledků. Random benchmark používá stejný počet sloupců a aktuální pravidla 5/50 + 2/12. Náhodná odchylka mezi oběma metodami nepředstavuje důkaz predikční výhody.</p><div class="fine-print">${r.warnings?'U modelu '+r.warnings+' sloupců nebyl splněn požadovaný překryv. ':''}Výherní třída neznamená kladný zisk. Nejsou započítány ceny tiketů ani proměnlivé výplaty.</div></article>`;
 toast('Walk-forward test dokončen.');
 }catch(e){toast(e.message,true);}finally{btn.disabled=false;btn.textContent='▥ Spustit backtest';}},35);
}
function download(filename,content,mime='text/csv;charset=utf-8'){const blob=new Blob([content],{type:mime});const link=document.createElement('a');const href=URL.createObjectURL(blob);link.href=href;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(href),600);}
async function importFile(file){try{if(!file)return;const parsed=parseCsv(await file.text());if(!parsed.draws.length)throw Error('CSV neobsahuje platná losování.');const merged=mergeDraws(draws,parsed.draws);setData(merged.draws,`Import: ${parsed.draws.length} platných řádků, ${merged.added} nových, ${parsed.invalid} odmítnutých.`);}catch(e){toast(e.message,true);}finally{$('fileInput').value='';}}
async function refresh(silent=false){try{
 if(!silent)toast('Stahuji veřejný archiv…');
 const res=await fetch(HISTORY_URL,{cache:'no-store'});if(!res.ok)throw Error('Server neodpovídá: '+res.status);
 const parsed=parseCsv(await res.text());if(parsed.draws.length<100)throw Error('Vzdálený archiv neobsahuje dostatek losování.');
 const merged=mergeDraws(draws,parsed.draws);
 if(merged.added||merged.changed||!draws.length)setData(merged.draws,silent?null:`Načteno ${parsed.draws.length} řádků, ${merged.added} nových.`);
 else if(!silent)toast('Archiv je aktuální.');
 }catch(e){if(!silent)toast('Stažení se nezdařilo. Použij import CSV. '+e.message,true);}}
function manualAdd(){try{
 const date=$('manualDate').value,parts=$('manualNumbers').value.split('|');if(parts.length!==2)throw Error('Odděl hlavní čísla od euročísel znakem |.');
 const main=parts[0].match(/\d+/g)||[],euro=parts[1].match(/\d+/g)||[];
 if(main.length!==5||euro.length!==2)throw Error('Zadej 5 hlavních čísel a 2 euročísla.');
 const parsed=parseCsv(`${date},${main.join(',')},${euro.join(',')}`);if(!parsed.draws.length)throw Error('Neplatné datum, čísla nebo duplicity.');
 const merged=mergeDraws(draws,parsed.draws);setData(merged.draws,merged.added?'Výsledek přidán.':'Výsledek pro toto datum byl upraven.');$('manualNumbers').value='';$('addDrawForm').classList.add('hidden');
 }catch(e){toast(e.message,true);}}
async function boot(){
 document.querySelectorAll('.tab').forEach(el=>el.addEventListener('click',()=>showTab(el.dataset.tab)));
 $('periodSelect').addEventListener('change',renderStats);
 $('generateBtn').addEventListener('click',generate);
 $('runBacktest').addEventListener('click',runTest);
 $('refreshData').addEventListener('click',()=>refresh(false));
 $('refreshFromOverview').addEventListener('click',()=>refresh(false));
 $('fileInput').addEventListener('change',e=>importFile(e.target.files[0]));
 $('exportData').addEventListener('click',()=>download('eurojackpot-moje-historie.csv',toCsv(draws)));
 $('toggleAdd').addEventListener('click',()=>$('addDrawForm').classList.toggle('hidden'));
 $('saveManual').addEventListener('click',manualAdd);
 $('showMore').addEventListener('click',()=>{historyShown+=20;renderHistory();});
 $('resetData').addEventListener('click',async()=>{if(!confirm('Opravdu smazat lokální úpravy a vrátit výchozí archiv?'))return;clearSaved();const fallback=await loadBundled();draws=fallback;renderAll();toast('Výchozí archiv obnoven.');});
 try{
  let local=getSaved();if(local){try{draws=parseCsv(local).draws;}catch{clearSaved();}}
  if(!draws.length)draws=await loadBundled();
  renderAll();
  if(navigator.onLine!==false)refresh(true);
 }catch(e){toast('Nelze načíst data: '+e.message,true);renderAll();}
 if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
}
async function loadBundled(){
 if(typeof window.BUNDLED_CSV==='string')return parseCsv(window.BUNDLED_CSV).draws;
 const response=await fetch('./data/eurojackpot.csv');if(!response.ok)throw Error('Chybí lokální historie.');return parseCsv(await response.text()).draws;
}
boot();
