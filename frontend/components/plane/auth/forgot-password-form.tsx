"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthLayout, FormMessage } from "@/components/plane/auth-layout";
import { errorMessage } from "@/lib/api";
import { useForgotPassword } from "@/lib/queries";

const schema = z.object({ email: z.string().trim().email("Enter a valid email address.") });
type Values = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const forgot = useForgotPassword();
  const [error, setError] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setError("");
    try {
      await forgot.mutateAsync(email);
      // The API answers the same whether or not the account exists.
      setSentMessage(
        "If an account exists for that email, a reset link is on its way. The link expires in 20 minutes.",
      );
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <AuthLayout title="Forgot your password?" description="Enter your email to get a password reset link.">
      <form onSubmit={onSubmit} noValidate>
        <label className="form-field">
          Email address
          <Input type="email" autoComplete="email" placeholder="you@example.com" {...form.register("email")} />
          {form.formState.errors.email && <span className="form-error">{form.formState.errors.email.message}</span>}
        </label>
        <FormMessage>{error}</FormMessage>
        <FormMessage tone="info">{sentMessage}</FormMessage>
        <Button type="submit" className="auth-submit" disabled={forgot.isPending}>
          {forgot.isPending ? "Sending…" : "Send reset link"}
          <ArrowRight size={16} />
        </Button>
        <p className="auth-switch">
          <Link href="/login">Back to log in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
