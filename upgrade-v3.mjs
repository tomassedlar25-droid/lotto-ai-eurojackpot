/* Run inside a checked-out copy of the existing lotto-ai-eurojackpot repository.
   Requires Node.js 18+. Applies additive, idempotent changes (no data resets). */
import fs from 'node:fs';
import path from 'node:path';
const cwd=process.cwd();
function edit(name,fn){
 const file=path.join(cwd,name);
 if(!fs.existsSync(file))throw Error(`MISSING: ${name} — spusť skript v kořeni existujícího repozitáře.`);
 const before=fs.readFileSync(file,'utf8'),after=fn(before);
 if(after===before){console.log(name+': beze změny');return;}
 fs.writeFileSync(file,after,'utf8');console.log(name+': upraveno');
}
function once(s,needle,sub){if(!s.includes(needle))throw Error(`MISSING: nebyl nalezen očekávaný úsek ${needle.slice(0,80)}. Zkontroluj novější verzi repozitáře.`);return s.replace(needle,sub);}
function requireAssets(){for(const name of ['agent-audit.mjs','agent-team.mjs','agent-styles.css']){if(!fs.existsSync(path.join(cwd,name)))throw Error(`MISSING: ${name}. Nejprve rozbal celý ZIP do kořene repozitáře.`);}}
requireAssets();
edit('index.html',s=>{
 if(s.includes('id="runAgents"'))return s;
 s=once(s,'<link rel="stylesheet" href="./styles.css?v=23">','<link rel="stylesheet" href="./styles.css?v=23">\n<link rel="stylesheet" href="./agent-styles.css?v=30">');
 s=once(s,'<button type="button" class="tab" data-tab="tickets">','<button type="button" class="tab" data-tab="agents"><span>✦</span>6 agentů</button><button type="button" class="tab" data-tab="tickets">');
 const section=`<section id="agents" class="page">
  <div class="section-heading"><div><div class="eyebrow">EUROJACKPOT AI 3.0</div><h2>Šest analytických agentů</h2></div><span class="pill">Jen generování</span></div>
  <article class="panel"><h3>Kontrolovatelný proces</h3><p class="body-copy">Researcher → Data Analyst → Strategist → Coder / Backtest → Risk Manager → Boss. Jde o šest transparentních výpočetních modulů, nikoli o šest připojených placených AI služeb. Nepodávají sázky.</p>
   <button class="btn wide" type="button" id="agentUseSettings">↻ Převzít nastavení generátoru</button><p class="fine-print" id="agentConfigHint">Načítám nastavení…</p>
   <label class="field-label">Rozsah walk-forward testu<select id="agentTestCount" class="select"><option value="30">30 losování</option><option value="50" selected>50 losování</option><option value="100">100 losování (pokud je k dispozici)</option><option value="200">200 losování (pokud je k dispozici)</option></select></label>
   <label class="toggle-row compact"><input id="agentSourceChecked" type="checkbox"><span class="switch"></span><span><strong>Ověřil jsem historii proti oficiálním výsledkům</strong><small>Potvrzuj pouze po skutečném porovnání. Aplikace nepředstírá nezávislé ověření dat.</small></span></label>
   <div class="agent-toolbar"><button class="btn primary" type="button" id="runAgents">✦ Spustit kontrolu 6 agentů</button><button class="btn" type="button" id="exportAgentReport" disabled>↓ Export protokolu</button></div><p id="agentProgress" class="status-line" role="status" aria-live="polite">Připraveno. Pro schválení generování je nutný platný archiv, minimálně 30 historicky testovaných tahů a potvrzení zdroje.</p>
  </article><div class="result-area" id="agentResults"><div class="empty-state"><strong>Protokol čeká na spuštění</strong><p>Nejdříve zkontroluj zdroj a nastavení generátoru.</p></div></div>
 </section>
 `;
 s=once(s,'<section id="tickets" class="page">',section+'<section id="tickets" class="page">');
 s=s.replace('EUROJACKPOT · LAB 2.3','EUROJACKPOT · LAB 3.0');
 s=s.replace('PWA verze 2.1','PWA verze 3.0');
 s=s.replace('src="./app.js?v=23"','src="./app.js?v=30"');
 return s;
});
edit('app.js',s=>{
 if(s.includes("from './agent-team.mjs'"))return s;
 s="import {initAgentTeam} from './agent-team.mjs';\n"+s;
 s=once(s," if('serviceWorker' in navigator", "  initAgentTeam({getDraws:()=>draws,getSettings:settings,notify:toast});\n  if('serviceWorker' in navigator");
 return s;
});
edit('service-worker.js',s=>{
 if(s.includes("agent-team.mjs"))return s;
 s=s.replace("const CACHE='lotto-ai-eurojackpot-v2.3.0'","const CACHE='lotto-ai-eurojackpot-v3.0.0'");
 s=s.replace("'./styles.css?v=23'","'./styles.css?v=23','./agent-styles.css?v=30'");
 s=s.replace("'./app.js?v=23'","'./app.js?v=30','./agent-team.mjs','./agent-audit.mjs'");
 return s;
});
console.log('Hotovo. Spusť `node tests.mjs && node agent-audit.test.mjs`, zkontroluj změny, commitni a pushni.');
