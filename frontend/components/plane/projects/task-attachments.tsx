"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, ImageIcon, Paperclip, Trash2, Upload } from "lucide-react";
import { ConfirmDialog } from "@/components/plane/confirm-dialog";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api";
import { canManageTasks, fileSize } from "@/lib/format";
import { useDeleteAttachment, useUploadAttachments } from "@/lib/queries";
import type { Attachment, ProjectRole, TaskDetail } from "@/lib/types";

// The API's limits: up to 5 files per upload, 5 MB each, these types only.
const MAX_FILES = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain"];

function validate(files: File[]): string | null {
  if (files.length > MAX_FILES) return `You can upload up to ${MAX_FILES} files at a time.`;
  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) return `“${file.name}” isn’t allowed. Use JPEG, PNG, WEBP, PDF or plain text.`;
    if (file.size > MAX_BYTES) return `“${file.name}” is larger than 5 MB.`;
  }
  return null;
}

export function AttachmentList({ projectId, task, role }: { projectId: string; task: TaskDetail; role: ProjectRole }) {
  const upload = useUploadAttachments(projectId, task.id);
  const remove = useDeleteAttachment(projectId, task.id);
  const inputRef = useRef<HTMLInputElement>(null);
  const [toDelete, setToDelete] = useState<Attachment | null>(null);
  const canEdit = canManageTasks(role);

  function onFilesChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // allow choosing the same file again later
    if (files.length === 0) return;
    const problem = validate(files);
    if (problem) {
      toast.error(problem);
      return;
    }
    upload.mutate(files, {
      onSuccess: (uploaded) => toast.success(`${uploaded.length} ${uploaded.length === 1 ? "file" : "files"} uploaded`),
      onError: (error) => toast.error(errorMessage(error)),
    });
  }

  return (
    <div>
      <h3>Attachments</h3>
      {task.attachments.length === 0 && (
        <p className="flex items-center gap-2 text-xs text-slate-400">
          <Paperclip size={14} />
          No files attached
        </p>
      )}
      <div className="flex flex-col gap-2">
        {task.attachments.map((attachment) => (
          <div key={attachment.id} className="file-chip w-full justify-between !text-xs">
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 items-center gap-2 hover:underline"
              title={`Open ${attachment.fileName}`}
            >
              {attachment.mimeType.startsWith("image/") ? <ImageIcon size={14} /> : <FileText size={14} />}
              <span className="truncate">{attachment.fileName}</span>
              <span className="shrink-0 text-slate-400">{fileSize(attachment.size)}</span>
            </a>
            {canEdit && (
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label={`Delete ${attachment.fileName}`}
                onClick={() => setToDelete(attachment)}
              >
                <Trash2 size={12} />
              </Button>
            )}
          </div>
        ))}
      </div>
      {canEdit && (
        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ALLOWED_TYPES.join(",")}
            className="hidden"
            onChange={onFilesChosen}
          />
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => inputRef.current?.click()}
            disabled={upload.isPending}
          >
            <Upload size={14} />
            {upload.isPending ? "Uploading…" : "Upload files"}
          </Button>
          <p className="mt-2 text-[11px] text-slate-400">Up to 5 files, 5 MB each: JPEG, PNG, WEBP, PDF or text.</p>
        </>
      )}
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete this file?"
        description={`“${toDelete?.fileName ?? ""}” will be permanently deleted.`}
        onConfirm={async () => {
          if (!toDelete) return;
          await remove.mutateAsync(toDelete.id);
          toast.success("File deleted");
        }}
      />
    </div>
  );
}
