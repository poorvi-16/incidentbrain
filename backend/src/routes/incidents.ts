import { Router } from "express";
import { getAllIncidents, getIncidentById } from "../services/incidentService";

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

export default router;
