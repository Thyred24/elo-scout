const crestIds={
  "arsenal":57,"astonvilla":58,"bournemouth":1044,"brentford":402,"brightonhovealbion":397,"chelsea":61,"crystalpalace":354,"everton":62,"fulham":63,"leedsunited":341,"liverpool":64,"manchestercity":65,"manchesterunited":66,"newcastleunited":67,"nottinghamforest":351,"tottenhamhotspur":73,"westhamunited":563,"wolverhamptonwanderers":76,
  "bayernmunich":5,"borussiadortmund":4,"bayerleverkusen":3,"rbleipzig":721,"stuttgart":10,"freiburg":17,"eintrachtfrankfurt":19,
  "barcelona":81,"fcbarcelona":81,"realmadrid":86,"atleticomadrid":78,"atleticodemadrid":78,"realbetis":90,"valencia":95,"villarreal":94,
  "intermilan":108,"internazionale":108,"milan":98,"juventus":109,"napoli":113,"roma":100,"lazio":110,"atalanta":102,"fiorentina":99,
  "parissaintgermain":524,"psg":524,"marseille":516,"lyon":523,"monaco":548
};
const normalize=name=>String(name||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("en").replace(/[^a-z0-9]/g,"");
const teamColors={arsenal:"#a5202a",chelsea:"#1557a5",liverpool:"#a51d31",manchestercity:"#3b94bd",manchesterunited:"#b52935",realmadrid:"#d5cba4",barcelona:"#893047",juventus:"#28313c",milan:"#8c2433",intermilan:"#16518b",parissaintgermain:"#2557a2"};
export function TeamCrest({name,size=42}){
  const key=normalize(name),id=crestIds[key],abbr=String(name||"?").split(/\s+/).filter(word=>!(/^(fc|afc|ac|ssc|rc|cf|sc|club)$/i.test(word))).slice(0,3).map(word=>word[0]).join("").toUpperCase();
  const fallbackColor=teamColors[key]||"#28435e";
  return <span className="team-crest" style={{width:size,height:size,"--crest-bg":fallbackColor}} role="img" aria-label={`${name} arması`} title={name}>
    <span className="team-crest__fallback">{abbr}</span>
    {id&&<img src={`https://crests.football-data.org/${id}.png`} alt="" loading="lazy" onError={event=>{event.currentTarget.style.display="none";}}/>}
  </span>;
}
