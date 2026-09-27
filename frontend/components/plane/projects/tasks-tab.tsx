"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, List, Plus, Search } from "lucide-react";
import { UserAvatar } from "@/components/plane/user-avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { errorMessage } from "@/lib/api";
import { canManageTasks, displayName, priorityLabels, statusLabels } from "@/lib/format";
import { useMembers, useTasks } from "@/lib/queries";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type ProjectRole,
  type Task,
  type TaskFilters,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/types";
import { DueDate, PriorityBadge, StatusIcon } from "./task-bits";
import { TaskFormDialog } from "./task-form-dialog";
import { TaskSheet } from "./task-sheet";

// Radix Select can't use "" as a value, so "no filter" is "ALL".
const ALL = "ALL";
const PAGE_SIZE = 20;
const BOARD_LIMIT = 100; // the API's maximum page size

const SORTS = {
  newest: { label: "Newest first", sortBy: "createdAt", order: "desc" },
  oldest: { label: "Oldest first", sortBy: "createdAt", order: "asc" },
  dueSoon: { label: "Due date, soonest", sortBy: "dueDate", order: "asc" },
  dueLate: { label: "Due date, latest", sortBy: "dueDate", order: "desc" },
  priorityHigh: { label: "Priority, high to low", sortBy: "priority", order: "desc" },
  priorityLow: { label: "Priority, low to high", sortBy: "priority", order: "asc" },
} as const;
type SortKey = keyof typeof SORTS;

export function TasksTab({ projectId, role }: { projectId: string; role: ProjectRole }) {
  const members = useMembers(projectId);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [priority, setPriority] = useState<string>(ALL);
  const [assignee, setAssignee] = useState<string>(ALL);
  const [overdue, setOverdue] = useState(false);
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<"list" | "board">("list");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Search once typing pauses, instead of on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filters: TaskFilters = {
    status: status === ALL ? undefined : (status as TaskStatus),
    priority: priority === ALL ? undefined : (priority as TaskPriority),
    assignedTo: assignee === ALL ? undefined : assignee,
    overdue: overdue || undefined,
    search: search || undefined,
    sortBy: SORTS[sort].sortBy,
    order: SORTS[sort].order,
    page: view === "board" ? 1 : page,
    limit: view === "board" ? BOARD_LIMIT : PAGE_SIZE,
  };
  const tasks = useTasks(projectId, filters);

  // Every filter change starts again from page 1.
  const withReset =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };

  const hasFilters = status !== ALL || priority !== ALL || assignee !== ALL || overdue || search !== "";
  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setStatus(ALL);
    setPriority(ALL);
    setAssignee(ALL);
    setOverdue(false);
    setPage(1);
  }

  const items = tasks.data?.items ?? [];
  const pagination = tasks.data?.pagination;

  return (
    <>
      <div className="workspace-controls">
        <div className="task-search">
          <Search />
          <Input
            aria-label="Search tasks"
            placeholder="Search tasks…"
            value={searchInput}
            maxLength={200}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <FilterSelect
          label="Status"
          value={status}
          onChange={withReset(setStatus)}
          options={[
            [ALL, "All statuses"],
            ...TASK_STATUSES.map((value) => [value, statusLabels[value]] as [string, string]),
          ]}
        />
        <FilterSelect
          label="Priority"
          value={priority}
          onChange={withReset(setPriority)}
          options={[
            [ALL, "All priorities"],
            ...[...TASK_PRIORITIES].reverse().map((value) => [value, priorityLabels[value]] as [string, string]),
          ]}
        />
        <FilterSelect
          label="Assignee"
          value={assignee}
          onChange={withReset(setAssignee)}
          options={[
            [ALL, "Anyone"],
            ["me", "Assigned to me"],
            ...(members.data ?? []).map((member) => [member.user.id, displayName(member.user)] as [string, string]),
          ]}
        />
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <Checkbox checked={overdue} onCheckedChange={(checked) => withReset(setOverdue)(checked === true)} />
          Overdue only
        </label>
        <FilterSelect
          label="Sort"
          value={sort}
          onChange={(value) => withReset(setSort)(value as SortKey)}
          options={Object.entries(SORTS).map(([key, value]) => [key, value.label] as [string, string])}
        />
        <Tabs value={view} onValueChange={(value) => setView(value as "list" | "board")}>
          <TabsList>
            <TabsTrigger value="list">
              <List size={14} />
              List
            </TabsTrigger>
            <TabsTrigger value="board">
              <LayoutGrid size={14} />
              Board
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {canManageTasks(role) && (
          <Button className="bg-[#287eb2] hover:bg-[#216a97]" onClick={() => setCreateOpen(true)}>
            <Plus size={15} />
            New task
          </Button>
        )}
      </div>

      {tasks.isPending && <p className="text-sm text-slate-400">Loading tasks…</p>}
      {tasks.isError && <p className="form-error">{errorMessage(tasks.error)}</p>}

      {tasks.data && items.length === 0 && pagination && pagination.total > 0 && (
        <div className="workspace-empty">
          <strong>This page is empty</strong>
          <p>The tasks that were here have moved or been deleted.</p>
          <Button variant="outline" className="mt-5" onClick={() => setPage(1)}>
            Back to the first page
          </Button>
        </div>
      )}

      {tasks.data && items.length === 0 && pagination?.total === 0 && (
        <div className="workspace-empty">
          <Search size={25} />
          <strong>{hasFilters ? "No tasks match" : "No tasks yet"}</strong>
          <p>
            {hasFilters
              ? "Try another search or clear your filters."
              : canManageTasks(role)
                ? "Create the first task for this project."
                : "Tasks created by your Admins will show up here."}
          </p>
          {hasFilters ? (
            <Button variant="outline" className="mt-5" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : (
            canManageTasks(role) && (
              <Button className="mt-5" onClick={() => setCreateOpen(true)}>
                <Plus size={15} />
                New task
              </Button>
            )
          )}
        </div>
      )}

      {items.length > 0 && view === "list" && (
        <>
          <div className="workspace-table" style={{ opacity: tasks.isPlaceholderData ? 0.6 : 1 }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Due date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <button className="task-title-button" onClick={() => setSelectedTaskId(task.id)}>
                        {task.title}
                      </button>
                    </TableCell>
                    <TableCell>
                      <span className="status-pill">
                        <StatusIcon status={task.status} />
                        {statusLabels[task.status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={task.priority} />
                    </TableCell>
                    <TableCell>
                      <Assignee task={task} />
                    </TableCell>
                    <TableCell>
                      <DueDate dueDate={task.dueDate} status={task.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft size={14} /> Previous
                </Button>
                <span>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {items.length > 0 && view === "board" && (
        <>
          {pagination && pagination.total > BOARD_LIMIT && (
            <p className="mb-4 text-xs text-slate-500">
              Showing the first {BOARD_LIMIT} of {pagination.total} tasks. Use filters or the list view to see the rest.
            </p>
          )}
          <div className="task-board">
            {TASK_STATUSES.map((column) => {
              const columnTasks = items.filter((task) => task.status === column);
              return (
                <div className="task-board-column" key={column}>
                  <div className="task-board-heading">
                    <StatusIcon status={column} />
                    {statusLabels[column]}
                    <span>{columnTasks.length}</span>
                  </div>
                  {columnTasks.map((task) => (
                    <button className="workspace-task-card" key={task.id} onClick={() => setSelectedTaskId(task.id)}>
                      <DueDate dueDate={task.dueDate} status={task.status} />
                      <strong>{task.title}</strong>
                      <div>
                        <PriorityBadge priority={task.priority} />
                        {task.assignedTo && <UserAvatar user={task.assignedTo} small />}
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}

      <TaskFormDialog
        projectId={projectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        members={members.data ?? []}
        onCreated={setSelectedTaskId}
      />
      <TaskSheet
        projectId={projectId}
        role={role}
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />
    </>
  );
}

function Assignee({ task }: { task: Task }) {
  if (!task.assignedTo) return <span className="task-assignee">Unassigned</span>;
  return (
    <span className="task-assignee">
      <UserAvatar user={task.assignedTo} small />
      <span>{displayName(task.assignedTo)}</span>
    </span>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-[35px] w-[150px] text-xs" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map(([optionValue, optionLabel]) => (
          <SelectItem key={optionValue} value={optionValue}>
            {optionLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
