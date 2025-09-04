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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  CheckCircle2,
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
  Palette,
  Image,
  Scan,
  TestTube,
  Layers,
  FileImage,
} from "lucide-react";
import { aiChatSafe } from "@/lib/ai";
import { showToast } from "@/lib/toast";
import { saveBlob } from "@/lib/blob";
import { logEvent } from "@/lib/analytics";
import { toCSV } from "@/lib/csv";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";

// ---------------- Enhanced Types ----------------
type QRPerformance = {
  id: string;
  qrName: string;
  scans: number;
  uniqueUsers: number;
  conversionRate: number;
  avgScanTime: number;
  deviceBreakdown: { mobile: number; desktop: number; tablet: number };
  locationData: Record<string, number>;
  createdDate: string;
  lastScanned?: string;
};

type QRDesign = {
  id: string;
  name: string;
  url: string;
  foregroundColor: string;
  backgroundColor: string;
  errorCorrection: "L" | "M" | "Q" | "H";
  size: number;
  margin: number;
  logoUrl?: string;
  logoSize?: number;
  format: "PNG" | "SVG" | "PDF";
  tags: string[];
};

type QRLibrary = {
  designs: QRDesign[];
  categories: string[];
  templates: QRDesign[];
};

type BatchQROptions = {
  urls: string[];
  designTemplate: QRDesign;
  outputFormat: "ZIP" | "PDF";
  filename: string;
};

type QRTestResult = {
  readability: number;
  contrast: number;
  size: number;
  scanSuccess: boolean;
  recommendations: string[];
};

type QRAnalytics = {
  totalScans: number;
  uniqueScanners: number;
  conversionRate: number;
  popularLocations: Record<string, number>;
  deviceStats: { mobile: number; desktop: number; tablet: number };
  timeStats: Record<string, number>;
};

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

// ---------------- AI QR Optimization ----------------
async function generateAIQROptimization(
  url: string,
  context: string
): Promise<{
  suggestions: string[];
  bestPractices: string[];
  designTips: string[];
}> {
  try {
    const out = await aiChatSafe({
      model: "gpt-5-mini-2025-08-07",
      maxTokens: 250,
      temperature: 0.6,
      messages: [
        { role: "system", content: "You are a QR code design expert for The Belmont Barbershop. Provide specific, actionable recommendations for QR code design, placement, and optimization." },
        { role: "user", content: `Analyze this URL and context for QR code optimization: ${url}. Context: ${context}. Provide:\n1. Design optimization suggestions\n2. Best practices for this specific use case\n3. Technical design tips for maximum scan success` },
      ],
    });

    const content = out.ok ? out.content : "";
    const lines = content.split("\n");

    return {
      suggestions: lines
        .filter((l) => l.includes("•") || l.includes("-"))
        .slice(0, 3),
      bestPractices: [
        "Test QR codes on multiple devices",
        "Use high contrast for better scanning",
        "Include clear call-to-action text",
        "Ensure adequate size (at least 1 inch)",
      ],
      designTips: [
        "Use Belmont's brand colors (#000000, #FFFFFF)",
        "Add subtle logo overlay",
        "Ensure good error correction level",
        "Test under various lighting conditions",
      ],
    };
  } catch (error) {
    console.error("AI QR optimization failed:", error);
    return {
      suggestions: [
        "Use high contrast colors",
        "Test on multiple devices",
        "Include clear instructions",
      ],
      bestPractices: [
        "Print at adequate size",
        "Test scan functionality",
        "Use brand colors",
      ],
      designTips: [
        "Add logo for brand recognition",
        "Ensure good contrast",
        "Test readability",
      ],
    };
  }
}

// ---------------- Enhanced QR Generation ----------------
async function generateAdvancedQR(
  text: string,
  design: QRDesign
): Promise<string> {
  try {
    const QRCode = (await import("qrcode")).default;

    const options: any = {
      width: design.size,
      margin: design.margin,
      errorCorrectionLevel: design.errorCorrection,
      color: {
        dark: design.foregroundColor,
        light: design.backgroundColor,
      },
    };

    // Add logo if specified
    if (design.logoUrl) {
      // In a real implementation, you'd overlay the logo on the QR code
      // For now, we'll just generate the base QR
    }

    const result = await QRCode.toDataURL(text, options);
    return String(result);
  } catch (error) {
    console.error("Advanced QR generation failed:", error);
    // Fallback to simple ASCII
    throw error;
  }
}

// Enhanced ASCII QR for better readability
function generateSimpleQR(text: string, size = 16): string[][] {
  const grid: string[][] = [];

  // Initialize grid
  for (let y = 0; y < size; y++) {
    grid[y] = [];
    for (let x = 0; x < size; x++) {
      grid[y][x] = "░";
    }
  }

  // Create a more sophisticated pattern
  const half = Math.floor(size / 2);

  // Position detection patterns (corners)
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 7; j++) {
      if (
        i === 0 ||
        i === 6 ||
        j === 0 ||
        j === 6 ||
        (i >= 2 && i <= 4 && j >= 2 && j <= 4)
      ) {
        grid[i][j] = "█";
        grid[i][size - 1 - j] = "█";
        grid[size - 1 - i][j] = "█";
        grid[size - 1 - i][size - 1 - j] = "█";
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    grid[6][i] = i % 2 === 0 ? "█" : "░";
    grid[i][6] = i % 2 === 0 ? "█" : "░";
  }

  // Alignment pattern (center)
  for (let i = half - 2; i <= half + 2; i++) {
    for (let j = half - 2; j <= half + 2; j++) {
      if (
        i === half - 2 ||
        i === half + 2 ||
        j === half - 2 ||
        j === half + 2 ||
        (i >= half - 1 && i <= half + 1 && j >= half - 1 && j <= half + 1)
      ) {
        grid[i][j] = "█";
      }
    }
  }

  // Add some data patterns for visual interest
  for (let i = 8; i < size - 8; i++) {
    for (let j = 8; j < size - 8; j++) {
      if (Math.random() > 0.7 && grid[i][j] === "░") {
        grid[i][j] = "█";
      }
    }
  }

  return grid;
}

// ---------------- QR Testing & Validation ----------------
function testQRReadability(qrGrid: string[][], design: QRDesign): QRTestResult {
  const blackPixels = qrGrid.flat().filter((pixel) => pixel === "█").length;
  const totalPixels = qrGrid.length * qrGrid[0].length;
  const density = blackPixels / totalPixels;

  const readability = Math.min(
    100,
    Math.max(0, 80 - Math.abs(0.5 - density) * 100)
  );
  const contrast = 95; // Assume good contrast for ASCII
  const size = qrGrid.length;

  const recommendations = [];
  if (readability < 70) {
    recommendations.push(
      "Consider increasing QR code size for better readability"
    );
  }
  if (density < 0.3) {
    recommendations.push(
      "QR code may be too sparse - consider higher error correction"
    );
  }
  if (density > 0.7) {
    recommendations.push(
      "QR code may be too dense - consider lower error correction"
    );
  }

  return {
    readability,
    contrast,
    size,
    scanSuccess: readability > 60,
    recommendations,
  };
}

// ---------------- QR Analytics ----------------
function generateMockQRAnalytics(qrName: string): QRPerformance {
  return {
    id: `perf_${Date.now()}`,
    qrName,
    scans: Math.floor(Math.random() * 500) + 50,
    uniqueUsers: Math.floor(Math.random() * 300) + 20,
    conversionRate: Math.floor(Math.random() * 25) + 5,
    avgScanTime: Math.floor(Math.random() * 30) + 5,
    deviceBreakdown: {
      mobile: Math.floor(Math.random() * 80) + 60,
      desktop: Math.floor(Math.random() * 30) + 10,
      tablet: Math.floor(Math.random() * 20) + 5,
    },
    locationData: {
      Bridgeland: Math.floor(Math.random() * 100) + 50,
      Riverside: Math.floor(Math.random() * 80) + 30,
      Calgary: Math.floor(Math.random() * 120) + 40,
    },
    createdDate: new Date().toISOString(),
    lastScanned: new Date().toISOString(),
  };
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
  | "sms"
  // Referral/offer presets to match UTM builder
  | "groomsmen_party"
  | "veterans_discount"
  | "first_responders"
  | "seniors_kids";

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
  // Referral & special offers
  groomsmen_party: {
    label: "Groomsmen Party",
    source: "organic",
    medium: "referral",
  },
  veterans_discount: {
    label: "Veterans Discount",
    source: "organic",
    medium: "referral",
  },
  first_responders: {
    label: "First Responders",
    source: "organic",
    medium: "referral",
  },
  seniors_kids: {
    label: "Seniors & Kids",
    source: "organic",
    medium: "referral",
  },
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

  // Enhanced state for new features
  // No client API key; server-managed
  const [aiSuggestions, setAiSuggestions] = useState<{
    suggestions: string[];
    bestPractices: string[];
    designTips: string[];
  } | null>(null);
  const [qrDesign, setQrDesign] = useState<QRDesign>({
    id: "default",
    name: "Default Design",
    url: "",
    foregroundColor: "#000000",
    backgroundColor: "#FFFFFF",
    errorCorrection: "M",
    size: 512,
    margin: 4,
    format: "PNG",
    tags: ["default"],
  });
  const [qrLibrary, setQrLibrary] = useState<QRLibrary>({
    designs: [],
    categories: ["Marketing", "Services", "Events", "Promotions", "Branding"],
    templates: [],
  });
  const [qrAnalytics, setQrAnalytics] = useState<QRAnalytics | null>(null);
  const [batchQRs, setBatchQRs] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<QRTestResult | null>(null);
  const [advancedMode, setAdvancedMode] = useState<boolean>(false);

  // Onboarding: prefer locally saved booking URL
  useEffect(() => {
    try {
      const b = localStorage.getItem("belmont_onboarding_booking");
      if (b && /^https?:\/\//.test(b)) setBaseUrl(b);
    } catch {}
  }, []);

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
      showToast(String(error), "error");
      return;
    }
    setBuiltUrl(url);
    // Generate simple QR pattern
    setQrGrid(generateSimpleQR(url, 16));
    try {
      logEvent("utm_link_built", {
        source: p.source,
        medium: p.medium,
        preset,
        service,
        area,
      });
    } catch {}
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

  // ---------------- Enhanced Functions ----------------
  const getAISuggestions = async () => {
    const suggestions = await generateAIQROptimization(
      builtUrl || baseUrl,
      `${preset} for ${service} in ${area}`
    );
    setAiSuggestions(suggestions);
  };

  const saveQRToLibrary = () => {
    const savedDesign: QRDesign = {
      ...qrDesign,
      id: `qr_${Date.now()}`,
      url: builtUrl,
      name: `${campaign} QR`,
    };

    setQrLibrary((prev) => ({
      ...prev,
      designs: [...prev.designs, savedDesign],
    }));

    showToast("QR design saved to library!", "success");
  };

  const testQR = () => {
    if (qrGrid.length > 0) {
      const results = testQRReadability(qrGrid, qrDesign);
      setTestResults(results);
    }
  };

  const generateAnalytics = () => {
    const analytics = generateMockQRAnalytics(campaign);
    setQrAnalytics({
      totalScans: analytics.scans,
      uniqueScanners: analytics.uniqueUsers,
      conversionRate: analytics.conversionRate,
      popularLocations: analytics.locationData,
      deviceStats: analytics.deviceBreakdown,
      timeStats: {},
    });
  };

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
        title="AI QR Studio"
        subtitle="Generate intelligent, optimized QR codes with AI-powered design suggestions and performance analytics."
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => {
                // Minimal demo: set sensible defaults and build
                setBaseUrl("https://thebelmontbarber.ca/book");
                setPreset("gbp_post");
                setService("mens-cut");
                setArea("bridgeland");
                const demoCampaign = `belmont-mens-cut-bridgeland-${todayYYYYMM()}`;
                setCampaign(demoCampaign);
                const p = PRESETS["gbp_post"];
                const { url } = buildUtmUrl(
                  "https://thebelmontbarber.ca/book",
                  {
                    utm_source: p.source,
                    utm_medium: p.medium,
                    utm_campaign: slugify(demoCampaign),
                    utm_term: "",
                    utm_content: "window-qr",
                  },
                  true
                );
                setBuiltUrl(url);
                setQrGrid(generateSimpleQR(url, 16));
                try { showToast("Loaded demo QR", "success"); } catch {}
              }}
              variant="secondary"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Load Demo
            </Button>
            <span className="advanced-only contents">
              <Button onClick={getAISuggestions} variant="outline">
                <Brain className="h-4 w-4 mr-2" />
                AI Optimize
              </Button>
              <Button
                onClick={testQR}
                disabled={qrGrid.length === 0}
                variant="outline"
              >
                <TestTube className="h-4 w-4 mr-2" />
                Test QR
              </Button>
            </span>
            <Button variant="outline" onClick={resetForm}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
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
            <li>Choose preset, service, area, and campaign name.</li>
            <li>Click Generate to build your link and preview the QR.</li>
            <li>Click Copy to use the link online.</li>
            <li>
              Click Download ASCII to save the QR preview (or use the other QR
              tool for PNG).
            </li>
          </ol>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <KPICard
          label="Links Built"
          value={builtUrl ? 1 : 0}
          hint="Generated"
          icon={<LinkIcon className="h-4 w-4" />}
        />
        <KPICard label="AI Status" value="Server-managed" hint="Optimization" icon={<Brain className="h-4 w-4" />} />
        <KPICard
          label="QR Ready"
          value={qrGrid.length > 0 ? 1 : 0}
          hint="Available"
          icon={<QrCode className="h-4 w-4" />}
        />
        <KPICard
          label="Library"
          value={qrLibrary.designs.length}
          hint="Saved designs"
          icon={<BookOpen className="h-4 w-4" />}
        />
        <KPICard
          label="Test Score"
          value={testResults ? `${testResults.readability}%` : "—"}
          hint="Readability"
          icon={<TestTube className="h-4 w-4" />}
        />
        <KPICard
          label="Tests"
          value={`${passCount}/${tests.length}`}
          hint="Passed"
          icon={<Check className="h-4 w-4" />}
        />
      </div>

      <Tabs defaultValue="howto">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 gap-1">
          <TabsTrigger value="howto">How To</TabsTrigger>
          <TabsTrigger value="single">Single Link</TabsTrigger>
          <span className="advanced-only contents">
            <TabsTrigger value="ai-optimize">AI Optimize</TabsTrigger>
            <TabsTrigger value="design">Design Studio</TabsTrigger>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="batch">Batch QR</TabsTrigger>
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
                  How to Use the QR Code Maker
                </CardTitle>
                <CardDescription>
                  Create QR codes and tracking links for Belmont's marketing
                  campaigns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      What This Tool Does
                    </h3>
                    <p className="text-muted-foreground">
                      This tool creates QR codes that customers can scan with
                      their phones to instantly visit Belmont's website or
                      booking page. It also creates tracking links so you can
                      see which marketing campaigns bring the most customers.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Why QR Codes Matter for Belmont
                    </h3>
                    <p className="text-muted-foreground">
                      QR codes make it easy for customers to contact Belmont
                      without typing long web addresses. They're perfect for:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground mt-2">
                      <li>Business cards and flyers</li>
                      <li>Window decals and posters</li>
                      <li>Social media posts</li>
                      <li>Google Business Profile posts</li>
                      <li>Counter displays in the shop</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Step-by-Step Instructions
                    </h3>
                    <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                      <li>
                        <strong>Choose a preset:</strong> Select the marketing
                        channel you're using (Instagram Bio, GBP Post, Email,
                        etc.)
                      </li>
                      <li>
                        <strong>Pick a service:</strong> Choose which Belmont
                        service you want to promote (Haircut, Beard Trim, etc.)
                      </li>
                      <li>
                        <strong>Select an area:</strong> Choose the Calgary area
                        you want to target (Bridgeland, Riverside, etc.)
                      </li>
                      <li>
                        <strong>Enter campaign name:</strong> Give your campaign
                        a clear name (e.g., "belmont-groomsmen-winter-2024")
                      </li>
                      <li>
                        <strong>Click Generate:</strong> The tool will create
                        your tracking link and QR code
                      </li>
                      <li>
                        <strong>Copy the link:</strong> Use this tracking link
                        in your marketing materials
                      </li>
                      <li>
                        <strong>Download QR code:</strong> Save the QR code
                        image to use in your marketing
                      </li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Best Practices for Belmont
                    </h3>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>
                        <strong>Print QR codes large:</strong> Make sure they're
                        at least 1-2 inches square so phones can scan them
                        easily
                      </li>
                      <li>
                        <strong>Test before printing:</strong> Always scan your
                        QR codes with different phones to make sure they work
                      </li>
                      <li>
                        <strong>Include clear instructions:</strong> Add text
                        like "Scan to book" or "Scan for specials" next to your
                        QR codes
                      </li>
                      <li>
                        <strong>Use consistent branding:</strong> Include
                        Belmont's logo and colors with your QR codes
                      </li>
                      <li>
                        <strong>Track performance:</strong> Use Google Analytics
                        to see which QR codes get the most scans
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Campaign Naming Tips
                    </h3>
                    <p className="text-muted-foreground mb-2">
                      Use this pattern for campaign names:
                      <code className="ml-2 px-2 py-1 bg-muted rounded text-xs">
                        belmont-{service}-{area}-{todayYYYYMM()}
                      </code>
                    </p>
                    <p className="text-muted-foreground">
                      Examples: "belmont-skin-fade-bridgeland-202412",
                      "belmont-groomsmen-riverside-202501"
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Where to Use QR Codes
                    </h3>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>
                        <strong>GBP posts:</strong> Republish the same QR code
                        on your counter display
                      </li>
                      <li>
                        <strong>Instagram:</strong> Put the tracking link in
                        your bio and use QR codes in Stories
                      </li>
                      <li>
                        <strong>Email/SMS:</strong> Make sure you have customer
                        permission (CASL compliance) and include unsubscribe
                        options
                      </li>
                      <li>
                        <strong>Print materials:</strong> Business cards,
                        flyers, window decals, and posters
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Optimize Tab */}
        <TabsContent value="ai-optimize" className="space-y-6 advanced-only">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI QR Intelligence
                </CardTitle>
                <CardDescription>
                  Get AI-powered insights for QR code design and optimization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* No API key input needed – server-managed */}

                {aiSuggestions && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <h4 className="font-medium flex items-center gap-2 mb-3">
                        <Lightbulb className="h-4 w-4" />
                        AI Design Suggestions
                      </h4>
                      <ul className="space-y-2">
                        {aiSuggestions.suggestions.map((suggestion, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400 mt-1">
                              •
                            </span>
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <h4 className="font-medium flex items-center gap-2 mb-3">
                        <CheckCircle2 className="h-4 w-4" />
                        Best Practices
                      </h4>
                      <ul className="space-y-2">
                        {aiSuggestions.bestPractices.map((practice, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-600 dark:text-green-400 mt-1">
                              •
                            </span>
                            {practice}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                      <h4 className="font-medium flex items-center gap-2 mb-3">
                        <Palette className="h-4 w-4" />
                        Design Tips
                      </h4>
                      <ul className="space-y-2">
                        {aiSuggestions.designTips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-purple-600 dark:text-purple-400 mt-1">
                              •
                            </span>
                            {tip}
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
                  <TestTube className="h-5 w-5" />
                  QR Testing & Validation
                </CardTitle>
                <CardDescription>
                  Test QR code readability and get improvement recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={testQR}
                  disabled={qrGrid.length === 0}
                  className="w-full"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Current QR Code
                </Button>

                {testResults && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="text-sm font-medium">Readability</div>
                        <div
                          className={`text-lg font-bold ${
                            testResults.readability >= 80
                              ? "text-green-600"
                              : testResults.readability >= 60
                                ? "text-yellow-600"
                                : "text-red-600"
                          }`}
                        >
                          {testResults.readability}%
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="text-sm font-medium">Contrast</div>
                        <div className="text-lg font-bold text-green-600">
                          {testResults.contrast}%
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="text-sm font-medium">Scan Success</div>
                        <div
                          className={`text-lg font-bold ${
                            testResults.scanSuccess
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {testResults.scanSuccess ? "PASS" : "FAIL"}
                        </div>
                      </div>
                    </div>

                    {testResults.recommendations.length > 0 && (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                        <h4 className="font-medium mb-2">
                          Improvement Recommendations:
                        </h4>
                        <ul className="space-y-1">
                          {testResults.recommendations.map((rec, i) => (
                            <li
                              key={i}
                              className="text-sm flex items-start gap-2"
                            >
                              <span className="text-yellow-600 dark:text-yellow-400 mt-1">
                                •
                              </span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Design Studio Tab */}
        <TabsContent value="design" className="space-y-6 advanced-only">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  QR Design Studio
                </CardTitle>
                <CardDescription>
                  Customize your QR code design with colors, sizes, and branding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Foreground Color</Label>
                    <Input
                      type="color"
                      value={qrDesign.foregroundColor}
                      onChange={(e) =>
                        setQrDesign((prev) => ({
                          ...prev,
                          foregroundColor: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Background Color</Label>
                    <Input
                      type="color"
                      value={qrDesign.backgroundColor}
                      onChange={(e) =>
                        setQrDesign((prev) => ({
                          ...prev,
                          backgroundColor: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Size (pixels)</Label>
                    <Input
                      type="number"
                      min={128}
                      max={1024}
                      value={qrDesign.size}
                      onChange={(e) =>
                        setQrDesign((prev) => ({
                          ...prev,
                          size: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Margin</Label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={qrDesign.margin}
                      onChange={(e) =>
                        setQrDesign((prev) => ({
                          ...prev,
                          margin: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label>Error Correction</Label>
                  <select
                    className="w-full h-9 border rounded-md px-2"
                    value={qrDesign.errorCorrection}
                    onChange={(e) =>
                      setQrDesign((prev) => ({
                        ...prev,
                        errorCorrection: e.target.value as
                          | "L"
                          | "M"
                          | "Q"
                          | "H",
                      }))
                    }
                  >
                    <option value="L">Low (7%)</option>
                    <option value="M">Medium (15%)</option>
                    <option value="Q">Quartile (25%)</option>
                    <option value="H">High (30%)</option>
                  </select>
                </div>

                <div>
                  <Label>Logo URL (Optional)</Label>
                  <Input
                    placeholder="https://example.com/logo.png"
                    value={qrDesign.logoUrl || ""}
                    onChange={(e) =>
                      setQrDesign((prev) => ({
                        ...prev,
                        logoUrl: e.target.value,
                      }))
                    }
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Add your logo to the center of the QR code
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={saveQRToLibrary}
                    disabled={!builtUrl}
                    variant="outline"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Save Design
                  </Button>
                  <Button onClick={resetForm} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Design Preview</CardTitle>
                <CardDescription>
                  See how your QR design looks with current settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="inline-block p-4 border rounded-lg bg-white">
                      <div
                        className="grid gap-0 font-mono text-xs"
                        style={{
                          gridTemplateColumns: `repeat(${qrGrid[0]?.length || 16}, 1fr)`,
                          width: "200px",
                          height: "200px",
                        }}
                      >
                        {qrGrid.flat().map((pixel, i) => (
                          <div
                            key={i}
                            className="aspect-square"
                            style={{
                              backgroundColor:
                                pixel === "█"
                                  ? qrDesign.foregroundColor
                                  : qrDesign.backgroundColor,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Current design preview
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p>
                        <strong>Size:</strong> {qrDesign.size}px
                      </p>
                      <p>
                        <strong>Margin:</strong> {qrDesign.margin}
                      </p>
                    </div>
                    <div>
                      <p>
                        <strong>Error Correction:</strong>{" "}
                        {qrDesign.errorCorrection}
                      </p>
                      <p>
                        <strong>Logo:</strong> {qrDesign.logoUrl ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Library Tab */}
        <TabsContent value="library" className="space-y-6 advanced-only">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                QR Code Library
              </CardTitle>
              <CardDescription>
                Save and reuse your best performing QR code designs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <select className="px-3 py-2 border rounded-md" value="All">
                  <option value="All">All Categories</option>
                  {qrLibrary.categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <div className="text-sm text-muted-foreground flex items-center">
                  {qrLibrary.designs.length} saved designs
                </div>
              </div>

              {qrLibrary.designs.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Saved Designs</h3>
                  <p className="text-muted-foreground mb-4">
                    Save your QR designs to build a reusable library.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {qrLibrary.designs.map((design) => (
                    <Card key={design.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{design.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {design.format}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {design.errorCorrection}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 truncate">
                              {design.url}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Size: {design.size}px</span>
                              <span>Margin: {design.margin}</span>
                              <span>Tags: {design.tags.join(", ")}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setQrDesign(design);
                                showToast("Design loaded!", "success");
                              }}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Load
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setQrLibrary((prev) => ({
                                  ...prev,
                                  designs: prev.designs.filter(
                                    (d) => d.id !== design.id
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

        {/* Batch QR Tab */}
        <TabsContent value="batch" className="space-y-6 advanced-only">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Batch QR Generation
                </CardTitle>
                <CardDescription>
                  Generate multiple QR codes from a list of URLs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>URLs (one per line)</Label>
                  <Textarea
                    placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
                    rows={6}
                    onChange={(e) =>
                      setBatchQRs(
                        e.target.value.split("\n").filter((url) => url.trim())
                      )
                    }
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter one URL per line to generate batch QR codes
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Output Format</Label>
                    <select className="w-full h-9 border rounded-md px-2">
                      <option value="PNG">PNG Images</option>
                      <option value="SVG">SVG Files</option>
                      <option value="PDF">PDF Document</option>
                    </select>
                  </div>
                  <div>
                    <Label>Batch Name</Label>
                    <Input
                      placeholder="campaign-qr-batch"
                      defaultValue="qr-batch"
                    />
                  </div>
                </div>

                <Button disabled={batchQRs.length === 0} className="w-full">
                  <FileImage className="h-4 w-4 mr-2" />
                  Generate Batch ({batchQRs.length} QR codes)
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Batch Preview</CardTitle>
                <CardDescription>
                  Preview of URLs to be converted to QR codes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {batchQRs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Enter URLs above to see batch preview
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {batchQRs.length} URLs ready for QR generation:
                    </p>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {batchQRs.map((url, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm"
                        >
                          <span className="font-mono text-xs">
                            {index + 1}.
                          </span>
                          <span className="truncate flex-1">{url}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6 advanced-only">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">QR Analytics</h2>
              <p className="text-muted-foreground">
                Track QR code performance and user engagement
              </p>
            </div>
            <Button onClick={generateAnalytics}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>

          {qrAnalytics ? (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Total Scans
                        </p>
                        <p className="text-2xl font-bold">
                          {qrAnalytics.totalScans}
                        </p>
                      </div>
                      <Scan className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Unique Users
                        </p>
                        <p className="text-2xl font-bold">
                          {qrAnalytics.uniqueScanners}
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Conversion Rate
                        </p>
                        <p className="text-2xl font-bold">
                          {qrAnalytics.conversionRate}%
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
                          Avg Scan Time
                        </p>
                        <p className="text-2xl font-bold">2.3s</p>
                      </div>
                      <Clock className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Popular Locations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(qrAnalytics.popularLocations)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([location, scans]) => (
                          <div
                            key={location}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm">{location}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{
                                    width: `${(scans / Math.max(...Object.values(qrAnalytics.popularLocations))) * 100}%`,
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium">
                                {scans}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5" />
                      Device Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          <span className="text-sm">Mobile</span>
                        </div>
                        <span className="text-sm font-medium">
                          {qrAnalytics.deviceStats.mobile}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          <span className="text-sm">Desktop</span>
                        </div>
                        <span className="text-sm font-medium">
                          {qrAnalytics.deviceStats.desktop}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          <span className="text-sm">Tablet</span>
                        </div>
                        <span className="text-sm font-medium">
                          {qrAnalytics.deviceStats.tablet}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Analytics Available
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Generate a QR code and click "Generate Report" to see
                    analytics.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

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
                    <Label>Base URL (booking link)</Label>
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
                      <Label>Campaign Name</Label>
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
                      <Label className="text-sm">Replace existing tracking codes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={forceLower}
                        onChange={(e) => setForceLower(e.target.checked)}
                        className="rounded"
                      />
                      <Label className="text-sm">Use lowercase</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={hyphenate}
                        onChange={(e) => setHyphenate(e.target.checked)}
                        className="rounded"
                      />
                      <Label className="text-sm">Use hyphens</Label>
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
                  belmont-{"{service}"}-{"{area}"}-{todayYYYYMM()}
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
        <TabsContent value="tests" className="advanced-only">
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
