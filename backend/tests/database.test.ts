import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { ProjectRole } from "../src/generated/prisma/client.js";
import { publicUserSelect } from "../src/utils/selects.js";
import { resetDatabase } from "./helpers/db.js";

const createTestUser = (name: string) =>
  prisma.user.create({
    data: {
      email: `${name}@example.com`,
      username: name,
      passwordHash: "hashed-password",
      refreshTokenHash: "hashed-refresh-token",
    },
  });

describe("database schema", () => {
  beforeAll(resetDatabase);

  it("deletes all project data when a project is deleted", async () => {
    const user = await createTestUser("cascade");
    const project = await prisma.project.create({
      data: {
        name: "Cascade project",
        createdById: user.id,
        members: { create: { userId: user.id, role: ProjectRole.ADMIN } },
        invitations: {
          create: {
            email: "invitee@example.com",
            role: ProjectRole.MEMBER,
            tokenHash: "invitation-token-hash",
            invitedById: user.id,
            expiresAt: new Date(Date.now() + 60_000),
          },
        },
        notes: { create: { content: "A note", createdById: user.id } },
        activities: {
          create: {
            actorId: user.id,
            action: "project.created",
            entityType: "project",
            entityId: user.id,
          },
        },
      },
    });
    const task = await prisma.task.create({
      data: {
        projectId: project.id,
        title: "A task",
        createdById: user.id,
        subtasks: { create: { title: "A subtask", createdById: user.id } },
        comments: { create: { content: "A comment", authorId: user.id } },
        attachments: {
          create: {
            url: "https://example.com/file.pdf",
            publicId: "plane/attachments/file",
            fileName: "file.pdf",
            mimeType: "application/pdf",
            size: 100,
            uploadedById: user.id,
          },
        },
      },
    });

    await prisma.project.delete({ where: { id: project.id } });

    const where = { projectId: project.id };
    const counts = await Promise.all([
      prisma.projectMember.count({ where }),
      prisma.projectInvitation.count({ where }),
      prisma.task.count({ where }),
      prisma.note.count({ where }),
      prisma.activityLog.count({ where }),
      prisma.subtask.count({ where: { taskId: task.id } }),
      prisma.comment.count({ where: { taskId: task.id } }),
      prisma.attachment.count({ where: { taskId: task.id } }),
    ]);
    expect(counts).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("allows a user to be a member of a project only once", async () => {
    const user = await createTestUser("duplicate");
    const project = await prisma.project.create({
      data: {
        name: "Duplicate project",
        createdById: user.id,
        members: { create: { userId: user.id, role: ProjectRole.ADMIN } },
      },
    });

    await expect(
      prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: user.id,
          role: ProjectRole.MEMBER,
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("publicUserSelect never returns password or token hashes", async () => {
    const created = await createTestUser("public");

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: created.id },
      select: publicUserSelect,
    });

    expect(Object.keys(user).sort()).toEqual(
      [
        "avatarUrl",
        "createdAt",
        "email",
        "fullName",
        "id",
        "isEmailVerified",
        "updatedAt",
        "username",
      ].sort(),
    );
  });
});
