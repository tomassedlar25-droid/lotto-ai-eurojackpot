/* LOTTO AI — analysis engine. No external dependencies; all models are heuristic. */
export const RELEASE='1.0.0';
export const HISTORY_URL='https://raw.githubusercontent.com/dev-baris/lottery-archive/main/eu/eurojackpot/results.csv';
export const MAX_EURO=12;
export const euroPoolAt=date=>date<'2014-10-10'?8:date<'2022-03-25'?10:12;
export function parseDate(raw){
  const s=String(raw??'').trim().replace(/^\uFEFF/,'');
  if(/^\d{4}-\d\d-\d\d$/.test(s))return isRealDate(s)?s:null;
  let m=s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
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
  const mainIdx=header?Array.from({length:5},(_,i)=>find([`n${i+1}`,`z${i+1}`,`main${i+1}`,`number${i+1}`,`zahl${i+1}`])):[1,2,3,4,5];
  const euroIdx=header?Array.from({length:2},(_,i)=>find([`e${i+1}`,`euro${i+1}`,`euronumber${i+1}`,`euronum${i+1}`])):[6,7];
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
export function ranking(history,{strategy='trend',filter=true}={}){
  const ban=filter?new Set(positionalBlacklist(history)):new Set();
  const a=recentZ(history,5,50,'main'),b=recentZ(history,75,50,'main');
  const counts=frequency(history,'main',75), rng=rand(hash(history.at(-1)?.date||'start'));
  return Array.from({length:50},(_,i)=>({num:i+1,score:strategy==='random'?rng():strategy==='frequency'?counts[i].ratio:strategy==='antitrend'?b[i]-a[i]:a[i]-b[i],excluded:ban.has(i+1)}))
    .sort((x,y)=>y.score-x.score||x.num-y.num);
}
function weightedPick(pool,size,rng,used){let available=[...pool],picked=[];for(let i=0;i<size;i++){
  let weights=available.map(x=>Math.exp(Math.max(-3,Math.min(3,x.weight||0)))*1/(1+0.70*(used.get(x.num)||0)));
  let r=rng()*weights.reduce((x,y)=>x+y,0),idx=0;while(idx<weights.length-1&&(r-=weights[idx])>0)idx++;
  picked.push(available[idx].num);available.splice(idx,1);
}return sortNums(picked);}
export function generateTickets(history,settings={}){
  const opts={count:6,strategy:'trend',filter:true,pool:12,maxOverlap:2,seed:1,...settings};
  if(!Number.isInteger(opts.count)||opts.count<1||opts.count>30)throw Error('Počet tiketů musí být 1–30.');
  if(!history.length)throw Error('Nejdříve načti alespoň jedno losování.');
  const ranked=ranking(history,opts),ban=opts.filter?positionalBlacklist(history):[];
  const candidates=ranked.filter(x=>!x.excluded).slice(0,Math.max(5,Math.min(50,Number(opts.pool)||12)));
  if(candidates.length<5)throw Error('Filtr vyřadil příliš mnoho čísel.');
  const pool=candidates.map((x,i)=>({num:x.num,weight:opts.strategy==='random'?0:1.35*(candidates.length-1-i)/Math.max(candidates.length-1,1)}));
  const euroRanks=frequency(history,'euro',15).sort((a,b)=>b.count-a.count||a.num-b.num);
  const rng=rand(hash(history.at(-1)?.date)+Number(opts.seed)*1009);
  const euroOrder=opts.strategy==='random'?Array.from({length:12},(_,i)=>i+1):euroRanks.map(x=>x.num);
  if(opts.strategy==='random')for(let i=euroOrder.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[euroOrder[i],euroOrder[j]]=[euroOrder[j],euroOrder[i]];}
  const pairs=[sortNums(euroOrder.slice(0,2)),sortNums(euroOrder.slice(2,4))];
  const used=new Map();let tickets=[],violations=0;
  for(let j=0;j<opts.count;j++){
    let picked=null,best=null,bestPenalty=Infinity;
    for(let attempt=0;attempt<1600;attempt++){
      const test=weightedPick(pool,5,rng,used);
      const penalty=tickets.reduce((sum,t)=>sum+Math.max(0,intersection(test,t.main)-opts.maxOverlap),0);
      if(penalty<bestPenalty){bestPenalty=penalty;best=test;}
      if(penalty===0){picked=test;break;}
    }
    picked ||= best;if(bestPenalty>0)violations++;
    for(const n of picked)used.set(n,(used.get(n)||0)+1);
    tickets.push({main:picked,euro:pairs[j%2]});
  }
  return {tickets,blacklist:ban,candidates:candidates.map(x=>x.num),euroPairs:pairs,overlapWarnings:violations};
}
export function intersection(a,b){return a.reduce((count,x)=>count+Number(b.includes(x)),0);}
export function prizeTier(m,e){
  const tiers={'5-2':1,'5-1':2,'5-0':3,'4-2':4,'4-1':5,'3-2':6,'4-0':7,'2-2':8,'3-1':9,'3-0':10,'1-2':11,'2-1':12};return tiers[`${m}-${e}`]||null;
}
function evaluate(tickets,result,acc){
  let bestMain=0,bestEuro=0,prize=0;
  for(const t of tickets){const m=intersection(t.main,result.main),e=intersection(t.euro,result.euro);
    acc.matrix[`${m}+${e}`]=(acc.matrix[`${m}+${e}`]||0)+1;
    bestMain=Math.max(bestMain,m);bestEuro=Math.max(bestEuro,e);
    const tier=prizeTier(m,e);if(tier){acc.tiers[tier]=(acc.tiers[tier]||0)+1;prize++;}
    if(m>=3)acc.threePlus++;
    acc.totalMain+=m;acc.totalEuro+=e;
  }
  acc.drawsWithPrize+=Number(prize>0);acc.bestMain[bestMain]=(acc.bestMain[bestMain]||0)+1;
  acc.bestEuro[bestEuro]=(acc.bestEuro[bestEuro]||0)+1;
}
function newAcc(){return {matrix:{},tiers:{},drawsWithPrize:0,bestMain:{},bestEuro:{},threePlus:0,totalMain:0,totalEuro:0};}
export function backtest(draws,opts={}){
  const config={count:6,strategy:'trend',filter:true,pool:12,maxOverlap:2,testDraws:100,minTrain:75,seed:1,...opts};
  const eligible=[];
  for(let i=config.minTrain;i<draws.length;i++)if(draws[i].date>='2022-03-25')eligible.push(i);
  const indices=eligible.slice(-Math.min(500,Math.max(1,Number(config.testDraws)||100)));
  if(!indices.length)throw Error('Pro backtest je potřeba více historie.');
  const model=newAcc(),baseline=newAcc();let warnings=0;
  for(const i of indices){
    const past=draws.slice(0,i),result=draws[i];
    const generated=generateTickets(past,{...config,seed:i+config.seed});
    warnings+=generated.overlapWarnings;
    evaluate(generated.tickets,result,model);
    const rnd=generateTickets(past,{...config,strategy:'random',filter:false,pool:50,seed:i+config.seed+8888,maxOverlap:2});
    evaluate(rnd.tickets,result,baseline);
  }
  return {model,baseline,tested:indices.length,columns:config.count,first:draws[indices[0]].date,last:draws[indices.at(-1)].date,warnings};
}
