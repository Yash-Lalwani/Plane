import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/config/db.js";
import { ProjectRole, TaskStatus } from "../src/generated/prisma/client.js";
import { createUser, loginAs } from "./helpers/auth.js";
import { resetDatabase } from "./helpers/db.js";
import { getTokenFromLastEmail } from "./helpers/email.js";
import { addMember, createProjectWithRole } from "./helpers/project.js";

const PROJECTS = "/api/v1/projects";

// Actions in the order they were recorded.
const recordedActions = async (projectId: string) => {
  const logs = await prisma.activityLog.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });
  return logs.map((log) => log.action);
};

const lastActivity = (projectId: string) =>
  prisma.activityLog.findFirstOrThrow({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });

describe("activity log", () => {
  beforeEach(resetDatabase);

  it("records project, invitation and member actions", async () => {
    const admin = await createUser();
    const adminAgent = await loginAs(admin);
    const invitee = await createUser();
    const other = await createUser();

    const project = (await adminAgent.post(PROJECTS).send({ name: "Tracked" }))
      .body.data;
    await adminAgent
      .patch(`${PROJECTS}/${project.id}`)
      .send({ name: "Tracked v2" });

    const invitations = `${PROJECTS}/${project.id}/invitations`;
    await adminAgent
      .post(invitations)
      .send({ email: other.email, role: ProjectRole.MEMBER });
    const toRevoke = await prisma.projectInvitation.findFirstOrThrow({
      where: { email: other.email },
    });
    await adminAgent.delete(`${invitations}/${toRevoke.id}`);

    await adminAgent
      .post(invitations)
      .send({ email: invitee.email, role: ProjectRole.MEMBER });
    const token = getTokenFromLastEmail("invitations");
    await (
      await loginAs(invitee)
    )
      .post(`/api/v1/invitations/${token}/accept`)
      .expect(200);

    const members = `${PROJECTS}/${project.id}/members/${invitee.id}`;
    await adminAgent.patch(members).send({ role: ProjectRole.PROJECT_ADMIN });
    await adminAgent.delete(members);

    expect(await recordedActions(project.id)).toEqual([
      "project.created",
      "project.updated",
      "invitation.sent",
      "invitation.revoked",
      "invitation.sent",
      "member.joined",
      "member.role_changed",
      "member.removed",
    ]);

    const roleChange = await prisma.activityLog.findFirstOrThrow({
      where: { action: "member.role_changed" },
    });
    expect(roleChange).toMatchObject({
      actorId: admin.id,
      entityType: "member",
      entityId: invitee.id,
      metadata: {
        username: invitee.username,
        from: ProjectRole.MEMBER,
        to: ProjectRole.PROJECT_ADMIN,
      },
    });
    const joined = await prisma.activityLog.findFirstOrThrow({
      where: { action: "member.joined" },
    });
    expect(joined.actorId).toBe(invitee.id);
  });

  it("records task.status_changed instead of task.updated when the status changes", async () => {
    const { project, agent } = await createProjectWithRole(
      ProjectRole.PROJECT_ADMIN,
    );
    const tasks = `${PROJECTS}/${project.id}/tasks`;

    const task = (await agent.post(tasks).send({ title: "Ship it" })).body.data;
    await agent.patch(`${tasks}/${task.id}`).send({ title: "Ship it now" });
    expect((await lastActivity(project.id)).action).toBe("task.updated");

    await agent
      .patch(`${tasks}/${task.id}`)
      .send({ status: TaskStatus.DONE, title: "Shipped" });
    const statusChange = await lastActivity(project.id);
    expect(statusChange).toMatchObject({
      action: "task.status_changed",
      entityType: "task",
      entityId: task.id,
      metadata: {
        title: "Shipped",
        from: TaskStatus.TODO,
        to: TaskStatus.DONE,
      },
    });

    await agent.delete(`${tasks}/${task.id}`);
    expect(await recordedActions(project.id)).toEqual([
      "task.created",
      "task.updated",
      "task.status_changed",
      "task.deleted",
    ]);
  });

  it("records note actions", async () => {
    const { project, agent } = await createProjectWithRole(ProjectRole.ADMIN);
    const notes = `${PROJECTS}/${project.id}/notes`;

    const note = (await agent.post(notes).send({ content: "Agenda" })).body
      .data;
    await agent.patch(`${notes}/${note.id}`).send({ content: "Agenda v2" });
    await agent.delete(`${notes}/${note.id}`);

    expect(await recordedActions(project.id)).toEqual([
      "note.created",
      "note.updated",
      "note.deleted",
    ]);
  });

  it("does not fail the request when recording activity fails", async () => {
    const { project, agent } = await createProjectWithRole(ProjectRole.ADMIN);
    vi.spyOn(prisma.activityLog, "create").mockRejectedValueOnce(
      new Error("DB hiccup"),
    );

    await agent
      .post(`${PROJECTS}/${project.id}/notes`)
      .send({ content: "Still saved" })
      .expect(201);

    expect(await prisma.note.count()).toBe(1);
  });

  describe("GET /activity", () => {
    it("returns the feed newest first with pagination to a Member", async () => {
      const { project, admin, agent } = await createProjectWithRole(
        ProjectRole.MEMBER,
      );
      for (const [index, action] of [
        "note.created",
        "note.updated",
        "note.deleted",
      ].entries()) {
        await prisma.activityLog.create({
          data: {
            projectId: project.id,
            actorId: admin.id,
            action,
            entityType: "note",
            entityId: admin.id,
            createdAt: new Date(Date.now() + index * 1000),
          },
        });
      }

      const res = await agent
        .get(`${PROJECTS}/${project.id}/activity`)
        .query({ limit: 2 });

      expect(res.status).toBe(200);
      expect(
        res.body.data.items.map((item: { action: string }) => item.action),
      ).toEqual(["note.deleted", "note.updated"]);
      expect(res.body.data.items[0].actor.id).toBe(admin.id);
      expect(res.body.data.items[0].actor).not.toHaveProperty("passwordHash");
      expect(res.body.data.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
    });

    it("returns 404 to a non-member", async () => {
      const { project } = await createProjectWithRole(ProjectRole.ADMIN);
      const outsider = await loginAs(await createUser());

      await outsider.get(`${PROJECTS}/${project.id}/activity`).expect(404);
    });

    it("is visible to a Project Admin", async () => {
      const { project, agent } = await createProjectWithRole(ProjectRole.ADMIN);
      const { agent: projectAdminAgent } = await addMember(
        project.id,
        ProjectRole.PROJECT_ADMIN,
      );
      await agent.patch(`${PROJECTS}/${project.id}`).send({ name: "Renamed" });

      const res = await projectAdminAgent.get(
        `${PROJECTS}/${project.id}/activity`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.items[0].action).toBe("project.updated");
    });
  });
});
