/* EUROJACKPOT AI v3 — six-stage deterministic audit. No network, bets or LLM keys. */
export const AGENT_NAMES=['Researcher','Data Analyst','Strategist','Coder / Backtest','Risk Manager','Boss'];
export const HANDOFF_FIELDS=['AGENT','TASK COMPLETED','SOURCE FACTS USED','ANALYSIS','MISSING INFORMATION','RISKS OR LIMITATIONS','NEXT AGENT','HANDOFF SUMMARY'];
const integer=(n,lo,hi)=>Number.isInteger(n)&&n>=lo&&n<=hi;
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const euroMax=date=>date<'2014-10-10'?8:date<'2022-03-25'?10:12;
const uniqueValid=(a,n,hi)=>Array.isArray(a)&&a.length===n&&new Set(a).size===n&&a.every(x=>integer(x,1,hi));
const intersection=(a,b)=>a.filter(x=>b.includes(x)).length;
const euroNums=values=>values.join(' + ');

export function auditArchive(draws){
 const issues=[],dates=new Set();
 if(!Array.isArray(draws)||draws.length===0)return {ok:false,count:0,first:null,last:null,issues:['MISSING: Chybí historie losování.'],sourceVerified:false};
 for(let i=0;i<draws.length;i++){
  const d=draws[i];
  if(!d||!validDate(d.date)){issues.push('Neplatné datum na řádku '+(i+1));continue;}
  if(dates.has(d.date))issues.push('Duplicitní datum '+d.date);
  dates.add(d.date);
  if(i&&d.date<=draws[i-1]?.date)issues.push('Historie není striktně vzestupně seřazená: '+d.date);
  if(!uniqueValid(d.main,5,50)||!uniqueValid(d.euro,2,euroMax(d.date)))issues.push('Neplatná čísla losování '+d.date);
 }
 return {ok:issues.length===0,count:draws.length,first:draws[0]?.date||null,last:draws.at(-1)?.date||null,issues,sourceVerified:false};
}

export function auditTickets(tickets,config,blacklist=[]){
 const issues=[];
 if(!Array.isArray(tickets)||tickets.length!==Number(config.count))issues.push('Počet sloupců neodpovídá zadání.');
 const banned=new Set(blacklist);
 for(const [i,t] of (tickets||[]).entries()){
  if(!t||!uniqueValid(t.main,5,50)||!uniqueValid(t.euro,2,12)){issues.push('Neplatný sloupec '+(i+1));continue;}
  if(t.main.some(n=>banned.has(n)))issues.push('Sloupec '+(i+1)+' obsahuje vyloučené číslo.');
  for(let j=0;j<i;j++)if(Array.isArray(tickets[j]?.main)&&intersection(t.main,tickets[j].main)>Number(config.maxOverlap))issues.push('Překročen překryv sloupců '+(j+1)+' a '+(i+1));
 }
 return {ok:issues.length===0,issues};
}

export function researchFacts(draws){
 const last15=draws.slice(-15),last75=draws.slice(-75);
 const mainCounts=new Map(),euroCounts=new Map();
 for(const d of last75){for(const n of d.main)mainCounts.set(n,(mainCounts.get(n)||0)+1);}
 for(const d of last15){for(const n of d.euro)euroCounts.set(n,(euroCounts.get(n)||0)+1);}
 const topMain=[...mainCounts].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,5);
 const topEuro=[...euroCounts].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,4);
 let repeats=0;for(let i=1;i<draws.length;i++)repeats+=intersection(draws[i].main,draws[i-1].main);
 return {last15:last15.length,last75:last75.length,topMain,topEuro,neighborRepeats:repeats,comparedPairs:Math.max(0,draws.length-1)};
}

export function makeHandoff(agent,task,facts,analysis,missing,risks,next,summary){
 return {'AGENT':agent,'TASK COMPLETED':task,'SOURCE FACTS USED':facts,'ANALYSIS':analysis,'MISSING INFORMATION':missing,'RISKS OR LIMITATIONS':risks,'NEXT AGENT':next,'HANDOFF SUMMARY':summary};
}
export function handoffText(h){return HANDOFF_FIELDS.map(key=>key+':\n'+(h[key]||'MISSING')).join('\n\n');}

export function compileAgentReport({draws,config,generated,test,sourceConfirmed=false}){
 const archive=auditArchive(draws),research=archive.ok?researchFacts(draws):null;
 const portfolio=auditTickets(generated?.tickets,config,generated?.blacklist||[]);
 const tested=Number(test?.tested||0),warnings=Number(test?.warnings||0);
 const errors=[...archive.issues,...portfolio.issues];
 if(draws.length<76)errors.push('Archiv má méně než 76 tahů: nelze provést předepsaný walk-forward.');
 if(test&&(test.columns!==Number(config.count)||tested>draws.length-75||tested<1||!draws.some(d=>d.date===test.first)||test.last!==draws.at(-1)?.date))errors.push('Backtest není konzistentní s počtem sloupců, daty nebo dostupným archivem.');
 if(warnings>0)errors.push('Backtest porušil omezení překryvu '+warnings+'×.');
 const missing=[];
 if(!sourceConfirmed)missing.push('MISSING: uživatel nepotvrdil porovnání archivu s oficiálním zdrojem.');
 if(!test||tested<30)missing.push('MISSING: walk-forward test alespoň 30 losování (aktuálně '+tested+').');
 if(!test?.baseline||!test?.model)missing.push('MISSING: souhrn modelu a náhodného benchmarku.');
 const risk=errors.length?'REJECT':missing.length?'REVISE':'APPROVE FOR GENERATION ONLY';
 const final=risk==='REJECT'?'REJECT':risk==='REVISE'?'INCOMPLETE':'APPROVE FOR GENERATION ONLY';
 // This completeness score assesses presence and structure only, never forecast skill.
 const completeness=Math.max(0,100-(archive.ok?0:35)-(draws.length<75?20:0)-(sourceConfirmed?0:15)-(test?.tested>=30?0:20)-(portfolio.ok?0:10));
 const testSummary=test?`${tested} tahů, ${test.columns} sloupců/tah, model 3+ hlavní: ${test.model?.threePlus??'MISSING'}, náhoda: ${test.baseline?.threePlus??'MISSING'}, období ${test.first||'MISSING'} – ${test.last||'MISSING'}`:'MISSING: backtest';
 const baseFacts=`${archive.count} losování; ${archive.first||'MISSING'} – ${archive.last||'MISSING'}`;
 const handoffs=[
  makeHandoff('1 · Researcher','Audit dostupné historie a četností',baseFacts, research?`TOP hlavní za ${research.last75} tahů: ${research.topMain.map(([n,c])=>n+' ('+c+'×)').join(', ')}. TOP euro za ${research.last15} tahů: ${research.topEuro.map(([n,c])=>n+' ('+c+'×)').join(', ')}. Opakování mezi sousedními tahy: ${research.neighborRepeats} výskytů na ${research.comparedPairs} dvojic tahů.`:'MISSING: validní historie',!sourceConfirmed?'MISSING: nezávislé ověření zdroje':'Žádné další povinné údaje k počtu a datům','Minulá četnost nepředpovídá příští čísla.','2 · Data Analyst','Statistiky jsou popisné, nikoli prediktivní.'),
  makeHandoff('2 · Data Analyst','Kontrola chronologie a číselných rozsahů',baseFacts,archive.ok?'Platná struktura historie bez duplicit. Filtry a blacklist se aplikují v generátoru.':archive.issues.join('; '),archive.ok?'MISSING: nezávisle ověřená úplnost historického archivu':'MISSING: oprava archivu','Historický rozsah nemusí být úplný; CSV může obsahovat neověřené údaje.','3 · Strategist',archive.ok?'Struktura archivu vyhovuje formálním pravidlům.':'Datový audit odmítl archiv.'),
  makeHandoff('3 · Strategist','Zkušební návrh portfolia',`Strategie ${config.strategy}; ${config.count} sloupců; TOP ${config.pool}; překryv max ${config.maxOverlap}; EJP ZERO ${config.filter?'zapnut':'vypnut'}`,generated?`Navrženo ${generated.tickets?.length||0} sloupců; kandidátů ${generated.candidates?.length??'MISSING'}; blacklist ${generated.blacklist?.length??'MISSING'}; formální kontrola ${portfolio.ok?'OK':'CHYBA'}`:'MISSING: portfolio',portfolio.ok?'MISSING: prediktivní výhoda neprokázána':portfolio.issues.join('; '),'Diverzifikace mění pokrytí, nikoli pravděpodobnost jednotlivého platného sloupce.','4 · Coder / Backtest','Navržené kombinace nejsou pokynem k podání sázky.'),
  makeHandoff('4 · Coder / Backtest','Walk-forward porovnání s náhodným modelem',testSummary,test?'Při každém testovaném tahu byly pro vytvoření tiketů dostupné jen starší výsledky.':'MISSING: test nebyl spuštěn',test?'MISSING: nezávislý forward vzorek, pokud byl model laděn na této historii':'MISSING: historický backtest','Výsledky jsou citlivé na délku vzorku, ladění a ručně zvolené filtry.','5 · Risk Manager','Backtest popisuje historické shody, nikoli výherní příslib.'),
  makeHandoff('5 · Risk Manager','Kontrola zdroje, omezení a minimálního testu',`Archiv: ${archive.ok?'OK':'CHYBA'}; portfolio: ${portfolio.ok?'OK':'CHYBA'}; test: ${tested} tahů; varování: ${warnings}`,`Rozhodnutí ${risk}. ${errors.length?'Chyby: '+errors.join('; '):'Žádné formální chyby.'}`,missing.length?missing.join(' '):'Žádné chybějící povinné položky tohoto technického auditu.','Model nebyl prokázán jako přesnější než náhoda; kontrola zdroje je potvrzení uživatele.','6 · Boss',risk),
  makeHandoff('6 · Boss','Finální technické rozhodnutí',baseFacts+'; '+testSummary,`Stav: ${final}. ${final==='APPROVE FOR GENERATION ONLY'?'Zpřístupnit kombinace pro ruční kontrolu.':'Nezpřístupňovat finální sestavu v režimu šesti agentů.'}`,missing.length?missing.join(' '):'Žádné pro technické generování; nezávislé prediktivní ověření MISSING.','Žádná strategie nezaručuje výhru. Nikdy automaticky nepodávat tiket.','Uživatel','Všechny výstupy musí posoudit člověk.')
 ];
 return {archive,research,portfolio,risk,final,missing,errors,completeness,handoffs,testSummary};
}
