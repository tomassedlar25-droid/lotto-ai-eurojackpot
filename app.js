import {RELEASE,HISTORY_URL,parseCsv,toCsv,mergeDraws,frequency,ranking,generateTickets,backtestAsync,compareStrategiesAsync,monteCarloBenchmarks,financeFromBacktest,parsePayoutCsv,evaluateSavedSet} from './core.mjs';
const $=id=>document.getElementById(id);
const STORE='lotto-ai-eurojackpot-history-v1';
const SAVED='lotto-ai-eurojackpot-tickets-v2', AUTO='lotto-ai-autoupdate-v2', PAYOUT_STORE='lotto-ai-eurojackpot-payouts-v21';
let savedSets=[],payouts={},lastBacktest=null,lastBacktestModel=null;
let draws=[],historyShown=12,toastTimer=null,generated=null,generationCounter=0;
const dateCZ=iso=>iso?new Intl.DateTimeFormat('cs-CZ',{day:'numeric',month:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(iso+'T12:00:00Z')):'—';
const comma=n=>new Intl.NumberFormat('cs-CZ').format(n);
const balls=(values,euro=false)=>values.map(x=>`<span class="ball${euro?' euro':''}">${x}</span>`).join('');
const ticketBalls=(m,e)=>`${balls(m)}<span class="ball-sep">+</span>${balls(e,true)}`;
const markedBalls=(values,winning,euro=false)=>values.map(n=>`<span class="ball${euro?' euro':''}${winning?.includes(n)?' hit':''}${winning&&!winning.includes(n)?' miss':''}" aria-label="${n}${winning?.includes(n)?', zásah':''}">${n}</span>`).join('');
const markedTicket=(ticket,draw)=>`${markedBalls(ticket.main,draw?.main)}<span class="ball-sep">+</span>${markedBalls(ticket.euro,draw?.euro,true)}`;
const payCZ=n=>new Intl.NumberFormat('cs-CZ',{style:'currency',currency:'CZK',maximumFractionDigits:2}).format(n);
const countWin=tickets=>tickets.reduce((sum,t)=>sum+(t.tier?1:0),0);
const parseNums=(text,max)=>{
 const raw=String(text||'').trim();if(!raw)return [];
 if(!/^[\d,;\s]+$/.test(raw))throw Error('Čísla odděluj mezerami nebo čárkami.');
 const nums=raw.split(/[\s,;]+/).filter(Boolean).map(Number);
 if(nums.some(x=>!Number.isInteger(x)||x<1||x>max))throw Error('Čísla musí být v rozsahu 1–'+max+'.');
 return [...new Set(nums)];
};
const labels={ensemble:'LOTTO Ensemble AI',trend:'Trend Z 5/75',antitrend:'Antitrend Z 5/75',frequency:'Četnost',random:'Náhoda'};
const settings=()=>({strategy:$('strategy').value,count:Number($('ticketCount').value),pool:Number($('pool').value),filter:$('positionalFilter').checked,maxOverlap:Number($('maxOverlap').value),excludeLast:$('excludeLast').checked,manualExclude:parseNums($('manualExclude').value,50),euroMode:$('euroMode').value,fixedEuro:$('euroMode').value==='fixed'?parseNums($('fixedEuro').value,12):[]});
function loadSets(){try{const value=JSON.parse(localStorage.getItem(SAVED)||'[]');if(Array.isArray(value))savedSets=value.filter(s=>/^\d{4}-\d\d-\d\d$/.test(s.asOf)&&Array.isArray(s.tickets)&&s.tickets.every(t=>t.main?.length===5&&t.euro?.length===2)).slice(-100);}catch{savedSets=[];}}
function persistSets(){try{localStorage.setItem(SAVED,JSON.stringify(savedSets));return true;}catch{toast('Nelze uložit sestavy, exportuj si je.',true);return false;}}

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
 renderStats();renderHistory();renderSavedTickets();
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
 const config=settings();generated=generateTickets(draws,{...config,seed:++generationCounter});
 $('ticketResults').innerHTML=`<div class="result-head"><div><h3>Vygenerované kombinace</h3><p>${labels[config.strategy]||'Model'} · ${generated.tickets.length} sloupců</p></div><button class="btn mini" id="downloadTickets" type="button">↓ TXT</button></div>
 ${generated.tickets.map((t,i)=>`<div class="ticket"><div class="ticket-index">${String(i+1).padStart(2,'0')}</div><div class="ticket-balls">${ticketBalls(t.main,t.euro)}</div></div>`).join('')}
 <button class="btn primary wide" id="saveTicketSet" type="button">▤ Uložit sestavu pro další losování</button>
 <article class="panel"><div class="eyebrow">MODEL A OMEZENÍ</div><div class="ticket-meta"><strong>Kandidáti:</strong> ${generated.candidates.join(', ')}<br><strong>Euro dvojice:</strong> ${generated.euroPairs.map(p=>p.join(' + ')).join(' / ')}<br><strong>Vyřazeno:</strong> ${generated.blacklist.length?generated.blacklist.join(', '):'nic'}${generated.weights?'<br><strong>Váhy Ensemble:</strong> '+Object.entries(generated.weights).map(([k,v])=>`${labels[k]} ${Math.round(v*100)} %`).join(' · '):''}</div><div class="fine-print">${generated.overlapWarnings?`U ${generated.overlapWarnings} kombinací nebylo možné dodržet maximální překryv. Zvětši pool, uprav limit nebo vypni část filtrů.`:'Všechny kombinace dodržují limit překryvu.'} Frekvence euročísel vychází z posledních 15 tahů, pokud nepoužiješ vlastní dvojici. Nejde o spolehlivou předpověď.</div></article>`;
 $('downloadTickets').addEventListener('click',()=>download('lotto-ai-tikety.txt',`LOTTO AI • ${draws.at(-1).date}\nStrategie: ${config.strategy}\n`+generated.tickets.map((t,i)=>`${i+1}. ${t.main.join(' ')} | ${t.euro.join(' ')}`).join('\n')+'\n','text/plain;charset=utf-8'));
 $('saveTicketSet').addEventListener('click',()=>saveTicketSet(config));
 toast('Tikety připravené – bez záruky výhry.');
 }catch(e){toast(e.message,true);}}
function saveTicketSet(config){
 if(!generated?.tickets?.length||!draws.length)return toast('Nejdříve vygeneruj tikety.',true);
 const asOf=draws.at(-1).date;
 const entry={id:String(Date.now())+'-'+generationCounter,createdAt:new Date().toISOString(),asOf,strategy:config.strategy,settings:config,tickets:generated.tickets.map(t=>({main:[...t.main],euro:[...t.euro]}))};
 savedSets.push(entry);savedSets=savedSets.slice(-100);
 if(!persistSets())savedSets.pop();
 renderSavedTickets();toast('Sestava uložená v telefonu. Vyhodnotí se po příštím známém losování.');
}
function renderSavedTickets(){
 const region=$('savedTickets');
 const openIds=new Set([...region.querySelectorAll('details[open]')].map(el=>el.dataset.id));
 $('savedCount').textContent=savedSets.length+' sestav';
 const completed=savedSets.map(s=>evaluateSavedSet(s,draws));
 const assessed=completed.filter(e=>e.status==='drawn'),pending=completed.length-assessed.length;
 const winners=assessed.reduce((sum,e)=>sum+e.prizes,0),three=assessed.reduce((sum,e)=>sum+e.threePlus,0);
 $('forwardSummary').innerHTML=`<div class="forward-metrics"><div><strong>${assessed.length}</strong><small>vyhodnocených sestav</small></div><div><strong>${pending}</strong><small>čekajících</small></div><div><strong>${winners}</strong><small>sloupců ve výherní třídě</small></div><div><strong>${three}</strong><small>sloupců se 3+ hlavními</small></div></div>`;
 const validNum=(v,limit)=>Array.isArray(v)&&v.every(n=>Number.isInteger(n)&&n>=1&&n<=limit);
 region.innerHTML=[...savedSets].reverse().map((set,i)=>{
   if(!set.tickets.every(t=>validNum(t.main,50)&&t.main.length===5&&validNum(t.euro,12)&&t.euro.length===2))return '';
   const evaluation=evaluateSavedSet(set,draws),drawn=evaluation.status==='drawn';
   const id=String(set.id).replace(/[^0-9a-zA-Z_-]/g,'');
   const result=drawn?evaluation.result:null;
   const status=drawn?`${dateCZ(result.date)} · ${evaluation.prizes} výherních sloupců · ${evaluation.threePlus}× 3+ hlavní`:`Čeká na první losování po ${dateCZ(set.asOf)}`;
   const resultMarkup=drawn?`<div class="draw-result"><strong>Výsledek losování ${dateCZ(result.date)}</strong><div class="ticket-balls">${ticketBalls(result.main,result.euro)}</div></div>`:`<div class="draw-result pending">Dosud není v historii zaznamenáno následující losování.</div>`;
   const rows=set.tickets.map((ticket,j)=>{
     const hit=evaluation.hits[j];
     const tScore=drawn?`${hit.main}+${hit.euro}${hit.tier?' · '+hit.tier+'. výherní třída':' · bez výherní třídy'}`:'Čeká na losování';
     const matched=drawn?ticket.main.filter(n=>result.main.includes(n)).join(', '):'';
     const matchedEuro=drawn?ticket.euro.filter(n=>result.euro.includes(n)).join(', '):'';
     return `<div class="ticket-detail"><div class="ticket-detail-top"><strong>Sloupec ${j+1}</strong><span class="ticket-score ${hit?.tier?'winning':''}">${tScore}</span></div><div class="ticket-balls">${markedTicket(ticket,result)}</div>${drawn?`<small class="hit-description">Trefená hlavní: ${matched||'žádná'} · euro: ${matchedEuro||'žádná'}</small>`:''}</div>`;
   }).join('');
   return `<details class="saved-set" data-id="${id}" ${openIds.has(id)?'open':''}><summary class="saved-set-head"><div><strong>${labels[set.strategy]||'Strategie'}</strong><br><small>${set.tickets.length} sloupců · z dat do ${dateCZ(set.asOf)}</small><span class="saved-caption saved-status ${drawn?'':'pending'}">${status}</span></div><span class="chevron" aria-hidden="true">⌄</span></summary><div class="saved-detail">${resultMarkup}<div class="saved-help">${drawn?'Barevně zvýrazněné koule byly vylosované.':'Tikety zůstávají bez výsledku, dokud nebude známé další losování.'}</div>${rows}<button class="btn danger mini" type="button" data-delete-set="${id}">Smazat tuto sestavu</button></div></details>`;
 }).join('')||'<div class="empty-state"><strong>Žádné uložené sestavy</strong><p>Vygeneruj a ulož první sadu.</p></div>';
 region.querySelectorAll('[data-delete-set]').forEach(b=>b.addEventListener('click',()=>{if(!confirm('Smazat tuto sestavu?'))return;savedSets=savedSets.filter(s=>s.id!==b.dataset.deleteSet);persistSets();renderSavedTickets();}));
}

function exportSavedSets(){
 const content=['vytvoreno,datum_posledniho_znameho_tahu,model,sloupec,hlavni1,hlavni2,hlavni3,hlavni4,hlavni5,euro1,euro2,vyhodnocene_losovani,trefena_hlavni,trefena_euro,zasahy_hlavni,zasahy_euro,vyherni_trida'];
 savedSets.forEach(s=>{const ev=evaluateSavedSet(s,draws);s.tickets.forEach((t,i)=>{const h=ev.hits[i];content.push([s.createdAt,s.asOf,s.strategy,i+1,...t.main,...t.euro,ev.result?.date||'',ev.result?t.main.filter(n=>ev.result.main.includes(n)).join(' '):'',ev.result?t.euro.filter(n=>ev.result.euro.includes(n)).join(' '):'',h?.main??'',h?.euro??'',h?.tier??''].join(','));});});
 download('lotto-ai-ulozene-tikety.csv',content.join('\n')+'\n');
}
function chartHTML(trace){
 if(!trace?.length)return '';
 const W=640,H=222,P=27,keys=['model','baseline'];const max=Math.max(1,...trace.flatMap(r=>keys.map(k=>r[k])));
 const coords=k=>trace.map((p,i)=>`${(P+(i/(trace.length-1||1))*(W-2*P)).toFixed(1)},${(H-P-(p[k]/max)*(H-2*P)).toFixed(1)}`).join(' ');
 return `<article class="panel"><h3>Vývoj zásahů v čase</h3><p class="fine-print">Kumulativní počet tiketů se 3+ hlavními zásahy. Křivky nejsou předpovědí.</p><div class="chart-key"><span><b style="background:#63d5bd"></b>Model</span><span><b style="background:#dbaf69"></b>Náhoda</span></div><div class="chart-holder"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Vývoj počtu zásahů modelu proti náhodnému benchmarku"><path d="M${P} ${H-P} H${W-P}" stroke="#455b75" fill="none"/><polyline points="${coords('baseline')}" stroke="#dbaf69" stroke-width="3" fill="none" stroke-linejoin="round"/><polyline points="${coords('model')}" stroke="#63d5bd" stroke-width="3" fill="none" stroke-linejoin="round"/><text x="${P}" y="${H-4}" fill="#a7b8ca" font-size="13">${trace[0].date}</text><text x="${W-P}" text-anchor="end" y="${H-4}" fill="#a7b8ca" font-size="13">${trace.at(-1).date}</text><text x="${P}" y="16" fill="#a7b8ca" font-size="13">${max} zásahů</text></svg></div></article>`;
}
function evaluateHTML(name,stats,drawCount,columnCount,highlight){
 const sum=Object.values(stats.tiers).reduce((a,b)=>a+b,0);
 return `<div class="compare-card${highlight?' highlight':''}"><div class="eyebrow">${name}</div><div class="headline">${stats.threePlus}</div><div class="label">tiketů s 3+ hlavními čísly</div><div class="subline"><strong>${sum}</strong> zásahů výherní třídy<br><strong>${stats.drawsWithPrize}/${drawCount}</strong> tahů s výherní třídou<br><strong>${(stats.totalMain/(drawCount*columnCount)).toFixed(2)}</strong> hlavních zásahů / tiket</div></div>`;
}
function getCost(){const val=$('ticketCost').value.trim();if(!val)return null;const price=Number(val);if(!Number.isFinite(price)||price<0)throw Error('Zadej platnou cenu za sloupec.');return price;}
function financeHTML(test){
 const cost=getCost();
 if(cost===null)return '<article class="panel soft"><h3>Finanční bilance</h3><p class="body-copy">Zadej cenu sloupce, chceš-li vypočítat náklady. Historické výplaty lze importovat zvlášť.</p></article>';
 const f=financeFromBacktest(test,cost);
 return `<article class="panel"><div class="eyebrow">FINANČNÍ BILANCE</div><h3>${test.tested} tahů · ${test.columns} sloupců / tah</h3><p class="body-copy">Celkové náklady: <strong>${payCZ(f.spending)}</strong> (${test.tested*test.columns} sloupců)</p>${f.complete?`<p class="body-copy">Výhry: <strong>${payCZ(f.paid)}</strong> · čistá bilance: <strong>${payCZ(f.net)}</strong></p>`:`<p class="fine-print">${f.missing} výherních tiketů nemá zadanou skutečnou výplatu. Známé výplaty celkem: ${payCZ(f.knownPaid)}. Čistý zisk nebo ztrátu zatím nelze korektně vypočítat.</p>`}<p class="fine-print">Výplaty jsou podle data a výherní třídy, nejsou odhadem ani fixní částkou.</p></article>`;
}
function progress(label){$('testProgress').textContent=label;}
function currentConfig(){return {...settings(),count:Number($('backtestTickets').value),testDraws:Number($('backtestCount').value),payouts};}
function renderTest(test){
 const r=test,tiers=[['5+2',1],['5+1',2],['5+0',3],['4+2',4],['4+1',5],['3+2',6],['4+0',7],['2+2',8],['3+1',9],['3+0',10],['1+2',11],['2+1',12]];
 $('backtestResults').innerHTML=`<div class="result-head"><div><h3>Výsledek ${r.tested} losování</h3><p>${dateCZ(r.first)} – ${dateCZ(r.last)} · ${r.columns} tiketů na tah</p></div><span class="pill">Walk-forward</span></div><div class="comparisons">${evaluateHTML('VYBRANÝ MODEL',r.model,r.tested,r.columns,true)}${evaluateHTML('NÁHODNÝ BENCHMARK',r.baseline,r.tested,r.columns,false)}</div><article class="panel"><h3>Vyhodnocení výherních tříd</h3><div class="table-scroller"><table class="results-table"><thead><tr><th>Třída</th><th>Model</th><th>Náhoda</th></tr></thead><tbody>${tiers.map(([title,k])=>`<tr><td>${title}</td><td class="model">${r.model.tiers[k]||0}</td><td>${r.baseline.tiers[k]||0}</td></tr>`).join('')}</tbody></table></div></article>${chartHTML(r.timeline)}${financeHTML(r)}<article class="panel soft"><h3>Interpretace</h3><p class="body-copy">Výsledky vznikly pouze z losování dostupných před každým testovaným tahem. Respektují dobové rozsahy euročísel 8, 10 a 12. Náhodná odchylka není důkazem budoucí výhody. Pro robustnější porovnání spusť také 1 000 náhodných benchmarků.</p><p class="fine-print">${r.warnings?'U '+r.warnings+' tiketů nemusel být splněn limit překryvu. ':''}Ruční filtry zvolené podle výsledků této historie mohou vytvářet zpětné zkreslení.</p></article>`;
}
async function runTest(){
 const btn=$('runBacktest');if(btn.disabled||$('compareAll').disabled)return;
 btn.disabled=true;$('compareAll').disabled=true;$('runMonteCarlo').disabled=true;
 btn.textContent='Počítám…';$('monteResults').replaceChildren();lastBacktest=null;
 try{
  const config=currentConfig();
  const r=await backtestAsync(draws,config,f=>progress(`Walk-forward: ${Math.round(f*100)} %`));
  lastBacktest=r;lastBacktestModel=labels[config.strategy];renderTest(r);progress(`Dokončeno: ${r.tested} losování.`);toast('Walk-forward test dokončen.');
 }catch(e){progress('Chyba: '+e.message);toast(e.message,true);}
 finally{btn.disabled=false;$('compareAll').disabled=false;$('runMonteCarlo').disabled=false;btn.textContent='▥ Otestovat vybraný model';}
}
async function compareAll(){
 const btn=$('compareAll');if(btn.disabled||$('runBacktest').disabled)return;
 btn.disabled=true;$('runBacktest').disabled=true;$('runMonteCarlo').disabled=true;btn.textContent='Výpočet…';$('monteResults').replaceChildren();lastBacktest=null;
 try{
  const results=await compareStrategiesAsync(draws,currentConfig(),(strategy,progressValue)=>progress(`${labels[strategy]} · celkem ${Math.round(progressValue*100)} %`));
  const best=results[0],rows=results.map((r,i)=>`<div class="rank-row"><strong>${i+1}.</strong><div><strong>${labels[r.strategy]}</strong><br><small>${r.model.totalMain} hlavních zásahů celkem</small></div><span>${r.model.threePlus} / ${r.baseline.threePlus}</span><span class="delta ${r.model.threePlus>r.baseline.threePlus?'positive':r.model.threePlus<r.baseline.threePlus?'negative':''}">${r.model.threePlus-r.baseline.threePlus>0?'+':''}${r.model.threePlus-r.baseline.threePlus}</span></div>`).join('');
  $('backtestResults').innerHTML=`<article class="panel"><div class="eyebrow">SROVNÁNÍ 4 MODELŮ</div><h3>${best.tested} tahů · ${best.columns} sloupců na tah</h3><p class="fine-print">Toto je retrospektivní pořadí. Vítěz zvolený podle stejných dat může být přeučený.</p><div class="rank-row"><strong>#</strong><strong>Model</strong><span>3+ / náhoda</span><span>Rozdíl</span></div>${rows}</article>${chartHTML(best.timeline)}${financeHTML(best)}<article class="panel soft"><h3>Význam výsledků</h3><p class="body-copy">Zobrazen je i nejlepší model podle minulých výsledků; k jeho nezávislému ověření je potřeba forward test na budoucích tazích. Výsledky nejsou slibem výhry.</p></article>`;
  lastBacktest=best;lastBacktestModel=labels[best.strategy]+' (vybrán zpětně)';progress('Porovnání dokončeno.');toast('Porovnání strategií dokončeno.');
 }catch(e){progress('Chyba: '+e.message);toast(e.message,true);}
 finally{btn.disabled=false;$('runBacktest').disabled=false;$('runMonteCarlo').disabled=false;btn.textContent='▤ Porovnat všechny 4 strategie';}
}
async function runMonte(){
 if(!lastBacktest){toast('Nejprve spusť walk-forward test nebo porovnání modelů.',true);return;}
 const button=$('runMonteCarlo');button.disabled=true;button.textContent='Simuluji…';
 try{
  const r=await monteCarloBenchmarks(lastBacktest.dates,lastBacktest.columns,lastBacktest.model,1000,x=>progress(`Náhodné simulace: ${Math.round(x*100)} %`));
  const pct=x=>(x*100).toFixed(1).replace('.',',')+' %';
  const c=r.threePlus;
  $('monteResults').innerHTML=`<article class="panel"><div class="eyebrow">1 000 NÁHODNÝCH BENCHMARKŮ</div><h3>Model: ${lastBacktestModel}</h3><p class="body-copy">Pozorováno ${c? r.observed.threePlus:0} tiketů s 3+ hlavními zásahy. Náhodná simulace měla medián <strong>${c.median}</strong>, běžný 5.–95. percentil <strong>${c.p05}–${c.p95}</strong>.</p><div class="forward-metrics"><div><strong>${r.runs}</strong><small>simulací</small></div><div><strong>${r.observed.threePlus}</strong><small>3+ model</small></div><div><strong>${c.median}</strong><small>medián náhody</small></div><div><strong>${pct(c.pTail)}</strong><small>náhoda ≥ model</small></div></div><p class="body-copy">Výherní třídy: model ${r.observed.prizes}; náhodný medián ${r.prizes.median} (5.–95. percentil ${r.prizes.p05}–${r.prizes.p95}).</p><p class="fine-print">Přibližná jednostranná pravděpodobnost udává podíl náhodných portfolií se stejným nebo lepším počtem zásahů. Není to pravděpodobnost výhry v příštím tahu ani důkaz, že model překonává náhodu. Pokud byl model vybrán podle stejného backtestu, výsledek je zkreslený výběrem.</p></article>`;
  progress('Dokončeno: '+r.runs+' simulací.');toast('Náhodné benchmarky dokončeny.');
 }catch(e){progress('Chyba: '+e.message);toast(e.message,true);}
 finally{button.disabled=false;button.textContent='◉ 1 000 náhodných benchmarků';}
}
async function importPayoutFile(file){
 if(!file)return;
 try{
  const r=parsePayoutCsv(await file.text());if(!r.imported)throw Error('CSV nemá žádný platný řádek. Formát: date;tier;amount');
  for(const [d,classes] of Object.entries(r.payouts))payouts[d]={...(payouts[d]||{}),...classes};
  localStorage.setItem(PAYOUT_STORE,JSON.stringify(payouts));
  $('payoutStatus').textContent=`Nahráno ${r.imported} částek (odmítnuto ${r.rejected}). Pusť znovu backtest pro finanční bilanci.`;
  toast('Výplaty nahrány pro historické datum a výherní třídu.');
 }catch(e){toast(e.message,true);}finally{$('payoutFile').value='';}
}

function download(filename,content,mime='text/csv;charset=utf-8'){const blob=new Blob([content],{type:mime});const link=document.createElement('a');const href=URL.createObjectURL(blob);link.href=href;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(href),600);}
async function importFile(file){try{if(!file)return;const parsed=parseCsv(await file.text());if(!parsed.draws.length)throw Error('CSV neobsahuje platná losování.');const merged=mergeDraws(draws,parsed.draws);setData(merged.draws,`Import: ${parsed.draws.length} platných řádků, ${merged.added} nových, ${parsed.invalid} odmítnutých.`);}catch(e){toast(e.message,true);}finally{$('fileInput').value='';}}
async function refresh(silent=false){try{
 if(!silent)toast('Stahuji veřejný archiv…');$('syncStatus').textContent='Právě ověřuji nové výsledky…';
 const res=await fetch(HISTORY_URL,{cache:'no-store'});if(!res.ok)throw Error('Server neodpovídá: '+res.status);
 const parsed=parseCsv(await res.text());if(parsed.draws.length<100)throw Error('Vzdálený archiv neobsahuje dostatek losování.');
 const existing=new Set(draws.map(d=>d.date));const added=parsed.draws.filter(d=>!existing.has(d.date)).length;
 const merged=mergeDraws(parsed.draws,draws); // local imports and corrections take precedence
 if(added||!draws.length)setData(merged.draws,silent?null:`Načteno ${parsed.draws.length} řádků, ${added} nových.`);
 else if(!silent)toast('Archiv je aktuální.');
 $('syncStatus').textContent=`Naposledy ověřeno ${new Date().toLocaleString('cs-CZ')}. Nových losování: ${added}.`;
 }catch(e){$('syncStatus').textContent='Aktualizace se nezdařila. Lokální data zůstala zachována.';if(!silent)toast('Stažení se nezdařilo. Použij import CSV. '+e.message,true);}}
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
 $('compareAll').addEventListener('click',compareAll);
 $('runMonteCarlo').addEventListener('click',runMonte);
 $('payoutFile').addEventListener('change',e=>importPayoutFile(e.target.files[0]));
 try{payouts=JSON.parse(localStorage.getItem(PAYOUT_STORE)||'{}')||{};}catch{payouts={}}
 $('payoutStatus').textContent=Object.keys(payouts).length?`Výplaty uložené pro ${Object.keys(payouts).length} losovacích dnů.`:'Výplaty zatím nejsou nahrané.';
 $('exportTickets').addEventListener('click',exportSavedSets);
 $('clearTickets').addEventListener('click',()=>{if(!savedSets.length)return;if(!confirm('Smazat všechny uložené sestavy?'))return;savedSets=[];persistSets();renderSavedTickets();});
 $('autoRefresh').checked=localStorage.getItem(AUTO)!=='false';
 $('autoRefresh').addEventListener('change',()=>{localStorage.setItem(AUTO,String($('autoRefresh').checked));});
 $('euroMode').addEventListener('change',()=>{$('fixedEuro').disabled=$('euroMode').value!=='fixed';});
 $('fixedEuro').disabled=$('euroMode').value!=='fixed';
 $('refreshData').addEventListener('click',()=>refresh(false));
 $('refreshFromOverview').addEventListener('click',()=>refresh(false));
 $('fileInput').addEventListener('change',e=>importFile(e.target.files[0]));
 $('exportData').addEventListener('click',()=>download('eurojackpot-moje-historie.csv',toCsv(draws)));
 $('toggleAdd').addEventListener('click',()=>$('addDrawForm').classList.toggle('hidden'));
 $('saveManual').addEventListener('click',manualAdd);
 $('showMore').addEventListener('click',()=>{historyShown+=20;renderHistory();});
 $('resetData').addEventListener('click',async()=>{if(!confirm('Opravdu smazat lokální úpravy a vrátit výchozí archiv?'))return;clearSaved();const fallback=await loadBundled();draws=fallback;renderAll();toast('Výchozí archiv obnoven.');});
 loadSets();
 try{
  let local=getSaved();if(local){try{draws=parseCsv(local).draws;}catch{clearSaved();}}
  if(!draws.length)draws=await loadBundled();
  renderAll();
  if(navigator.onLine!==false&&$('autoRefresh').checked)refresh(true);
 }catch(e){toast('Nelze načíst data: '+e.message,true);renderAll();}
 if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){
  let reloaded=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!reloaded){reloaded=true;location.reload();}});
  navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{});
}
}
async function loadBundled(){
 if(typeof window.BUNDLED_CSV==='string')return parseCsv(window.BUNDLED_CSV).draws;
 const response=await fetch('./data/eurojackpot.csv');if(!response.ok)throw Error('Chybí lokální historie.');return parseCsv(await response.text()).draws;
}
boot();
