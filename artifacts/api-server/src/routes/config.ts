import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/config", (_req, res): void => {
  res.json({ testMode: process.env.TEST_MODE === "true" });
});

export default router;
