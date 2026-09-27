"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileText, Plus, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/plane/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/api";
import { canManageProject, displayName, timeAgo } from "@/lib/format";
import { useCreateNote, useDeleteNote, useNotes, useUpdateNote } from "@/lib/queries";
import type { Note, ProjectRole } from "@/lib/types";

// Notes are plain text. The first line doubles as the card heading.
function splitNote(content: string) {
  const [first, ...rest] = content.split("\n");
  return { heading: first.slice(0, 80) || "Untitled note", body: rest.join("\n").trim() };
}

export function NotesTab({ projectId, role }: { projectId: string; role: ProjectRole }) {
  const notes = useNotes(projectId);
  const isAdmin = canManageProject(role);
  // null = closed, "new" = creating, a note = viewing or editing it.
  const [open, setOpen] = useState<Note | "new" | null>(null);

  return (
    <>
      {isAdmin && (
        <div className="workspace-controls">
          <Button className="ml-auto" onClick={() => setOpen("new")}>
            <Plus size={15} />
            New note
          </Button>
        </div>
      )}

      {notes.isPending && <p className="text-sm text-slate-400">Loading notes…</p>}
      {notes.isError && <p className="form-error">{errorMessage(notes.error)}</p>}

      {notes.data && notes.data.length === 0 && (
        <div className="workspace-empty">
          <FileText size={25} />
          <strong>No notes yet</strong>
          <p>{isAdmin ? "Keep important context close to your work." : "Notes shared by your Admins will show up here."}</p>
        </div>
      )}

      {notes.data && notes.data.length > 0 && (
        <div className="notes-grid">
          {notes.data.map((note) => {
            const { heading, body } = splitNote(note.content);
            return (
              <button className="workspace-note" key={note.id} onClick={() => setOpen(note)}>
                <FileText size={22} />
                <h3 className="break-words">{heading}</h3>
                <p className="line-clamp-6 break-words">{body || " "}</p>
                <small>
                  {displayName(note.createdBy)} · updated {timeAgo(note.updatedAt)}
                </small>
              </button>
            );
          })}
        </div>
      )}

      <NoteDialog projectId={projectId} note={open} isAdmin={isAdmin} onClose={() => setOpen(null)} />
    </>
  );
}

function NoteDialog({
  projectId,
  note,
  isAdmin,
  onClose,
}: {
  projectId: string;
  note: Note | "new" | null;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const create = useCreateNote(projectId);
  const update = useUpdateNote(projectId);
  const remove = useDeleteNote(projectId);
  const [text, setText] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [lastNote, setLastNote] = useState<Note | "new" | null>(null);

  // Load the note's text whenever a different note is opened.
  if (note !== lastNote) {
    setLastNote(note);
    setText(note && note !== "new" ? note.content : "");
  }

  const isNew = note === "new";
  const busy = create.isPending || update.isPending;

  async function save() {
    const content = text.trim();
    if (!content) return;
    try {
      if (isNew) {
        await create.mutateAsync(content);
        toast.success("Note created");
      } else if (note) {
        await update.mutateAsync({ noteId: note.id, content });
        toast.success("Note saved");
      }
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const title = isNew ? "New note" : note ? splitNote(note.content).heading : "";

  return (
    <Dialog open={note !== null} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="break-words">{title}</DialogTitle>
          <DialogDescription>
            {note && note !== "new"
              ? `By ${displayName(note.createdBy)} · updated ${timeAgo(note.updatedAt)}`
              : "The first line becomes the note’s heading."}
          </DialogDescription>
        </DialogHeader>
        {isAdmin ? (
          <>
            <Textarea
              aria-label="Note content"
              value={text}
              maxLength={5000}
              onChange={(event) => setText(event.target.value)}
              className="min-h-60 leading-7"
              placeholder="Write something your team should know…"
            />
            <p className="text-right text-[11px] text-slate-400">{text.length}/5000</p>
            <div className="form-buttons">
              {!isNew && (
                <Button variant="outline" className="mr-auto" onClick={() => setDeleteOpen(true)} disabled={busy}>
                  <Trash2 size={14} /> Delete
                </Button>
              )}
              <Button variant="outline" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={save} disabled={!text.trim() || busy}>
                {busy ? "Saving…" : "Save note"}
              </Button>
            </div>
          </>
        ) : (
          <p className="max-h-[60dvh] overflow-y-auto whitespace-pre-line break-words text-sm leading-7 text-slate-600">
            {note && note !== "new" ? note.content : ""}
          </p>
        )}
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete this note?"
          description="The note will be permanently deleted."
          onConfirm={async () => {
            if (!note || note === "new") return;
            await remove.mutateAsync(note.id);
            toast.success("Note deleted");
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
