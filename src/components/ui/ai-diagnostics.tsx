"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Brain, CheckCircle, AlertTriangle, Copy, Eye, EyeOff, Link as LinkIcon, Shield } from "lucide-react";
import OpenAI from "openai";

type Props = {
  className?: string;
};

export function AIDiagnostics({ className }: Props) {
  const [apiKey, setApiKey] = useState<string>("");
  const [masked, setMasked] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | { ok: boolean; message: string }>(null);

  // Load from env or localStorage on mount
  useEffect(() => {
    try {
      const envKey = (process as any)?.env?.NEXT_PUBLIC_OPENAI_API_KEY as string | undefined;
      const stored = typeof window !== "undefined" ? window.localStorage.getItem("belmont_openai_key") : "";
      const key = stored || envKey || "";
      if (key) setApiKey(key);
    } catch {}
  }, []);

  const maskedKey = useMemo(() => {
    if (!apiKey) return "";
    if (!masked) return apiKey;
    const head = apiKey.slice(0, 6);
    const tail = apiKey.slice(-4);
    return `${head}…${tail}`;
  }, [apiKey, masked]);

  const hasKey = Boolean(apiKey);

  async function runTest() {
    if (!apiKey) {
      setTestResult({ ok: false, message: "No API key configured." });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
      // Tiny, low-cost call
      const r = await openai.chat.completions.create({
        model: "gpt5-mini",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 2,
      });
      const ok = Boolean(r.choices?.length);
      setTestResult({ ok, message: ok ? "AI responded." : "No choices returned." });
    } catch (e: any) {
      setTestResult({ ok: false, message: String(e?.message || e) });
    } finally {
      setTesting(false);
    }
  }

  function saveKey() {
    try {
      if (apiKey) localStorage.setItem("belmont_openai_key", apiKey);
      setTestResult({ ok: true, message: "Saved to browser storage." });
    } catch (e: any) {
      setTestResult({ ok: false, message: "Could not save key." });
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Diagnostics
        </CardTitle>
        <CardDescription>Quick status for OpenAI connectivity and setup</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Configured model</Label>
            <div className="flex items-center gap-2">
              <Badge>gpt5-mini</Badge>
              <span className="text-muted-foreground">static in code</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label>API Key</Label>
            <div className="flex items-center gap-2">
              {hasKey ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              )}
              <span className="font-mono text-xs break-all">{maskedKey || "not set"}</span>
              <Button size="sm" variant="outline" onClick={() => setMasked((m) => !m)} aria-label={masked ? "Show key" : "Hide key"}>
                {masked ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          <div className="md:col-span-2">
            <Label>Set/Update API Key</Label>
            <div className="flex gap-2">
              <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
              <Button variant="outline" onClick={saveKey}>
                <Shield className="h-4 w-4 mr-1" /> Save
              </Button>
            </div>
          </div>
        </div>
        <Separator />
        <div className="flex flex-wrap gap-2">
          <Button onClick={runTest} disabled={!hasKey || testing}>
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
        <div className="text-xs text-muted-foreground">
          Note: The key is stored locally in your browser under <code>belmont_openai_key</code>.
        </div>
      </CardContent>
    </Card>
  );
}

