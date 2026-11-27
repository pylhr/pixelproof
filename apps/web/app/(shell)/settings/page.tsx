import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsPanels } from "./settings-panels";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-8 md:px-8">
      <PageHeader title="Settings" description="Appearance and connection details." />
      <SettingsPanels />
    </div>
  );
}
