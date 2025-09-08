"use client";

import React, { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { showToast } from "@/lib/toast";
import { logEvent } from "@/lib/analytics";
import { BarChart3, Sparkles, Send } from "lucide-react";

// Minimal type to represent campaign performance
type PerfRow = {
  id: string;
  campaign: string;
  clicks: number;
  bookings: number;
  revenue: number; // CAD
};

function formatCurrency(n: number) {
  try {
    return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

export default function BookingsROI() {
  const [rows, setRows] = useState<PerfRow[]>([]);
  const [sending, setSending] = useState(false);

  const kpis = useMemo(() => {
    const campaigns = rows.length;
    const clicks = rows.reduce((a, r) => a + r.clicks, 0);
    const bookings = rows.reduce((a, r) => a + r.bookings, 0);
    const revenue = rows.reduce((a, r) => a + r.revenue, 0);
    return { campaigns, clicks, bookings, revenue };
  }, [rows]);

  function loadDemo() {
    // Generate a few mock campaigns with plausible numbers
    const demo: PerfRow[] = Array.from({ length: 5 }).map((_, i) => {
      const clicks = 40 + Math.floor(Math.random() * 120);
      const bookings = Math.max(2, Math.floor(clicks * (0.08 + Math.random() * 0.07)));
      const revenue = bookings * (60 + Math.floor(Math.random() * 45));
      return {
        id: `c${Date.now()}_${i}`,
        campaign: [
          "belmont-mens-cut-bridgeland",
          "belmont-beard-trim-calgary",
          "belmont-skin-fade-bridgeland",
          "belmont-gbp-profile",
          "belmont-instagram-bio",
        ][i % 5],
        clicks,
        bookings,
        revenue,
      };
    });
    setRows(demo);
    try { showToast("Loaded demo ROI data", "success"); } catch {}
  }

  async function sendTestConversion() {
    setSending(true);
    try {
      const res = await fetch("/api/ga4/collect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client_id: `${Math.floor(Math.random()*1e10)}.${Date.now()}`,
          events: [
            { name: "book_now", params: { value: 75, currency: "CAD", source: "demo", campaign: "belmont-demo" } }
          ]
        }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (res.ok) {
        try { showToast("Sent test conversion to GA4", "success"); } catch {}
        // Also log a local booking event so the Dashboard reflects immediately
        try {
          logEvent("booking_created", { campaign: "belmont-demo", service: "mens-cut" });
        } catch {}
      } else {
        console.warn("GA4 test conversion failed", data);
        try { showToast("GA4 test conversion failed", "error"); } catch {}
      }
    } catch (e) {
      console.error(e);
      try { showToast("Network error sending test conversion", "error"); } catch {}
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-5 md:p-8 space-y-6">
      <PageHeader
        title="Bookings ROI"
        subtitle="Attribute bookings to campaigns and quantify revenue impact."
        showLogo={true}
        actions={
          <div className="flex gap-2">
            <Button onClick={loadDemo} variant="secondary">
              <Sparkles className="h-4 w-4 mr-2" /> Load Demo
            </Button>
            <Button onClick={sendTestConversion} disabled={sending} variant="outline">
              <Send className="h-4 w-4 mr-2" /> {sending ? "Sending..." : "Send Test Conversion"}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Campaigns" value={kpis.campaigns} icon={<BarChart3 className="h-4 w-4" />} />
        <KPICard label="Clicks" value={kpis.clicks} />
        <KPICard label="Bookings" value={kpis.bookings} />
        <KPICard label="Est. Revenue" value={rows.length ? formatCurrency(kpis.revenue) : "—"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How this works</CardTitle>
          <CardDescription>
            Use UTM links everywhere you send people to book. We attribute clicks → bookings and estimate revenue. GA4 server events can be enabled for full-fidelity reporting.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          <ol className="list-decimal pl-5 space-y-1">
            <li>Create UTM links in Campaign Links and use them in posts and profiles.</li>
            <li>When available, wire GA4 Measurement Protocol via /api/ga4/collect.</li>
            <li>Review which campaigns generate bookings and revenue.</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance by campaign</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Est. Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length ? rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.campaign}</TableCell>
                    <TableCell className="text-right">{r.clicks}</TableCell>
                    <TableCell className="text-right">{r.bookings}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.revenue)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">No data yet — click Load Demo</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
