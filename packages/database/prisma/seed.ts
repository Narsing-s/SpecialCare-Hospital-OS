import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../../apps/api/src/auth-routes.js";
const prisma = new PrismaClient();
async function main() {
  const hospital = await prisma.hospital.upsert({ where: { code: "SCMC" }, update: { name: "SpecialCare Medical Center" }, create: { code: "SCMC", name: "SpecialCare Medical Center" } });
  const campus = await prisma.campus.upsert({ where: { id: "seed-campus-main" }, update: {}, create: { id: "seed-campus-main", name: "Main Campus", hospitalId: hospital.id } });
  const departments = ["Emergency", "Cardiology", "Neurology", "General Medicine", "Orthopedics", "Pediatrics", "Radiology", "Laboratory"];
  for (const [index, name] of departments.entries()) await prisma.department.upsert({ where: { hospitalId_code: { hospitalId: hospital.id, code: `D${String(index + 1).padStart(2, "0")}` } }, update: { name }, create: { hospitalId: hospital.id, code: `D${String(index + 1).padStart(2, "0")}`, name } });
  const medicine = await prisma.department.findFirstOrThrow({ where: { hospitalId: hospital.id, code: "D04" } });
  const user = await prisma.user.upsert({ where: { email: "demo.clinician@specialcare.local" }, update: { status: "ACTIVE", hospitalId: hospital.id }, create: { email: "demo.clinician@specialcare.local", passwordHash: hashPassword(process.env.SEED_ADMIN_PASSWORD || "SET_SEED_ADMIN_PASSWORD"), hospitalId: hospital.id } });
  const permissionKeys=["PATIENT_READ","PATIENT_WRITE","CLINICAL_READ","CLINICAL_WRITE","ADMISSION_READ","ADMISSION_WRITE","BILLING_READ","BILLING_WRITE","OPERATIONS_READ","OPERATIONS_WRITE","PHARMACY_READ","PHARMACY_WRITE","REPORTS_READ","AUDIT_READ","ADMIN_ALL"];
  for(const key of permissionKeys) await prisma.permission.upsert({where:{key},update:{},create:{key}});
  const adminRole=await prisma.role.upsert({where:{name:"HOSPITAL_ADMIN"},update:{},create:{name:"HOSPITAL_ADMIN"}});
  for(const key of permissionKeys) { const permission=await prisma.permission.findUniqueOrThrow({where:{key}}); await prisma.rolePermission.upsert({where:{roleId_permissionId:{roleId:adminRole.id,permissionId:permission.id}},update:{},create:{roleId:adminRole.id,permissionId:permission.id}}); }
  await prisma.userRole.upsert({where:{userId_roleId:{userId:user.id,roleId:adminRole.id}},update:{},create:{userId:user.id,roleId:adminRole.id}});
  await prisma.doctor.upsert({ where: { userId: user.id }, update: { departmentId: medicine.id }, create: { userId: user.id, departmentId: medicine.id } });
  const wardNames = ["Emergency", "ICU", "Cardiology", "Neurology", "General Medicine", "Orthopedics", "Pediatrics", "Surgical", "Recovery", "Isolation"];
  let bedNumber = 1;
  for (let b = 1; b <= 8; b++) {
    const building = await prisma.building.upsert({ where: { id: `seed-building-${b}` }, update: {}, create: { id: `seed-building-${b}`, name: `Building ${b}`, campusId: campus.id } });
    for (let f = 1; f <= 4; f++) {
      const floor = await prisma.floor.upsert({ where: { id: `seed-floor-${b}-${f}` }, update: {}, create: { id: `seed-floor-${b}-${f}`, name: `Floor ${f}`, buildingId: building.id } });
      for (let w = 0; w < wardNames.length; w++) {
        const ward = await prisma.ward.upsert({ where: { id: `seed-ward-${b}-${f}-${w}` }, update: { name: wardNames[w] }, create: { id: `seed-ward-${b}-${f}-${w}`, name: wardNames[w], floorId: floor.id } });
        for (let r = 1; r <= 4; r++) {
          const room = await prisma.room.upsert({ where: { wardId_number: { wardId: ward.id, number: `${f}${String(w + 1).padStart(2, "0")}-${String(r).padStart(2, "02")}` } }, update: {}, create: { number: `${f}${String(w + 1).padStart(2, "0")}-${String(r).padStart(2, "02")}`, name: `${wardNames[w]} Room ${r}`, hospitalId: hospital.id, campusId: campus.id, buildingId: building.id, floorId: floor.id, wardId: ward.id } });
          for (let bed = 1; bed <= 4; bed++) {
            await prisma.bed.upsert({ where: { wardId_number: { wardId: ward.id, number: `B${String(bedNumber).padStart(4, "0")}` } }, update: { roomId: room.id }, create: { wardId: ward.id, roomId: room.id, number: `B${String(bedNumber).padStart(4, "0")}` } });
            bedNumber++;
          }
        }
      }
    }
  }
  const blood=["A+","B+","O+","O-","AB+"]; for(let i=0;i<blood.length;i++) await prisma.bloodUnit.upsert({where:{donationCode:`DEMO-${String(i+1).padStart(3,"0")}`},update:{status:"AVAILABLE"},create:{hospitalId:hospital.id,bloodGroup:blood[i],component:"RED_CELLS",donationCode:`DEMO-${String(i+1).padStart(3,"0")}`,expiresAt:new Date(Date.now()+30*86400000)}});
  for(const [vehicleCode,driverName] of [["AMB-01","Demo Driver 01"],["AMB-02","Demo Driver 02"]] as const) await prisma.ambulanceTrip.upsert({where:{id:`seed-${vehicleCode}`},update:{status:"AVAILABLE",driverName},create:{id:`seed-${vehicleCode}`,hospitalId:hospital.id,vehicleCode,driverName,status:"AVAILABLE"}});
  console.log(`Seeded ${bedNumber - 1} beds across ${8 * 4 * wardNames.length} wards, a demo clinician, 5 blood units and 2 ambulances.`);
}
main().finally(() => prisma.$disconnect());
