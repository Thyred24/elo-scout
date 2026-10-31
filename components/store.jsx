"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { FORECAST_VERSION, forecastForMatch, getAllMatches, hasScore, keys } from "@/lib/football";

const StoreContext=createContext(null);
const read=(key)=>{try{const value=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(value)?value:[];}catch{return[];}};
export function StoreProvider({children}){
  const [fixtures,setFixtures]=useState([]),[results,setResults]=useState([]),[forecasts,setForecasts]=useState([]),[hydrated,setHydrated]=useState(false),[saveMessage,setSaveMessage]=useState("");
  useEffect(()=>{setFixtures(read(keys.fixtures));setResults(read(keys.results));setForecasts(read(keys.forecasts));setHydrated(true);const refresh=()=>{setFixtures(read(keys.fixtures));setResults(read(keys.results));setForecasts(read(keys.forecasts));};window.addEventListener("storage",refresh);return()=>window.removeEventListener("storage",refresh);},[]);
  useEffect(()=>{
    if(!hydrated)return;
    const matches=new Map(getAllMatches(fixtures,results).map(match=>[String(match.id),match]));
    let changed=false;
    const next=forecasts.map(record=>{
      if(Number(record.version||0)>=FORECAST_VERSION)return record;
      const match=matches.get(String(record.matchId));
      const scored=results.some(result=>String(result.matchId)===String(record.matchId)&&hasScore(result));
      if(!match||scored||hasScore(match)||match.status==="Tamamlandı")return record;
      const forecast=forecastForMatch(match,results);
      if(!forecast)return record;
      changed=true;
      return{...record,version:FORECAST_VERSION,forecast};
    });
    if(changed){try{localStorage.setItem(keys.forecasts,JSON.stringify(next));}catch{}setForecasts(next);}
  },[hydrated,fixtures,results,forecasts]);
  const write=(key,value)=>{
    let persisted=true;
    try{localStorage.setItem(key,JSON.stringify(value));}
    catch{persisted=false;setSaveMessage("Tarayıcı kalıcı kayda izin vermedi; kayıt bu sekme açıkken kullanılabilir.");}
    if(key===keys.fixtures)setFixtures(value);
    if(key===keys.results)setResults(value);
    if(key===keys.forecasts)setForecasts(value);
    return persisted;
  };
  const saveScore=async(row)=>{
    const next=[...results.filter(r=>String(r.matchId)!==String(row.matchId)),row];write(keys.results,next);setSaveMessage("Sonuç tarayıcıya kaydedildi.");
    try{const response=await fetch("/api/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({results:next})});const payload=await response.json();if(!response.ok)throw new Error(payload.error||"Excel'e yazılamadı.");setSaveMessage("Skor Excel'e kaydedildi.");return true;}catch(error){setSaveMessage(`Tarayıcıya kaydedildi; Excel bağlantısı bekliyor. ${error.message}`);return false;}
  };
  const value=useMemo(()=>({fixtures,results,forecasts,hydrated,saveMessage,write,saveScore,setSaveMessage}),[fixtures,results,forecasts,hydrated,saveMessage]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export const useFootballStore=()=>useContext(StoreContext);
