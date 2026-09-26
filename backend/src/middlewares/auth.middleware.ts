import type { Request, RequestHandler } from "express";
import { prisma } from "../config/db.js";
import { ApiError } from "../utils/api-error.js";
import { publicUserSelect } from "../utils/selects.js";
import { verifyAccessToken } from "../utils/tokens.js";

const getAccessToken = (req: Request): string | undefined => {
  const cookieToken: unknown = req.cookies?.accessToken;
  if (typeof cookieToken === "string" && cookieToken) {
    return cookieToken;
  }

  const header = req.header("Authorization");
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }
  return undefined;
};

export const verifyJWT: RequestHandler = async (req, _res, next) => {
  const token = getAccessToken(req);
  if (!token) {
    throw new ApiError(401, "Unauthorized request");
  }

  let userId: string;
  try {
    userId = verifyAccessToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired access token");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: publicUserSelect,
  });
  if (!user) {
    throw new ApiError(401, "Invalid access token");
  }

  req.user = user;
  next();
};

export const requireVerifiedEmail: RequestHandler = (req, _res, next) => {
  if (!req.user.isEmailVerified) {
    throw new ApiError(403, "Please verify your email first");
  }
  next();
};
