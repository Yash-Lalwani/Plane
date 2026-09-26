import { Router } from "express";
import {
  changePassword,
  forgotPassword,
  getCurrentUser,
  login,
  logout,
  refreshAccessToken,
  register,
  resendEmailVerification,
  resetPassword,
  verifyEmail,
} from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authRateLimit } from "../middlewares/rate-limit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
  tokenParamSchema,
} from "../validators/auth.validator.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  authRateLimit(),
  validate({ body: registerSchema }),
  register,
);
authRouter.post(
  "/login",
  authRateLimit(),
  validate({ body: loginSchema }),
  login,
);
authRouter.post("/logout", verifyJWT, logout);
authRouter.get("/current-user", verifyJWT, getCurrentUser);
authRouter.post(
  "/refresh-token",
  validate({ body: refreshTokenSchema }),
  refreshAccessToken,
);
authRouter.post(
  "/verify-email/:token",
  validate({ params: tokenParamSchema }),
  verifyEmail,
);
authRouter.post(
  "/resend-email-verification",
  authRateLimit(),
  verifyJWT,
  resendEmailVerification,
);
authRouter.post(
  "/forgot-password",
  authRateLimit(),
  validate({ body: forgotPasswordSchema }),
  forgotPassword,
);
authRouter.post(
  "/reset-password/:token",
  validate({ params: tokenParamSchema, body: resetPasswordSchema }),
  resetPassword,
);
authRouter.post(
  "/change-password",
  verifyJWT,
  validate({ body: changePasswordSchema }),
  changePassword,
);
