import { NextRequest, NextResponse } from "next/server";

type Patient = {
  id:string; mrn:string; firstName:string; lastName:string; phone:string; email:string;
  admissions?: {id:string; bed:{number:string; ward:{name:string}; room?:{number:string}}}[];
};

const wards=["Emergency","ICU","Cardiology","Neurology","General Medicine","Orthopedics","Pediatrics","Surgical"];
const patients:Patient[]=Array.from({length:32},(_,i)=>{
  const n=i+1;
  const admitted=n%3===0;
  const bedNumber=`B${String(n).padStart(4,"0")}`;
  return {
    id:`demo-patient-${n}`, mrn:`SCMC-${String(100000+n)}`,
    firstName:["Aarav","Ananya","Rahul","Priya","Vikram","Kavya","Arjun","Meera"][i%8],
    lastName:["Sharma","Reddy","Patel","Kumar","Rao","Iyer","Singh","Naidu"][i%8],
    phone:`+91 98${String(10000000+n).slice(-8)}`,
    email:`patient${n}@demo.specialcare.local`,
    admissions:admitted?[{id:`demo-admission-${n}`,bed:{number:bedNumber,ward:{name:wards[i%wards.length]},room:{number:`R-${String(i%16+1).padStart(2,"0")}`}}}]:[]
  };
});

const beds=Array.from({length:128},(_,i)=>{
  const n=i+1; const occupied=n%3===0; const cleaning=n%11===0 && !occupied;
  return {id:`demo-bed-${n}`,number:`B${String(n).padStart(4,"0")}`,status:occupied?"OCCUPIED":cleaning?"CLEANING":"AVAILABLE",
    ward:{name:wards[i%wards.length],floor:{name:`Floor ${i%4+1}`,building:{name:`Building ${i%2+1}`,campus:{name:"Main Campus"}}}},
    room:{number:`R-${String(i%16+1).padStart(2,"0")}`,name:`${wards[i%wards.length]} Room ${i%16+1}`}
  };
});

type AuditEvent={id:string;createdAt:string;action:string;entity:string;entityId?:string;user:{id:string;email:string;name:string;roles:string[]};status:"SUCCESS"|"FAILED";requestId:string;method:string;path:string;module:string;reason?:string;before?:unknown;after?:unknown};
const auditEvents:AuditEvent[]=[];
const actor={id:"demo-admin",email:"demo.admin@specialcare.local",name:"System Admin",roles:["HOSPITAL_ADMIN"]};
const requestId=()=>`REQ-${Date.now()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
const recordAudit=(e:Omit<AuditEvent,"id"|"createdAt"|"user"|"requestId">)=>{const event={...e,id:`audit-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,createdAt:new Date().toISOString(),user:actor,requestId:requestId()};auditEvents.unshift(event);if(auditEvents.length>1000)auditEvents.length=1000;return event};
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function GET(req:NextRequest,{params}:{params:Promise<{path:string[]}>}) {
  const {path}=await params; const key="/"+path.join("/");
  if(key==="/auth/me") return json({authenticated:true,user:{id:"demo-admin",email:"demo.admin@specialcare.local",name:"System Admin",roles:["HOSPITAL_ADMIN"]}});
  if(key==="/patients") {
    const q=req.nextUrl.searchParams.get("search")?.toLowerCase().trim();
    return json({data:q?patients.filter(p=>`${p.mrn} ${p.firstName} ${p.lastName} ${p.phone}`.toLowerCase().includes(q)):patients});
  }
  if(key==="/beds") return json({data:beds});
  if(key==="/dashboard/summary") return json({beds:{total:beds.length,occupied:beds.filter(b=>b.status==="OCCUPIED").length,available:beds.filter(b=>b.status==="AVAILABLE").length,cleaning:beds.filter(b=>b.status==="CLEANING").length},patients:{total:patients.length},admissions:{active:patients.filter(p=>p.admissions?.length).length},emergency:{activePatients:6},lab:{pendingReports:11}});
  if(key==="/hospitals") return json({data:[{id:"demo-hospital",code:"SCMC",name:"SpecialCare Medical Center"}]});
  if(key==="/admissions") { const q=req.nextUrl.searchParams.get("search")?.toLowerCase().trim(); const st=req.nextUrl.searchParams.get("status"); let data=patients.filter(p=>p.admissions?.length).map(p=>({id:p.admissions![0].id,status:"ACTIVE",admittedAt:new Date().toISOString(),patient:p,bed:{id:p.admissions![0].id,number:p.admissions![0].bed.number,ward:{name:p.admissions![0].bed.ward.name,floor:{name:"Floor 1",building:{name:"Building 1",campus:{name:"Main Campus"}}}},room:p.admissions![0].bed.room},transfers:[]})); if(q)data=data.filter(a=>`${a.patient.mrn} ${a.patient.firstName} ${a.patient.lastName}`.toLowerCase().includes(q)); if(st&&st!=="ACTIVE")data=[]; return json({data}); }
  if(key==="/appointments") return json({data:patients.map((p,i)=>({id:`demo-appt-${i+1}`,patient:p,status:i%3===0?"SCHEDULED":"CONFIRMED",scheduledAt:new Date(Date.now()+(i+1)*86400000).toISOString(),department:{name:wards[i%wards.length]}}))});
  if(key==="/doctors") return json({data:["Dr. Anil Rao","Dr. Priya Sharma","Dr. Kiran Reddy","Dr. Meera Iyer"].map((name,i)=>({id:`demo-doctor-${i+1}`,name,department:{name:wards[i%wards.length]}}))});
  if(key==="/diagnostics/orders") return json({data:patients.map((p,i)=>({id:`demo-lab-${i+1}`,patient:p,status:i%2?"PENDING":"COMPLETED",testName:["CBC","LFT","MRI","X-Ray"][i%4]}))});
  if(key==="/prescriptions") return json({data:patients.map((p,i)=>({id:`demo-rx-${i+1}`,patient:p,medicine:["Paracetamol","Amoxicillin","Metformin","Atorvastatin"][i%4],status:"ACTIVE"}))});
  if(key==="/inventory/items") return json({data:["Surgical Gloves","IV Fluids","Syringes","Antibiotics","Masks","Bandages"].map((name,i)=>({id:`demo-item-${i+1}`,name,quantity:100-i*7,reorderLevel:25,status:"AVAILABLE"}))});
  if(key==="/operations/summary") return json({emergency:12,icu:18,ot:5,bloodBank:27,ambulances:2});
  if(key==="/emergency") return json({data:patients.map((p,i)=>({id:`demo-emergency-${i+1}`,patient:p,triage:["CRITICAL","URGENT","STABLE"][i%3],status:"ACTIVE"}))});
  if(key==="/icu") return json({data:beds.filter(b=>b.ward.name==="ICU").slice(0,12)});
  if(key==="/ot") return json({data:["OT-01","OT-02","OT-03"].map((theatre,i)=>({id:`demo-ot-${i+1}`,theatre,status:i===1?"IN_USE":"AVAILABLE"}))});
  if(key==="/blood-bank") return json({data:["A+","B+","O+","O-","AB+"].map((bloodGroup,i)=>({bloodGroup,component:"RED_CELLS",available:8+i*3,status:"AVAILABLE"}))});
  if(key==="/ambulances") return json({data:[1,2].map(i=>({id:`demo-amb-${i}`,vehicleCode:`AMB-0${i}`,driverName:`Demo Driver 0${i}`,status:"AVAILABLE"}))});
  if(key==="/hierarchy") return json({id:"demo-hospital",code:"SCMC",name:"SpecialCare Medical Center",campuses:[{id:"campus-1",name:"Main Campus",buildings:[{id:"building-1",name:"Building 1",floors:[{id:"floor-1",name:"Floor 1",wards:wards.map((name,i)=>({id:`ward-${i+1}`,name,rooms:[{id:`room-${i+1}`,number:`R-${String(i%16+1).padStart(2,"0")}`,name:`${name} Room ${i%16+1}`,beds:beds.filter(b=>b.ward.name===name).slice(0,16)}],beds:beds.filter(b=>b.ward.name===name)}))}]}]}]});
  if(key==="/reports/operational") return json({generatedAt:new Date().toISOString(),patients:patients.length,activeAdmissions:patients.filter(p=>p.admissions?.length).length,beds:{total:beds.length,occupied:beds.filter(b=>b.status==="OCCUPIED").length,available:beds.filter(b=>b.status==="AVAILABLE").length,occupancyRate:Math.round(beds.filter(b=>b.status==="OCCUPIED").length/beds.length*100)},emergencyActive:6,icuActive:4,otScheduled:3,bloodAvailable:27,ambulancesAvailable:2,openInvoices:5,paymentsReceived:125000,diagnosticPending:11});
  if(key==="/reports/financial") return json({payments:{_sum:{amount:125000}},invoices:{_count:{_all:5}},claims:[]});
  if(key.startsWith("/audit")) {
    if(!auditEvents.length) recordAudit({action:"SYSTEM_READY",entity:"Hospital",entityId:"demo-hospital",status:"SUCCESS",method:"SYSTEM",path:"/api/v1/audit",module:"System"});
    const q=req.nextUrl.searchParams.get("search")?.toLowerCase().trim();
    const module=req.nextUrl.searchParams.get("module")?.toLowerCase().trim();
    const status=req.nextUrl.searchParams.get("status")?.toUpperCase();
    let data=[...auditEvents];
    if(q)data=data.filter(x=>JSON.stringify(x).toLowerCase().includes(q));
    if(module)data=data.filter(x=>x.module.toLowerCase()===module);
    if(status)data=data.filter(x=>x.status===status);
    return json({data:data.slice(0,Math.min(Number(req.nextUrl.searchParams.get("limit")||200),1000))});
  }
  if(key.startsWith("/patients/")) { const parts=key.split("/"); const id=parts[2]; const p=patients.find(x=>x.id===id); if(!p)return json({error:"Patient not found"},404); if(parts[3]==="timeline")return json({data:[{id:`timeline-${id}-1`,type:"REGISTRATION",at:new Date().toISOString(),title:"Patient registered",detail:"SpecialCare hospital record"}]}); return json({...p,allergies:[],vitals:[],appointments:[]}); }
  return json({data:[]});
}
export async function POST(req:NextRequest,{params}:{params:Promise<{path:string[]}>}) {
  const {path}=await params; const key="/"+path.join("/");
  if(key==="/auth/login") return json({authenticated:true,user:{id:"demo-admin",email:"demo.admin@specialcare.local",name:"System Admin",roles:["HOSPITAL_ADMIN"]}});
  if(key==="/patients") { const b=await req.json(); const p={id:`demo-patient-${Date.now()}`,mrn:`SCMC-${100000+patients.length+1}`,firstName:b.firstName||"Demo",lastName:b.lastName||"Patient",phone:b.phone||"",email:b.email||"",admissions:[]}; patients.unshift(p); const e=recordAudit({action:"CREATE",entity:"Patient",entityId:p.id,status:"SUCCESS",method:"POST",path:key,module:"Patients",after:p}); return json({...p,requestId:e.requestId,auditId:e.id},201); }
  if(key==="/admissions") { const b=await req.json(); const p=patients.find(x=>x.id===b.patientId); const bed=beds.find(x=>x.id===b.bedId); if(!p||!bed){recordAudit({action:"CREATE",entity:"Admission",status:"FAILED",method:"POST",path:key,module:"Admissions",reason:"Patient or bed not found"});return json({error:"Patient or bed not found"},404);} if(bed.status!=="AVAILABLE"){recordAudit({action:"CREATE",entity:"Admission",entityId:b.patientId,status:"FAILED",method:"POST",path:key,module:"Admissions",reason:"Bed is not available"});return json({error:"Bed is not available"},409);} const admission={id:`demo-admission-${Date.now()}`,status:"ACTIVE",patient:p,bed:{id:bed.id,number:bed.number,ward:bed.ward,room:bed.room},transfers:[]}; p.admissions=[{id:admission.id,bed:{number:bed.number,ward:{name:bed.ward.name},room:bed.room}}]; bed.status="OCCUPIED"; const e=recordAudit({action:"ADMIT",entity:"Admission",entityId:admission.id,status:"SUCCESS",method:"POST",path:key,module:"Admissions",after:{patientId:p.id,bedId:bed.id}}); return json({...admission,requestId:e.requestId,auditId:e.id},201); }
  if(key.match(/^\/admissions\/[^/]+\/discharge$/)) { const id=key.split("/")[2]; const p=patients.find(x=>x.admissions?.some(a=>a.id===id)); if(!p){recordAudit({action:"DISCHARGE",entity:"Admission",entityId:id,status:"FAILED",method:"POST",path:key,module:"Admissions",reason:"Admission not found"});return json({error:"Admission not found"},404);} const a=p.admissions![0]; const bed=beds.find(x=>x.number===a.bed.number); if(bed)bed.status="CLEANING"; p.admissions=[]; const e=recordAudit({action:"DISCHARGE",entity:"Admission",entityId:id,status:"SUCCESS",method:"POST",path:key,module:"Admissions",after:{patientId:p.id,bedStatus:"CLEANING"}}); return json({id,status:"DISCHARGED",requestId:e.requestId,auditId:e.id},200); }
  if(key.match(/^\/admissions\/[^/]+\/transfer$/)) { const id=key.split("/")[2]; const b=await req.json(); const p=patients.find(x=>x.admissions?.some(a=>a.id===id)); const to=beds.find(x=>x.id===b.toBedId); if(!p||!to){recordAudit({action:"TRANSFER",entity:"Admission",entityId:id,status:"FAILED",method:"POST",path:key,module:"Admissions",reason:"Admission or destination bed not found"});return json({error:"Admission or destination bed not found"},404);} if(to.status!=="AVAILABLE"){recordAudit({action:"TRANSFER",entity:"Admission",entityId:id,status:"FAILED",method:"POST",path:key,module:"Admissions",reason:"Destination bed is not available"});return json({error:"Destination bed is not available"},409);} const old=p.admissions![0]; const oldBed=beds.find(x=>x.number===old.bed.number); if(oldBed)oldBed.status="CLEANING"; to.status="OCCUPIED"; old.bed={number:to.number,ward:{name:to.ward.name},room:to.room}; const e=recordAudit({action:"TRANSFER",entity:"Admission",entityId:id,status:"SUCCESS",method:"POST",path:key,module:"Admissions",after:{toBedId:to.id,toBed:to.number}}); return json({id,status:"TRANSFERRED",bed:to,requestId:e.requestId,auditId:e.id},200); }
  const entity=key.split("/")[1]||"System";
  const event=recordAudit({action:key==="/auth/login"?"LOGIN":"REQUEST",entity,entityId:key.split("/")[2],status:"SUCCESS",method:"POST",path:key,module:entity});
  return json({ok:true,id:event.id,requestId:event.requestId,status:"SUCCESS"},201);
}
export async function PATCH(req:NextRequest,{params}:{params:Promise<{path:string[]}>}) {
  const {path}=await params; const key="/"+path.join("/"); const body=await req.json().catch(()=>({}));
  const entity=key.split("/")[1]||"System"; const entityId=key.split("/")[2];
  const event=recordAudit({action:"UPDATE",entity,entityId,status:"SUCCESS",method:"PATCH",path:key,module:entity,after:body});
  return json({ok:true,id:entityId,updated:true,requestId:event.requestId,status:"SUCCESS",data:body});
}
export async function DELETE(req:NextRequest,{params}:{params:Promise<{path:string[]}>}) {
  const {path}=await params; const key="/"+path.join("/"); const entity=key.split("/")[1]||"System"; const entityId=key.split("/")[2];
  const event=recordAudit({action:"DELETE",entity,entityId,status:"SUCCESS",method:"DELETE",path:key,module:entity});
  return json({ok:true,id:entityId,deleted:true,requestId:event.requestId,status:"SUCCESS"});
}
