import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { errorHandler, notFound } from "./middlewares/error.middleware.js";
import { router } from "./routes/index.js";

export const app = express();

// Railway (and most hosts) put the app behind one proxy. Trusting it makes req.ip the real
// client IP, which the rate limiter needs to tell clients apart.
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(cookieParser());
app.use(
  pinoHttp({
    logger,
    redact: ["req.headers.authorization", "req.headers.cookie"],
  }),
);

app.use("/api/v1", router);

app.use(notFound);
app.use(errorHandler);
