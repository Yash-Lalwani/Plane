"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Activity, FileText, FolderX, Home, LayoutGrid, MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";
import { ConfirmDialog } from "@/components/plane/confirm-dialog";
import { OverviewTab } from "@/components/plane/projects/overview-tab";
import { TasksTab } from "@/components/plane/projects/tasks-tab";
import { UserAvatar } from "@/components/plane/user-avatar";
import { ContentLoading } from "@/components/plane/workspace-loading";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError, errorMessage } from "@/lib/api";
import { canManageProject, roleLabels } from "@/lib/format";
import { type ProjectTab } from "@/lib/project-tabs";
import { useDeleteProject, useMembers, useProject } from "@/lib/queries";

const ActivityTab = dynamic(() => import("./activity-tab").then((module) => module.ActivityTab));
const MembersTab = dynamic(() => import("./members-tab").then((module) => module.MembersTab));
const InviteDialog = dynamic(() => import("./members-tab").then((module) => module.InviteDialog));
const NotesTab = dynamic(() => import("./notes-tab").then((module) => module.NotesTab));
const ProjectFormDialog = dynamic(() => import("./project-form-dialog").then((module) => module.ProjectFormDialog));

const PROJECT_TABS: { id: ProjectTab; label: string; icon: typeof Home }[] = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "tasks", label: "Tasks", icon: LayoutGrid },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "members", label: "Members", icon: Users },
  { id: "activity", label: "Activity", icon: Activity },
];

export function ProjectWorkspace({ projectId, initialTab }: { projectId: string; initialTab: ProjectTab }) {
  return <ProjectContent projectId={projectId} initialTab={initialTab} />;
}

function ProjectContent({ projectId, initialTab }: { projectId: string; initialTab: ProjectTab }) {
  const router = useRouter();
  const project = useProject(projectId);
  const members = useMembers(projectId);
  const deleteProject = useDeleteProject(projectId);
  const [tab, setTab] = useState<ProjectTab>(initialTab);
  const [editOpen, setEditOpen] = useState(false);
  const [editLoaded, setEditLoaded] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLoaded, setInviteLoaded] = useState(false);

  function openInvite() {
    setInviteLoaded(true);
    setInviteOpen(true);
  }

  function openEdit() {
    setEditLoaded(true);
    setEditOpen(true);
  }

  function changeTab(next: string) {
    setTab(next as ProjectTab);
    window.history.replaceState(null, "", `/projects/${projectId}?tab=${next}`);
  }

  if (project.isPending) return <ContentLoading />;

  if (project.isError) {
    const notFound = project.error instanceof ApiError && project.error.status === 404;
    return (
      <div className="workspace-empty">
        <FolderX size={25} />
        <strong>{notFound ? "Project not found" : "Couldn’t load this project"}</strong>
        <p>
          {notFound
            ? "It may have been deleted, or you’re no longer a member."
            : errorMessage(project.error)}
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link href="/projects">Back to your projects</Link>
        </Button>
      </div>
    );
  }

  const data = project.data;
  const isAdmin = canManageProject(data.role);

  return (
    <>
      <div className="workspace-title">
        <div className="min-w-0">
          <h1 className="break-words">{data.name}</h1>
          <p>{data.description || "No description yet."}</p>
          <p className="!mt-2 text-xs">Your role: {roleLabels[data.role]}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="avatar-stack">
            {members.data?.slice(0, 5).map((member) => (
              <UserAvatar key={member.user.id} user={member.user} small />
            ))}
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={openInvite}>
              <Users size={14} />
              Invite
            </Button>
          )}
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label="Project options">
                  <MoreHorizontal size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={openEdit}>
                  <Pencil size={14} /> Edit project
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                  <Trash2 size={14} /> Delete project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={changeTab} className="workspace-tabs">
        <TabsList variant="line">
          {PROJECT_TABS.map((item) => (
            <TabsTrigger key={item.id} value={item.id}>
              <item.icon size={14} />
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tab === "overview" && <OverviewTab projectId={projectId} />}
      {tab === "tasks" && <TasksTab projectId={projectId} role={data.role} />}
      {tab === "notes" && <NotesTab projectId={projectId} role={data.role} />}
      {tab === "members" && (
        <MembersTab projectId={projectId} role={data.role} onInvite={openInvite} />
      )}
      {tab === "activity" && <ActivityTab projectId={projectId} />}

      {editLoaded && <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={data} />}
      {inviteLoaded && <InviteDialog projectId={projectId} open={inviteOpen} onOpenChange={setInviteOpen} />}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete “${data.name}”?`}
        description="This permanently deletes the project with all its tasks, subtasks, attachments, comments, notes, members and activity. This can’t be undone."
        confirmLabel="Delete project"
        onConfirm={async () => {
          await deleteProject.mutateAsync();
          toast.success("Project deleted");
          router.replace("/projects");
        }}
      />
    </>
  );
}
