import type { CookieOptions, Response } from "express";
import { env } from "../config/env.js";
import { getTokenExpiry } from "./tokens.js";

// secure: HTTPS only in production (local development runs on plain http).
// sameSite "lax": the frontend (plane.yashlalwani.info) and API (api.plane.yashlalwani.info)
// are the same site, so the browser sends the cookies on all of the frontend's requests,
// but not on POST/PATCH/DELETE requests started by other sites, which blocks CSRF.
// COOKIE_DOMAIN (e.g. ".plane.yashlalwani.info") makes the cookies valid on every subdomain
// instead of only the API host. clearAuthCookies uses the same options, so logout
// clears exactly the cookies that login set.
export const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  domain: env.COOKIE_DOMAIN || undefined,
});

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
