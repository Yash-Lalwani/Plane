import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/config/db.js";
import {
  InvitationStatus,
  ProjectRole,
} from "../src/generated/prisma/client.js";
import { addEmailJob } from "../src/queues/email.queue.js";
import { hashToken } from "../src/utils/tokens.js";
import { createUser, loginAs } from "./helpers/auth.js";
import { resetDatabase } from "./helpers/db.js";
import { getTokenFromLastEmail } from "./helpers/email.js";
import { addMember, createProjectWithRole } from "./helpers/project.js";
import { testEnv } from "./helpers/test-env.js";

const invitationsUrl = (projectId: string) =>
  `/api/v1/projects/${projectId}/invitations`;
const INVITATIONS = "/api/v1/invitations";

// An Admin invites a new user with the given role; returns the raw token from the email.
const inviteNewUser = async (role: ProjectRole = ProjectRole.MEMBER) => {
  const { project, agent: adminAgent } = await createProjectWithRole(
    ProjectRole.ADMIN,
  );
  const invitee = await createUser();
  await adminAgent
    .post(invitationsUrl(project.id))
    .send({ email: invitee.email, role })
    .expect(201);
  return {
    project,
    adminAgent,
    invitee,
    token: getTokenFromLastEmail("invitations"),
  };
};

describe("invitations", () => {
  beforeEach(resetDatabase);

  describe("POST /projects/:projectId/invitations", () => {
    it("creates the invitation and emails a link with the raw token", async () => {
      const { project, agent } = await createProjectWithRole(ProjectRole.ADMIN);

      const res = await agent.post(invitationsUrl(project.id)).send({
        email: " Friend@Example.com ",
        role: ProjectRole.PROJECT_ADMIN,
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        email: "friend@example.com",
        role: ProjectRole.PROJECT_ADMIN,
        status: InvitationStatus.PENDING,
      });
      expect(res.body.data).not.toHaveProperty("tokenHash");

      const email = vi.mocked(addEmailJob).mock.lastCall?.[0];
      expect(email?.to).toBe("friend@example.com");
      expect(email?.text).toContain(`${testEnv.CLIENT_URL}/invitations/`);
      const token = getTokenFromLastEmail("invitations");
      const stored = await prisma.projectInvitation.findUniqueOrThrow({
        where: { id: res.body.data.id },
      });
      expect(stored.tokenHash).toBe(hashToken(token));
    });

    it("escapes the project name in the email HTML", async () => {
      const { project, agent } = await createProjectWithRole(ProjectRole.ADMIN);
      await prisma.project.update({
        where: { id: project.id },
        data: { name: "<b>Launch</b>" },
      });

      await agent
        .post(invitationsUrl(project.id))
        .send({ email: "friend@example.com", role: ProjectRole.MEMBER })
        .expect(201);

      const html = vi.mocked(addEmailJob).mock.lastCall?.[0].html;
      expect(html).toContain("&lt;b&gt;Launch&lt;/b&gt;");
      expect(html).not.toContain("<b>Launch</b>");
    });

    it("returns 409 when a pending invitation already exists", async () => {
      const { project, adminAgent, invitee } = await inviteNewUser();

      await adminAgent
        .post(invitationsUrl(project.id))
        .send({ email: invitee.email, role: ProjectRole.MEMBER })
        .expect(409);
    });

    it("allows a new invitation once the previous one has expired", async () => {
      const { project, adminAgent, invitee } = await inviteNewUser();
      await prisma.projectInvitation.updateMany({
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await adminAgent
        .post(invitationsUrl(project.id))
        .send({ email: invitee.email, role: ProjectRole.MEMBER })
        .expect(201);
    });

    it("returns 409 when the email already belongs to a member", async () => {
      const { project, agent } = await createProjectWithRole(ProjectRole.ADMIN);
      const { user: member } = await addMember(project.id, ProjectRole.MEMBER);

      await agent
        .post(invitationsUrl(project.id))
        .send({ email: member.email, role: ProjectRole.MEMBER })
        .expect(409);
    });

    it("returns 403 to a Project Admin", async () => {
      const { project, agent } = await createProjectWithRole(
        ProjectRole.PROJECT_ADMIN,
      );

      await agent
        .post(invitationsUrl(project.id))
        .send({ email: "friend@example.com", role: ProjectRole.MEMBER })
        .expect(403);
      expect(addEmailJob).not.toHaveBeenCalled();
    });
  });

  describe("GET /projects/:projectId/invitations", () => {
    it("lists only pending invitations to an Admin", async () => {
      const { project, adminAgent } = await inviteNewUser();
      await adminAgent
        .post(invitationsUrl(project.id))
        .send({ email: "revoked@example.com", role: ProjectRole.MEMBER })
        .expect(201);
      await prisma.projectInvitation.updateMany({
        where: { email: "revoked@example.com" },
        data: { status: InvitationStatus.REVOKED },
      });

      const res = await adminAgent.get(invitationsUrl(project.id));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe(InvitationStatus.PENDING);
      expect(res.body.data[0]).not.toHaveProperty("tokenHash");
    });

    it("returns 403 to a Member", async () => {
      const { project, agent } = await createProjectWithRole(
        ProjectRole.MEMBER,
      );

      await agent.get(invitationsUrl(project.id)).expect(403);
    });
  });

  describe("DELETE /projects/:projectId/invitations/:invitationId", () => {
    it("revokes the invitation so it can no longer be accepted", async () => {
      const { project, adminAgent, invitee, token } = await inviteNewUser();
      const invitation = await prisma.projectInvitation.findFirstOrThrow();

      const res = await adminAgent.delete(
        `${invitationsUrl(project.id)}/${invitation.id}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(InvitationStatus.REVOKED);
      const inviteeAgent = await loginAs(invitee);
      await inviteeAgent.post(`${INVITATIONS}/${token}/accept`).expect(400);
    });

    it("returns 404 for an invitation from another project", async () => {
      await inviteNewUser();
      const invitation = await prisma.projectInvitation.findFirstOrThrow();
      const other = await createProjectWithRole(ProjectRole.ADMIN);

      await other.agent
        .delete(`${invitationsUrl(other.project.id)}/${invitation.id}`)
        .expect(404);
    });

    it("returns 403 to a Project Admin", async () => {
      const { project } = await inviteNewUser();
      const invitation = await prisma.projectInvitation.findFirstOrThrow();
      const { agent } = await addMember(project.id, ProjectRole.PROJECT_ADMIN);

      await agent
        .delete(`${invitationsUrl(project.id)}/${invitation.id}`)
        .expect(403);
    });
  });

  describe("GET /invitations/:token", () => {
    it("shows the invitation to anyone with the token", async () => {
      const { project, invitee, token } = await inviteNewUser(
        ProjectRole.PROJECT_ADMIN,
      );

      const res = await request(app).get(`${INVITATIONS}/${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        project: { id: project.id, name: project.name },
        email: invitee.email,
        role: ProjectRole.PROJECT_ADMIN,
        status: InvitationStatus.PENDING,
      });
      expect(res.body.data.invitedBy).toHaveProperty("username");
      expect(res.body.data.invitedBy).not.toHaveProperty("passwordHash");
    });

    it("returns 404 for an unknown token", async () => {
      await request(app).get(`${INVITATIONS}/unknown-token`).expect(404);
    });
  });

  describe("POST /invitations/:token/accept", () => {
    it("adds the invitee to the project with the invited role", async () => {
      const { project, invitee, token } = await inviteNewUser(
        ProjectRole.PROJECT_ADMIN,
      );
      const agent = await loginAs(invitee);

      const res = await agent.post(`${INVITATIONS}/${token}/accept`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        projectId: project.id,
        role: ProjectRole.PROJECT_ADMIN,
      });
      const invitation = await prisma.projectInvitation.findFirstOrThrow();
      expect(invitation.status).toBe(InvitationStatus.ACCEPTED);
      expect(invitation.acceptedAt).not.toBeNull();
      await agent.get(`/api/v1/projects/${project.id}`).expect(200);

      await agent.post(`${INVITATIONS}/${token}/accept`).expect(400);
    });

    it("works for an invitee who registers after being invited", async () => {
      const { project, agent: adminAgent } = await createProjectWithRole(
        ProjectRole.ADMIN,
      );
      await adminAgent
        .post(invitationsUrl(project.id))
        .send({ email: "newcomer@example.com", role: ProjectRole.MEMBER })
        .expect(201);
      const invitationToken = getTokenFromLastEmail("invitations");

      await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: "newcomer@example.com",
          username: "newcomer",
          password: "password123",
        })
        .expect(201);
      const agent = await loginAs(
        { email: "newcomer@example.com" },
        "password123",
      );
      await agent.post(`${INVITATIONS}/${invitationToken}/accept`).expect(403);

      const verificationToken = getTokenFromLastEmail("verify-email");
      await request(app)
        .post(`/api/v1/auth/verify-email/${verificationToken}`)
        .expect(200);
      await agent.post(`${INVITATIONS}/${invitationToken}/accept`).expect(200);
    });

    it("returns 403 when the logged-in user's email does not match", async () => {
      const { token } = await inviteNewUser();
      const someoneElse = await loginAs(await createUser());

      await someoneElse.post(`${INVITATIONS}/${token}/accept`).expect(403);
      const invitation = await prisma.projectInvitation.findFirstOrThrow();
      expect(invitation.status).toBe(InvitationStatus.PENDING);
    });

    it("returns 400 for an expired invitation", async () => {
      const { invitee, token } = await inviteNewUser();
      await prisma.projectInvitation.updateMany({
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      const agent = await loginAs(invitee);

      const res = await agent.post(`${INVITATIONS}/${token}/accept`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("This invitation has expired");
    });

    it("returns 403 until the invitee's email is verified", async () => {
      const { invitee, token } = await inviteNewUser();
      await prisma.user.update({
        where: { id: invitee.id },
        data: { isEmailVerified: false },
      });
      const agent = await loginAs(invitee);

      await agent.post(`${INVITATIONS}/${token}/accept`).expect(403);
    });

    it("returns 401 when not logged in", async () => {
      const { token } = await inviteNewUser();

      await request(app).post(`${INVITATIONS}/${token}/accept`).expect(401);
    });
  });
});
