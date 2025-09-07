import { NextResponse } from "next/server";

const DEFAULT_MODEL = process.env.OPENAI_DEFAULT_MODEL || "gpt-5-mini-2025-08-07";
const LIMITS = {
  perMinute: Number(process.env.AI_RATE_PER_MINUTE || 30),
  perDay: Number(process.env.AI_RATE_PER_DAY || 1000),
};

export async function GET() {
  console.log('🔍 Checking AI status (edge runtime)');

  const hasKey = Boolean(process.env.OPENAI_API_KEY);
  const rateLimitsValid = Boolean(
    process.env.AI_RATE_PER_MINUTE &&
    process.env.AI_RATE_PER_DAY &&
    !isNaN(Number(process.env.AI_RATE_PER_MINUTE)) &&
    !isNaN(Number(process.env.AI_RATE_PER_DAY))
  );

  if (!hasKey) {
    console.warn('⚠️ OPENAI_API_KEY is missing - AI features will be disabled');
  } else {
    console.log('✅ OPENAI_API_KEY is configured');
  }

  if (!rateLimitsValid) {
    console.warn('⚠️ AI rate limits not properly configured, using defaults');
  }

  return NextResponse.json({
    hasKey,
    defaultModel: DEFAULT_MODEL,
    limits: LIMITS,
    warnings: hasKey ? undefined : ['AI API key missing']
  });
}

