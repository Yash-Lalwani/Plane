"use client";

import { AlertTriangle, CheckCircle2, Circle, CircleDashed, LayoutGrid, Users } from "lucide-react";
import { UserAvatar } from "@/components/plane/user-avatar";
import { errorMessage } from "@/lib/api";
import { displayName, priorityLabels, statusLabels } from "@/lib/format";
import { useDashboard } from "@/lib/queries";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/types";

const percent = (part: number, total: number) => (total === 0 ? 0 : Math.round((part / total) * 100));

export function OverviewTab({ projectId }: { projectId: string }) {
  const dashboard = useDashboard(projectId);

  if (dashboard.isPending) return <p className="text-sm text-slate-400">Loading dashboard…</p>;
  if (dashboard.isError) return <p className="form-error">{errorMessage(dashboard.error)}</p>;

  const d = dashboard.data;
  const stats = [
    { label: "Total tasks", value: d.totalTasks, icon: LayoutGrid },
    { label: "To do", value: d.tasksByStatus.TODO, icon: Circle },
    { label: "In progress", value: d.tasksByStatus.IN_PROGRESS, icon: CircleDashed },
    { label: "Completed", value: d.tasksByStatus.DONE, icon: CheckCircle2 },
    { label: "Overdue", value: d.overdueTasks, icon: AlertTriangle },
    { label: "Members", value: d.memberCount, icon: Users },
  ];

  return (
    <>
      <div className="dashboard-stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        {stats.map((stat) => (
          <div className="dashboard-stat" key={stat.label}>
            <span>
              <stat.icon size={15} />
              {stat.label}
            </span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>

      <div className="dashboard-lower">
        <div className="workspace-panel">
          <h3>Project progress</h3>
          {TASK_STATUSES.map((status) => (
            <div className="status-progress" key={status}>
              <span>{statusLabels[status]}</span>
              <div>
                <span style={{ width: `${percent(d.tasksByStatus[status], d.totalTasks)}%` }} />
              </div>
              <small>{d.tasksByStatus[status]}</small>
            </div>
          ))}
          <h3 className="mt-10">By priority</h3>
          {[...TASK_PRIORITIES].reverse().map((priority) => (
            <div className="status-progress" key={priority}>
              <span>
                <span className={`priority priority-${priority}`}>{priorityLabels[priority]}</span>
              </span>
              <div>
                <span style={{ width: `${percent(d.tasksByPriority[priority], d.totalTasks)}%` }} />
              </div>
              <small>{d.tasksByPriority[priority]}</small>
            </div>
          ))}
          <p className="mt-10 text-xs text-slate-400">
            {d.totalTasks === 0
              ? "No tasks yet. Create the first one in the Tasks tab."
              : `${percent(d.tasksByStatus.DONE, d.totalTasks)}% complete. Every step counts.`}
          </p>
        </div>

        <div className="workspace-panel">
          <h3>Open tasks by teammate</h3>
          {d.openTasksByAssignee.length === 0 && (
            <p className="text-xs text-slate-400">No open tasks are assigned to anyone right now.</p>
          )}
          {d.openTasksByAssignee.map(({ user, openTasks }) => (
            <div className="workload-row" key={user.id}>
              <UserAvatar user={user} />
              <span>{displayName(user)}</span>
              <span>
                {openTasks} {openTasks === 1 ? "task" : "tasks"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
