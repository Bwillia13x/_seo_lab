"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Brain } from "lucide-react";
import { getAIStatus } from "@/lib/ai";

export function AIBadge() {
  const [hasKey, setHasKey] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const s = await getAIStatus();
        setHasKey(Boolean(s?.hasKey));
      } catch { setHasKey(false); }
    })();
  }, []);
  const label = hasKey ? "AI: Ready" : "AI: Unavailable";
  return (
    <Badge variant={hasKey ? "default" : "secondary"} className="inline-flex items-center gap-1">
      <Brain className="h-3.5 w-3.5" /> {label}
    </Badge>
  );
}
