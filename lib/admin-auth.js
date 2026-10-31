import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE="elo_scout_admin";
const SESSION_HOURS=12;
const secureEqual=(a,b)=>{
  const left=Buffer.from(String(a||"")),right=Buffer.from(String(b||""));
  return left.length===right.length&&timingSafeEqual(left,right);
};
const signature=(expires)=>createHmac("sha256",process.env.APP_SESSION_SECRET||"").update(String(expires)).digest("hex");
export function makeAdminToken(){
  const expires=Math.floor(Date.now()/1000)+SESSION_HOURS*60*60;
  return `${expires}.${signature(expires)}`;
}
export function isAdminRequest(request){
  if(!process.env.APP_ADMIN_PASSWORD||!process.env.APP_SESSION_SECRET)return false;
  const cookie=request.headers.get("cookie")||"";
  const raw=cookie.split(";").map(part=>part.trim()).find(part=>part.startsWith(`${ADMIN_COOKIE}=`))?.slice(ADMIN_COOKIE.length+1);
  if(!raw)return false;
  let decoded;try{decoded=decodeURIComponent(raw);}catch{return false;}
  const [expiresText,provided]=decoded.split(".");
  const expires=Number(expiresText);
  if(!Number.isSafeInteger(expires)||expires<=Math.floor(Date.now()/1000)||expires>Date.now()/1000+SESSION_HOURS*60*60+60||!provided)return false;
  return secureEqual(provided,signature(expires));
}
export function passwordMatches(candidate){return secureEqual(candidate,process.env.APP_ADMIN_PASSWORD);}
export function cookieOptions(){return `Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_HOURS*60*60}${process.env.NODE_ENV==="production"?"; Secure":""}`;}
