"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardSkeleton } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import { Tour } from "@/components/ui/tour";
import Link from "next/link";
import { getEvents, countByType, getOnboardingStatus } from "@/lib/analytics";
import { BELMONT_CONSTANTS } from "@/lib/constants";
import { CheckCircle, AlertTriangle, ArrowRight, Link as LinkIcon, MessageSquare, FileText, QrCode, Sparkles, Printer, Download, TrendingUp, TrendingDown, Trash2, MapPin, Phone, Clock, Star } from "lucide-react";
import { saveBlob } from "@/lib/blob";
import { showToast } from "@/lib/toast";
import { toCSV } from "@/lib/csv";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Color palette from theme tokens (supports light/dark)
const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
];
const COLOR_CLASSES = [
  "bg-[hsl(var(--chart-1))]",
  "bg-[hsl(var(--chart-2))]",
  "bg-[hsl(var(--chart-3))]",
  "bg-[hsl(var(--chart-4))]",
  "bg-[hsl(var(--chart-5))]",
  "bg-[hsl(var(--primary))]",
];

// Predeclare width classes at 5% increments to avoid inline styles
const WIDTH_CLASSES = [
  "w-[5%]", "w-[10%]", "w-[15%]", "w-[20%]", "w-[25%]",
  "w-[30%]", "w-[35%]", "w-[40%]", "w-[45%]", "w-[50%]",
  "w-[55%]", "w-[60%]", "w-[65%]", "w-[70%]", "w-[75%]",
  "w-[80%]", "w-[85%]", "w-[90%]", "w-[95%]", "w-[100%]",
];

export default function Dashboard() {
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const todayCounts = useMemo(() => countByType([
    "utm_link_built",
    "review_email_copied",
    "review_sms_copied",
    "gbp_post_generated",
  ], 1), [now]); // eslint-disable-line react-hooks/exhaustive-deps

  const weekCounts = useMemo(() => countByType([
    "utm_link_built",
    "review_email_copied",
    "review_sms_copied",
    "gbp_post_generated",
  ], 7), [now]); // eslint-disable-line react-hooks/exhaustive-deps

  const ob = useMemo(() => (typeof window !== "undefined" ? getOnboardingStatus() : { placeIdSet:false,bookingSet:false,phoneSet:false,addressSet:false,complete:false }), [now]); // eslint-disable-line react-hooks/exhaustive-deps

  function exportEvents() {
    try {
      const rows = getEvents(30).map((e) => ({ ts: e.ts, type: e.type, meta: e.meta ? JSON.stringify(e.meta) : "" }));
      const csv = toCSV(rows);
      try { showToast("Exported events CSV", "success"); } catch {}
      saveBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `belmont-events-last30.csv`);
    } catch {}
  }

  function exportSnapshotCSV() {
    try {
      const rows = [
        ["metric", "value"],
        ["links_30d", String(kpis.links)],
        ["qr_scans_30d", String(kpis.scans)],
        ["bookings_30d", String(kpis.bookings)],
        ["reviews_30d", String(kpis.reviews)],
        ["avg_rating", String(kpis.avgRating)],
      ];
      const csv = rows.map((r) => r.join(",")).join("\n");
      saveBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `belmont-dashboard-snapshot.csv`);
      try { showToast("Exported dashboard snapshot", "success"); } catch {}
    } catch {}
  }

  function printDashboard() {
    if (typeof window !== "undefined") window.print();
  }

  function resetDemoMetrics() {
    try {
      localStorage.removeItem("belmont_events");
      setNow(new Date());
    } catch {}
  }

  // Executive overview (last 30 days)
  const last30 = useMemo(() => (typeof window !== "undefined" ? getEvents(30) : []), [now]); // eslint-disable-line react-hooks/exhaustive-deps
  // GA4 conversions by source (30d) via server report API
  const [ga4Sources, setGa4Sources] = useState<{ name: string; value: number }[] | null>(null);
  const [ga4Status, setGa4Status] = useState<"loading" | "ok" | "not_configured" | "error">("loading");
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/ga4/report/conversions-by-source?days=30", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.status === 501 && data?.configured === false) {
          setGa4Status("not_configured");
          setGa4Sources(null);
        } else if (res.ok && Array.isArray(data?.rows)) {
          setGa4Status("ok");
          setGa4Sources(data.rows as { name: string; value: number }[]);
        } else {
          setGa4Status("error");
          setGa4Sources(null);
        }
      } catch {
        if (!cancelled) {
          setGa4Status("error");
          setGa4Sources(null);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Google Places summary (rating and reviews)
  const [placeSummary, setPlaceSummary] = useState<{ rating?: number; count?: number; url?: string } | null>(null);
  const [placeSummaryStatus, setPlaceSummaryStatus] = useState<"loading" | "ok" | "not_configured" | "error">("loading");
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/places/summary", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.status === 501 && data?.configured === false) {
          setPlaceSummaryStatus("not_configured");
          setPlaceSummary(null);
        } else if (res.ok) {
          setPlaceSummaryStatus("ok");
          setPlaceSummary({ rating: data.rating, count: data.user_ratings_total, url: data.url });
        } else {
          setPlaceSummaryStatus("error");
          setPlaceSummary(null);
        }
      } catch {
        if (!cancelled) {
          setPlaceSummaryStatus("error");
          setPlaceSummary(null);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // GA4 conversions by service (30d)
  const [ga4Services, setGa4Services] = useState<{ name: string; value: number }[] | null>(null);
  const [ga4ServicesStatus, setGa4ServicesStatus] = useState<"loading" | "ok" | "not_configured" | "error">("loading");
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/ga4/report/conversions-by-service?days=30", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.status === 501 && data?.configured === false) {
          setGa4ServicesStatus("not_configured");
          setGa4Services(null);
        } else if (res.ok && Array.isArray(data?.rows)) {
          setGa4ServicesStatus("ok");
          setGa4Services(data.rows as { name: string; value: number }[]);
        } else {
          setGa4ServicesStatus("error");
          setGa4Services(null);
        }
      } catch {
        if (!cancelled) {
          setGa4ServicesStatus("error");
          setGa4Services(null);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Google Places hours for Contact & Location card
  const [hours, setHours] = useState<{ weekday_text: string[]; open_now?: boolean } | null>(null);
  const [hoursStatus, setHoursStatus] = useState<"loading" | "ok" | "not_configured" | "error">("loading");
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/places/hours", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.status === 501 && data?.configured === false) {
          setHoursStatus("not_configured");
          setHours(null);
        } else if (res.ok) {
          setHoursStatus("ok");
          setHours({ weekday_text: Array.isArray(data.weekday_text) ? data.weekday_text : [], open_now: data.open_now });
        } else {
          setHoursStatus("error");
          setHours(null);
        }
      } catch {
        if (!cancelled) {
          setHoursStatus("error");
          setHours(null);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);
  const kpis = useMemo(() => {
    let links = 0, bookings = 0, reviews = 0, ratingSum = 0;
    let scans = 0;
    for (const e of last30) {
      if (e.type === "utm_link_built") links++;
      if (e.type === "booking_created") bookings++;
      if (e.type === "qr_scan") scans++;
      if (e.type === "review_completed") {
        reviews++;
        const r = Number(e.meta?.rating || 0);
        if (!Number.isNaN(r)) ratingSum += r;
      }
    }
    const avgRating = reviews ? (ratingSum / reviews).toFixed(1) : "—";
    return { links, scans, bookings, reviews, avgRating };
  }, [last30]);

  // 30-day trend for links and bookings
  const trend30 = useMemo(() => {
    const data: { day: string; links: number; bookings: number; reviews: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayEvents = last30.filter((e) => e.ts.slice(0, 10) === key);
      data.push({
        day: key.slice(5),
        links: dayEvents.filter((e) => e.type === "utm_link_built").length,
        bookings: dayEvents.filter((e) => e.type === "booking_created").length,
        reviews: dayEvents.filter((e) => e.type === "review_completed").length,
      });
    }
    return data;
  }, [last30]);

  // Source attribution from UTM sources
  const sourceAttribution = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of last30) {
      if (e.type === "utm_link_built") {
        const src = String(e.meta?.source || "other");
        m[src] = (m[src] || 0) + 1;
      }
    }
    const entries = Object.entries(m);
    return entries.length
      ? entries.map(([name, value]) => ({ name, value }))
      : [
          { name: "google", value: 4 },
          { name: "instagram", value: 3 },
          { name: "referral", value: 2 },
          { name: "email", value: 1 },
        ];
  }, [last30]);

  // Top Campaigns from UTM link creation (proxy for activity per campaign)
  const campaignAttribution = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of last30) {
      if (e.type === "utm_link_built") {
        const camp = String(e.meta?.campaign || "other");
        m[camp] = (m[camp] || 0) + 1;
      }
    }
    return Object.entries(m)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [last30]);

  // Bookings by Campaign, derived from local booking_created events
  const bookingsByCampaign = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of last30) {
      if (e.type === "booking_created") {
        const camp = String(e.meta?.campaign || "other");
        m[camp] = (m[camp] || 0) + 1;
      }
    }
    return Object.entries(m)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [last30]);

  

  // Funnel width classes (5% increments)
  const funnelW = useMemo(() => {
    const { links, scans, bookings } = kpis;
    const max = Math.max(1, links, scans, bookings);
    function wClass(n: number) {
      const pct = Math.max(5, Math.round((n / max) * 100));
      const bucket = Math.min(100, Math.ceil(pct / 5) * 5); // round up to nearest 5%
      const idx = Math.max(0, Math.min(WIDTH_CLASSES.length - 1, Math.floor(bucket / 5) - 1));
      return WIDTH_CLASSES[idx];
    }
    return { links: wClass(links), scans: wClass(scans), bookings: wClass(bookings) };
  }, [kpis]);

  // Leaderboards
  const topServices = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of last30) if (e.type === "booking_created") {
      const s = String(e.meta?.service || "other");
      m[s] = (m[s] || 0) + 1;
    }
    return Object.entries(m)
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [last30]);

  // Week-over-week trend
  const linksWoW = useMemo(() => {
    const events = typeof window !== "undefined" ? getEvents(14) : [];
    const byDay = (offsetStart: number, offsetEnd: number) => {
      const start = new Date(); start.setDate(start.getDate() - offsetStart);
      const end = new Date(); end.setDate(end.getDate() - offsetEnd);
      return events.filter((e) => e.type === "utm_link_built" && Date.parse(e.ts) >= end.getTime() && Date.parse(e.ts) < start.getTime()).length;
    };
    const prev = byDay(7, 14);
    const curr = byDay(0, 7);
    const change = prev === 0 ? 100 : Math.round(((curr - prev) / Math.max(prev, 1)) * 100);
    return { prev, curr, change };
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps

  // Alerts (simple rules)
  const alerts = useMemo(() => {
    const out: { ok: boolean; label: string }[] = [];
    const posts7 = weekCounts["gbp_post_generated"] || 0;
    const postsPerWeek = Math.round(((last30.filter((e) => e.type === "gbp_post_generated").length) / 30) * 7);
    out.push({ ok: Number(kpis.avgRating) >= 4.7, label: "Average rating ≥ 4.7" });
    out.push({ ok: kpis.reviews >= 12, label: "≥ 12 reviews in last 30 days" });
    out.push({ ok: postsPerWeek >= 3 || posts7 >= 3, label: "≥ 3 GBP posts per week" });
    out.push({ ok: linksWoW.change >= -20, label: "Links not down more than 20% WoW" });
    out.push({ ok: ob.complete, label: "Onboarding complete" });
    return out;
  }, [kpis, weekCounts, last30, linksWoW, ob]);

  // Demo loader to backfill last 30 days of executive metrics
  function loadDemoMetrics() {
    if (typeof window === "undefined") return;
    try {
      const KEY = "belmont_events";
      const raw = localStorage.getItem(KEY);
      const existing = raw ? JSON.parse(raw) as any[] : [];
      const demo: any[] = [];
      const today = new Date();
      const sources = [
        { name: "google", p: 0.45 },
        { name: "instagram", p: 0.3 },
        { name: "referral", p: 0.15 },
        { name: "email", p: 0.1 },
      ];
      function pickSrc() {
        const r = Math.random();
        let acc = 0;
        for (const s of sources) { acc += s.p; if (r <= acc) return s.name; }
        return "other";
      }
      for (let i = 0; i < 30; i++) {
        const d = new Date(today.getTime() - i * 86400000);
        // daily volumes
        const links = 5 + Math.floor(Math.random() * 10);
        const scans = Math.max(0, Math.floor(links * (0.6 + Math.random() * 0.2)));
        const bookings = Math.max(0, Math.floor(scans * (0.25 + Math.random() * 0.1)));
        const reviews = Math.max(0, Math.floor(bookings * (0.4 + Math.random() * 0.2)));
        for (let j = 0; j < links; j++) {
          const ts = new Date(d.getTime() - Math.random() * 86400000).toISOString();
          demo.push({ type: "utm_link_built", ts, meta: { source: pickSrc() } });
        }
        for (let j = 0; j < scans; j++) {
          const ts = new Date(d.getTime() - Math.random() * 86400000).toISOString();
          demo.push({ type: "qr_scan", ts, meta: {} });
        }
        for (let j = 0; j < bookings; j++) {
          const ts = new Date(d.getTime() - Math.random() * 86400000).toISOString();
          demo.push({ type: "booking_created", ts, meta: { service: ["mens-cut","beard-trim","skin-fade"][Math.floor(Math.random()*3)] } });
        }
        for (let j = 0; j < reviews; j++) {
          const ts = new Date(d.getTime() - Math.random() * 86400000).toISOString();
          const rating = 4 + Math.random();
          demo.push({ type: "review_completed", ts, meta: { rating: Math.min(5, Math.max(3.5, Number(rating.toFixed(1)))) } });
        }
      }
      const all = [...existing, ...demo].slice(-1000);
      localStorage.setItem(KEY, JSON.stringify(all));
      setNow(new Date());
    } catch {}
  }

  // Build 7-day sparkline data
  const sparkData = useMemo(() => {
    if (typeof window === "undefined") return [] as { day: string; count: number }[];
    const events = getEvents(7);
    const days: { day: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = events.filter((e) => e.ts.slice(0, 10) === key).length;
      days.push({ day: key.slice(5), count });
    }
    return days;
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="container space-y-6">
      <Tour
        id="dashboard"
        steps={[
          { title: "Load demo metrics", body: "Use the Load Demo button to populate KPIs and charts for a quick preview." },
          { title: "Review 30‑day KPIs", body: "Links, QR scans, bookings, and reviews update here with your activity." },
          { title: "Export or print", body: "Export a CSV snapshot or print this dashboard for weekly reviews." }
        ]}
      />
      <PageHeader
        title="Belmont Dashboard"
        subtitle="Executive overview with actions and quick wins."
        actions={
          <div className="flex gap-2">
            <Button onClick={loadDemoMetrics} variant="secondary" aria-label="Load Demo Metrics" data-testid="dashboard-load-demo">
              <Sparkles className="h-4 w-4 mr-2" />
              Load Demo Metrics
            </Button>
            <Button onClick={resetDemoMetrics} variant="outline" aria-label="Reset Demo" title="Clear recent demo metrics">
              <Trash2 className="h-4 w-4 mr-2" />
              Reset Demo
            </Button>
            <Button onClick={exportSnapshotCSV} variant="outline" aria-label="Export Snapshot" title="Download current KPI snapshot">
              <Download className="h-4 w-4 mr-2" />
              Export Snapshot
            </Button>
            <Button onClick={printDashboard} variant="outline" aria-label="Print Dashboard" title="Print this dashboard">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button asChild variant="outline">
              <Link href="/apps/onboarding"><ArrowRight className="h-4 w-4 mr-2"/>Onboarding</Link>
            </Button>
            <Button asChild>
              <Link href="/apps/utm-dashboard"><LinkIcon className="h-4 w-4 mr-2"/>Create Tracking Link</Link>
            </Button>
            <Button onClick={exportEvents} variant="outline" aria-label="Export Events CSV" title="Download recent activity CSV">Export Events CSV</Button>
          </div>

        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">How to use this dashboard</CardTitle>
          <CardDescription>
            Start with Onboarding if you haven’t set your info. Then use the quick links to create a tracking link and request reviews.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Executive KPIs (30 days) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard label="Links (30d)" value={kpis.links} hint="UTM links created" />
        <KPICard label="QR Scans (30d)" value={kpis.scans} hint="From printed QR/QR tools" />
        <KPICard label="Bookings (30d)" value={kpis.bookings} hint="Estimated" />
        <KPICard label="Reviews (30d)" value={kpis.reviews} hint="Completed" />
        <KPICard label="Avg Rating" value={kpis.avgRating} hint="Out of 5.0" />
      </div>

      {/* Trends + Attribution */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">30‑Day Trends</CardTitle>
            <CardDescription>Links, bookings, and reviews</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56" role="img" aria-label="30-day trends chart" title="30-day trends chart" data-testid="chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend30} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" tickLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} width={30} />
                  <ReTooltip />
                  <Line type="monotone" dataKey="links" name="Links" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="bookings" name="Bookings" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="reviews" name="Reviews" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attribution (30d)</CardTitle>
            <CardDescription>Top sources for UTM links</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56" role="img" aria-label="Attribution pie chart" title="Attribution pie chart" data-testid="chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceAttribution} dataKey="value" nameKey="name" outerRadius={90} innerRadius={40}>
                    {sourceAttribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings by Campaign */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bookings by Campaign (30d)</CardTitle>
          <CardDescription>From recent activity; use GA4 for exact production data</CardDescription>
        </CardHeader>
        <CardContent>
          {bookingsByCampaign.length ? (
            bookingsByCampaign.map((c, i) => (
              <div key={c.name} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-3 w-3 rounded-sm ${COLOR_CLASSES[i % COLOR_CLASSES.length]}`} />
                  <span className="truncate max-w-[70%]" title={c.name}>{c.name}</span>
                </div>
                <span className="font-medium">{c.value}</span>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">No bookings recorded yet</div>
          )}
        </CardContent>
      </Card>

      {/* GA4 Conversions by Source (30d) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversions by Source (30d)</CardTitle>
          <CardDescription>Production data (GA4)</CardDescription>
        </CardHeader>
        <CardContent>
          {ga4Status === "ok" && ga4Sources && ga4Sources.length ? (
            ga4Sources.map((s, i) => (
              <div key={s.name} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-3 w-3 rounded-sm ${COLOR_CLASSES[i % COLOR_CLASSES.length]}`} />
                  <span className="capitalize">{s.name}</span>
                </div>
                <span className="font-medium">{s.value}</span>
              </div>
            ))
          ) : ga4Status === "loading" ? (
            <div className="space-y-2">
              <div className="h-4 bg-muted/60 rounded shimmer" />
              <div className="h-4 bg-muted/50 rounded shimmer" />
              <div className="h-4 bg-muted/40 rounded shimmer w-2/3" />
            </div>
          ) : ga4Status === "not_configured" ? (
            <div className="text-sm text-muted-foreground">
              Connect Google Analytics 4 to see conversions by source.
              <div className="text-xs mt-2">Tip: Add GA4 credentials in Vercel and this card will auto‑enable.</div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Unable to load GA4 data right now.</div>
          )}
        </CardContent>
      </Card>

      {/* GA4 Conversions by Service (30d) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversions by Service (30d)</CardTitle>
          <CardDescription>Production data (GA4)</CardDescription>
        </CardHeader>
        <CardContent>
          {ga4ServicesStatus === "ok" && ga4Services && ga4Services.length ? (
            ga4Services.map((s, i) => (
              <div key={s.name} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-3 w-3 rounded-sm ${COLOR_CLASSES[i % COLOR_CLASSES.length]}`} />
                  <span className="capitalize">{s.name.replace(/-/g, " ")}</span>
                </div>
                <span className="font-medium">{s.value}</span>
              </div>
            ))
          ) : ga4ServicesStatus === "loading" ? (
            <div className="space-y-2">
              <div className="h-4 bg-muted/60 rounded shimmer" />
              <div className="h-4 bg-muted/50 rounded shimmer" />
              <div className="h-4 bg-muted/40 rounded shimmer w-2/3" />
            </div>
          ) : ga4ServicesStatus === "not_configured" ? (
            <div className="text-sm text-muted-foreground">
              Connect GA4 and set GA4_SERVICE_PARAM_NAME to see conversions by service.
              <div className="text-xs mt-2">Tip: Set GA4_PROPERTY_ID, GOOGLE_APPLICATION_CREDENTIALS_JSON, and GA4_SERVICE_PARAM_NAME in Vercel.</div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Unable to load GA4 data right now.</div>
          )}
        </CardContent>
      </Card>

      {/* GA4 Explainer (plain English) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Understanding the GA4 cards</CardTitle>
          <CardDescription>Simple help for reading these numbers</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p><strong>Conversions by Source</strong> shows where bookings come from (for example, Google or Instagram).</p>
          <p><strong>Conversions by Service</strong> shows what people book the most (for example, men’s cut or beard trim).</p>
          <p>Use this to double down on what works. If a source is strong, post there more. If a service is popular, feature it.</p>
          <p className="text-xs">If you see “Connect GA4”, add the GA4 credentials in Vercel. We can do this for you.</p>
        </CardContent>
      </Card>

      {/* Simple Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Marketing Funnel (30d)</CardTitle>
          <CardDescription>From links → QR scans → bookings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Links</span>
              <span>{kpis.links}</span>
            </div>
            <div className="h-3 bg-muted rounded">
              <div className={`h-3 rounded belmont-accent ${funnelW.links}`} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>QR Scans</span>
              <span>{kpis.scans}</span>
            </div>
            <div className="h-3 bg-muted rounded">
              <div className={`h-3 rounded bg-blue-500 ${funnelW.scans}`} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Bookings</span>
              <span>{kpis.bookings}</span>
            </div>
            <div className="h-3 bg-muted rounded">
              <div className={`h-3 rounded bg-emerald-500 ${funnelW.bookings}`} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Onboarding Status</CardTitle>
          <CardDescription>Complete these to unlock one‑click review requests and consistent tracking.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <StatusRow ok={ob.placeIdSet} label="Google Place ID set" />
            <StatusRow ok={ob.bookingSet} label="Booking link confirmed" />
            <StatusRow ok={ob.phoneSet} label="Phone number confirmed" />
            <StatusRow ok={ob.addressSet} label="Address confirmed" />
          </div>
          {!ob.complete && (
            <div className="mt-3">
              <Button asChild>
                <Link href="/apps/onboarding"><ArrowRight className="h-4 w-4 mr-2"/>Finish Onboarding</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LinkIcon className="h-4 w-4"/>Quick: Create Tracking Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Create a UTM link for your next post and download a QR.</p>
            <Button asChild size="sm" variant="outline"><Link href="/apps/utm-dashboard">Open UTM Dashboard</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageSquare className="h-4 w-4"/>Quick: Request Reviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Copy CASL‑compliant email/SMS and send to two recent clients.</p>
            <Button asChild size="sm" variant="outline"><Link href="/apps/review-link">Open Review Requests</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4"/>Quick: Post to Google</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Generate a fresh GBP post about a featured service.</p>
            <Button asChild size="sm" variant="outline"><Link href="/apps/gbp-composer">Open GBP Composer</Link></Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><QrCode className="h-4 w-4"/>Link‑in‑Bio (Instagram)</CardTitle>
          <CardDescription>Share a single bio link that tracks Book Now, Services, Discounts, and Reviews.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          <Button asChild><Link href="/l">Open Link‑in‑Bio</Link></Button>
        </CardContent>
      </Card>

      {/* Reviews on Google */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reviews on Google</CardTitle>
          <CardDescription>Rating and total reviews</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          {placeSummaryStatus === "ok" && placeSummary ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <span>{(placeSummary.rating ?? 0).toFixed(1)} stars</span>
              </div>
              <div className="text-muted-foreground">{placeSummary.count ?? 0} reviews</div>
            </div>
          ) : placeSummaryStatus === "loading" ? (
            <div className="space-y-2">
              <div className="h-4 bg-muted/60 rounded shimmer w-1/3" />
              <div className="h-4 bg-muted/50 rounded shimmer w-1/4" />
            </div>
          ) : placeSummaryStatus === "not_configured" ? (
            <div className="text-muted-foreground">Connect Google Maps API to show rating and review count.</div>
          ) : (
            <div className="text-muted-foreground">Unable to load reviews right now.</div>
          )}
          <div className="flex gap-2 mt-3">
            <Button asChild size="sm" variant="outline">
              <a href={(placeSummary?.url || BELMONT_CONSTANTS.REVIEW_GOOGLE_URL)} target="_blank" rel="noopener noreferrer">See on Google</a>
            </Button>
            <Button asChild size="sm">
              <Link href="/apps/review-link">Request Reviews</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Contact & Location */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact & Location</CardTitle>
          <CardDescription>Call, directions, hours, and booking</CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            <a href={BELMONT_CONSTANTS.PHONE_TEL} className="underline underline-offset-2">{BELMONT_CONSTANTS.PHONE_DISPLAY}</a>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <a href={BELMONT_CONSTANTS.MAP_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{BELMONT_CONSTANTS.ADDRESS_STR}</a>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            {hoursStatus === "ok" && (hours?.open_now === true || hours?.open_now === false) ? (
              <span>{hours.open_now ? "Open now" : "Closed now"}</span>
            ) : hoursStatus === "loading" ? (
              <span>
                <span className="inline-block h-3 w-24 bg-muted/60 rounded shimmer align-middle" aria-hidden />
                <span className="sr-only">Loading hours…</span>
              </span>
            ) : hoursStatus === "not_configured" ? (
              <span>Hours unavailable (connect Google Maps API)</span>
            ) : (
              <span>Hours unavailable</span>
            )}
          </div>
          {hoursStatus === "ok" && hours?.weekday_text?.length ? (
            <ul className="text-xs text-muted-foreground list-disc pl-5">
              {hours.weekday_text.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
          <div className="flex gap-2 pt-2">
            <Button asChild size="sm"><a href={BELMONT_CONSTANTS.BOOK_URL} target="_blank" rel="noopener noreferrer">Book Now</a></Button>
            <Button asChild size="sm" variant="outline"><a href={BELMONT_CONSTANTS.MAP_URL} target="_blank" rel="noopener noreferrer">Directions</a></Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity (last 7 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" hide tickLine={false} />
                <YAxis hide domain={[0, 'dataMax+2']} />
                <ReTooltip />
                <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Goals & Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Goals & Alerts</CardTitle>
          <CardDescription>Simple checks to guide actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            {alerts.map((a, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  {a.ok ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                  <span>{a.label}</span>
                </div>
                {!a.ok && (
                  <span className="text-xs text-muted-foreground">Needs attention</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Week‑over‑week links: {linksWoW.curr} vs {linksWoW.prev} ({linksWoW.change}% {linksWoW.change >= 0 ? <TrendingUp className="inline h-3 w-3"/> : <TrendingDown className="inline h-3 w-3"/>})
          </div>
        </CardContent>
      </Card>

      {/* Leaderboards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Sources (30d)</CardTitle>
            <CardDescription>Where links originate</CardDescription>
          </CardHeader>
          <CardContent>
            {sourceAttribution.map((s, i) => (
              <div key={s.name} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-3 w-3 rounded-sm ${COLOR_CLASSES[i % COLOR_CLASSES.length]}`} />
                  <span className="capitalize">{s.name}</span>
                </div>
                <span className="font-medium">{s.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Services (30d)</CardTitle>
            <CardDescription>Booked most often</CardDescription>
          </CardHeader>
          <CardContent>
            {topServices.length ? (
              topServices.map((s) => (
                <div key={s.service} className="flex items-center justify-between py-1">
                  <span className="capitalize">{s.service.replace(/-/g, " ")}</span>
                  <span className="font-medium">{s.count}</span>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No bookings yet</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Campaigns (30d)</CardTitle>
            <CardDescription>UTM campaigns by link activity</CardDescription>
          </CardHeader>
          <CardContent>
            {campaignAttribution.length ? (
              campaignAttribution.map((c) => (
                <div key={c.name} className="flex items-center justify-between py-1">
                  <span className="truncate max-w-[70%]" title={c.name}>{c.name}</span>
                  <span className="font-medium">{c.value}</span>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No campaign activity yet</div>
            )}
            <div className="text-xs text-muted-foreground mt-2">Tip: Enable GA4 in env to see exact bookings by campaign.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <CheckCircle className="h-4 w-4 text-green-600" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-amber-600" />
      )}
      <span>{label}</span>
    </div>
  );
}
