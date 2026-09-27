"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/api";
import { canManageTasks } from "@/lib/format";
import { useCreateSubtask, useDeleteSubtask, useUpdateSubtask } from "@/lib/queries";
import type { ProjectRole, Subtask, TaskDetail } from "@/lib/types";

export function SubtaskList({ projectId, task, role }: { projectId: string; task: TaskDetail; role: ProjectRole }) {
  const create = useCreateSubtask(projectId, task.id);
  const [newTitle, setNewTitle] = useState("");
  const canEdit = canManageTasks(role);
  const done = task.subtasks.filter((subtask) => subtask.isCompleted).length;

  function onAdd(event: React.FormEvent) {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    create.mutate(title, {
      onSuccess: () => setNewTitle(""),
      onError: (error) => toast.error(errorMessage(error)),
    });
  }

  return (
    <div>
      <h3>
        Subtasks{" "}
        {task.subtasks.length > 0 && (
          <span className="ml-2 text-slate-400">
            {done}/{task.subtasks.length}
          </span>
        )}
      </h3>
      {task.subtasks.length === 0 && <p className="text-xs text-slate-400">No subtasks yet.</p>}
      {task.subtasks.map((subtask) => (
        <SubtaskRow key={subtask.id} projectId={projectId} taskId={task.id} subtask={subtask} canEdit={canEdit} />
      ))}
      {canEdit && (
        <form onSubmit={onAdd} className="mt-3 flex gap-2">
          <Input
            placeholder="Add a subtask…"
            aria-label="New subtask title"
            value={newTitle}
            maxLength={200}
            onChange={(event) => setNewTitle(event.target.value)}
          />
          <Button type="submit" size="icon" variant="outline" disabled={!newTitle.trim() || create.isPending} aria-label="Add subtask">
            <Plus size={15} />
          </Button>
        </form>
      )}
    </div>
  );
}

function SubtaskRow({
  projectId,
  taskId,
  subtask,
  canEdit,
}: {
  projectId: string;
  taskId: string;
  subtask: Subtask;
  canEdit: boolean;
}) {
  const update = useUpdateSubtask(projectId, taskId);
  const remove = useDeleteSubtask(projectId, taskId);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(subtask.title);

  const onError = (error: Error) => toast.error(errorMessage(error));

  function saveTitle() {
    const next = title.trim();
    if (!next || next === subtask.title) {
      setEditing(false);
      setTitle(subtask.title);
      return;
    }
    update.mutate({ subtaskId: subtask.id, title: next }, { onSuccess: () => setEditing(false), onError });
  }

  if (editing) {
    return (
      <div className="subtask-item flex items-center gap-2">
        <Input
          autoFocus
          value={title}
          maxLength={200}
          aria-label="Subtask title"
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") saveTitle();
            if (event.key === "Escape") {
              setEditing(false);
              setTitle(subtask.title);
            }
          }}
        />
        <Button size="icon-sm" variant="ghost" onClick={saveTitle} aria-label="Save subtask" disabled={update.isPending}>
          <Check size={14} />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Cancel editing"
          onClick={() => {
            setEditing(false);
            setTitle(subtask.title);
          }}
        >
          <X size={14} />
        </Button>
      </div>
    );
  }

  return (
    <div className="subtask-item flex items-center gap-2">
      <Checkbox
        checked={subtask.isCompleted}
        disabled={update.isPending}
        aria-label={subtask.isCompleted ? "Mark as not done" : "Mark as done"}
        // Only isCompleted is sent: the API rejects a Member request that includes a title.
        onCheckedChange={(checked) => update.mutate({ subtaskId: subtask.id, isCompleted: checked === true }, { onError })}
      />
      <span className="flex-1" style={{ textDecoration: subtask.isCompleted ? "line-through" : undefined }}>
        {subtask.title}
      </span>
      {canEdit && (
        <>
          <Button size="icon-sm" variant="ghost" aria-label="Rename subtask" onClick={() => setEditing(true)}>
            <Pencil size={13} />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Delete subtask"
            disabled={remove.isPending}
            onClick={() => remove.mutate(subtask.id, { onError })}
          >
            <Trash2 size={13} />
          </Button>
        </>
      )}
    </div>
  );
}
