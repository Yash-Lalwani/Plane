import { Router } from "express";
import { healthcheckRouter } from "./healthcheck.routes.js";

export const router = Router();

router.use("/healthcheck", healthcheckRouter);
