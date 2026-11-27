import type { Comparison } from "@/lib/comparison/types";
import { SAMPLE_FILES } from "./sample-files.generated";

/** FICTIONAL sample comparison ("Acme" settings page) used to build the M1 UI.
 *  Screenshots: scripts/gen-fixture-images.py. File diffs: scripts/gen-fixtures.py. */
export const SAMPLE_COMPARISON: Comparison = {
  id: "sample-acme-settings",
  title: "Acme settings page",
  isSample: true,
  before: { label: "v1.4.0", description: "Sample baseline" },
  after: { label: "v1.5.0", description: "Sample redesign" },
  screen: {
    name: "Settings page",
    before: {
      src: "/fixtures/acme-settings-before.png",
      width: 1280,
      height: 800,
      alt: "Before (v1.4.0): sample Acme settings page",
    },
    after: {
      src: "/fixtures/acme-settings-after.png",
      width: 1280,
      height: 800,
      alt: "After (v1.5.0): sample Acme settings page",
    },
  },
  files: SAMPLE_FILES,
};
