import Fastify from "fastify";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ status:"ok", service:"SpecialCare Hospital API", version:"0.1.0" }));

app.get("/api/v1/dashboard/summary", async () => ({
  beds:{total:1284,occupied:1067,available:217},
  icu:{total:86,occupied:83,available:3},
  emergency:{activePatients:27},
  discharges:{pending:46},
  lab:{pendingReports:143}
}));

app.listen({host:"0.0.0.0",port:Number(process.env.PORT||4000)});
