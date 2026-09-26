import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { ProjectRole } from "../src/generated/prisma/client.js";
import { deleteFile } from "../src/utils/file-storage.js";
import { createUser, loginAs } from "./helpers/auth.js";
import { resetDatabase } from "./helpers/db.js";
import { createProjectWithRole } from "./helpers/project.js";

const PROJECTS = "/api/v1/projects";

describe("projects", () => {
  beforeEach(resetDatabase);

  describe("email verification gate", () => {
    it("returns 403 on project routes for an unverified user", async () => {
      const agent = await loginAs(await createUser({ verified: false }));

      const list = await agent.get(PROJECTS);
      const create = await agent.post(PROJECTS).send({ name: "Blocked" });

      expect(list.status).toBe(403);
      expect(list.body.message).toBe("Please verify your email first");
      expect(create.status).toBe(403);
    });

    it("returns 401 when not logged in", async () => {
      await request(app).get(PROJECTS).expect(401);
    });
  });

  describe("POST /projects", () => {
    it("creates the project with the creator as Admin", async () => {
      const user = await createUser();
      const agent = await loginAs(user);

      const res = await agent
        .post(PROJECTS)
        .send({ name: " Launch ", description: "Q3 launch" });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        name: "Launch",
        description: "Q3 launch",
        role: ProjectRole.ADMIN,
        memberCount: 1,
      });
      expect(res.body.data.createdBy.id).toBe(user.id);
      expect(res.body.data.createdBy).not.toHaveProperty("passwordHash");
      const membership = await prisma.projectMember.findFirstOrThrow({
        where: { projectId: res.body.data.id },
      });
      expect(membership).toMatchObject({
        userId: user.id,
        role: ProjectRole.ADMIN,
      });
    });

    it("returns 422 without a name", async () => {
      const agent = await loginAs(await createUser());

      await agent.post(PROJECTS).send({ description: "No name" }).expect(422);
    });
  });

  describe("GET /projects", () => {
    it("lists only the user's projects with their role and member count", async () => {
      const { project, agent } = await createProjectWithRole(
        ProjectRole.MEMBER,
      );
      await createProjectWithRole(ProjectRole.ADMIN);

      const res = await agent.get(PROJECTS);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({
        id: project.id,
        role: ProjectRole.MEMBER,
        memberCount: 2,
      });
      expect(res.body.data[0]).not.toHaveProperty("_count");
    });
  });

  describe("GET /projects/:projectId", () => {
    it("returns the project to a member", async () => {
      const { project, agent } = await createProjectWithRole(
        ProjectRole.MEMBER,
      );

      const res = await agent.get(`${PROJECTS}/${project.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        id: project.id,
        role: ProjectRole.MEMBER,
      });
    });

    it("returns 404 to a non-member", async () => {
      const { project } = await createProjectWithRole(ProjectRole.ADMIN);
      const outsider = await loginAs(await createUser());

      const res = await outsider.get(`${PROJECTS}/${project.id}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Project not found");
    });

    it("returns 422 for an id that is not a UUID", async () => {
      const agent = await loginAs(await createUser());

      await agent.get(`${PROJECTS}/not-a-uuid`).expect(422);
    });
  });

  describe("PATCH /projects/:projectId", () => {
    it("lets an Admin update the project", async () => {
      const { project, agent } = await createProjectWithRole(ProjectRole.ADMIN);

      const res = await agent
        .patch(`${PROJECTS}/${project.id}`)
        .send({ name: "Renamed", description: null });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        name: "Renamed",
        description: null,
      });
    });

    it("returns 403 to a Project Admin and a Member", async () => {
      const { project, agent } = await createProjectWithRole(
        ProjectRole.PROJECT_ADMIN,
      );
      const member = await createProjectWithRole(ProjectRole.MEMBER);

      await agent
        .patch(`${PROJECTS}/${project.id}`)
        .send({ name: "Nope" })
        .expect(403);
      await member.agent
        .patch(`${PROJECTS}/${member.project.id}`)
        .send({ name: "Nope" })
        .expect(403);
    });
  });

  describe("DELETE /projects/:projectId", () => {
    it("lets an Admin delete the project and its attachment files", async () => {
      const { project, user, agent } = await createProjectWithRole(
        ProjectRole.ADMIN,
      );
      await prisma.task.create({
        data: {
          projectId: project.id,
          title: "Task with files",
          createdById: user.id,
          attachments: {
            create: [
              {
                url: "https://cdn.test/a.pdf",
                publicId: "plane/attachments/a",
                fileName: "a.pdf",
                mimeType: "application/pdf",
                size: 10,
                uploadedById: user.id,
              },
              {
                url: "https://cdn.test/b.txt",
                publicId: "plane/attachments/b.txt",
                fileName: "b.txt",
                mimeType: "text/plain",
                size: 10,
                uploadedById: user.id,
              },
            ],
          },
        },
      });

      await agent.delete(`${PROJECTS}/${project.id}`).expect(200);

      expect(await prisma.project.count({ where: { id: project.id } })).toBe(0);
      expect(await prisma.attachment.count()).toBe(0);
      expect(deleteFile).toHaveBeenCalledWith(
        "plane/attachments/a",
        "application/pdf",
      );
      expect(deleteFile).toHaveBeenCalledWith(
        "plane/attachments/b.txt",
        "text/plain",
      );
    });

    it("returns 403 to a Project Admin", async () => {
      const { project, agent } = await createProjectWithRole(
        ProjectRole.PROJECT_ADMIN,
      );

      await agent.delete(`${PROJECTS}/${project.id}`).expect(403);
      expect(await prisma.project.count({ where: { id: project.id } })).toBe(1);
    });
  });
});
