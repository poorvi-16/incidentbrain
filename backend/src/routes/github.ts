import { Router } from "express";
import { createGithubPr } from "../services/githubService";

const router = Router();

router.post("/pr", async (req, res) => {
  try {
    const { incidentId, repoUrl, token } = req.body ?? {};

    if (!incidentId || !repoUrl || !token) {
      return res.status(400).json({
        error: "incidentId, repoUrl, and token are required"
      });
    }

    const result = await createGithubPr({
      incidentId: String(incidentId),
      repoUrl: String(repoUrl),
      token: String(token)
    });

    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub PR creation failed";
    return res.status(500).json({ error: message });
  }
});

export default router;
