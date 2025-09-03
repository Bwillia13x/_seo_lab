"use client";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

// Lightweight client-side limiter to avoid UI spam (server enforces real limits)
const RATE = { max: 8, intervalMs: 60_000 };
let calls = 0;
let windowStart = Date.now();

function allowed() {
  const now = Date.now();
  if (now - windowStart > RATE.intervalMs) {
    windowStart = now;
    calls = 0;
  }
  if (calls >= RATE.max) return false;
  calls++;
  return true;
}

export async function aiChatSafe(params: {
  // apiKey is ignored; kept for backward compatibility with callers
  apiKey?: string;
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  scope?: string;
}): Promise<
  | { ok: true; content: string; meta?: { ratelimit?: Record<string, number> } }
  | { ok: false; error: string; meta?: { ratelimit?: Record<string, number> } }
> {
  const { messages, model, maxTokens = 300, temperature = 0.7, scope } = params;
  if (!allowed()) return { ok: false, error: "Rate limited. Try again soon." };

  try {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages, model, maxTokens, temperature, scope }),
    });
    const rl = {
      perMinute: Number(res.headers.get("x-ratelimit-limit-minute") || 0),
      remainingMinute: Number(
        res.headers.get("x-ratelimit-remaining-minute") || 0
      ),
      resetMinute: Number(res.headers.get("x-ratelimit-reset-minute") || 0),
      perDay: Number(res.headers.get("x-ratelimit-limit-day") || 0),
      remainingDay: Number(res.headers.get("x-ratelimit-remaining-day") || 0),
      resetDay: Number(res.headers.get("x-ratelimit-reset-day") || 0),
    } as Record<string, number>;
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: data?.error || `AI error ${res.status}`,
        meta: { ratelimit: rl },
      } as any;
    }
    const data = await res.json();
    const content = String(data?.content || "");
    if (!content)
      return { ok: false, error: "Empty response from AI", meta: { ratelimit: rl } } as any;
    return { ok: true, content, meta: { ratelimit: rl } } as any;
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) } as any;
  }
}

export async function getAIStatus(): Promise<{ hasKey: boolean; defaultModel: string; limits: { perMinute: number; perDay: number } } | null> {
  try {
    const r = await fetch("/api/ai/status");
    if (!r.ok) return null;
    return (await r.json()) as any;
  } catch {
    return null;
  }
}
