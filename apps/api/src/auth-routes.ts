import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const secret=()=>{
  const value=process.env.AUTH_SECRET?.trim();
  if(value)return value;
  if(process.env.NODE_ENV==="production") throw new Error("AUTH_SECRET must be configured in production");
  return "specialcare-development-secret-change-me";
};
const failedLogins=new Map<string,{count:number;reset:number}>();
const b64=(v:Buffer|string)=>Buffer.from(v).toString("base64url");
const hashPassword=(password:string,salt?:string)=>{const s=salt||randomBytes(16).toString("hex");return `scrypt$${s}$${scryptSync(password,s,64).toString("hex")}`};
const verifyPassword=(password:string,stored:string)=>{const [,salt,hex]=stored.split("$");if(!salt||!hex)return false;const actual=scryptSync(password,salt,64);const expected=Buffer.from(hex,"hex");return actual.length===expected.length&&timingSafeEqual(actual,expected)};
const sign=(payload:Record<string,unknown>)=>{const h=b64(JSON.stringify({alg:"HS256",typ:"JWT"}));const p=b64(JSON.stringify(payload));const body=`${h}.${p}`;return `${body}.${b64(createHmac("sha256",secret()).update(body).digest())}`};
export function verifyToken(token:string){try{const [h,p,s]=token.split(".");if(!h||!p||!s)return null;const expected=b64(createHmac("sha256",secret()).update(`${h}.${p}`).digest());if(expected!==s)return null;const payload=JSON.parse(Buffer.from(p,"base64url").toString()) as Record<string,unknown>;if(typeof payload.exp!=="number"||payload.exp<Date.now()/1000)return null;return payload}catch{return null}}

export async function registerAuthRoutes(app:FastifyInstance,prisma:PrismaClient){
  app.post("/api/v1/auth/login",async(request,reply)=>{
    const b=request.body as {email?:string;password?:string};
    const ip=request.ip; const now=Date.now(); const attempt=failedLogins.get(ip); if(attempt&&attempt.reset>now&&attempt.count>=5)return reply.code(429).send({error:"Too many sign-in attempts. Try again later."}); if(attempt&&attempt.reset<=now)failedLogins.delete(ip);
    if(!b?.email||!b.password)return reply.code(400).send({error:"email and password are required"});
    const user=await prisma.user.findUnique({where:{email:b.email.trim().toLowerCase()},include:{roles:{include:{role:{include:{permissions:{include:{permission:true}}}}}},hospital:true}});
    if(!user||user.status!=="ACTIVE"||!verifyPassword(b.password,user.passwordHash)){const a=failedLogins.get(ip)||{count:0,reset:now+15*60*1000};a.count++;failedLogins.set(ip,a);return reply.code(401).send({error:"Invalid credentials"});} failedLogins.delete(ip);
    const permissions=[...new Set(user.roles.flatMap(x=>x.role.permissions.map(y=>y.permission.key)))];
    const roles=user.roles.map(x=>x.role.name);
    const token=sign({sub:user.id,email:user.email,hospitalId:user.hospitalId||null,roles,permissions,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+8*60*60});
    const secure=process.env.NODE_ENV==="production";
    reply.header("Set-Cookie",`sc_session=${token}; Path=/; HttpOnly; SameSite=${secure?"None":"Lax"}${secure?"; Secure":""}; Max-Age=28800`);
    await prisma.auditLog.create({data:{userId:user.id,action:"LOGIN",entity:"User",entityId:user.id,metadata:{roles}}});
    return {user:{id:user.id,email:user.email,status:user.status,hospitalId:user.hospitalId,roles,permissions,hospital:user.hospital}}; 
  });
  app.get("/api/v1/auth/me",async(request,reply)=>{
    const auth=request.headers.authorization;
    const cookie=request.headers.cookie?.match(/(?:^|;\\s*)sc_session=([^;]+)/)?.[1];
    const payload=verifyToken(auth?.startsWith("Bearer ")?auth.slice(7):cookie||"");if(!payload?.sub)return reply.code(401).send({error:"Invalid or expired session"});
    const user=await prisma.user.findUnique({where:{id:String(payload.sub)},include:{roles:{include:{role:{include:{permissions:{include:{permission:true}}}}}},hospital:true}});
    if(!user||user.status!=="ACTIVE")return reply.code(401).send({error:"User account is not active"});
    return {user:{id:user.id,email:user.email,status:user.status,hospitalId:user.hospitalId,roles:user.roles.map(x=>x.role.name),permissions:[...new Set(user.roles.flatMap(x=>x.role.permissions.map(y=>y.permission.key)))],hospital:user.hospital}};
  });
  app.post("/api/v1/auth/change-password",async(request,reply)=>{const user=(request as any).user as {sub?:string}|undefined;const b=request.body as {currentPassword?:string;newPassword?:string};if(!user?.sub)return reply.code(401).send({error:"Authentication required"});if(!b.currentPassword||!b.newPassword||b.newPassword.length<12)return reply.code(400).send({error:"Current password and a new password of at least 12 characters are required"});const dbUser=await prisma.user.findUnique({where:{id:String(user.sub)}});if(!dbUser||!verifyPassword(b.currentPassword,dbUser.passwordHash))return reply.code(401).send({error:"Current password is incorrect"});await prisma.user.update({where:{id:dbUser.id},data:{passwordHash:hashPassword(b.newPassword)}});await prisma.auditLog.create({data:{userId:dbUser.id,action:"PASSWORD_CHANGE",entity:"User",entityId:dbUser.id}});return {ok:true};});
  app.post("/api/v1/auth/logout",async(request,reply)=>{reply.header("Set-Cookie","sc_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"); return {ok:true};});
}
export { hashPassword };
