import { prisma } from "../../src/config/db.js";

// Every other table references User or Project, so CASCADE empties the whole database.
export const resetDatabase = async (): Promise<void> => {
  await prisma.$executeRaw`TRUNCATE TABLE "User", "Project" CASCADE`;
};
