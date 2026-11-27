"use client";

import { useEffect, useState } from "react";

/** Label for the primary modifier key. Defaults to "Ctrl" for SSR; switches to ⌘ on Apple platforms. */
export function useModKey(): string {
  const [label, setLabel] = useState("Ctrl");
  useEffect(() => {
    if (/Mac|iPhone|iPad/i.test(navigator.platform)) setLabel("⌘");
  }, []);
  return label;
}
