"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthLayout, FormMessage } from "@/components/plane/auth-layout";
import { UserAvatar } from "@/components/plane/user-avatar";
import { ApiError, errorMessage } from "@/lib/api";
import { displayName, formatDateTime, isPast, roleLabels } from "@/lib/format";
import {
  useAcceptInvitation,
  useCurrentUser,
  useInvitationPreview,
  useLogout,
  useResendVerification,
} from "@/lib/queries";

export function InvitationView({ token }: { token: string }) {
  const router = useRouter();
  const preview = useInvitationPreview(token);
  const currentUser = useCurrentUser();
  const accept = useAcceptInvitation();
  const logout = useLogout();
  const resend = useResendVerification();
  const [error, setError] = useState("");

  const returnTo = `/invitations/${encodeURIComponent(token)}`;

  if (preview.isPending) {
    return (
      <AuthLayout icon={<Users />} title="Your team is waiting." description="Loading your invitation…">
        <FormMessage tone="info">Loading invitation details…</FormMessage>
      </AuthLayout>
    );
  }

  if (preview.isError) {
    const notFound = preview.error instanceof ApiError && preview.error.status === 404;
    return (
      <AuthLayout
        icon={<Users />}
        title="Invitation not found."
        description={notFound ? "This invitation link isn’t valid. Ask the project Admin to send a new one." : undefined}
      >
        {!notFound && <FormMessage>{errorMessage(preview.error)}</FormMessage>}
        <Button asChild className="auth-submit">
          <Link href="/">
            Back to Plane <ArrowRight size={16} />
          </Link>
        </Button>
      </AuthLayout>
    );
  }

  const invitation = preview.data;
  const expired = invitation.status === "PENDING" && isPast(invitation.expiresAt);
  const user = currentUser.data;

  const details = (
    <div className="token-details">
      <span>Invitation to</span>
      <strong>{invitation.project.name}</strong>
      <span className="flex items-center gap-2 mt-2">
        <UserAvatar user={invitation.invitedBy} small />
        {displayName(invitation.invitedBy)} invited {invitation.email} as {roleLabels[invitation.role]}.
      </span>
    </div>
  );

  async function onAccept() {
    setError("");
    try {
      const result = await accept.mutateAsync(token);
      toast.success(`You joined ${result.project.name}`);
      router.push(`/projects/${result.projectId}`);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function onSwitchAccount() {
    await logout.mutateAsync().catch(() => undefined);
    router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  let body: React.ReactNode;
  if (invitation.status === "ACCEPTED") {
    body = (
      <>
        <FormMessage tone="info">This invitation has already been accepted.</FormMessage>
        <Button asChild className="auth-submit">
          <Link href={user ? `/projects/${invitation.project.id}` : "/login"}>
            {user ? "Open the project" : "Log in"} <ArrowRight size={16} />
          </Link>
        </Button>
      </>
    );
  } else if (invitation.status === "REVOKED") {
    body = <FormMessage>This invitation was revoked. Ask the project Admin for a new one.</FormMessage>;
  } else if (expired) {
    body = (
      <FormMessage>
        This invitation expired on {formatDateTime(invitation.expiresAt)}. Ask the project Admin to send a new one.
      </FormMessage>
    );
  } else if (currentUser.isPending) {
    body = <FormMessage tone="info">Checking your account…</FormMessage>;
  } else if (!user) {
    body = (
      <>
        <p className="auth-description">
          Log in or create an account with <strong>{invitation.email}</strong> to accept.
        </p>
        <Button asChild className="auth-submit">
          <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>
            Log in to continue <ArrowRight size={16} />
          </Link>
        </Button>
        <p className="auth-switch">
          New to Plane?{" "}
          <Link
            href={`/register?returnTo=${encodeURIComponent(returnTo)}&email=${encodeURIComponent(invitation.email)}`}
          >
            Create an account
          </Link>
        </p>
      </>
    );
  } else if (user.email !== invitation.email) {
    body = (
      <>
        <FormMessage>
          This invitation was sent to {invitation.email}, but you’re logged in as {user.email}.
        </FormMessage>
        <Button className="auth-submit" onClick={onSwitchAccount} disabled={logout.isPending}>
          Log out and switch account <ArrowRight size={16} />
        </Button>
      </>
    );
  } else if (!user.isEmailVerified) {
    body = (
      <>
        <FormMessage>Verify your email before accepting. Check your inbox for the verification link.</FormMessage>
        <Button
          className="auth-submit"
          disabled={resend.isPending || resend.isSuccess}
          onClick={() =>
            resend.mutate(undefined, {
              onSuccess: () => toast.success("Verification email sent"),
              onError: (err) => toast.error(errorMessage(err)),
            })
          }
        >
          {resend.isSuccess ? "Verification email sent" : "Resend verification email"}
        </Button>
      </>
    );
  } else {
    body = (
      <>
        <FormMessage>{error}</FormMessage>
        <Button className="auth-submit" onClick={onAccept} disabled={accept.isPending}>
          {accept.isPending ? "Joining…" : `Join ${invitation.project.name}`} <ArrowRight size={16} />
        </Button>
      </>
    );
  }

  return (
    <AuthLayout icon={<Users />} title="Your team is waiting." description="Review your project invitation and join your team.">
      {details}
      {body}
    </AuthLayout>
  );
}
