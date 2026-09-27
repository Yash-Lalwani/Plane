"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { api } from "./api";
import type {
  AcceptedInvitation,
  Activity,
  Attachment,
  Comment,
  Dashboard,
  Invitation,
  InvitationPreview,
  LoginResult,
  Member,
  Note,
  Paginated,
  Project,
  ProjectRole,
  Subtask,
  Task,
  TaskDetail,
  TaskFilters,
  TaskInput,
  User,
} from "./types";

export const keys = {
  currentUser: ["currentUser"] as const,
  projectList: ["projectList"] as const,
  project: (projectId: string) => ["project", projectId] as const,
  dashboard: (projectId: string) => ["project", projectId, "dashboard"] as const,
  activity: (projectId: string) => ["project", projectId, "activity"] as const,
  members: (projectId: string) => ["project", projectId, "members"] as const,
  invitations: (projectId: string) => ["project", projectId, "invitations"] as const,
  tasks: (projectId: string) => ["project", projectId, "tasks"] as const,
  taskList: (projectId: string, filters: TaskFilters) =>
    ["project", projectId, "tasks", "list", filters] as const,
  task: (projectId: string, taskId: string) => ["project", projectId, "tasks", "detail", taskId] as const,
  comments: (projectId: string, taskId: string) =>
    ["project", projectId, "tasks", "comments", taskId] as const,
  notes: (projectId: string) => ["project", projectId, "notes"] as const,
  invitationPreview: (token: string) => ["invitationPreview", token] as const,
};

const nextPage = (last: Paginated<unknown>) =>
  last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined;

// ---------------------------------------------------------------- auth and account

export function useCurrentUser() {
  return useQuery({
    queryKey: keys.currentUser,
    queryFn: () => api<User>("/auth/current-user"),
    staleTime: 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      api<LoginResult>("/auth/login", { method: "POST", body: input }),
    onSuccess: (result) => {
      // Drop anything cached for a previous account before storing the new user.
      queryClient.clear();
      queryClient.setQueryData(keys.currentUser, result.user);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (input: { email: string; username: string; password: string; fullName?: string }) =>
      api<User>("/auth/register", { method: "POST", body: input }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<null>("/auth/logout", { method: "POST" }),
    onSettled: () => queryClient.clear(),
  });
}

export function useVerifyEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) =>
      api<{ isEmailVerified: boolean }>(`/auth/verify-email/${encodeURIComponent(token)}`, {
        method: "POST",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.currentUser }),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: () => api<null>("/auth/resend-email-verification", { method: "POST" }),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => api<null>("/auth/forgot-password", { method: "POST", body: { email } }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      api<null>(`/auth/reset-password/${encodeURIComponent(token)}`, {
        method: "POST",
        body: { password },
      }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { oldPassword: string; newPassword: string }) =>
      api<null>("/auth/change-password", { method: "POST", body: input }),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { fullName?: string | null; username?: string }) =>
      api<User>("/users/me", { method: "PATCH", body: input }),
    onSuccess: (user) => {
      queryClient.setQueryData(keys.currentUser, user);
      // Names appear on members, tasks, comments and activity everywhere.
      queryClient.invalidateQueries({ queryKey: ["project"] });
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("avatar", file);
      return api<User>("/users/me/avatar", { method: "PATCH", body: form });
    },
    onSuccess: (user) => {
      queryClient.setQueryData(keys.currentUser, user);
      queryClient.invalidateQueries({ queryKey: ["project"] });
    },
  });
}

// ---------------------------------------------------------------- projects

export function useProjects(enabled = true) {
  return useQuery({
    queryKey: keys.projectList,
    queryFn: () => api<Project[]>("/projects"),
    enabled,
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: keys.project(projectId),
    queryFn: () => api<Project>(`/projects/${projectId}`),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string }) =>
      api<Project>("/projects", { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.projectList }),
  });
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string; description?: string | null }) =>
      api<Project>(`/projects/${projectId}`, { method: "PATCH", body: input }),
    onSuccess: (project) => {
      queryClient.setQueryData(keys.project(projectId), project);
      queryClient.invalidateQueries({ queryKey: keys.projectList });
      queryClient.invalidateQueries({ queryKey: keys.activity(projectId) });
    },
  });
}

export function useDeleteProject(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<null>(`/projects/${projectId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: keys.project(projectId) });
      queryClient.invalidateQueries({ queryKey: keys.projectList });
    },
  });
}

export function useDashboard(projectId: string) {
  return useQuery({
    queryKey: keys.dashboard(projectId),
    queryFn: () => api<Dashboard>(`/projects/${projectId}/dashboard`),
  });
}

export function useActivity(projectId: string) {
  return useInfiniteQuery({
    queryKey: keys.activity(projectId),
    queryFn: ({ pageParam }) =>
      api<Paginated<Activity>>(`/projects/${projectId}/activity`, { query: { page: pageParam, limit: 20 } }),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });
}

// ---------------------------------------------------------------- members and invitations

export function useMembers(projectId: string) {
  return useQuery({
    queryKey: keys.members(projectId),
    queryFn: () => api<Member[]>(`/projects/${projectId}/members`),
  });
}

// Member changes affect the member list, counts, dashboard, activity and task assignees.
function invalidateMemberData(queryClient: QueryClient, projectId: string) {
  queryClient.invalidateQueries({ queryKey: keys.project(projectId) });
  queryClient.invalidateQueries({ queryKey: keys.projectList });
}

export function useUpdateMemberRole(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: ProjectRole }) =>
      api<Member>(`/projects/${projectId}/members/${userId}`, { method: "PATCH", body: { role } }),
    onSuccess: () => invalidateMemberData(queryClient, projectId),
  });
}

export function useRemoveMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api<null>(`/projects/${projectId}/members/${userId}`, { method: "DELETE" }),
    onSuccess: () => invalidateMemberData(queryClient, projectId),
  });
}

export function useInvitations(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.invitations(projectId),
    queryFn: () => api<Invitation[]>(`/projects/${projectId}/invitations`),
    enabled,
  });
}

export function useCreateInvitation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; role: ProjectRole }) =>
      api<Invitation>(`/projects/${projectId}/invitations`, { method: "POST", body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.invitations(projectId) });
      queryClient.invalidateQueries({ queryKey: keys.activity(projectId) });
    },
  });
}

export function useRevokeInvitation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      api<Invitation>(`/projects/${projectId}/invitations/${invitationId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.invitations(projectId) });
      queryClient.invalidateQueries({ queryKey: keys.activity(projectId) });
    },
  });
}

export function useInvitationPreview(token: string) {
  return useQuery({
    queryKey: keys.invitationPreview(token),
    queryFn: () => api<InvitationPreview>(`/invitations/${encodeURIComponent(token)}`),
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) =>
      api<AcceptedInvitation>(`/invitations/${encodeURIComponent(token)}/accept`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.projectList }),
  });
}

// ---------------------------------------------------------------- tasks

export function useTasks(projectId: string, filters: TaskFilters) {
  return useQuery({
    queryKey: keys.taskList(projectId, filters),
    queryFn: () =>
      api<Paginated<Task>>(`/projects/${projectId}/tasks`, {
        query: {
          status: filters.status,
          priority: filters.priority,
          assignedTo: filters.assignedTo,
          overdue: filters.overdue ? "true" : undefined,
          search: filters.search?.trim() || undefined,
          sortBy: filters.sortBy,
          order: filters.order,
          page: filters.page,
          limit: filters.limit,
        },
      }),
    placeholderData: (previous) => previous,
  });
}

export function useTask(projectId: string, taskId: string | null) {
  return useQuery({
    queryKey: keys.task(projectId, taskId ?? ""),
    queryFn: () => api<TaskDetail>(`/projects/${projectId}/tasks/${taskId}`),
    enabled: Boolean(taskId),
  });
}

// Task changes affect task lists and details, the dashboard and the activity feed.
function invalidateTaskData(queryClient: QueryClient, projectId: string) {
  queryClient.invalidateQueries({ queryKey: keys.tasks(projectId) });
  queryClient.invalidateQueries({ queryKey: keys.dashboard(projectId) });
  queryClient.invalidateQueries({ queryKey: keys.activity(projectId) });
}

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskInput) =>
      api<TaskDetail>(`/projects/${projectId}/tasks`, { method: "POST", body: input }),
    onSuccess: () => invalidateTaskData(queryClient, projectId),
  });
}

export function useUpdateTask(projectId: string, taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskInput) =>
      api<TaskDetail>(`/projects/${projectId}/tasks/${taskId}`, { method: "PATCH", body: input }),
    onSuccess: (task) => {
      queryClient.setQueryData(keys.task(projectId, taskId), task);
      invalidateTaskData(queryClient, projectId);
    },
  });
}

export function useDeleteTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api<null>(`/projects/${projectId}/tasks/${taskId}`, { method: "DELETE" }),
    onSuccess: (_data, taskId) => {
      queryClient.removeQueries({ queryKey: keys.task(projectId, taskId) });
      invalidateTaskData(queryClient, projectId);
    },
  });
}

// ---------------------------------------------------------------- subtasks and attachments

function useInvalidateTask(projectId: string, taskId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: keys.task(projectId, taskId) });
}

export function useCreateSubtask(projectId: string, taskId: string) {
  const invalidate = useInvalidateTask(projectId, taskId);
  return useMutation({
    mutationFn: (title: string) =>
      api<Subtask>(`/projects/${projectId}/tasks/${taskId}/subtasks`, { method: "POST", body: { title } }),
    onSuccess: invalidate,
  });
}

export function useUpdateSubtask(projectId: string, taskId: string) {
  const invalidate = useInvalidateTask(projectId, taskId);
  return useMutation({
    mutationFn: ({ subtaskId, ...input }: { subtaskId: string; title?: string; isCompleted?: boolean }) =>
      api<Subtask>(`/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: "PATCH",
        body: input,
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteSubtask(projectId: string, taskId: string) {
  const invalidate = useInvalidateTask(projectId, taskId);
  return useMutation({
    mutationFn: (subtaskId: string) =>
      api<null>(`/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useUploadAttachments(projectId: string, taskId: string) {
  const invalidate = useInvalidateTask(projectId, taskId);
  return useMutation({
    mutationFn: (files: File[]) => {
      const form = new FormData();
      for (const file of files) form.append("files", file);
      return api<Attachment[]>(`/projects/${projectId}/tasks/${taskId}/attachments`, {
        method: "POST",
        body: form,
      });
    },
    onSuccess: invalidate,
  });
}

export function useDeleteAttachment(projectId: string, taskId: string) {
  const invalidate = useInvalidateTask(projectId, taskId);
  return useMutation({
    mutationFn: (attachmentId: string) =>
      api<null>(`/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

// ---------------------------------------------------------------- comments

export function useComments(projectId: string, taskId: string) {
  return useInfiniteQuery({
    queryKey: keys.comments(projectId, taskId),
    queryFn: ({ pageParam }) =>
      api<Paginated<Comment>>(`/projects/${projectId}/tasks/${taskId}/comments`, {
        query: { page: pageParam, limit: 20 },
      }),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });
}

function useInvalidateComments(projectId: string, taskId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: keys.comments(projectId, taskId) });
    // commentCount lives on the task detail and the task list.
    queryClient.invalidateQueries({ queryKey: keys.task(projectId, taskId) });
  };
}

export function useCreateComment(projectId: string, taskId: string) {
  const invalidate = useInvalidateComments(projectId, taskId);
  return useMutation({
    mutationFn: (content: string) =>
      api<Comment>(`/projects/${projectId}/tasks/${taskId}/comments`, { method: "POST", body: { content } }),
    onSuccess: invalidate,
  });
}

export function useUpdateComment(projectId: string, taskId: string) {
  const invalidate = useInvalidateComments(projectId, taskId);
  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      api<Comment>(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`, {
        method: "PATCH",
        body: { content },
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteComment(projectId: string, taskId: string) {
  const invalidate = useInvalidateComments(projectId, taskId);
  return useMutation({
    mutationFn: (commentId: string) =>
      api<null>(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

// ---------------------------------------------------------------- notes

export function useNotes(projectId: string) {
  return useQuery({
    queryKey: keys.notes(projectId),
    queryFn: () => api<Note[]>(`/projects/${projectId}/notes`),
  });
}

function useInvalidateNotes(projectId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: keys.notes(projectId) });
    queryClient.invalidateQueries({ queryKey: keys.activity(projectId) });
  };
}

export function useCreateNote(projectId: string) {
  const invalidate = useInvalidateNotes(projectId);
  return useMutation({
    mutationFn: (content: string) =>
      api<Note>(`/projects/${projectId}/notes`, { method: "POST", body: { content } }),
    onSuccess: invalidate,
  });
}

export function useUpdateNote(projectId: string) {
  const invalidate = useInvalidateNotes(projectId);
  return useMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) =>
      api<Note>(`/projects/${projectId}/notes/${noteId}`, { method: "PATCH", body: { content } }),
    onSuccess: invalidate,
  });
}

export function useDeleteNote(projectId: string) {
  const invalidate = useInvalidateNotes(projectId);
  return useMutation({
    mutationFn: (noteId: string) => api<null>(`/projects/${projectId}/notes/${noteId}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
