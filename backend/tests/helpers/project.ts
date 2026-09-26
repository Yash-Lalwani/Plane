import { prisma } from "../../src/config/db.js";
import { ProjectRole } from "../../src/generated/prisma/client.js";
import { createUser, loginAs } from "./auth.js";

// Creates a user with the given role in an existing project and logs them in.
export const addMember = async (projectId: string, role: ProjectRole) => {
  const user = await createUser();
  await prisma.projectMember.create({
    data: { projectId, userId: user.id, role },
  });
  return { user, agent: await loginAs(user) };
};

// Creates a project (owned by an Admin) and returns a logged-in user with the given role in it.
// For ADMIN, `user` is the project's Admin itself.
export const createProjectWithRole = async (role: ProjectRole) => {
  const admin = await createUser();
  const project = await prisma.project.create({
    data: {
      name: "Test project",
      createdById: admin.id,
      members: { create: { userId: admin.id, role: ProjectRole.ADMIN } },
    },
  });

  if (role === ProjectRole.ADMIN) {
    return { project, admin, user: admin, agent: await loginAs(admin) };
  }

  const { user, agent } = await addMember(project.id, role);
  return { project, admin, user, agent };
};
