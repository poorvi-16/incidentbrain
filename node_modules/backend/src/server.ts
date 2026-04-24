import express from "express";
import cors from "cors";

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

  return app;
}
