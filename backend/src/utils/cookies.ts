import type { CookieOptions, Response } from "express";
import { env } from "../config/env.js";
import { getTokenExpiry } from "./tokens.js";

// In production the frontend and API live on different domains, which requires
// sameSite "none", and browsers only accept that together with secure.
export const cookieOptions = (): CookieOptions => {
  const isProduction = env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };
};

export const setAuthCookies = (
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): void => {
  res.cookie("accessToken", tokens.accessToken, {
    ...cookieOptions(),
    expires: getTokenExpiry(tokens.accessToken),
  });
  res.cookie("refreshToken", tokens.refreshToken, {
    ...cookieOptions(),
    expires: getTokenExpiry(tokens.refreshToken),
  });
};

export const clearAuthCookies = (res: Response): void => {
  res.clearCookie("accessToken", cookieOptions());
  res.clearCookie("refreshToken", cookieOptions());
};
