import { CheckCircle2, Circle, CircleDashed } from "lucide-react";
import { formatDueDate, isOverdue, priorityLabels } from "@/lib/format";
import type { TaskPriority, TaskStatus } from "@/lib/types";

export function StatusIcon({ status }: { status: TaskStatus }) {
  const Icon = status === "DONE" ? CheckCircle2 : status === "IN_PROGRESS" ? CircleDashed : Circle;
  return <Icon size={16} className={`status-${status}`} />;
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <span className={`priority priority-${priority}`}>{priorityLabels[priority]}</span>;
}

export function DueDate({ dueDate, status }: { dueDate: string | null; status: TaskStatus }) {
  const overdue = isOverdue({ dueDate, status });
  return (
    <span className="task-due" style={overdue ? { color: "#c2410c" } : undefined} title={overdue ? "Overdue" : undefined}>
      {formatDueDate(dueDate)}
      {overdue && " · overdue"}
    </span>
  );
}
