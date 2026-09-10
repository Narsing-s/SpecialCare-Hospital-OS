import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";

const text = (v: unknown) => typeof v === "string" && v.trim().length > 0;
const int = (v: unknown) => Number.isInteger(v);

export async function registerClinicalCareRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get("/api/v1/patients/:id/vitals", async (request) => {
    const { id } = request.params as { id: string };
    return { data: await prisma.vital.findMany({ where: { patientId: id }, orderBy: { recordedAt: "desc" }, take: 100 }) };
  });

  app.post("/api/v1/vitals", async (request, reply) => {
    const b = request.body as { patientId?: string; recordedBy?: string; temperature?: number; heartRate?: number; respiratoryRate?: number; systolic?: number; diastolic?: number; spo2?: number };
    if (!text(b.patientId) || !text(b.recordedBy)) return reply.code(400).send({ error: "patientId and recordedBy are required" });
    const numeric = [b.heartRate, b.respiratoryRate, b.systolic, b.diastolic];
    if (numeric.some(v => v !== undefined && !int(v))) return reply.code(400).send({ error: "Heart rate, respiratory rate and blood pressure must be integers" });
    if (b.temperature !== undefined && (!Number.isFinite(b.temperature) || b.temperature < 25 || b.temperature > 45)) return reply.code(400).send({ error: "Temperature must be between 25 and 45" });
    if (b.spo2 !== undefined && (!Number.isFinite(b.spo2) || b.spo2 < 0 || b.spo2 > 100)) return reply.code(400).send({ error: "SpO₂ must be between 0 and 100" });
    const patient = await prisma.patient.findUnique({ where: { id: b.patientId } });
    if (!patient) return reply.code(404).send({ error: "Patient not found" });
    return reply.code(201).send(await prisma.vital.create({ data: { patientId: b.patientId!, recordedBy: b.recordedBy!.trim(), temperature: b.temperature, heartRate: b.heartRate, respiratoryRate: b.respiratoryRate, systolic: b.systolic, diastolic: b.diastolic, spo2: b.spo2 } }));
  });

  app.post("/api/v1/encounters", async (request, reply) => {
    const b = request.body as { patientId?: string; doctorId?: string; appointmentId?: string };
    if (!text(b.patientId) || !text(b.doctorId)) return reply.code(400).send({ error: "patientId and doctorId are required" });
    const [patient, doctor] = await Promise.all([prisma.patient.findUnique({ where: { id: b.patientId } }), prisma.doctor.findUnique({ where: { id: b.doctorId } })]);
    if (!patient) return reply.code(404).send({ error: "Patient not found" });
    if (!doctor) return reply.code(404).send({ error: "Doctor not found" });
    if (b.appointmentId) { const appointment = await prisma.appointment.findUnique({ where: { id: b.appointmentId } }); if (!appointment) return reply.code(404).send({ error: "Appointment not found" }); }
    return reply.code(201).send(await prisma.encounter.create({ data: { patientId: b.patientId!, doctorId: b.doctorId!, appointmentId: b.appointmentId || undefined }, include: { patient: true, doctor: { include: { department: true } } } }));
  });

  app.get("/api/v1/encounters/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const encounter = await prisma.encounter.findUnique({ where: { id }, include: { patient: true, doctor: { include: { department: true } }, notes: { orderBy: { createdAt: "desc" } }, diagnoses: true, orders: { include: { diagnosticResults: true }, orderBy: { createdAt: "desc" } } } });
    if (!encounter) return reply.code(404).send({ error: "Encounter not found" });
    return encounter;
  });

  app.post("/api/v1/encounters/:id/notes", async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = request.body as { authorId?: string; body?: string };
    if (!text(b.authorId) || !text(b.body)) return reply.code(400).send({ error: "authorId and body are required" });
    const encounter = await prisma.encounter.findUnique({ where: { id } });
    if (!encounter) return reply.code(404).send({ error: "Encounter not found" });
    if (encounter.status === "CLOSED") return reply.code(409).send({ error: "Encounter is closed" });
    return reply.code(201).send(await prisma.clinicalNote.create({ data: { encounterId: id, authorId: b.authorId!.trim(), body: b.body!.trim() } }));
  });

  app.post("/api/v1/encounters/:id/diagnoses", async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = request.body as { code?: string; description?: string };
    if (!text(b.code) || !text(b.description)) return reply.code(400).send({ error: "code and description are required" });
    const encounter = await prisma.encounter.findUnique({ where: { id } });
    if (!encounter) return reply.code(404).send({ error: "Encounter not found" });
    if (encounter.status === "CLOSED") return reply.code(409).send({ error: "Encounter is closed" });
    return reply.code(201).send(await prisma.diagnosis.create({ data: { encounterId: id, code: b.code!.trim(), description: b.description!.trim() } }));
  });

  app.post("/api/v1/encounters/:id/orders", async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = request.body as { type?: string; details?: unknown };
    if (!text(b.type)) return reply.code(400).send({ error: "type is required" });
    const encounter = await prisma.encounter.findUnique({ where: { id } });
    if (!encounter) return reply.code(404).send({ error: "Encounter not found" });
    if (encounter.status === "CLOSED") return reply.code(409).send({ error: "Encounter is closed" });
    return reply.code(201).send(await prisma.clinicalOrder.create({ data: { encounterId: id, type: b.type!.trim().toUpperCase(), details: b.details === undefined ? undefined : b.details as any } }));
  });

  app.patch("/api/v1/encounters/:id/close", async (request, reply) => {
    const { id } = request.params as { id: string };
    const encounter = await prisma.encounter.findUnique({ where: { id } });
    if (!encounter) return reply.code(404).send({ error: "Encounter not found" });
    if (encounter.status === "CLOSED") return encounter;
    return prisma.encounter.update({ where: { id }, data: { status: "CLOSED", closedAt: new Date() } });
  });
}
