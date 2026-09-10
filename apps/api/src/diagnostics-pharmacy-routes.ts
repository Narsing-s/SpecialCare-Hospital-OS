import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";

const required = (v: unknown) => typeof v === "string" && v.trim().length > 0;

export async function registerDiagnosticsPharmacyRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get("/api/v1/doctors", async () => ({ data: await prisma.doctor.findMany({ include: { user: { select: { id: true, email: true, status: true } }, department: true }, orderBy: { user: { email: "asc" } } }) }));

  app.get("/api/v1/diagnostics/orders", async (request) => {
    const q = request.query as { status?: string; type?: string; patientId?: string };
    const type = q.type?.trim().toUpperCase();
    const data = await prisma.clinicalOrder.findMany({
      where: { ...(q.status ? { status: q.status.trim().toUpperCase() } : {}), ...(type ? { type } : { type: { in: ["LAB", "RADIOLOGY"] } }), ...(q.patientId ? { encounter: { patientId: q.patientId } } : {}) },
      include: { encounter: { include: { patient: true, doctor: { include: { department: true } } } }, diagnosticResults: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" }, take: 200
    });
    return { data };
  });

  app.post("/api/v1/diagnostics/orders", async (request, reply) => {
    const b = request.body as { encounterId?: string; type?: string; details?: unknown };
    const type = b.type?.trim().toUpperCase();
    if (!required(b.encounterId) || !required(type)) return reply.code(400).send({ error: "encounterId and type are required" });
    if (!['LAB', 'RADIOLOGY'].includes(type!)) return reply.code(400).send({ error: "type must be LAB or RADIOLOGY" });
    const encounter = await prisma.encounter.findUnique({ where: { id: b.encounterId } });
    if (!encounter) return reply.code(404).send({ error: "Encounter not found" });
    return reply.code(201).send(await prisma.clinicalOrder.create({ data: { encounterId: b.encounterId!, type: type!, details: b.details === undefined ? undefined : b.details as any } }));
  });

  app.post("/api/v1/diagnostics/orders/:id/results", async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = request.body as { status?: string; result?: unknown; reportedBy?: string };
    if (!required(b.status) || b.result === undefined) return reply.code(400).send({ error: "status and result are required" });
    const order = await prisma.clinicalOrder.findUnique({ where: { id }, include: { encounter: true } });
    if (!order || !['LAB', 'RADIOLOGY'].includes(order.type)) return reply.code(404).send({ error: "Diagnostic order not found" });
    const result = await prisma.diagnosticResult.create({ data: { orderId: id, patientId: order.encounter.patientId, kind: order.type, status: b.status!.trim().toUpperCase(), result: b.result as any, reportedBy: b.reportedBy?.trim() || undefined, reportedAt: new Date() } });
    await prisma.clinicalOrder.update({ where: { id }, data: { status: "RESULTED" } });
    return reply.code(201).send(result);
  });

  app.get("/api/v1/patients/:id/diagnostics", async (request) => {
    const { id } = request.params as { id: string };
    return { data: await prisma.diagnosticResult.findMany({ where: { patientId: id }, include: { order: true }, orderBy: { createdAt: "desc" }, take: 100 }) };
  });

  app.post("/api/v1/prescriptions", async (request, reply) => {
    const b = request.body as { patientId?: string; doctorId?: string; items?: Array<{ medication?: string; dose?: string; route?: string; frequency?: string; duration?: string; quantity?: number }> };
    if (!required(b.patientId) || !required(b.doctorId) || !Array.isArray(b.items) || !b.items.length) return reply.code(400).send({ error: "patientId, doctorId and at least one medication item are required" });
    if (b.items.some(i => !required(i.medication) || (i.quantity !== undefined && (!Number.isInteger(i.quantity) || i.quantity < 1)))) return reply.code(400).send({ error: "Each medication requires a name and valid quantity" });
    const patient = await prisma.patient.findUnique({ where: { id: b.patientId } });
    const doctor = await prisma.doctor.findUnique({ where: { id: b.doctorId } });
    if (!patient) return reply.code(404).send({ error: "Patient not found" });
    if (!doctor) return reply.code(404).send({ error: "Doctor not found" });
    const prescription = await prisma.prescription.create({ data: { patientId: b.patientId!, doctorId: b.doctorId!, items: { create: b.items.map(i => ({ medication: i.medication!.trim(), dose: i.dose?.trim(), route: i.route?.trim(), frequency: i.frequency?.trim(), duration: i.duration?.trim(), quantity: i.quantity })) } }, include: { doctor: { include: { department: true } }, items: true } });
    return reply.code(201).send(prescription);
  });

  app.get("/api/v1/prescriptions", async (request) => {
    const q = request.query as { patientId?: string; status?: string };
    return { data: await prisma.prescription.findMany({ where: { ...(q.patientId ? { patientId: q.patientId } : {}), ...(q.status ? { status: q.status.trim().toUpperCase() } : {}) }, include: { doctor: { include: { department: true } }, patient: true, items: { include: { administrations: { orderBy: { administeredAt: "desc" }, take: 5 } } } }, orderBy: { createdAt: "desc" }, take: 100 }) };
  });

  app.post("/api/v1/prescription-items/:id/administrations", async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = request.body as { administeredBy?: string; status?: string; notes?: string };
    if (!required(b.administeredBy)) return reply.code(400).send({ error: "administeredBy is required" });
    const item = await prisma.prescriptionItem.findUnique({ where: { id }, include: { prescription: true } });
    if (!item) return reply.code(404).send({ error: "Prescription item not found" });
    const administration = await prisma.medicationAdministration.create({ data: { prescriptionItemId: id, patientId: item.prescription.patientId, administeredBy: b.administeredBy!, status: b.status?.trim().toUpperCase() || "GIVEN", notes: b.notes?.trim() || undefined } });
    return reply.code(201).send(administration);
  });

  app.get("/api/v1/patients/:id/medications", async (request) => {
    const { id } = request.params as { id: string };
    return { data: await prisma.prescription.findMany({ where: { patientId: id }, include: { doctor: { include: { department: true } }, items: { include: { administrations: { orderBy: { administeredAt: "desc" }, take: 10 } } } }, orderBy: { createdAt: "desc" } }) };
  });
}
