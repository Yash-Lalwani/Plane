"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthLayout, FormMessage } from "@/components/plane/auth-layout";
import { errorMessage } from "@/lib/api";
import { useResetPassword } from "@/lib/queries";

const schema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters.").max(72, "Use no more than 72 characters."),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    path: ["confirm"],
    message: "The passwords don’t match.",
  });
type Values = z.infer<typeof schema>;

export function ResetPasswordForm({ token }: { token: string }) {
  const reset = useResetPassword();
  const [error, setError] = useState("");
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: "", confirm: "" } });

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setError("");
    try {
      await reset.mutateAsync({ token, password });
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  if (reset.isSuccess) {
    return (
      <AuthLayout
        icon={<KeyRound />}
        title="Password updated."
        description="Your new password is set. For your security, you’ve been signed out everywhere."
      >
        <Button asChild className="auth-submit">
          <Link href="/login">
            Log in <ArrowRight size={16} />
          </Link>
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout icon={<KeyRound />} title="A fresh start." description="Choose a new password for your Plane account.">
      <form onSubmit={onSubmit} noValidate>
        <label className="form-field">
          New password
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <span className="form-error">{form.formState.errors.password.message}</span>
          )}
        </label>
        <label className="form-field">
          Confirm new password
          <Input type="password" autoComplete="new-password" {...form.register("confirm")} />
          {form.formState.errors.confirm && (
            <span className="form-error">{form.formState.errors.confirm.message}</span>
          )}
        </label>
        <FormMessage>{error}</FormMessage>
        {error && (
          <p className="auth-switch">
            Need a new link? <Link href="/forgot-password">Request another reset email</Link>
          </p>
        )}
        <Button type="submit" className="auth-submit" disabled={reset.isPending}>
          {reset.isPending ? "Saving…" : "Set new password"}
          <ArrowRight size={16} />
        </Button>
      </form>
    </AuthLayout>
  );
}
