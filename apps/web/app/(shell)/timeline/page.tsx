import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shell/module-placeholder";

export const metadata: Metadata = { title: "Development Timeline" };

export default function Page() {
  return <ModulePlaceholder id="timeline" />;
}
