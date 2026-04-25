import { Router } from "express";
import { Octokit } from "@octokit/rest";
import { parseRepo } from "../utils/github";
import { createGithubPr, syncGithubPrStatus } from "../services/githubService";

const router = Router();

router.post("/test", async (req, res) => {
  try {
    const { repoUrl, token } = req.body ?? {};

    if (!repoUrl || !token) {
      return res.status(400).json({
        ok: false,
        error: "repoUrl and token are required"
      });
    }

    const { owner, repo } = parseRepo(String(repoUrl));
    const octokit = new Octokit({ auth: String(token) });

    const me = await octokit.users.getAuthenticated();
    const repoInfo = await octokit.repos.get({
      owner,
      repo
    });

    return res.json({
      ok: true,
      user: me.data.login,
      repo: repoInfo.data.full_name,
      defaultBranch: repoInfo.data.default_branch
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "GitHub validation failed";

    return res.status(500).json({
      ok: false,
      error: message
    });
  }
});

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
    const message =
      error instanceof Error ? error.message : "GitHub PR creation failed";
    return res.status(500).json({ error: message });
  }
});
router.post("/sync", async (req, res) => {
  try {
    const { incidentId, repoUrl, token } = req.body ?? {};

    if (!incidentId || !repoUrl || !token) {
      return res.status(400).json({
        error: "incidentId, repoUrl, and token are required"
      });
    }

    const result = await syncGithubPrStatus({
      incidentId: String(incidentId),
      repoUrl: String(repoUrl),
      token: String(token)
    });

    return res.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "GitHub PR sync failed";
    return res.status(500).json({ error: message });
  }
});

export default router;
