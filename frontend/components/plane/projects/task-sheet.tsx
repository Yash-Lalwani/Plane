"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/plane/confirm-dialog";
import { UserAvatar } from "@/components/plane/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ApiError, errorMessage } from "@/lib/api";
import {
  canManageTasks,
  displayName,
  dueDateInputValue,
  formatDateTime,
  priorityLabels,
  statusLabels,
} from "@/lib/format";
import { useDeleteTask, useMembers, useTask, useUpdateTask } from "@/lib/queries";
import { TASK_PRIORITIES, TASK_STATUSES, type ProjectRole, type TaskDetail, type TaskInput } from "@/lib/types";
import { AttachmentList } from "./task-attachments";
import { CommentList } from "./task-comments";
import { SubtaskList } from "./task-subtasks";
import { DueDate, PriorityBadge, StatusIcon } from "./task-bits";
import { TaskFormDialog } from "./task-form-dialog";

const UNASSIGNED = "UNASSIGNED";

export function TaskSheet({
  projectId,
  role,
  taskId,
  onClose,
}: {
  projectId: string;
  role: ProjectRole;
  taskId: string | null;
  onClose: () => void;
}) {
  const task = useTask(projectId, taskId);

  return (
    <Sheet open={Boolean(taskId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="task-sheet w-full overflow-y-auto sm:max-w-xl">
        {task.isPending && (
          <SheetHeader>
            <SheetTitle>Loading task…</SheetTitle>
            <SheetDescription>Fetching the latest details.</SheetDescription>
          </SheetHeader>
        )}
        {task.isError && (
          <SheetHeader>
            <SheetTitle>
              {task.error instanceof ApiError && task.error.status === 404 ? "Task not found" : "Couldn’t load task"}
            </SheetTitle>
            <SheetDescription>
              {task.error instanceof ApiError && task.error.status === 404
                ? "It may have been deleted."
                : errorMessage(task.error)}
            </SheetDescription>
          </SheetHeader>
        )}
        {task.data && <TaskDetails projectId={projectId} role={role} task={task.data} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function TaskDetails({
  projectId,
  role,
  task,
  onClose,
}: {
  projectId: string;
  role: ProjectRole;
  task: TaskDetail;
  onClose: () => void;
}) {
  const members = useMembers(projectId);
  const update = useUpdateTask(projectId, task.id);
  const deleteTask = useDeleteTask(projectId);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canEdit = canManageTasks(role);

  function change(input: TaskInput) {
    update.mutate(input, {
      onSuccess: () => toast.success("Task updated"),
      onError: (error) => toast.error(errorMessage(error)),
    });
  }

  return (
    <>
      <SheetHeader className="p-0">
        <span className="task-code">Created {formatDateTime(task.createdAt)}</span>
        <SheetTitle className="break-words text-xl">{task.title}</SheetTitle>
        <SheetDescription className="flex items-center gap-2">
          <UserAvatar user={task.createdBy} small />
          Created by {displayName(task.createdBy)}
        </SheetDescription>
      </SheetHeader>

      {canEdit && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil size={14} /> Edit details
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={14} /> Delete task
          </Button>
        </div>
      )}

      <div className="detail-meta">
        <label>
          Status
          {canEdit ? (
            <Select value={task.status} onValueChange={(status) => change({ status: status as TaskDetail["status"] })}>
              <SelectTrigger className="w-full text-xs" disabled={update.isPending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="status-pill py-2">
              <StatusIcon status={task.status} />
              {statusLabels[task.status]}
            </span>
          )}
        </label>
        <label>
          Priority
          {canEdit ? (
            <Select
              value={task.priority}
              onValueChange={(priority) => change({ priority: priority as TaskDetail["priority"] })}
            >
              <SelectTrigger className="w-full text-xs" disabled={update.isPending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...TASK_PRIORITIES].reverse().map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priorityLabels[priority]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="py-2">
              <PriorityBadge priority={task.priority} />
            </span>
          )}
        </label>
        <label>
          Assignee
          {canEdit ? (
            <Select
              value={task.assignedToId ?? UNASSIGNED}
              onValueChange={(value) => change({ assignedToId: value === UNASSIGNED ? null : value })}
            >
              <SelectTrigger className="w-full text-xs" disabled={update.isPending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {members.data?.map((member) => (
                  <SelectItem key={member.user.id} value={member.user.id}>
                    {displayName(member.user)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="task-assignee py-2">
              {task.assignedTo ? (
                <>
                  <UserAvatar user={task.assignedTo} small />
                  <span>{displayName(task.assignedTo)}</span>
                </>
              ) : (
                "Unassigned"
              )}
            </span>
          )}
        </label>
        <label>
          Due date
          {canEdit ? (
            <Input
              type="date"
              className="text-xs"
              defaultValue={dueDateInputValue(task.dueDate)}
              key={task.dueDate ?? "none"}
              disabled={update.isPending}
              onBlur={(event) => {
                const value = event.target.value;
                if (value !== dueDateInputValue(task.dueDate)) change({ dueDate: value || null });
              }}
            />
          ) : (
            <span className="py-2">
              <DueDate dueDate={task.dueDate} status={task.status} />
            </span>
          )}
        </label>
      </div>

      <div>
        <h3>Description</h3>
        <p className="detail-description whitespace-pre-line">{task.description || "No description."}</p>
      </div>

      <SubtaskList projectId={projectId} task={task} role={role} />
      <AttachmentList projectId={projectId} task={task} role={role} />
      <CommentList projectId={projectId} taskId={task.id} role={role} commentCount={task.commentCount} />

      <TaskFormDialog
        projectId={projectId}
        open={editOpen}
        onOpenChange={setEditOpen}
        members={members.data ?? []}
        task={task}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete “${task.title}”?`}
        description="This permanently deletes the task with its subtasks, attachments and comments. This can’t be undone."
        confirmLabel="Delete task"
        onConfirm={async () => {
          await deleteTask.mutateAsync(task.id);
          toast.success("Task deleted");
          onClose();
        }}
      />
    </>
  );
}
