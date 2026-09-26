import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { ProjectRole } from "../src/generated/prisma/client.js";
import { createUser, loginAs } from "./helpers/auth.js";
import { resetDatabase } from "./helpers/db.js";
import { addMember, createProjectWithRole } from "./helpers/project.js";

const membersUrl = (projectId: string) =>
  `/api/v1/projects/${projectId}/members`;

describe("members", () => {
  beforeEach(resetDatabase);

  describe("GET /members", () => {
    it("lists members with their role and public profile", async () => {
      const { project, admin, user, agent } = await createProjectWithRole(
        ProjectRole.MEMBER,
      );

      const res = await agent.get(membersUrl(project.id));

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([
        expect.objectContaining({
          role: ProjectRole.ADMIN,
          user: expect.objectContaining({ id: admin.id }),
        }),
        expect.objectContaining({
          role: ProjectRole.MEMBER,
          user: expect.objectContaining({ id: user.id }),
        }),
      ]);
      expect(res.body.data[0].user).not.toHaveProperty("passwordHash");
    });

    it("returns 404 to a non-member", async () => {
      const { project } = await createProjectWithRole(ProjectRole.ADMIN);
      const outsider = await loginAs(await createUser());

      await outsider.get(membersUrl(project.id)).expect(404);
    });
  });

  describe("PATCH /members/:userId", () => {
    it("lets an Admin change a member's role", async () => {
      const { project, agent } = await createProjectWithRole(ProjectRole.ADMIN);
      const { user: member } = await addMember(project.id, ProjectRole.MEMBER);

      const res = await agent
        .patch(`${membersUrl(project.id)}/${member.id}`)
        .send({ role: ProjectRole.PROJECT_ADMIN });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe(ProjectRole.PROJECT_ADMIN);
    });

    it("returns 403 to a Project Admin", async () => {
      const { project, agent } = await createProjectWithRole(
        ProjectRole.PROJECT_ADMIN,
      );
      const { user: member } = await addMember(project.id, ProjectRole.MEMBER);

      await agent
        .patch(`${membersUrl(project.id)}/${member.id}`)
        .send({ role: ProjectRole.ADMIN })
        .expect(403);
    });

    it("returns 404 for a user who is not a member", async () => {
      const { project, agent } = await createProjectWithRole(ProjectRole.ADMIN);
      const outsider = await createUser();

      await agent
        .patch(`${membersUrl(project.id)}/${outsider.id}`)
        .send({ role: ProjectRole.MEMBER })
        .expect(404);
    });

    it("returns 422 for an unknown role", async () => {
      const { project, user, agent } = await createProjectWithRole(
        ProjectRole.ADMIN,
      );

      await agent
        .patch(`${membersUrl(project.id)}/${user.id}`)
        .send({ role: "OWNER" })
        .expect(422);
    });

    it("does not let the last Admin be demoted", async () => {
      const { project, user, agent } = await createProjectWithRole(
        ProjectRole.ADMIN,
      );

      const res = await agent
        .patch(`${membersUrl(project.id)}/${user.id}`)
        .send({ role: ProjectRole.MEMBER });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("A project must have at least one Admin");
    });

    it("lets an Admin step down when another Admin exists", async () => {
      const { project, user, agent } = await createProjectWithRole(
        ProjectRole.ADMIN,
      );
      await addMember(project.id, ProjectRole.ADMIN);

      await agent
        .patch(`${membersUrl(project.id)}/${user.id}`)
        .send({ role: ProjectRole.MEMBER })
        .expect(200);
    });
  });

  describe("DELETE /members/:userId", () => {
    it("removes the member and unassigns their tasks in this project", async () => {
      const { project, admin, agent } = await createProjectWithRole(
        ProjectRole.ADMIN,
      );
      const { user: member, agent: memberAgent } = await addMember(
        project.id,
        ProjectRole.MEMBER,
      );
      const task = await prisma.task.create({
        data: {
          projectId: project.id,
          title: "Assigned",
          createdById: admin.id,
          assignedToId: member.id,
        },
      });

      await agent.delete(`${membersUrl(project.id)}/${member.id}`).expect(200);

      const updatedTask = await prisma.task.findUniqueOrThrow({
        where: { id: task.id },
      });
      expect(updatedTask.assignedToId).toBeNull();
      await memberAgent.get(`/api/v1/projects/${project.id}`).expect(404);
    });

    it("returns 403 to a Project Admin", async () => {
      const { project, agent } = await createProjectWithRole(
        ProjectRole.PROJECT_ADMIN,
      );
      const { user: member } = await addMember(project.id, ProjectRole.MEMBER);

      await agent.delete(`${membersUrl(project.id)}/${member.id}`).expect(403);
    });

    it("does not let the last Admin be removed", async () => {
      const { project, user, agent } = await createProjectWithRole(
        ProjectRole.ADMIN,
      );

      await agent.delete(`${membersUrl(project.id)}/${user.id}`).expect(400);
      expect(
        await prisma.projectMember.count({ where: { projectId: project.id } }),
      ).toBe(1);
    });
  });
});
