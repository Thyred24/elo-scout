"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { FORECAST_VERSION, forecastForMatch, getAllMatches, hasScore, keys } from "@/lib/football";

const StoreContext=createContext(null);
const emptyBundle=()=>({fixtures:[],results:[],forecasts:[]});
const read=(key)=>{try{const value=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(value)?value:[];}catch{return[];}};
const readLocalBundle=()=>({fixtures:read(keys.fixtures),results:read(keys.results),forecasts:read(keys.forecasts)});
const saveLocalBundle=(bundle)=>{try{localStorage.setItem(keys.fixtures,JSON.stringify(bundle.fixtures));localStorage.setItem(keys.results,JSON.stringify(bundle.results));localStorage.setItem(keys.forecasts,JSON.stringify(bundle.forecasts));return true;}catch{return false;}};

export function StoreProvider({children}){
  const [fixtures,setFixtures]=useState([]),[results,setResults]=useState([]),[forecasts,setForecasts]=useState([]);
  const [hydrated,setHydrated]=useState(false),[saveMessage,setSaveMessage]=useState("");
  const [cloudEnabled,setCloudEnabled]=useState(false),[adminAuthenticated,setAdminAuthenticated]=useState(false),[adminConfigured,setAdminConfigured]=useState(false),[cloudStatus,setCloudStatus]=useState("Kayıt alanı kontrol ediliyor…");
  const latestCloudSave=useRef(Promise.resolve(false));
  const lastCloudError=useRef("");

  useEffect(()=>{
    let active=true;
    const start=async()=>{
      const local=readLocalBundle();
      const [cloudResponse,sessionResponse]=await Promise.all([
        fetch("/api/cloud-data",{cache:"no-store"}).catch(()=>null),
        fetch("/api/admin-session",{cache:"no-store"}).catch(()=>null),
      ]);
      if(!active)return;
      const session=await sessionResponse?.json().catch(()=>({}))||{};
      setAdminAuthenticated(Boolean(session.authenticated));setAdminConfigured(Boolean(session.configured));
      const cloud=await cloudResponse?.json().catch(()=>({}))||{};
      if(cloud.configured){
        setCloudEnabled(true);
        if(cloudResponse?.ok&&cloud.state){
          const bundle={fixtures:Array.isArray(cloud.state.fixtures)?cloud.state.fixtures:[],results:Array.isArray(cloud.state.results)?cloud.state.results:[],forecasts:Array.isArray(cloud.state.forecasts)?cloud.state.forecasts:[]};
          setFixtures(bundle.fixtures);setResults(bundle.results);setForecasts(bundle.forecasts);setCloudEnabled(true);setCloudStatus("Bulut kayıtları bağlı; bu adres ortak kayıtları kullanıyor.");
          setHydrated(true);return;
        }
        setFixtures(local.fixtures);setResults(local.results);setForecasts(local.forecasts);setCloudStatus(cloud.error||"Bulut veritabanı geçici olarak kullanılamıyor; yerel yedek korunuyor.");setHydrated(true);return;
      }
      setFixtures(local.fixtures);setResults(local.results);setForecasts(local.forecasts);setCloudStatus("Yerel kayıt alanı kullanılıyor.");setHydrated(true);
    };
    start();
    const refresh=()=>{if(!cloudEnabled){const local=readLocalBundle();setFixtures(local.fixtures);setResults(local.results);setForecasts(local.forecasts);}};
    window.addEventListener("storage",refresh);
    return()=>{active=false;window.removeEventListener("storage",refresh);};
  },[]);

  const persistCloud=async(bundle)=>{
    lastCloudError.current="";
    try{
      const response=await fetch("/api/cloud-data",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(bundle),cache:"no-store"});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(payload.error||"Bulut kaydı tamamlanamadı.");
      setCloudStatus("Bulut kayıtları güncel.");setSaveMessage("Kayıt çevrim içi olarak saklandı.");return true;
    }catch(error){const message=error.message||"Bulut kaydı yapılamadı; ayarları kontrol et.";lastCloudError.current=message;setCloudStatus("Bulut kaydı yapılamadı.");setSaveMessage(message);return false;}
  };

  const write=(key,value)=>{
    if(cloudEnabled&&!adminAuthenticated){if(key!==keys.forecasts)setSaveMessage("Ortak kaydı değiştirmek için Veri yönetimi bölümünden yönetici girişi yap.");return false;}
    const bundle={fixtures,results,forecasts};
    if(key===keys.fixtures)bundle.fixtures=value;
    else if(key===keys.results)bundle.results=value;
    else if(key===keys.forecasts)bundle.forecasts=value;
    if(!saveLocalBundle(bundle))setSaveMessage("Tarayıcı bu kaydı saklayamadı.");
    setFixtures(bundle.fixtures);setResults(bundle.results);setForecasts(bundle.forecasts);
    if(cloudEnabled)latestCloudSave.current=persistCloud(bundle);
    else setSaveMessage("Kayıt bu tarayıcıya kaydedildi.");
    return true;
  };

  const replaceAll=async(bundle)=>{
    const safe={fixtures:Array.isArray(bundle?.fixtures)?bundle.fixtures:[],results:Array.isArray(bundle?.results)?bundle.results:[],forecasts:Array.isArray(bundle?.forecasts)?bundle.forecasts:[]};
    if(cloudEnabled&&!adminAuthenticated){const error="Yedeği buluta aktarmak için önce yönetici girişi yap.";setSaveMessage(error);return{ok:false,error};}
    if(!saveLocalBundle(safe)){const error="Tarayıcı kaydı yapılamadı.";setSaveMessage(error);return{ok:false,error};}
    setFixtures(safe.fixtures);setResults(safe.results);setForecasts(safe.forecasts);
    if(cloudEnabled){const ok=await persistCloud(safe);return ok?{ok:true}:{ok:false,error:lastCloudError.current||"Bulut kaydı yapılamadı."};}
    setSaveMessage("Yedek bu tarayıcıya aktarıldı.");return{ok:true};
  };

  const checkAdminSession=async()=>{
    const response=await fetch("/api/admin-session",{cache:"no-store"});
    const payload=await response.json().catch(()=>({}));setAdminAuthenticated(Boolean(payload.authenticated));return Boolean(payload.authenticated);
  };
  const signIn=async(password)=>{
    const response=await fetch("/api/admin-session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.error||"Yönetici girişi yapılamadı.");
    setAdminAuthenticated(true);setAdminConfigured(true);return true;
  };
  const signOut=async()=>{await fetch("/api/admin-session",{method:"DELETE"});setAdminAuthenticated(false);};

  useEffect(()=>{
    if(!hydrated)return;
    const matches=new Map(getAllMatches(fixtures,results).map(match=>[String(match.id),match]));
    let changed=false;
    const next=forecasts.map(record=>{
      if(Number(record.version||0)>=FORECAST_VERSION)return record;
      const match=matches.get(String(record.matchId));
      const scored=results.some(result=>String(result.matchId)===String(record.matchId)&&hasScore(result));
      if(!match||scored||hasScore(match)||match.status==="Tamamlandı")return record;
      const forecast=forecastForMatch(match,results);if(!forecast)return record;changed=true;
      return{...record,version:FORECAST_VERSION,forecast};
    });
    if(changed)write(keys.forecasts,next);
  },[hydrated,fixtures,results,forecasts]);

  const saveScore=async(row)=>{
    if(cloudEnabled&&!adminAuthenticated){setSaveMessage("Skoru çevrim içi kaydetmek için Veri yönetimi bölümünden yönetici girişi yap.");return false;}
    const next=[...results.filter(r=>String(r.matchId)!==String(row.matchId)),row];
    const saved=write(keys.results,next);if(!saved)return false;
    if(cloudEnabled)return await latestCloudSave.current;
    setSaveMessage("Sonuç tarayıcıya kaydedildi.");
    try{const response=await fetch("/api/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({results:next})});const payload=await response.json();if(!response.ok)throw new Error(payload.error||"Excel'e yazılamadı.");setSaveMessage("Skor Excel'e kaydedildi.");return true;}
    catch(error){setSaveMessage(`Tarayıcıya kaydedildi; Excel bağlantısı bekliyor. ${error.message}`);return false;}
  };
  const value=useMemo(()=>({fixtures,results,forecasts,hydrated,saveMessage,write,saveScore,setSaveMessage,cloudEnabled,cloudStatus,adminAuthenticated,adminConfigured,signIn,signOut,checkAdminSession,replaceAll}),[fixtures,results,forecasts,hydrated,saveMessage,cloudEnabled,cloudStatus,adminAuthenticated,adminConfigured]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export const useFootballStore=()=>useContext(StoreContext);
