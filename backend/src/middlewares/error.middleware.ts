import type { ErrorRequestHandler, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { Prisma } from "../generated/prisma/client.js";
import { ApiError, type FieldError } from "../utils/api-error.js";

// Errors created by Express itself (for example body-parser rejecting malformed JSON
// or a too-large body) carry an HTTP status and set `expose` when the message is safe to show.
type ExpressHttpError = Error & { status: number; expose: boolean };

const isExpressHttpError = (err: unknown): err is ExpressHttpError =>
  err instanceof Error &&
  "status" in err &&
  "expose" in err &&
  err.expose === true;

const sendError = (
  res: Response,
  err: unknown,
  statusCode: number,
  message: string,
  errors: FieldError[] = [],
) => {
  const stack =
    env.NODE_ENV === "development" && err instanceof Error
      ? err.stack
      : undefined;
  res
    .status(statusCode)
    .json({ statusCode, message, errors, success: false, stack });
};

export const notFound: RequestHandler = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    sendError(res, err, err.statusCode, err.message, err.errors);
    return;
  }

  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    sendError(res, err, 422, "Validation failed", errors);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      sendError(res, err, 409, "Resource already exists");
      return;
    }
    if (err.code === "P2025") {
      sendError(res, err, 404, "Resource not found");
      return;
    }
  }

  if (isExpressHttpError(err)) {
    sendError(res, err, err.status, err.message);
    return;
  }

  logger.error({ err }, "Unhandled error");
  sendError(res, err, 500, "Internal server error");
};
