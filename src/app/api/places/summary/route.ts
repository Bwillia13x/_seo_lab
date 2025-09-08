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
      fields: "rating,user_ratings_total,url",
    });
    const endpoint = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;
    const res = await fetch(endpoint, { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ ok: false, error: text.slice(0, 500) }, { status: 502 });
    }

    const data = await res.json();
    const rating: number | undefined = data?.result?.rating;
    const user_ratings_total: number | undefined = data?.result?.user_ratings_total;
    const urlOut: string | undefined = data?.result?.url;

    return NextResponse.json({ ok: true, rating, user_ratings_total, url: urlOut });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
