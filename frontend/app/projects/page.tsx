import type { Metadata } from "next";
import { ProjectsHome } from "@/components/plane/projects/projects-home";

export const metadata: Metadata = { title: "Projects — Plane" };

export default function Page() {
  return <ProjectsHome />;
}
