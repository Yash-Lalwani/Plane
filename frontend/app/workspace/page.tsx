import { redirect } from "next/navigation";

// The old design-preview URL now leads to the real app.
export default function Page() {
  redirect("/projects");
}
