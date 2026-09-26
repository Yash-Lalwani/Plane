import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { deleteFile, uploadFile } from "../src/utils/file-storage.js";
import { createUser, loginAs } from "./helpers/auth.js";
import { resetDatabase } from "./helpers/db.js";

const USERS = "/api/v1/users";
const png = { filename: "avatar.png", contentType: "image/png" };

describe("users", () => {
  beforeEach(resetDatabase);

  describe("PATCH /me", () => {
    it("updates the full name and username", async () => {
      const agent = await loginAs(await createUser());

      const res = await agent
        .patch(`${USERS}/me`)
        .send({ fullName: " Jane Doe ", username: " Jane_Doe " });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        fullName: "Jane Doe",
        username: "jane_doe",
      });
      expect(res.body.data).not.toHaveProperty("passwordHash");
    });

    it("works for a user whose email is not verified yet", async () => {
      const agent = await loginAs(await createUser({ verified: false }));

      await agent
        .patch(`${USERS}/me`)
        .send({ fullName: "Unverified" })
        .expect(200);
    });

    it("returns 409 when the username is taken", async () => {
      const other = await createUser();
      const agent = await loginAs(await createUser());

      await agent
        .patch(`${USERS}/me`)
        .send({ username: other.username })
        .expect(409);
    });

    it("returns 422 when no field is given", async () => {
      const agent = await loginAs(await createUser());

      await agent.patch(`${USERS}/me`).send({}).expect(422);
    });

    it("returns 401 when not logged in", async () => {
      await request(app)
        .patch(`${USERS}/me`)
        .send({ fullName: "Nobody" })
        .expect(401);
    });
  });

  describe("PATCH /me/avatar", () => {
    it("uploads the avatar and deletes the previous one", async () => {
      const user = await createUser();
      const agent = await loginAs(user);
      vi.mocked(uploadFile)
        .mockResolvedValueOnce({
          url: "https://cdn.test/first.png",
          publicId: "plane/avatars/first",
        })
        .mockResolvedValueOnce({
          url: "https://cdn.test/second.png",
          publicId: "plane/avatars/second",
        });

      const first = await agent
        .patch(`${USERS}/me/avatar`)
        .attach("avatar", Buffer.from("first image"), png);

      expect(first.status).toBe(200);
      expect(first.body.data.avatarUrl).toBe("https://cdn.test/first.png");
      expect(uploadFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        "plane/avatars",
      );
      expect(deleteFile).not.toHaveBeenCalled();

      const second = await agent
        .patch(`${USERS}/me/avatar`)
        .attach("avatar", Buffer.from("second image"), png);

      expect(second.body.data.avatarUrl).toBe("https://cdn.test/second.png");
      expect(deleteFile).toHaveBeenCalledWith("plane/avatars/first");
      const saved = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(saved.avatarPublicId).toBe("plane/avatars/second");
    });

    it("rejects a file that is not an image", async () => {
      const agent = await loginAs(await createUser());

      await agent
        .patch(`${USERS}/me/avatar`)
        .attach("avatar", Buffer.from("%PDF"), {
          filename: "doc.pdf",
          contentType: "application/pdf",
        })
        .expect(400);
      expect(uploadFile).not.toHaveBeenCalled();
    });

    it("returns 413 for an image over 2 MB", async () => {
      const agent = await loginAs(await createUser());

      await agent
        .patch(`${USERS}/me/avatar`)
        .attach("avatar", Buffer.alloc(2 * 1024 * 1024 + 1), png)
        .expect(413);
      expect(uploadFile).not.toHaveBeenCalled();
    });

    it("returns 400 when no file is sent", async () => {
      const agent = await loginAs(await createUser());

      await agent.patch(`${USERS}/me/avatar`).expect(400);
    });
  });
});
