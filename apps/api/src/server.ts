import Fastify from "fastify";
import cors from "@fastify/cors";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

function mrn() { return `SC-${Date.now().toString().slice(-8)}`; }

app.get("/health", async () => ({ status: "ok", service: "SpecialCare Hospital API", version: "0.3.0" }));

app.get("/api/v1/dashboard/summary", async () => ({
  beds: { total: await prisma.bed.count(), occupied: await prisma.bed.count({ where: { status: "OCCUPIED" } }), available: await prisma.bed.count({ where: { status: "AVAILABLE" } }) },
  patients: { total: await prisma.patient.count() },
  admissions: { active: await prisma.admission.count({ where: { status: "ACTIVE" } }) }
}));

app.get("/api/v1/patients", async (request) => {
  const q = (request.query as { search?: string }).search?.trim();
  const data = await prisma.patient.findMany({ where: q ? { OR: [{ mrn: { contains: q, mode: "insensitive" } }, { firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : undefined, orderBy: { createdAt: "desc" }, take: 100 });
  return { data };
});

app.post("/api/v1/patients", async (request, reply) => {
  const body = request.body as { firstName?: string; lastName?: string; dateOfBirth?: string; phone?: string; email?: string; hospitalId?: string };
  if (!body.firstName?.trim() || !body.lastName?.trim() || !body.hospitalId) return reply.code(400).send({ error: "firstName, lastName and hospitalId are required" });
  const patient = await prisma.patient.create({ data: { mrn: mrn(), firstName: body.firstName.trim(), lastName: body.lastName.trim(), dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined, phone: body.phone?.trim() || undefined, email: body.email?.trim() || undefined, hospitalId: body.hospitalId } });
  return reply.code(201).send(patient);
});

app.get("/api/v1/patients/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  const patient = await prisma.patient.findUnique({ where: { id }, include: { allergies: true, admissions: { include: { bed: { include: { ward: true } } }, orderBy: { admittedAt: "desc" } }, vitals: { orderBy: { recordedAt: "desc" }, take: 20 }, appointments: { orderBy: { scheduledAt: "desc" }, take: 20 } } });
  if (!patient) return reply.code(404).send({ error: "Patient not found" });
  return patient;
});

app.get("/api/v1/beds", async () => ({ total: await prisma.bed.count(), available: await prisma.bed.count({ where: { status: "AVAILABLE" } }), occupied: await prisma.bed.count({ where: { status: "OCCUPIED" } }), beds: await prisma.bed.findMany({ include: { ward: true }, orderBy: [{ wardId: "asc" }, { number: "asc" }] }) }));

app.post("/api/v1/admissions", async (request, reply) => {
  const body = request.body as { patientId?: string; bedId?: string };
  if (!body.patientId || !body.bedId) return reply.code(400).send({ error: "patientId and bedId are required" });
  const result = await prisma.$transaction(async tx => {
    const bed = await tx.bed.findUnique({ where: { id: body.bedId } });
    if (!bed || bed.status !== "AVAILABLE") throw new Error("BED_NOT_AVAILABLE");
    const admission = await tx.admission.create({ data: { patientId: body.patientId!, bedId: body.bedId! } });
    await tx.bed.update({ where: { id: body.bedId! }, data: { status: "OCCUPIED" } });
    return admission;
  }).catch(e => e.message === "BED_NOT_AVAILABLE" ? null : Promise.reject(e));
  if (!result) return reply.code(409).send({ error: "Bed is not available" });
  return reply.code(201).send(result);
});

app.post("/api/v1/admissions/:id/transfer", async (request, reply) => {
  const { id } = request.params as { id: string };
  const { toBedId } = request.body as { toBedId?: string };
  if (!toBedId) return reply.code(400).send({ error: "toBedId is required" });
  try {
    const result = await prisma.$transaction(async tx => {
      const admission = await tx.admission.findUnique({ where: { id } });
      const target = await tx.bed.findUnique({ where: { id: toBedId } });
      if (!admission || admission.status !== "ACTIVE" || !target || target.status !== "AVAILABLE") throw new Error("TRANSFER_NOT_ALLOWED");
      await tx.admissionTransfer.create({ data: { admissionId: id, fromBedId: admission.bedId, toBedId } });
      await tx.bed.update({ where: { id: admission.bedId }, data: { status: "AVAILABLE" } });
      await tx.bed.update({ where: { id: toBedId }, data: { status: "OCCUPIED" } });
      return tx.admission.update({ where: { id }, data: { bedId: toBedId } });
    });
    return result;
  } catch { return reply.code(409).send({ error: "Transfer could not be completed" }); }
});

app.post("/api/v1/admissions/:id/discharge", async (request, reply) => {
  const { id } = request.params as { id: string };
  try {
    const result = await prisma.$transaction(async tx => {
      const admission = await tx.admission.findUnique({ where: { id } });
      if (!admission || admission.status !== "ACTIVE") throw new Error("NOT_ACTIVE");
      await tx.bed.update({ where: { id: admission.bedId }, data: { status: "CLEANING" } });
      return tx.admission.update({ where: { id }, data: { status: "DISCHARGED", dischargedAt: new Date() } });
    });
    return result;
  } catch { return reply.code(404).send({ error: "Active admission not found" }); }
});

app.addHook("onClose", async () => prisma.$disconnect());
await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT || 4000) });
