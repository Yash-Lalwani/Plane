import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "./api";
import type { Activity, ProjectRole, Task, TaskPriority, TaskStatus, User } from "./types";

export const statusLabels: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

export const priorityLabels: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const roleLabels: Record<ProjectRole, string> = {
  ADMIN: "Admin",
  PROJECT_ADMIN: "Project Admin",
  MEMBER: "Member",
};

export const roleDescriptions: Record<ProjectRole, string> = {
  ADMIN: "Admin — manage the project, members and notes",
  PROJECT_ADMIN: "Project Admin — manage tasks",
  MEMBER: "Member — comment and complete subtasks",
};

export const canManageProject = (role: ProjectRole | undefined) => role === "ADMIN";
export const canManageTasks = (role: ProjectRole | undefined) => role === "ADMIN" || role === "PROJECT_ADMIN";

export const displayName = (user: Pick<User, "fullName" | "username">) => user.fullName || user.username;

export const initials = (name: string) =>
  name
    .split(/[\s_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

// Due dates are stored as midnight UTC, so they are shown in UTC to avoid showing the previous day.
export function formatDueDate(iso: string | null): string {
  if (!iso) return "No date";
  const date = new Date(iso);
  const sameYear = date.getUTCFullYear() === new Date().getUTCFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
    timeZone: "UTC",
  });
}

export const dueDateInputValue = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

export const isPast = (iso: string) => new Date(iso).getTime() < Date.now();

export const isOverdue = (task: Pick<Task, "dueDate" | "status">) =>
  Boolean(task.dueDate) && task.status !== "DONE" && isPast(task.dueDate as string);

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function timeAgo(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const quoted = (value: string | undefined) => (value ? `“${value}”` : "");

// Turns an activity entry into the text after the actor's name. Metadata fields are optional.
export function activityText(activity: Activity): string {
  const m = activity.metadata ?? {};
  switch (activity.action) {
    case "project.created":
      return `created the project ${quoted(m.name)}`;
    case "project.updated":
      return `updated the project ${quoted(m.name)}`;
    case "member.joined":
      return m.role ? `joined as ${roleLabels[m.role as ProjectRole] ?? m.role}` : "joined the project";
    case "member.role_changed":
      return `changed ${m.username ?? "a member"}’s role from ${roleLabels[m.from as ProjectRole] ?? m.from} to ${roleLabels[m.to as ProjectRole] ?? m.to}`;
    case "member.removed":
      return `removed ${m.username ?? "a member"} from the project`;
    case "invitation.sent":
      return `invited ${m.email ?? "someone"}${m.role ? ` as ${roleLabels[m.role as ProjectRole] ?? m.role}` : ""}`;
    case "invitation.revoked":
      return `revoked the invitation for ${m.email ?? "someone"}`;
    case "task.created":
      return `created ${quoted(m.title)}`;
    case "task.updated":
      return `updated ${quoted(m.title)}`;
    case "task.status_changed":
      return `moved ${quoted(m.title)} from ${statusLabels[m.from as TaskStatus] ?? m.from} to ${statusLabels[m.to as TaskStatus] ?? m.to}`;
    case "task.deleted":
      return `deleted ${quoted(m.title)}`;
    case "note.created":
      return "created a note";
    case "note.updated":
      return "updated a note";
    case "note.deleted":
      return "deleted a note";
    default:
      return activity.action;
  }
}

// Only same-site paths are allowed, so a crafted link can't send users to another website.
export function safeReturnTo(value: string | undefined | null, fallback = "/projects"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}

// Copies the API's 422 field errors onto a react-hook-form form. Returns true if any matched.
export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: Path<T>[],
): boolean {
  if (!(error instanceof ApiError) || error.fields.length === 0) return false;
  let applied = false;
  for (const fieldError of error.fields) {
    const field = fields.find((name) => name === fieldError.field);
    if (field) {
      setError(field, { message: fieldError.message });
      applied = true;
    }
  }
  return applied;
}
