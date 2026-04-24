import express from "express";
import cors from "cors";
import incidentsRouter from "./routes/incidents";
import dashboardRouter from "./routes/dashboard";
import analyzeRouter from "./routes/analyze";

export function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "incidentbrain-backend",
      timestamp: new Date().toISOString()
    });
  });

  app.use("/api/analyze", analyzeRouter);
  app.use("/api/incidents", incidentsRouter);
  app.use("/api/dashboard", dashboardRouter);

  return app;
}
