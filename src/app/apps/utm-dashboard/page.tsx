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

import {
  Download,
  Upload,
  Copy,
  Wand2,
  Settings,
  RefreshCw,
  Info,
  Play,
  QrCode,
  Link,
  Filter,
} from "lucide-react";

import { saveBlob } from "@/lib/blob";
import { toCSV } from "@/lib/csv";
import { todayISO } from "@/lib/dates";

// ---------------- UTM Building ----------------
function buildUtmUrl(
  baseUrl: string,
  utm: Record<string, string>,
  overwrite: boolean
) {
  const url = new URL(baseUrl);
  if (overwrite) url.search = ""; // clear existing params
  for (const [k, v] of Object.entries(utm)) {
    if (v) url.searchParams.set(k, v);
  }
  return { url: url.toString() };
}

function todayYYYYMM() {
  const d = new Date();
  return `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------- QR Code ----------------
async function qrDataUrl(
  text: string,
  size: number,
  margin: number,
  ecLevel: "L" | "M" | "Q" | "H"
) {
  const QRCode = (await import("qrcode")).default;
  return await QRCode.toDataURL(text, {
    width: size,
    margin,
    errorCorrectionLevel: ecLevel,
  });
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
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
function UTMDashboard() {
  // Single link builder state
  const [baseUrl, setBaseUrl] = useState<string>(
    "https://thebelmontbarber.ca/book"
  );
  const [preset, setPreset] = useState<PresetKey>("gbp_post");
  const [service, setService] = useState<string>("mens-cut");
  const [area, setArea] = useState<string>("bridgeland");
  const [campaign, setCampaign] = useState<string>(
    `belmont-mens-cut-bridgeland-${todayYYYYMM()}`
  );
  const [term, setTerm] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [overwrite, setOverwrite] = useState<boolean>(true);
  const [forceLower, setForceLower] = useState<boolean>(true);
  const [hyphenate, setHyphenate] = useState<boolean>(true);

  const [size, setSize] = useState<number>(512);
  const [margin, setMargin] = useState<number>(4);
  const [ecLevel, setEcLevel] = useState<"L" | "M" | "Q" | "H">("M");

  const [builtUrl, setBuiltUrl] = useState<string>("");
  const [qrUrl, setQrUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  // Batch state
  type Row = {
    id: string;
    base: string;
    preset: PresetKey;
    service: string;
    area: string;
    campaign: string;
    term: string;
    content: string;
    url?: string;
  };
  const [rows, setRows] = useState<Row[]>([]);

  // Self-test state
  type TestResult = { name: string; passed: boolean; details?: string };
  const [tests, setTests] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  // Effects: keep campaign name in sync with selections
  useEffect(() => {
    const c = `belmont-${slugify(service)}-${slugify(area)}-${todayYYYYMM()}`;
    setCampaign((prev) => (prev?.startsWith("belmont-") ? c : prev)); // only auto-update if default pattern
  }, [service, area]);

  // Build link on demand
  async function build() {
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
    const { url } = buildUtmUrl(
      baseUrl,
      { utm_source, utm_medium, utm_campaign, utm_term, utm_content },
      overwrite
    );
    setBuiltUrl(url);
    const durl = await qrDataUrl(url, size, margin, ecLevel);
    setQrUrl(durl);
  }

  function copyUrl() {
    navigator.clipboard.writeText(builtUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  function downloadQR() {
    if (!qrUrl) return;
    downloadDataUrl(qrUrl, `belmont-qr-${slugify(campaign)}.png`);
  }

  // Batch operations
  function addToBatch() {
    const row: Row = {
      id: crypto.randomUUID?.() || `${Date.now()}_${rows.length}`,
      base: baseUrl,
      preset,
      service,
      area,
      campaign,
      term,
      content,
    };
    setRows((prev) => [...prev, row]);
  }

  function buildBatch() {
    setRows((prev) =>
      prev.map((r) => {
        const p = PRESETS[r.preset];
        const { url } = buildUtmUrl(
          r.base,
          {
            utm_source: p.source.toLowerCase(),
            utm_medium: p.medium.toLowerCase(),
            utm_campaign: r.campaign.toLowerCase(),
            utm_term: r.term.toLowerCase(),
            utm_content: r.content.toLowerCase(),
          },
          true
        );
        return { ...r, url };
      })
    );
  }

  function exportBatchCSV() {
    const data = rows.map((r) => ({
      id: r.id,
      base: r.base,
      preset: r.preset,
      service: r.service,
      area: r.area,
      campaign: r.campaign,
      term: r.term,
      content: r.content,
      url: r.url || "",
    }));
    const csv = toCSV(data);
    saveBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      `belmont-utm-batch-${todayISO()}.csv`
    );
  }

  function clearBatch() {
    setRows([]);
  }

  // Self-tests
  async function runTests() {
    setTesting(true);
    const results: TestResult[] = [];

    // Test UTM building
    const testUrl = buildUtmUrl(
      "https://example.com",
      { utm_source: "google", utm_medium: "cpc", utm_campaign: "test" },
      true
    );
    results.push({
      name: "UTM URL building",
      passed:
        testUrl.url.includes("utm_source=google") &&
        testUrl.url.includes("utm_medium=cpc"),
      details: testUrl.url,
    });

    // Test QR generation
    try {
      const qr = await qrDataUrl("https://example.com", 256, 2, "M");
      results.push({
        name: "QR code generation",
        passed: qr.startsWith("data:image/png;base64,"),
        details: "Generated QR code data URL",
      });
    } catch (e) {
      results.push({
        name: "QR code generation",
        passed: false,
        details: String(e),
      });
    }

    // Test slugification
    results.push({
      name: "Slugification",
      passed: slugify("Test Campaign Name") === "test-campaign-name",
      details: slugify("Test Campaign Name"),
    });

    setTests(results);
    setTesting(false);
  }

  return (
    <div className="p-5 md:p-8 space-y-6">
      <PageHeader
        title="UTM & Attribution Dashboard"
        subtitle="Build clean, consistent campaign links, batch‑generate, and produce QR codes."
        actions={
          <div className="flex gap-2">
            <Button onClick={build}>
              <Wand2 className="h-4 w-4 mr-2" />
              Generate UTM
            </Button>
            <Button variant="outline" onClick={copyUrl} disabled={!builtUrl}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Built URL" value={builtUrl ? "Ready" : "—"} />
        <KPICard label="Batch Items" value={rows.length} />
        <KPICard label="QR Ready" value={qrUrl ? "Yes" : "No"} />
        <KPICard label="Preset" value={PRESETS[preset].label} />
      </div>

      <Tabs defaultValue="builder">
        <TabsList>
          <TabsTrigger value="builder">Link Builder</TabsTrigger>
          <TabsTrigger value="batch">Batch Builder</TabsTrigger>
          <TabsTrigger value="qr">QR Codes</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
          <TabsTrigger value="help">Help</TabsTrigger>
        </TabsList>

        {/* Link Builder */}
        <TabsContent value="builder">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  UTM Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Base URL</Label>
                  <Input
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Platform Preset</Label>
                  <select
                    className="w-full h-9 border rounded-md px-2"
                    value={preset}
                    onChange={(e) => setPreset(e.target.value as PresetKey)}
                  >
                    {Object.entries(PRESETS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label>Service</Label>
                    <select
                      className="w-full h-9 border rounded-md px-2"
                      value={service}
                      onChange={(e) => setService(e.target.value)}
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
                      className="w-full h-9 border rounded-md px-2"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                    >
                      {AREA_OPTIONS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label>Campaign Name</Label>
                  <Input
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label>Term (optional)</Label>
                    <Input
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                      placeholder="keyword"
                    />
                  </div>
                  <div>
                    <Label>Content (optional)</Label>
                    <Input
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="ad-version"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={overwrite}
                        onCheckedChange={(v) => setOverwrite(Boolean(v))}
                      />
                      <Label className="text-sm">
                        Overwrite existing params
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={forceLower}
                        onCheckedChange={(v) => setForceLower(Boolean(v))}
                      />
                      <Label className="text-sm">Force lowercase</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={hyphenate}
                        onCheckedChange={(v) => setHyphenate(Boolean(v))}
                      />
                      <Label className="text-sm">Hyphenate spaces</Label>
                    </div>
                  </div>
                </div>

                <Button onClick={build} className="w-full">
                  <Wand2 className="h-4 w-4 mr-2" />
                  Build UTM Link
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Generated Link</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>UTM URL</Label>
                  <Textarea
                    value={builtUrl}
                    readOnly
                    className="h-20 font-mono text-sm"
                    placeholder="Click 'Build UTM Link' to generate..."
                  />
                </div>

                {builtUrl && (
                  <div className="flex gap-2">
                    <Button onClick={copyUrl} variant="outline">
                      <Copy className="h-4 w-4 mr-2" />
                      {copied ? "Copied!" : "Copy URL"}
                    </Button>
                    <Button onClick={addToBatch} variant="outline">
                      Add to Batch
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Batch Builder */}
        <TabsContent value="batch">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Batch UTM Generation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-muted-foreground">
                Build multiple UTM links at once. Add links from the builder,
                then generate all URLs.
              </div>

              <div className="flex gap-2">
                <Button onClick={buildBatch} disabled={rows.length === 0}>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Build All Links
                </Button>
                <Button
                  onClick={exportBatchCSV}
                  variant="outline"
                  disabled={rows.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  onClick={clearBatch}
                  variant="outline"
                  disabled={rows.length === 0}
                >
                  Clear All
                </Button>
              </div>

              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>Generated URL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          {row.campaign}
                        </TableCell>
                        <TableCell>{PRESETS[row.preset].label}</TableCell>
                        <TableCell>{row.service}</TableCell>
                        <TableCell>{row.area}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {row.url ? (
                            <a
                              href={row.url}
                              target="_blank"
                              rel="noreferrer"
                              className="underline"
                            >
                              {row.url.length > 50
                                ? row.url.slice(0, 50) + "..."
                                : row.url}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">
                              Not generated yet
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {rows.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-sm text-muted-foreground text-center py-8"
                        >
                          No links in batch. Use "Add to Batch" from the Link
                          Builder tab.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* QR Codes */}
        <TabsContent value="qr">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  QR Code Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label>Size (pixels)</Label>
                    <Input
                      type="number"
                      min={128}
                      max={1024}
                      value={size}
                      onChange={(e) => setSize(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Margin</Label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={margin}
                      onChange={(e) => setMargin(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Error Correction</Label>
                  <select
                    className="w-full h-9 border rounded-md px-2"
                    value={ecLevel}
                    onChange={(e) =>
                      setEcLevel(e.target.value as "L" | "M" | "Q" | "H")
                    }
                  >
                    <option value="L">Low (7%)</option>
                    <option value="M">Medium (15%)</option>
                    <option value="Q">Quartile (25%)</option>
                    <option value="H">High (30%)</option>
                  </select>
                </div>

                {qrUrl && (
                  <Button onClick={downloadQR} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download QR Code
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">QR Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {qrUrl ? (
                  <div className="text-center">
                    <img
                      src={qrUrl}
                      alt="QR Code"
                      className="max-w-full h-auto border rounded"
                      style={{ maxHeight: "300px" }}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Scan to open: {builtUrl}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Generate a UTM link first to create a QR code
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Placeholder */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">UTM Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Analytics dashboard coming soon — will track conversions by UTM
                parameters
              </div>
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
              <div className="flex gap-2 mb-4">
                <Button onClick={runTests} disabled={testing}>
                  {testing ? "Running..." : "Run Tests"}
                </Button>
                <Button onClick={() => setTests([])} variant="outline">
                  Clear Results
                </Button>
              </div>

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
                  {tests.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-sm text-muted-foreground text-center py-4"
                      >
                        No tests run yet. Click "Run Tests" to check
                        functionality.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Help */}
        <TabsContent value="help">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                UTM Best Practices
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>utm_source</strong>: Where traffic comes from (google,
                  facebook, email)
                </li>
                <li>
                  <strong>utm_medium</strong>: Marketing medium (cpc, social,
                  email, gbp)
                </li>
                <li>
                  <strong>utm_campaign</strong>: Campaign identifier
                  (belmont-skin-fade-bridgeland-202412)
                </li>
                <li>
                  <strong>utm_term</strong>: Keywords or targeting terms
                  (optional)
                </li>
                <li>
                  <strong>utm_content</strong>: Specific content version
                  (optional)
                </li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Use consistent naming: lowercase, hyphens for spaces. Track
                performance in Google Analytics.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Page() {
  return <UTMDashboard />;
}
