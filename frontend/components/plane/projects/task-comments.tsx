"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Send, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/plane/confirm-dialog";
import { UserAvatar } from "@/components/plane/user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/api";
import { canManageProject, displayName, timeAgo } from "@/lib/format";
import {
  useComments,
  useCreateComment,
  useCurrentUser,
  useDeleteComment,
  useUpdateComment,
} from "@/lib/queries";
import type { Comment, ProjectRole } from "@/lib/types";

export function CommentList({
  projectId,
  taskId,
  role,
  commentCount,
}: {
  projectId: string;
  taskId: string;
  role: ProjectRole;
  commentCount: number;
}) {
  const comments = useComments(projectId, taskId);
  const create = useCreateComment(projectId, taskId);
  const currentUser = useCurrentUser();
  const [content, setContent] = useState("");

  const items = comments.data?.pages.flatMap((page) => page.items) ?? [];

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = content.trim();
    if (!text) return;
    create.mutate(text, {
      onSuccess: () => setContent(""),
      onError: (error) => toast.error(errorMessage(error)),
    });
  }

  return (
    <div>
      <h3>
        Comments {commentCount > 0 && <span className="ml-2 text-slate-400">{commentCount}</span>}
      </h3>
      {comments.isPending && <p className="text-xs text-slate-400">Loading comments…</p>}
      {comments.isError && <p className="form-error">{errorMessage(comments.error)}</p>}
      {comments.data && items.length === 0 && <p className="text-xs text-slate-400">No comments yet.</p>}
      {items.map((comment) => (
        <CommentItem
          key={comment.id}
          projectId={projectId}
          taskId={taskId}
          comment={comment}
          canEdit={comment.authorId === currentUser.data?.id}
          canDelete={comment.authorId === currentUser.data?.id || canManageProject(role)}
        />
      ))}
      {comments.hasNextPage && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => comments.fetchNextPage()}
          disabled={comments.isFetchingNextPage}
        >
          {comments.isFetchingNextPage ? "Loading…" : "Show more comments"}
        </Button>
      )}
      <form className="comment-form" onSubmit={onSubmit}>
        <Textarea
          value={content}
          maxLength={5000}
          rows={2}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Add your thoughts…"
          aria-label="Comment"
        />
        <Button size="icon" type="submit" disabled={!content.trim() || create.isPending} aria-label="Post comment">
          <Send size={15} />
        </Button>
      </form>
    </div>
  );
}

function CommentItem({
  projectId,
  taskId,
  comment,
  canEdit,
  canDelete,
}: {
  projectId: string;
  taskId: string;
  comment: Comment;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const update = useUpdateComment(projectId, taskId);
  const remove = useDeleteComment(projectId, taskId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const edited = comment.updatedAt !== comment.createdAt;

  function save() {
    const text = draft.trim();
    if (!text) return;
    if (text === comment.content) {
      setEditing(false);
      return;
    }
    update.mutate(
      { commentId: comment.id, content: text },
      {
        onSuccess: () => setEditing(false),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  }

  return (
    <div className="detail-comment">
      <div className="flex items-center gap-2 text-xs">
        <UserAvatar user={comment.author} small />
        <strong className="font-medium">{displayName(comment.author)}</strong>
        <span className="text-slate-400">
          {timeAgo(comment.createdAt)}
          {edited && " · edited"}
        </span>
        <span className="ml-auto flex gap-1">
          {canEdit && !editing && (
            <Button size="icon-xs" variant="ghost" aria-label="Edit comment" onClick={() => setEditing(true)}>
              <Pencil size={12} />
            </Button>
          )}
          {canDelete && (
            <Button size="icon-xs" variant="ghost" aria-label="Delete comment" onClick={() => setDeleteOpen(true)}>
              <Trash2 size={12} />
            </Button>
          )}
        </span>
      </div>
      {editing ? (
        <div className="mt-2">
          <Textarea
            autoFocus
            rows={3}
            maxLength={5000}
            value={draft}
            aria-label="Edit comment"
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditing(false);
                setDraft(comment.content);
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={!draft.trim() || update.isPending}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-line break-words">{comment.content}</p>
      )}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this comment?"
        description="The comment will be permanently deleted."
        onConfirm={async () => {
          await remove.mutateAsync(comment.id);
          toast.success("Comment deleted");
        }}
      />
    </div>
  );
}
