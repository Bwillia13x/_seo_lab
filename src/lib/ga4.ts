// Minimal GA4 Measurement Protocol client helper for client-side usage
// Sends events to our server endpoint at /api/ga4/collect

const CID_KEY = "belmont_ga_client_id";

export function getOrCreateClientId(): string {
  try {
    const existing = localStorage.getItem(CID_KEY);
    if (existing) return existing;
    const cid = `${Math.floor(Math.random() * 1e10)}.${Date.now()}`;
    localStorage.setItem(CID_KEY, cid);
    return cid;
  } catch {
    // Fallback non-persistent ID
    return `${Math.floor(Math.random() * 1e10)}.${Date.now()}`;
  }
}

export async function sendGAEvent(name: string, params: Record<string, any> = {}): Promise<boolean> {
  try {
    const client_id = getOrCreateClientId();
    const body = JSON.stringify({ client_id, events: [{ name, params }] });

    // Prefer keepalive fetch to allow navigation to continue
    const res = await fetch("/api/ga4/collect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => null);
    return !!res && res.ok;
  } catch {
    return false;
  }
}
