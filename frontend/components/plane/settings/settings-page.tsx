"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, Mail, Upload } from "lucide-react";
import { AppShell } from "@/components/plane/app-shell";
import { UserAvatar } from "@/components/plane/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/api";
import { applyFieldErrors, formatDateTime } from "@/lib/format";
import {
  useChangePassword,
  useCurrentUser,
  useResendVerification,
  useUpdateProfile,
  useUploadAvatar,
} from "@/lib/queries";
import type { User } from "@/lib/types";

export function SettingsPage() {
  return (
    <AppShell section="settings" requireVerified={false} header={<strong>Settings</strong>}>
      <SettingsContent />
    </AppShell>
  );
}

function SettingsContent() {
  const currentUser = useCurrentUser();
  if (!currentUser.data) return null;
  const user = currentUser.data;

  return (
    <>
      <div className="workspace-title">
        <div>
          <h1>Settings</h1>
          <p>Your profile, avatar and password.</p>
        </div>
      </div>
      <div className="flex max-w-2xl flex-col gap-6">
        <AccountPanel user={user} />
        <AvatarPanel user={user} />
        <ProfilePanel user={user} />
        <PasswordPanel />
      </div>
    </>
  );
}

function AccountPanel({ user }: { user: User }) {
  const resend = useResendVerification();
  return (
    <section className="workspace-panel">
      <h3>Account</h3>
      <p className="text-sm text-slate-600">{user.email}</p>
      <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
        {user.isEmailVerified ? (
          <>
            <CheckCircle2 size={14} className="text-emerald-600" /> Email verified
          </>
        ) : (
          <>
            <Mail size={14} /> Email not verified. Projects unlock once it is.
          </>
        )}
      </p>
      {!user.isEmailVerified && (
        <Button
          className="mt-4"
          size="sm"
          disabled={resend.isPending}
          onClick={() =>
            resend.mutate(undefined, {
              onSuccess: () => toast.success("Verification email sent"),
              onError: (error) => toast.error(errorMessage(error)),
            })
          }
        >
          {resend.isPending ? "Sending…" : "Resend verification email"}
        </Button>
      )}
      <p className="mt-4 text-xs text-slate-400">Member since {formatDateTime(user.createdAt)}</p>
    </section>
  );
}

const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

function AvatarPanel({ user }: { user: User }) {
  const upload = useUploadAvatar();
  const inputRef = useRef<HTMLInputElement>(null);

  function onFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    // Same limits as the API: one image, JPEG/PNG/WEBP, up to 2 MB.
    if (!AVATAR_TYPES.includes(file.type)) {
      toast.error("Use a JPEG, PNG or WEBP image.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error("The image must be 2 MB or smaller.");
      return;
    }
    upload.mutate(file, {
      onSuccess: () => toast.success("Avatar updated"),
      onError: (error) => toast.error(errorMessage(error)),
    });
  }

  return (
    <section className="workspace-panel">
      <h3>Avatar</h3>
      <div className="flex items-center gap-4">
        <span className="scale-150">
          <UserAvatar user={user} />
        </span>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={AVATAR_TYPES.join(",")}
            className="hidden"
            onChange={onFileChosen}
          />
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
            <Upload size={14} />
            {upload.isPending ? "Uploading…" : user.avatarUrl ? "Replace avatar" : "Upload avatar"}
          </Button>
          <p className="mt-2 text-[11px] text-slate-400">JPEG, PNG or WEBP, up to 2 MB.</p>
        </div>
      </div>
    </section>
  );
}

const profileSchema = z.object({
  fullName: z.string().trim().max(100, "Keep your name under 100 characters."),
  username: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters.")
    .max(30, "Use no more than 30 characters.")
    .regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers, and underscores only."),
});
type ProfileValues = z.infer<typeof profileSchema>;

function ProfilePanel({ user }: { user: User }) {
  const update = useUpdateProfile();
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user.fullName ?? "", username: user.username },
  });

  useEffect(() => {
    form.reset({ fullName: user.fullName ?? "", username: user.username });
  }, [user.fullName, user.username, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      // An empty name clears it (null); usernames are saved in lowercase by the API.
      await update.mutateAsync({ fullName: values.fullName || null, username: values.username });
      toast.success("Profile saved");
    } catch (error) {
      if (!applyFieldErrors(error, form.setError, ["fullName", "username"])) {
        form.setError("root", { message: errorMessage(error) });
      }
    }
  });

  return (
    <section className="workspace-panel">
      <h3>Profile</h3>
      <form onSubmit={onSubmit} noValidate>
        <label className="form-field">
          <span>Full name <span className="text-slate-400">(optional)</span></span>
          <Input autoComplete="name" {...form.register("fullName")} />
          {form.formState.errors.fullName && (
            <span className="form-error">{form.formState.errors.fullName.message}</span>
          )}
        </label>
        <label className="form-field">
          Username
          <Input autoComplete="username" {...form.register("username")} />
          {form.formState.errors.username && (
            <span className="form-error">{form.formState.errors.username.message}</span>
          )}
        </label>
        {form.formState.errors.root && <p className="form-error">{form.formState.errors.root.message}</p>}
        <div className="form-buttons">
          <Button type="submit" disabled={update.isPending || !form.formState.isDirty}>
            {update.isPending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>
    </section>
  );
}

const passwordSchema = z
  .object({
    oldPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(8, "Use at least 8 characters.").max(72, "Use no more than 72 characters."),
    confirm: z.string(),
  })
  .refine((values) => values.newPassword === values.confirm, {
    path: ["confirm"],
    message: "The passwords don’t match.",
  });
type PasswordValues = z.infer<typeof passwordSchema>;

function PasswordPanel() {
  const change = useChangePassword();
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { oldPassword: "", newPassword: "", confirm: "" },
  });

  const onSubmit = form.handleSubmit(async ({ oldPassword, newPassword }) => {
    try {
      await change.mutateAsync({ oldPassword, newPassword });
      toast.success("Password changed");
      form.reset();
    } catch (error) {
      // A wrong current password comes back as a 400 with a clear message.
      if (!applyFieldErrors(error, form.setError, ["oldPassword", "newPassword"])) {
        form.setError("root", { message: errorMessage(error) });
      }
    }
  });

  return (
    <section className="workspace-panel">
      <h3>Change password</h3>
      <form onSubmit={onSubmit} noValidate>
        <label className="form-field">
          Current password
          <Input type="password" autoComplete="current-password" {...form.register("oldPassword")} />
          {form.formState.errors.oldPassword && (
            <span className="form-error">{form.formState.errors.oldPassword.message}</span>
          )}
        </label>
        <label className="form-field">
          New password
          <Input type="password" autoComplete="new-password" {...form.register("newPassword")} />
          {form.formState.errors.newPassword && (
            <span className="form-error">{form.formState.errors.newPassword.message}</span>
          )}
        </label>
        <label className="form-field">
          Confirm new password
          <Input type="password" autoComplete="new-password" {...form.register("confirm")} />
          {form.formState.errors.confirm && (
            <span className="form-error">{form.formState.errors.confirm.message}</span>
          )}
        </label>
        {form.formState.errors.root && <p className="form-error">{form.formState.errors.root.message}</p>}
        <div className="form-buttons">
          <Button type="submit" disabled={change.isPending}>
            {change.isPending ? "Saving…" : "Change password"}
          </Button>
        </div>
      </form>
    </section>
  );
}
