"use client";

import Link from "next/link";
import { useState } from "react";
import { FolderKanban, Plus, Users } from "lucide-react";
import { AppShell } from "@/components/plane/app-shell";
import { ProjectFormDialog } from "@/components/plane/projects/project-form-dialog";
import { UserAvatar } from "@/components/plane/user-avatar";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api";
import { displayName, roleLabels } from "@/lib/format";
import { useProjects } from "@/lib/queries";

export function ProjectsHome() {
  return (
    <AppShell section="projects" header={<strong>All projects</strong>}>
      <ProjectsList />
    </AppShell>
  );
}

function ProjectsList() {
  const projects = useProjects();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <div className="workspace-title">
        <div>
          <h1>Your projects</h1>
          <p>Every project you belong to, with your role in it.</p>
        </div>
        <Button className="bg-[#287eb2] hover:bg-[#216a97]" onClick={() => setCreateOpen(true)}>
          <Plus size={15} />
          New project
        </Button>
      </div>

      {projects.isPending && <p className="text-sm text-slate-400">Loading projects…</p>}
      {projects.isError && <p className="form-error">{errorMessage(projects.error)}</p>}

      {projects.data && projects.data.length === 0 && (
        <div className="workspace-empty">
          <FolderKanban size={25} />
          <strong>No projects yet</strong>
          <p>Create your first project, or accept an invitation from a teammate.</p>
          <Button className="mt-5" onClick={() => setCreateOpen(true)}>
            <Plus size={15} />
            Create a project
          </Button>
        </div>
      )}

      {projects.data && projects.data.length > 0 && (
        <div className="notes-grid">
          {projects.data.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} className="workspace-note block">
              <div className="flex items-center justify-between">
                <span className="project-mark">{project.name.trim()[0]?.toUpperCase() ?? "P"}</span>
                <span className="role-label">{roleLabels[project.role]}</span>
              </div>
              <h3 className="mt-5">{project.name}</h3>
              <p>{project.description || "No description yet."}</p>
              <small className="flex items-center gap-2">
                <Users size={13} />
                {project.memberCount} {project.memberCount === 1 ? "member" : "members"} · created by{" "}
                <UserAvatar user={project.createdBy} small />
                {displayName(project.createdBy)}
              </small>
            </Link>
          ))}
        </div>
      )}

      <ProjectFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
