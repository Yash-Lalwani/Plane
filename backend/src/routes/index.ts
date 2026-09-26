import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { healthcheckRouter } from "./healthcheck.routes.js";

export const router = Router();

router.use("/healthcheck", healthcheckRouter);
router.use("/auth", authRouter);
