import { isAdminRequest } from "@/lib/admin-auth";

export const dynamic="force-dynamic";
const endpoint=()=>{
  const url=process.env.SUPABASE_URL?.replace(/\/$/,"");
  const key=process.env.SUPABASE_SECRET_KEY;
  return url&&key?{url,key}:null;
};
const json=(body,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
const defaultState={fixtures:[],results:[],forecasts:[]};

export async function GET(){
  const config=endpoint();
  if(!config)return json({configured:false,state:defaultState});
  try{
    const response=await fetch(`${config.url}/rest/v1/app_state?id=eq.1&select=fixtures,results,forecasts,updated_at`,{
      headers:{apikey:config.key,Accept:"application/json"},cache:"no-store",
    });
    if(!response.ok){
      console.error("Supabase app_state read failed:",response.status);
      return json({configured:true,error:`Supabase bağlantısı HTTP ${response.status} hatası verdi. URL, gizli anahtar ve app_state tablosunu kontrol et.`},503);
    }
    const rows=await response.json();
    if(!rows.length)return json({configured:true,error:"Veritabanında başlangıç kaydı bulunamadı."},503);
    return json({configured:true,state:{fixtures:rows[0].fixtures||[],results:rows[0].results||[],forecasts:rows[0].forecasts||[],updated_at:rows[0].updated_at}});
  }catch{return json({configured:true,error:"Çevrim içi veritabanına ulaşılamadı."},503);}
}

export async function PUT(request){
  const config=endpoint();
  if(!config)return json({error:"Çevrim içi kayıt ayarları henüz tamamlanmadı."},503);
  if(!isAdminRequest(request))return json({error:"Ortak kayıtları değiştirmek için yönetici girişi gerekli."},401);
  const body=await request.json().catch(()=>null);
  if(!body||!["fixtures","results","forecasts"].every(key=>Array.isArray(body[key])))return json({error:"Yedek dosyasının veri yapısı geçersiz."},400);
  if(body.fixtures.length>50000||body.results.length>50000||body.forecasts.length>50000)return json({error:"Kayıt sayısı izin verilen sınırı aşıyor."},413);
  try{
    const response=await fetch(`${config.url}/rest/v1/app_state?id=eq.1`,{
      method:"PATCH",headers:{apikey:config.key,"Content-Type":"application/json",Prefer:"return=representation"},
      body:JSON.stringify({...body,updated_at:new Date().toISOString()}),cache:"no-store",
    });
    if(!response.ok){
      console.error("Supabase app_state write failed:",response.status);
      return json({error:`Supabase kaydı HTTP ${response.status} hatası verdi. Vercel ortam değişkenlerini ve app_state tablosunu kontrol et.`},502);
    }
    const rows=await response.json();
    if(!rows.length)return json({error:"app_state tablosundaki başlangıç satırı eksik; kurulum SQL'ini tekrar uygula."},503);
    return json({ok:true,updated_at:rows[0].updated_at});
  }catch{return json({error:"Çevrim içi kayıt şu anda tamamlanamadı."},503);}
}
