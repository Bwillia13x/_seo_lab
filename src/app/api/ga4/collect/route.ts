import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const measurementId = process.env.GA4_MEASUREMENT_ID;
    const apiSecret = process.env.GA4_API_SECRET;

    if (!measurementId || !apiSecret) {
      return NextResponse.json(
        { ok: false, error: "GA4 not configured" },
        { status: 501 }
      );
    }

    const endpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(
      measurementId
    )}&api_secret=${encodeURIComponent(apiSecret)}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      // GA endpoint is external; no need to cache
      cache: "no-store",
    });

    // Return GA response status for debugging
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { ok: false, status: res.status, details: text.slice(0, 500) },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
