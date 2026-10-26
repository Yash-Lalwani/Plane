import { Skeleton } from "@/components/ui/skeleton";

export function ShellLoading() {
  return (
    <div className="workspace-root" aria-label="Loading your workspace">
      <div className="demo-bar" />
      <div className="flex h-[calc(100dvh-32px)]">
        <aside className="hidden w-[225px] shrink-0 border-r border-[#e8eaf0] p-5 md:block">
          <Skeleton className="mb-12 h-8 w-28" />
          <Skeleton className="mb-4 h-8 w-full" />
          <Skeleton className="mb-9 h-8 w-full" />
          <Skeleton className="mb-4 h-4 w-20" />
          <Skeleton className="h-8 w-full" />
        </aside>
        <div className="workspace-content">
          <header className="workspace-top"><Skeleton className="h-5 w-32" /></header>
          <main className="workspace-main"><ContentLoading /></main>
        </div>
      </div>
    </div>
  );
}

export function ContentLoading() {
  return (
    <div aria-label="Loading content" className="space-y-5">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-72 max-w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  );
}
