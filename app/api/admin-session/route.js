import { ADMIN_COOKIE, cookieOptions, isAdminRequest, makeAdminToken, passwordMatches } from "@/lib/admin-auth";

export const dynamic="force-dynamic";
const configured=()=>Boolean(process.env.APP_ADMIN_PASSWORD&&process.env.APP_SESSION_SECRET&&process.env.SUPABASE_URL&&process.env.SUPABASE_SECRET_KEY);

export async function GET(request){
  return Response.json({configured:configured(),authenticated:isAdminRequest(request)},{headers:{"Cache-Control":"no-store"}});
}

export async function POST(request){
  if(!configured())return Response.json({error:"Çevrim içi kayıt ayarları henüz tamamlanmadı."},{status:503});
  const body=await request.json().catch(()=>({}));
  if(!passwordMatches(body.password))return Response.json({error:"Yönetici parolası doğru değil."},{status:401});
  const response=Response.json({authenticated:true});
  response.headers.append("Set-Cookie",`${ADMIN_COOKIE}=${encodeURIComponent(makeAdminToken())}; ${cookieOptions()}`);
  response.headers.set("Cache-Control","no-store");
  return response;
}

export async function DELETE(){
  const response=Response.json({authenticated:false});
  response.headers.append("Set-Cookie",`${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${process.env.NODE_ENV==="production"?"; Secure":""}`);
  response.headers.set("Cache-Control","no-store");
  return response;
}
