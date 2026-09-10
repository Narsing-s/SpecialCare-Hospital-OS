import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const hospital = await prisma.hospital.upsert({ where: { code: "SCMC" }, update: { name: "SpecialCare Medical Center" }, create: { code: "SCMC", name: "SpecialCare Medical Center" } });
  const campus = await prisma.campus.upsert({ where: { id: "seed-campus-main" }, update: {}, create: { id: "seed-campus-main", name: "Main Campus", hospitalId: hospital.id } });
  const departments = ["Emergency", "Cardiology", "Neurology", "General Medicine", "Orthopedics", "Pediatrics", "Radiology", "Laboratory"];
  for (const [index, name] of departments.entries()) await prisma.department.upsert({ where: { hospitalId_code: { hospitalId: hospital.id, code: `D${String(index + 1).padStart(2, "0")}` } }, update: { name }, create: { hospitalId: hospital.id, code: `D${String(index + 1).padStart(2, "0")}`, name } });

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
          for (let bed = 1; bed <= 2; bed++) {
            await prisma.bed.upsert({ where: { wardId_number: { wardId: ward.id, number: `B${String(bedNumber).padStart(4, "0")}` } }, update: { roomId: room.id }, create: { wardId: ward.id, roomId: room.id, number: `B${String(bedNumber).padStart(4, "0")}` } });
            bedNumber++;
          }
        }
      }
    }
  }
  console.log(`Seeded ${bedNumber - 1} beds across ${8 * 4 * wardNames.length} wards.`);
}

main().finally(() => prisma.$disconnect());
