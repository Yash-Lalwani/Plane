import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

// The seeded demo account (verified, so no email confirmation is needed).
export const DEMO_EMAIL = "demo@plane.dev";
export const DEMO_PASSWORD = "DemoPass123!";

export function DemoAccountNotice({ loginHref }: { loginHref?: string }) {
  return (
    <div className="mb-8 rounded-lg border border-[#d6e6f3] bg-[#f1f7fc] p-4 text-[13px] text-[#4e7290]">
      <p className="flex items-center gap-2 text-sm font-medium text-[#2c5c88]">
        <Sparkles size={15} />
        Just exploring? Use the demo account
      </p>
      <p className="mt-1.5 leading-relaxed">
        No email verification needed. It’s already set up with projects, tasks and a team.
      </p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-[#7f9bb3]">Email</dt>
        <dd className="font-mono text-[#1f3f5c]">{DEMO_EMAIL}</dd>
        <dt className="text-[#7f9bb3]">Password</dt>
        <dd className="font-mono text-[#1f3f5c]">{DEMO_PASSWORD}</dd>
      </dl>
      {loginHref && (
        <Link
          href={loginHref}
          className="mt-3 inline-flex items-center gap-1.5 font-medium text-[#1775b0] hover:underline"
        >
          Log in with the demo account <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
