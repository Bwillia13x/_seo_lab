"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Wand2, Copy, Info, Settings, Download, Play } from "lucide-react";
import { saveBlob } from "@/lib/blob";

// ---------------- Types ----------------
type BaseState = {
  bizName: string;
  service: string;
  area: string;
  type: string;
  tone: string;
  wordTarget: number;
  offerText: string;
  hoursText: string;
  bookingUrl: string;
  addTags: boolean;
  addNeighborhood: boolean;
  autoUtm: boolean;
  phone: string;
};

// ---------------- Constants ----------------
const SERVICES = [
  "Men's Haircut",
  "Skin Fade",
  "Beard Trim",
  "Hot Towel Shave",
  "Kids Cut",
  "Groomsmen Party",
  "Veterans Discount",
];
const AREAS = ["Bridgeland", "Riverside", "Calgary Downtown", "Inglewood"];
const POST_TYPES = [
  "Style Spotlight",
  "Offer",
  "Event",
  "Hours Update",
  "What's New",
];
const TONES = ["Professional", "Friendly", "Classic", "Modern"];

// ---------------- Utilities ----------------
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function words(text: string) {
  return (text.trim().match(/\S+/g) || []).length;
}

function monthCode() {
  const d = new Date();
  const y = String(d.getFullYear()).slice(2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

function slugify(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeBaseUrl(input: string): string {
  let url = input.trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  try {
    return new URL(url).toString();
  } catch {
    return url;
  }
}

function buildUtmUrl(
  base: string,
  params: Record<string, string>,
  overwrite = true
) {
  const safe = normalizeBaseUrl(base);
  let u: URL;
  try {
    u = new URL(safe);
  } catch {
    return { url: safe, error: "Invalid URL" };
  }

  // Remove existing UTM params if overwrite
  if (overwrite) {
    Array.from(u.searchParams.keys()).forEach((key) => {
      if (key.startsWith("utm_")) {
        u.searchParams.delete(key);
      }
    });
  }

  // Add new params
  for (const [key, value] of Object.entries(params)) {
    u.searchParams.set(key, value);
  }

  return { url: u.toString() };
}

function makeTitle(biz: string, service: string, area: string, type: string) {
  const templates = {
    "Style Spotlight": `${service} Excellence at ${biz}`,
    Offer: `Special: ${service} at ${biz}`,
    Event: `${biz} Event: ${service}`,
    "Hours Update": `${biz} Hours & Services Update`,
    "What's New": `New at ${biz}: ${service}`,
  };
  return templates[type as keyof typeof templates] || `${service} at ${biz}`;
}

function toneLine(tone: string, service: string) {
  const tones = {
    Professional: `Experience our professional ${service.toLowerCase()} services`,
    Friendly: `Come enjoy our amazing ${service.toLowerCase()} experience`,
    Classic: `Discover traditional ${service.toLowerCase()} craftsmanship`,
    Modern: `Experience contemporary ${service.toLowerCase()} styling`,
  };
  return tones[tone as keyof typeof tones] || tones.Professional;
}

function buildBody(opts: {
  biz: string;
  service: string;
  area: string;
  type: string;
  tone: string;
  offer?: string;
  details?: string;
  targetWords: number;
  booking: string;
  addTags: boolean;
  addNeighborhoodNote: boolean;
}) {
  const {
    biz,
    service,
    area,
    type,
    tone,
    offer,
    details,
    targetWords,
    booking,
    addTags,
    addNeighborhoodNote,
  } = opts;

  let body = toneLine(tone, service);

  if (offer) {
    body += `. ${offer}`;
  }

  if (details) {
    body += `. ${details}`;
  }

  if (addNeighborhoodNote) {
    body += `. Located in beautiful ${area}, Calgary.`;
  }

  body += ` Book your appointment today at ${booking}`;

  if (addTags) {
    body += ` #${slugify(service)} #${slugify(area)} #${slugify(biz)}`;
  }

  return body;
}

function altTextFor(service: string, area: string) {
  return `${service} service at Belmont Barbershop in ${area}, Calgary`;
}

function hashtagFor(service: string) {
  return `#${slugify(service)}`;
}

function makePack(p: BaseState) {
  const variations = [
    { type: "Style Spotlight", tone: "Professional" },
    { type: "Offer", tone: "Friendly" },
    { type: "Event", tone: "Classic" },
    { type: "What's New", tone: "Modern" },
  ];

  return variations.map((v, i) => {
    const title = makeTitle(p.bizName, p.service, p.area, v.type);
    const body = buildBody({
      biz: p.bizName,
      service: p.service,
      area: p.area,
      type: v.type,
      tone: v.tone,
      offer: p.type === "Offer" ? p.offerText : undefined,
      details: p.type === "Hours Update" ? p.hoursText : undefined,
      targetWords: p.wordTarget,
      booking: p.bookingUrl,
      addTags: p.addTags,
      addNeighborhoodNote: p.addNeighborhood,
    });
    const alt = altTextFor(p.service, p.area);
    return { title, body, alt };
  });
}

function buildBookingUrl(p: BaseState) {
  if (!p.autoUtm) return p.bookingUrl;

  const params = {
    utm_source: "google",
    utm_medium: "gbp",
    utm_campaign: `belmont_${new Date().toISOString().slice(0, 7)}`,
    utm_content: slugify(p.service),
  };

  const result = buildUtmUrl(p.bookingUrl, params, true);
  return result.url;
}

// ---------------- Main Component ----------------
export default function GBPPostComposer() {
  const [state, setState] = useState<BaseState>({
    bizName: "The Belmont Barbershop",
    service: "Skin Fade",
    area: "Bridgeland",
    type: "Style Spotlight",
    tone: "Classic",
    wordTarget: 200,
    offerText: "Weekday 11–2: $5 off online bookings this month.",
    hoursText: "Mon–Fri 10–7, Sat–Sun 10–5.",
    bookingUrl: "https://thebelmontbarber.ca/book",
    addTags: true,
    addNeighborhood: true,
    autoUtm: true,
    phone: "403-618-6113",
  });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [alt, setAlt] = useState("");
  const [copied, setCopied] = useState<string>("");

  // Live compose
  const booking = useMemo(() => buildBookingUrl(state), [state]);
  useEffect(() => {
    const t = makeTitle(state.bizName, state.service, state.area, state.type);
    const b = buildBody({
      biz: state.bizName,
      service: state.service,
      area: state.area,
      type: state.type,
      tone: state.tone,
      offer: state.type === "Offer" ? state.offerText : undefined,
      details: state.type === "Hours Update" ? state.hoursText : undefined,
      targetWords: state.wordTarget,
      booking,
      addTags: state.addTags,
      addNeighborhoodNote: state.addNeighborhood,
    });
    const a = altTextFor(state.service, state.area);
    setTitle(t);
    setBody(b);
    setAlt(a);
  }, [state, booking]);

  function copy(text: string, which: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(""), 1200);
    });
  }

  function exportTxt() {
    const txt = `TITLE\n${title}\n\nBODY\n${body}\n\nALT\n${alt}\n`;
    saveBlob(
      new Blob([txt], { type: "text/plain;charset=utf-8;" }),
      `belmont-gbp-post-${monthCode()}.txt`
    );
  }

  function exportPack() {
    const pack = makePack(state);
    const parts = pack
      .map(
        (p, i) =>
          `--- Post ${i + 1} ---\nTitle: ${p.title}\n\nBody:\n${p.body}\n\nAlt:\n${p.alt}\n`
      )
      .join("\n\n");
    saveBlob(
      new Blob([parts], { type: "text/plain;charset=utf-8;" }),
      `belmont-gbp-pack-${monthCode()}.txt`
    );
  }

  // Self tests
  type TestResult = { name: string; passed: boolean; details?: string };
  function runTests(): TestResult[] {
    const results: TestResult[] = [];
    // 1) Words near target
    const b = buildBody({
      biz: "Biz",
      service: "Skin Fade",
      area: "Bridgeland",
      type: "Style Spotlight",
      tone: "Classic",
      targetWords: 200,
      booking: "https://ex.com",
      addTags: false,
      addNeighborhoodNote: true,
    });
    const wc = words(b);
    results.push({
      name: "Body word count ~200",
      passed: wc >= 160 && wc <= 260,
      details: String(wc),
    });
    // 2) UTM builder appends params
    const u = buildUtmUrl(
      "https://ex.com/page",
      { utm_source: "google", utm_medium: "gbp", utm_campaign: "x" },
      true
    ).url;
    results.push({
      name: "UTM params present",
      passed:
        /utm_source=google/.test(u) &&
        /utm_medium=gbp/.test(u) &&
        /utm_campaign=x/.test(u),
    });
    // 3) Alt text includes service & area
    const a = altTextFor("Beard Trim", "Riverside");
    results.push({
      name: "Alt mentions service+area",
      passed: /Beard Trim/.test(a) && /Riverside/.test(a),
      details: a,
    });
    return results;
  }

  const tests = useMemo(() => runTests(), []);
  const passCount = tests.filter((t) => t.passed).length;

  return (
    <div className="p-5 md:p-8 space-y-6">
      <PageHeader
        title="Google Business Profile Post Composer"
        subtitle="Create professional, on-brand posts for Belmont's Google Business Profile with UTM tracking and alt-text."
        showLogo={true}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Words" value={words(body)} hint="Current body length" />
        <KPICard label="Type" value={state.type} />
        <KPICard label="Tone" value={state.tone} />
        <KPICard label="Tests" value={`${passCount}/${tests.length}`} />
      </div>

      <Tabs defaultValue="compose" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="pack">4-Post Pack</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Post Configuration</CardTitle>
              <CardDescription>
                Customize your Google Business Profile post settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bizName">Business Name</Label>
                  <Input
                    id="bizName"
                    value={state.bizName}
                    onChange={(e) =>
                      setState({ ...state, bizName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="service">Service</Label>
                  <select
                    id="service"
                    className="w-full px-3 py-2 border rounded-md"
                    value={state.service}
                    onChange={(e) =>
                      setState({ ...state, service: e.target.value })
                    }
                  >
                    {SERVICES.map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="area">Area</Label>
                  <select
                    id="area"
                    className="w-full px-3 py-2 border rounded-md"
                    value={state.area}
                    onChange={(e) =>
                      setState({ ...state, area: e.target.value })
                    }
                  >
                    {AREAS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="type">Post Type</Label>
                  <select
                    id="type"
                    className="w-full px-3 py-2 border rounded-md"
                    value={state.type}
                    onChange={(e) =>
                      setState({ ...state, type: e.target.value })
                    }
                  >
                    {POST_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tone">Tone</Label>
                <select
                  id="tone"
                  className="w-full px-3 py-2 border rounded-md"
                  value={state.tone}
                  onChange={(e) => setState({ ...state, tone: e.target.value })}
                >
                  {TONES.map((tone) => (
                    <option key={tone} value={tone}>
                      {tone}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wordTarget">Word Target</Label>
                  <Input
                    id="wordTarget"
                    type="number"
                    value={state.wordTarget}
                    onChange={(e) =>
                      setState({ ...state, wordTarget: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="bookingUrl">Booking URL</Label>
                  <Input
                    id="bookingUrl"
                    value={state.bookingUrl}
                    onChange={(e) =>
                      setState({ ...state, bookingUrl: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="addTags"
                    checked={state.addTags}
                    onCheckedChange={(checked) =>
                      setState({ ...state, addTags: !!checked })
                    }
                  />
                  <Label htmlFor="addTags">Add hashtags</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="addNeighborhood"
                    checked={state.addNeighborhood}
                    onCheckedChange={(checked) =>
                      setState({ ...state, addNeighborhood: !!checked })
                    }
                  />
                  <Label htmlFor="addNeighborhood">
                    Add neighborhood mention
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoUtm"
                    checked={state.autoUtm}
                    onCheckedChange={(checked) =>
                      setState({ ...state, autoUtm: !!checked })
                    }
                  />
                  <Label htmlFor="autoUtm">Auto-generate UTM parameters</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Post Preview</CardTitle>
              <CardDescription>
                See how your post will look on Google Business Profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Title</Label>
                  <div className="p-3 bg-muted rounded-md font-medium">
                    {title || "Title will appear here..."}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Body</Label>
                  <div className="p-3 bg-muted rounded-md whitespace-pre-wrap">
                    {body || "Post body will appear here..."}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Alt Text</Label>
                  <div className="p-3 bg-muted rounded-md text-sm">
                    {alt || "Alt text will appear here..."}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => copy(title, "title")}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Title
                  {copied === "title" && (
                    <Badge className="ml-2">Copied!</Badge>
                  )}
                </Button>
                <Button
                  onClick={() => copy(body, "body")}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Body
                  {copied === "body" && <Badge className="ml-2">Copied!</Badge>}
                </Button>
                <Button
                  onClick={() => copy(alt, "alt")}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Alt
                  {copied === "alt" && <Badge className="ml-2">Copied!</Badge>}
                </Button>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button onClick={exportTxt} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export as Text
                </Button>
                <Button onClick={exportPack} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export 4-Post Pack
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pack" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>4-Post Content Pack</CardTitle>
              <CardDescription>
                Generate a complete set of posts for your posting schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {makePack(state).map((post, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Post {index + 1}: {post.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">Body</Label>
                          <div className="p-3 bg-muted rounded-md whitespace-pre-wrap text-sm">
                            {post.body}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">
                            Alt Text
                          </Label>
                          <div className="p-2 bg-muted rounded-md text-xs">
                            {post.alt}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Self-Tests</CardTitle>
              <CardDescription>
                Automated checks to ensure post quality and functionality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tests.map((test, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{test.name}</div>
                      {test.details && (
                        <div className="text-sm text-muted-foreground">
                          {test.details}
                        </div>
                      )}
                    </div>
                    <Badge variant={test.passed ? "default" : "destructive"}>
                      {test.passed ? "✓ Pass" : "✗ Fail"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
