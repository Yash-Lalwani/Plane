import bcrypt from "bcrypt";
import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import { addEmailJob } from "../queues/email.queue.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { clearAuthCookies, setAuthCookies } from "../utils/cookies.js";
import {
  passwordResetEmail,
  verificationEmail,
} from "../utils/email-templates.js";
import { publicUserSelect } from "../utils/selects.js";
import {
  createRandomToken,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/tokens.js";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RefreshTokenInput,
  RegisterInput,
  ResetPasswordInput,
  TokenParams,
} from "../validators/auth.validator.js";

const BCRYPT_ROUNDS = 10;
const EMAIL_TOKEN_TTL_MS = 20 * 60 * 1000;

const emailTokenExpiry = (): Date => new Date(Date.now() + EMAIL_TOKEN_TTL_MS);

// Signs a new token pair and stores the refresh token hash. Storing it replaces the previous
// one, so each user has exactly one valid refresh token.
const issueTokens = async (userId: string) => {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);
  const user = await prisma.user.update({
    where: { id: userId },
    data: { refreshTokenHash: hashToken(refreshToken) },
    select: publicUserSelect,
  });
  return { user, accessToken, refreshToken };
};

const sendVerificationEmail = async (userId: string): Promise<void> => {
  const { token, tokenHash } = createRandomToken();
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiry: emailTokenExpiry(),
    },
  });
  const link = `${env.CLIENT_URL}/verify-email/${token}`;
  await addEmailJob({
    to: user.email,
    ...verificationEmail(user.username, link),
  });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, username, password, fullName } = req.body as RegisterInput;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    const message =
      existing.email === email
        ? "Email is already registered"
        : "Username is already taken";
    throw new ApiError(409, message);
  }

  const user = await prisma.user.create({
    data: {
      email,
      username,
      fullName,
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
    },
    select: publicUserSelect,
  });
  await sendVerificationEmail(user.id);

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        user,
        "Registered successfully. Please verify your email.",
      ),
    );
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as LoginInput;

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordMatches = user
    ? await bcrypt.compare(password, user.passwordHash)
    : false;
  // Same message for unknown email and wrong password, so logins don't reveal which emails exist.
  if (!user || !passwordMatches) {
    throw new ApiError(401, "Invalid email or password");
  }

  const tokens = await issueTokens(user.id);
  setAuthCookies(res, tokens);

  res.status(200).json(new ApiResponse(200, tokens, "Logged in successfully"));
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: { refreshTokenHash: null },
  });
  clearAuthCookies(res);

  res.status(200).json(new ApiResponse(200, null, "Logged out successfully"));
};

export const getCurrentUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
};

export const refreshAccessToken = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const cookieToken: unknown = req.cookies?.refreshToken;
  const { refreshToken: bodyToken } = req.body as RefreshTokenInput;
  const token =
    typeof cookieToken === "string" && cookieToken ? cookieToken : bodyToken;
  if (!token) {
    throw new ApiError(401, "Refresh token is required");
  }

  let userId: string;
  try {
    userId = verifyRefreshToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  // A validly signed token is still rejected if it is not the one stored for the user,
  // for example an old token that was already rotated or one from before logout.
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.refreshTokenHash !== hashToken(token)) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const { accessToken, refreshToken } = await issueTokens(user.id);
  setAuthCookies(res, { accessToken, refreshToken });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken },
        "Access token refreshed",
      ),
    );
};

export const verifyEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { token } = req.params as TokenParams;

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationTokenHash: hashToken(token),
      emailVerificationExpiry: { gt: new Date() },
    },
  });
  if (!user) {
    throw new ApiError(400, "Verification link is invalid or has expired");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      emailVerificationTokenHash: null,
      emailVerificationExpiry: null,
    },
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isEmailVerified: true },
        "Email verified successfully",
      ),
    );
};

export const resendEmailVerification = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (req.user.isEmailVerified) {
    throw new ApiError(400, "Email is already verified");
  }

  await sendVerificationEmail(req.user.id);

  res.status(200).json(new ApiResponse(200, null, "Verification email sent"));
};

export const forgotPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email } = req.body as ForgotPasswordInput;

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const { token, tokenHash } = createRandomToken();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiry: emailTokenExpiry(),
      },
    });
    const link = `${env.CLIENT_URL}/reset-password/${token}`;
    await addEmailJob({
      to: user.email,
      ...passwordResetEmail(user.username, link),
    });
  }

  // Same response whether or not the account exists, so this endpoint can't be used
  // to find out which emails are registered.
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        null,
        "If an account with that email exists, a reset link has been sent",
      ),
    );
};

export const resetPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { token } = req.params as TokenParams;
  const { password } = req.body as ResetPasswordInput;

  const user = await prisma.user.findFirst({
    where: {
      passwordResetTokenHash: hashToken(token),
      passwordResetExpiry: { gt: new Date() },
    },
  });
  if (!user) {
    throw new ApiError(400, "Reset link is invalid or has expired");
  }

  // Clearing the refresh token logs out every existing session.
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      passwordResetTokenHash: null,
      passwordResetExpiry: null,
      refreshTokenHash: null,
    },
  });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Password reset successfully"));
};

export const changePassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { oldPassword, newPassword } = req.body as ChangePasswordInput;

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.user.id },
  });
  if (!(await bcrypt.compare(oldPassword, user.passwordHash))) {
    throw new ApiError(400, "Old password is incorrect");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) },
  });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Password changed successfully"));
};
