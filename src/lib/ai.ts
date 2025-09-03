"use client";

import OpenAI from "openai";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

// Simple in-memory token bucket limiter (per-session)
const RATE = { max: 10, intervalMs: 60_000 };
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
  apiKey: string;
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
}): Promise<{ ok: true; content: string } | { ok: false; error: string }> {
  const { apiKey, messages, model = "gpt5-mini", maxTokens = 300 } = params;
  if (!apiKey) return { ok: false, error: "Missing API key" };
  if (!allowed()) return { ok: false, error: "Rate limited. Try again soon." };

  try {
    const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    const response = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    });
    const content = response.choices?.[0]?.message?.content || "";
    if (!content) return { ok: false, error: "Empty response from AI" };
    return { ok: true, content };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

