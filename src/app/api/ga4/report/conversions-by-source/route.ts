import { NextResponse } from "next/server";

// Use Node runtime for potential Google APIs in future implementation
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const days = Math.max(1, Math.min(90, Number(url.searchParams.get("days") || 30)));

    // Planned required env for GA4 Data API (server-side reporting):
    // - GA4_PROPERTY_ID
    // - GOOGLE_APPLICATION_CREDENTIALS_JSON (Service Account JSON; service account must have access to the GA4 property)
    const propertyId = process.env.GA4_PROPERTY_ID;
    const svcJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

    if (!propertyId || !svcJson) {
      return NextResponse.json(
        {
          ok: false,
          configured: false,
          error: "GA4 Data API not configured",
          required: ["GA4_PROPERTY_ID", "GOOGLE_APPLICATION_CREDENTIALS_JSON"],
          hint: "Add env vars in Vercel and grant the service account access to your GA4 property.",
        },
        { status: 501 }
      );
    }

    // Placeholder until GA4 Data API is wired:
    // In a follow-up, implement a query to the GA4 Data API (RunReport) with dimensions: source, metrics: conversions/events
    // and date range: last N days.
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        error: "Not implemented yet",
        note: "Server credentials detected. Implement GA4 Data API call next.",
      },
      { status: 501 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
