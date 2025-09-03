"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import Link from "next/link";
import { getEvents, countByType, getOnboardingStatus } from "@/lib/analytics";
import { BELMONT_CONSTANTS } from "@/lib/constants";
import { CheckCircle, AlertTriangle, ArrowRight, Link as LinkIcon, MessageSquare, FileText, QrCode } from "lucide-react";
import { saveBlob } from "@/lib/blob";
import { toCSV } from "@/lib/csv";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
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
  ], 1), [now]);

  const weekCounts = useMemo(() => countByType([
    "utm_link_built",
    "review_email_copied",
    "review_sms_copied",
    "gbp_post_generated",
  ], 7), [now]);

  const ob = useMemo(() => (typeof window !== "undefined" ? getOnboardingStatus() : { placeIdSet:false,bookingSet:false,phoneSet:false,addressSet:false,complete:false }), [now]);

  function exportEvents() {
    try {
      const rows = getEvents(30).map((e) => ({ ts: e.ts, type: e.type, meta: e.meta ? JSON.stringify(e.meta) : "" }));
      const csv = toCSV(rows);
      saveBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `belmont-events-last30.csv`);
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
  }, [now]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Belmont Dashboard"
        subtitle="Today’s key actions and quick links for wins."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/apps/onboarding"><ArrowRight className="h-4 w-4 mr-2"/>Onboarding</Link>
            </Button>
            <Button asChild>
              <Link href="/apps/utm-dashboard"><LinkIcon className="h-4 w-4 mr-2"/>Create Tracking Link</Link>
            </Button>
            <Button onClick={exportEvents} variant="outline">Export Events CSV</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="UTM Links (today)" value={todayCounts["utm_link_built"] || 0} />
        <KPICard label="Reviews (today)" value={(todayCounts["review_email_copied"]||0)+(todayCounts["review_sms_copied"]||0)} />
        <KPICard label="GBP Posts (today)" value={todayCounts["gbp_post_generated"] || 0} />
        <KPICard label="UTM Links (7d)" value={weekCounts["utm_link_built"] || 0} />
      </div>

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
