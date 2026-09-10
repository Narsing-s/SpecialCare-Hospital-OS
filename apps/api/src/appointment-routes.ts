import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";

const required = (value: unknown) => typeof value === "string" && value.trim().length > 0;

export async function registerAppointmentRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get("/api/v1/appointments", async (request) => {
    const q = request.query as { patientId?: string; doctorId?: string; status?: string; from?: string; to?: string };
    return {
      data: await prisma.appointment.findMany({
        where: {
          ...(q.patientId ? { patientId: q.patientId } : {}),
          ...(q.doctorId ? { doctorId: q.doctorId } : {}),
          ...(q.status ? { status: q.status.trim().toUpperCase() as any } : {}),
          ...(q.from || q.to ? { scheduledAt: { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lte: new Date(q.to) } : {}) } } : {})
        },
        include: { patient: true, doctor: { include: { user: { select: { email: true } }, department: true } }, department: true },
        orderBy: { scheduledAt: "asc" },
        take: 500
      })
    };
  });

  app.post("/api/v1/appointments", async (request, reply) => {
    const b = request.body as { patientId?: string; doctorId?: string; departmentId?: string; scheduledAt?: string };
    if (![b.patientId, b.doctorId, b.departmentId, b.scheduledAt].every(required)) return reply.code(400).send({ error: "patientId, doctorId, departmentId and scheduledAt are required" });
    const scheduledAt = new Date(b.scheduledAt!);
    if (Number.isNaN(scheduledAt.getTime())) return reply.code(400).send({ error: "scheduledAt must be a valid date" });
    if (scheduledAt.getTime() < Date.now() - 60_000) return reply.code(400).send({ error: "Appointment time cannot be in the past" });

    const [patient, doctor, department, conflict] = await Promise.all([
      prisma.patient.findUnique({ where: { id: b.patientId } }),
      prisma.doctor.findUnique({ where: { id: b.doctorId } }),
      prisma.department.findUnique({ where: { id: b.departmentId } }),
      prisma.appointment.findFirst({ where: { doctorId: b.doctorId, scheduledAt, status: { notIn: ["CANCELLED", "NO_SHOW"] } as any } })
    ]);
    if (!patient) return reply.code(404).send({ error: "Patient not found" });
    if (!doctor) return reply.code(404).send({ error: "Doctor not found" });
    if (!department) return reply.code(404).send({ error: "Department not found" });
    if (doctor.departmentId !== department.id) return reply.code(400).send({ error: "Doctor does not belong to the selected department" });
    if (conflict) return reply.code(409).send({ error: "Doctor already has an appointment at this time" });

    return reply.code(201).send(await prisma.appointment.create({
      data: { patientId: b.patientId!, doctorId: b.doctorId!, departmentId: b.departmentId!, scheduledAt },
      include: { patient: true, doctor: { include: { department: true } }, department: true }
    }));
  });

  app.patch("/api/v1/appointments/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = request.body as { status?: string; scheduledAt?: string };
    const allowed = ["SCHEDULED", "CHECKED_IN", "IN_CONSULTATION", "COMPLETED", "CANCELLED", "NO_SHOW"];
    const status = b.status?.trim().toUpperCase();
    if (status && !allowed.includes(status)) return reply.code(400).send({ error: "Invalid appointment status" });
    try {
      return await prisma.appointment.update({ where: { id }, data: { ...(status ? { status: status as any } : {}), ...(b.scheduledAt ? { scheduledAt: new Date(b.scheduledAt) } : {}) }, include: { patient: true, doctor: { include: { department: true } }, department: true } });
    } catch {
      return reply.code(404).send({ error: "Appointment not found" });
    }
  });

  app.get("/api/v1/queues", async (request) => {
    const q = request.query as { departmentId?: string; date?: string };
    const date = q.date ? new Date(`${q.date}T00:00:00`) : new Date();
    const next = new Date(date); next.setDate(next.getDate() + 1);
    return { data: await prisma.appointment.findMany({ where: { ...(q.departmentId ? { departmentId: q.departmentId } : {}), scheduledAt: { gte: date, lt: next }, status: { in: ["SCHEDULED", "CHECKED_IN", "IN_CONSULTATION"] as any } }, include: { patient: true, doctor: { include: { department: true } }, department: true }, orderBy: { scheduledAt: "asc" }, take: 500 }) };
  });
}
