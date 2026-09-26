import crypto from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

// jsonwebtoken types expect values like "15m"; the env schema only guarantees a string.
type ExpiresIn = SignOptions["expiresIn"];

export const signAccessToken = (userId: string): string =>
  jwt.sign({ sub: userId }, env.ACCESS_TOKEN_SECRET, {
    expiresIn: env.ACCESS_TOKEN_EXPIRY as ExpiresIn,
  });

// A random jwtid makes every refresh token unique, even two issued in the same second,
// so rotation always produces a token different from the old one.
export const signRefreshToken = (userId: string): string =>
  jwt.sign({ sub: userId }, env.REFRESH_TOKEN_SECRET, {
    expiresIn: env.REFRESH_TOKEN_EXPIRY as ExpiresIn,
    jwtid: crypto.randomUUID(),
  });

// Returns the user id from a valid token. Throws if the token is invalid or expired.
const verifyToken = (token: string, secret: string): string => {
  const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
  if (typeof payload === "string" || !payload.sub) {
    throw new Error("Invalid token payload");
  }
  return payload.sub;
};

export const verifyAccessToken = (token: string): string =>
  verifyToken(token, env.ACCESS_TOKEN_SECRET);

export const verifyRefreshToken = (token: string): string =>
  verifyToken(token, env.REFRESH_TOKEN_SECRET);

export const getTokenExpiry = (token: string): Date => {
  const payload = jwt.decode(token);
  if (!payload || typeof payload === "string" || !payload.exp) {
    throw new Error("Token has no expiry");
  }
  return new Date(payload.exp * 1000);
};

export const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

// For email verification, password reset and invitations: the raw token goes in the
// email link, only its hash is stored in the database.
export const createRandomToken = (): { token: string; tokenHash: string } => {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, tokenHash: hashToken(token) };
};
