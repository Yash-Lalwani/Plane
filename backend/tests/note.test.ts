import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { ProjectRole } from "../src/generated/prisma/client.js";
import { createUser, loginAs } from "./helpers/auth.js";
import { resetDatabase } from "./helpers/db.js";
import { createProjectWithRole } from "./helpers/project.js";

const notesUrl = (projectId: string) => `/api/v1/projects/${projectId}/notes`;

const createNote = (
  projectId: string,
  createdById: string,
  content = "Meeting notes",
) => prisma.note.create({ data: { projectId, createdById, content } });

describe("notes", () => {
  beforeEach(resetDatabase);

  describe("GET /notes and /notes/:noteId", () => {
    it("lets a Member view notes", async () => {
      const { project, admin, agent } = await createProjectWithRole(
        ProjectRole.MEMBER,
      );
      const note = await createNote(project.id, admin.id);

      const list = await agent.get(notesUrl(project.id));
      const single = await agent.get(`${notesUrl(project.id)}/${note.id}`);

      expect(list.status).toBe(200);
      expect(list.body.data).toHaveLength(1);
      expect(single.status).toBe(200);
      expect(single.body.data.content).toBe("Meeting notes");
      expect(single.body.data.createdBy.id).toBe(admin.id);
      expect(single.body.data.createdBy).not.toHaveProperty("passwordHash");
    });

    it("returns 404 for a note from another project", async () => {
      const { project, agent } = await createProjectWithRole(ProjectRole.ADMIN);
      const other = await createProjectWithRole(ProjectRole.ADMIN);
      const otherNote = await createNote(other.project.id, other.user.id);
      const url = `${notesUrl(project.id)}/${otherNote.id}`;

      await agent.get(url).expect(404);
      await agent.patch(url).send({ content: "Hijacked" }).expect(404);
      await agent.delete(url).expect(404);
    });

    it("returns 404 to a non-member", async () => {
      const { project } = await createProjectWithRole(ProjectRole.ADMIN);
      const outsider = await loginAs(await createUser());

      await outsider.get(notesUrl(project.id)).expect(404);
    });
  });

  describe("POST, PATCH, DELETE /notes", () => {
    it("lets an Admin create, update and delete a note", async () => {
      const { project, user, agent } = await createProjectWithRole(
        ProjectRole.ADMIN,
      );

      const created = await agent
        .post(notesUrl(project.id))
        .send({ content: " Kickoff " });
      expect(created.status).toBe(201);
      expect(created.body.data).toMatchObject({
        content: "Kickoff",
        projectId: project.id,
      });
      expect(created.body.data.createdBy.id).toBe(user.id);

      const noteUrl = `${notesUrl(project.id)}/${created.body.data.id}`;
      const updated = await agent
        .patch(noteUrl)
        .send({ content: "Kickoff moved" });
      expect(updated.status).toBe(200);
      expect(updated.body.data.content).toBe("Kickoff moved");

      await agent.delete(noteUrl).expect(200);
      expect(await prisma.note.count()).toBe(0);
    });

    it("returns 403 to a Project Admin", async () => {
      const { project, admin, agent } = await createProjectWithRole(
        ProjectRole.PROJECT_ADMIN,
      );
      const note = await createNote(project.id, admin.id);
      const noteUrl = `${notesUrl(project.id)}/${note.id}`;

      await agent
        .post(notesUrl(project.id))
        .send({ content: "Nope" })
        .expect(403);
      await agent.patch(noteUrl).send({ content: "Nope" }).expect(403);
      await agent.delete(noteUrl).expect(403);
    });

    it("returns 422 for empty content", async () => {
      const { project, agent } = await createProjectWithRole(ProjectRole.ADMIN);

      await agent
        .post(notesUrl(project.id))
        .send({ content: "   " })
        .expect(422);
    });
  });
});
