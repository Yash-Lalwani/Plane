import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/config/db.js";

describe("GET /api/v1/healthcheck", () => {
  it("returns 200 when the database and Redis are up", async () => {
    const res = await request(app).get("/api/v1/healthcheck");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      statusCode: 200,
      data: { api: "up", database: "up", redis: "up" },
      message: "Service is healthy",
      success: true,
    });
  });

  it("returns 503 when the database is down", async () => {
    vi.spyOn(prisma, "$queryRaw").mockRejectedValueOnce(
      new Error("connection refused"),
    );

    const res = await request(app).get("/api/v1/healthcheck");

    expect(res.status).toBe(503);
    expect(res.body.data).toEqual({ api: "up", database: "down", redis: "up" });
    expect(res.body.success).toBe(false);
  });
});

describe("error handling", () => {
  it("returns 404 JSON for unknown routes", async () => {
    const res = await request(app).get("/api/v1/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      statusCode: 404,
      success: false,
      errors: [],
    });
  });

  it("returns 400 JSON for a malformed JSON body", async () => {
    const res = await request(app)
      .post("/api/v1/healthcheck")
      .set("Content-Type", "application/json")
      .send("{bad json");

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ statusCode: 400, success: false });
  });
});
