"use client";
import React, { useEffect, useMemo, useState } from "react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import {
  Download,
  Upload,
  Filter,
  Wand2,
  Play,
  Settings,
  Copy,
} from "lucide-react";

import { saveBlob } from "@/lib/blob";
import { parseCSV, toCSV } from "@/lib/csv";
import { todayISO } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";

// ---------------- Types ----------------
type Prospect = {
  id: string;
  name: string;
  url: string;
  type: string;
  email?: string;
  contact?: string;
  notes?: string;
  localness: number;
  relevance: number;
  authority: number;
  ease: number;
  confidence: number;
  impact: number;
  ice: number;
  priority: number;
  status: "todo" | "sent" | "responded" | "ignore";
};

// ---------------- Scoring ----------------
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function scoreBool(b: boolean, pts: number) {
  return b ? pts : 0;
}
function domainOf(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}
function has(s: string, ...vs: string[]) {
  return vs.some((v) => s.includes(v));
}
function urlEncode(s: string) {
  return encodeURIComponent(s);
}

// Localness scoring
function inferLocalness(name: string, url: string) {
  const d = domainOf(url);
  let pts = 0;
  pts += scoreBool(/\b(calgary|yyc|bridgeland|riverside)\b/i.test(name), 3);
  pts += scoreBool(/\b(calgary|yyc|bridgeland|riverside)\b/i.test(d), 2);
  pts += scoreBool(/\b(bridgeland|riverside)\b/i.test(name), 2);
  pts += scoreBool(/\b(ca|canada)\b/i.test(d), 1);
  return clamp(pts, 0, 5);
}

// Relevance scoring
function inferRelevance(name: string, url: string, type: string) {
  const d = domainOf(url);
  let pts = 0;
  pts += scoreBool(
    /\b(barber|hair|salon|shop|business|local)\b/i.test(name),
    3
  );
  pts += scoreBool(/\b(barber|hair|salon|shop|business|local)\b/i.test(d), 2);
  pts += scoreBool(type === "directory", 2);
  pts += scoreBool(type === "news" || type === "event", 1);
  pts += scoreBool(d.length <= 20, 1);
  return clamp(pts, 0, 5);
}

// Authority scoring
function inferAuthority(url: string, type: string) {
  const d = domainOf(url);
  let pts = 0;
  pts += scoreBool(/\.(ca|org|edu)$/i.test(d), 2);
  pts += scoreBool(/news|mag|journal|cbc|ctv|global/i.test(d), 2);
  pts += scoreBool(d.length <= 14, 1);
  pts += scoreBool(type === "directory", 1);
  return clamp(pts, 0, 5);
}

// Ease scoring
function inferEase(email?: string, contact?: string) {
  let pts = 1; // base
  pts += scoreBool(Boolean(email && email.includes("@")), 2);
  pts += scoreBool(Boolean(contact && contact.length > 0), 1);
  return clamp(pts, 0, 5);
}

// Confidence scoring
function inferConfidence(p: Partial<Prospect>) {
  let pts = 1;
  pts += scoreBool(Boolean(p.name && p.url), 2);
  pts += scoreBool(Boolean(p.email) || Boolean(p.contact), 1);
  return clamp(pts, 0, 5);
}

// Impact scoring
function inferImpact(type: string) {
  // event/news/directories higher impact; partner depends but assume high
  if (["news", "event"].includes(type)) return 5;
  if (["partner", "directory"].includes(type)) return 4;
  if (["cafe", "tattoo", "gym", "school"].includes(type)) return 3;
  return 2;
}

// ICE calculation
function computeICE(p: Prospect) {
  const I = clamp(p.impact, 0, 5);
  const C = clamp(p.confidence, 0, 5);
  const E = clamp(p.ease, 0, 5);
  const ice = I * C * E; // 0..125
  const priority = Math.round((ice / 125) * 100);
  return { ice, priority };
}

// ---------------- Outreach ----------------
function makeSubject(biz: string, area: string, type: string) {
  if (
    type === "partner" ||
    type === "cafe" ||
    type === "gym" ||
    type === "tattoo"
  )
    return `${area} collab? ${biz} × your audience`;
  if (type === "news" || type === "event")
    return `Neighbourhood feature tip: ${biz} in ${area}`;
  if (type === "directory") return `${biz} — listing update for ${area}`;
  return `${biz} in ${area} — quick idea`;
}

function makeEmail({
  biz,
  area,
  prospect,
  booking,
  includeStop,
  includeId,
}: {
  biz: string;
  area: string;
  prospect: Prospect;
  booking: string;
  includeStop: boolean;
  includeId: boolean;
}) {
  const subj = makeSubject(biz, area, prospect.type);
  const idLine = includeId ? `\n\n— ${biz} · ${booking}` : "";
  const stop = includeStop
    ? `\n\nIf you prefer not to receive emails from us, reply STOP.`
    : "";
  const bodyLines: string[] = [];
  bodyLines.push(`Hi ${prospect.name || "there"},`);
  if (["partner", "cafe", "gym", "tattoo", "school"].includes(prospect.type)) {
    bodyLines.push(
      `We're a neighborhood barbershop in ${area}. Our clients overlap with your audience — thought a simple cross‑promo could help both sides (e.g., a post swap + a ${
        has(prospect.type, "cafe") ? "weekday coffee + cut" : "student/neighbor"
      } perk).`
    );
  } else if (prospect.type === "news" || prospect.type === "event") {
    bodyLines.push(
      `Sharing a quick local story idea in ${area}: we're planning a small "charity cuts" morning next month (free trims, donations optional) and would love to include it in your community events roundup.`
    );
  } else if (prospect.type === "directory") {
    bodyLines.push(
      `Could we confirm our listing details for ${biz}? Happy to send the canonical NAP if helpful, or submit via your form.`
    );
  } else {
    bodyLines.push(
      `We're looking to connect with nearby neighbors for a small collaboration or listing. Open to ideas that are simple to execute in a week or two.`
    );
  }
  bodyLines.push(`If useful, here's booking: ${booking}`);
  bodyLines.push(`Thanks for considering — quick yes/no is perfect.`);
  const body = bodyLines.join("\n\n") + idLine + stop;
  return { subj, body };
}

function mailtoLink(subj: string, body: string, to?: string) {
  const addr = to ? encodeURIComponent(to) : "";
  return `mailto:${addr}?subject=${urlEncode(subj)}&body=${urlEncode(body)}`;
}

// ---------------- Demo Data ----------------
const DEMO: Partial<Prospect>[] = [
  {
    name: "Bridgeland BIA",
    url: "https://www.bria.org/",
    type: "directory",
    email: "info@bria.org",
    contact: "403-555-0123",
  },
  {
    name: "Bridgeland LRT News",
    url: "https://bridgelandnews.ca/",
    type: "news",
    email: "editor@bridgelandnews.ca",
  },
  {
    name: "Riverside Community Association",
    url: "https://riversidecommunity.ca/",
    type: "directory",
    contact: "403-555-0456",
  },
  {
    name: "Bridgeland Hardware Store",
    url: "https://bridgelandhardware.com/",
    type: "partner",
    email: "hello@bridgelandhardware.com",
  },
  {
    name: "Bridgeland Coffee Roasters",
    url: "https://bridgelandcoffee.ca/",
    type: "cafe",
    email: "team@bridgelandcoffee.ca",
  },
  {
    name: "Bridgeland Tattoo Studio",
    url: "https://bridgelandtattoo.com/",
    type: "tattoo",
    contact: "403-555-0789",
  },
  {
    name: "Bridgeland Gym & Fitness",
    url: "https://bridgelandgym.ca/",
    type: "gym",
    email: "membership@bridgelandgym.ca",
  },
  {
    name: "Bridgeland Community Events",
    url: "https://bridgelandevents.ca/",
    type: "event",
    email: "events@bridgelandevents.ca",
  },
  {
    name: "Calgary News Now",
    url: "https://calgarynewsnow.com/",
    type: "news",
    email: "tips@calgarynewsnow.com",
  },
  {
    name: "Local Calgary Directories",
    url: "https://localcalgary.ca/",
    type: "directory",
    contact: "403-555-0999",
  },
];

// ---------------- Main Component ----------------
function LinkProspectKit() {
  // Biz context
  const [bizName, setBizName] = useState<string>("The Belmont Barbershop");
  const [area, setArea] = useState<string>("Bridgeland/Riverside, Calgary");
  const [booking, setBooking] = useState<string>(
    "https://thebelmontbarber.ca/book"
  );
  const [includeStop, setIncludeStop] = useState<boolean>(true);
  const [includeId, setIncludeId] = useState<boolean>(true);

  // Data
  const [rows, setRows] = useState<Prospect[]>(() => DEMO.map(recompute));
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [copied, setCopied] = useState<string>("");

  function recompute(p: Partial<Prospect>): Prospect {
    const localness = p.localness ?? inferLocalness(p.name ?? "", p.url ?? "");
    const relevance =
      p.relevance ??
      inferRelevance(p.name ?? "", p.url ?? "", p.type ?? "other");
    const authority =
      p.authority ?? inferAuthority(p.url ?? "", p.type ?? "other");
    const ease = p.ease ?? inferEase(p.email, p.contact);
    const confidence = p.confidence ?? inferConfidence(p);
    const impact = p.impact ?? inferImpact(p.type ?? "other");
    const base: Prospect = {
      id: p.id ?? (crypto.randomUUID?.() || `${Date.now()}_${Math.random()}`),
      name: p.name ?? "Prospect",
      url: p.url ?? "",
      type: (p.type as string) ?? "other",
      email: p.email,
      contact: p.contact,
      notes: p.notes,
      localness,
      relevance,
      authority,
      ease,
      confidence,
      impact,
      ice: 0,
      priority: 0,
      status: p.status ?? "todo",
    };
    const { ice, priority } = computeICE(base);
    return { ...base, ice, priority };
  }

  function addProspectsBulk(text: string) {
    // Accept lines as: Name, URL, type, email(optional)
    const lines = text
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);
    const newOnes: Prospect[] = lines.map((ln, idx) => {
      const parts = ln.split(",").map((x) => x.trim());
      const name = parts[0] || `Prospect ${idx + 1}`;
      const url = parts[1] || "";
      const type = (parts[2] || "other").toLowerCase();
      const email = parts[3] || "";
      const raw: Prospect = {
        id: crypto.randomUUID?.() || `${Date.now()}_${idx}`,
        name,
        url,
        type,
        email,
        contact: "",
        notes: "",
        localness: 0,
        relevance: 0,
        authority: 0,
        ease: 0,
        confidence: 0,
        impact: 0,
        ice: 0,
        priority: 0,
        status: "todo",
      };
      return recompute(raw);
    });
    setRows((prev) => [...prev, ...newOnes]);
  }

  function updateProspect(i: number, patch: Partial<Prospect>) {
    setRows((prev) =>
      prev.map((p, idx) => (idx === i ? recompute({ ...p, ...patch }) : p))
    );
  }

  function deleteProspect(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Filtered prospects
  const filtered = useMemo(() => {
    return rows
      .filter((p) => filter === "all" || p.type === filter)
      .filter(
        (p) =>
          !search ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.url.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => b.priority - a.priority);
  }, [rows, filter, search]);

  function copy(text: string, which: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(""), 1200);
    });
  }

  function exportCSV() {
    const rows = filtered.map((p) => ({
      name: p.name,
      url: p.url,
      type: p.type,
      email: p.email || "",
      contact: p.contact || "",
      localness: p.localness,
      relevance: p.relevance,
      authority: p.authority,
      ease: p.ease,
      confidence: p.confidence,
      impact: p.impact,
      priority: p.priority,
      status: p.status,
      notes: p.notes || "",
    }));
    const csv = toCSV(rows);
    saveBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      `belmont-prospects-${todayISO()}.csv`
    );
  }

  // Self tests
  type Test = { name: string; passed: boolean; details?: string };
  const tests: Test[] = useMemo(() => {
    const t: Test[] = [];
    t.push({ name: "Demo data loaded", passed: rows.length > 0 });
    t.push({
      name: "ICE computation",
      passed: rows.some((p) => p.priority > 0),
    });
    t.push({
      name: "Localness scoring",
      passed: rows.some((p) => p.localness > 0),
    });
    t.push({
      name: "Relevance scoring",
      passed: rows.some((p) => p.relevance > 0),
    });
    t.push({
      name: "Authority scoring",
      passed: rows.some((p) => p.authority > 0),
    });
    return t;
  }, [rows]);
  const passCount = tests.filter((t) => t.passed).length;

  return (
    <div className="p-5 md:p-8 space-y-6">
      <PageHeader
        title="Local Link Prospect Scorer & Outreach Kit"
        subtitle="Rank neighborhood prospects by local relevance, then send CASL-aware outreach."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setRows(DEMO.map(recompute))}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Load Belmont Sample
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const response = await fetch(
                    "/fixtures/prospects-sample.csv"
                  );
                  const csvText = await response.text();
                  const lines = csvText.split("\n").slice(1).filter(Boolean); // Skip header
                  const prospects: Prospect[] = lines.map((line, idx) => {
                    const parts = line.split(",");
                    return {
                      id: crypto.randomUUID?.() || `${Date.now()}_${idx}`,
                      name: parts[0],
                      url: parts[1],
                      type: parts[2] as any,
                      email: parts[3],
                      contact: parts[4],
                      localness: parseInt(parts[5]) || 0,
                      relevance: parseInt(parts[6]) || 0,
                      authority: parseInt(parts[7]) || 0,
                      ease: parseInt(parts[8]) || 0,
                      confidence: parseInt(parts[9]) || 0,
                      impact: parseInt(parts[10]) || 0,
                      ice: 0,
                      priority: parseInt(parts[11]) || 0,
                      status: (parts[12] as any) || "todo",
                      notes: parts[13] || "",
                    };
                  });
                  setRows(prospects.map(recompute));
                } catch (e) {
                  alert(
                    "Could not load sample data. Make sure fixtures are available."
                  );
                }
              }}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button variant="outline" onClick={() => setRows([])}>
              <Filter className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Prospects" value={rows.length} hint="Loaded" />
        <KPICard
          label="High Priority"
          value={rows.filter((r) => r.priority >= 7).length}
          hint="ICE ≥ 7"
        />
        <KPICard
          label="Contacted"
          value={rows.filter((r) => r.status === "sent").length}
          hint="Outreach sent"
        />
        <KPICard
          label="Tests"
          value={`${passCount}/${tests.length}`}
          hint="Passed"
        />
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="prospects">Prospects</TabsTrigger>
          <TabsTrigger value="outreach">Outreach</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Add</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
          <TabsTrigger value="help">Help</TabsTrigger>
        </TabsList>

        {/* Settings */}
        <TabsContent value="settings">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Business Context
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Business name</Label>
                  <Input
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Area/neighborhood</Label>
                  <Input
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Booking URL</Label>
                  <Input
                    value={booking}
                    onChange={(e) => setBooking(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={includeStop}
                      onCheckedChange={(v) => setIncludeStop(Boolean(v))}
                    />
                    <Label className="text-sm">Include STOP line</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={includeId}
                      onCheckedChange={(v) => setIncludeId(Boolean(v))}
                    />
                    <Label className="text-sm">Include signature</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prospects */}
        <TabsContent value="prospects">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Prospect Database</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Search prospects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1"
                />
                <select
                  className="h-9 border rounded-md px-2"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All types</option>
                  <option value="directory">Directories</option>
                  <option value="news">News</option>
                  <option value="event">Events</option>
                  <option value="partner">Partners</option>
                  <option value="cafe">Cafes</option>
                  <option value="tattoo">Tattoo</option>
                  <option value="gym">Gyms</option>
                  <option value="school">Schools</option>
                  <option value="other">Other</option>
                </select>
                <Button variant="outline" onClick={exportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>

              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prospect</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>ICE Score</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p, i) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">
                            <a
                              className="underline"
                              href={p.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {p.url}
                            </a>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{p.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-mono">{p.ice}/125</div>
                          <div className="text-xs text-muted-foreground">
                            L{p.localness} R{p.relevance} A{p.authority} E
                            {p.ease} C{p.confidence} I{p.impact}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{p.priority}%</div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div>{p.email || p.contact || "—"}</div>
                        </TableCell>
                        <TableCell>
                          <select
                            className="h-8 text-xs border rounded px-1"
                            value={p.status}
                            onChange={(e) =>
                              updateProspect(i, {
                                status: e.target.value as any,
                              })
                            }
                          >
                            <option value="todo">To Do</option>
                            <option value="sent">Sent</option>
                            <option value="responded">Responded</option>
                            <option value="ignore">Ignore</option>
                          </select>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                copy(
                                  makeEmail({
                                    biz: bizName,
                                    area,
                                    prospect: p,
                                    booking,
                                    includeStop,
                                    includeId,
                                  }).body,
                                  `email-${i}`
                                )
                              }
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Email
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteProspect(i)}
                            >
                              ×
                            </Button>
                          </div>
                          {copied === `email-${i}` && (
                            <Badge className="ml-2">Copied</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-sm text-muted-foreground"
                        >
                          No prospects match the current filters. Try "Load
                          Demo" to add sample data.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outreach */}
        <TabsContent value="outreach">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                CASL-Compliant Outreach
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-muted-foreground">
                Select a prospect to see the generated email. Emails include
                CASL compliance language and can be opened directly in your
                email client.
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Prospect</Label>
                  <select className="w-full h-9 border rounded-md px-2">
                    <option value="">Select a prospect...</option>
                    {filtered
                      .filter((p) => p.status === "todo")
                      .map((p, i) => (
                        <option key={p.id} value={i}>
                          {p.name} ({p.priority}% priority)
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <Button className="w-full">
                    <Play className="h-4 w-4 mr-2" />
                    Compose & Open in Mail
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <Label>Generated Email Preview</Label>
                <div className="mt-2 p-4 bg-muted rounded-md font-mono text-sm">
                  <div className="font-bold mb-2">
                    Subject: [Select a prospect to preview]
                  </div>
                  <div className="whitespace-pre-wrap">
                    [Email preview will appear here]
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Add */}
        <TabsContent value="bulk">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Bulk Import Prospects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-muted-foreground">
                Add multiple prospects at once. Format: Name, URL, type, email
                (optional)
              </div>
              <Textarea
                placeholder={`Bridgeland BIA, https://www.bria.org/, directory, info@bria.org
Bridgeland Hardware, https://bridgelandhardware.com/, partner
Bridgeland Coffee, https://bridgelandcoffee.ca/, cafe, team@bridgelandcoffee.ca`}
                className="h-32"
                onChange={(e) => e.target.value}
              />
              <Button
                onClick={(e) => {
                  const text = (e.target as any).previousSibling.value;
                  if (text.trim()) {
                    addProspectsBulk(text);
                    (e.target as any).previousSibling.value = "";
                  }
                }}
              >
                Add Prospects
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tests */}
        <TabsContent value="tests">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Play className="h-4 w-4" />
                Self‑tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell>{t.name}</TableCell>
                      <TableCell>{t.passed ? "PASS" : "FAIL"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {t.details || ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-2 text-xs text-muted-foreground">
                {passCount}/{tests.length} passed
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Help */}
        <TabsContent value="help">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                ICE Scoring Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>I (Impact)</strong>: How valuable is this link?
                  News/events &gt; directories &gt; partners &gt; others
                </li>
                <li>
                  <strong>C (Confidence)</strong>: How sure are we about this
                  prospect? Name+URL = high confidence
                </li>
                <li>
                  <strong>E (Ease)</strong>: How easy to contact? Email &gt;
                  contact form &gt; none
                </li>
                <li>
                  <strong>ICE = I × C × E</strong> (0-125), then converted to
                  priority %
                </li>
                <li>
                  <strong>Localness</strong>: How local is this prospect?
                  Bridgeland/Riverside names get bonus points
                </li>
                <li>
                  <strong>Relevance</strong>: How relevant to barber services?
                  Business/local terms score higher
                </li>
                <li>
                  <strong>Authority</strong>: Trustworthiness of domain
                  (.ca/.org preferred)
                </li>
              </ul>
              <p className="text-xs text-muted-foreground">
                CASL compliance: Include STOP line for unsubscribe. Keep emails
                brief and value-focused.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Page() {
  return <LinkProspectKit />;
}
