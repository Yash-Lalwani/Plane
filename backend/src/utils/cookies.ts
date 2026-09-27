import type { CookieOptions, Response } from "express";
import { env } from "../config/env.js";
import { getTokenExpiry } from "./tokens.js";

// In production the frontend and API live on different hosts, which requires
// sameSite "none", and browsers only accept that together with secure.
// COOKIE_DOMAIN (e.g. ".plane.yashlalwani.info") makes the cookies valid on every subdomain
// instead of only the API host. clearAuthCookies uses the same options, so logout
// clears exactly the cookies that login set.
export const cookieOptions = (): CookieOptions => {
  const isProduction = env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    domain: env.COOKIE_DOMAIN || undefined,
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
