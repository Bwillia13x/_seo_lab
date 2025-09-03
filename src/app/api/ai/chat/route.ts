import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Basic in-memory rate limiter per IP (fallback when Redis not configured)
type Counters = {
  minute: { count: number; resetAt: number };
  day: { count: number; resetAt: number };
};
const RATE_LIMITS = {
  perMinute: Number(process.env.AI_RATE_PER_MINUTE || 30),
  perDay: Number(process.env.AI_RATE_PER_DAY || 1000),
};
const counters = new Map<string, Counters>();

// Optional Upstash Redis (HTTP) configuration
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function upstashPipeline(cmds: any[]) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;
  try {
    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(cmds),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data as any[];
  } catch {
    return null;
  }
}

function getClientId(req: NextRequest) {
  const xf = req.headers.get("x-forwarded-for");
  const ip = (xf?.split(",")[0] || req.ip || "unknown").trim();
  return ip || "unknown";
}

function getClientKey(req: NextRequest) {
  const uid =
    req.headers.get("x-user-id") ||
    req.headers.get("x-client-id") ||
    req.headers.get("x-session-id") ||
    "";
  if (uid) return `uid:${uid}`;
  return `ip:${getClientId(req)}`;
}

async function checkRateLimit(id: string) {
  const now = Date.now();
  const minuteWindow = 60_000;
  const dayWindow = 86_400_000;
  const minuteResetSec = Math.max(1, Math.ceil((minuteWindow - (now % minuteWindow)) / 1000));
  const dayResetSec = Math.max(1, Math.ceil((dayWindow - (now % dayWindow)) / 1000));
  // Prefer Redis if configured
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    const minuteKey = `rl:minute:${id}:${Math.floor(now / minuteWindow)}`;
    const dayKey = `rl:day:${id}:${Math.floor(now / dayWindow)}`;
    const minuteTTL = 60; // seconds
    const dayTTL = 86_400; // seconds
    const pipe = await upstashPipeline([
      ["INCR", minuteKey],
      ["EXPIRE", minuteKey, minuteTTL],
      ["INCR", dayKey],
      ["EXPIRE", dayKey, dayTTL],
    ]);
    if (pipe) {
      // upstash pipeline returns array of results; the first and third entries hold counts
      const minuteCount = Number(pipe?.[0]?.result ?? 0);
      const dayCount = Number(pipe?.[2]?.result ?? 0);
      if (minuteCount > RATE_LIMITS.perMinute) {
        return { allowed: false as const, scope: "minute" as const, retryAfter: minuteResetSec, minuteCount, dayCount } as any;
      }
      if (dayCount > RATE_LIMITS.perDay) {
        return { allowed: false as const, scope: "day" as const, retryAfter: dayResetSec, minuteCount, dayCount } as any;
      }
      return { allowed: true as const, minuteCount, dayCount, minuteReset: minuteResetSec, dayReset: dayResetSec } as any;
    }
    // fall through to in-memory if pipeline failed
  }

  // In-memory fallback
  let c = counters.get(id);
  if (!c) {
    c = {
      minute: { count: 0, resetAt: now + minuteWindow },
      day: { count: 0, resetAt: now + dayWindow },
    };
    counters.set(id, c);
  }
  if (now > c.minute.resetAt) {
    c.minute.count = 0;
    c.minute.resetAt = now + minuteWindow;
  }
  if (now > c.day.resetAt) {
    c.day.count = 0;
    c.day.resetAt = now + dayWindow;
  }
  if (c.minute.count >= RATE_LIMITS.perMinute) {
    const retryAfter = Math.max(1, Math.ceil((c.minute.resetAt - now) / 1000));
    return { allowed: false as const, scope: "minute" as const, retryAfter, minuteCount: c.minute.count, dayCount: c.day.count } as any;
  }
  if (c.day.count >= RATE_LIMITS.perDay) {
    const retryAfter = Math.max(1, Math.ceil((c.day.resetAt - now) / 1000));
    return { allowed: false as const, scope: "day" as const, retryAfter, minuteCount: c.minute.count, dayCount: c.day.count } as any;
  }
  c.minute.count++;
  c.day.count++;
  return {
    allowed: true as const,
    minuteCount: c.minute.count,
    dayCount: c.day.count,
    minuteReset: Math.max(1, Math.ceil((c.minute.resetAt - now) / 1000)),
    dayReset: Math.max(1, Math.ceil((c.day.resetAt - now) / 1000)),
  } as any;
}

const DEFAULT_MODEL = process.env.OPENAI_DEFAULT_MODEL || "gpt-5-mini-2025-08-07";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const clientIp = getClientId(req);
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const scope = (body?.scope as string | undefined)?.slice(0, 50) || "";
  const clientKey = (scope ? `${scope}:` : "") + getClientKey(req);
  const rl: any = await checkRateLimit(clientKey);
  if (!rl.allowed) {
    try {
      console.warn(
        JSON.stringify({
          event: "ai_rate_limit_deny",
          path: req.nextUrl.pathname,
          method: req.method,
          client: clientKey,
          ip: clientIp,
          scope: rl.scope,
          retry_after: rl.retryAfter,
        })
      );
    } catch {}
    return new NextResponse(
      JSON.stringify({ error: `Rate limit exceeded (${rl.scope}). Try later.` }),
      {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": String(rl.retryAfter),
          "x-ratelimit-limit-minute": String(RATE_LIMITS.perMinute),
          "x-ratelimit-remaining-minute": String(Math.max(0, RATE_LIMITS.perMinute - (rl.minuteCount || 0))),
          "x-ratelimit-reset-minute": String(rl.minuteReset || 60),
          "x-ratelimit-limit-day": String(RATE_LIMITS.perDay),
          "x-ratelimit-remaining-day": String(Math.max(0, RATE_LIMITS.perDay - (rl.dayCount || 0))),
          "x-ratelimit-reset-day": String(rl.dayReset || 86_400),
        },
      }
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Server misconfigured: missing OPENAI_API_KEY" },
      { status: 500 }
    );
  }

  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const model = (body?.model as string) || DEFAULT_MODEL;
  const maxTokens = Math.min(Number(body?.maxTokens || 300), 800);
  const temperature = Math.min(Math.max(Number(body?.temperature || 0.7), 0), 1);

  // Basic validation
  if (!messages.length) {
    return NextResponse.json(
      { error: "Missing messages" },
      { status: 400 }
    );
  }
  // Trim any overly long content to avoid abuse
  const safeMessages = messages.slice(-20).map((m: any) => ({
    role: m?.role === "system" || m?.role === "assistant" ? m.role : "user",
    content: String(m?.content || "").slice(0, 10_000),
  }));

  try {
    const started = Date.now();
    const resp = await openai.chat.completions.create({
      model,
      messages: safeMessages,
      max_tokens: maxTokens,
      temperature,
    });
    const content = resp.choices?.[0]?.message?.content || "";
    const latencyMs = Date.now() - started;
    try {
      const usage = (resp as any)?.usage || {};
      console.log(
        JSON.stringify({
          event: "ai_call",
          path: req.nextUrl.pathname,
          model,
          latency_ms: latencyMs,
          prompt_tokens: usage.prompt_tokens || null,
          completion_tokens: usage.completion_tokens || null,
          total_tokens: usage.total_tokens || null,
          client: clientKey,
          ip: clientIp,
          minuteCount: rl.minuteCount,
          dayCount: rl.dayCount,
        })
      );
    } catch {}
    const headers: Record<string, string> = {
      "x-ratelimit-limit-minute": String(RATE_LIMITS.perMinute),
      "x-ratelimit-remaining-minute": String(Math.max(0, RATE_LIMITS.perMinute - (rl.minuteCount || 0))),
      "x-ratelimit-reset-minute": String(rl.minuteReset || 60),
      "x-ratelimit-limit-day": String(RATE_LIMITS.perDay),
      "x-ratelimit-remaining-day": String(Math.max(0, RATE_LIMITS.perDay - (rl.dayCount || 0))),
      "x-ratelimit-reset-day": String(rl.dayReset || 86_400),
    };
    return new NextResponse(JSON.stringify({ ok: true, content }), {
      status: 200,
      headers,
    });
  } catch (e: any) {
    const msg = e?.message || String(e);
    const status = String(msg).includes("rate limit") ? 429 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
