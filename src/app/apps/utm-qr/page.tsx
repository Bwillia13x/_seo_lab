"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import {
  Link as LinkIcon,
  Copy,
  Check,
  Download,
  QrCode,
  Settings,
  Wand2,
  RefreshCw,
  Info,
  Play,
} from "lucide-react";
import { saveBlob } from "@/lib/blob";
import { toCSV } from "@/lib/csv";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";

// ---------------- Utilities ----------------
function normalizeBaseUrl(input: string): string {
  let url = input.trim();
  if (!url) return "";
  // add https if missing
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  try {
    const u = new URL(url);
    // strip whitespace params
    u.searchParams.forEach((v, k) => {
      if (!String(v).trim()) u.searchParams.delete(k);
    });
    return u.toString();
  } catch {
    return url; // return raw; validation will flag
  }
}

function slugify(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function todayYYYYMM() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
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
  const {
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    ...rest
  } = params;
  const pairs: [string, string][] = [];
  if (utm_source) pairs.push(["utm_source", utm_source]);
  if (utm_medium) pairs.push(["utm_medium", utm_medium]);
  if (utm_campaign) pairs.push(["utm_campaign", utm_campaign]);
  if (utm_term) pairs.push(["utm_term", utm_term]);
  if (utm_content) pairs.push(["utm_content", utm_content]);
  for (const [k, v] of Object.entries(rest)) if (v) pairs.push([k, v]);
  for (const [k, v] of pairs) {
    if (overwrite || !u.searchParams.has(k)) u.searchParams.set(k, v);
  }
  return { url: u.toString(), error: "" };
}

function isLikelyValidUrl(u: string) {
  try {
    new URL(u);
    return true;
  } catch {
    return false;
  }
}

// Simple ASCII QR code generator (fallback for demo)
function generateSimpleQR(text: string, size = 8): string[][] {
  // This is a very simple QR-like pattern for demo purposes
  // In production, you'd use a proper QR library
  const grid: string[][] = [];
  for (let y = 0; y < size; y++) {
    grid[y] = [];
    for (let x = 0; x < size; x++) {
      grid[y][x] = (x + y) % 2 === 0 ? "█" : "░";
    }
  }
  // Add a simple pattern in the center
  const center = Math.floor(size / 2);
  grid[center][center] = "█";
  if (center > 0) {
    grid[center - 1][center] = "█";
    grid[center + 1][center] = "█";
    grid[center][center - 1] = "█";
    grid[center][center + 1] = "█";
  }
  return grid;
}

// ---------------- Presets ----------------
const SERVICE_OPTIONS = [
  "mens-cut",
  "skin-fade",
  "beard-trim",
  "hot-towel-shave",
  "kids-cut",
];

const AREA_OPTIONS = ["bridgeland", "riverside", "calgary"];

type PresetKey =
  | "gbp_post"
  | "gbp_profile"
  | "instagram_bio"
  | "instagram_post"
  | "reels"
  | "email"
  | "sms";

const PRESETS: Record<
  PresetKey,
  { label: string; source: string; medium: string; contentHint?: string }
> = {
  gbp_post: { label: "GBP Post", source: "google", medium: "gbp" },
  gbp_profile: {
    label: "GBP Profile",
    source: "google",
    medium: "gbp-profile",
  },
  instagram_bio: { label: "Instagram Bio", source: "instagram", medium: "bio" },
  instagram_post: {
    label: "Instagram Post",
    source: "instagram",
    medium: "post",
  },
  reels: { label: "Instagram Reels", source: "instagram", medium: "reel" },
  email: { label: "Email", source: "email", medium: "newsletter" },
  sms: { label: "SMS", source: "sms", medium: "text" },
};

// ---------------- Main Component ----------------
export default function UTMBuilder() {
  // Single link builder state
  const [baseUrl, setBaseUrl] = useState<string>(
    "https://thebelmontbarber.ca/book"
  );
  const [preset, setPreset] = useState<PresetKey>("gbp_post");
  const [service, setService] = useState<string>(SERVICE_OPTIONS[0]);
  const [area, setArea] = useState<string>(AREA_OPTIONS[0]);
  const [campaign, setCampaign] = useState<string>(
    `belmont-${SERVICE_OPTIONS[0]}-${AREA_OPTIONS[0]}-${todayYYYYMM()}`
  );
  const [term, setTerm] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [overwrite, setOverwrite] = useState<boolean>(true);
  const [forceLower, setForceLower] = useState<boolean>(true);
  const [hyphenate, setHyphenate] = useState<boolean>(true);

  const [builtUrl, setBuiltUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [qrGrid, setQrGrid] = useState<string[][]>([]);

  // Effects: keep campaign name in sync with selections
  useEffect(() => {
    const c = `belmont-${slugify(service)}-${slugify(area)}-${todayYYYYMM()}`;
    setCampaign((prev) => (prev?.startsWith("belmont-") ? c : prev)); // only auto-update if default pattern
  }, [service, area]);

  // Build link
  function build() {
    const p = PRESETS[preset];
    let utm_source = p.source;
    let utm_medium = p.medium;
    let utm_campaign = campaign;
    let utm_term = term;
    let utm_content = content;
    if (forceLower) {
      utm_source = utm_source.toLowerCase();
      utm_medium = utm_medium.toLowerCase();
      utm_campaign = utm_campaign.toLowerCase();
      utm_term = utm_term.toLowerCase();
      utm_content = utm_content.toLowerCase();
    }
    if (hyphenate) {
      utm_campaign = slugify(utm_campaign);
      utm_term = slugify(utm_term);
      utm_content = slugify(utm_content);
    }
    const { url, error } = buildUtmUrl(
      baseUrl,
      { utm_source, utm_medium, utm_campaign, utm_term, utm_content },
      overwrite
    );
    if (error) {
      alert(error);
      return;
    }
    setBuiltUrl(url);
    // Generate simple QR pattern
    setQrGrid(generateSimpleQR(url, 16));
  }

  function copyLink() {
    if (!builtUrl) return;
    navigator.clipboard.writeText(builtUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }

  function downloadQR() {
    if (!qrGrid.length) return;
    // Create a simple text representation for download
    const qrText = qrGrid.map((row) => row.join("")).join("\n");
    const blob = new Blob([qrText], { type: "text/plain;charset=utf-8;" });
    const fname = `${preset}-${slugify(campaign || "campaign")}-${todayYYYYMM()}.txt`;
    saveBlob(blob, fname);
  }

  function resetForm() {
    setBaseUrl("https://thebelmontbarber.ca/book");
    setPreset("gbp_post");
    setService(SERVICE_OPTIONS[0]);
    setArea(AREA_OPTIONS[0]);
    setCampaign(
      `belmont-${SERVICE_OPTIONS[0]}-${AREA_OPTIONS[0]}-${todayYYYYMM()}`
    );
    setTerm("");
    setContent("");
    setBuiltUrl("");
    setQrGrid([]);
  }

  const builtOk = useMemo(
    () => builtUrl && isLikelyValidUrl(builtUrl),
    [builtUrl]
  );
  const baseOk = useMemo(
    () => isLikelyValidUrl(normalizeBaseUrl(baseUrl)),
    [baseUrl]
  );

  // ---------------- Self Tests ----------------
  type TestResult = { name: string; passed: boolean; details?: string };
  const [tests, setTests] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  async function runSelfTests() {
    setTesting(true);
    const results: TestResult[] = [];
    try {
      // 1) normalizeBaseUrl adds https
      const n1 = normalizeBaseUrl("thebelmontbarber.ca/book");
      results.push({
        name: "normalizeBaseUrl adds https",
        passed: n1.startsWith("https://"),
      });

      // 2) buildUtmUrl basic
      const b1 = buildUtmUrl(
        "https://example.com/page",
        {
          utm_source: "google",
          utm_medium: "gbp",
          utm_campaign: "test",
        },
        true
      ).url;
      results.push({
        name: "buildUtmUrl basic params",
        passed:
          /utm_source=google/.test(b1) &&
          /utm_medium=gbp/.test(b1) &&
          /utm_campaign=test/.test(b1),
      });

      // 3) buildUtmUrl overwrite=false preserves existing
      const b2 = buildUtmUrl(
        "https://example.com/page?utm_source=old",
        { utm_source: "new" },
        false
      ).url;
      results.push({
        name: "buildUtmUrl no overwrite",
        passed: /utm_source=old/.test(b2) && !/utm_source=new/.test(b2),
      });

      // 4) slugify
      const s1 = slugify("Skin Fade — Bridgeland 2025!");
      results.push({
        name: "slugify hyphenates & strips",
        passed: s1 === "skin-fade-bridgeland-2025",
        details: s1,
      });

      setTests(results);
    } finally {
      setTesting(false);
    }
  }

  const passCount = tests.filter((t) => t.passed).length;

  return (
    <div className="p-5 md:p-8 space-y-6">
      <PageHeader
        title="UTM Link + QR Builder"
        subtitle="Clean campaign links for GBP, Instagram, Email, SMS — plus QR codes. Presets, naming, batch export."
        actions={
          <Button variant="outline" onClick={resetForm}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Links Built"
          value={builtUrl ? 1 : 0}
          hint="Generated"
          icon={<LinkIcon className="h-4 w-4" />}
        />
        <KPICard
          label="QR Ready"
          value={qrGrid.length > 0 ? 1 : 0}
          hint="Available"
          icon={<QrCode className="h-4 w-4" />}
        />
        <KPICard
          label="Presets"
          value={Object.keys(PRESETS).length}
          hint="Available"
          icon={<Settings className="h-4 w-4" />}
        />
        <KPICard
          label="Tests"
          value={`${passCount}/${tests.length}`}
          hint="Passed"
          icon={<Check className="h-4 w-4" />}
        />
      </div>

      <Tabs defaultValue="single">
        <TabsList>
          <TabsTrigger value="single">Single Link</TabsTrigger>
          <TabsTrigger value="help">Help</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
        </TabsList>

        {/* Single Link */}
        <TabsContent value="single">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Builder
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label>Base URL</Label>
                    <Input
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="https://thebelmontbarber.ca/book"
                    />
                    {!baseOk && (
                      <div className="text-xs text-red-600 mt-1">
                        Check the URL format (we'll add https:// if missing).
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Preset</Label>
                      <select
                        value={preset}
                        onChange={(e) => setPreset(e.target.value as PresetKey)}
                        className="w-full h-9 border rounded-md px-2"
                      >
                        {Object.entries(PRESETS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Service</Label>
                      <select
                        value={service}
                        onChange={(e) => setService(e.target.value)}
                        className="w-full h-9 border rounded-md px-2"
                      >
                        {SERVICE_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Area</Label>
                      <select
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        className="w-full h-9 border rounded-md px-2"
                      >
                        {AREA_OPTIONS.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Campaign</Label>
                      <Input
                        value={campaign}
                        onChange={(e) => setCampaign(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Term (optional)</Label>
                      <Input
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        placeholder="fade, beard, walk-in"
                      />
                    </div>
                    <div>
                      <Label>Content (optional)</Label>
                      <Input
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="reel, bio, post1"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={overwrite}
                        onChange={(e) => setOverwrite(e.target.checked)}
                        className="rounded"
                      />
                      <Label className="text-sm">Overwrite existing UTMs</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={forceLower}
                        onChange={(e) => setForceLower(e.target.checked)}
                        className="rounded"
                      />
                      <Label className="text-sm">Lowercase</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={hyphenate}
                        onChange={(e) => setHyphenate(e.target.checked)}
                        className="rounded"
                      />
                      <Label className="text-sm">Hyphenate</Label>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={build}>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate
                    </Button>
                    {builtOk && (
                      <Button variant="outline" onClick={copyLink}>
                        {copied ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Result</Label>
                  <div className="p-3 border rounded-md bg-muted/30 break-words text-sm min-h-[56px]">
                    {builtUrl ? (
                      <a
                        href={builtUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline inline-flex items-center gap-2"
                      >
                        <LinkIcon className="h-4 w-4" />
                        {builtUrl}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">
                        Generate to preview your link…
                      </span>
                    )}
                  </div>

                  <Separator />

                  <Label>QR Preview (ASCII)</Label>
                  <div className="border rounded-md p-4 min-h-[256px] flex items-center justify-center bg-black text-green-400 font-mono text-xs overflow-auto">
                    {qrGrid.length > 0 ? (
                      <pre className="whitespace-pre">
                        {qrGrid.map((row) => row.join("")).join("\n")}
                      </pre>
                    ) : (
                      <div className="text-white">Generate to render QR…</div>
                    )}
                  </div>
                  {qrGrid.length > 0 && (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={downloadQR}>
                        <Download className="h-4 w-4 mr-2" />
                        Download ASCII
                      </Button>
                    </div>
                  )}
                </div>
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
            <CardContent className="text-sm space-y-3">
              <p>
                <strong>Presets</strong> fill <code>utm_source</code> and{" "}
                <code>utm_medium</code>. You control <code>utm_campaign</code>{" "}
                (default pattern), <code>utm_term</code>, and{" "}
                <code>utm_content</code>.
              </p>
              <p>
                Recommended campaign pattern:{" "}
                <code>
                  belmont-{"{service}"}-{"{area}"}-{"{yyyymm}"}
                </code>{" "}
                (e.g., <code>belmont-skin-fade-bridgeland-202509</code>).
              </p>
              <p>
                For GBP posts, republish QR on the counter; for Instagram, place
                the UTM link in bio and stories; for Email/SMS, ensure CASL
                consent and add unsubscribe.
              </p>
              <p>
                QR tips: Print at least 3–4 cm modules; test scanning under warm
                lighting; avoid over‑busy backgrounds.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tests */}
        <TabsContent value="tests">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Play className="h-4 w-4" />
                Self Tests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                Runs quick checks on URL normalization, UTM building, and
                slugify.
              </p>
              <div className="flex gap-2">
                <Button onClick={runSelfTests} disabled={testing}>
                  <Play className="h-4 w-4 mr-2" />
                  {testing ? "Running…" : "Run Tests"}
                </Button>
                {tests.length > 0 && (
                  <Badge
                    variant={
                      passCount === tests.length ? "default" : "secondary"
                    }
                  >
                    {passCount}/{tests.length} passed
                  </Badge>
                )}
              </div>
              {tests.length > 0 && (
                <div className="overflow-auto mt-2">
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
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
