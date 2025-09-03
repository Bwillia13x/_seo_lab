// Lightweight client-side event logging for the Dashboard
// Stores recent events in localStorage under `belmont_events`

export type BelmontEvent = {
  type: string;
  ts: string; // ISO timestamp
  meta?: Record<string, any>;
};

const KEY = "belmont_events";
const MAX_EVENTS = 1000;

function read(): BelmontEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BelmontEvent[]) : [];
  } catch {
    return [];
  }
}

function write(events: BelmontEvent[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {}
}

export function logEvent(type: BelmontEvent["type"], meta?: BelmontEvent["meta"]) {
  try {
    const ev: BelmontEvent = { type, ts: new Date().toISOString(), meta };
    const all = read();
    all.push(ev);
    write(all);
  } catch {}
}

export function getEvents(sinceDays = 7): BelmontEvent[] {
  const all = read();
  if (!sinceDays) return all;
  const cutoff = Date.now() - sinceDays * 24 * 60 * 60 * 1000;
  return all.filter((e) => Date.parse(e.ts) >= cutoff);
}

export function countByType(types: string[], days = 1) {
  const events = getEvents(days);
  const m: Record<string, number> = {};
  for (const t of types) m[t] = 0;
  for (const e of events) if (m[e.type] != null) m[e.type]++;
  return m;
}

// Onboarding helpers
export function getOnboardingStatus() {
  const place = localStorage.getItem("belmont_onboarding_place_id") || "";
  const booking = localStorage.getItem("belmont_onboarding_booking") || "";
  const phone = localStorage.getItem("belmont_onboarding_phone") || "";
  const address = localStorage.getItem("belmont_onboarding_address") || "";
  return {
    placeIdSet: !!place,
    bookingSet: !!booking,
    phoneSet: !!phone,
    addressSet: !!address,
    complete: !!place && !!booking && !!phone && !!address,
  };
}

