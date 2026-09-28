"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthLayout, FormMessage } from "@/components/plane/auth-layout";
import { DEMO_EMAIL, DEMO_PASSWORD, DemoAccountNotice } from "./demo-account-notice";
import { errorMessage } from "@/lib/api";
import { useLogin } from "@/lib/queries";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
type Values = z.infer<typeof schema>;

export function LoginForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const login = useLogin();
  const [error, setError] = useState("");
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const onSubmit = form.handleSubmit(async (values) => {
    setError("");
    try {
      await login.mutateAsync(values);
      router.replace(returnTo);
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  const registerHref = returnTo === "/projects" ? "/register" : `/register?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <AuthLayout
      title="Welcome back."
      description="Your projects, your people, your next step."
      notice={<DemoAccountNotice />}
    >
      <form onSubmit={onSubmit} noValidate>
        <label className="form-field">
          Email address
          <Input type="email" autoComplete="email" placeholder={DEMO_EMAIL} {...form.register("email")} />
          {form.formState.errors.email && <span className="form-error">{form.formState.errors.email.message}</span>}
        </label>
        <label className="form-field">
          Password
          <Input
            type="password"
            autoComplete="current-password"
            placeholder={DEMO_PASSWORD}
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <span className="form-error">{form.formState.errors.password.message}</span>
          )}
        </label>
        <Link href="/forgot-password" className="auth-link">
          Forgot password?
        </Link>
        <FormMessage>{error}</FormMessage>
        <Button type="submit" className="auth-submit" disabled={login.isPending}>
          {login.isPending ? "Logging in…" : "Log in"}
          <ArrowRight size={16} />
        </Button>
        <p className="auth-switch">
          New here? <Link href={registerHref}>Create an account</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
