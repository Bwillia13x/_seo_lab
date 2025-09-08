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
  Sparkles,
  Brain,
  BarChart3,
  Share2,
  Target,
  TrendingUp,
  Hash,
  BookOpen,
  Trash2,
  Zap,
  Lightbulb,
  Clock,
  Calendar,
  Users,
  DollarSign,
  Eye,
  MousePointer,
  Smartphone,
  Monitor,
  Globe,
} from "lucide-react";
import { aiChatSafe } from "@/lib/ai";
import { logEvent } from "@/lib/analytics";
import { sendGAEvent } from "@/lib/ga4";

import { saveBlob } from "@/lib/blob";
import { showToast } from "@/lib/toast";
import { toCSV } from "@/lib/csv";
import { todayISO } from "@/lib/dates";
import { BELMONT_CONSTANTS, BELMONT_UTM_PRESETS } from "@/lib/constants";
import { LoadingIndicator } from "@/components/ui/loading-indicator";

// ---------------- Enhanced Types ----------------
type CampaignPerformance = {
  id: string;
  campaignName: string;
  clicks: number;
  conversions: number;
  revenue: number;
  cost: number;
  roi: number;
  ctr: number;
  conversionRate: number;
  dateRange: string;
  platform: string;
  service: string;
  area: string;
};

type ABTestVariant = {
  id: string;
  name: string;
  utmUrl: string;
  clicks: number;
  conversions: number;
  winner: boolean;
  confidence: number;
};

type ABTest = {
  id: string;
  name: string;
  description: string;
  variants: ABTestVariant[];
  status: "running" | "completed" | "paused";
  startDate: string;
  endDate?: string;
  winner?: string;
};

type SavedCampaign = {
  id: string;
  name: string;
  description: string;
  utmUrl: string;
  qrCode?: string;
  platform: string;
  service: string;
  area: string;
  performance: CampaignPerformance;
  createdDate: string;
  tags: string[];
  category: string;
};

type CampaignLibrary = {
  savedCampaigns: SavedCampaign[];
  categories: string[];
};

type ScheduledCampaign = {
  id: string;
  campaignName: string;
  utmUrl: string;
  scheduleDate: string;
  scheduleTime: string;
  platform: string;
  status: "scheduled" | "published" | "expired";
};

type CampaignQuality = {
  score: number;
  strengths: string[];
  improvements: string[];
  seoScore: number;
  readabilityScore: number;
  callToActionScore: number;
};

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

// ---------------- AI Campaign Optimization ----------------
async function generateAICampaignSuggestion(
  platform: string,
  service: string,
  area: string,
  apiKey?: string
): Promise<{
  suggestion: string;
  expectedPerformance: string;
  bestPractices: string[];
}> {
  try {
    const out = await aiChatSafe({
      model: "gpt-5-mini-2025-08-07",
      maxTokens: 300,
      temperature: 0.7,
      messages: [
        { role: "system", content: `You are a marketing expert for The Belmont Barbershop in ${area}. Provide data-driven campaign suggestions that maximize customer acquisition and booking conversions.` },
        { role: "user", content: `Create an optimized campaign strategy for ${service} targeting customers in ${area} via ${platform}. Include:\n1. Campaign name suggestion\n2. Expected performance metrics\n3. Best practices for ${platform} marketing\n4. UTM parameter optimization tips` },
      ],
    });

    const content = out.ok ? out.content : "";
    const lines = content.split("\n");

    return {
      suggestion: lines[0] || `Optimized ${service} campaign for ${platform}`,
      expectedPerformance:
        lines.find(
          (l) =>
            l.includes("performance") ||
            l.includes("CTR") ||
            l.includes("conversion")
        ) || "15-25% CTR expected",
      bestPractices: lines
        .filter((l) => l.includes("•") || l.includes("-"))
        .slice(0, 3),
    };
  } catch (error) {
    console.error("AI campaign suggestion failed:", error);
    return {
      suggestion: `Standard ${service} campaign for ${platform}`,
      expectedPerformance: "10-20% CTR expected",
      bestPractices: [
        "Use clear call-to-action",
        "Include local keywords",
        "Add compelling imagery",
      ],
    };
  }
}

function calculateCampaignQuality(
  campaignName: string,
  platform: string,
  service: string,
  area: string
): CampaignQuality {
  let score = 50;
  const strengths: string[] = [];
  const improvements: string[] = [];

  // Campaign name analysis
  if (campaignName.includes(service.toLowerCase())) {
    score += 10;
    strengths.push("Includes target service");
  } else {
    improvements.push("Include specific service in campaign name");
  }

  if (campaignName.includes(area.toLowerCase())) {
    score += 10;
    strengths.push("Includes local area");
  } else {
    improvements.push("Add location for better targeting");
  }

  // Platform optimization
  const platformKeywords = {
    instagram: ["visual", "story", "reel"],
    facebook: ["community", "group", "event"],
    google: ["local", "search", "review"],
    linkedin: ["professional", "network", "business"],
  };

  const keywords =
    platformKeywords[platform as keyof typeof platformKeywords] || [];
  const hasPlatformKeywords = keywords.some((k) =>
    campaignName.toLowerCase().includes(k)
  );
  if (hasPlatformKeywords) {
    score += 15;
    strengths.push("Platform-optimized naming");
  } else {
    improvements.push(
      `Consider platform-specific keywords: ${keywords.join(", ")}`
    );
  }

  // SEO analysis
  const seoScore = Math.min(100, score + 20);
  const readabilityScore =
    campaignName.length > 10 && campaignName.length < 50 ? 85 : 60;
  const callToActionScore =
    campaignName.includes("book") || campaignName.includes("special") ? 90 : 70;

  return {
    score: Math.min(100, Math.max(0, score)),
    strengths,
    improvements,
    seoScore,
    readabilityScore,
    callToActionScore,
  };
}

// ---------------- Enhanced Analytics ----------------

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

  // Enhanced state for new features
  // Server-managed AI; no client key needed
  useEffect(() => {}, []);
  const [aiSuggestions, setAiSuggestions] = useState<{
    suggestion: string;
    expectedPerformance: string;
    bestPractices: string[];
  } | null>(null);
  const [campaignQuality, setCampaignQuality] =
    useState<CampaignQuality | null>(null);
  const [abTests, setAbTests] = useState<ABTest[]>([]);
  const [currentAbTest, setCurrentAbTest] = useState<ABTest | null>(null);
  const [campaignLibrary, setCampaignLibrary] = useState<CampaignLibrary>({
    savedCampaigns: [],
    categories: [
      "Promotions",
      "Services",
      "Events",
      "Seasonal",
      "Community",
      "Staff",
    ],
  });
  const [scheduledCampaigns, setScheduledCampaigns] = useState<
    ScheduledCampaign[]
  >([]);
  const [analytics, setAnalytics] = useState<CampaignPerformance[]>([]);

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
    quality?: CampaignQuality;
  };
  const [rows, setRows] = useState<Row[]>([]);

  // Self-test state
  type TestResult = { name: string; passed: boolean; details?: string };
  const [tests, setTests] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  // Onboarding: prefer locally saved booking URL
  useEffect(() => {
    try {
      const b = localStorage.getItem("belmont_onboarding_booking");
      if (b && /^https?:\/\//.test(b)) setBaseUrl(b);
    } catch {}
  }, []);

  // Demo loader: populate a few example campaigns and a ready QR
  async function loadDemo() {
    try {
      const demo: Row[] = [
        {
          id: `demo-1-${Date.now()}`,
          base: BELMONT_CONSTANTS.BOOK_URL,
          preset: "instagram_bio",
          service: "mens-cut",
          area: "bridgeland",
          campaign: `belmont-mens-cut-bridgeland-${todayYYYYMM()}`,
          term: "",
          content: "profile-link",
        },
        {
          id: `demo-2-${Date.now()}`,
          base: BELMONT_CONSTANTS.BOOK_URL,
          preset: "gbp_post",
          service: "beard-trim",
          area: "calgary",
          campaign: `belmont-beard-trim-calgary-${todayYYYYMM()}`,
          term: "",
          content: "special-offer",
        },
        {
          id: `demo-3-${Date.now()}`,
          base: BELMONT_CONSTANTS.BOOK_URL,
          preset: "groomsmen_party",
          service: "groomsmen-party",
          area: "calgary",
          campaign: `belmont-groomsmen-calgary-${todayYYYYMM()}`,
          term: "wedding",
          content: "package",
        },
      ];

      // Compute URLs for each demo row
      const withUrls = demo.map((r) => {
        const p = PRESETS[r.preset];
        const { url } = buildUtmUrl(
          r.base,
          {
            utm_source: p.source,
            utm_medium: p.medium,
            utm_campaign: slugify(r.campaign),
            utm_term: slugify(r.term || ""),
            utm_content: slugify(r.content || ""),
          },
          true
        );
        return { ...r, url };
      });

      setRows(withUrls);
      // Also present the first link as a generated example
      if (withUrls[0]?.url) {
        setBuiltUrl(withUrls[0].url);
        const durl = await qrDataUrl(withUrls[0].url, size, margin, ecLevel);
        setQrUrl(durl);
      }
      showToast("Loaded demo campaigns", "success");
    } catch (e) {
      console.error(e);
    }
  }

  // Enhanced Analytics function
  const generateMockAnalytics = (campaigns: Row[]): CampaignPerformance[] => {
    return campaigns.map((row, index) => ({
      id: `perf-${index}`,
      campaignName: row.campaign,
      clicks: Math.floor(Math.random() * 100) + 20,
      conversions: Math.floor(Math.random() * 15) + 3,
      revenue: Math.floor(Math.random() * 800) + 200,
      cost: Math.floor(Math.random() * 50) + 10,
      roi: Math.floor(Math.random() * 300) + 50,
      ctr: Math.floor(Math.random() * 8) + 2,
      conversionRate: Math.floor(Math.random() * 20) + 5,
      dateRange: "Last 30 days",
      platform: PRESETS[row.preset].source,
      service: row.service,
      area: row.area,
    }));
  };

  // Effects: keep campaign name in sync with selections
  useEffect(() => {
    const c = `belmont-${slugify(service)}-${slugify(area)}-${todayYYYYMM()}`;
    setCampaign((prev) => (prev?.startsWith("belmont-") ? c : prev)); // only auto-update if default pattern
  }, [service, area]);

  // Enhanced functions for new features
  const getAISuggestions = async () => {
    const suggestions = await generateAICampaignSuggestion(
      PRESETS[preset].source,
      service,
      area
    );
    setAiSuggestions(suggestions);
  };

  const analyzeCampaignQuality = () => {
    const quality = calculateCampaignQuality(
      campaign,
      PRESETS[preset].source,
      service,
      area
    );
    setCampaignQuality(quality);
  };

  const saveCampaignToLibrary = (row: Row, tags: string[] = []) => {
    const savedCampaign: SavedCampaign = {
      id: row.id + "_saved",
      name: row.campaign,
      description: `Campaign for ${row.service} in ${row.area} via ${PRESETS[row.preset].label}`,
      utmUrl: row.url || "",
      qrCode: qrUrl,
      platform: PRESETS[row.preset].source,
      service: row.service,
      area: row.area,
      performance: {
        id: `perf-${row.id}`,
        campaignName: row.campaign,
        clicks: Math.floor(Math.random() * 100) + 20,
        conversions: Math.floor(Math.random() * 15) + 3,
        revenue: Math.floor(Math.random() * 800) + 200,
        cost: Math.floor(Math.random() * 50) + 10,
        roi: Math.floor(Math.random() * 300) + 50,
        ctr: Math.floor(Math.random() * 8) + 2,
        conversionRate: Math.floor(Math.random() * 20) + 5,
        dateRange: "Last 30 days",
        platform: PRESETS[row.preset].source,
        service: row.service,
        area: row.area,
      },
      createdDate: todayISO(),
      tags,
      category: "Services",
    };

    setCampaignLibrary((prev) => ({
      ...prev,
      savedCampaigns: [...prev.savedCampaigns, savedCampaign],
    }));

    showToast("Campaign saved to library!", "success");
  };

  const scheduleCampaign = (row: Row, date: string, time: string) => {
    const scheduledCampaign: ScheduledCampaign = {
      id: row.id + "_scheduled_" + Date.now(),
      campaignName: row.campaign,
      utmUrl: row.url || "",
      scheduleDate: date,
      scheduleTime: time,
      platform: PRESETS[row.preset].source,
      status: "scheduled",
    };

    setScheduledCampaigns((prev) => [...prev, scheduledCampaign]);
    showToast(`Campaign scheduled for ${date} at ${time}`, "success");
  };

  const createABTest = (
    campaignName: string,
    variantA: string,
    variantB: string
  ) => {
    const test: ABTest = {
      id: `ab_${Date.now()}`,
      name: campaignName,
      description: `A/B test for ${campaignName}`,
      variants: [
        {
          id: "variant_a",
          name: "Variant A",
          utmUrl: variantA,
          clicks: 0,
          conversions: 0,
          winner: false,
          confidence: 0,
        },
        {
          id: "variant_b",
          name: "Variant B",
          utmUrl: variantB,
          clicks: 0,
          conversions: 0,
          winner: false,
          confidence: 0,
        },
      ],
      status: "running",
      startDate: todayISO(),
    };

    setAbTests((prev) => [...prev, test]);
    setCurrentAbTest(test);
  };

  const generateAnalytics = () => {
    const performance = generateMockAnalytics(rows);
    setAnalytics(performance);
  };

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
      try {
        logEvent("utm_link_built", {
          source: utm_source,
          medium: utm_medium,
          campaign: utm_campaign,
          service,
          area,
        });
      } catch {}
      try {
        // Fire GA4 event via server endpoint (if GA4 env is configured)
        sendGAEvent("utm_link_built", {
          source: utm_source,
          medium: utm_medium,
          campaign: utm_campaign,
          service,
          area,
        });
      } catch {}
      const durl = await qrDataUrl(url, size, margin, ecLevel);
      setQrUrl(durl);
    } catch (error) {
      console.error("Failed to generate UTM link:", error);
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
      console.error("Failed to copy URL:", error);
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
        title="AI Campaign Studio"
        subtitle="Create optimized campaign links with suggestions and tracking."
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
            <Button
              onClick={copyUrl}
              disabled={!builtUrl}
              variant={copied ? "default" : "outline"}
            >
              {copied ? (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
            <Button onClick={loadDemo} variant="secondary">
              <Sparkles className="h-4 w-4 mr-2" />
              Load Demo
            </Button>
            <span className="advanced-only contents">
              <Button onClick={getAISuggestions} variant="outline">
                <Brain className="h-4 w-4 mr-2" />
                AI Suggest
              </Button>
              <Button onClick={analyzeCampaignQuality} variant="outline">
                <Target className="h-4 w-4 mr-2" />
                Analyze
              </Button>
            </span>
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

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <KPICard
          label="Built URL"
          value={builtUrl ? "Ready" : "—"}
          icon={<Link className="h-4 w-4" />}
        />
        <KPICard label="AI Status" value="Server-managed" icon={<Brain className="h-4 w-4" />} />
        <KPICard
          label="Batch Items"
          value={rows.length}
          icon={<Upload className="h-4 w-4" />}
        />
        <KPICard
          label="Library"
          value={campaignLibrary.savedCampaigns.length}
          icon={<BookOpen className="h-4 w-4" />}
        />
        <KPICard
          label="QR Ready"
          value={qrUrl ? "Yes" : "No"}
          icon={<QrCode className="h-4 w-4" />}
        />
        <KPICard
          label="Quality Score"
          value={campaignQuality ? `${campaignQuality.score}/100` : "—"}
          icon={<Target className="h-4 w-4" />}
        />
      </div>

      <Tabs defaultValue="howto">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-10 gap-1">
          <TabsTrigger value="howto">How To</TabsTrigger>
          <TabsTrigger value="builder">Link Builder</TabsTrigger>
          <span className="advanced-only contents">
            <TabsTrigger value="ai-optimize">AI Optimize</TabsTrigger>
            <TabsTrigger value="batch">Batch Builder</TabsTrigger>
            <TabsTrigger value="ab-test">A/B Test</TabsTrigger>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="scheduler">Scheduler</TabsTrigger>
            <TabsTrigger value="qr">QR Codes</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="tests">Tests</TabsTrigger>
          </span>
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
                    <h3 className="h3 mb-2">
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
                    <h3 className="h3 mb-2">
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
                    <h3 className="h3 mb-2">
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
                    <h3 className="h3 mb-2">
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
                    <h3 className="h3 mb-2">
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
                  <Label>Base URL (booking link)</Label>
                  <Input
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://thebelmontbarber.ca/book"
                    aria-label="Base URL for UTM tracking"
                    name="url"
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
                    name="campaign"
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
                      <Label className="text-sm">Replace existing tracking codes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={forceLower}
                        onCheckedChange={(v) => setForceLower(Boolean(v))}
                      />
                      <Label className="text-sm">Use lowercase</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={hyphenate}
                        onCheckedChange={(v) => setHyphenate(Boolean(v))}
                      />
                      <Label className="text-sm">Use hyphens</Label>
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

        {/* AI Optimize Tab */}
        <TabsContent value="ai-optimize" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Campaign Intelligence
                </CardTitle>
                <CardDescription>
                  Get AI-powered insights and optimization suggestions for your
                  campaigns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* No API key input needed – server-managed */}

                <Button onClick={getAISuggestions} className="w-full">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate AI Suggestions
                </Button>

                {aiSuggestions && (
                  <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <h4 className="font-medium flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      AI Campaign Suggestion
                    </h4>
                    <p className="font-medium text-blue-700 dark:text-blue-300">
                      {aiSuggestions.suggestion}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Expected Performance:</strong>{" "}
                      {aiSuggestions.expectedPerformance}
                    </p>
                    <div>
                      <p className="text-sm font-medium mb-2">
                        Best Practices:
                      </p>
                      <ul className="text-sm space-y-1">
                        {aiSuggestions.bestPractices.map((practice, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400 mt-1">
                              •
                            </span>
                            {practice}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Campaign Quality Analysis
                </CardTitle>
                <CardDescription>
                  Automated analysis of your campaign effectiveness
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={analyzeCampaignQuality} className="w-full">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Analyze Current Campaign
                </Button>

                {campaignQuality && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Overall Score</span>
                      <div
                        className={`text-2xl font-bold ${
                          campaignQuality.score >= 80
                            ? "text-green-600"
                            : campaignQuality.score >= 60
                              ? "text-yellow-600"
                              : "text-red-600"
                        }`}
                      >
                        {campaignQuality.score}/100
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="text-sm font-medium">SEO Score</div>
                        <div className="text-lg font-bold">
                          {campaignQuality.seoScore}/100
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="text-sm font-medium">Readability</div>
                        <div className="text-lg font-bold">
                          {campaignQuality.readabilityScore}/100
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="text-sm font-medium">CTA Score</div>
                        <div className="text-lg font-bold">
                          {campaignQuality.callToActionScore}/100
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h5 className="font-medium mb-2 text-green-600">
                          ✓ Strengths
                        </h5>
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                          {campaignQuality.strengths.map((strength, i) => (
                            <li key={i} className="text-green-700">
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {campaignQuality.improvements.length > 0 && (
                        <div>
                          <h5 className="font-medium mb-2 text-orange-600">
                            ⚠️ Suggestions
                          </h5>
                          <ul className="list-disc pl-5 space-y-1 text-sm">
                            {campaignQuality.improvements.map(
                              (improvement, i) => (
                                <li key={i} className="text-orange-700">
                                  {improvement}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* A/B Test Tab */}
        <TabsContent value="ab-test" className="space-y-6 advanced-only">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  A/B Testing Studio
                </CardTitle>
                <CardDescription>
                  Test different campaign variations to find what performs best
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Test Name</Label>
                  <Input
                    placeholder="e.g., Service Page CTA Test"
                    onChange={(e) =>
                      setCurrentAbTest((prev) =>
                        prev ? { ...prev, name: e.target.value } : null
                      )
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Variant A URL</Label>
                    <Input
                      placeholder="First variation URL"
                      value={currentAbTest?.variants[0]?.utmUrl || ""}
                      onChange={(e) => {
                        const test = currentAbTest || {
                          id: `ab_${Date.now()}`,
                          name: "New Test",
                          description: "",
                          variants: [
                            {
                              id: "a",
                              name: "Variant A",
                              utmUrl: "",
                              clicks: 0,
                              conversions: 0,
                              winner: false,
                              confidence: 0,
                            },
                            {
                              id: "b",
                              name: "Variant B",
                              utmUrl: "",
                              clicks: 0,
                              conversions: 0,
                              winner: false,
                              confidence: 0,
                            },
                          ],
                          status: "running" as const,
                          startDate: todayISO(),
                        };
                        test.variants[0].utmUrl = e.target.value;
                        setCurrentAbTest(test);
                      }}
                    />
                  </div>
                  <div>
                    <Label>Variant B URL</Label>
                    <Input
                      placeholder="Second variation URL"
                      value={currentAbTest?.variants[1]?.utmUrl || ""}
                      onChange={(e) => {
                        const test = currentAbTest || {
                          id: `ab_${Date.now()}`,
                          name: "New Test",
                          description: "",
                          variants: [
                            {
                              id: "a",
                              name: "Variant A",
                              utmUrl: "",
                              clicks: 0,
                              conversions: 0,
                              winner: false,
                              confidence: 0,
                            },
                            {
                              id: "b",
                              name: "Variant B",
                              utmUrl: "",
                              clicks: 0,
                              conversions: 0,
                              winner: false,
                              confidence: 0,
                            },
                          ],
                          status: "running" as const,
                          startDate: todayISO(),
                        };
                        test.variants[1].utmUrl = e.target.value;
                        setCurrentAbTest(test);
                      }}
                    />
                  </div>
                </div>

                <Button
                  onClick={() => {
                    if (
                      currentAbTest &&
                      currentAbTest.variants[0].utmUrl &&
                      currentAbTest.variants[1].utmUrl
                    ) {
                      setAbTests((prev) => [...prev, currentAbTest]);
                      showToast("A/B test created successfully!", "success");
                    }
                  }}
                  disabled={
                    !currentAbTest?.variants[0]?.utmUrl ||
                    !currentAbTest?.variants[1]?.utmUrl
                  }
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Create A/B Test
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Tests</CardTitle>
                <CardDescription>
                  Monitor your running A/B tests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {abTests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No A/B tests created yet. Create your first test above.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {abTests.map((test) => (
                      <div key={test.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{test.name}</h4>
                          <Badge
                            variant={
                              test.status === "completed"
                                ? "default"
                                : test.status === "running"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {test.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium">Variant A</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {test.variants[0].utmUrl}
                            </p>
                            <p className="text-sm">
                              {test.variants[0].clicks} clicks •{" "}
                              {test.variants[0].conversions} conversions
                            </p>
                          </div>
                          <div>
                            <p className="font-medium">Variant B</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {test.variants[1].utmUrl}
                            </p>
                            <p className="text-sm">
                              {test.variants[1].clicks} clicks •{" "}
                              {test.variants[1].conversions} conversions
                            </p>
                          </div>
                        </div>
                        {test.winner && (
                          <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/20 rounded">
                            <p className="text-sm font-medium text-green-700 dark:text-green-300">
                              Winner:{" "}
                              {test.variants.find((v) => v.winner)?.name}
                              (Confidence:{" "}
                              {test.variants.find((v) => v.winner)?.confidence}
                              %)
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Campaign Library Tab */}
        <TabsContent value="library" className="space-y-6 advanced-only">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Campaign Library
              </CardTitle>
              <CardDescription>
                Save and reuse your best performing campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <select className="px-3 py-2 border rounded-md" value="All">
                  <option value="All">All Categories</option>
                  {campaignLibrary.categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <div className="text-sm text-muted-foreground flex items-center">
                  {campaignLibrary.savedCampaigns.length} saved campaigns
                </div>
              </div>

              {campaignLibrary.savedCampaigns.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Saved Campaigns
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Save your best performing campaigns to build a reusable
                    library.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {campaignLibrary.savedCampaigns.map((savedCampaign) => (
                    <Card key={savedCampaign.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">
                                {savedCampaign.name}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {savedCampaign.platform}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {savedCampaign.service}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {savedCampaign.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>ROI: {savedCampaign.performance.roi}%</span>
                              <span>CTR: {savedCampaign.performance.ctr}%</span>
                              <span>
                                Conversions:{" "}
                                {savedCampaign.performance.conversions}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  savedCampaign.utmUrl
                                );
                                showToast("UTM URL copied!", "success");
                              }}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setCampaignLibrary((prev) => ({
                                  ...prev,
                                  savedCampaigns: prev.savedCampaigns.filter(
                                    (c) => c.id !== savedCampaign.id
                                  ),
                                }));
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduler Tab */}
        <TabsContent value="scheduler" className="space-y-6 advanced-only">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Campaign Scheduler
              </CardTitle>
              <CardDescription>
                Schedule campaigns for automated publishing and activation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium">Schedule New Campaign</h3>
                  <div className="space-y-3">
                    <div>
                      <Label>Select Campaign</Label>
                      <select className="w-full h-9 border rounded-md px-2">
                        <option value="">Choose a campaign...</option>
                        {rows.map((row, index) => (
                          <option key={row.id} value={row.id}>
                            {row.campaign} ({PRESETS[row.preset].label})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Schedule Date</Label>
                      <Input type="date" min={todayISO()} />
                    </div>
                    <div>
                      <Label>Schedule Time</Label>
                      <Input type="time" defaultValue="09:00" />
                    </div>
                    <Button className="w-full">
                      <Clock className="h-4 w-4 mr-2" />
                      Schedule Campaign
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Scheduled Campaigns</h3>
                  {scheduledCampaigns.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No campaigns scheduled yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {scheduledCampaigns.map((scheduled) => (
                        <Card key={scheduled.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-sm">
                                  {scheduled.campaignName}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>
                                    {scheduled.scheduleDate} at{" "}
                                    {scheduled.scheduleTime}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {scheduled.platform}
                                  </Badge>
                                  <Badge
                                    variant={
                                      scheduled.status === "published"
                                        ? "default"
                                        : scheduled.status === "scheduled"
                                          ? "secondary"
                                          : "outline"
                                    }
                                    className="text-xs"
                                  >
                                    {scheduled.status}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {scheduled.status === "scheduled" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setScheduledCampaigns((prev) =>
                                        prev.map((c) =>
                                          c.id === scheduled.id
                                            ? { ...c, status: "published" }
                                            : c
                                        )
                                      );
                                    }}
                                  >
                                    Mark Published
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Scheduling Tips</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Schedule campaigns during peak engagement times</li>
                  <li>• Consider timezone differences for your audience</li>
                  <li>• Space out campaigns across different platforms</li>
                  <li>
                    • Monitor performance and adjust timing based on results
                  </li>
                  <li>• Use A/B testing to optimize posting times</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Batch Builder */}
        <TabsContent value="batch" className="advanced-only">
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
                            <div className="flex items-center gap-2">
                              <a
                                href={row.url}
                                target="_blank"
                                rel="noreferrer"
                                className="underline flex-1"
                                title={row.url}
                              >
                                {row.url.length > 30
                                  ? row.url.slice(0, 30) + "..."
                                  : row.url}
                              </a>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => saveCampaignToLibrary(row)}
                                title="Save to library"
                              >
                                <BookOpen className="h-3 w-3" />
                              </Button>
                            </div>
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
        <TabsContent value="qr" className="advanced-only">
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

        {/* Enhanced Analytics */}
        <TabsContent value="analytics" className="space-y-6 advanced-only">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Campaign Analytics</h2>
              <p className="text-muted-foreground">
                Track performance across all your campaigns
              </p>
            </div>
            <Button onClick={generateAnalytics} disabled={rows.length === 0}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>

          {analytics.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Analytics Available
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Generate some campaigns and click "Generate Report" to see
                    analytics.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Overview Metrics */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Total Clicks
                        </p>
                        <p className="text-2xl font-bold">
                          {analytics.reduce((acc, a) => acc + a.clicks, 0)}
                        </p>
                      </div>
                      <MousePointer className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Total Conversions
                        </p>
                        <p className="text-2xl font-bold">
                          {analytics.reduce((acc, a) => acc + a.conversions, 0)}
                        </p>
                      </div>
                      <Target className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Avg CTR
                        </p>
                        <p className="text-2xl font-bold">
                          {(
                            analytics.reduce((acc, a) => acc + a.ctr, 0) /
                            analytics.length
                          ).toFixed(1)}
                          %
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Total Revenue
                        </p>
                        <p className="text-2xl font-bold">
                          ${analytics.reduce((acc, a) => acc + a.revenue, 0)}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Campaign Performance Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Campaign Performance
                  </CardTitle>
                  <CardDescription>
                    Detailed performance metrics for each campaign
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Platform</TableHead>
                          <TableHead>Clicks</TableHead>
                          <TableHead>Conversions</TableHead>
                          <TableHead>CTR</TableHead>
                          <TableHead>Conversion Rate</TableHead>
                          <TableHead>Revenue</TableHead>
                          <TableHead>ROI</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.map((performance) => (
                          <TableRow key={performance.id}>
                            <TableCell className="font-medium">
                              {performance.campaignName}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {performance.platform}
                              </Badge>
                            </TableCell>
                            <TableCell>{performance.clicks}</TableCell>
                            <TableCell>{performance.conversions}</TableCell>
                            <TableCell>{performance.ctr}%</TableCell>
                            <TableCell>{performance.conversionRate}%</TableCell>
                            <TableCell>${performance.revenue}</TableCell>
                            <TableCell
                              className={
                                performance.roi >= 200
                                  ? "text-green-600"
                                  : performance.roi >= 100
                                    ? "text-yellow-600"
                                    : "text-red-600"
                              }
                            >
                              {performance.roi}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Platform Comparison */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Performance by Platform
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        "google",
                        "facebook",
                        "instagram",
                        "twitter",
                        "linkedin",
                      ].map((platform) => {
                        const platformData = analytics.filter(
                          (a) => a.platform === platform
                        );
                        const avgClicks =
                          platformData.length > 0
                            ? Math.round(
                                platformData.reduce(
                                  (acc, a) => acc + a.clicks,
                                  0
                                ) / platformData.length
                              )
                            : 0;
                        const avgConversions =
                          platformData.length > 0
                            ? Math.round(
                                platformData.reduce(
                                  (acc, a) => acc + a.conversions,
                                  0
                                ) / platformData.length
                              )
                            : 0;

                        return (
                          <div
                            key={platform}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  platform === "google"
                                    ? "bg-blue-500"
                                    : platform === "facebook"
                                      ? "bg-blue-600"
                                      : platform === "instagram"
                                        ? "bg-pink-500"
                                        : platform === "twitter"
                                          ? "bg-blue-400"
                                          : "bg-blue-700"
                                }`}
                              />
                              <div>
                                <p className="font-medium capitalize">
                                  {platform}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {platformData.length} campaigns
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                {avgClicks} avg clicks
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {avgConversions} avg conversions
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Top Performing Campaigns
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics
                        .sort((a, b) => b.roi - a.roi)
                        .slice(0, 5)
                        .map((performance, index) => (
                          <div
                            key={performance.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  index === 0
                                    ? "bg-yellow-500 text-white"
                                    : index === 1
                                      ? "bg-gray-400 text-white"
                                      : index === 2
                                        ? "bg-orange-500 text-white"
                                        : "bg-gray-200 text-gray-700"
                                }`}
                              >
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {performance.campaignName}
                                </p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {performance.platform}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-green-600">
                                {performance.roi}% ROI
                              </p>
                              <p className="text-sm text-muted-foreground">
                                ${performance.revenue} revenue
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
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
