import bcrypt from "bcrypt";
import crypto from "node:crypto";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/config/db.js";

export const TEST_PASSWORD = "password123";

export const createUser = async ({
  verified = true,
}: { verified?: boolean } = {}) => {
  const name = `user_${crypto.randomUUID().slice(0, 8)}`;
  return prisma.user.create({
    data: {
      email: `${name}@example.com`,
      username: name,
      // Low cost factor keeps tests fast; the app itself uses 10 rounds.
      passwordHash: await bcrypt.hash(TEST_PASSWORD, 4),
      isEmailVerified: verified,
    },
  });
};

// Returns a Supertest agent that keeps the login cookies for later requests.
export const loginAs = async (
  user: { email: string },
  password = TEST_PASSWORD,
) => {
  const agent = request.agent(app);
  await agent
    .post("/api/v1/auth/login")
    .send({ email: user.email, password })
    .expect(200);
  return agent;
};
