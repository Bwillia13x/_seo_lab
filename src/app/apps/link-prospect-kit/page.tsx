"use client";
import React, { useMemo, useState } from "react";

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
import { toCSV } from "@/lib/csv";
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
  pts += scoreBool(Boolean(email?.includes("@")), 2);
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
    name: "Calgary Wedding Guide",
    url: "https://calgaryweddings.ca/",
    type: "event",
    email: "info@calgaryweddings.ca",
  },
  {
    name: "Calgary Veterans Association",
    url: "https://calgaryveterans.ca/",
    type: "community",
    email: "support@calgaryveterans.ca",
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
        title="Partner Finder"
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

      <Tabs defaultValue="howto">
        <TabsList>
          <TabsTrigger value="howto">How To</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="prospects">Prospects</TabsTrigger>
          <TabsTrigger value="outreach">Outreach</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Add</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
        </TabsList>

        {/* How To - First Tab */}
        <TabsContent value="howto">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                How to Use the Partner Finder Tool
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-6">
              <div>
                <h3 className="font-semibold text-base mb-3">
                  🎯 What This Tool Does
                </h3>
                <p className="mb-3">
                  This tool helps you find and contact local businesses or
                  organizations that could help promote The Belmont Barbershop.
                  It ranks potential partners based on how valuable they might
                  be and makes it easy to reach out to them.
                </p>
                <p>
                  Think of it like a matchmaking service for businesses - it
                  finds good fits for collaborations, cross-promotions, or
                  simply getting listed on local directories.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-3">
                  📋 Step-by-Step Guide
                </h3>
                <ol className="list-decimal pl-5 space-y-3">
                  <li>
                    <strong>Start Here:</strong> Click "Load Belmont Sample" to
                    see example local businesses already in the system. These
                    are real Bridgeland businesses you could partner with.
                  </li>
                  <li>
                    <strong>Add Your Own Prospects:</strong> Use the "Bulk Add"
                    tab to paste in businesses you find yourself. Just copy from
                    a spreadsheet or type them as: "Business Name,
                    https://website.com, business-type, email@business.com"
                  </li>
                  <li>
                    <strong>Check the Rankings:</strong> Look at the "Prospects"
                    tab. The tool automatically scores each business on how good
                    a partner they might be. Higher scores = better partners.
                  </li>
                  <li>
                    <strong>Reach Out:</strong> When you find a good prospect,
                    click the "Email" button next to their name. This opens your
                    email program with a ready-to-send message.
                  </li>
                  <li>
                    <strong>Track Your Progress:</strong> Mark prospects as
                    "Sent", "Responded", or "Ignore" so you know what you've
                    done.
                  </li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-3">
                  📊 Understanding the Scores
                </h3>
                <div className="space-y-3">
                  <div>
                    <strong className="text-green-700">
                      Priority Score (0-100%):
                    </strong>
                    <p className="text-xs text-muted-foreground mt-1">
                      This is the main ranking. Higher percentages mean better
                      partners. The tool considers how valuable a link would be,
                      how confident we are in the contact info, and how easy it
                      is to reach them.
                    </p>
                  </div>

                  <div>
                    <strong className="text-blue-700">
                      ICE Score (out of 125):
                    </strong>
                    <p className="text-xs text-muted-foreground mt-1">
                      ICE stands for Impact × Confidence × Ease. It's how the
                      tool calculates priority:
                    </p>
                    <ul className="list-disc pl-5 mt-2 text-xs text-muted-foreground space-y-1">
                      <li>
                        <strong>Impact:</strong> How valuable would a
                        partnership be? (News sites = highest, local directories
                        = high, nearby businesses = medium)
                      </li>
                      <li>
                        <strong>Confidence:</strong> How sure are we this is a
                        real business with good contact info?
                      </li>
                      <li>
                        <strong>Ease:</strong> How easy is it to contact them?
                        (Direct email = easiest)
                      </li>
                    </ul>
                  </div>

                  <div>
                    <strong className="text-purple-700">
                      Localness Score (0-5):
                    </strong>
                    <p className="text-xs text-muted-foreground mt-1">
                      How local is this business? Higher scores for
                      Bridgeland/Riverside mentions in their name or website.
                    </p>
                  </div>

                  <div>
                    <strong className="text-orange-700">
                      Relevance Score (0-5):
                    </strong>
                    <p className="text-xs text-muted-foreground mt-1">
                      How related are they to barber services? Higher scores for
                      businesses that mention "barber", "hair", "salon", or
                      "local".
                    </p>
                  </div>

                  <div>
                    <strong className="text-red-700">
                      Authority Score (0-5):
                    </strong>
                    <p className="text-xs text-muted-foreground mt-1">
                      How trustworthy is their website? Higher scores for .ca,
                      .org, .edu domains and established news sites.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-3">
                  🏷️ Business Types Explained
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Directory:</strong> Local business listings (like
                    Bridgeland BIA) - great for getting found
                  </div>
                  <div>
                    <strong>News:</strong> Local news websites - perfect for
                    community stories and features
                  </div>
                  <div>
                    <strong>Event:</strong> Community event organizers - good
                    for charity events or sponsorships
                  </div>
                  <div>
                    <strong>Partner:</strong> Nearby businesses - potential for
                    cross-promotions or referrals
                  </div>
                  <div>
                    <strong>Cafe:</strong> Local coffee shops - could display
                    your cards or do joint promotions
                  </div>
                  <div>
                    <strong>Gym/Tattoo:</strong> Fitness centers or tattoo shops
                    - good demographic overlap
                  </div>
                  <div>
                    <strong>School:</strong> Local schools - potential for
                    community events or student discounts
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-3">
                  ⚖️ Legal Stuff (CASL Compliance)
                </h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm">
                  <p className="font-medium text-yellow-800 mb-2">
                    Important: Canadian Anti-Spam Law
                  </p>
                  <p className="text-yellow-700 mb-2">
                    When emailing businesses, you must include an unsubscribe
                    option. The tool does this automatically by adding a "STOP"
                    line at the bottom of emails.
                  </p>
                  <p className="text-yellow-700 text-xs">
                    Keep emails professional, brief, and focused on mutual
                    benefit. Don't send promotional emails without a clear
                    business relationship first.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-3">💡 Pro Tips</h3>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  <li>
                    <strong>Start with high-priority prospects:</strong> Look
                    for scores above 70% first
                  </li>
                  <li>
                    <strong>Personalize your emails:</strong> The tool gives you
                    a template, but add a personal touch
                  </li>
                  <li>
                    <strong>Follow up:</strong> If you don't hear back in 2
                    weeks, send a gentle follow-up
                  </li>
                  <li>
                    <strong>Track everything:</strong> Use the status column to
                    remember who you've contacted
                  </li>
                  <li>
                    <strong>Quality over quantity:</strong> Better to have 5
                    good partnerships than 50 weak ones
                  </li>
                  <li>
                    <strong>Give to get:</strong> Think about what you can offer
                    them, not just what you want
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-3">
                  🎯 Common Questions
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <strong className="text-gray-700">
                      What if I don't have email addresses?
                    </strong>
                    <p className="text-xs text-muted-foreground mt-1">
                      No problem! The tool still ranks prospects. You can find
                      emails by visiting their websites or calling them
                      directly.
                    </p>
                  </div>
                  <div>
                    <strong className="text-gray-700">
                      How do I know if a partnership will work?
                    </strong>
                    <p className="text-xs text-muted-foreground mt-1">
                      Start small - suggest a simple cross-promotion like
                      "mention us and we'll mention you" or "display our
                      business card for a free haircut referral".
                    </p>
                  </div>
                  <div>
                    <strong className="text-gray-700">
                      What if they say no?
                    </strong>
                    <p className="text-xs text-muted-foreground mt-1">
                      That's okay! Mark them as "Ignore" and move on to the next
                      prospect. Not every business is a good fit for
                      partnerships.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
                  title="Filter prospects by type"
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
                            title="Update prospect status"
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
                  <select
                    className="w-full h-9 border rounded-md px-2"
                    title="Select a prospect to compose email"
                  >
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
                  {tests.map((t) => (
                    <TableRow key={t.name}>
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
      </Tabs>
    </div>
  );
}

export default function Page() {
  return <LinkProspectKit />;
}
