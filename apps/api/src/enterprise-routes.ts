import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";

const text=(v:unknown)=>typeof v==="string"&&v.trim().length>0;
const money=(v:unknown)=>typeof v==="number"&&Number.isFinite(v)&&v>=0;

export async function registerEnterpriseRoutes(app:FastifyInstance,prisma:PrismaClient){
  // Insurance / TPA
  app.get("/api/v1/insurance/providers",async(request)=>{
    const q=request.query as {hospitalId?:string};
    return {data:await prisma.insuranceProvider.findMany({where:q.hospitalId?{hospitalId:q.hospitalId}:undefined,orderBy:{name:"asc"}})};
  });
  app.post("/api/v1/insurance/providers",async(request,reply)=>{
    const b=request.body as {hospitalId?:string;name?:string;code?:string};
    if(!text(b.hospitalId)||!text(b.name)||!text(b.code)) return reply.code(400).send({error:"hospitalId, name and code are required"});
    try{return reply.code(201).send(await prisma.insuranceProvider.create({data:{hospitalId:b.hospitalId!,name:b.name!.trim(),code:b.code!.trim().toUpperCase()}}))}
    catch{return reply.code(409).send({error:"Provider code already exists for this hospital"})}
  });
  app.get("/api/v1/patients/:id/insurance",async(request,reply)=>{
    const {id}=request.params as {id:string};
    const patient=await prisma.patient.findUnique({where:{id}});
    if(!patient)return reply.code(404).send({error:"Patient not found"});
    return {data:await prisma.patientInsurance.findMany({where:{patientId:id},include:{provider:true,claims:true},orderBy:{active:"desc"}})};
  });
  app.post("/api/v1/patients/:id/insurance",async(request,reply)=>{
    const {id}=request.params as {id:string}; const b=request.body as {providerId?:string;policyNumber?:string;memberId?:string;planName?:string;coveragePercent?:number;validFrom?:string;validTo?:string};
    if(!text(b.providerId)||!text(b.policyNumber))return reply.code(400).send({error:"providerId and policyNumber are required"});
    const [patient,provider]=await Promise.all([prisma.patient.findUnique({where:{id}}),prisma.insuranceProvider.findUnique({where:{id:b.providerId}})]);
    if(!patient)return reply.code(404).send({error:"Patient not found"}); if(!provider)return reply.code(404).send({error:"Insurance provider not found"});
    if(b.coveragePercent!==undefined&&(!Number.isFinite(b.coveragePercent)||b.coveragePercent<0||b.coveragePercent>100))return reply.code(400).send({error:"coveragePercent must be 0-100"});
    try{return reply.code(201).send(await prisma.patientInsurance.create({data:{patientId:id,providerId:b.providerId!,policyNumber:b.policyNumber!.trim(),memberId:b.memberId?.trim(),planName:b.planName?.trim(),coveragePercent:b.coveragePercent,validFrom:b.validFrom?new Date(b.validFrom):undefined,validTo:b.validTo?new Date(b.validTo):undefined}}))}
    catch{return reply.code(409).send({error:"Policy is already registered"})}
  });
  app.get("/api/v1/insurance/claims",async(request)=>{
    const q=request.query as {patientId?:string;status?:string};
    return {data:await prisma.insuranceClaim.findMany({where:{...(q.patientId?{patientId:q.patientId}:{}),...(q.status?{status:q.status.toUpperCase()}: {})},include:{patient:true,provider:true,insurance:true,items:true},orderBy:{id:"desc"},take:500})};
  });
  app.post("/api/v1/insurance/claims",async(request,reply)=>{
    const b=request.body as {patientId?:string;providerId?:string;insuranceId?:string;claimNumber?:string;items?:Array<{description?:string;quantity?:number;amount?:number}>};
    if(!text(b.patientId)||!text(b.providerId)||!text(b.claimNumber))return reply.code(400).send({error:"patientId, providerId and claimNumber are required"});
    const items=(b.items||[]).filter(x=>text(x.description)&&money(x.amount));
    const total=items.reduce((n,x)=>n+(x.amount||0)*(x.quantity&&x.quantity>0?Math.floor(x.quantity):1),0);
    try{return reply.code(201).send(await prisma.insuranceClaim.create({data:{patientId:b.patientId!,providerId:b.providerId!,insuranceId:b.insuranceId||undefined,claimNumber:b.claimNumber!.trim(),total,items:{create:items.map(x=>({description:x.description!.trim(),quantity:x.quantity&&x.quantity>0?Math.floor(x.quantity):1,amount:x.amount!}))}}}))}
    catch{return reply.code(409).send({error:"Claim number already exists or insurance reference is invalid"})}
  });
  app.patch("/api/v1/insurance/claims/:id",async(request,reply)=>{
    const {id}=request.params as {id:string}; const b=request.body as {status?:string;approved?:number};
    const current=await prisma.insuranceClaim.findUnique({where:{id}}); if(!current)return reply.code(404).send({error:"Claim not found"});
    const status=b.status?.trim().toUpperCase(); const allowed=["DRAFT","SUBMITTED","IN_REVIEW","APPROVED","PARTIALLY_APPROVED","DENIED","PAID","CLOSED"];
    if(status&&!allowed.includes(status))return reply.code(400).send({error:"Invalid claim status"});
    if(b.approved!==undefined&&!money(b.approved))return reply.code(400).send({error:"approved must be non-negative"});
    return prisma.insuranceClaim.update({where:{id},data:{...(status?{status,submittedAt:status==="SUBMITTED"?new Date():undefined}:{}),...(b.approved!==undefined?{approved:b.approved}:{}),...(status&&["APPROVED","PARTIALLY_APPROVED","DENIED"].includes(status)?{respondedAt:new Date()}: {})}});
  });
  app.post("/api/v1/insurance/pre-authorizations",async(request,reply)=>{
    const b=request.body as {patientId?:string;providerId?:string;service?:string;requestedAmount?:number};
    if(!text(b.patientId)||!text(b.providerId)||!text(b.service))return reply.code(400).send({error:"patientId, providerId and service are required"});
    if(b.requestedAmount!==undefined&&!money(b.requestedAmount))return reply.code(400).send({error:"requestedAmount must be non-negative"});
    return reply.code(201).send(await prisma.preAuthorization.create({data:{patientId:b.patientId!,providerId:b.providerId!,service:b.service!.trim(),requestedAmount:b.requestedAmount||0}}));
  });

  // Notifications
  app.get("/api/v1/notifications/:userId",async(request)=>{
    const {userId}=request.params as {userId:string};
    return {data:await prisma.notification.findMany({where:{userId},orderBy:{createdAt:"desc"},take:100})};
  });
  app.post("/api/v1/notifications",async(request,reply)=>{
    const b=request.body as {userId?:string;title?:string;body?:string;type?:string};
    if(!text(b.userId)||!text(b.title)||!text(b.body))return reply.code(400).send({error:"userId, title and body are required"});
    return reply.code(201).send(await prisma.notification.create({data:{userId:b.userId!,title:b.title!.trim(),body:b.body!.trim(),type:b.type?.trim().toUpperCase()||"INFO"}}));
  });
  app.patch("/api/v1/notifications/:id/read",async(request,reply)=>{
    const {id}=request.params as {id:string};
    try{return await prisma.notification.update({where:{id},data:{readAt:new Date()}})}catch{return reply.code(404).send({error:"Notification not found"})}
  });
  app.put("/api/v1/notifications/:userId/preferences",async(request,reply)=>{
    const {userId}=request.params as {userId:string}; const b=request.body as {channel?:string;eventType?:string;enabled?:boolean};
    if(!text(b.channel)||!text(b.eventType)||typeof b.enabled!=="boolean")return reply.code(400).send({error:"channel, eventType and enabled are required"});
    return prisma.notificationPreference.upsert({where:{userId_channel_eventType:{userId,channel:b.channel!.trim().toUpperCase(),eventType:b.eventType!.trim().toUpperCase()}},update:{enabled:b.enabled},create:{userId,channel:b.channel!.trim().toUpperCase(),eventType:b.eventType!.trim().toUpperCase(),enabled:b.enabled}});
  });

  // Nursing / care plans
  app.get("/api/v1/nursing/assignments",async(request)=>{
    const q=request.query as {hospitalId?:string;patientId?:string;status?:string};
    return {data:await prisma.nursingAssignment.findMany({where:{...(q.hospitalId?{hospitalId:q.hospitalId}:{}),...(q.patientId?{patientId:q.patientId}:{}),...(q.status?{status:q.status.toUpperCase()}: {})},include:{patient:true,nurse:{select:{id:true,email:true}},tasks:true},orderBy:{startedAt:"desc"},take:500})};
  });
  app.post("/api/v1/nursing/assignments",async(request,reply)=>{
    const b=request.body as {patientId?:string;hospitalId?:string;nurseId?:string;shift?:string};
    if(!text(b.patientId)||!text(b.hospitalId)||!text(b.shift))return reply.code(400).send({error:"patientId, hospitalId and shift are required"});
    const patient=await prisma.patient.findUnique({where:{id:b.patientId}}); if(!patient)return reply.code(404).send({error:"Patient not found"});
    return reply.code(201).send(await prisma.nursingAssignment.create({data:{patientId:b.patientId!,hospitalId:b.hospitalId!,nurseId:b.nurseId||undefined,shift:b.shift!.trim().toUpperCase()}}));
  });
  app.post("/api/v1/nursing/assignments/:id/tasks",async(request,reply)=>{
    const {id}=request.params as {id:string}; const b=request.body as {title?:string;priority?:string;dueAt?:string;notes?:string};
    if(!text(b.title))return reply.code(400).send({error:"title is required"});
    const assignment=await prisma.nursingAssignment.findUnique({where:{id}}); if(!assignment)return reply.code(404).send({error:"Nursing assignment not found"});
    return reply.code(201).send(await prisma.nursingTask.create({data:{assignmentId:id,title:b.title!.trim(),priority:b.priority?.trim().toUpperCase()||"ROUTINE",dueAt:b.dueAt?new Date(b.dueAt):undefined,notes:b.notes?.trim()}}));
  });
  app.patch("/api/v1/nursing/tasks/:id",async(request,reply)=>{
    const {id}=request.params as {id:string}; const b=request.body as {status?:string;notes?:string};
    const status=b.status?.trim().toUpperCase(); const allowed=["PENDING","IN_PROGRESS","COMPLETED","SKIPPED"];
    if(status&&!allowed.includes(status))return reply.code(400).send({error:"Invalid task status"});
    try{return await prisma.nursingTask.update({where:{id},data:{...(status?{status,completedAt:status==="COMPLETED"?new Date():undefined}:{}),...(b.notes!==undefined?{notes:b.notes.trim()}: {})}})}catch{return reply.code(404).send({error:"Nursing task not found"})}
  });
  app.get("/api/v1/care-plans/:patientId",async(request)=>{const {patientId}=request.params as {patientId:string};return {data:await prisma.carePlan.findMany({where:{patientId},orderBy:{updatedAt:"desc"}})}});
  app.post("/api/v1/care-plans",async(request,reply)=>{
    const b=request.body as {patientId?:string;title?:string;goals?:string;interventions?:string};
    if(!text(b.patientId)||!text(b.title))return reply.code(400).send({error:"patientId and title are required"});
    return reply.code(201).send(await prisma.carePlan.create({data:{patientId:b.patientId!,title:b.title!.trim(),goals:b.goals?.trim(),interventions:b.interventions?.trim()}}));
  });
  app.patch("/api/v1/care-plans/:id",async(request,reply)=>{
    const {id}=request.params as {id:string}; const b=request.body as {title?:string;goals?:string;interventions?:string;status?:string};
    try{return await prisma.carePlan.update({where:{id},data:{...(b.title!==undefined?{title:b.title.trim()}:{}),...(b.goals!==undefined?{goals:b.goals.trim()}:{}),...(b.interventions!==undefined?{interventions:b.interventions.trim()}:{}),...(b.status!==undefined?{status:b.status.trim().toUpperCase()}: {})}})}catch{return reply.code(404).send({error:"Care plan not found"})}
  });

  // Reporting / command center
  app.get("/api/v1/reports/operational",async()=>{
    const [patients,activeAdmissions,beds,occupiedBeds,availableBeds,emergencyActive,icuActive,otScheduled,bloodAvailable,ambulancesAvailable,openInvoices,payments,diagnosticPending]=await Promise.all([
      prisma.patient.count(),prisma.admission.count({where:{status:"ACTIVE"}}),prisma.bed.count(),prisma.bed.count({where:{status:"OCCUPIED"}}),prisma.bed.count({where:{status:"AVAILABLE"}}),
      prisma.emergencyCase.count({where:{status:{notIn:["DISCHARGED","CLOSED"]}}}),prisma.iCUStay.count({where:{status:"ACTIVE"}}),prisma.oTCase.count({where:{status:{in:["SCHEDULED","IN_PROGRESS"]}}}),
      prisma.bloodUnit.count({where:{status:"AVAILABLE"}}),prisma.ambulanceTrip.count({where:{status:"AVAILABLE"}}),prisma.invoice.count({where:{status:"OPEN"}}),prisma.payment.aggregate({_sum:{amount:true}}),prisma.diagnosticResult.count({where:{status:{in:["PRELIMINARY","PENDING"]}}})
    ]);
    return {generatedAt:new Date().toISOString(),patients,activeAdmissions,beds:{total:beds,occupied:occupiedBeds,available:availableBeds,occupancyRate:beds?Math.round(occupiedBeds/beds*1000)/10:0},emergencyActive,icuActive,otScheduled,bloodAvailable,ambulancesAvailable,openInvoices,paymentsReceived:payments._sum.amount||0,diagnosticPending};
  });
  app.get("/api/v1/reports/financial",async()=>{
    const [invoices,payments,claims]=await Promise.all([prisma.invoice.aggregate({_count:{_all:true},_sum:{total:true}}),prisma.payment.aggregate({_count:{_all:true},_sum:{amount:true}}),prisma.insuranceClaim.groupBy({by:["status"],_count:{_all:true},_sum:{total:true}})]);
    return {generatedAt:new Date().toISOString(),invoices, payments, claims};
  });

  // Audit trail
  app.get("/api/v1/audit",async(request)=>{
    const q=request.query as {entity?:string;entityId?:string;userId?:string;limit?:string};
    const take=Math.min(Math.max(Number(q.limit)||100,1),500);
    return {data:await prisma.auditLog.findMany({where:{...(q.entity?{entity:q.entity}:{}),...(q.entityId?{entityId:q.entityId}:{}),...(q.userId?{userId:q.userId}: {})},include:{user:{select:{id:true,email:true}}},orderBy:{createdAt:"desc"},take})};
  });
  app.post("/api/v1/audit",async(request,reply)=>{
    const b=request.body as {userId?:string;action?:string;entity?:string;entityId?:string;metadata?:unknown};
    if(!text(b.action)||!text(b.entity))return reply.code(400).send({error:"action and entity are required"});
    return reply.code(201).send(await prisma.auditLog.create({data:{userId:b.userId||undefined,action:b.action!.trim().toUpperCase(),entity:b.entity!.trim().toUpperCase(),entityId:b.entityId?.trim(),metadata:b.metadata===undefined?undefined:b.metadata as any}}));
  });
}
