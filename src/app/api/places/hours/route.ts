import { NextResponse } from "next/server";
import { BELMONT_CONSTANTS } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const placeId = url.searchParams.get("place_id") || BELMONT_CONSTANTS.PLACE_ID;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey || !placeId) {
      return NextResponse.json(
        {
          ok: false,
          configured: false,
          error: "Google Maps API not configured",
          required: ["GOOGLE_MAPS_API_KEY"],
        },
        { status: 501 }
      );
    }

    const params = new URLSearchParams({
      place_id: placeId,
      key: apiKey,
      fields: "opening_hours",
    });
    const endpoint = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;
    const res = await fetch(endpoint, { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ ok: false, error: text.slice(0, 500) }, { status: 502 });
    }

    const data = await res.json();
    const weekday_text: string[] = data?.result?.opening_hours?.weekday_text || [];
    const open_now: boolean | undefined = data?.result?.opening_hours?.open_now;

    return NextResponse.json({ ok: true, weekday_text, open_now });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
