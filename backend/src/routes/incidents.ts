import { Router } from "express";
import {
  getAllIncidents,
  getIncidentById,
  resolveIncident,
  deleteIncident
} from "../services/incidentService";

const router = Router();

router.get("/", (_req, res) => {
  const incidents = getAllIncidents();
  res.json(incidents);
});

router.get("/:id", (req, res) => {
  const incident = getIncidentById(req.params.id);

  if (!incident) {
    return res.status(404).json({ error: "Incident not found" });
  }

  return res.json(incident);
});

router.patch("/:id/resolve", (req, res) => {
  const incident = resolveIncident(req.params.id);

  if (!incident) {
    return res.status(404).json({ error: "Incident not found" });
  }

  return res.json(incident);
});

router.delete("/:id", (req, res) => {
  const deleted = deleteIncident(req.params.id);

  if (!deleted) {
    return res.status(404).json({ error: "Incident not found" });
  }

  return res.json({ ok: true });
});

export default router;
