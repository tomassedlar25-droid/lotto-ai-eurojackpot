/* Six auditable, deterministic software agents. No remote AI, no real bets. */
import {generateTickets,backtestAsync} from './core.mjs';
import {compileAgentReport,handoffText} from './agent-audit.mjs';
const el=id=>document.getElementById(id);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ballSet=t=>`<div class="agent-balls">${t.main.map(n=>`<span class="ball">${n}</span>`).join('')}<span class="ball-sep">+</span>${t.euro.map(n=>`<span class="ball euro">${n}</span>`).join('')}</div>`;
const statusText=s=>s==='APPROVE FOR GENERATION ONLY'?'SCHVÁLENO POUZE KE GENEROVÁNÍ':s==='REJECT'?'ZAMÍTNUTO':'NEÚPLNÉ – DOPLNIT';
function exportReport(text){const blob=new Blob([text],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='eurojackpot-ai-6-agentu-report.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),600);}
export function initAgentTeam({getDraws,getSettings,notify,saveAgentSet}){
 const run=el('runAgents'),region=el('agentResults'),label=el('agentProgress'),exportBtn=el('exportAgentReport');
 if(!run||!region)return;
 let latest=null;
 el('agentUseSettings').addEventListener('click',()=>{el('agentConfigHint').textContent=`Převzato: ${escape(getSettings().strategy)} · ${getSettings().count} sloupců · TOP ${getSettings().pool} · EJP ZERO ${getSettings().filter?'aktivní':'vypnutý'}`;});
 el('agentUseSettings').click();
 exportBtn.addEventListener('click',()=>{if(latest)exportReport(latest);});
 run.addEventListener('click',async()=>{
  if(run.disabled)return;
  const draws=getDraws(),config={...getSettings(),seed:1},asOf=draws.at(-1)?.date;
  run.disabled=true;exportBtn.disabled=true;latest=null;region.replaceChildren();
  try{
   label.textContent='1/6 Researcher: kontroluji historii…';
   if(!Array.isArray(draws)||draws.length<76)throw Error('MISSING: alespoň 76 platných losování pro walk-forward test.');
   label.textContent='2/6 Data Analyst: validuji vstupy…';
   // Do not leak future draws: generation uses the latest currently known archive;
   // walk-forward separately truncates the archive at every historical test date.
   const generated=generateTickets(draws,config);
   label.textContent='3/6 Strategist: ověřuji navržené sloupce…';
   const maxBacktest=Math.min(Number(el('agentTestCount').value),draws.length-75);
   label.textContent='4/6 Coder: probíhá walk-forward backtest…';
   const test=await backtestAsync(draws,{...config,minTrain:75,testDraws:maxBacktest,seed:1},p=>{label.textContent=`4/6 Coder: walk-forward ${Math.round(p*100)} %`;});
   label.textContent='5/6 Risk Manager: vyhodnocuji rizika…';
   const report=compileAgentReport({draws,config,generated,test,sourceConfirmed:el('agentSourceChecked').checked});
   label.textContent='6/6 Boss: dokončuji závěrečný protokol…';
   const good=report.final==='APPROVE FOR GENERATION ONLY';
   const score=report.completeness;
   region.innerHTML=`<article class="panel agent-final"><div class="eyebrow">BOSS · TECHNICKÉ ROZHODNUTÍ</div><h3 class="${good?'agent-good':'agent-alert'}">${escape(statusText(report.final))}</h3><p class="body-copy">Úplnost vstupů a kontrol: <strong>${score}/100</strong> — toto není šance na výhru.</p><div class="agent-stats"><div><strong>${report.archive.count}</strong><small>losování v archivu</small></div><div><strong>${test.tested}</strong><small>testovaných tahů</small></div><div><strong>${test.model.threePlus}</strong><small>3+ hlavní model</small></div><div><strong>${test.baseline.threePlus}</strong><small>3+ hlavní náhoda</small></div></div><p class="fine-print">${escape(report.testSummary)}. Stejné historické období může způsobit přeučení. Ani lepší historické skóre neprokazuje schopnost předpovídat další losování.</p>${report.errors.length?`<div class="agent-problems"><strong>Chyby:</strong> ${escape(report.errors.join(' · '))}</div>`:''}${report.missing.length?`<div class="agent-problems"><strong>Chybějící údaje:</strong> ${escape(report.missing.join(' · '))}</div>`:''}</article>
   <article class="panel"><div class="eyebrow">PŘEDÁVÁNÍ VÝSLEDKŮ</div><h3>Protokol šesti agentů</h3><div class="agent-steps">${report.handoffs.map((h,i)=>`<details class="agent-step"><summary><span class="agent-index">${i+1}</span><strong>${escape(h.AGENT)}</strong><span class="agent-expand">Rozbalit</span></summary><pre>${escape(handoffText(h))}</pre></details>`).join('')}</div></article>
   ${good?`<article class="panel"><div class="eyebrow">FINÁLNÍ PORTFOLIO · JEN PRO RUČNÍ KONTROLU</div><h3>${generated.tickets.length} sloupců Eurojackpot</h3>${generated.tickets.map((t,i)=>`<div class="ticket"><div class="ticket-index">${String(i+1).padStart(2,'0')}</div>${ballSet(t)}</div>`).join('')}<button type="button" id="saveAgentSetButton" class="btn primary wide">▤ Uložit do čekajících tiketů</button><p class="fine-print">Výstup se nikam neodesílá; žádný tiket není podán. Před použitím ověř historii a pravidla hry.</p></article>`:'<article class="panel soft"><h3>Finální tikety zatím nejsou schválené</h3><p class="body-copy">Doplň chybějící údaje uvedené v protokolu a spusť kontrolu znovu. Původní generátor zůstává nezávisle dostupný.</p></article>'}`;
   const saveButton=region.querySelector('#saveAgentSetButton');
   if(saveButton)saveButton.addEventListener('click',()=>{
    if(saveButton.disabled)return;
    const result=saveAgentSet?.({config,tickets:generated.tickets,asOf,status:report.final});
    if(result?.ok){saveButton.disabled=true;saveButton.textContent=result.duplicate?'✓ Již uložené':'✓ Uloženo v Mých tiketech';}
   });
   latest=`EUROJACKPOT AI 3.0 — SIX AGENT REPORT\nStav: ${report.final}\nÚplnost dat: ${score}/100\nObdobí historie: ${report.archive.first} – ${report.archive.last}\n${report.testSummary}\n\n`+report.handoffs.map(h=>handoffText(h)).join('\n\n====================\n\n')+(good?'\n\nTIKETY (generováno pouze k ruční kontrole):\n'+generated.tickets.map((t,i)=>`${i+1}. ${t.main.join(' ')} | ${t.euro.join(' ')}`).join('\n'):'\n\nMISSING: schválené finální tikety');
   exportBtn.disabled=false;label.textContent=good?'Dokončeno: sestava připravena k ruční kontrole.':'Dokončeno: je třeba doplnit požadavky Risk Managera.';
   notify?.('Kontrola šesti agentů dokončena.');
  }catch(err){label.textContent='CHYBA: '+err.message;region.innerHTML=`<article class="panel agent-final"><h3 class="agent-alert">REJECT · Výpočet nelze dokončit</h3><p class="body-copy">${escape(err.message)}</p><p class="fine-print">Žádné finální tikety nebyly tímto procesem schváleny.</p></article>`;notify?.(err.message,true);}
  finally{run.disabled=false;}
 });
}
