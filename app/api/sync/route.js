export async function POST(request){
  try{
    const payload=await request.json();
    const response=await fetch("http://127.0.0.1:8766/api/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),cache:"no-store"});
    const result=await response.json().catch(()=>({error:"Excel bağlantısından yanıt alınamadı."}));
    return Response.json(result,{status:response.status});
  }catch(error){return Response.json({error:"Excel kayıt bağlantısı çalışmıyor. Başlatma penceresini kontrol et."},{status:503});}
}

export async function GET(){
  try{const response=await fetch("http://127.0.0.1:8766/api/status",{cache:"no-store"});return Response.json(await response.json(),{status:response.status});}
  catch{return Response.json({ready:false},{status:503});}
}
