"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { FolderKanban, Plus, Users } from "lucide-react";
import { UserAvatar } from "@/components/plane/user-avatar";
import { ContentLoading } from "@/components/plane/workspace-loading";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api";
import { displayName, roleLabels } from "@/lib/format";
import { useProjects } from "@/lib/queries";

const ProjectFormDialog = dynamic(() => import("./project-form-dialog").then((module) => module.ProjectFormDialog));

export function ProjectsHome() {
  return <ProjectsList />;
}

function ProjectsList() {
  const projects = useProjects();
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoaded, setCreateLoaded] = useState(false);

  function openCreate() {
    setCreateLoaded(true);
    setCreateOpen(true);
  }

  return (
    <>
      <div className="workspace-title">
        <div>
          <h1>Your projects</h1>
          <p>Every project you belong to, with your role in it.</p>
        </div>
        <Button className="bg-[#287eb2] hover:bg-[#216a97]" onClick={openCreate}>
          <Plus size={15} />
          New project
        </Button>
      </div>

      {projects.isPending && <ContentLoading />}
      {projects.isError && <p className="form-error">{errorMessage(projects.error)}</p>}

      {projects.data && projects.data.length === 0 && (
        <div className="workspace-empty">
          <FolderKanban size={25} />
          <strong>No projects yet</strong>
          <p>Create your first project, or accept an invitation from a teammate.</p>
          <Button className="mt-5" onClick={openCreate}>
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

      {createLoaded && <ProjectFormDialog open={createOpen} onOpenChange={setCreateOpen} />}
    </>
  );
}
