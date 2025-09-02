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
  CheckCircle2,
} from "lucide-react";

import { saveBlob } from "@/lib/blob";
import { toCSV } from "@/lib/csv";
import { todayISO } from "@/lib/dates";
import { BELMONT_CONSTANTS, BELMONT_UTM_PRESETS } from "@/lib/constants";
import { LoadingIndicator } from "@/components/ui/loading-indicator";

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
const SERVICE_OPTIONS = BELMONT_CONSTANTS.SERVICES;

const AREA_OPTIONS = ["bridgeland", "riverside", "calgary"];

type PresetKey =
  | "gbp_post"
  | "gbp_profile"
  | "instagram_bio"
  | "instagram_post"
  | "groomsmen_party"
  | "veterans_discount"
  | "first_responders"
  | "seniors_kids";

const PRESETS: Record<
  PresetKey,
  { label: string; source: string; medium: string; contentHint?: string }
> = {
  gbp_post: BELMONT_UTM_PRESETS.gbp_post,
  gbp_profile: BELMONT_UTM_PRESETS.gbp_profile,
  instagram_bio: BELMONT_UTM_PRESETS.instagram_bio,
  instagram_post: BELMONT_UTM_PRESETS.instagram_post,
  groomsmen_party: BELMONT_UTM_PRESETS.groomsmen_party,
  veterans_discount: BELMONT_UTM_PRESETS.veterans_discount,
  first_responders: BELMONT_UTM_PRESETS.first_responders,
  seniors_kids: BELMONT_UTM_PRESETS.seniors_kids,
};

// ---------------- Main Component ----------------
function UTMDashboard() {
  // Single link builder state
  const [baseUrl, setBaseUrl] = useState<string>(BELMONT_CONSTANTS.BOOK_URL);
  const [preset, setPreset] = useState<PresetKey>("gbp_post");
  const [service, setService] = useState<string>(BELMONT_CONSTANTS.SERVICES[0]);
  const [area, setArea] = useState<string>("bridgeland");
  const [campaign, setCampaign] = useState<string>(
    `${BELMONT_CONSTANTS.UTM_CAMPAIGN_BASE}_${BELMONT_CONSTANTS.SERVICES[0]}_${todayYYYYMM()}`
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
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

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
    setIsGenerating(true);
    try {
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
    } catch (error) {
      console.error('Failed to generate UTM link:', error);
      // Could add error state here
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(builtUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
      // Could show error toast here
    }
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
        title="Campaign Links"
        subtitle="Build clean, consistent campaign links, batch‑generate, and produce QR codes."
        showLogo={true}
        actions={
          <div className="flex gap-2">
            <Button onClick={build} disabled={isGenerating}>
              {isGenerating ? (
                <LoadingIndicator size="sm" className="mr-2" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              {isGenerating ? "Generating..." : "Generate UTM"}
            </Button>
            <Button onClick={copyUrl} disabled={!builtUrl} variant={copied ? "default" : "outline"}>
              {copied ? (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Do this next</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <ol className="list-decimal pl-5 space-y-1">
            <li>Pick the preset (Instagram Bio, GBP Post, Email, etc.).</li>
            <li>Enter the booking link as your Base URL.</li>
            <li>Click Generate UTM, then Copy Link.</li>
            <li>Paste it into your post or profile.</li>
            <li>Optional: open QR tab and print a counter QR.</li>
          </ol>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Built URL" value={builtUrl ? "Ready" : "—"} />
        <KPICard label="Batch Items" value={rows.length} />
        <KPICard label="QR Ready" value={qrUrl ? "Yes" : "No"} />
        <KPICard label="Preset" value={PRESETS[preset].label} />
      </div>

      <Tabs defaultValue="howto">
        <TabsList>
          <TabsTrigger value="howto">How To</TabsTrigger>
          <TabsTrigger value="builder">Link Builder</TabsTrigger>
          <TabsTrigger value="batch">Batch Builder</TabsTrigger>
          <TabsTrigger value="qr">QR Codes</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
        </TabsList>

        {/* How To */}
        <TabsContent value="howto">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  How to Use the Campaign Link Builder
                </CardTitle>
                <CardDescription>
                  Create special tracking links that help Belmont see where
                  customers come from when they book appointments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      What This Tool Does
                    </h3>
                    <p className="text-muted-foreground">
                      This tool creates special links that track where your
                      customers come from. For example, when someone clicks a
                      link in your Google Business Profile post and then books
                      an appointment, you'll know that customer came from that
                      specific post. This helps Belmont understand which
                      marketing efforts are working best.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Why This Matters for Belmont
                    </h3>
                    <p className="text-muted-foreground">
                      Belmont can now track which marketing campaigns bring in
                      the most customers. For example:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground mt-2">
                      <li>
                        Track how many customers book after seeing your
                        Groomsmen Party promotions
                      </li>
                      <li>See which social media posts get the most clicks</li>
                      <li>
                        Measure the success of your Veterans discount campaigns
                      </li>
                      <li>
                        Know which services customers are most interested in
                        booking
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Step-by-Step Instructions
                    </h3>
                    <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                      <li>
                        <strong>Choose a preset:</strong> Select from common
                        marketing channels like "Instagram Bio", "GBP Post", or
                        "Email Campaign"
                      </li>
                      <li>
                        <strong>Enter your booking link:</strong> This is the
                        web address where customers go to book appointments
                      </li>
                      <li>
                        <strong>Click "Generate UTM":</strong> The tool will
                        create a special tracking link with codes that identify
                        where customers came from
                      </li>
                      <li>
                        <strong>Copy the link:</strong> Use the copy button to
                        get the tracking link
                      </li>
                      <li>
                        <strong>Use in your marketing:</strong> Put this link in
                        social media posts, email campaigns, or your Google
                        Business Profile
                      </li>
                      <li>
                        <strong>Track results:</strong> Use Google Analytics to
                        see which marketing efforts bring the most bookings
                      </li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Best Practices for Belmont
                    </h3>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>
                        <strong>Use consistent naming:</strong> Always use the
                        same format for campaign names (e.g.,
                        "belmont-groomsmen-winter-2024")
                      </li>
                      <li>
                        <strong>Track everything:</strong> Add tracking links to
                        all social media posts, email campaigns, and online
                        listings
                      </li>
                      <li>
                        <strong>Include service details:</strong> Use specific
                        campaign names like "belmont-skin-fade" or
                        "belmont-veterans-discount"
                      </li>
                      <li>
                        <strong>Review performance monthly:</strong> Check
                        Google Analytics to see which campaigns bring the most
                        customers
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      UTM Parameter Guide
                    </h3>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>
                        <strong>utm_source</strong>: Where traffic comes from
                        (google, facebook, email)
                      </li>
                      <li>
                        <strong>utm_medium</strong>: Marketing medium (cpc,
                        social, email, gbp)
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
                        (e.g., "red-button" vs "blue-button")
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

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
                    placeholder="https://thebelmontbarber.ca/book"
                    aria-label="Base URL for UTM tracking"
                  />
                </div>

                <div>
                  <Label>Platform Preset</Label>
                  <select
                    className="w-full h-9 border rounded-md px-2 focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={preset}
                    onChange={(e) => setPreset(e.target.value as PresetKey)}
                    aria-label="Select marketing platform preset"
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
                      aria-label="Select Belmont service"
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
                      aria-label="Select geographic area"
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
                    placeholder="belmont-skin-fade-bridgeland-202412"
                    aria-label="UTM campaign name"
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
                    aria-label="Select QR code error correction level"
                  >
                    <option value="L">Low (7%)</option>
                    <option value="M">Medium (15%)</option>
                    <option value="Q">Quartile (25%)</option>
                    <option value="H">High (30%)</option>
                  </select>
                </div>

                {qrUrl && (
                  <Button onClick={downloadQR}>
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
                    {/* eslint-disable-next-line @next/next/no-img-element -- Safe data URL preview for generated QR */}
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

        {/* How to Use Instructions */}
        <TabsContent value="instructions">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  How to Use the Campaign Link Builder
                </CardTitle>
                <CardDescription>
                  Create special tracking links that help Belmont see where
                  customers come from when they book appointments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      What This Tool Does
                    </h3>
                    <p className="text-muted-foreground">
                      This tool creates special links that track where your
                      customers come from. For example, when someone clicks a
                      link in your Google Business Profile post and then books
                      an appointment, you'll know that customer came from that
                      specific post. This helps Belmont understand which
                      marketing efforts are working best.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Why This Matters for Belmont
                    </h3>
                    <p className="text-muted-foreground">
                      Belmont can now track which marketing campaigns bring in
                      the most customers. For example:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground mt-2">
                      <li>
                        Track how many customers book after seeing your
                        Groomsmen Party promotions
                      </li>
                      <li>See which social media posts get the most clicks</li>
                      <li>
                        Measure the success of your Veterans discount campaigns
                      </li>
                      <li>
                        Know which services customers are most interested in
                        booking
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      How to Create a Tracking Link
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          1
                        </Badge>
                        <div>
                          <p className="font-medium">
                            Choose Your Marketing Campaign
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Select from Belmont's pre-set campaigns like
                            "Groomsmen Party", "Veterans Discount", or "Google
                            Business Profile Post". These are already set up
                            with the right tracking codes.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          2
                        </Badge>
                        <div>
                          <p className="font-medium">Pick the Service</p>
                          <p className="text-sm text-muted-foreground">
                            Choose which Belmont service you're promoting (Men's
                            Haircut, Beard Trim, Hot Towel Shave, etc.)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          3
                        </Badge>
                        <div>
                          <p className="font-medium">Select the Area</p>
                          <p className="text-sm text-muted-foreground">
                            Choose "Bridgeland" or "Riverside" to track which
                            neighborhood customers are coming from
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          4
                        </Badge>
                        <div>
                          <p className="font-medium">Generate the Link</p>
                          <p className="text-sm text-muted-foreground">
                            Click "Generate UTM" and your special tracking link
                            will be created automatically
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          5
                        </Badge>
                        <div>
                          <p className="font-medium">Use the Link</p>
                          <p className="text-sm text-muted-foreground">
                            Copy the link and use it in your social media posts,
                            emails, or Google Business Profile. When customers
                            click it and book, you'll see exactly where they
                            came from.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Tips for Belmont
                    </h3>
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-400 mt-1">
                            💡
                          </span>
                          <span>
                            Always use the pre-set campaigns - they're already
                            configured for Belmont's marketing needs
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-400 mt-1">
                            📱
                          </span>
                          <span>
                            Test your links by clicking them yourself first to
                            make sure they work
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-400 mt-1">
                            📊
                          </span>
                          <span>
                            Check Google Analytics regularly to see which
                            campaigns bring in the most customers
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-400 mt-1">
                            🎯
                          </span>
                          <span>
                            Focus your marketing budget on campaigns that show
                            the best results
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Common Uses for Belmont
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-3">
                        <h4 className="font-medium mb-2">Social Media Posts</h4>
                        <p className="text-sm text-muted-foreground">
                          Create unique links for each Instagram or Facebook
                          post to track which content gets the most clicks
                        </p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <h4 className="font-medium mb-2">Email Newsletters</h4>
                        <p className="text-sm text-muted-foreground">
                          Track which newsletter links customers click to book
                          appointments
                        </p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <h4 className="font-medium mb-2">
                          Google Business Profile
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Monitor which GBP posts drive the most bookings and
                          customer calls
                        </p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <h4 className="font-medium mb-2">Special Promotions</h4>
                        <p className="text-sm text-muted-foreground">
                          Track the success of Veterans Day specials, holiday
                          offers, and seasonal promotions
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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
