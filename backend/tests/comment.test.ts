import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { ProjectRole } from "../src/generated/prisma/client.js";
import { createUser, loginAs } from "./helpers/auth.js";
import { resetDatabase } from "./helpers/db.js";
import { addMember, createProjectWithRole } from "./helpers/project.js";

const commentsUrl = (projectId: string, taskId: string) =>
  `/api/v1/projects/${projectId}/tasks/${taskId}/comments`;

// A project with one task, a logged-in Member, and the Admin's agent.
const setup = async () => {
  const {
    project,
    admin,
    user: member,
    agent,
  } = await createProjectWithRole(ProjectRole.MEMBER);
  const task = await prisma.task.create({
    data: { projectId: project.id, title: "Task", createdById: admin.id },
  });
  const adminAgent = await loginAs(admin);
  return {
    project,
    admin,
    member,
    agent,
    adminAgent,
    task,
    url: commentsUrl(project.id, task.id),
  };
};

describe("comments", () => {
  beforeEach(resetDatabase);

  describe("POST /comments", () => {
    it("lets any member comment", async () => {
      const { member, agent, url } = await setup();

      const res = await agent.post(url).send({ content: " Looks good " });

      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe("Looks good");
      expect(res.body.data.author.id).toBe(member.id);
      expect(res.body.data.author).not.toHaveProperty("passwordHash");
    });

    it("returns 404 for a task in another project", async () => {
      const { project, agent } = await setup();
      const other = await setup();

      await agent
        .post(commentsUrl(project.id, other.task.id))
        .send({ content: "Hi" })
        .expect(404);
    });

    it("returns 404 to a non-member", async () => {
      const { url } = await setup();
      const outsider = await loginAs(await createUser());

      await outsider.post(url).send({ content: "Hi" }).expect(404);
    });
  });

  describe("GET /comments", () => {
    it("lists comments oldest first with pagination", async () => {
      const { admin, task, agent, url } = await setup();
      // Explicit, 1-second-apart timestamps: rows created in a quick loop can share a
      // millisecond, which would make the order depend on the random id tiebreaker.
      const start = Date.now();
      for (const [index, content] of ["First", "Second", "Third"].entries()) {
        await prisma.comment.create({
          data: {
            taskId: task.id,
            authorId: admin.id,
            content,
            createdAt: new Date(start + index * 1000),
          },
        });
      }

      const pageOne = await agent.get(url).query({ limit: 2 });
      const pageTwo = await agent.get(url).query({ limit: 2, page: 2 });

      expect(pageOne.status).toBe(200);
      expect(
        pageOne.body.data.items.map((c: { content: string }) => c.content),
      ).toEqual(["First", "Second"]);
      expect(
        pageTwo.body.data.items.map((c: { content: string }) => c.content),
      ).toEqual(["Third"]);
      expect(pageTwo.body.data.pagination).toEqual({
        page: 2,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
    });
  });

  describe("PATCH /comments/:commentId", () => {
    it("lets the author edit their comment", async () => {
      const { member, task, agent, url } = await setup();
      const comment = await prisma.comment.create({
        data: { taskId: task.id, authorId: member.id, content: "Typo" },
      });

      const res = await agent
        .patch(`${url}/${comment.id}`)
        .send({ content: "Fixed" });

      expect(res.status).toBe(200);
      expect(res.body.data.content).toBe("Fixed");
    });

    it("returns 403 to anyone else, even an Admin", async () => {
      const { member, task, adminAgent, url } = await setup();
      const comment = await prisma.comment.create({
        data: { taskId: task.id, authorId: member.id, content: "Mine" },
      });

      await adminAgent
        .patch(`${url}/${comment.id}`)
        .send({ content: "Edited" })
        .expect(403);
    });
  });

  describe("DELETE /comments/:commentId", () => {
    it("lets an Admin delete anyone's comment", async () => {
      const { member, task, adminAgent, url } = await setup();
      const comment = await prisma.comment.create({
        data: { taskId: task.id, authorId: member.id, content: "Remove me" },
      });

      await adminAgent.delete(`${url}/${comment.id}`).expect(200);

      expect(await prisma.comment.count()).toBe(0);
    });

    it("lets the author delete their own comment", async () => {
      const { member, task, agent, url } = await setup();
      const comment = await prisma.comment.create({
        data: { taskId: task.id, authorId: member.id, content: "Oops" },
      });

      await agent.delete(`${url}/${comment.id}`).expect(200);
    });

    it("returns 403 to a Member or Project Admin deleting someone else's comment", async () => {
      const { project, admin, task, agent, url } = await setup();
      const { agent: projectAdminAgent } = await addMember(
        project.id,
        ProjectRole.PROJECT_ADMIN,
      );
      const comment = await prisma.comment.create({
        data: { taskId: task.id, authorId: admin.id, content: "Admin's" },
      });

      await agent.delete(`${url}/${comment.id}`).expect(403);
      await projectAdminAgent.delete(`${url}/${comment.id}`).expect(403);
      expect(await prisma.comment.count()).toBe(1);
    });

    it("returns 404 for a comment on a different task", async () => {
      const { project, admin, adminAgent, url } = await setup();
      const otherTask = await prisma.task.create({
        data: { projectId: project.id, title: "Other", createdById: admin.id },
      });
      const comment = await prisma.comment.create({
        data: {
          taskId: otherTask.id,
          authorId: admin.id,
          content: "Elsewhere",
        },
      });

      await adminAgent.delete(`${url}/${comment.id}`).expect(404);
    });
  });
});
