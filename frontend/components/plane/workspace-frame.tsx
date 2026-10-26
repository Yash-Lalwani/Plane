"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const AppShell = dynamic(() => import("./app-shell").then((module) => module.AppShell));

export function WorkspaceFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const protectedPage = pathname === "/projects" || pathname.startsWith("/projects/") || pathname === "/settings";
  return protectedPage ? <AppShell>{children}</AppShell> : children;
}
