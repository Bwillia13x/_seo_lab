import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  const warnings: string[] = [];

  // Check critical environment variables
  if (!process.env.OPENAI_API_KEY) warnings.push('OPENAI_API_KEY is missing');
  if (!process.env.NEXT_PUBLIC_SITE_BASE) warnings.push('NEXT_PUBLIC_SITE_BASE is missing');
  if (process.env.NEXT_PUBLIC_ALLOW_INDEXING !== 'true' && process.env.NEXT_PUBLIC_ALLOW_INDEXING !== 'false') warnings.push('NEXT_PUBLIC_ALLOW_INDEXING is not set correctly');

  // Optional Redis configuration
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    warnings.push('Redis configuration incomplete - rate limiting may not work');
  }

  // Check AI configuration
  if (!process.env.OPENAI_DEFAULT_MODEL) warnings.push('OPENAI_DEFAULT_MODEL not set, using default');

  // Log warnings for debugging
  if (warnings.length > 0) {
    console.warn('🚨 Health check warnings:', warnings);
  } else {
    console.log('✅ All critical environment variables are set');
  }

  return NextResponse.json({
    status: warnings.length === 0 ? "ok" : "warning",
    timestamp: new Date().toISOString(),
    warnings: warnings.length > 0 ? warnings : undefined,
  });
}
