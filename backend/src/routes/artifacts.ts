import { Router } from "express";
import { generateAndStoreArtifacts, getArtifactsForIncident } from "../services/artifactService";

const router = Router();

router.post("/:incidentId", (req, res) => {
  const artifacts = generateAndStoreArtifacts(req.params.incidentId);

  if (!artifacts) {
    return res.status(404).json({ error: "Incident or Failure DNA not found" });
  }

  return res.json(artifacts);
});

router.get("/:incidentId", (req, res) => {
  const artifacts = getArtifactsForIncident(req.params.incidentId);

  if (!artifacts) {
    return res.status(404).json({ error: "Artifacts not found" });
  }

  return res.json(artifacts);
});

export default router;
