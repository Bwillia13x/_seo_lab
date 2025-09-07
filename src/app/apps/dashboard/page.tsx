"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import { Tour } from "@/components/ui/tour";
import Link from "next/link";
import { getEvents, countByType, getOnboardingStatus } from "@/lib/analytics";
import { BELMONT_CONSTANTS } from "@/lib/constants";
import { CheckCircle, AlertTriangle, ArrowRight, Link as LinkIcon, MessageSquare, FileText, QrCode, Sparkles, Printer, Download, TrendingUp, TrendingDown, Trash2 } from "lucide-react";
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
  const last30 = useMemo(() => (typeof window !== "undefined" ? getEvents(30) : []), []);
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

  const COLORS = ["#6366f1", "#22c55e", "#eab308", "#ef4444", "#06b6d4", "#f97316"]; // brandish palette

  // Funnel widths
  const funnel = useMemo(() => {
    const { links, scans, bookings } = kpis;
    const max = Math.max(1, links, scans, bookings);
    function pct(n: number) { return `${Math.max(5, Math.round((n / max) * 100))}%`; }
    return { linksW: pct(links), scansW: pct(scans), bookingsW: pct(bookings) };
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
  }, []);

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
  }, []);

  return (
    <div className="space-y-6">
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
                  <Line type="monotone" dataKey="links" name="Links" stroke="#6366f1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="bookings" name="Bookings" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="reviews" name="Reviews" stroke="#f59e0b" strokeWidth={2} dot={false} />
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
              <div className="h-3 rounded belmont-accent" style={{ width: funnel.linksW }} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>QR Scans</span>
              <span>{kpis.scans}</span>
            </div>
            <div className="h-3 bg-muted rounded">
              <div className="h-3 rounded bg-blue-500" style={{ width: funnel.scansW }} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Bookings</span>
              <span>{kpis.bookings}</span>
            </div>
            <div className="h-3 bg-muted rounded">
              <div className="h-3 rounded bg-emerald-500" style={{ width: funnel.bookingsW }} />
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
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Sources (30d)</CardTitle>
            <CardDescription>Where links originate</CardDescription>
          </CardHeader>
          <CardContent>
            {sourceAttribution.map((s, i) => (
              <div key={s.name} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
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
