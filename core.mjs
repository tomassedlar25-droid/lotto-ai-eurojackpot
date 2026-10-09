/* LOTTO AI — analysis engine. No external dependencies; all models are heuristic. */
export const RELEASE='2.3.0';
export const HISTORY_URL='https://raw.githubusercontent.com/dev-baris/lottery-archive/main/eu/eurojackpot/results.csv';
export const MAX_EURO=12;
export const euroPoolAt=date=>date<'2014-10-10'?8:date<'2022-03-25'?10:12;
export function parseDate(raw){
  const s=String(raw??'').trim().replace(/^\uFEFF/,'');
  if(/^\d{4}-\d\d-\d\d$/.test(s))return isRealDate(s)?s:null;
  let m=s.match(/^(\d{1,2})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]\s*(\d{4})$/);
  if(!m)return null;
  const iso=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  return isRealDate(iso)?iso:null;
}
function isRealDate(s){const d=new Date(`${s}T12:00:00Z`);return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s;}
const sortNums=xs=>xs.map(Number).sort((a,b)=>a-b);
function makeDraw(date,main,euro){
  if(!date||main.length!==5||euro.length!==2)return null;
  if(main.some(n=>!Number.isInteger(n)||n<1||n>50)||euro.some(n=>!Number.isInteger(n)||n<1||n>euroPoolAt(date)))return null;
  if(new Set(main).size!==5||new Set(euro).size!==2)return null;
  return {date,main:sortNums(main),euro:sortNums(euro)};
}
function splitCsvRow(line,sep){
  let fields=[],part='',inQuotes=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(c==='"'){if(inQuotes&&line[i+1]==='"'){part+='"';i++;}else inQuotes=!inQuotes;}
    else if(c===sep&&!inQuotes){fields.push(part.trim());part='';}
    else part+=c;
  }
  fields.push(part.trim());return fields;
}
export function parseCsv(text){
  const lines=String(text).replace(/^\uFEFF/,'').split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#'));
  if(!lines.length)return {draws:[],imported:0,invalid:0,duplicates:0};
  const sep=(lines[0].split(';').length>lines[0].split(',').length)?';':',';
  const first=splitCsvRow(lines[0],sep);
  const normalized=s=>String(s||'').toLowerCase().trim().replace(/[^a-z0-9]/g,'');
  const header=!parseDate(first[0])||first.some(x=>/^(date|datum|drawdate|main1|euro1|n1|z1)$/i.test(normalized(x)));
  const hdr=header?first.map(normalized):[];
  const find=(variants)=>hdr.findIndex(h=>variants.includes(h));
  const dateIdx=header?find(['date','datum','drawdate','datumslosovani','drawingdate']):0;
  const mainIdx=header?Array.from({length:5},(_,i)=>find([`n${i+1}`,`z${i+1}`,`main${i+1}`,`number${i+1}`,`zahl${i+1}`,`${i+1}cisloz1osudi`])):[1,2,3,4,5];
  const euroIdx=header?Array.from({length:2},(_,i)=>find([`e${i+1}`,`euro${i+1}`,`euronumber${i+1}`,`euronum${i+1}`,`${i+1}cisloz2osudi`])):[6,7];
  const combinedIdx=header?find(['eurozahlen','euronumbers','eurodigits']):-1;
  if(dateIdx<0||mainIdx.some(x=>x<0)|| (euroIdx.some(x=>x<0)&&combinedIdx<0)){
    throw new Error('Neznámé CSV sloupce. Očekávám date,n1,n2,n3,n4,n5,e1,e2 nebo datum;z1;…;z5;eurozahlen.');
  }
  const byDate=new Map();let invalid=0,duplicates=0,imported=0;
  for(const line of lines.slice(header?1:0)){
    const cells=splitCsvRow(line,sep); const date=parseDate(cells[dateIdx]);
    const main=mainIdx.map(i=>Number(cells[i]));
    let euro=euroIdx.every(i=>i>=0)?euroIdx.map(i=>Number(cells[i])):String(cells[combinedIdx]||'').match(/\d+/g)?.map(Number)||[];
    const draw=makeDraw(date,main,euro);
    if(!draw){invalid++;continue;}
    imported++;
    if(byDate.has(draw.date))duplicates++;
    byDate.set(draw.date,draw);
  }
  return {draws:[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date)),imported,invalid,duplicates};
}
export function toCsv(draws){return 'date,n1,n2,n3,n4,n5,e1,e2\n'+draws.map(d=>[d.date,...d.main,...d.euro].join(',')).join('\n')+'\n';}
export function mergeDraws(base,more){let map=new Map(base.map(d=>[d.date,d]));let added=0,changed=0;for(const d of more){const old=map.get(d.date);if(!old)added++;else if(JSON.stringify(old)!==JSON.stringify(d))changed++;map.set(d.date,d);}return {draws:[...map.values()].sort((a,b)=>a.date.localeCompare(b.date)),added,changed};}
export function frequency(draws,kind='main',limit=draws.length){
  const n=kind==='main'?50:12, arr=Array(n).fill(0),expected=Array(n).fill(0);
  for(const d of draws.slice(-limit)){
    for(const k of d[kind])arr[k-1]++;
    if(kind==='euro')for(let k=1;k<=euroPoolAt(d.date);k++)expected[k-1]+=2/euroPoolAt(d.date);
    else for(let k=0;k<n;k++)expected[k]+=5/50;
  }
  return arr.map((count,i)=>({num:i+1,count,expected:expected[i],ratio:expected[i]?count/expected[i]:0}));
}
export function lastSeen(draws,kind='main'){
  const n=kind==='main'?50:12;
  return Array.from({length:n},(_,i)=>{let pos=draws.length;for(let j=draws.length-1;j>=0;j--){if(draws[j][kind].includes(i+1)){pos=draws.length-1-j;break;}}return {num:i+1,drawsAgo:pos};});
}
function rand(seed){let x=(seed>>>0)||0x12345678;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function hash(s){let h=2166136261>>>0;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function recentZ(history,w,n,kind){const slice=history.slice(-w), sample= slice.length, k=kind==='main'?5:2;const counts=frequency(slice,kind,w);return counts.map(o=>{if(kind==='main'){const mean=sample*k/n;const variance=sample*(k/n)*(1-k/n);return (o.count-mean)/Math.sqrt(Math.max(variance,.1));}
    const v=slice.reduce((sum,d)=>sum+((o.num<=euroPoolAt(d.date))?(2/euroPoolAt(d.date))*(1-2/euroPoolAt(d.date)):0),0);
    return (o.count-o.expected)/Math.sqrt(Math.max(v,.1));
  });}
export function positionalBlacklist(history,lastN=12){const banned=new Set();for(const d of history.slice(-lastN)){banned.add(d.main[0]);banned.add(d.main[4]);}return [...banned].sort((a,b)=>a-b);}
// Ensemble weights are calibrated using ONLY earlier draws, never the draw being forecast.
export function ensembleWeights(history,windows=24){
  const names=['trend','antitrend','frequency'];
  const start=Math.max(75,history.length-Math.max(5,Math.min(40,windows)));
  const points=names.map(()=>0);let checked=0;
  for(let i=start;i<history.length;i++){
    const past=history.slice(0,i),actual=history[i].main;
    names.forEach((name,j)=>{
      const top=ranking(past,{strategy:name,filter:false}).slice(0,12).map(x=>x.num);
      points[j]+=intersection(top,actual);
    });checked++;
  }
  // Shrink toward equal weights; the retrospective score is descriptive, not predictive proof.
  const raw=points.map(n=>1+(checked?n/(checked*5):0)),total=raw.reduce((a,b)=>a+b,0);
  return Object.fromEntries(names.map((n,i)=>[n,raw[i]/total]));
}

// Ten independent, explicitly heuristic ranking algorithms, always trained on past draws only.
export const EXTRA_METHODS={hot15:'Horká čísla (15)',cold30:'Studená čísla (30)',gap:'Nejdelší absence',hazard:'Poměr absence / očekávání',decay:'Exponenciální paměť',momentum:'Momentum 10/50',reversal:'Obrat 10/50',pairs:'Vazba na poslední tah',ending:'Koncové číslice',bayes:'Bayesův odhad'};
export function methodRanking(history,kind='main',method='hot15',targetDate=null){
 const n=kind==='main'?50:euroPoolAt(targetDate||history.at(-1)?.date||'2026-10-09');
 const k=kind==='main'?5:2;
 const eligible=history.filter(d=>kind==='main'||d.date<= (targetDate||'9999-12-31'));
 const seq=eligible.map(d=>d[kind]);
 const count=(length)=>{let a=Array(n).fill(0),seen=Array(n).fill(0);for(const arr of seq.slice(-length))for(const v of arr)if(v<=n){a[v-1]++;seen[v-1]++;}return a;};
 const q15=count(15),q10=count(10),q30=count(30),q50=count(50),q100=count(100);
 const gap=Array(n).fill(seq.length);for(let j=seq.length-1;j>=0;j--)for(const v of seq[j])if(v<=n&&gap[v-1]===seq.length)gap[v-1]=seq.length-j-1;
 const prior=Array(n).fill(0),last=seq.at(-1)||[];
 if(method==='pairs'&&seq.length>1){let denom=0;for(let i=1;i<seq.length;i++)if(last.some(x=>seq[i-1].includes(x))){denom++;for(const v of seq[i])if(v<=n)prior[v-1]++;}if(!denom)q50.forEach((v,i)=>prior[i]=v);}
 const digit=Array(10).fill(0);for(const arr of seq.slice(-60))for(const v of arr)if(v<=n)digit[v%10]++;
 const scores=Array.from({length:n},(_,i)=>{
  const f=(a,w)=>a[i]/Math.max(1,Math.min(seq.length,w))*n/k;
  const p=(kind==='euro'?seq.slice(-60).reduce((sum,d,j)=>sum+((i+1<=euroPoolAt(eligible.at(-Math.min(60,seq.length)+j)?.date||'2026-10-09'))?2/euroPoolAt(eligible.at(-Math.min(60,seq.length)+j).date):0),0)/Math.max(1,Math.min(60,seq.length)):k/n);
  switch(method){
   case 'hot15':return f(q15,15);
   case 'cold30':return -f(q30,30);
   case 'gap':return gap[i];
   case 'hazard':return gap[i]*Math.max(p,.05);
   case 'decay':{let s=0,z=0;for(let j=seq.length-1;j>=Math.max(0,seq.length-60);j--){let w=Math.pow(.93,seq.length-1-j);z+=w;if(seq[j].includes(i+1))s+=w;}return s/Math.max(z,.01)*n/k;}
   case 'momentum':return f(q10,10)-f(q50,50);
   case 'reversal':return f(q50,50)-f(q10,10);
   case 'pairs':return prior[i]+.001*f(q50,50);
   case 'ending':return digit[(i+1)%10]/Math.max(1,seq.length);
   case 'bayes':return (q100[i]+2*k/n)/(Math.min(seq.length,100)+2);
   default:throw Error('Neznámá metodika '+method);
  }
 });
 return scores.map((score,i)=>({num:i+1,score})).sort((a,b)=>b.score-a.score||a.num-b.num);
}


// HYBRID X: fixed precommitted rank ensemble. No tuning on held-out test outcomes.
// Rank fusion avoids mixing incomparable score scales from individual heuristics.
export function hybridRanking(history,kind='main',targetDate=null){
 const n=kind==='main'?50:euroPoolAt(targetDate||'2026-10-09');
 const methods=kind==='main'?[['momentum',.25],['bayes',.20],['decay',.20],['hot15',.15],['reversal',.10],['gap',.10]]:[['bayes',.30],['decay',.25],['momentum',.20],['hot15',.15],['gap',.10]];
 const scores=Array(n).fill(0);
 for(const [method,weight] of methods){
   const ranked=methodRanking(history,kind,method,targetDate);
   ranked.forEach((row,idx)=>{if(row.num<=n)scores[row.num-1]+=weight*(n-idx)/n;});
 }
 return scores.map((score,i)=>({num:i+1,score})).sort((a,b)=>b.score-a.score||a.num-b.num);
}

export function ranking(history,{strategy='trend',filter=true,excludeLast=false,manualExclude=[]}={}){
  const ban=new Set(filter?positionalBlacklist(history):[]);
  if(excludeLast&&history.length)history.at(-1).main.forEach(n=>ban.add(n));
  for(const n of manualExclude||[])if(Number.isInteger(n)&&n>=1&&n<=50)ban.add(n);
  if(strategy==='hybridx')return hybridRanking(history,'main').map(x=>({...x,excluded:ban.has(x.num)}));
  if(strategy==='ensemble'){
    const weights=ensembleWeights(history);
    const scores=Array(51).fill(0);
    for(const [model,w] of Object.entries(weights)){
      const sorted=ranking(history,{strategy:model,filter:false});
      sorted.forEach((item,index)=>{scores[item.num]+=w*(50-index)/50;});
    }
    return Array.from({length:50},(_,i)=>({num:i+1,score:scores[i+1],excluded:ban.has(i+1)}))
      .sort((a,b)=>b.score-a.score||a.num-b.num);
  }
  if(EXTRA_METHODS[strategy])return methodRanking(history,'main',strategy).map(x=>({...x,excluded:ban.has(x.num)}));
  const a=recentZ(history,5,50,'main'),b=recentZ(history,75,50,'main');
  const counts=frequency(history,'main',75),rng=rand(hash(history.at(-1)?.date||'start'));
  return Array.from({length:50},(_,i)=>({num:i+1,score:strategy==='random'?rng():strategy==='frequency'?counts[i].ratio:strategy==='antitrend'?b[i]-a[i]:a[i]-b[i],excluded:ban.has(i+1)}))
    .sort((x,y)=>y.score-x.score||x.num-y.num);
}
function weightedPick(pool,size,rng,used){let available=[...pool],picked=[];for(let i=0;i<size;i++){
  let weights=available.map(x=>Math.exp(Math.max(-3,Math.min(3,x.weight||0)))*1/(1+0.70*(used.get(x.num)||0)));
  let r=rng()*weights.reduce((x,y)=>x+y,0),idx=0;while(idx<weights.length-1&&(r-=weights[idx])>0)idx++;
  picked.push(available[idx].num);available.splice(idx,1);
}return sortNums(picked);}
export function generateTickets(history,settings={}){
  const opts={count:6,strategy:'trend',filter:true,pool:12,maxOverlap:2,excludeLast:false,manualExclude:[],euroMode:'portfolio',euroStrategy:'hot15',fixedEuro:[],seed:1,...settings};
  if(!Number.isInteger(opts.count)||opts.count<1||opts.count>30)throw Error('Počet tiketů musí být 1–30.');
  if(!history.length)throw Error('Nejdříve načti alespoň jedno losování.');
  const ranked=ranking(history,opts),ban=ranked.filter(x=>x.excluded).map(x=>x.num).sort((a,b)=>a-b);
  const candidates=ranked.filter(x=>!x.excluded).slice(0,Math.max(5,Math.min(50,Number(opts.pool)||12)));
  if(candidates.length<5)throw Error('Filtr vyřadil příliš mnoho čísel.');
  const pool=candidates.map((x,i)=>({num:x.num,weight:opts.strategy==='random'?0:1.35*(candidates.length-1-i)/Math.max(candidates.length-1,1)}));
  const euroMax=euroPoolAt(opts.targetDate||'2026-10-09');
  const euroRanks=frequency(history,'euro',15).filter(x=>x.num<=euroMax).sort((a,b)=>b.count-a.count||a.num-b.num);
  const rng=rand(hash(history.at(-1)?.date)+Number(opts.seed)*1009);
  const euroOrder=opts.euroMode==='model'?(opts.euroStrategy==='hybridx'?hybridRanking(history,'euro',opts.targetDate):methodRanking(history,'euro',opts.euroStrategy,opts.targetDate)):null;
  const orderedEuro=euroOrder?euroOrder.map(x=>x.num):opts.strategy==='random'?Array.from({length:euroMax},(_,i)=>i+1):euroRanks.map(x=>x.num);
  if(opts.strategy==='random')for(let i=orderedEuro.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[orderedEuro[i],orderedEuro[j]]=[orderedEuro[j],orderedEuro[i]];}
  let pairs=[sortNums(orderedEuro.slice(0,2)),sortNums(orderedEuro.slice(2,4))];
  if(opts.euroMode==='model'&&orderedEuro.length<4)throw Error('Nedostatek euročísel.');
  if(opts.euroMode==='top')pairs=[pairs[0]];
  if(opts.euroMode==='fixed'){
    const nums=opts.fixedEuro||[];
    if(nums.length!==2||new Set(nums).size!==2||nums.some(n=>!Number.isInteger(n)||n<1||n>euroMax))throw Error('Zadej dvě různá euročísla od 1 do '+euroMax+' pro testované období.');
    pairs=[sortNums(nums)];
  }
  const used=new Map();let tickets=[],violations=0;
  for(let j=0;j<opts.count;j++){
    let picked=null,best=null,bestPenalty=Infinity;
    for(let attempt=0;attempt<(opts.maxAttempts||1600);attempt++){
      const test=weightedPick(pool,5,rng,used);
      const penalty=tickets.reduce((sum,t)=>sum+Math.max(0,intersection(test,t.main)-opts.maxOverlap),0);
      if(penalty<bestPenalty){bestPenalty=penalty;best=test;}
      if(penalty===0){picked=test;break;}
    }
    picked ||= best;if(bestPenalty>0)violations++;
    for(const n of picked)used.set(n,(used.get(n)||0)+1);
    tickets.push({main:picked,euro:pairs[j%pairs.length]});
  }
  return {tickets,blacklist:ban,candidates:candidates.map(x=>x.num),euroPairs:pairs,overlapWarnings:violations,weights:opts.strategy==='ensemble'?ensembleWeights(history):null};
}
export function intersection(a,b){return a.reduce((count,x)=>count+Number(b.includes(x)),0);}
export function ticketHits(ticket,result){const main=intersection(ticket.main,result.main),euro=intersection(ticket.euro,result.euro);return {main,euro,tier:prizeTier(main,euro)};}
export function prizeTier(m,e){
  const tiers={'5-2':1,'5-1':2,'5-0':3,'4-2':4,'4-1':5,'3-2':6,'4-0':7,'2-2':8,'3-1':9,'3-0':10,'1-2':11,'2-1':12};return tiers[`${m}-${e}`]||null;
}
function evaluate(tickets,result,acc,payouts){
  let bestMain=0,bestEuro=0,prize=0;
  for(const t of tickets){const m=intersection(t.main,result.main),e=intersection(t.euro,result.euro);
    acc.matrix[`${m}+${e}`]=(acc.matrix[`${m}+${e}`]||0)+1;
    bestMain=Math.max(bestMain,m);bestEuro=Math.max(bestEuro,e);
    const tier=prizeTier(m,e);if(tier){acc.tiers[tier]=(acc.tiers[tier]||0)+1;prize++;
      const amount=payouts?.[result.date]?.[tier];
      if(Number.isFinite(amount)&&amount>=0)acc.paid+=amount;else acc.unknownPayouts++;
    }
    if(m>=3)acc.threePlus++;
    acc.totalMain+=m;acc.totalEuro+=e;
  }
  acc.drawsWithPrize+=Number(prize>0);acc.bestMain[bestMain]=(acc.bestMain[bestMain]||0)+1;
  acc.bestEuro[bestEuro]=(acc.bestEuro[bestEuro]||0)+1;
}
function newAcc(){return {matrix:{},tiers:{},drawsWithPrize:0,bestMain:{},bestEuro:{},threePlus:0,totalMain:0,totalEuro:0,paid:0,unknownPayouts:0};}
export function backtest(draws,opts={}){
  const config={count:6,strategy:'trend',filter:true,pool:12,maxOverlap:2,testDraws:100,minTrain:75,seed:1,...opts};
  const eligible=[];
  for(let i=config.minTrain;i<draws.length;i++)eligible.push(i);
  const indices=eligible.slice(-Math.min(1000,Math.max(1,Number(config.testDraws)||100)));
  if(!indices.length)throw Error('Pro backtest je potřeba více historie.');
  const model=newAcc(),baseline=newAcc(),timeline=[];let warnings=0;
  for(const i of indices){
    const past=draws.slice(0,i),result=draws[i];
    const generated=generateTickets(past,{...config,targetDate:result.date,seed:i+config.seed});
    warnings+=generated.overlapWarnings;
    evaluate(generated.tickets,result,model,config.payouts);
    const rnd=generateTickets(past,{...config,strategy:'random',filter:false,excludeLast:false,manualExclude:[],euroMode:'portfolio',fixedEuro:[],pool:50,seed:i+config.seed+8888,maxOverlap:config.maxOverlap,targetDate:result.date});
    evaluate(rnd.tickets,result,baseline,config.payouts);
    timeline.push({date:result.date,model: model.threePlus,baseline:baseline.threePlus,modelHits:model.totalMain,baselineHits:baseline.totalMain});
  }
  return {model,baseline,tested:indices.length,columns:config.count,first:draws[indices[0]].date,last:draws[indices.at(-1)].date,warnings,timeline};
}

export function compareStrategies(draws,config={}){
  const strategies=[...new Set(['ensemble','trend','antitrend','frequency',...((EXTRA_METHODS[config.strategy]||config.strategy==='hybridx')?[config.strategy]:[])])];
  const results=strategies.map(strategy=>({strategy,...backtest(draws,{...config,strategy})}));
  return results.sort((a,b)=>b.model.threePlus-a.model.threePlus || b.model.totalMain-a.model.totalMain || a.strategy.localeCompare(b.strategy));
}
export function evaluateSavedSet(set,draws){
  const next=draws.find(d=>d.date>set.asOf);
  if(!next)return {status:'pending',result:null,hits:[]};
  const hits=set.tickets.map(t=>ticketHits(t,next));
  return {status:'drawn',result:next,hits,prizes:hits.filter(h=>h.tier).length,threePlus:hits.filter(h=>h.main>=3).length};
}

// Running a full history on a phone should not freeze touch input: release the event loop
// after each short, deterministic chunk. Results are identical to synchronous backtest.
const yieldUI=()=>new Promise(resolve=>setTimeout(resolve,0));
export async function backtestAsync(draws,opts={},onProgress=()=>{}){
  const config={count:6,strategy:'trend',filter:true,pool:12,maxOverlap:2,testDraws:100,minTrain:75,seed:1,...opts};
  const eligible=[];
  for(let i=config.minTrain;i<draws.length;i++)eligible.push(i);
  const indices=eligible.slice(-Math.min(1000,Math.max(1,Number(config.testDraws)||100)));
  if(!indices.length)throw Error('Pro backtest je potřeba alespoň 76 losování.');
  const model=newAcc(),baseline=newAcc(),timeline=[];let warnings=0;
  for(let j=0;j<indices.length;j++){
    const i=indices[j],past=draws.slice(0,i),result=draws[i];
    const generated=generateTickets(past,{...config,seed:i+config.seed,targetDate:result.date});
    warnings+=generated.overlapWarnings;
    evaluate(generated.tickets,result,model,config.payouts);
    const rnd=generateTickets(past,{...config,strategy:'random',filter:false,excludeLast:false,manualExclude:[],euroMode:'portfolio',fixedEuro:[],pool:50,seed:i+config.seed+8888,maxOverlap:config.maxOverlap,targetDate:result.date});
    evaluate(rnd.tickets,result,baseline,config.payouts);
    timeline.push({date:result.date,model:model.threePlus,baseline:baseline.threePlus,modelHits:model.totalMain,baselineHits:baseline.totalMain});
    if(j%20===19){onProgress((j+1)/indices.length);await yieldUI();}
  }
  onProgress(1);
  return {model,baseline,tested:indices.length,columns:config.count,first:draws[indices[0]].date,last:draws[indices.at(-1)].date,warnings,timeline,dates:indices.map(i=>draws[i].date)};
}
export async function compareStrategiesAsync(draws,opts={},progress=()=>{}){
  const strategies=[...new Set(['ensemble','trend','antitrend','frequency',...((EXTRA_METHODS[opts.strategy]||opts.strategy==='hybridx')?[opts.strategy]:[])])],out=[];
  for(let i=0;i<strategies.length;i++){
    const strategy=strategies[i];const r=await backtestAsync(draws,{...opts,strategy},fraction=>progress(strategy,(i+fraction)/strategies.length));
    out.push({strategy,...r});await yieldUI();
  }
  return out.sort((a,b)=>b.model.threePlus-a.model.threePlus||b.model.totalMain-a.model.totalMain||a.strategy.localeCompare(b.strategy));
}

// Uniform-ticket benchmark, no drawn numbers looked at when choosing tickets.
// Draw-dependent Eurojackpot pool size respects historical rule changes.
function choose(n,k){let out=1;for(let i=1;i<=k;i++)out=out*(n-i+1)/i;return out;}
function cumulativeProbs(population,winners,selected){const denom=choose(population,selected);let sum=0;return Array.from({length:Math.min(selected,winners)+1},(_,k)=>{
  sum+=choose(winners,k)*choose(population-winners,selected-k)/denom;
  return sum;
});}
function pickCum(r,cumulative){for(let i=0;i<cumulative.length-1;i++)if(r<cumulative[i])return i;return cumulative.length-1;}
const MAIN_CDF=cumulativeProbs(50,5,5);
const EURO_CDF=Object.fromEntries([8,10,12].map(n=>[n,cumulativeProbs(n,2,2)]));
export async function monteCarloBenchmarks(dates,columns,observed={},reps=1000,onProgress=()=>{}){
  if(!Array.isArray(dates)||!dates.length||!Number.isInteger(columns)||columns<1||columns>30)throw Error('Neplatné parametry náhodného benchmarku.');
  const runs=Math.min(5000,Math.max(100,Number(reps)||1000)), groups={8:0,10:0,12:0};
  for(const date of dates)groups[euroPoolAt(date)]++;
  const vals3=[],valsPrize=[];
  for(let trial=0;trial<runs;trial++){
    const rng=rand(hash('lotto-ai-mc-2.1-'+trial)),n3={value:0},nPrize={value:0};
    for(const [era,times] of Object.entries(groups)){
      const trials=times*columns,euroCDF=EURO_CDF[era];
      for(let j=0;j<trials;j++){
        const m=pickCum(rng(),MAIN_CDF),e=pickCum(rng(),euroCDF);
        if(m>=3)n3.value++;
        if(prizeTier(m,e)!==null)nPrize.value++;
      }
    }
    vals3.push(n3.value);valsPrize.push(nPrize.value);
    if(trial%50===49){onProgress((trial+1)/runs);await yieldUI();}
  }
  vals3.sort((a,b)=>a-b);valsPrize.sort((a,b)=>a-b);
  const q=(values,p)=>values[Math.floor((values.length-1)*p)];
  const obs3=observed.threePlus??0,obsPrize=Object.values(observed.tiers||{}).reduce((a,b)=>a+b,0);
  onProgress(1);
  return {runs,columns,draws:dates.length,observed:{threePlus:obs3,prizes:obsPrize},threePlus:{p05:q(vals3,.05),median:q(vals3,.5),p95:q(vals3,.95),mean:vals3.reduce((a,b)=>a+b,0)/runs,pTail:(1+vals3.filter(x=>x>=obs3).length)/(runs+1)},prizes:{p05:q(valsPrize,.05),median:q(valsPrize,.5),p95:q(valsPrize,.95),mean:valsPrize.reduce((a,b)=>a+b,0)/runs,pTail:(1+valsPrize.filter(x=>x>=obsPrize).length)/(runs+1)}};
}

// Historical payout amounts are draw- and tier-specific and NOT fixed over time.
export function parsePayoutCsv(csv){
  const lines=String(csv).replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());
  if(!lines.length)return {payouts:{},imported:0,rejected:0};
  const sep=lines[0].includes(';')?';':',';
  const header=lines[0].toLowerCase().includes('date')||lines[0].toLowerCase().includes('datum');
  const payouts={};let imported=0,rejected=0;
  for(const row of lines.slice(header?1:0)){
    const [dateText,tierText,amountText]=row.split(sep).map(x=>x.trim());
    const date=parseDate(dateText),tier=Number(tierText),amount=Number(amountText.replace(/\s/g,'').replace(',','.'));
    if(!date||!Number.isInteger(tier)||tier<1||tier>12||!Number.isFinite(amount)||amount<0){rejected++;continue;}
    (payouts[date]??={})[tier]=amount;imported++;
  }
  return {payouts,imported,rejected};
}
export function financeFromBacktest(test,ticketCost=0){
  const price=Number(ticketCost);
  if(!Number.isFinite(price)||price<0)throw Error('Neplatná cena sloupce.');
  const spending=Number((test.tested*test.columns*price).toFixed(2));
  const winningCount=Object.values(test.model.tiers).reduce((a,b)=>a+b,0);
  const complete=test.model.unknownPayouts===0;
  return {spending,winningCount,paid:complete?Number(test.model.paid.toFixed(2)):null,net:complete?Number((test.model.paid-spending).toFixed(2)):null,missing:test.model.unknownPayouts,
    knownPaid:Number(test.model.paid.toFixed(2)),complete};
}
