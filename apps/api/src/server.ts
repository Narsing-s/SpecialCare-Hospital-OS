import Fastify from "fastify";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ status: "ok", service: "SpecialCare Hospital API", version: "0.2.0" }));

app.get("/api/v1/dashboard/summary", async () => ({
  beds: { total: 1284, occupied: 1067, available: 217 },
  icu: { total: 86, occupied: 83, available: 3 },
  emergency: { activePatients: 27 },
  discharges: { pending: 46 },
  lab: { pendingReports: 143 }
}));

app.get("/api/v1/patients", async (request) => ({
  data: [
    { mrn: "SC-100245", firstName: "Aarav", lastName: "Kumar", department: "Cardiology", location: "ICU-12", status: "CRITICAL" },
    { mrn: "SC-100246", firstName: "Meera", lastName: "Reddy", department: "Neurology", location: "W-204", status: "STABLE" },
    { mrn: "SC-100247", firstName: "Rahul", lastName: "Sharma", department: "Orthopedics", location: "W-318", status: "STABLE" }
  ],
  query: (request as { query?: Record<string, string> }).query ?? {}
}));

app.get("/api/v1/beds", async () => ({
  total: 1284,
  occupied: 1067,
  available: 217,
  statuses: { AVAILABLE: 217, OCCUPIED: 1067, CLEANING: 18, RESERVED: 9, OUT_OF_SERVICE: 3 }
}));

app.listen({ host: "0.0.0.0", port: Number(process.env.PORT || 4000) }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
