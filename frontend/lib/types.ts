// Response shapes of the Plane API (https://api.plane.yashlalwani.info/api-docs).

export type ProjectRole = "ADMIN" | "PROJECT_ADMIN" | "MEMBER";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
export type InvitationStatus = "PENDING" | "ACCEPTED" | "REVOKED";
export type ISODate = string;

export const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
export const TASK_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];
export const PROJECT_ROLES: ProjectRole[] = ["ADMIN", "PROJECT_ADMIN", "MEMBER"];

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface LoginResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  createdById: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  createdBy: User;
  role: ProjectRole;
  memberCount: number;
}

export interface Member {
  role: ProjectRole;
  createdAt: ISODate;
  user: User;
}

export interface Invitation {
  id: string;
  projectId: string;
  email: string;
  role: ProjectRole;
  status: InvitationStatus;
  expiresAt: ISODate;
  acceptedAt: ISODate | null;
  createdAt: ISODate;
  invitedBy: User;
}

export interface InvitationPreview {
  project: { id: string; name: string };
  invitedBy: User;
  email: string;
  role: ProjectRole;
  status: InvitationStatus;
  expiresAt: ISODate;
}

export interface AcceptedInvitation {
  projectId: string;
  role: ProjectRole;
  createdAt: ISODate;
  project: { id: string; name: string };
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: ISODate | null;
  assignedToId: string | null;
  createdById: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  assignedTo: User | null;
  createdBy: User;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  createdById: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Attachment {
  id: string;
  taskId: string;
  url: string;
  publicId: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedById: string;
  createdAt: ISODate;
}

export interface TaskDetail extends Task {
  subtasks: Subtask[];
  attachments: Attachment[];
  commentCount: number;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  author: User;
}

export interface Note {
  id: string;
  projectId: string;
  content: string;
  createdById: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  createdBy: User;
}

export interface Activity {
  id: string;
  projectId: string;
  actorId: string;
  action: string;
  entityType: "project" | "member" | "invitation" | "task" | "note";
  entityId: string;
  metadata: Record<string, string> | null;
  createdAt: ISODate;
  actor: User;
}

export interface Dashboard {
  totalTasks: number;
  tasksByStatus: Record<TaskStatus, number>;
  tasksByPriority: Record<TaskPriority, number>;
  overdueTasks: number;
  openTasksByAssignee: { user: User; openTasks: number }[];
  memberCount: number;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string; // a user id or "me"
  overdue?: boolean;
  search?: string;
  sortBy?: "createdAt" | "dueDate" | "priority";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface TaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  assignedToId?: string | null;
}
