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
import { errorMessage } from "@/lib/api";
import { applyFieldErrors } from "@/lib/format";
import { useLogin, useRegister } from "@/lib/queries";

// Same rules as the API. Usernames are saved in lowercase.
const schema = z.object({
  fullName: z.string().trim().max(100, "Keep your name under 100 characters."),
  username: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters.")
    .max(30, "Use no more than 30 characters.")
    .regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers, and underscores only."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters.").max(72, "Use no more than 72 characters."),
});
type Values = z.infer<typeof schema>;

export function RegisterForm({ returnTo, email }: { returnTo: string; email?: string }) {
  const router = useRouter();
  const registerUser = useRegister();
  const login = useLogin();
  const [error, setError] = useState("");
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", username: "", email: email ?? "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError("");
    try {
      await registerUser.mutateAsync({
        email: values.email,
        username: values.username,
        password: values.password,
        fullName: values.fullName || undefined,
      });
    } catch (err) {
      if (!applyFieldErrors(err, form.setError, ["email", "username", "password", "fullName"])) {
        setError(errorMessage(err));
      }
      return;
    }

    // Registering doesn't sign in, so log in right away. The app then asks to verify the email.
    try {
      await login.mutateAsync({ email: values.email, password: values.password });
      router.replace(returnTo);
    } catch (err) {
      setError(`Your account was created, but signing in failed: ${errorMessage(err)} Please log in.`);
    }
  });

  const busy = registerUser.isPending || login.isPending;
  const loginHref = returnTo === "/projects" ? "/login" : `/login?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <AuthLayout title="Make room for great work." description="Your next great project starts right here.">
      <form onSubmit={onSubmit} noValidate>
        <label className="form-field">
          <span>Full name <span className="text-slate-400">(optional)</span></span>
          <Input autoComplete="name" placeholder="Jane Doe" {...form.register("fullName")} />
          {form.formState.errors.fullName && (
            <span className="form-error">{form.formState.errors.fullName.message}</span>
          )}
        </label>
        <label className="form-field">
          Username
          <Input autoComplete="username" placeholder="your_name" {...form.register("username")} />
          {form.formState.errors.username && (
            <span className="form-error">{form.formState.errors.username.message}</span>
          )}
        </label>
        <label className="form-field">
          Email address
          <Input type="email" autoComplete="email" placeholder="you@example.com" {...form.register("email")} />
          {form.formState.errors.email && <span className="form-error">{form.formState.errors.email.message}</span>}
        </label>
        <label className="form-field">
          Password
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
        <FormMessage>{error}</FormMessage>
        <Button type="submit" className="auth-submit" disabled={busy}>
          {busy ? "Creating your account…" : "Create your account"}
          <ArrowRight size={16} />
        </Button>
        <p className="auth-switch">
          Already have an account? <Link href={loginHref}>Log in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
