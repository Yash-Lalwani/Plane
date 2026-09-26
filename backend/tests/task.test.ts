import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import {
  ProjectRole,
  TaskPriority,
  TaskStatus,
} from "../src/generated/prisma/client.js";
import { deleteFile } from "../src/utils/file-storage.js";
import { createUser, loginAs } from "./helpers/auth.js";
import { resetDatabase } from "./helpers/db.js";
import { addMember, createProjectWithRole } from "./helpers/project.js";

const tasksUrl = (projectId: string) => `/api/v1/projects/${projectId}/tasks`;

const DAY = 24 * 60 * 60 * 1000;

describe("tasks", () => {
  beforeEach(resetDatabase);

  describe("POST /tasks", () => {
    it("lets a Project Admin create a task with defaults", async () => {
      const { project, user, agent } = await createProjectWithRole(
        ProjectRole.PROJECT_ADMIN,
      );

      const res = await agent
        .post(tasksUrl(project.id))
        .send({ title: " Write docs " });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        title: "Write docs",
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        assignedTo: null,
        subtasks: [],
        attachments: [],
        commentCount: 0,
      });
      expect(res.body.data.createdBy.id).toBe(user.id);
    });

    it("assigns the task to a project member", async () => {
      const { project, agent } = await createProjectWithRole(ProjectRole.ADMIN);
      const { user: member } = await addMember(project.id, ProjectRole.MEMBER);

      const res = await agent.post(tasksUrl(project.id)).send({
        title: "Assigned",
        assignedToId: member.id,
        dueDate: "2030-01-15",
      });

      expect(res.status).toBe(201);
      expect(res.body.data.assignedTo.id).toBe(member.id);
      expect(res.body.data.assignedTo).not.toHaveProperty("passwordHash");
      expect(res.body.data.dueDate).toBe("2030-01-15T00:00:00.000Z");
    });

    it("returns 400 when the assignee is not a project member", async () => {
      const { project, agent } = await createProjectWithRole(ProjectRole.ADMIN);
      const outsider = await createUser();

      const res = await agent
        .post(tasksUrl(project.id))
        .send({ title: "Bad assignee", assignedToId: outsider.id });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "Assignee must be a member of this project",
      );
    });

    it("returns 403 to a Member", async () => {
      const { project, agent } = await createProjectWithRole(
        ProjectRole.MEMBER,
      );

      await agent
        .post(tasksUrl(project.id))
        .send({ title: "Nope" })
        .expect(403);
    });

    it("returns 422 for an invalid status", async () => {
      const { project, agent } = await createProjectWithRole(ProjectRole.ADMIN);

      await agent
        .post(tasksUrl(project.id))
        .send({ title: "Bad", status: "BLOCKED" })
        .expect(422);
    });
  });

  describe("GET /tasks/:taskId", () => {
    it("returns task details to a Member", async () => {
      const { project, admin, agent } = await createProjectWithRole(
        ProjectRole.MEMBER,
      );
      const task = await prisma.task.create({
        data: {
          projectId: project.id,
          title: "Detailed",
          createdById: admin.id,
          subtasks: { create: { title: "Step 1", createdById: admin.id } },
          comments: {
            create: [
              { content: "One", authorId: admin.id },
              { content: "Two", authorId: admin.id },
            ],
          },
        },
      });

      const res = await agent.get(`${tasksUrl(project.id)}/${task.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.subtasks).toHaveLength(1);
      expect(res.body.data.commentCount).toBe(2);
      expect(res.body.data).not.toHaveProperty("_count");
    });

    it("returns 404 for a task that belongs to another project", async () => {
      const { project, agent } = await createProjectWithRole(ProjectRole.ADMIN);
      const other = await createProjectWithRole(ProjectRole.ADMIN);
      const otherTask = await prisma.task.create({
        data: {
          projectId: other.project.id,
          title: "Elsewhere",
          createdById: other.user.id,
        },
      });
      const url = `${tasksUrl(project.id)}/${otherTask.id}`;

      await agent.get(url).expect(404);
      await agent.patch(url).send({ title: "Hijacked" }).expect(404);
      await agent.delete(url).expect(404);
      expect(await prisma.task.count({ where: { id: otherTask.id } })).toBe(1);
    });

    it("returns 422 for a task id that is not a UUID", async () => {
      const { project, agent } = await createProjectWithRole(ProjectRole.ADMIN);

      await agent.get(`${tasksUrl(project.id)}/123`).expect(422);
    });

    it("returns 404 to a non-member", async () => {
      const { project, user } = await createProjectWithRole(ProjectRole.ADMIN);
      const task = await prisma.task.create({
        data: { projectId: project.id, title: "Private", createdById: user.id },
      });
      const outsider = await loginAs(await createUser());

      await outsider.get(`${tasksUrl(project.id)}/${task.id}`).expect(404);
    });
  });

  describe("PATCH /tasks/:taskId", () => {
    it("lets a Project Admin update and unassign a task", async () => {
      const { project, admin, agent } = await createProjectWithRole(
        ProjectRole.PROJECT_ADMIN,
      );
      const task = await prisma.task.create({
        data: {
          projectId: project.id,
          title: "Old",
          createdById: admin.id,
          assignedToId: admin.id,
          dueDate: new Date(),
        },
      });

      const res = await agent.patch(`${tasksUrl(project.id)}/${task.id}`).send({
        title: "New",
        status: TaskStatus.IN_PROGRESS,
        assignedToId: null,
        dueDate: null,
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        title: "New",
        status: TaskStatus.IN_PROGRESS,
        assignedTo: null,
        dueDate: null,
      });
    });

    it("returns 400 when reassigning to a non-member", async () => {
      const { project, user, agent } = await createProjectWithRole(
        ProjectRole.ADMIN,
      );
      const task = await prisma.task.create({
        data: { projectId: project.id, title: "Task", createdById: user.id },
      });
      const outsider = await createUser();

      await agent
        .patch(`${tasksUrl(project.id)}/${task.id}`)
        .send({ assignedToId: outsider.id })
        .expect(400);
    });

    it("returns 403 to a Member", async () => {
      const { project, admin, agent } = await createProjectWithRole(
        ProjectRole.MEMBER,
      );
      const task = await prisma.task.create({
        data: { projectId: project.id, title: "Task", createdById: admin.id },
      });

      await agent
        .patch(`${tasksUrl(project.id)}/${task.id}`)
        .send({ status: TaskStatus.DONE })
        .expect(403);
    });

    it("returns 422 for an empty update", async () => {
      const { project, user, agent } = await createProjectWithRole(
        ProjectRole.ADMIN,
      );
      const task = await prisma.task.create({
        data: { projectId: project.id, title: "Task", createdById: user.id },
      });

      await agent
        .patch(`${tasksUrl(project.id)}/${task.id}`)
        .send({})
        .expect(422);
    });
  });

  describe("DELETE /tasks/:taskId", () => {
    it("deletes the task and its attachment files", async () => {
      const { project, user, agent } = await createProjectWithRole(
        ProjectRole.PROJECT_ADMIN,
      );
      const task = await prisma.task.create({
        data: {
          projectId: project.id,
          title: "With file",
          createdById: user.id,
          attachments: {
            create: {
              url: "https://cdn.test/a.png",
              publicId: "plane/attachments/a",
              fileName: "a.png",
              mimeType: "image/png",
              size: 10,
              uploadedById: user.id,
            },
          },
        },
      });

      await agent.delete(`${tasksUrl(project.id)}/${task.id}`).expect(200);

      expect(await prisma.task.count()).toBe(0);
      expect(await prisma.attachment.count()).toBe(0);
      expect(deleteFile).toHaveBeenCalledWith(
        "plane/attachments/a",
        "image/png",
      );
    });

    it("returns 403 to a Member", async () => {
      const { project, admin, agent } = await createProjectWithRole(
        ProjectRole.MEMBER,
      );
      const task = await prisma.task.create({
        data: { projectId: project.id, title: "Task", createdById: admin.id },
      });

      await agent.delete(`${tasksUrl(project.id)}/${task.id}`).expect(403);
    });
  });

  describe("GET /tasks", () => {
    // Creates a fixed set of tasks and returns a Member's agent plus ids to query with.
    const seedTasks = async () => {
      const { project, admin, user, agent } = await createProjectWithRole(
        ProjectRole.MEMBER,
      );
      const now = Date.now();
      const base = { projectId: project.id, createdById: admin.id };
      await prisma.task.createMany({
        data: [
          {
            ...base,
            title: "Fix login bug",
            priority: TaskPriority.HIGH,
            assignedToId: user.id,
            dueDate: new Date(now - DAY),
          },
          {
            ...base,
            title: "Write release notes",
            status: TaskStatus.DONE,
            dueDate: new Date(now - 2 * DAY),
          },
          {
            ...base,
            title: "Plan sprint",
            priority: TaskPriority.LOW,
            assignedToId: admin.id,
            dueDate: new Date(now + DAY),
          },
          {
            ...base,
            title: "Review LOGIN flow",
            status: TaskStatus.IN_PROGRESS,
          },
        ],
      });
      return { project, admin, user, agent };
    };

    const titles = (res: { body: { data: { items: { title: string }[] } } }) =>
      res.body.data.items.map((task) => task.title);

    it("lists tasks with pagination info", async () => {
      const { project, agent } = await seedTasks();

      const res = await agent.get(tasksUrl(project.id));

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(4);
      expect(res.body.data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 4,
        totalPages: 1,
      });
    });

    it("filters by status and priority", async () => {
      const { project, agent } = await seedTasks();

      const done = await agent
        .get(tasksUrl(project.id))
        .query({ status: TaskStatus.DONE });
      const high = await agent
        .get(tasksUrl(project.id))
        .query({ priority: TaskPriority.HIGH });

      expect(titles(done)).toEqual(["Write release notes"]);
      expect(titles(high)).toEqual(["Fix login bug"]);
    });

    it("filters by assignee, including 'me'", async () => {
      const { project, admin, agent } = await seedTasks();

      const mine = await agent
        .get(tasksUrl(project.id))
        .query({ assignedTo: "me" });
      const admins = await agent
        .get(tasksUrl(project.id))
        .query({ assignedTo: admin.id });

      expect(titles(mine)).toEqual(["Fix login bug"]);
      expect(titles(admins)).toEqual(["Plan sprint"]);
    });

    it("returns overdue tasks that are not done", async () => {
      const { project, agent } = await seedTasks();

      const res = await agent
        .get(tasksUrl(project.id))
        .query({ overdue: "true" });

      expect(titles(res)).toEqual(["Fix login bug"]);
    });

    it("searches titles case-insensitively", async () => {
      const { project, agent } = await seedTasks();

      const res = await agent
        .get(tasksUrl(project.id))
        .query({ search: "login" });

      // The seeded tasks share a createdAt, so only the set of matches is checked, not the order.
      expect(titles(res).sort()).toEqual([
        "Fix login bug",
        "Review LOGIN flow",
      ]);
    });

    it("sorts by priority and by due date with empty dates last", async () => {
      const { project, agent } = await seedTasks();

      const byPriority = await agent
        .get(tasksUrl(project.id))
        .query({ sortBy: "priority", order: "desc", status: TaskStatus.TODO });
      const byDueDate = await agent
        .get(tasksUrl(project.id))
        .query({ sortBy: "dueDate", order: "asc" });

      expect(titles(byPriority)).toEqual(["Fix login bug", "Plan sprint"]);
      expect(titles(byDueDate)).toEqual([
        "Write release notes",
        "Fix login bug",
        "Plan sprint",
        "Review LOGIN flow",
      ]);
    });

    it("paginates with page and limit", async () => {
      const { project, agent } = await seedTasks();

      const pageOne = await agent
        .get(tasksUrl(project.id))
        .query({ sortBy: "dueDate", order: "asc", page: 1, limit: 3 });
      const pageTwo = await agent
        .get(tasksUrl(project.id))
        .query({ sortBy: "dueDate", order: "asc", page: 2, limit: 3 });

      expect(pageOne.body.data.items).toHaveLength(3);
      expect(titles(pageTwo)).toEqual(["Review LOGIN flow"]);
      expect(pageTwo.body.data.pagination).toEqual({
        page: 2,
        limit: 3,
        total: 4,
        totalPages: 2,
      });
    });

    it("returns 422 for a limit over 100 or an unknown sort field", async () => {
      const { project, agent } = await seedTasks();

      await agent.get(tasksUrl(project.id)).query({ limit: 101 }).expect(422);
      await agent
        .get(tasksUrl(project.id))
        .query({ sortBy: "title" })
        .expect(422);
    });

    it("returns 404 to a non-member", async () => {
      const { project } = await seedTasks();
      const outsider = await loginAs(await createUser());

      await outsider.get(tasksUrl(project.id)).expect(404);
    });
  });
});
