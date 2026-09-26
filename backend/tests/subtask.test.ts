import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { ProjectRole } from "../src/generated/prisma/client.js";
import { resetDatabase } from "./helpers/db.js";
import { createProjectWithRole } from "./helpers/project.js";

// A project with one task that has one subtask, and a logged-in user with the given role.
const setup = async (role: ProjectRole) => {
  const context = await createProjectWithRole(role);
  const task = await prisma.task.create({
    data: {
      projectId: context.project.id,
      title: "Task",
      createdById: context.admin.id,
      subtasks: { create: { title: "Step 1", createdById: context.admin.id } },
    },
    include: { subtasks: true },
  });
  const url = `/api/v1/projects/${context.project.id}/tasks/${task.id}/subtasks`;
  return { ...context, task, subtask: task.subtasks[0], url };
};

describe("subtasks", () => {
  beforeEach(resetDatabase);

  describe("POST /subtasks", () => {
    it("lets a Project Admin create a subtask", async () => {
      const { task, agent, url } = await setup(ProjectRole.PROJECT_ADMIN);

      const res = await agent.post(url).send({ title: "Step 2" });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        taskId: task.id,
        title: "Step 2",
        isCompleted: false,
      });
    });

    it("returns 403 to a Member", async () => {
      const { agent, url } = await setup(ProjectRole.MEMBER);

      await agent.post(url).send({ title: "Step 2" }).expect(403);
    });
  });

  describe("PATCH /subtasks/:subtaskId", () => {
    it("lets a Member toggle completion", async () => {
      const { subtask, agent, url } = await setup(ProjectRole.MEMBER);

      const res = await agent
        .patch(`${url}/${subtask.id}`)
        .send({ isCompleted: true });

      expect(res.status).toBe(200);
      expect(res.body.data.isCompleted).toBe(true);
    });

    it("returns 403 when a Member tries to rename", async () => {
      const { subtask, agent, url } = await setup(ProjectRole.MEMBER);

      const res = await agent
        .patch(`${url}/${subtask.id}`)
        .send({ title: "Renamed", isCompleted: true });

      expect(res.status).toBe(403);
      const unchanged = await prisma.subtask.findUniqueOrThrow({
        where: { id: subtask.id },
      });
      expect(unchanged).toMatchObject({ title: "Step 1", isCompleted: false });
    });

    it("lets a Project Admin rename", async () => {
      const { subtask, agent, url } = await setup(ProjectRole.PROJECT_ADMIN);

      const res = await agent
        .patch(`${url}/${subtask.id}`)
        .send({ title: "Renamed" });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe("Renamed");
    });

    it("returns 404 for a subtask of another task", async () => {
      const { project, admin, agent, url } = await setup(ProjectRole.ADMIN);
      const otherTask = await prisma.task.create({
        data: {
          projectId: project.id,
          title: "Other",
          createdById: admin.id,
          subtasks: { create: { title: "Other step", createdById: admin.id } },
        },
        include: { subtasks: true },
      });

      await agent
        .patch(`${url}/${otherTask.subtasks[0].id}`)
        .send({ isCompleted: true })
        .expect(404);
    });
  });

  describe("DELETE /subtasks/:subtaskId", () => {
    it("lets a Project Admin delete a subtask", async () => {
      const { subtask, agent, url } = await setup(ProjectRole.PROJECT_ADMIN);

      await agent.delete(`${url}/${subtask.id}`).expect(200);

      expect(await prisma.subtask.count()).toBe(0);
    });

    it("returns 403 to a Member", async () => {
      const { subtask, agent, url } = await setup(ProjectRole.MEMBER);

      await agent.delete(`${url}/${subtask.id}`).expect(403);
    });
  });
});
