"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/api";
import { applyFieldErrors, displayName, dueDateInputValue, priorityLabels, statusLabels } from "@/lib/format";
import { useCreateTask, useUpdateTask } from "@/lib/queries";
import { TASK_PRIORITIES, TASK_STATUSES, type Member, type TaskDetail } from "@/lib/types";

// Radix Select can't use "" as a value, so "no assignee" has its own marker.
const UNASSIGNED = "UNASSIGNED";

const schema = z.object({
  title: z.string().trim().min(1, "Give your task a title.").max(200, "Keep the title under 200 characters."),
  description: z.string().trim().max(5000, "Keep the description under 5000 characters."),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  dueDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Pick a valid date."),
  assignedToId: z.string(),
});
type Values = z.infer<typeof schema>;

export function TaskFormDialog({
  projectId,
  open,
  onOpenChange,
  members,
  task,
  onCreated,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  task?: TaskDetail;
  onCreated?: (taskId: string) => void;
}) {
  const create = useCreateTask(projectId);
  const update = useUpdateTask(projectId, task?.id ?? "");
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      status: "TODO",
      priority: "MEDIUM",
      dueDate: "",
      assignedToId: UNASSIGNED,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      title: task?.title ?? "",
      description: task?.description ?? "",
      status: task?.status ?? "TODO",
      priority: task?.priority ?? "MEDIUM",
      dueDate: dueDateInputValue(task?.dueDate ?? null),
      assignedToId: task?.assignedToId ?? UNASSIGNED,
    });
  }, [open, task, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const assignee = values.assignedToId === UNASSIGNED ? null : values.assignedToId;
    try {
      if (task) {
        // On edit, null clears the description, due date or assignee.
        await update.mutateAsync({
          title: values.title,
          description: values.description || null,
          status: values.status,
          priority: values.priority,
          dueDate: values.dueDate || null,
          assignedToId: assignee,
        });
        toast.success("Task updated");
      } else {
        const created = await create.mutateAsync({
          title: values.title,
          description: values.description || undefined,
          status: values.status,
          priority: values.priority,
          dueDate: values.dueDate || undefined,
          assignedToId: assignee ?? undefined,
        });
        toast.success("Task created");
        onCreated?.(created.id);
      }
      onOpenChange(false);
    } catch (error) {
      const fields: (keyof Values)[] = ["title", "description", "status", "priority", "dueDate", "assignedToId"];
      if (!applyFieldErrors(error, form.setError, fields)) toast.error(errorMessage(error));
    }
  });

  const busy = create.isPending || update.isPending;
  const errors = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "Create a task"}</DialogTitle>
          <DialogDescription>{task ? "Update the task’s details." : "A clear next step for your project."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <label className="form-field">
            Task title
            <Input autoFocus placeholder="What needs to happen?" {...form.register("title")} />
            {errors.title && <span className="form-error">{errors.title.message}</span>}
          </label>
          <label className="form-field">
            <span>Description <span className="text-slate-400">(optional)</span></span>
            <Textarea rows={4} placeholder="Add the details that matter." {...form.register("description")} />
            {errors.description && <span className="form-error">{errors.description.message}</span>}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="form-field">
              Status
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
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
                )}
              />
            </label>
            <label className="form-field">
              Priority
              <Controller
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_PRIORITIES.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priorityLabels[priority]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </label>
            <label className="form-field">
              <span>Due date <span className="text-slate-400">(optional)</span></span>
              <Input type="date" {...form.register("dueDate")} />
              {errors.dueDate && <span className="form-error">{errors.dueDate.message}</span>}
            </label>
            <label className="form-field">
              Assignee
              <Controller
                control={form.control}
                name="assignedToId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.user.id} value={member.user.id}>
                          {displayName(member.user)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.assignedToId && <span className="form-error">{errors.assignedToId.message}</span>}
            </label>
          </div>
          <div className="form-buttons">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : task ? "Save changes" : "Create task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
