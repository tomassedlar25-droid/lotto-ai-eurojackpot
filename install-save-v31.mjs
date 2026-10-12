/* One-time, idempotent patch for the EXISTING EUROJACKPOT AI 3.0 project.
 * Run in repository root after extracting files. Does not alter the draw archive. */
import fs from 'node:fs';

function patch(path, patcher) {
  const before = fs.readFileSync(path, 'utf8');
  const after = patcher(before);
  if (after !== before) {fs.writeFileSync(path,after);console.log('Upraveno:',path)}
  else console.log('Již aktuální:',path);
}
function replaceRequired(src, oldText, newText, title) {
  if (src.includes(newText)) return src;
  if (!src.includes(oldText)) throw Error('Chybí očekávané místo '+title+'. Zastavuji instalaci bez další změny.');
  return src.replace(oldText,newText);
}

// Validate inputs before making changes; old versions should not be patched blindly.
for (const f of ['app.js','agent-team.mjs','index.html','service-worker.js','core.mjs','agent-save.mjs']) {
  if (!fs.existsSync(f)) throw Error('Chybí soubor '+f+'. Jsi ve správné složce projektu?');
}
const originalApp=fs.readFileSync('app.js','utf8');
const originalTeam=fs.readFileSync('agent-team.mjs','utf8');
const originalIndex=fs.readFileSync('index.html','utf8');
if (!originalApp.includes('function persistSets()') || !originalApp.includes('initAgentTeam(') || !originalTeam.includes('export function initAgentTeam(')) throw Error('Neznámá verze aplikace.');
if(!originalIndex.includes('id="agents"'))throw Error('Chybí panel 6 agentů.');

patch('app.js',s=>{
 s=replaceRequired(s,"import {initAgentTeam} from './agent-team.mjs';","import {initAgentTeam} from './agent-team.mjs';\nimport {makeAgentSavedSet} from './agent-save.mjs';",'import');
 const marker='function loadSets(){';
 const inserted=`function saveAgentSet({config,tickets,asOf,status}) {
 if(status!=='APPROVE FOR GENERATION ONLY'){toast('Risk Manager neschválil generování.',true);return {ok:false};}
 try {
  const prepared=makeAgentSavedSet({draws,config,tickets,existing:savedSets,asOf,createdAt:new Date().toISOString()});
  if(prepared.duplicate){toast('Tato sestava již je v Mých tiketech.');showTab('tickets');return {ok:true,duplicate:true};}
  const previous=savedSets;
  savedSets=[...savedSets,prepared.record].slice(-100);
  if(!persistSets()){savedSets=previous;return {ok:false};}
  renderSavedTickets();
  showTab('tickets');
  toast('Uloženo do Mých tiketů. Čeká na první známé losování po '+asOf+'.');
  return {ok:true,duplicate:false};
 }catch(err){toast(err.message,true);return {ok:false};}
}
`;
 s=replaceRequired(s,marker,inserted+marker,'funkce uložení');
 s=replaceRequired(s,'initAgentTeam({getDraws:()=>draws,getSettings:settings,notify:toast});','initAgentTeam({getDraws:()=>draws,getSettings:settings,notify:toast,saveAgentSet});','propojení agentů');
 s=replaceRequired(s,"${labels[set.strategy]||'Strategie'}","${set.source==='six-agents'?'✦ 6 agentů · ':''}${labels[set.strategy]||'Strategie'}",'označení uložené sestavy');
 return s;
});
patch('agent-team.mjs',s=>{
 s=replaceRequired(s,'export function initAgentTeam({getDraws,getSettings,notify}){','export function initAgentTeam({getDraws,getSettings,notify,saveAgentSet}){','předání callbacku');
 s=replaceRequired(s,'const draws=getDraws(),config={...getSettings(),seed:1};','const draws=getDraws(),config={...getSettings(),seed:1},asOf=draws.at(-1)?.date;','datum zmrazení');
 s=replaceRequired(s,`join('')}<p class="fine-print">Výstup se nikam neodesílá;`,`join('')}<button type="button" id="saveAgentSetButton" class="btn primary wide">▤ Uložit do čekajících tiketů</button><p class="fine-print">Výstup se nikam neodesílá;`,'tlačítko uložit');
 s=replaceRequired(s,'   latest=`EUROJACKPOT AI 3.0 — SIX AGENT REPORT',`   const saveButton=region.querySelector('#saveAgentSetButton');
   if(saveButton)saveButton.addEventListener('click',()=>{
    if(saveButton.disabled)return;
    const result=saveAgentSet?.({config,tickets:generated.tickets,asOf,status:report.final});
    if(result?.ok){saveButton.disabled=true;saveButton.textContent=result.duplicate?'✓ Již uložené':'✓ Uloženo v Mých tiketech';}
   });
   latest=\`EUROJACKPOT AI 3.0 — SIX AGENT REPORT`,'napojení tlačítka');
 return s;
});
patch('index.html',s=>{
 s=replaceRequired(s,'./app.js?v=30','./app.js?v=31','verze JS');
 s=s.replace('EUROJACKPOT · LAB 3.0','EUROJACKPOT · LAB 3.1');
 return s;
});
patch('service-worker.js',s=>{
 s=replaceRequired(s,"lotto-ai-eurojackpot-v3.0.0","lotto-ai-eurojackpot-v3.1.0",'verze cache');
 s=replaceRequired(s,"'./app.js?v=30'","'./app.js?v=31'",'verze SW JS');
 s=replaceRequired(s,"'./agent-team.mjs'","'./agent-team.mjs','./agent-save.mjs'",'offline modul');
 return s;
});
console.log('HOTOVO: Nyní spusť testy, potom ulož změny na GitHub.');
