import { NextResponse } from "next/server";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

export const runtime = "nodejs";

type Row = { name: string; value: number };

function getCredentials() {
  const svcJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!svcJson) return null;
  try {
    const creds = JSON.parse(svcJson);
    if (creds.private_key && typeof creds.private_key === "string") {
      creds.private_key = creds.private_key.replace(/\\n/g, "\n");
    }
    return creds;
  } catch {
    return null;
  }
}

async function runReport(propertyId: string, days: number, dimensionName: string, metric: "conversions" | "eventCount", eventName?: string): Promise<Row[]> {
  const credentials = getCredentials();
  if (!credentials) throw new Error("Missing or invalid service account JSON");

  const client = new BetaAnalyticsDataClient({ credentials });
  const request: any = {
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
    dimensions: [{ name: dimensionName }],
    metrics: [{ name: metric }],
    orderBys: [{ metric: { metricName: metric }, desc: true }],
    limit: 10,
  };
  if (eventName) {
    request.dimensionFilter = {
      filter: {
        fieldName: "eventName",
        stringFilter: { matchType: "EXACT", value: eventName },
      },
    };
  }
  const [resp] = await client.runReport(request);
  const out: Row[] = (resp.rows || []).map((r: any) => {
    const k = r.dimensionValues?.[0]?.value || "other";
    const valStr = r.metricValues?.[0]?.value || "0";
    const value = Number(valStr);
    return { name: k, value: Number.isFinite(value) ? value : 0 };
  });
  return out;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const days = Math.max(1, Math.min(90, Number(url.searchParams.get("days") || 30)));
    const propertyId = process.env.GA4_PROPERTY_ID;
    const svcJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const serviceParam = process.env.GA4_SERVICE_PARAM_NAME; // e.g., "service" if you log an event parameter named service
    const conversionEvent = process.env.GA4_CONVERSION_EVENT_NAME; // optional filter for a specific conversion event

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

    if (!serviceParam) {
      return NextResponse.json(
        {
          ok: false,
          configured: false,
          error: "Missing GA4_SERVICE_PARAM_NAME",
          hint: "Set GA4_SERVICE_PARAM_NAME to the event parameter that stores the booked service (e.g., 'service').",
        },
        { status: 501 }
      );
    }

    const dimensionName = `customEvent:${serviceParam}`;
    let rows: Row[] = [];
    try {
      rows = await runReport(propertyId, days, dimensionName, "conversions", conversionEvent);
    } catch (e) {
      rows = await runReport(propertyId, days, dimensionName, "eventCount", conversionEvent);
    }

    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
