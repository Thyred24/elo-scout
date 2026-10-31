import data from "./data.json";

export { data };
export const keys = { fixtures: "futbol-elo-fixtures-v1", results: "futbol-elo-results-v1", forecasts: "futbol-elo-forecasts-v1" };
const aliases = new Map([
  ["internazionale","Inter Milan"],["inter","Inter Milan"],["mancity","Manchester City"],["manutd","Manchester United"],["nottmforest","Nottingham Forest"],["leeds","Leeds United"],["spurs","Tottenham Hotspur"],["brighton","Brighton & Hove Albion"],
  ["deportivoalaves","Alavés"],["getafecf","Getafe"],["villarrealcf","Villarreal"],["rcdespanyoldebarcelona","Espanyol"],["levanteud","Levante"],["atleticodemadrid","Atlético Madrid"],["atleti","Atlético Madrid"],["celta","Celta Vigo"],["fcbarcelona","Barcelona"],["caosasuna","Osasuna"],
  ["fcbayernmunchen","Bayern Munich"],["bayernmunchen","Bayern Munich"],["vfbstuttgart","Stuttgart"],["1fckoln","Cologne"],["tsghoffenheim","Hoffenheim"],["1fcunionberlin","Union Berlin"],["1fsvmainz05","Mainz"],["bayer04leverkusen","Bayer Leverkusen"],["leverkusen","Bayer Leverkusen"],["hamburgersv","Hamburg"],["scfreiburg","Freiburg"],["svwerderbremen","Werder Bremen"],["fcaugsburg","Augsburg"],["fcschalke04","Schalke"],
  ["olympiquedemarseille","Marseille"],["rcstrasbourgalsace","Strasbourg"],["ajauxerre","Auxerre"],["stadebrestois29","Brest"],["ogcnice","Nice"],["fclorient","Lorient"],["toulousefc","Toulouse"],["olympiquelyonnais","Lyon"],["angerssco","Angers"],["losclille","Lille"],["havreathleticclub","Le Havre"],["asmonaco","Monaco"],["staderennaisfc","Rennes"],
  ["bdortmund","Borussia Dortmund"],["paris","Paris Saint-Germain"],["sbratislava","Slovan Bratislava"],["leipzig","RB Leipzig"],["psv","PSV Eindhoven"],["valenciacf","Valencia"],["sevilla","Sevilla FC"],["elche","Elche CF"],["copenhagen","FC Copenhagen"],["omonoia","Omonia"],
  ["besiktas","Beşiktaş"],["kasimpasa","Kasımpaşa"],["genclerbirligi","Gençlerbirliği"],["gaziantep","Gaziantep FK"],["newcastle","Newcastle United"],["lens","RC Lens"],["lechpoznan","Lech Poznań"],["viktoriaplzen","Viktoria Plzeň"],["shakhtar","Shakhtar Donetsk"],["jagiellonia","Jagiellonia Białystok"],["istanbulbasaksehir","Başakşehir"],["ucraiova","Universitatea Craiova"]
]);
export const normalize = (name) => String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
export const teamKey = (name) => normalize(aliases.get(normalize(name)) || name);
export const competitionNames = [...new Set([...data.matches, ...data.fixtures].map((x) => x.competition).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"tr"));
export const isoDate = (m) => String(m?.date || m?.kickoff || "").slice(0,10);
export const matchTime = (m) => m?.time || String(m?.kickoff || "").slice(11,16);
export const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
export const formatDate = (date, options={weekday:"long",day:"numeric",month:"long",year:"numeric"}) => date ? new Intl.DateTimeFormat("tr-TR",options).format(new Date(`${date}T12:00:00`)) : "Tarih belirtilmemiş";
export const hasScore = (m) => m?.homeGoals !== null && m?.homeGoals !== undefined && m?.homeGoals !== "" && m?.awayGoals !== null && m?.awayGoals !== undefined && m?.awayGoals !== "" && Number.isFinite(Number(m.homeGoals)) && Number.isFinite(Number(m.awayGoals));
export const kickoffPassed = (m) => { const d=isoDate(m); if(!d)return false;const t=matchTime(m)||"23:59";return Date.now()>=new Date(`${d}T${t}:00+03:00`).getTime(); };
export function getAllMatches(fixtures=[], results=[]) {
  const map=new Map([...data.matches.map(m=>[String(m.id),{...m,kind:"history"}]),...data.fixtures.map(m=>[String(m.id),{...m,kind:"seed"}]),...fixtures.map(m=>[String(m.id),{...m,kind:"custom"}])]);
  for(const r of results){const prev=map.get(String(r.matchId))||{};map.set(String(r.matchId),{...prev,...r,id:String(r.matchId),kickoff:`${r.date}T${r.time||"12:00"}`,status:"Tamamlandı"});}
  return [...map.values()];
}
export function ratingsBefore(date, results=[]) {
  const ratings=new Map(data.ratings.map(r=>[teamKey(r.team),Number(r.elo)]));
  const events=results.filter(r=>r.date>=data.asOf&&r.date<date).sort((a,b)=>a.date.localeCompare(b.date)||String(a.time||"").localeCompare(String(b.time||"")));
  for(let i=0;i<events.length;){let j=i+1;while(j<events.length&&events[j].date===events[i].date)j++;const delta=new Map();for(const r of events.slice(i,j)){const h=teamKey(r.home),a=teamKey(r.away),rh=ratings.get(h),ra=ratings.get(a);if(rh==null||ra==null)continue;const expected=1/(1+10**((ra-rh-60)/400)),actual=Number(r.homeGoals)>Number(r.awayGoals)?1:Number(r.homeGoals)<Number(r.awayGoals)?0:.5,change=20*(actual-expected);delta.set(h,(delta.get(h)||0)+change);delta.set(a,(delta.get(a)||0)-change);}for(const[k,v]of delta)ratings.set(k,ratings.get(k)+v);i=j;}
  return ratings;
}
export function ratingFor(name, ratingsMap) { const k=teamKey(name),base=data.ratings.find(r=>teamKey(r.team)===k),elo=ratingsMap.get(k);return base&&elo!=null?{...base,elo}:null; }
export function completedHistory(results=[]) {
  return getAllMatches([],results).filter(m=>hasScore(m)&&(m.status==="Tamamlandı"||results.some(r=>String(r.matchId)===String(m.id)))).map(m=>({...m,date:isoDate(m),homeGoals:Number(m.homeGoals),awayGoals:Number(m.awayGoals),time:matchTime(m)})).sort((a,b)=>a.date.localeCompare(b.date)||String(a.time||"").localeCompare(String(b.time||"")));
}
export function teamMatches(team,results=[],venue="all",beforeDate=null) {
  const k=teamKey(team);return completedHistory(results).filter(m=>{const home=teamKey(m.home)===k,away=teamKey(m.away)===k;return(home||away)&&(venue==="all"||(venue==="home"&&home)||(venue==="away"&&away))&&(!beforeDate||m.date<beforeDate);}).reverse().slice(0,5);
}
export function outcome(match,team){const home=teamKey(match.home)===teamKey(team),gf=home?match.homeGoals:match.awayGoals,ga=home?match.awayGoals:match.homeGoals;return{result:gf>ga?"W":gf<ga?"L":"D",gf,ga};}
export function teamStats(rows,team){const values=rows.map(m=>outcome(m,team)),n=values.length||1;return{played:values.length,w:values.filter(v=>v.result==="W").length,d:values.filter(v=>v.result==="D").length,l:values.filter(v=>v.result==="L").length,gf:values.reduce((s,v)=>s+v.gf,0)/n,ga:values.reduce((s,v)=>s+v.ga,0)/n};}
const factorial=n=>{let f=1;for(let i=2;i<=n;i++)f*=i;return f;};
const poisson=(lambda,k)=>Math.exp(-lambda)*lambda**k/factorial(k);
export function forecastMatch(match,home,away,homeOverall,awayOverall,homeVenue,awayVenue){
  const model=data.scoreModel||{intercept:0,slope:.0025,meanTotal:2.6},diff=model.intercept+model.slope*(home.elo+60-away.elo),total=model.meanTotal||2.6,bh=Math.max(.2,Math.min(4.3,(total+diff)/2)),ba=Math.max(.2,Math.min(4.3,(total-diff)/2));
  const h=homeVenue.played>=2?homeVenue:homeOverall,a=awayVenue.played>=2?awayVenue:awayOverall,w=.15+.3*Math.min(h.played,a.played,5)/5,lh=bh*(1-w)+Math.max(.2,Math.min(4.3,h.played&&a.played?(h.gf+a.ga)/2:bh))*w,la=ba*(1-w)+Math.max(.2,Math.min(4.3,h.played&&a.played?(a.gf+h.ga)/2:ba))*w;
  const cells=[];let z=0;for(let x=0;x<=9;x++)for(let y=0;y<=9;y++){const p=poisson(lh,x)*poisson(la,y);cells.push({x,y,p});z+=p;}cells.forEach(c=>c.p/=z);const sum=fn=>cells.filter(fn).reduce((s,c)=>s+c.p,0);
  const events={MS1:c=>c.x>c.y,Beraberlik:c=>c.x===c.y,MS2:c=>c.x<c.y,"2.5 Üst":c=>c.x+c.y>=3,"2.5 Alt":c=>c.x+c.y<=2,"Karşılıklı gol: Evet":c=>c.x>0&&c.y>0,"Karşılıklı gol: Hayır":c=>c.x===0||c.y===0,[`${match.home} 1.5 Üst`]:c=>c.x>=2,[`${match.away} 1.5 Üst`]:c=>c.y>=2,[`${match.home} 0.5 Üst`]:c=>c.x>=1,[`${match.away} 0.5 Üst`]:c=>c.y>=1};
  const probs=Object.fromEntries(Object.entries(events).map(([n,fn])=>[n,sum(fn)]));
  const main=Object.entries(events).filter(([n])=>!n.includes("0.5 Üst")&&!n.includes("1.5 Üst")).map(([market,fn])=>({market,p:sum(fn),fn})).sort((a,b)=>b.p-a.p)[0];
  const halftimeProbabilities={},halftimeOutsideMain={};
  const halfShare=.43;
  for(let h1=0;h1<=6;h1++)for(let a1=0;a1<=6;a1++)for(let h2=0;h2<=6;h2++)for(let a2=0;a2<=6;a2++){
    const p=poisson(lh*halfShare,h1)*poisson(la*halfShare,a1)*poisson(lh*(1-halfShare),h2)*poisson(la*(1-halfShare),a2);
    const ht=h1>a1?'1':h1<a1?'2':'X',ft=h1+h2>a1+a2?'1':h1+h2<a1+a2?'2':'X',key='İY/MS '+ht+'/'+ft;
    halftimeProbabilities[key]=(halftimeProbabilities[key]||0)+p;
    if(!main.fn({x:h1+h2,y:a1+a2}))halftimeOutsideMain[key]=(halftimeOutsideMain[key]||0)+p;
  }  const sorted=[...cells].sort((a,b)=>b.p-a.p);
  const exact=sorted.find(main.fn)||sorted[0];

  // The risk pick must include the main pick and the model's displayed score.
  // Generate only familiar match-result, total-goals and BTTS combinations.
  // alternative, rather than an unrelated result or an exact-score lottery.
  const msAtoms=[['MS1',c=>c.x>c.y],['Beraberlik',c=>c.x===c.y],['MS2',c=>c.x<c.y]];
  const totalAtoms=[['4.5 Alt',c=>c.x+c.y<=4],['4.5 Üst',c=>c.x+c.y>=5]];
  const bttsAtoms=[['KG Var',c=>c.x>0&&c.y>0],['KG Yok',c=>c.x===0||c.y===0]];
  const handicapAtoms=[['HMS 1 (-1)',c=>c.x-c.y>=2],['HMS X (-1)',c=>c.x-c.y===1],['HMS 2 (-1)',c=>c.x-c.y<=0],['HMS 1 (+1)',c=>c.x-c.y>=0],['HMS X (+1)',c=>c.x-c.y===-1],['HMS 2 (+1)',c=>c.x-c.y<=-2]];
  const comboGroups=[...msAtoms.flatMap(ms=>totalAtoms.map(m=>[ms,m])),...msAtoms.flatMap(ms=>bttsAtoms.map(m=>[ms,m]))];
  const candidates=[];
  for(const group of comboGroups){
    const parts=group.map(x=>x[0]),preds=group.map(x=>x[1]);
    if(!preds.every(fn=>fn(exact)))continue;
    const pickFn=c=>preds.every(fn=>fn(c)),p=sum(pickFn);
    if(p<=0||p>=main.p-.015)continue;
    const weakestPart=Math.min(...preds.map(fn=>sum(fn)));
    if(p>=weakestPart-.002)continue;
    if(sum(c=>pickFn(c)&&!main.fn(c))>.000001)continue;
    candidates.push({market:parts.join(' + '),p,size:2,kind:'combo'});
  }
  for(const [market,fn] of handicapAtoms){
    const p=sum(fn);
    if(p>0&&p<main.p-.015&&fn(exact)&&sum(c=>fn(c)&&!main.fn(c))<.000001)candidates.push({market,p,size:1,kind:'handicap'});
  }
  const exactFT=exact.x>exact.y?'1':exact.x<exact.y?'2':'X';
  for(const [market,p] of Object.entries(halftimeProbabilities))if(market.endsWith('/'+exactFT)&&p>=.18&&p<main.p-.015&&(halftimeOutsideMain[market]||0)<.000001)candidates.push({market,p,size:1,kind:'htft'});
  const target=Math.min(.34,Math.max(.20,main.p*.68));
  const maxRiskP=Math.min(.46,main.p-.015);
  const minRiskP=Math.min(.18,maxRiskP*.55);
  const preferred=candidates.filter(c=>c.p>=minRiskP&&c.p<=maxRiskP);
  // Keep a coherent combined pick even when its model probability is below
  // the preferred band; an exact score should only be the last resort.
  const pool=preferred.length?preferred:candidates.filter(c=>c.p>0&&c.p<main.p-.015);
  pool.sort((a,b)=>Math.abs(a.p-target)-Math.abs(b.p-target)||(a.kind==="combo"?0:a.kind==="htft"?1:2)-(b.kind==="combo"?0:b.kind==="htft"?1:2)||a.market.localeCompare(b.market,"tr"));
  const risk=pool[0]||{market:`Skor ${exact.x}-${exact.y}`,p:exact.p};
  return{lh,la,w,probs,main:{market:main.market,p:main.p},risk,exact};
}
export const FORECAST_VERSION=5;
export function forecastForMatch(match,results=[]){
  if(!match)return null;
  const date=isoDate(match),ratings=ratingsBefore(date,results);
  let home=ratingFor(match.home,ratings),away=ratingFor(match.away,ratings);
  if(match.kind==="history"&&match.homeEloBefore!=null&&match.awayEloBefore!=null){home={team:match.home,elo:Number(match.homeEloBefore)};away={team:match.away,elo:Number(match.awayEloBefore)};}
  if(!home||!away)return null;
  const homeOverall=teamStats(teamMatches(match.home,results,"all",date),match.home),awayOverall=teamStats(teamMatches(match.away,results,"all",date),match.away);
  const homeVenue=teamStats(teamMatches(match.home,results,"home",date),match.home),awayVenue=teamStats(teamMatches(match.away,results,"away",date),match.away);
  const forecast=forecastMatch(match,home,away,homeOverall,awayOverall,homeVenue,awayVenue);
  return forecast?{...forecast,homeElo:home.elo,awayElo:away.elo}:null;
}
export function evaluateMarket(market,match,result){
  if(!hasScore(result))return null;
  const h=Number(result.homeGoals),a=Number(result.awayGoals);
  for(const part of String(market||'').split(' + ')){
    if(part==='MS1'&&!(h>a))return false;
    if(part==='MS2'&&!(h<a))return false;
    if(part==='Beraberlik'&&h!==a)return false;
    if(part==='2.5 Üst'&&h+a<3)return false;
    if(part==='2.5 Alt'&&h+a>2)return false;
    if(part==='4.5 Üst'&&h+a<5)return false;
    if(part==='4.5 Alt'&&h+a>4)return false;
    if(part==='3.5 Üst'&&h+a<4)return false;
    if(part==='1.5 Alt'&&h+a>1)return false;
    if(['KG Var','Karşılıklı gol: Evet'].includes(part)&&!(h>0&&a>0))return false;
    if(['KG Yok','Karşılıklı gol: Hayır'].includes(part)&&!(h===0||a===0))return false;
    const score=part.match(/^Skor (\d+)-(\d+)$/);
    if(score&&(h!==Number(score[1])||a!==Number(score[2])))return false;
    const htft=part.match(/^İY.MS ([1X2]).([1X2])$/);
    if(htft){
      if(result.halfTimeHomeGoals==null||result.halfTimeAwayGoals==null||result.halfTimeHomeGoals===''||result.halfTimeAwayGoals==='')return null;
      const hh=Number(result.halfTimeHomeGoals),ha=Number(result.halfTimeAwayGoals),ht=hh>ha?'1':hh<ha?'2':'X',ft=h>a?'1':h<a?'2':'X';
      if(ht!==htft[1]||ft!==htft[2])return false;
    }    const handicap=part.match(/^HMS ([1X2]) \(([+-]1)\)$/);
    if(handicap){const diff=h+Number(handicap[2])-a,actual=diff>0?'1':diff<0?'2':'X';if(actual!==handicap[1])return false;}
    if(part.endsWith(' 0.5 Üst')&&(part.slice(0,-8)===match.home?h:a)<1)return false;
    if(part.endsWith(' 1.5 Üst')&&(part.slice(0,-8)===match.home?h:a)<2)return false;
    if(!/^(MS1|MS2|Beraberlik|2\.5 Üst|2\.5 Alt|4\.5 Üst|4\.5 Alt|3\.5 Üst|1\.5 Alt|KG Var|KG Yok|Karşılıklı gol: Evet|Karşılıklı gol: Hayır|HMS [1X2] \([+-]1\)|İY.MS [1X2].[1X2]|Skor \d+-\d+|.+ 0\.5 Üst|.+ 1\.5 Üst)$/.test(part))return null;
  }
  return true;
}