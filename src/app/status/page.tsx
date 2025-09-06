"use client";
import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

type Health = { status: string; warnings?: string[]; timestamp: string } | null;
type AIStatus = { hasKey: boolean; defaultModel: string; limits: { perMinute: number; perDay: number } } | null;

export default function StatusPage() {
  const [health, setHealth] = useState<Health>(null);
  const [ai, setAI] = useState<AIStatus>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const h = await fetch("/api/health").then((r) => r.json());
        setHealth(h);
      } catch (e: any) {
        setErr(String(e?.message || e));
      }
      try {
        const s = await fetch("/api/ai/status").then((r) => r.json());
        setAI(s);
      } catch {}
    })();
  }, []);

  return (
    <div className="p-5 md:p-8 space-y-6">
      <PageHeader
        title="System Status"
        subtitle="Live health checks and configuration overview for this deployment."
      />

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">API Health</CardTitle>
            <CardDescription>Current status from /api/health</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {health ? (
              <>
                <div><strong>Status:</strong> {health.status}</div>
                <div><strong>Timestamp:</strong> {new Date(health.timestamp).toLocaleString()}</div>
                {health.warnings && health.warnings.length > 0 && (
                  <div>
                    <strong>Warnings:</strong>
                    <ul className="list-disc pl-5 mt-1">
                      {health.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="text-muted-foreground">Loading… {err && <span className="text-red-600">{err}</span>}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">AI Configuration</CardTitle>
            <CardDescription>Defaults and rate limits</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {ai ? (
              <>
                <div><strong>API Key:</strong> {ai.hasKey ? "Present" : "Missing"}</div>
                <div><strong>Default Model:</strong> {ai.defaultModel}</div>
                <div>
                  <strong>Limits:</strong> {ai.limits.perMinute}/min, {ai.limits.perDay}/day
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">Loading…</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

