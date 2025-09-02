"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
// import { Badge } from "@/components/ui/badge";
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
// import { toCSV } from "@/lib/csv";
// import { todayISO } from "@/lib/dates";

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
    return { url: "", error: "Invalid base URL" };
  }
  for (const [k, v] of Object.entries(params)) {
    if (!v) continue;
    if (overwrite || !u.searchParams.has(k)) u.searchParams.set(k, v);
  }
  return { url: u.toString(), error: "" };
}

// ---------------- Domain presets ----------------
const SERVICES = [
  "Men's Cut",
  "Skin Fade",
  "Beard Trim",
  "Hot Towel Shave",
  "Kids Cut",
] as const;
const AREAS = ["Bridgeland", "Riverside", "Calgary"] as const;
const POST_TYPES = [
  "What's New",
  "Offer",
  "Event",
  "Hours Update",
  "Style Spotlight",
  "Testimonial",
] as const;
const TONES = ["Classic", "Modern", "Minimal", "Playful"] as const;

// Hashtags (short list; GBP truncates hashtags in some surfaces, but safe to include a few)
const BASE_TAGS = [
  "#BelmontBarbershop",
  "#CalgaryBarber",
  "#Bridgeland",
  "#RiversideYYC",
  "#YYC",
];

// ---------------- Generators ----------------
function makeTitle(biz: string, service: string, area: string, type: string) {
  const areaStr = area === "Calgary" ? "Calgary" : `${area}, Calgary`;
  switch (type) {
    case "Offer":
      return `${service} — Weekday Window in ${areaStr}`;
    case "Event":
      return `${service} Day — ${areaStr}`;
    case "Hours Update":
      return `${biz}: Updated Hours for ${areaStr}`;
    case "Style Spotlight":
      return `Fresh ${service}s in ${areaStr}`;
    case "Testimonial":
      return `Why ${biz} — from a ${areaStr} regular`;
    default:
      return `${service} at ${biz} — ${areaStr}`;
  }
}

function toneLine(tone: string, service: string) {
  switch (tone) {
    case "Classic":
      return `Crisp, clean, and consistent — our ${service} focuses on shape, balance, and growth pattern.`;
    case "Modern":
      return `Sharp lines, blended fade, and a finish that photographs well — ${service} dialed for your style.`;
    case "Minimal":
      return `${service}. Precise. Efficient. In and out.`;
    case "Playful":
      return `${service} so clean your selfie does the talking.`;
    default:
      return `${service} done right.`;
  }
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
  const areaStr = area === "Calgary" ? "Calgary" : `${area}, Calgary`;
  const lines: string[] = [];

  // Hook
  switch (type) {
    case "Offer":
      lines.push(
        offer && offer.trim()
          ? `Limited‑time: ${offer.trim()}`
          : `Limited‑time weekday window for ${service}.`
      );
      break;
    case "Event":
      lines.push(
        details && details.trim()
          ? details.trim()
          : `One‑day focus on ${service}. Book early.`
      );
      break;
    case "Hours Update":
      lines.push(
        details && details.trim()
          ? details.trim()
          : `Updated hours posted below — book the slots that fit your week.`
      );
      break;
    case "Style Spotlight":
      lines.push(`${service} — featured this week.`);
      break;
    case "Testimonial":
      lines.push(`A neighbor on why they choose ${biz}.`);
      break;
    default:
      lines.push(`${service} at ${biz}.`);
  }

  // Tone line
  lines.push(toneLine(tone, service));

  // Neighborhood note
  if (addNeighborhoodNote)
    lines.push(
      `We're right in ${areaStr} — easy walk from the Bridgeland LRT.`
    );

  // Booking
  lines.push(`Book online in seconds: ${booking}`);

  // Soft proof points
  lines.push(
    `Walk‑ins welcome when chairs are free. Square Appointments keeps wait times honest.`
  );

  if (addTags) lines.push(BASE_TAGS.join(" "));

  // Adjust length toward target by adding/removing filler guidance lines
  const desired = clamp(targetWords, 120, 320); // words range
  let text = lines.join("\n\n");
  let w = words(text);
  const fillers = [
    `Pro tip: early weekday slots (11–2) are quickest for a lunch‑hour cut.`,
    `Ask for a hot towel finish — on us during quieter hours.`,
    `Bring a photo reference; we'll translate it to your hair density and growth pattern.`,
  ];
  let fi = 0;
  while (w < desired - 20 && fi < fillers.length) {
    text += `\n\n${fillers[fi++]}`;
    w = words(text);
  }

  // If too long, trim the last paragraph
  if (w > desired + 20) {
    const paras = text.split(/\n\n/);
    while (paras.length > 3 && words(paras.join(" ")) > desired + 10)
      paras.pop();
    text = paras.join("\n\n");
  }
  return text;
}

function altTextFor(service: string, area: string) {
  const loc = area === "Calgary" ? "Calgary" : `${area}, Calgary`;
  return `${service} at The Belmont Barbershop in ${loc}: chair, cape, barber's hands, clean blend, natural light.`;
}

function hashtagFor(service: string) {
  const s = slugify(service).replace(/-/g, "");
  const serviceTag = `#${s}`;
  const extras = ["#menshair", "#barberlife", "#fade", "#beardtrim"];
  return Array.from(new Set([...BASE_TAGS, serviceTag, ...extras]))
    .slice(0, 6)
    .join(" ");
}

// 4‑post pack factory
function makePack(p: BaseState) {
  const booking = buildBookingUrl(p);
  const theme = (type: string, offer?: string, details?: string) => ({
    title: makeTitle(p.bizName, p.service, p.area, type),
    body: buildBody({
      biz: p.bizName,
      service: p.service,
      area: p.area,
      type,
      tone: p.tone,
      offer,
      details,
      targetWords: p.wordTarget,
      booking,
      addTags: p.addTags,
      addNeighborhoodNote: p.addNeighborhood,
    }),
    alt: altTextFor(p.service, p.area),
  });
  return [
    theme("Style Spotlight"),
    theme(
      "Offer",
      p.offerText || "Weekday 11–2: $5 off online bookings this month."
    ),
    theme(
      "Hours Update",
      undefined,
      p.hoursText || "Mon–Fri 10–7, Sat–Sun 10–5."
    ),
    theme(
      "What's New",
      undefined,
      "Fresh photos on our profile; pop by to see the shop."
    ),
  ];
}

// ---------------- State shape ----------------
type BaseState = {
  bizName: string;
  service: (typeof SERVICES)[number];
  area: (typeof AREAS)[number];
  type: (typeof POST_TYPES)[number];
  tone: (typeof TONES)[number];
  wordTarget: number; // 150..300
  offerText?: string;
  hoursText?: string;
  bookingUrl: string;
  addTags: boolean;
  addNeighborhood: boolean;
  autoUtm: boolean;
  phone?: string;
};

function buildBookingUrl(p: BaseState) {
  const base = p.bookingUrl || "https://thebelmontbarber.ca/book";
  if (!p.autoUtm) return base;
  const campaign = `belmont-${slugify(p.service)}-${slugify(p.area)}-${monthCode()}`;
  return buildUtmUrl(
    base,
    { utm_source: "google", utm_medium: "gbp", utm_campaign: campaign },
    true
  ).url;
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
    phone: "403-000-0000",
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
      offer: state.offerText,
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
        title="GBP Post Composer"
        subtitle="Structured, on‑brand posts for Google Business Profile with UTM links and alt‑text."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Words" value={words(body)} hint="Current body length" />
        <KPICard label="Type" value={state.type} />
        <KPICard label="Tone" value={state.tone} />
        <KPICard label="Tests" value={`${passCount}/${tests.length}`} />
      </div>

      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="pack">4‑Post Pack</TabsTrigger>
          <TabsTrigger value="help">Help</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
        </TabsList>

        {/* Compose */}
        <TabsContent value="compose">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Post Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <Label>Business name</Label>
                  <Input
                    value={state.bizName}
                    onChange={(e) =>
                      setState((s) => ({ ...s, bizName: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="gbpService">Service</Label>
                  <select
                    id="gbpService"
                    title="Select service"
                    value={state.service}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        service: e.target.value as any,
                      }))
                    }
                    className="w-full h-9 border rounded-md px-2"
                  >
                    {SERVICES.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="gbpArea">Area</Label>
                  <select
                    id="gbpArea"
                    title="Select area"
                    value={state.area}
                    onChange={(e) =>
                      setState((s) => ({ ...s, area: e.target.value as any }))
                    }
                    className="w-full h-9 border rounded-md px-2"
                  >
                    {AREAS.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="gbpType">Post type</Label>
                  <select
                    id="gbpType"
                    title="Select post type"
                    value={state.type}
                    onChange={(e) =>
                      setState((s) => ({ ...s, type: e.target.value as any }))
                    }
                    className="w-full h-9 border rounded-md px-2"
                  >
                    {POST_TYPES.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="gbpTone">Tone</Label>
                  <select
                    id="gbpTone"
                    title="Select tone"
                    value={state.tone}
                    onChange={(e) =>
                      setState((s) => ({ ...s, tone: e.target.value as any }))
                    }
                    className="w-full h-9 border rounded-md px-2"
                  >
                    {TONES.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Target words</Label>
                  <Input
                    type="number"
                    min={150}
                    max={300}
                    value={state.wordTarget}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        wordTarget: clamp(
                          parseInt(e.target.value || "200"),
                          150,
                          300
                        ),
                      }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Booking link</Label>
                  <Input
                    value={state.bookingUrl}
                    onChange={(e) =>
                      setState((s) => ({ ...s, bookingUrl: e.target.value }))
                    }
                    placeholder="https://thebelmontbarber.ca/book"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={state.autoUtm}
                    onCheckedChange={(v) =>
                      setState((s) => ({ ...s, autoUtm: Boolean(v) }))
                    }
                  />
                  <Label>Append UTM (google/gbp/campaign)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={state.addTags}
                    onCheckedChange={(v) =>
                      setState((s) => ({ ...s, addTags: Boolean(v) }))
                    }
                  />
                  <Label>Add hashtags</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={state.addNeighborhood}
                    onCheckedChange={(v) =>
                      setState((s) => ({ ...s, addNeighborhood: Boolean(v) }))
                    }
                  />
                  <Label>Add neighborhood note</Label>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                {state.type === "Offer" && (
                  <div>
                    <Label>Offer copy</Label>
                    <Input
                      value={state.offerText}
                      onChange={(e) =>
                        setState((s) => ({ ...s, offerText: e.target.value }))
                      }
                      placeholder="Weekday 11–2: $5 off online bookings this month."
                    />
                  </div>
                )}
                {state.type === "Hours Update" && (
                  <div>
                    <Label>Hours text</Label>
                    <Input
                      value={state.hoursText}
                      onChange={(e) =>
                        setState((s) => ({ ...s, hoursText: e.target.value }))
                      }
                      placeholder="Mon–Fri 10–7, Sat–Sun 10–5."
                    />
                  </div>
                )}
              </div>

              <Separator />

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label>Generated title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />

                  <Label>Generated body</Label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="h-56"
                  />

                  <div className="text-xs text-muted-foreground">
                    Words: <strong>{words(body)}</strong> · Recommended 150–300
                    words. (GBP supports much longer, but concise wins.)
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => copy(title, "title")}>
                      <Copy className="h-4 w-4 mr-1" />
                      {copied === "title" ? "Copied" : "Copy title"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copy(body, "body")}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      {copied === "body" ? "Copied" : "Copy body"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={exportTxt}>
                      <Download className="h-4 w-4 mr-1" />
                      Export .txt
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label>Alt‑text suggestion (for image/video)</Label>
                  <Textarea
                    value={alt}
                    onChange={(e) => setAlt(e.target.value)}
                    className="h-24"
                  />
                  <div className="text-xs text-muted-foreground">
                    Tip: describe subject, action, setting, and style (avoid
                    keyword stuffing).
                  </div>

                  <Separator />

                  <Label>Preview</Label>
                  <div className="border rounded-md p-3 bg-muted/20 text-sm">
                    <div className="font-medium mb-1">{title}</div>
                    <div className="whitespace-pre-wrap">{body}</div>
                  </div>

                  <Separator />

                  <div>
                    <Label>Hashtags</Label>
                    <div className="p-2 border rounded-md bg-muted/30 text-xs">
                      {hashtagFor(state.service)}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <p className="mb-1">
                      <strong>Checklist</strong>: match price wording to in‑shop
                      prices; include end date for offers; use real photos;
                      avoid exaggerated claims.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pack */}
        <TabsContent value="pack">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Auto‑generate 4‑Post Pack
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Creates: Style Spotlight, Offer, Hours Update, and What's New —
                using your current settings.
              </p>
              <Button onClick={exportPack}>
                <Wand2 className="h-4 w-4 mr-2" />
                Generate & Export .txt
              </Button>
              <Separator />
              <div className="text-xs text-muted-foreground">
                Open the file and paste each post into GBP. Pair with fresh
                photos and your booking link.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Help */}
        <TabsContent value="help">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" />
                Guidance
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Posts 150–300 words perform well for discovery; keep the first
                  line punchy.
                </li>
                <li>
                  Use neighborhood anchors: "Bridgeland LRT," "Edmonton Tr NE,"
                  "ZCREW Café nearby."
                </li>
                <li>
                  Include a clear CTA and a booking link with UTM
                  (source=google, medium=gbp).
                </li>
                <li>Swap in real photos weekly; avoid stock images.</li>
              </ul>
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
      </Tabs>
    </div>
  );
}
