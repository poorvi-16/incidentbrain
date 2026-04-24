import { Router } from "express";
import { getDashboardData } from "../services/incidentService";

const router = Router();

router.get("/", (_req, res) => {
  const dashboard = getDashboardData();
  res.json(dashboard);
});

export default router;
