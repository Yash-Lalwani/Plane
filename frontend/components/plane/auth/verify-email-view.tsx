"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthLayout, FormMessage } from "@/components/plane/auth-layout";
import { errorMessage } from "@/lib/api";
import { useVerifyEmail } from "@/lib/queries";

export function VerifyEmailView({ token }: { token: string }) {
  const { mutate, isPending, isSuccess, isError, error } = useVerifyEmail();
  // Verification tokens work once. The ref stops a second call if React runs the effect twice.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    mutate(token);
  }, [mutate, token]);

  if (isSuccess) {
    return (
      <AuthLayout icon={<Mail />} title="You’re verified." description="Your email is confirmed. Your projects are ready.">
        <Button asChild className="auth-submit">
          <Link href="/projects">
            Go to your projects <ArrowRight size={16} />
          </Link>
        </Button>
      </AuthLayout>
    );
  }

  if (isError) {
    return (
      <AuthLayout icon={<Mail />} title="This link didn’t work." description="Verification links expire after 20 minutes and can be used once.">
        <FormMessage>{errorMessage(error)}</FormMessage>
        <p className="auth-description">
          Log in and use “Resend verification email” to get a fresh link.
        </p>
        <Button asChild className="auth-submit">
          <Link href="/login">
            Log in <ArrowRight size={16} />
          </Link>
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout icon={<Mail />} title="Verifying your email…" description="One moment while we confirm your link.">
      <FormMessage tone="info">{isPending ? "Checking your verification link…" : "Starting…"}</FormMessage>
    </AuthLayout>
  );
}
