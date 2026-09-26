import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";

describe("API docs", () => {
  it("serves Swagger UI at /api-docs", async () => {
    const res = await request(app).get("/api-docs/");

    expect(res.status).toBe(200);
    expect(res.text).toContain("Swagger UI");
  });

  it("serves the OpenAPI spec to Swagger UI", async () => {
    const res = await request(app).get("/api-docs/swagger-ui-init.js");

    expect(res.status).toBe(200);
    expect(res.text).toContain('"title": "Plane API"');
  });
});
