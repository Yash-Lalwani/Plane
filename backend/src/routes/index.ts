import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { healthcheckRouter } from "./healthcheck.routes.js";
import { projectRouter } from "./project.routes.js";
import { userRouter } from "./user.routes.js";

export const router = Router();

router.use("/healthcheck", healthcheckRouter);
router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/projects", projectRouter);
