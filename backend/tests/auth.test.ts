import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { env } from "../src/config/env.js";
import { addEmailJob } from "../src/queues/email.queue.js";
import { hashToken } from "../src/utils/tokens.js";
import { createUser, loginAs, TEST_PASSWORD } from "./helpers/auth.js";
import { resetDatabase } from "./helpers/db.js";
import { getTokenFromLastEmail } from "./helpers/email.js";
import { testEnv } from "./helpers/test-env.js";

const AUTH = "/api/v1/auth";

const cookieNames = (res: request.Response): string[] => {
  const header = res.headers["set-cookie"] as unknown as string[] | undefined;
  return (header ?? []).map((cookie) => cookie.split("=")[0]);
};

describe("auth", () => {
  beforeEach(resetDatabase);

  describe("POST /register", () => {
    const body = {
      email: "  New.User@Example.com ",
      username: " New_User ",
      password: "password123",
      fullName: "New User",
    };

    it("creates the user and queues a verification email", async () => {
      const res = await request(app).post(`${AUTH}/register`).send(body);

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        email: "new.user@example.com",
        username: "new_user",
        fullName: "New User",
        isEmailVerified: false,
      });
      expect(res.body.data).not.toHaveProperty("passwordHash");

      expect(addEmailJob).toHaveBeenCalledOnce();
      const email = vi.mocked(addEmailJob).mock.calls[0][0];
      expect(email.to).toBe("new.user@example.com");
      expect(email.text).toContain(`${testEnv.CLIENT_URL}/verify-email/`);

      // Only the hash of the emailed token is stored.
      const token = getTokenFromLastEmail("verify-email");
      const user = await prisma.user.findUniqueOrThrow({
        where: { email: "new.user@example.com" },
      });
      expect(user.emailVerificationTokenHash).toBe(hashToken(token));
    });

    it("returns 409 for an email that is already registered", async () => {
      await request(app).post(`${AUTH}/register`).send(body).expect(201);

      const res = await request(app)
        .post(`${AUTH}/register`)
        .send({ ...body, username: "someone_else" });

      expect(res.status).toBe(409);
    });

    it("returns 422 with field errors for invalid input", async () => {
      const res = await request(app)
        .post(`${AUTH}/register`)
        .send({ email: "not-an-email", username: "ab", password: "short" });

      expect(res.status).toBe(422);
      const fields = res.body.errors.map(
        (error: { field: string }) => error.field,
      );
      expect(fields).toEqual(
        expect.arrayContaining(["email", "username", "password"]),
      );
    });
  });

  describe("POST /login", () => {
    it("sets httpOnly cookies and returns both tokens", async () => {
      const user = await createUser();

      const res = await request(app)
        .post(`${AUTH}/login`)
        .send({ email: user.email, password: TEST_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(user.email);
      expect(res.body.data.accessToken).toEqual(expect.any(String));
      expect(res.body.data.refreshToken).toEqual(expect.any(String));
      expect(cookieNames(res)).toEqual(["accessToken", "refreshToken"]);
      const cookies = res.headers["set-cookie"] as unknown as string[];
      expect(cookies.every((cookie) => cookie.includes("HttpOnly"))).toBe(true);
    });

    it("returns the same 401 for a wrong password and an unknown email", async () => {
      const user = await createUser();

      const wrongPassword = await request(app)
        .post(`${AUTH}/login`)
        .send({ email: user.email, password: "wrong-password" });
      const unknownEmail = await request(app)
        .post(`${AUTH}/login`)
        .send({ email: "nobody@example.com", password: TEST_PASSWORD });

      expect(wrongPassword.status).toBe(401);
      expect(unknownEmail.status).toBe(401);
      expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
    });
  });

  describe("GET /current-user", () => {
    it("returns the user when authenticated with the cookie", async () => {
      const user = await createUser();
      const agent = await loginAs(user);

      const res = await agent.get(`${AUTH}/current-user`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(user.id);
      expect(res.body.data).not.toHaveProperty("passwordHash");
      expect(res.body.data).not.toHaveProperty("refreshTokenHash");
    });

    it("accepts the access token as a Bearer header", async () => {
      const user = await createUser();
      const login = await request(app)
        .post(`${AUTH}/login`)
        .send({ email: user.email, password: TEST_PASSWORD });

      const res = await request(app)
        .get(`${AUTH}/current-user`)
        .set("Authorization", `Bearer ${login.body.data.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(user.id);
    });

    it("returns 401 without a token or with an invalid one", async () => {
      await request(app).get(`${AUTH}/current-user`).expect(401);
      await request(app)
        .get(`${AUTH}/current-user`)
        .set("Authorization", "Bearer not-a-jwt")
        .expect(401);
    });
  });

  describe("POST /logout", () => {
    it("clears the cookies and invalidates the refresh token", async () => {
      const user = await createUser();
      const login = await request(app)
        .post(`${AUTH}/login`)
        .send({ email: user.email, password: TEST_PASSWORD });
      const { accessToken, refreshToken } = login.body.data;

      const res = await request(app)
        .post(`${AUTH}/logout`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(cookieNames(res)).toEqual(["accessToken", "refreshToken"]);
      await request(app)
        .post(`${AUTH}/refresh-token`)
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe("POST /refresh-token", () => {
    it("rotates the refresh token and rejects the old one", async () => {
      const user = await createUser();
      const login = await request(app)
        .post(`${AUTH}/login`)
        .send({ email: user.email, password: TEST_PASSWORD });
      const oldRefreshToken = login.body.data.refreshToken;

      const res = await request(app)
        .post(`${AUTH}/refresh-token`)
        .send({ refreshToken: oldRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toEqual(expect.any(String));
      expect(res.body.data.refreshToken).not.toBe(oldRefreshToken);
      expect(cookieNames(res)).toEqual(["accessToken", "refreshToken"]);

      await request(app)
        .post(`${AUTH}/refresh-token`)
        .send({ refreshToken: oldRefreshToken })
        .expect(401);
      await request(app)
        .post(`${AUTH}/refresh-token`)
        .send({ refreshToken: res.body.data.refreshToken })
        .expect(200);
    });

    it("reads the refresh token from the cookie", async () => {
      const agent = await loginAs(await createUser());

      await agent.post(`${AUTH}/refresh-token`).expect(200);
    });

    it("returns 401 without a refresh token", async () => {
      await request(app).post(`${AUTH}/refresh-token`).expect(401);
    });
  });

  describe("POST /verify-email/:token", () => {
    const registerAndGetToken = async () => {
      await request(app)
        .post(`${AUTH}/register`)
        .send({
          email: "verify@example.com",
          username: "verify_me",
          password: "password123",
        })
        .expect(201);
      return getTokenFromLastEmail("verify-email");
    };

    it("verifies the email and the token cannot be reused", async () => {
      const token = await registerAndGetToken();

      await request(app).post(`${AUTH}/verify-email/${token}`).expect(200);

      const user = await prisma.user.findUniqueOrThrow({
        where: { email: "verify@example.com" },
      });
      expect(user.isEmailVerified).toBe(true);
      expect(user.emailVerificationTokenHash).toBeNull();
      await request(app).post(`${AUTH}/verify-email/${token}`).expect(400);
    });

    it("rejects an expired token", async () => {
      const token = await registerAndGetToken();
      await prisma.user.update({
        where: { email: "verify@example.com" },
        data: { emailVerificationExpiry: new Date(Date.now() - 1000) },
      });

      await request(app).post(`${AUTH}/verify-email/${token}`).expect(400);
    });
  });

  describe("POST /resend-email-verification", () => {
    it("queues a new verification email for an unverified user", async () => {
      const user = await createUser({ verified: false });
      const agent = await loginAs(user);

      await agent.post(`${AUTH}/resend-email-verification`).expect(200);

      expect(vi.mocked(addEmailJob).mock.lastCall?.[0].to).toBe(user.email);
      const token = getTokenFromLastEmail("verify-email");
      await request(app).post(`${AUTH}/verify-email/${token}`).expect(200);
    });

    it("returns 400 when the email is already verified", async () => {
      const agent = await loginAs(await createUser());

      await agent.post(`${AUTH}/resend-email-verification`).expect(400);
      expect(addEmailJob).not.toHaveBeenCalled();
    });
  });

  describe("POST /forgot-password", () => {
    it("gives the same response for known and unknown emails", async () => {
      const user = await createUser();

      const known = await request(app)
        .post(`${AUTH}/forgot-password`)
        .send({ email: user.email });
      expect(addEmailJob).toHaveBeenCalledOnce();
      expect(vi.mocked(addEmailJob).mock.calls[0][0].to).toBe(user.email);

      const unknown = await request(app)
        .post(`${AUTH}/forgot-password`)
        .send({ email: "nobody@example.com" });
      expect(addEmailJob).toHaveBeenCalledOnce();

      expect(known.status).toBe(200);
      expect(unknown.status).toBe(200);
      expect(unknown.body).toEqual(known.body);
    });
  });

  describe("POST /reset-password/:token", () => {
    it("sets the new password and logs out other sessions", async () => {
      const user = await createUser();
      const login = await request(app)
        .post(`${AUTH}/login`)
        .send({ email: user.email, password: TEST_PASSWORD });
      await request(app)
        .post(`${AUTH}/forgot-password`)
        .send({ email: user.email });
      const token = getTokenFromLastEmail("reset-password");

      await request(app)
        .post(`${AUTH}/reset-password/${token}`)
        .send({ password: "new-password-123" })
        .expect(200);

      await request(app)
        .post(`${AUTH}/login`)
        .send({ email: user.email, password: TEST_PASSWORD })
        .expect(401);
      await loginAs(user, "new-password-123");
      await request(app)
        .post(`${AUTH}/refresh-token`)
        .send({ refreshToken: login.body.data.refreshToken })
        .expect(401);
      await request(app)
        .post(`${AUTH}/reset-password/${token}`)
        .send({ password: "another-password" })
        .expect(400);
    });

    it("rejects an expired token", async () => {
      const user = await createUser();
      await request(app)
        .post(`${AUTH}/forgot-password`)
        .send({ email: user.email });
      const token = getTokenFromLastEmail("reset-password");
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetExpiry: new Date(Date.now() - 1000) },
      });

      await request(app)
        .post(`${AUTH}/reset-password/${token}`)
        .send({ password: "new-password-123" })
        .expect(400);
    });
  });

  describe("POST /change-password", () => {
    it("requires the correct old password", async () => {
      const user = await createUser();
      const agent = await loginAs(user);

      await agent
        .post(`${AUTH}/change-password`)
        .send({
          oldPassword: "wrong-password",
          newPassword: "new-password-123",
        })
        .expect(400);
      await agent
        .post(`${AUTH}/change-password`)
        .send({ oldPassword: TEST_PASSWORD, newPassword: "new-password-123" })
        .expect(200);

      await loginAs(user, "new-password-123");
    });

    it("returns 401 when not logged in", async () => {
      await request(app)
        .post(`${AUTH}/change-password`)
        .send({ oldPassword: TEST_PASSWORD, newPassword: "new-password-123" })
        .expect(401);
    });
  });
});

describe("auth cookie domain", () => {
  afterEach(() => {
    env.COOKIE_DOMAIN = undefined;
  });

  it("sets and clears the cookies on COOKIE_DOMAIN when it is configured", async () => {
    env.COOKIE_DOMAIN = ".plane.example.test";
    const user = await createUser();

    const login = await request(app)
      .post(`${AUTH}/login`)
      .send({ email: user.email, password: TEST_PASSWORD });
    const logout = await request(app)
      .post(`${AUTH}/logout`)
      .set("Authorization", `Bearer ${login.body.data.accessToken}`);

    for (const res of [login, logout]) {
      const cookies = res.headers["set-cookie"] as unknown as string[];
      expect(cookies).toHaveLength(2);
      expect(
        cookies.every((cookie) =>
          cookie.includes("Domain=.plane.example.test"),
        ),
      ).toBe(true);
    }
  });

  it("uses host-only cookies when COOKIE_DOMAIN is not set", async () => {
    const user = await createUser();

    const login = await request(app)
      .post(`${AUTH}/login`)
      .send({ email: user.email, password: TEST_PASSWORD });

    const cookies = login.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((cookie) => cookie.includes("Domain="))).toBe(false);
  });
});
