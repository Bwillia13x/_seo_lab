"use client";

import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Upload,
  Sparkles,
  Download,
  Mail,
  MessageSquare,
  Settings,
  Search,
  Users,
} from "lucide-react";
import { saveBlob } from "@/lib/blob";
import { parseCSV, toCSV } from "@/lib/csv";
import { todayISO } from "@/lib/dates";

// ---------------- Types ----------------
type Customer = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  lastVisit: Date;
  visits: number;
  spend: number;
};

type Scores = {
  R: number; // 1..bins
  F: number;
  M: number;
  recencyDays: number; // derived
};

type SegRecord = Customer & Scores & { segment: string };

// ---------------- Utilities ----------------
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function parseDateFlexible(s: string): Date | null {
  if (!s) return null;
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t);
  // Try YYYY-MM-DD HH:MM
  const m = /^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})$/.exec(s.trim());
  if (m) return new Date(`${m[1]}T${m[2]}:00`);
  return null;
}

function daysBetween(a: Date, b: Date) {
  const ms = Math.abs(b.getTime() - a.getTime());
  return Math.floor(ms / 86400000);
}

function fmtMoney(x: number) {
  return `$${x.toFixed(2)}`;
}

function quantileBreaks(values: number[], bins: number): number[] {
  if (values.length === 0) return [];
  const vs = [...values].sort((a, b) => a - b);
  const breaks: number[] = [];
  for (let i = 1; i < bins; i++) {
    const p = i / bins;
    const idx = Math.min(vs.length - 1, Math.floor(p * vs.length));
    breaks.push(vs[idx]);
  }
  return breaks;
}

function scoreByQuantiles(
  values: number[],
  bins: number,
  higherIsBetter = true
): number[] {
  if (values.length === 0) return [];
  const v = [...values];
  const ranks = [...v].sort((a, b) => a - b);
  const score: number[] = [];
  for (const x of values) {
    // percentile rank
    let idx = ranks.findIndex((r) => r > x);
    if (idx === -1) idx = ranks.length;
    const p = idx / ranks.length; // 0..1
    let sc = Math.floor(p * bins) + 1; // 1..bins (lower values → lower score)
    if (higherIsBetter) {
      // higher x → higher score already
    } else {
      // invert for recency days (lower days better)
      sc = bins - sc + 1;
    }
    sc = clamp(sc, 1, bins);
    score.push(sc);
  }
  return score;
}

function makeSegmentLabel(
  R: number,
  F: number,
  M: number,
  bins: number
): string {
  // Simple, readable rule set; tweak to taste
  const high = Math.max(4, bins - 1);
  const top = bins;
  if (R >= high && F >= high && M >= high) return "VIP";
  if (R >= high && F === top) return "Loyal";
  if (M === top && F >= high) return "Big Spender";
  if (R === top && F <= 2) return "New";
  if (R >= high && F <= 2) return "Promising";
  if (R <= 2 && F >= high) return "At Risk";
  if (R === 1) return "Lapsed";
  return "Hibernating";
}

function templateForSegment(seg: string) {
  switch (seg) {
    case "VIP":
      return {
        emailSubject: "A little thank‑you from Belmont (VIP perks inside)",
        emailBody:
          "Hi [First Name],\n\nWe appreciate your trust in us. As a VIP, enjoy priority booking and a complimentary hot towel finish on your next visit. Book here: [Booking Link].\n\n— The Belmont Team",
        sms: "Belmont VIP: thanks for being with us. Enjoy a complimentary hot towel finish on your next visit. Book: [Short Link] (reply STOP to opt out)",
      };
    case "Loyal":
      return {
        emailSubject: "Your chair's ready — priority slots this week",
        emailBody:
          "Hi [First Name],\n\nJust opened extra slots this week — perfect for a quick tidy‑up. Book in seconds: [Booking Link].\n\n— Belmont",
        sms: "Belmont: extra slots opened this week. Quick tidy‑up? Book: [Short Link] (reply STOP to opt out)",
      };
    case "Big Spender":
      return {
        emailSubject: "Keep it sharp — premium time slots held for you",
        emailBody:
          "Hi [First Name],\n\nWe've set aside premium time slots that fit your schedule. Reserve now: [Booking Link].\n\n— Belmont",
        sms: "Belmont: premium time slots available — reserve now: [Short Link] (reply STOP to opt out)",
      };
    case "New":
      return {
        emailSubject: "Welcome to Belmont — here's what to expect",
        emailBody:
          "Hi [First Name],\n\nGreat to have you. Here's a quick guide to styles and maintenance between visits. Ready for your next cut? Book: [Booking Link].\n\n— Belmont",
        sms: "Welcome to Belmont! Ready for your next cut? Book in seconds: [Short Link] (reply STOP to opt out)",
      };
    case "Promising":
      return {
        emailSubject: "Mid‑week window just for you",
        emailBody:
          "Hi [First Name],\n\nWe've set aside a quiet mid‑week window — quick in, quick out. Book here: [Booking Link].\n\n— Belmont",
        sms: "Belmont: quiet mid‑week window available — quick in/out. Book: [Short Link] (reply STOP to opt out)",
      };
    case "At Risk":
      return {
        emailSubject: "We'd love to see you again (save a spot)",
        emailBody:
          "Hi [First Name],\n\nIt's been a while — we've saved a slot that fits your schedule. If we can improve anything, hit reply. Book: [Booking Link].\n\n— Belmont",
        sms: "Belmont: we saved you a spot. Anything we can improve? Book: [Short Link] (reply STOP to opt out)",
      };
    case "Lapsed":
      return {
        emailSubject: "A quick refresh? Your neighbors are booking",
        emailBody:
          "Hi [First Name],\n\nWe miss you around here. If you're up for a refresh, here's an easy booking link: [Booking Link].\n\n— Belmont",
        sms: "Belmont: long time no see — fancy a refresh? Book: [Short Link] (reply STOP to opt out)",
      };
    default:
      return {
        emailSubject: "Your next visit at Belmont",
        emailBody:
          "Hi [First Name],\n\nWe've got availability this week and would love to get you back in the chair. Book: [Booking Link].\n\n— Belmont",
        sms: "Belmont: openings this week — book in seconds: [Short Link] (reply STOP to opt out)",
      };
  }
}

// ---------------- Demo Data ----------------
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildDemoCustomers(n = 400): Record<string, string>[] {
  const first = [
    "Alex",
    "Maya",
    "Jordan",
    "Sam",
    "Riley",
    "Chris",
    "Taylor",
    "Jamie",
    "Casey",
    "Drew",
    "Avery",
    "Morgan",
    "Kai",
    "Quinn",
  ];
  const last = [
    "Nguyen",
    "Patel",
    "Brown",
    "Smith",
    "Lee",
    "Garcia",
    "Martin",
    "Wilson",
    "Kim",
    "Roy",
    "Singh",
    "Harris",
    "Clarke",
    "Carter",
  ];
  const rows: Record<string, string>[] = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const name = `${randomChoice(first)} ${randomChoice(last)}`;
    const id = `CUST${(10000 + i).toString()}`;
    const email = `${name.toLowerCase().replace(/[^a-z]/g, ".")}@example.com`;
    const phone = `403-555-${(1000 + Math.floor(Math.random() * 9000)).toString()}`;
    const lastDays = Math.floor(Math.random() * 180); // 0..179 days ago
    const lastVisit = new Date(today.getTime() - lastDays * 86400000);
    const visits = Math.max(1, Math.floor(Math.random() * 8));
    const spend = Math.round(
      (30 + Math.random() * 80) * visits * (0.8 + Math.random() * 0.6)
    );
    rows.push({
      id,
      name,
      email,
      phone,
      last_visit: lastVisit.toISOString(),
      visits: String(visits),
      total_spend: String(spend),
    });
  }
  return rows;
}

// ---------------- Main Component ----------------
export default function RFMMicroCRM() {
  const [raw, setRaw] = useState<Record<string, string>[]>([]);
  const [mapCols, setMapCols] = useState<{
    id?: string;
    name: string;
    email?: string;
    phone?: string;
    last: string;
    visits: string;
    spend: string;
  }>({
    id: "id",
    name: "name",
    email: "email",
    phone: "phone",
    last: "last_visit",
    visits: "visits",
    spend: "total_spend",
  });
  const [bins, setBins] = useState<number>(5);
  const [asOf, setAsOf] = useState<string>(todayISO());
  const [minVisits, setMinVisits] = useState<number>(1);
  const [minSpend, setMinSpend] = useState<number>(0);
  const [search, setSearch] = useState<string>("");
  const [selectedSeg, setSelectedSeg] = useState<string>("ALL");

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const csv = ev.target?.result as string;
      try {
        const parsed = parseCSV(csv);
        setRaw(parsed);
      } catch (err) {
        alert("CSV parse error: " + String(err));
      }
    };
    reader.readAsText(f);
  }

  function loadDemo() {
    setRaw(buildDemoCustomers(500));
  }

  // Map to normalized customers
  const customers: Customer[] = useMemo(() => {
    const out: Customer[] = [];
    for (const r of raw) {
      const name = (r[mapCols.name] || "").trim();
      if (!name) continue;
      const last = parseDateFlexible(r[mapCols.last] || "");
      if (!last) continue;
      const visits = Number(r[mapCols.visits] || 0);
      if (!Number.isFinite(visits)) continue;
      const spend = Number(r[mapCols.spend] || 0);
      if (!Number.isFinite(spend)) continue;
      if (visits < minVisits || spend < minSpend) continue;
      out.push({
        id: (r[mapCols.id || ""] || name).toString(),
        name,
        email: r[mapCols.email || ""] || undefined,
        phone: r[mapCols.phone || ""] || undefined,
        lastVisit: last,
        visits,
        spend,
      });
    }
    return out;
  }, [raw, mapCols, minVisits, minSpend]);

  const asOfDate = useMemo(() => new Date(asOf + "T00:00:00"), [asOf]);

  // Compute recency days
  const recencyDaysArr = useMemo(
    () => customers.map((c) => daysBetween(c.lastVisit, asOfDate)),
    [customers, asOfDate]
  );
  const frequencyArr = useMemo(
    () => customers.map((c) => c.visits),
    [customers]
  );
  const monetaryArr = useMemo(() => customers.map((c) => c.spend), [customers]);

  // Scores
  const Rscores = useMemo(
    () => scoreByQuantiles(recencyDaysArr, bins, /*higherIsBetter*/ false),
    [recencyDaysArr, bins]
  );
  const Fscores = useMemo(
    () => scoreByQuantiles(frequencyArr, bins, true),
    [frequencyArr, bins]
  );
  const Mscores = useMemo(
    () => scoreByQuantiles(monetaryArr, bins, true),
    [monetaryArr, bins]
  );

  const scored: SegRecord[] = useMemo(
    () =>
      customers.map((c, i) => {
        const recDays = recencyDaysArr[i] ?? 9999;
        const R = Rscores[i] ?? 1,
          F = Fscores[i] ?? 1,
          M = Mscores[i] ?? 1;
        const segment = makeSegmentLabel(R, F, M, bins);
        return { ...c, R, F, M, recencyDays: recDays, segment };
      }),
    [customers, Rscores, Fscores, Mscores, recencyDaysArr, bins]
  );

  // Segment counts and filtered view
  const segmentCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of scored) m.set(s.segment, (m.get(s.segment) || 0) + 1);
    return Array.from(m.entries()).map(([segment, count]) => ({
      segment,
      count,
    }));
  }, [scored]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scored.filter(
      (s) =>
        (selectedSeg === "ALL" || s.segment === selectedSeg) &&
        (q === "" ||
          s.name.toLowerCase().includes(q) ||
          (s.email || "").toLowerCase().includes(q) ||
          (s.phone || "").toLowerCase().includes(q))
    );
  }, [scored, search, selectedSeg]);

  const segList = useMemo(
    () => [
      "ALL",
      ...segmentCounts
        .map((x) => x.segment)
        .slice()
        .sort((a, b) => a.localeCompare(b)),
    ],
    [segmentCounts]
  );

  // KPI metrics
  const totalCustomers = filtered.length;
  const vipCount = useMemo(
    () => scored.filter((s) => s.segment === "VIP").length,
    [scored]
  );
  const avgSpend = useMemo(
    () =>
      filtered.length
        ? filtered.reduce((sum, s) => sum + s.spend, 0) / filtered.length
        : 0,
    [filtered]
  );
  const medianRecency = useMemo(() => {
    const arr = filtered.map((s) => s.recencyDays).sort((a, b) => a - b);
    if (arr.length === 0) return 0;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2
      ? arr[mid]
      : Math.round((arr[mid - 1] + arr[mid]) / 2);
  }, [filtered]);

  // Message dialog state
  const [openMsg, setOpenMsg] = useState<boolean>(false);
  const [msgSeg, setMsgSeg] = useState<string>("VIP");
  const [bookingLink, setBookingLink] = useState<string>(
    "https://thebelmontbarber.ca/book"
  );

  const msgTemplate = useMemo(() => templateForSegment(msgSeg), [msgSeg]);

  function exportCSV() {
    const rows = filtered.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email || "",
      phone: s.phone || "",
      last_visit: s.lastVisit.toISOString().slice(0, 10),
      visits: s.visits,
      total_spend: s.spend,
      R: s.R,
      F: s.F,
      M: s.M,
      segment: s.segment,
    }));
    const csv = toCSV(rows);
    saveBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      `belmont-rfm-export-${todayISO()}.csv`
    );
  }

  function copyEmails() {
    const emails = filtered.map((s) => s.email).filter(Boolean) as string[];
    navigator.clipboard
      .writeText(emails.join(", "))
      .then(() => alert(`Copied ${emails.length} emails`));
  }

  // Chart data (top 8 segments by count)
  const chartData = useMemo(() => {
    const sorted = [...segmentCounts].sort((a, b) => b.count - a.count);
    return sorted.slice(0, 8);
  }, [segmentCounts]);

  return (
    <div className="p-5 md:p-8 space-y-6">
      <PageHeader
        title="Customer Analysis"
        subtitle="Segment customers by Recency, Frequency, and Monetary value. Generate winback/VIP templates and export lists."
        actions={
          <>
            <Button variant="secondary" onClick={loadDemo}>
              <Sparkles className="h-4 w-4 mr-2" />
              Load Demo
            </Button>
            <input
              type="file"
              accept=".csv"
              onChange={onFile}
              className="hidden"
              id="rfmCsv"
            />
            <label htmlFor="rfmCsv">
              <Button asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload CSV
                </span>
              </Button>
            </label>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Customers"
          value={totalCustomers}
          icon={<Users className="h-4 w-4" />}
        />
        <KPICard
          label="VIPs"
          value={vipCount}
          icon={<Sparkles className="h-4 w-4 text-yellow-600" />}
        />
        <KPICard
          label="Avg Spend"
          value={fmtMoney(avgSpend)}
          icon={<Download className="hidden" />} // placeholder to keep layout consistent
          hint="Per filtered customer"
        />
        <KPICard
          label="Median Recency"
          value={`${medianRecency} d`}
          icon={<Download className="hidden" />} // placeholder to keep layout consistent
          hint="Days since last visit"
        />
      </div>

      {/* Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Scoring Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-5 gap-3">
            <div>
              <Label>Bins (1..7)</Label>
              <Input
                type="number"
                min={3}
                max={7}
                value={bins}
                onChange={(e) =>
                  setBins(clamp(parseInt(e.target.value || "5"), 3, 7))
                }
              />
            </div>
            <div>
              <Label>As‑of date</Label>
              <Input
                type="date"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
              />
            </div>
            <div>
              <Label>Min visits</Label>
              <Input
                type="number"
                min={0}
                value={minVisits}
                onChange={(e) =>
                  setMinVisits(clamp(parseInt(e.target.value || "0"), 0, 9999))
                }
              />
            </div>
            <div>
              <Label>Min spend ($)</Label>
              <Input
                type="number"
                min={0}
                value={minSpend}
                onChange={(e) =>
                  setMinSpend(
                    clamp(parseInt(e.target.value || "0"), 0, 1000000)
                  )
                }
              />
            </div>
            <div>
              <Label>Search</Label>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="name, email, phone"
                />
              </div>
            </div>
          </div>

          <Separator className="my-2" />

          {/* Column mapping */}
          <div className="grid md:grid-cols-6 gap-3">
            <div>
              <Label>id</Label>
              <Input
                value={mapCols.id}
                onChange={(e) =>
                  setMapCols((c) => ({ ...c, id: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>name*</Label>
              <Input
                value={mapCols.name}
                onChange={(e) =>
                  setMapCols((c) => ({ ...c, name: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>email</Label>
              <Input
                value={mapCols.email}
                onChange={(e) =>
                  setMapCols((c) => ({ ...c, email: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>phone</Label>
              <Input
                value={mapCols.phone}
                onChange={(e) =>
                  setMapCols((c) => ({ ...c, phone: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>last_visit*</Label>
              <Input
                value={mapCols.last}
                onChange={(e) =>
                  setMapCols((c) => ({ ...c, last: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>visits*</Label>
              <Input
                value={mapCols.visits}
                onChange={(e) =>
                  setMapCols((c) => ({ ...c, visits: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>total_spend*</Label>
              <Input
                value={mapCols.spend}
                onChange={(e) =>
                  setMapCols((c) => ({ ...c, spend: e.target.value }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Segment chips & actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {segList.map((seg) => (
            <Button
              key={seg}
              size="sm"
              variant={selectedSeg === seg ? "default" : "outline"}
              onClick={() => setSelectedSeg(seg)}
            >
              <Users className="h-3.5 w-3.5 mr-1" />
              {seg}
              {seg !== "ALL" && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {segmentCounts.find((x) => x.segment === seg)?.count || 0}
                </span>
              )}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyEmails}>
            <Mail className="h-4 w-4 mr-1" />
            Copy Emails
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
          <Button size="sm" onClick={() => setOpenMsg(true)}>
            <MessageSquare className="h-4 w-4 mr-1" />
            Generate Messages
          </Button>
        </div>
      </div>

      {/* Charts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Segment Counts (Top)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="segment" />
                <YAxis />
                <ReTooltip />
                <Bar dataKey="count" name="Customers" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Customers ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Last Visit</TableHead>
                  <TableHead className="text-right">Visits</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-center">R</TableHead>
                  <TableHead className="text-center">F</TableHead>
                  <TableHead className="text-center">M</TableHead>
                  <TableHead>Segment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s, i) => (
                  <TableRow key={s.id + "-" + i}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {s.id}
                    </TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-xs">{s.email || ""}</TableCell>
                    <TableCell className="text-xs">{s.phone || ""}</TableCell>
                    <TableCell className="text-xs">
                      {s.lastVisit.toISOString().slice(0, 10)}{" "}
                      <span className="text-muted-foreground">
                        ({s.recencyDays}d)
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{s.visits}</TableCell>
                    <TableCell className="text-right">
                      {fmtMoney(s.spend)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{s.R}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{s.F}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{s.M}</Badge>
                    </TableCell>
                    <TableCell>{s.segment}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Message Dialog */}
      {openMsg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">
                Message Templates by Segment
              </h2>
              <div className="grid md:grid-cols-2 gap-3 mb-4">
                <div>
                  <Label htmlFor="rfmSegmentSelect">Segment</Label>
                  <select
                    title="Select segment"
                    id="rfmSegmentSelect"
                    value={msgSeg}
                    onChange={(e) => setMsgSeg(e.target.value)}
                    className="w-full border rounded-md h-9 px-2"
                  >
                    {Array.from(new Set(segmentCounts.map((x) => x.segment)))
                      .concat([
                        "VIP",
                        "Loyal",
                        "Big Spender",
                        "New",
                        "Promising",
                        "At Risk",
                        "Lapsed",
                        "Hibernating",
                      ])
                      .map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="rfmBookingLink">Booking Link</Label>
                  <Input
                    id="rfmBookingLink"
                    value={bookingLink}
                    onChange={(e) => setBookingLink(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="rfmEmailSubject">Email Subject</Label>
                  <Input
                    id="rfmEmailSubject"
                    value={msgTemplate.emailSubject}
                    readOnly
                    placeholder="Subject"
                    title="Email Subject"
                  />
                </div>
                <div>
                  <Label htmlFor="rfmEmailBody">Email Body</Label>
                  <textarea
                    id="rfmEmailBody"
                    className="w-full border rounded-md p-2 text-sm h-40"
                    readOnly
                    value={msgTemplate.emailBody.replace(
                      /\[Booking Link\]/g,
                      bookingLink
                    )}
                    placeholder="Email body"
                    title="Email Body"
                  />
                </div>
                <div>
                  <Label htmlFor="rfmSmsBody">
                    SMS (CASL: ensure consent + STOP)
                  </Label>
                  <textarea
                    id="rfmSmsBody"
                    className="w-full border rounded-md p-2 text-sm h-24"
                    readOnly
                    value={msgTemplate.sms.replace(
                      /\[Short Link\]/g,
                      bookingLink
                    )}
                    placeholder="SMS body"
                    title="SMS Body"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setOpenMsg(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer notes */}
      <div className="text-xs text-muted-foreground">
        <p>
          Tip: Adjust <em>Bins</em> for coarser/finer segments. Ensure CASL/PIPA
          compliance for any messaging (consent, identification, unsubscribe).
        </p>
      </div>
    </div>
  );
}
