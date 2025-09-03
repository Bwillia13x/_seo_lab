"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Brain, CheckCircle, AlertTriangle, Link as LinkIcon } from "lucide-react";
import { aiChatSafe, getAIStatus } from "@/lib/ai";

type Props = {
  className?: string;
};

export function AIDiagnostics({ className }: Props) {
  const [status, setStatus] = useState<{ hasKey: boolean; defaultModel: string; limits: { perMinute: number; perDay: number } } | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | { ok: boolean; message: string }>(null);
  const [quota, setQuota] = useState<null | { perMinute: number; remainingMinute: number; resetMinute: number; perDay: number; remainingDay: number; resetDay: number }>(null);

  // Load server status on mount
  useEffect(() => {
    (async () => {
      const s = await getAIStatus();
      setStatus(s);
    })();
  }, []);

  async function runTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await aiChatSafe({
        model: status?.defaultModel || "gpt-5-mini-2025-08-07",
        messages: [{ role: "user", content: "ping" }],
        maxTokens: 2,
      });
      setTestResult({ ok: r.ok, message: r.ok ? "AI responded." : (r as any).error || "No response" });
      const rl = (r as any)?.meta?.ratelimit;
      if (rl && typeof rl === "object") {
        setQuota({
          perMinute: Number(rl.perMinute || 0),
          remainingMinute: Number(rl.remainingMinute || 0),
          resetMinute: Number(rl.resetMinute || 0),
          perDay: Number(rl.perDay || 0),
          remainingDay: Number(rl.remainingDay || 0),
          resetDay: Number(rl.resetDay || 0),
        });
      }
    } catch (e: any) {
      setTestResult({ ok: false, message: String(e?.message || e) });
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Diagnostics
        </CardTitle>
        <CardDescription>Server-managed OpenAI connectivity and limits</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Configured model</Label>
            <div className="flex items-center gap-2">
              <Badge>{status?.defaultModel || "gpt-5-mini-2025-08-07"}</Badge>
              <span className="text-muted-foreground">server default</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Key Mode</Label>
            <div className="flex items-center gap-2">
              {status?.hasKey ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              )}
              <span className="text-xs">Server-managed (no client key needed)</span>
            </div>
          </div>
          {/* No client key input – server-managed */}
        </div>
        <Separator />
        <div className="flex flex-wrap gap-2">
          <Button onClick={runTest} disabled={testing}>
            <LinkIcon className="h-4 w-4 mr-2" />
            {testing ? "Testing…" : "Test AI Connection"}
          </Button>
          {testResult && (
            <span className={"inline-flex items-center gap-1 " + (testResult.ok ? "text-green-700" : "text-red-700") }>
              {testResult.ok ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {testResult.message}
            </span>
          )}
        </div>
        {quota && (
          <div className="text-xs text-muted-foreground">
            Quota: {quota.remainingMinute}/{quota.perMinute} this minute (resets in {quota.resetMinute}s), {quota.remainingDay}/{quota.perDay} today (resets in {Math.ceil(quota.resetDay/3600)}h)
          </div>
        )}
        <div className="text-xs text-muted-foreground">Rate limits: {status?.limits?.perMinute ?? 30}/min, {status?.limits?.perDay ?? 1000}/day.</div>
      </CardContent>
    </Card>
  );
}
