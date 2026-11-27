import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shell/module-placeholder";

export const metadata: Metadata = { title: "Code Evolution" };

export default function Page() {
  return <ModulePlaceholder id="code" />;
}
