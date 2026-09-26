import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/config/db.js";
import { ProjectRole } from "../src/generated/prisma/client.js";
import { deleteFile, uploadFile } from "../src/utils/file-storage.js";
import { resetDatabase } from "./helpers/db.js";
import { createProjectWithRole } from "./helpers/project.js";

const attachmentsUrl = (projectId: string, taskId: string) =>
  `/api/v1/projects/${projectId}/tasks/${taskId}/attachments`;

const pdf = { filename: "spec.pdf", contentType: "application/pdf" };
const txt = { filename: "notes.txt", contentType: "text/plain" };

// A project with one task, and a logged-in user with the given role.
const setup = async (role: ProjectRole) => {
  const context = await createProjectWithRole(role);
  const task = await prisma.task.create({
    data: {
      projectId: context.project.id,
      title: "Task",
      createdById: context.admin.id,
    },
  });
  return { ...context, task, url: attachmentsUrl(context.project.id, task.id) };
};

describe("attachments", () => {
  beforeEach(() => {
    vi.mocked(uploadFile).mockImplementation(async (_buffer, folder) => {
      const id = crypto.randomUUID();
      return { url: `https://cdn.test/${id}`, publicId: `${folder}/${id}` };
    });
    return resetDatabase();
  });

  describe("POST /attachments", () => {
    it("lets a Project Admin upload several files", async () => {
      const { user, task, agent, url } = await setup(ProjectRole.PROJECT_ADMIN);

      const res = await agent
        .post(url)
        .attach("files", Buffer.from("%PDF-1.4"), pdf)
        .attach("files", Buffer.from("hello"), txt);

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toMatchObject({
        taskId: task.id,
        fileName: "spec.pdf",
        mimeType: "application/pdf",
        size: 8,
      });
      expect(res.body.data[0].uploadedBy.id).toBe(user.id);
      expect(uploadFile).toHaveBeenCalledTimes(2);
      expect(uploadFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        "plane/attachments",
      );
      // The stored URL is exactly what Cloudinary returned for that file.
      const stored = await prisma.attachment.findMany();
      expect(
        stored.every((file) =>
          file.url.endsWith(file.publicId.split("/").pop()!),
        ),
      ).toBe(true);
    });

    it("returns 403 to a Member without uploading", async () => {
      const { agent, url } = await setup(ProjectRole.MEMBER);

      await agent
        .post(url)
        .attach("files", Buffer.from("hello"), txt)
        .expect(403);
      expect(uploadFile).not.toHaveBeenCalled();
    });

    it("rejects a file type outside the whitelist", async () => {
      const { agent, url } = await setup(ProjectRole.ADMIN);

      await agent
        .post(url)
        .attach("files", Buffer.from("zip"), {
          filename: "a.zip",
          contentType: "application/zip",
        })
        .expect(400);
      expect(uploadFile).not.toHaveBeenCalled();
    });

    it("returns 413 for a file over 5 MB", async () => {
      const { agent, url } = await setup(ProjectRole.ADMIN);

      await agent
        .post(url)
        .attach("files", Buffer.alloc(5 * 1024 * 1024 + 1), pdf)
        .expect(413);
      expect(uploadFile).not.toHaveBeenCalled();
    });

    it("returns 400 for more than 5 files", async () => {
      const { agent, url } = await setup(ProjectRole.ADMIN);
      let request = agent.post(url);
      for (let i = 0; i < 6; i += 1) {
        request = request.attach("files", Buffer.from(`file ${i}`), txt);
      }

      await request.expect(400);
      expect(uploadFile).not.toHaveBeenCalled();
    });

    it("returns 400 when no file is sent", async () => {
      const { agent, url } = await setup(ProjectRole.ADMIN);

      await agent.post(url).expect(400);
    });

    it("returns 404 for a task in another project without uploading", async () => {
      const { project, agent } = await setup(ProjectRole.ADMIN);
      const other = await setup(ProjectRole.ADMIN);

      await agent
        .post(attachmentsUrl(project.id, other.task.id))
        .attach("files", Buffer.from("hello"), txt)
        .expect(404);
      expect(uploadFile).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /attachments/:attachmentId", () => {
    const createAttachment = (taskId: string, uploadedById: string) =>
      prisma.attachment.create({
        data: {
          taskId,
          url: "https://cdn.test/notes.txt",
          publicId: "plane/attachments/notes.txt",
          fileName: "notes.txt",
          mimeType: "text/plain",
          size: 5,
          uploadedById,
        },
      });

    it("deletes the attachment and its Cloudinary file", async () => {
      const { user, task, agent, url } = await setup(ProjectRole.PROJECT_ADMIN);
      const attachment = await createAttachment(task.id, user.id);

      await agent.delete(`${url}/${attachment.id}`).expect(200);

      expect(await prisma.attachment.count()).toBe(0);
      expect(deleteFile).toHaveBeenCalledWith(
        "plane/attachments/notes.txt",
        "text/plain",
      );
    });

    it("returns 403 to a Member", async () => {
      const { admin, task, agent, url } = await setup(ProjectRole.MEMBER);
      const attachment = await createAttachment(task.id, admin.id);

      await agent.delete(`${url}/${attachment.id}`).expect(403);
      expect(deleteFile).not.toHaveBeenCalled();
    });

    it("returns 404 for an attachment on a different task", async () => {
      const { project, admin, agent, url } = await setup(ProjectRole.ADMIN);
      const otherTask = await prisma.task.create({
        data: { projectId: project.id, title: "Other", createdById: admin.id },
      });
      const attachment = await createAttachment(otherTask.id, admin.id);

      await agent.delete(`${url}/${attachment.id}`).expect(404);
      expect(await prisma.attachment.count()).toBe(1);
    });
  });
});
