import type { Metadata } from "next";
import { SettingsPage } from "@/components/plane/settings/settings-page";

export const metadata: Metadata = { title: "Settings — Plane" };

export default function Page() {
  return <SettingsPage />;
}
