export function productionSecurityRequirements(env:NodeJS.ProcessEnv=process.env){
  const missing:string[]=[];
  if(env.NODE_ENV==="production"){
    if(!env.AUTH_SECRET) missing.push("AUTH_SECRET");
    if(!env.CORS_ORIGIN || env.CORS_ORIGIN.split(",").some(v=>v.trim()==="*")) missing.push("CORS_ORIGIN");
    if(!env.DATABASE_URL) missing.push("DATABASE_URL");
  }
  return {ok:missing.length===0,missing};
}
export function isAllowedOrigin(origin:string|undefined,configured:string|undefined){
  if(!origin) return false;
  const allowed=(configured||"http://localhost:3000").split(",").map(v=>v.trim()).filter(Boolean);
  return allowed.includes(origin);
}
