import type { RequestHandler } from "express";
import type { ZodType } from "zod";

type Schemas = {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
};

// A ZodError thrown here reaches the error handler, which turns it into a 422.
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, _res, next) => {
    if (schemas.body) {
      req.body = schemas.body.parse(req.body ?? {});
    }
    if (schemas.params) {
      req.params = schemas.params.parse(req.params) as typeof req.params;
    }
    if (schemas.query) {
      req.validatedQuery = schemas.query.parse(req.query);
    }
    next();
  };
