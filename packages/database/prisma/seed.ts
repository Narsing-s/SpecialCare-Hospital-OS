import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../../apps/api/src/auth-routes.js";

const prisma = new PrismaClient();

async function main() {
  const hospital = await prisma.hospital.upsert({
    where: { code: "SCMC" },
    update: { name: "SpecialCare Medical Center" },
    create: { code: "SCMC", name: "SpecialCare Medical Center" }
  });
  const campus = await prisma.campus.upsert({
    where: { id: "seed-campus-main" },
    update: {},
    create: { id: "seed-campus-main", name: "Main Campus", hospitalId: hospital.id }
  });

  const departments = ["Emergency", "Cardiology", "Neurology", "General Medicine", "Orthopedics", "Pediatrics", "Radiology", "Laboratory"];
  for (const [index, name] of departments.entries()) {
    await prisma.department.upsert({
      where: { hospitalId_code: { hospitalId: hospital.id, code: `D${String(index + 1).padStart(2, "0")}` } },
      update: { name },
      create: { hospitalId: hospital.id, code: `D${String(index + 1).padStart(2, "0")}`, name }
    });
  }

  const medicine = await prisma.department.findFirstOrThrow({ where: { hospitalId: hospital.id, code: "D04" } });
  const user = await prisma.user.upsert({
    where: { email: "demo.clinician@specialcare.local" },
    update: { status: "ACTIVE", hospitalId: hospital.id },
    create: {
      email: "demo.clinician@specialcare.local",
      passwordHash: hashPassword(process.env.SEED_ADMIN_PASSWORD || "SET_SEED_ADMIN_PASSWORD"),
      hospitalId: hospital.id
    }
  });

  const permissionKeys = [
    "PATIENT_READ", "PATIENT_WRITE", "CLINICAL_READ", "CLINICAL_WRITE", "ADMISSION_READ", "ADMISSION_WRITE",
    "BILLING_READ", "BILLING_WRITE", "OPERATIONS_READ", "OPERATIONS_WRITE", "PHARMACY_READ", "PHARMACY_WRITE",
    "REPORTS_READ", "AUDIT_READ", "ADMIN_ALL"
  ];
  await prisma.permission.createMany({ data: permissionKeys.map(key => ({ key })), skipDuplicates: true });
  const adminRole = await prisma.role.upsert({
    where: { name: "HOSPITAL_ADMIN" },
    update: {},
    create: { name: "HOSPITAL_ADMIN" }
  });
  const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });
  await prisma.rolePermission.createMany({
    data: permissions.map(permission => ({ roleId: adminRole.id, permissionId: permission.id })),
    skipDuplicates: true
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
    update: {},
    create: { userId: user.id, roleId: adminRole.id }
  });
  await prisma.doctor.upsert({
    where: { userId: user.id },
    update: { departmentId: medicine.id },
    create: { userId: user.id, departmentId: medicine.id }
  });

  // Bulk insert the demo facility hierarchy instead of issuing thousands of serial upserts.
  // Stable IDs and skipDuplicates make the seed safe to re-run on an existing local database.
  const wardNames = ["Emergency", "ICU", "Cardiology", "Neurology", "General Medicine", "Orthopedics", "Pediatrics", "Surgical", "Recovery", "Isolation"];
  const buildings: Array<{ id: string; name: string; campusId: string }> = [];
  const floors: Array<{ id: string; name: string; buildingId: string }> = [];
  const wards: Array<{ id: string; name: string; floorId: string }> = [];
  const rooms: Array<{ number: string; name: string; hospitalId: string; campusId: string; buildingId: string; floorId: string; wardId: string }> = [];

  for (let b = 1; b <= 8; b++) {
    const buildingId = `seed-building-${b}`;
    buildings.push({ id: buildingId, name: `Building ${b}`, campusId: campus.id });
    for (let f = 1; f <= 4; f++) {
      const floorId = `seed-floor-${b}-${f}`;
      floors.push({ id: floorId, name: `Floor ${f}`, buildingId });
      for (let w = 0; w < wardNames.length; w++) {
        const wardId = `seed-ward-${b}-${f}-${w}`;
        wards.push({ id: wardId, name: wardNames[w], floorId });
        for (let r = 1; r <= 4; r++) {
          const number = `${f}${String(w + 1).padStart(2, "0")}-${String(r).padStart(2, "0")}`;
          rooms.push({
            number,
            name: `${wardNames[w]} Room ${r}`,
            hospitalId: hospital.id,
            campusId: campus.id,
            buildingId,
            floorId,
            wardId
          });
        }
      }
    }
  }

  await prisma.building.createMany({ data: buildings, skipDuplicates: true });
  await prisma.floor.createMany({ data: floors, skipDuplicates: true });
  await prisma.ward.createMany({ data: wards, skipDuplicates: true });
  await prisma.room.createMany({ data: rooms, skipDuplicates: true });

  const wardIds = wards.map(ward => ward.id);
  const storedRooms = await prisma.room.findMany({
    where: { wardId: { in: wardIds } },
    select: { id: true, wardId: true, number: true }
  });
  const roomByWardAndNumber = new Map(storedRooms.map(room => [`${room.wardId}:${room.number}`, room.id]));
  const beds: Array<{ number: string; wardId: string; roomId: string }> = [];
  let bedNumber = 1;
  for (const room of rooms) {
    const roomId = roomByWardAndNumber.get(`${room.wardId}:${room.number}`);
    if (!roomId) throw new Error(`Seed room missing: ${room.wardId}/${room.number}`);
    for (let bed = 1; bed <= 4; bed++) {
      beds.push({ wardId: room.wardId, roomId, number: `B${String(bedNumber++).padStart(4, "0")}` });
    }
  }
  await prisma.bed.createMany({ data: beds, skipDuplicates: true });

  const blood = ["A+", "B+", "O+", "O-", "AB+"];
  for (let i = 0; i < blood.length; i++) {
    await prisma.bloodUnit.upsert({
      where: { donationCode: `DEMO-${String(i + 1).padStart(3, "0")}` },
      update: { status: "AVAILABLE" },
      create: {
        hospitalId: hospital.id,
        bloodGroup: blood[i],
        component: "RED_CELLS",
        donationCode: `DEMO-${String(i + 1).padStart(3, "0")}`,
        expiresAt: new Date(Date.now() + 30 * 86400000)
      }
    });
  }
  for (const [vehicleCode, driverName] of [["AMB-01", "Demo Driver 01"], ["AMB-02", "Demo Driver 02"]] as const) {
    await prisma.ambulanceTrip.upsert({
      where: { id: `seed-${vehicleCode}` },
      update: { status: "AVAILABLE", driverName },
      create: { id: `seed-${vehicleCode}`, hospitalId: hospital.id, vehicleCode, driverName, status: "AVAILABLE" }
    });
  }

  console.log(`Seeded ${beds.length} demo beds across ${wards.length} wards, a demo clinician, 5 blood units and 2 ambulances.`);
}

main().catch(error => {
  console.error("SpecialCare database seed failed:", error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
