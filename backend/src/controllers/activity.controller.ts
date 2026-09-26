import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { ApiResponse } from "../utils/api-response.js";
import { buildPaginatedData, getSkipTake } from "../utils/pagination.js";
import { publicUserSelect } from "../utils/selects.js";
import type { ListActivityQuery } from "../validators/activity.validator.js";
import type { ProjectParams } from "../validators/project.validator.js";

export const listActivity = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { projectId } = req.params as ProjectParams;
  const query = req.validatedQuery as ListActivityQuery;

  const where = { projectId };
  const [activities, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: { actor: { select: publicUserSelect } },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      ...getSkipTake(query),
    }),
    prisma.activityLog.count({ where }),
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        buildPaginatedData(activities, total, query),
        "Activity fetched successfully",
      ),
    );
};
