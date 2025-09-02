import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function OpengraphImage() {
  const title = "Belmont SEO Lab";
  const subtitle = "Local SEO Tools for The Belmont Barbershop";
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #111827 100%)",
          color: "#fff",
          padding: 64,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial",
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            letterSpacing: -1,
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 28,
            color: "#cbd5e1",
            fontWeight: 500,
          }}
        >
          {subtitle}
        </div>
        <div style={{ marginTop: 24, display: "flex", gap: 16 }}>
          <div
            style={{
              fontSize: 20,
              background: "#22c55e",
              color: "#052e16",
              padding: "8px 12px",
              borderRadius: 8,
              fontWeight: 700,
            }}
          >
            Bridgeland, Calgary
          </div>
          <div
            style={{
              fontSize: 20,
              background: "#38bdf8",
              color: "#082f49",
              padding: "8px 12px",
              borderRadius: 8,
              fontWeight: 700,
            }}
          >
            thebelmontbarber.ca
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
