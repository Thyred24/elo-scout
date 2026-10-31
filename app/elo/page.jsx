"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Box, Flex, Heading, HStack, Input, NativeSelect, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { data, ratingsBefore, teamKey } from "@/lib/football";
import { useFootballStore } from "@/components/store";
import { TeamCrest } from "@/components/team-crest";

const cardStyle={className:"surface-card",bg:"#111f31",border:"1px solid #26384c",rounded:"2xl",boxShadow:"0 12px 32px rgba(0,0,0,.16)"};

function Movement({change,previousRank}){
  if(change>0)return <Badge className="status-pill status-success" colorPalette="green" variant="subtle" px={2.5} py={1}>↑ {change} sıra</Badge>;
  if(change<0)return <Badge className="status-pill status-danger" colorPalette="red" variant="subtle" px={2.5} py={1}>↓ {Math.abs(change)} sıra</Badge>;
  return <HStack color="#8da3b9" gap={1}><Text fontSize="sm">—</Text><Text fontSize="xs">{previousRank}. sırada</Text></HStack>;
}

export default function EloPage(){
  const {results,hydrated}=useFootballStore();
  const [query,setQuery]=useState("");
  const [country,setCountry]=useState("all");
  const [sort,setSort]=useState("elo-desc");
  useEffect(()=>{const team=new URLSearchParams(window.location.search).get('team');if(team)setQuery(team);},[]);

  const rankings=useMemo(()=>{
    const uniqueTeams=new Map();
    for(const row of data.ratings)uniqueTeams.set(teamKey(row.team),row);
    const baseline=[...uniqueTeams.values()].sort((a,b)=>Number(b.elo)-Number(a.elo)||a.team.localeCompare(b.team,"tr"));
    const startingRank=new Map(baseline.map((r,i)=>[teamKey(r.team),i+1]));
    const current=ratingsBefore("9999-12-31",results);
    const played=new Map(baseline.map(r=>[teamKey(r.team),Number(r.matches)||0]));
    for(const match of results){
      if(match.date<data.asOf)continue;
      const home=teamKey(match.home),away=teamKey(match.away);
      if(played.has(home))played.set(home,played.get(home)+1);
      if(played.has(away))played.set(away,played.get(away)+1);
    }
    const rows=baseline.map(r=>({...r,elo:current.get(teamKey(r.team))??Number(r.elo),matches:played.get(teamKey(r.team))??(Number(r.matches)||0),previousRank:startingRank.get(teamKey(r.team))}));
    rows.sort((a,b)=>b.elo-a.elo||a.team.localeCompare(b.team,"tr"));
    return rows.map((r,i)=>({...r,rank:i+1,rankChange:r.previousRank-(i+1)}));
  },[results]);

  const countries=useMemo(()=>[...new Set(rankings.map(r=>r.country).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"tr")),[rankings]);
  const movers={up:rankings.filter(r=>r.rankChange>0).length,down:rankings.filter(r=>r.rankChange<0).length};
  const visible=useMemo(()=>{
    const q=query.trim().toLocaleLowerCase("tr");
    const rows=rankings.filter(r=>(country==="all"||r.country===country)&&(!q||r.team.toLocaleLowerCase("tr").includes(q)||String(r.country||"").toLocaleLowerCase("tr").includes(q)));
    if(sort==="elo-asc")rows.sort((a,b)=>a.elo-b.elo||a.team.localeCompare(b.team,"tr"));
    else if(sort==="name")rows.sort((a,b)=>a.team.localeCompare(b.team,"tr"));
    return rows;
  },[rankings,query,country,sort]);

  const movementFor=r=><Movement change={r.rankChange} previousRank={r.previousRank}/>;
  const rowContent=r=><>
    <td className="elo-rank-cell"><span className="elo-rank-number">{r.rank}</span></td>
    <td><HStack gap={3}><TeamCrest name={r.team} size={36}/><Box><Text fontWeight="800" color="#e0eaf4">{r.team}</Text><Text fontSize="xs" color="#92a6bb">{r.country||"Ülke belirtilmemiş"}</Text></Box></HStack></td>
    <td><Text fontSize="lg" fontWeight="900" color="#e9f0f7">{Math.round(r.elo)}</Text></td>
    <td><Text color="#a9bbcf" fontWeight="700">{r.matches}</Text></td>
    <td>{movementFor(r)}</td>
  </>;

  return <Stack gap={5}>
    <Flex justify="space-between" align={{base:"start",md:"end"}} direction={{base:"column",md:"row"}} gap={3}>
      <Stack gap={1}><Text color="#58cbbb" fontSize="xs" fontWeight="800" letterSpacing=".14em">TAKIM GÜÇ SIRALAMASI</Text><Heading size={{base:"xl",md:"2xl"}}>Elo sıralaması</Heading><Text color="#92a6bb">Kayıtlı maç skorları girildikçe Elo ve sıralama burada güncellenir.</Text></Stack>
      <Badge colorPalette="blue" variant="subtle" px={3} py={2}>Güncel · {hydrated?rankings.length:"—"} takım</Badge>
    </Flex>

    <SimpleGrid columns={{base:1,sm:3}} gap={3}>
      <Box {...cardStyle} p={4}><Text color="#92a6bb" fontSize="xs" fontWeight="800" letterSpacing=".08em">LİSTEDEKİ TAKIM</Text><Text fontSize="2xl" fontWeight="900" color="#e9f0f7" mt={1}>{hydrated?rankings.length:"—"}</Text><Text fontSize="xs" color="#8da3b9">başlangıç Elo verisi: {data.asOf}</Text></Box>
      <Box {...cardStyle} p={4} bg="#132a27"><Text color="#557c69" fontSize="xs" fontWeight="800" letterSpacing=".08em">YÜKSELEN</Text><Text fontSize="2xl" fontWeight="900" color="#49c98a" mt={1}>↑ {movers.up}</Text><Text fontSize="xs" color="#8da3b9">başlangıç sırasına göre</Text></Box>
      <Box {...cardStyle} p={4} bg="#301f27"><Text color="#f07878" fontSize="xs" fontWeight="800" letterSpacing=".08em">GERİLEYEN</Text><Text fontSize="2xl" fontWeight="900" color="#f07878" mt={1}>↓ {movers.down}</Text><Text fontSize="xs" color="#8da3b9">başlangıç sırasına göre</Text></Box>
    </SimpleGrid>

    <Flex className="surface-card" bg="#111f31" border="1px solid #26384c" rounded="2xl" p={{base:3,md:4}} wrap="wrap" align="end" gap={3}>
      <Box flex="1" minW={{base:"full",md:"260px"}}><Text fontSize="xs" color="#92a6bb" mb={1}>Takım ara</Text><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Örn. Inter Milan"/></Box>
      <Box minW={{base:"full",sm:"210px"}}><Text fontSize="xs" color="#92a6bb" mb={1}>Ülke</Text><NativeSelect.Root><NativeSelect.Field value={country} onChange={e=>setCountry(e.target.value)}><option value="all">Tüm ülkeler</option>{countries.map(c=><option key={c} value={c}>{c}</option>)}</NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root></Box>
      <Box minW={{base:"full",sm:"210px"}}><Text fontSize="xs" color="#92a6bb" mb={1}>Sıralama</Text><NativeSelect.Root><NativeSelect.Field value={sort} onChange={e=>setSort(e.target.value)}><option value="elo-desc">Elo · yüksekten düşüğe</option><option value="elo-asc">Elo · düşükten yükseğe</option><option value="name">Takım adı</option></NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root></Box>
    </Flex>

    <Box {...cardStyle} p={{base:3,md:5}}>
      <Flex justify="space-between" align="center" gap={3} mb={4}><Box><Text color="#58cbbb" fontSize="xs" fontWeight="800" letterSpacing=".12em">CANLI SIRALAMA</Text><Heading size="md">Takımlar</Heading></Box><Text color="#8da3b9" fontSize="sm">{visible.length} sonuç</Text></Flex>
      <Box overflowX="auto" display={{base:"none",md:"block"}}><Box as="table" className="elo-table" w="full" minW="680px"><thead><tr>{["Sıra","Takım / ülke","Güncel Elo","Maç","Sıra değişimi"].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{visible.map(r=><tr key={r.team}>{rowContent(r)}</tr>)}</tbody></Box></Box>
      <Stack display={{base:"flex",md:"none"}} gap={2}>{visible.map(r=><Box key={r.team} className="elo-mobile-row"><Flex justify="space-between" align="start" gap={3}><HStack align="start" gap={3}><span className="elo-rank-number">{r.rank}</span><HStack gap={2}><TeamCrest name={r.team} size={34}/><Box><Text fontWeight="800" color="#e0eaf4">{r.team}</Text><Text fontSize="xs" color="#92a6bb">{r.country||"Ülke belirtilmemiş"} · {r.matches} maç</Text></Box></HStack></HStack><Box textAlign="right"><Text fontSize="lg" fontWeight="900" color="#e9f0f7">{Math.round(r.elo)}</Text>{movementFor(r)}</Box></Flex></Box>)}</Stack>
      {!visible.length&&<Text py={10} textAlign="center" color="#8da3b9">Bu aramayla eşleşen takım bulunamadı.</Text>}
    </Box>

    <Flex className="elo-legend" wrap="wrap" gap={3} align="center" color="#92a6bb" fontSize="xs"><Text fontWeight="700">Sıra değişimi başlangıç Elo listesinden bugüne hesaplanır:</Text><Movement change={1} previousRank={2}/><Movement change={-1} previousRank={2}/><Movement change={0} previousRank={1}/></Flex>
  </Stack>;
}
