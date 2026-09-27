"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, UserMinus, Users } from "lucide-react";
import { ConfirmDialog } from "@/components/plane/confirm-dialog";
import { UserAvatar } from "@/components/plane/user-avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { errorMessage } from "@/lib/api";
import {
  applyFieldErrors,
  canManageProject,
  displayName,
  formatDateTime,
  isPast,
  roleDescriptions,
  roleLabels,
} from "@/lib/format";
import {
  useCreateInvitation,
  useCurrentUser,
  useInvitations,
  useMembers,
  useRemoveMember,
  useRevokeInvitation,
  useUpdateMemberRole,
} from "@/lib/queries";
import { PROJECT_ROLES, type Invitation, type Member, type ProjectRole } from "@/lib/types";

export function MembersTab({
  projectId,
  role,
  onInvite,
}: {
  projectId: string;
  role: ProjectRole;
  onInvite: () => void;
}) {
  const router = useRouter();
  const members = useMembers(projectId);
  const currentUser = useCurrentUser();
  const isAdmin = canManageProject(role);
  const invitations = useInvitations(projectId, isAdmin);
  const updateRole = useUpdateMemberRole(projectId);
  const removeMember = useRemoveMember(projectId);
  const revoke = useRevokeInvitation(projectId);
  const [toRemove, setToRemove] = useState<Member | null>(null);
  const [toRevoke, setToRevoke] = useState<Invitation | null>(null);

  function onRoleChange(member: Member, next: ProjectRole) {
    if (next === member.role) return;
    updateRole.mutate(
      { userId: member.user.id, role: next },
      {
        onSuccess: () => toast.success(`${displayName(member.user)} is now ${roleLabels[next]}`),
        // The API refuses to demote the last Admin and explains why.
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  }

  const isMe = (member: Member) => member.user.id === currentUser.data?.id;

  return (
    <>
      <div className="workspace-controls">
        <p className="text-sm text-slate-500">
          {members.data ? `${members.data.length} ${members.data.length === 1 ? "member" : "members"}` : ""}
        </p>
        {isAdmin && (
          <Button className="ml-auto" onClick={onInvite}>
            <Users size={15} />
            Invite someone
          </Button>
        )}
      </div>

      {members.isPending && <p className="text-sm text-slate-400">Loading members…</p>}
      {members.isError && <p className="form-error">{errorMessage(members.error)}</p>}

      <div className="member-grid">
        {members.data?.map((member) => (
          <div className="member-card" key={member.user.id}>
            <UserAvatar user={member.user} />
            <div className="min-w-0">
              <span className="block truncate">
                {displayName(member.user)}
                {isMe(member) && <span className="text-slate-400"> (you)</span>}
              </span>
              <small className="truncate">{member.user.email}</small>
              <small>Joined {formatDateTime(member.createdAt)}</small>
            </div>
            {isAdmin ? (
              <div className="flex items-center gap-1">
                <Select value={member.role} onValueChange={(next) => onRoleChange(member, next as ProjectRole)}>
                  <SelectTrigger size="sm" className="w-[130px] text-xs" aria-label={`Role of ${displayName(member.user)}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_ROLES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {roleLabels[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove ${displayName(member.user)}`}
                  onClick={() => setToRemove(member)}
                >
                  <UserMinus size={14} />
                </Button>
              </div>
            ) : (
              <span className="role-label">{roleLabels[member.role]}</span>
            )}
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="mt-10">
          <h3 className="mb-4 text-sm font-medium text-slate-600">Pending invitations</h3>
          {invitations.isPending && <p className="text-sm text-slate-400">Loading invitations…</p>}
          {invitations.isError && <p className="form-error">{errorMessage(invitations.error)}</p>}
          {invitations.data?.length === 0 && <p className="text-xs text-slate-400">No pending invitations.</p>}
          <div className="member-grid">
            {invitations.data?.map((invitation) => {
              const expired = isPast(invitation.expiresAt);
              return (
                <div className="member-card" key={invitation.id}>
                  <span className="avatar">
                    <Mail size={14} />
                  </span>
                  <div className="min-w-0">
                    <span className="block truncate">{invitation.email}</span>
                    <small>
                      {roleLabels[invitation.role]} · invited by {displayName(invitation.invitedBy)}
                    </small>
                    <small style={expired ? { color: "#c2410c" } : undefined}>
                      {expired ? "Expired" : "Expires"} {formatDateTime(invitation.expiresAt)}
                    </small>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setToRevoke(invitation)}>
                    Revoke
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toRemove)}
        onOpenChange={(open) => !open && setToRemove(null)}
        title={toRemove && isMe(toRemove) ? "Leave this project?" : `Remove ${toRemove ? displayName(toRemove.user) : ""}?`}
        description={
          toRemove && isMe(toRemove)
            ? "You’ll lose access to this project. Your tasks in it will become unassigned."
            : "They’ll lose access to this project, and their tasks in it will become unassigned."
        }
        confirmLabel="Remove"
        onConfirm={async () => {
          if (!toRemove) return;
          const leavingMyself = isMe(toRemove);
          await removeMember.mutateAsync(toRemove.user.id);
          toast.success(leavingMyself ? "You left the project" : `${displayName(toRemove.user)} was removed`);
          if (leavingMyself) router.replace("/projects");
        }}
      />
      <ConfirmDialog
        open={Boolean(toRevoke)}
        onOpenChange={(open) => !open && setToRevoke(null)}
        title="Revoke this invitation?"
        description={`The invitation link sent to ${toRevoke?.email ?? ""} will stop working.`}
        confirmLabel="Revoke"
        onConfirm={async () => {
          if (!toRevoke) return;
          await revoke.mutateAsync(toRevoke.id);
          toast.success("Invitation revoked");
        }}
      />
    </>
  );
}

const inviteSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  role: z.enum(["ADMIN", "PROJECT_ADMIN", "MEMBER"]),
});
type InviteValues = z.infer<typeof inviteSchema>;

export function InviteDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const invite = useCreateInvitation(projectId);
  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "MEMBER" },
  });

  useEffect(() => {
    if (open) form.reset({ email: "", role: "MEMBER" });
  }, [open, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await invite.mutateAsync(values);
      toast.success(`Invitation sent to ${values.email.trim().toLowerCase()}`);
      onOpenChange(false);
    } catch (error) {
      if (!applyFieldErrors(error, form.setError, ["email", "role"])) {
        form.setError("root", { message: errorMessage(error) });
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Better with your team</DialogTitle>
          <DialogDescription>
            We’ll email an invitation link that works for 7 days. They don’t need an account yet.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <label className="form-field">
            Email address
            <Input type="email" placeholder="teammate@example.com" autoFocus {...form.register("email")} />
            {form.formState.errors.email && (
              <span className="form-error">{form.formState.errors.email.message}</span>
            )}
          </label>
          <label className="form-field">
            Project role
            <Controller
              control={form.control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...PROJECT_ROLES].reverse().map((value) => (
                      <SelectItem key={value} value={value}>
                        {roleDescriptions[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </label>
          {form.formState.errors.root && <p className="form-error">{form.formState.errors.root.message}</p>}
          <div className="form-buttons">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={invite.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending ? "Sending…" : "Send invitation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
