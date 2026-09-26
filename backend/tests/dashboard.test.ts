import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/config/db.js";
import { redis } from "../src/config/redis.js";
import {
  ProjectRole,
  TaskPriority,
  TaskStatus,
} from "../src/generated/prisma/client.js";
import { createUser, loginAs } from "./helpers/auth.js";
import { resetDatabase } from "./helpers/db.js";
import { getTokenFromLastEmail } from "./helpers/email.js";
import { addMember, createProjectWithRole } from "./helpers/project.js";

const DAY = 24 * 60 * 60 * 1000;
const dashboardUrl = (projectId: string) =>
  `/api/v1/projects/${projectId}/dashboard`;
const tasksUrl = (projectId: string) => `/api/v1/projects/${projectId}/tasks`;

// A project with an Admin and a Member, plus a fixed set of tasks.
const seedProject = async () => {
  const { project, admin, agent } = await createProjectWithRole(
    ProjectRole.ADMIN,
  );
  const { user: member } = await addMember(project.id, ProjectRole.MEMBER);
  const base = { projectId: project.id, createdById: admin.id };
  const now = Date.now();
  await prisma.task.createMany({
    data: [
      {
        ...base,
        title: "A",
        priority: TaskPriority.HIGH,
        assignedToId: member.id,
        dueDate: new Date(now - DAY),
      },
      {
        ...base,
        title: "B",
        status: TaskStatus.IN_PROGRESS,
        assignedToId: member.id,
      },
      {
        ...base,
        title: "C",
        status: TaskStatus.DONE,
        assignedToId: member.id,
        dueDate: new Date(now - DAY),
      },
      {
        ...base,
        title: "D",
        priority: TaskPriority.LOW,
        assignedToId: admin.id,
      },
      { ...base, title: "E" },
    ],
  });
  await redis.del(`project:${project.id}:dashboard`);
  return { project, admin, member, agent };
};

describe("dashboard", () => {
  beforeEach(resetDatabase);

  it("returns the correct counts", async () => {
    const { project, admin, member, agent } = await seedProject();

    const res = await agent.get(dashboardUrl(project.id));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      totalTasks: 5,
      tasksByStatus: { TODO: 3, IN_PROGRESS: 1, DONE: 1 },
      tasksByPriority: { LOW: 1, MEDIUM: 3, HIGH: 1 },
      overdueTasks: 1,
      memberCount: 2,
    });
    expect(res.body.data.openTasksByAssignee).toEqual([
      { user: expect.objectContaining({ id: member.id }), openTasks: 2 },
      { user: expect.objectContaining({ id: admin.id }), openTasks: 1 },
    ]);
    expect(res.body.data.openTasksByAssignee[0].user).not.toHaveProperty(
      "passwordHash",
    );
  });

  it("returns zero counts for an empty project", async () => {
    const { project, agent } = await createProjectWithRole(ProjectRole.MEMBER);

    const res = await agent.get(dashboardUrl(project.id));

    expect(res.body.data).toEqual({
      totalTasks: 0,
      tasksByStatus: { TODO: 0, IN_PROGRESS: 0, DONE: 0 },
      tasksByPriority: { LOW: 0, MEDIUM: 0, HIGH: 0 },
      overdueTasks: 0,
      openTasksByAssignee: [],
      memberCount: 2,
    });
  });

  it("serves the second request from the cache", async () => {
    const { project, admin, agent } = await seedProject();
    await agent.get(dashboardUrl(project.id)).expect(200);
    expect(await redis.ttl(`project:${project.id}:dashboard`)).toBeGreaterThan(
      0,
    );

    // Written straight to the database, so nothing invalidates the cache.
    await prisma.task.create({
      data: { projectId: project.id, title: "F", createdById: admin.id },
    });
    const res = await agent.get(dashboardUrl(project.id));

    expect(res.body.data.totalTasks).toBe(5);
  });

  it("invalidates the cache when a task is updated", async () => {
    const { project, agent } = await seedProject();
    await agent.get(dashboardUrl(project.id)).expect(200);
    const task = await prisma.task.findFirstOrThrow({ where: { title: "E" } });

    await agent
      .patch(`${tasksUrl(project.id)}/${task.id}`)
      .send({ status: TaskStatus.DONE })
      .expect(200);
    const res = await agent.get(dashboardUrl(project.id));

    expect(res.body.data.tasksByStatus).toEqual({
      TODO: 2,
      IN_PROGRESS: 1,
      DONE: 2,
    });
  });

  it("invalidates the cache when a task is created or deleted", async () => {
    const { project, agent } = await seedProject();
    await agent.get(dashboardUrl(project.id));

    const created = await agent
      .post(tasksUrl(project.id))
      .send({ title: "F" })
      .expect(201);
    expect(
      (await agent.get(dashboardUrl(project.id))).body.data.totalTasks,
    ).toBe(6);

    await agent
      .delete(`${tasksUrl(project.id)}/${created.body.data.id}`)
      .expect(200);
    expect(
      (await agent.get(dashboardUrl(project.id))).body.data.totalTasks,
    ).toBe(5);
  });

  it("invalidates the cache when a member is removed or joins", async () => {
    const { project, member, agent } = await seedProject();
    await agent.get(dashboardUrl(project.id));

    await agent
      .delete(`/api/v1/projects/${project.id}/members/${member.id}`)
      .expect(200);
    const afterRemoval = (await agent.get(dashboardUrl(project.id))).body.data;
    expect(afterRemoval.memberCount).toBe(1);
    expect(afterRemoval.openTasksByAssignee).toHaveLength(1);

    const newcomer = await createUser();
    await agent
      .post(`/api/v1/projects/${project.id}/invitations`)
      .send({ email: newcomer.email, role: ProjectRole.MEMBER })
      .expect(201);
    const token = getTokenFromLastEmail("invitations");
    await (
      await loginAs(newcomer)
    )
      .post(`/api/v1/invitations/${token}/accept`)
      .expect(200);

    expect(
      (await agent.get(dashboardUrl(project.id))).body.data.memberCount,
    ).toBe(2);
  });

  it("invalidates the cache when a member's role changes", async () => {
    const { project, member, agent } = await seedProject();
    await agent.get(dashboardUrl(project.id));

    await agent
      .patch(`/api/v1/projects/${project.id}/members/${member.id}`)
      .send({ role: ProjectRole.PROJECT_ADMIN })
      .expect(200);

    expect(await redis.exists(`project:${project.id}:dashboard`)).toBe(0);
  });

  it("still works when Redis is unavailable", async () => {
    const { project, agent } = await seedProject();
    vi.spyOn(redis, "get").mockRejectedValueOnce(new Error("Redis down"));
    vi.spyOn(redis, "set").mockRejectedValueOnce(new Error("Redis down"));

    const res = await agent.get(dashboardUrl(project.id));

    expect(res.status).toBe(200);
    expect(res.body.data.totalTasks).toBe(5);
  });

  it("returns 404 to a non-member", async () => {
    const { project } = await seedProject();
    const outsider = await loginAs(await createUser());

    await outsider.get(dashboardUrl(project.id)).expect(404);
  });
});
