import { NextResponse } from "next/server";

const DEFAULT_MODEL = process.env.OPENAI_DEFAULT_MODEL || "gpt-5-mini-2025-08-07";
const LIMITS = {
  perMinute: Number(process.env.AI_RATE_PER_MINUTE || 30),
  perDay: Number(process.env.AI_RATE_PER_DAY || 1000),
};

export async function GET() {
  const hasKey = Boolean(process.env.OPENAI_API_KEY);
  return NextResponse.json({ hasKey, defaultModel: DEFAULT_MODEL, limits: LIMITS });
}

