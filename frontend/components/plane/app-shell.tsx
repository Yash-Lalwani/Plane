"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronsUpDown, FolderKanban, LogOut, Mail, Plus, RefreshCw, Settings } from "lucide-react";
import { Brand } from "@/components/plane/brand";
import { UserAvatar } from "@/components/plane/user-avatar";
import { ProjectFormDialog } from "@/components/plane/projects/project-form-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ApiError, errorMessage } from "@/lib/api";
import { displayName } from "@/lib/format";
import { useCurrentUser, useLogout, useProjects, useResendVerification } from "@/lib/queries";
import type { User } from "@/lib/types";

type Section = "projects" | "settings" | "project";

// Signed-in frame: checks the session, gates unverified users, and shows the sidebar.
export function AppShell({
  section,
  activeProjectId,
  requireVerified = true,
  header,
  children,
}: {
  section: Section;
  activeProjectId?: string;
  requireVerified?: boolean;
  header?: React.ReactNode;
  children: React.ReactNode;
}) {
  const currentUser = useCurrentUser();

  if (currentUser.isPending) return <FullPageMessage>Loading your workspace…</FullPageMessage>;

  if (currentUser.isError) {
    // A 401 is handled globally (redirect to login); anything else is shown here.
    const expired = currentUser.error instanceof ApiError && currentUser.error.status === 401;
    return (
      <FullPageMessage>
        {expired ? "Your session has ended. Taking you to log in…" : errorMessage(currentUser.error)}
        {!expired && (
          <Button variant="outline" className="mt-5" onClick={() => currentUser.refetch()}>
            Try again
          </Button>
        )}
      </FullPageMessage>
    );
  }

  const user = currentUser.data;
  const gated = requireVerified && !user.isEmailVerified;

  return (
    <div className="workspace-root">
      <div className="demo-bar">
        <span>
          Signed in as {user.email}
          {!user.isEmailVerified && " · Email not verified"}
        </span>
      </div>
      <SidebarProvider style={{ "--sidebar-width": "225px" } as React.CSSProperties}>
        <AppSidebar user={user} section={section} activeProjectId={activeProjectId} />
        <div className="workspace-content">
          <header className="workspace-top">
            <SidebarTrigger />
            {gated ? <span>Verify your email</span> : header}
          </header>
          <main className="workspace-main">{gated ? <VerifyEmailGate user={user} /> : children}</main>
        </div>
      </SidebarProvider>
    </div>
  );
}

function AppSidebar({ user, section, activeProjectId }: { user: User; section: Section; activeProjectId?: string }) {
  const router = useRouter();
  const projects = useProjects(user.isEmailVerified);
  const logout = useLogout();
  const [createOpen, setCreateOpen] = useState(false);

  async function onLogout() {
    await logout.mutateAsync().catch(() => undefined);
    router.replace("/login");
  }

  return (
    <Sidebar>
      <div className="workspace-logo">
        <Brand />
        <p>YOUR WORKSPACE</p>
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="workspace-sidebar-button" isActive={section === "projects"}>
                <Link href="/projects">
                  <FolderKanban size={16} />
                  All projects
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="workspace-sidebar-button" isActive={section === "settings"}>
                <Link href="/settings">
                  <Settings size={16} />
                  Settings
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          {user.isEmailVerified && (
            <>
              <div className="workspace-sidebar-label">PROJECTS</div>
              <SidebarMenu>
                {projects.data?.map((project) => (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton
                      asChild
                      className="workspace-sidebar-button"
                      isActive={project.id === activeProjectId}
                    >
                      <Link href={`/projects/${project.id}`}>
                        <span className="project-mark">{project.name.trim()[0]?.toUpperCase() ?? "P"}</span>
                        <span className="truncate">{project.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {projects.isPending && <p className="px-4 text-xs text-slate-400">Loading projects…</p>}
                {projects.isError && <p className="px-4 text-xs text-slate-400">Couldn’t load projects.</p>}
                <SidebarMenuItem>
                  <SidebarMenuButton className="workspace-sidebar-button" onClick={() => setCreateOpen(true)}>
                    <Plus size={16} />
                    New project
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </>
          )}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="sidebar-person w-full text-left" aria-label="Account menu">
              <UserAvatar user={user} />
              <div className="min-w-0 flex-1">
                <span className="block truncate">{displayName(user)}</span>
                <small className="truncate">@{user.username}</small>
              </div>
              <ChevronsUpDown size={14} className="text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/settings")}>
              <Settings size={14} /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onLogout} disabled={logout.isPending}>
              <LogOut size={14} /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <ProjectFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </Sidebar>
  );
}

function VerifyEmailGate({ user }: { user: User }) {
  const currentUser = useCurrentUser();
  const resend = useResendVerification();

  return (
    <div className="workspace-empty">
      <Mail size={25} />
      <strong>Verify your email to open your projects</strong>
      <p>
        We sent a verification link to {user.email}. It expires after 20 minutes. Projects unlock as soon as your email
        is verified.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Button
          onClick={() =>
            resend.mutate(undefined, {
              onSuccess: () => toast.success("Verification email sent"),
              onError: (error) => toast.error(errorMessage(error)),
            })
          }
          disabled={resend.isPending}
        >
          <Mail size={15} />
          {resend.isPending ? "Sending…" : "Resend verification email"}
        </Button>
        <Button variant="outline" onClick={() => currentUser.refetch()} disabled={currentUser.isFetching}>
          <RefreshCw size={15} />
          I’ve verified my email
        </Button>
      </div>
    </div>
  );
}

function FullPageMessage({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center text-sm text-slate-500">
      <Brand />
      <div className="flex flex-col items-center">{children}</div>
    </main>
  );
}
