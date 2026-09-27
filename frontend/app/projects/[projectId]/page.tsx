import { ProjectWorkspace } from "@/components/plane/projects/project-workspace";
import { firstParam, type SearchParams } from "@/lib/params";
import { isProjectTab } from "@/lib/project-tabs";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: SearchParams;
}) {
  const { projectId } = await params;
  const tab = firstParam((await searchParams).tab);
  return <ProjectWorkspace projectId={projectId} initialTab={isProjectTab(tab) ? tab : "tasks"} />;
}
