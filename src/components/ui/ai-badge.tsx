"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Brain } from "lucide-react";

export function AIBadge() {
  const [hasKey, setHasKey] = useState(false);
  useEffect(() => {
    try {
      const envKey = (process as any)?.env?.NEXT_PUBLIC_OPENAI_API_KEY as string | undefined;
      const stored = typeof window !== "undefined" ? window.localStorage.getItem("belmont_openai_key") : "";
      setHasKey(Boolean(stored || envKey));
    } catch {
      setHasKey(false);
    }
  }, []);
  const label = useMemo(() => (hasKey ? "AI: Connected" : "AI: Setup"), [hasKey]);
  return (
    <Badge variant={hasKey ? "default" : "secondary"} className="inline-flex items-center gap-1">
      <Brain className="h-3.5 w-3.5" /> {label}
    </Badge>
  );
}

