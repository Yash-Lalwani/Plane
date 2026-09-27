"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/api";
import { applyFieldErrors } from "@/lib/format";
import { useCreateProject, useUpdateProject } from "@/lib/queries";
import type { Project } from "@/lib/types";

const schema = z.object({
  name: z.string().trim().min(1, "Give your project a name.").max(100, "Keep the name under 100 characters."),
  description: z.string().trim().max(1000, "Keep the description under 1000 characters."),
});
type Values = z.infer<typeof schema>;

// Creates a project, or edits one when `project` is given.
export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
}) {
  const router = useRouter();
  const create = useCreateProject();
  const update = useUpdateProject(project?.id ?? "");
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: "", description: "" } });

  useEffect(() => {
    if (open) form.reset({ name: project?.name ?? "", description: project?.description ?? "" });
  }, [open, project, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (project) {
        await update.mutateAsync({ name: values.name, description: values.description || null });
        toast.success("Project updated");
        onOpenChange(false);
      } else {
        const created = await create.mutateAsync({
          name: values.name,
          description: values.description || undefined,
        });
        toast.success("Project created");
        onOpenChange(false);
        router.push(`/projects/${created.id}`);
      }
    } catch (error) {
      if (!applyFieldErrors(error, form.setError, ["name", "description"])) toast.error(errorMessage(error));
    }
  });

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{project ? "Edit project" : "Create a project"}</DialogTitle>
          <DialogDescription>
            {project ? "Update the name and description." : "You’ll be its Admin. Invite your team next."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <label className="form-field">
            Project name
            <Input autoFocus placeholder="Website relaunch" {...form.register("name")} />
            {form.formState.errors.name && <span className="form-error">{form.formState.errors.name.message}</span>}
          </label>
          <label className="form-field">
            <span>Description <span className="text-slate-400">(optional)</span></span>
            <Textarea placeholder="What is this project about?" rows={4} {...form.register("description")} />
            {form.formState.errors.description && (
              <span className="form-error">{form.formState.errors.description.message}</span>
            )}
          </label>
          <div className="form-buttons">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : project ? "Save changes" : "Create project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
