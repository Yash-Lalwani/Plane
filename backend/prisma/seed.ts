import bcrypt from "bcrypt";
import { prisma } from "../src/config/db.js";
import { logger } from "../src/config/logger.js";
import {
  InvitationStatus,
  ProjectRole,
  TaskPriority,
  TaskStatus,
} from "../src/generated/prisma/client.js";
import { createRandomToken } from "../src/utils/tokens.js";

// Demo credentials, also listed in the README.
const DEMO_EMAIL = "demo@plane.dev";
const DEMO_PASSWORD = "DemoPass123!";

const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY);

const seed = async () => {
  // Never touch existing data: running the seed twice is a no-op.
  if (await prisma.user.findUnique({ where: { email: DEMO_EMAIL } })) {
    logger.info("Demo data already exists, nothing to seed");
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const createUser = (
    username: string,
    fullName: string,
    email = `${username}@plane.dev`,
  ) =>
    prisma.user.create({
      data: { email, username, fullName, passwordHash, isEmailVerified: true },
    });

  const demo = await createUser("demo", "Demo User", DEMO_EMAIL);
  const alex = await createUser("alex", "Alex Chen");
  const priya = await createUser("priya", "Priya Patel");
  const sam = await createUser("sam", "Sam Rivera");

  // Project 1: the demo user is the Admin.
  const website = await prisma.project.create({
    data: {
      name: "Website Relaunch",
      description: "New marketing site for the Q4 launch",
      createdById: demo.id,
      createdAt: daysFromNow(-21),
      members: {
        create: [
          { userId: demo.id, role: ProjectRole.ADMIN },
          { userId: alex.id, role: ProjectRole.PROJECT_ADMIN },
          { userId: priya.id, role: ProjectRole.MEMBER },
          { userId: sam.id, role: ProjectRole.MEMBER },
        ],
      },
      notes: {
        create: [
          {
            content: "Launch checklist lives in the shared drive.",
            createdById: demo.id,
          },
          {
            content: "Weekly sync is on Tuesdays at 10:00.",
            createdById: demo.id,
          },
        ],
      },
      invitations: {
        create: {
          email: "newhire@example.com",
          role: ProjectRole.MEMBER,
          tokenHash: createRandomToken().tokenHash,
          status: InvitationStatus.PENDING,
          invitedById: demo.id,
          expiresAt: daysFromNow(5),
        },
      },
    },
  });

  const websiteTasks = [
    {
      title: "Design the pricing page",
      description: "Three tiers with an annual toggle",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: daysFromNow(4),
      assignedToId: priya.id,
      subtasks: [
        "Draft copy for each tier",
        "Pick the plan icons",
        "Review with sales",
      ],
      comments: [
        {
          authorId: alex.id,
          content: "Can we add a FAQ section below the tiers?",
        },
        { authorId: priya.id, content: "Yes, I'll add one to the next draft." },
      ],
    },
    {
      title: "Set up analytics",
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: daysFromNow(-2),
      assignedToId: sam.id,
      subtasks: ["Create the tracking plan"],
      comments: [
        { authorId: demo.id, content: "This one is overdue, any blockers?" },
      ],
    },
    {
      title: "Write launch blog post",
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      dueDate: daysFromNow(10),
      assignedToId: demo.id,
      subtasks: [],
      comments: [],
    },
    {
      title: "Migrate DNS to the new host",
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      dueDate: daysFromNow(-5),
      assignedToId: alex.id,
      subtasks: ["Lower TTLs", "Switch records"],
      comments: [
        { authorId: alex.id, content: "Done, propagation finished overnight." },
      ],
    },
    {
      title: "Fix mobile navigation menu",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: daysFromNow(-1),
      assignedToId: sam.id,
      subtasks: [],
      comments: [],
    },
    {
      title: "Collect customer logos",
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: null,
      assignedToId: null,
      subtasks: [],
      comments: [],
    },
  ];

  for (const [index, task] of websiteTasks.entries()) {
    const created = await prisma.task.create({
      data: {
        projectId: website.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        assignedToId: task.assignedToId,
        createdById: index % 2 === 0 ? demo.id : alex.id,
        createdAt: daysFromNow(-20 + index),
        subtasks: {
          create: task.subtasks.map((title, subtaskIndex) => ({
            title,
            isCompleted: task.status === TaskStatus.DONE || subtaskIndex === 0,
            createdById: alex.id,
          })),
        },
        comments: { create: task.comments },
      },
    });

    await prisma.activityLog.create({
      data: {
        projectId: website.id,
        actorId: created.createdById,
        action: "task.created",
        entityType: "task",
        entityId: created.id,
        metadata: { title: created.title },
        createdAt: created.createdAt,
      },
    });
    if (task.status !== TaskStatus.TODO) {
      await prisma.activityLog.create({
        data: {
          projectId: website.id,
          actorId: task.assignedToId ?? demo.id,
          action: "task.status_changed",
          entityType: "task",
          entityId: created.id,
          metadata: {
            title: created.title,
            from: TaskStatus.TODO,
            to: task.status,
          },
          createdAt: daysFromNow(-10 + index),
        },
      });
    }
  }

  const invitation = await prisma.projectInvitation.findFirstOrThrow({
    where: { projectId: website.id },
  });
  await prisma.activityLog.createMany({
    data: [
      {
        projectId: website.id,
        actorId: demo.id,
        action: "project.created",
        entityType: "project",
        entityId: website.id,
        metadata: { name: website.name },
        createdAt: daysFromNow(-21),
      },
      ...[alex, priya, sam].map((user, index) => ({
        projectId: website.id,
        actorId: user.id,
        action: "member.joined",
        entityType: "member",
        entityId: user.id,
        metadata: { username: user.username },
        createdAt: daysFromNow(-21 + index * 0.1 + 0.1),
      })),
      {
        projectId: website.id,
        actorId: demo.id,
        action: "invitation.sent",
        entityType: "invitation",
        entityId: invitation.id,
        metadata: { email: "newhire@example.com", role: ProjectRole.MEMBER },
        createdAt: daysFromNow(-2),
      },
    ],
  });

  // Project 2: the demo user is a plain Member, to show per-project roles.
  const mobile = await prisma.project.create({
    data: {
      name: "Mobile App Beta",
      description: "Closed beta of the iOS and Android apps",
      createdById: alex.id,
      members: {
        create: [
          { userId: alex.id, role: ProjectRole.ADMIN },
          { userId: priya.id, role: ProjectRole.PROJECT_ADMIN },
          { userId: demo.id, role: ProjectRole.MEMBER },
        ],
      },
      tasks: {
        create: [
          {
            title: "Recruit 50 beta testers",
            status: TaskStatus.IN_PROGRESS,
            priority: TaskPriority.HIGH,
            dueDate: daysFromNow(7),
            assignedToId: demo.id,
            createdById: alex.id,
          },
          {
            title: "Set up crash reporting",
            status: TaskStatus.DONE,
            priority: TaskPriority.MEDIUM,
            assignedToId: priya.id,
            createdById: alex.id,
          },
          {
            title: "Write beta feedback survey",
            priority: TaskPriority.LOW,
            dueDate: daysFromNow(14),
            createdById: priya.id,
          },
        ],
      },
      notes: {
        create: {
          content: "TestFlight build goes out every Friday.",
          createdById: alex.id,
        },
      },
    },
  });
  await prisma.activityLog.create({
    data: {
      projectId: mobile.id,
      actorId: alex.id,
      action: "project.created",
      entityType: "project",
      entityId: mobile.id,
      metadata: { name: mobile.name },
    },
  });

  logger.info(`Seeded demo data. Log in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
};

try {
  await seed();
} finally {
  await prisma.$disconnect();
}
