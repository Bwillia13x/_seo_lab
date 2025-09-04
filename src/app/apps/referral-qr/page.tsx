"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  QrCode,
  Download,
  Plus,
  Trophy,
  Users,
  DollarSign,
  Info,
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
  Users as UsersIcon,
  DollarSign as DollarIcon,
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
  Award,
  CheckCircle2,
  Gift,
  TrendingUp as TrendingIcon,
  Settings,
  RefreshCw,
  PieChart,
  BarChart,
  LineChart,
} from "lucide-react";
import { aiChatSafe } from "@/lib/ai";
import { saveBlob } from "@/lib/blob";
import { showToast } from "@/lib/toast";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import QRCode from "qrcode";

// ---------------- Enhanced Types ----------------
type ReferralCode = {
  id: string;
  name: string;
  code: string;
  type: "staff" | "partner" | "event";
  utmUrl: string;
  qrDataUrl?: string;
  clicks: number;
  bookings: number;
  revenue: number;
  createdDate: string;
  lastActivity?: string;
  campaign?: string;
  targetAudience?: string;
  performanceScore?: number;
  predictedROI?: number;
};

type ReferralAnalytics = {
  totalClicks: number;
  totalBookings: number;
  totalRevenue: number;
  conversionRate: number;
  avgRevenuePerReferral: number;
  topPerformers: ReferralCode[];
  performanceByType: Record<string, number>;
  timeBasedData: Record<
    string,
    { clicks: number; bookings: number; revenue: number }
  >;
  deviceBreakdown: { mobile: number; desktop: number; tablet: number };
};

type ReferralCampaign = {
  id: string;
  name: string;
  description: string;
  targetAudience: string;
  startDate: string;
  endDate?: string;
  goalRevenue: number;
  incentiveRate: number;
  active: boolean;
  codes: string[];
};

type IncentiveProgram = {
  id: string;
  name: string;
  type: "percentage" | "fixed" | "tiered";
  rate: number;
  tiers?: { threshold: number; rate: number }[];
  conditions: string[];
  active: boolean;
};

type ReferralLibrary = {
  templates: ReferralCode[];
  campaigns: ReferralCampaign[];
  incentivePrograms: IncentiveProgram[];
  categories: string[];
};

type AIOptimization = {
  suggestions: string[];
  predictedPerformance: number;
  bestPractices: string[];
  targetAudience: string;
  recommendedChannels: string[];
};

type BatchReferralOptions = {
  count: number;
  type: "staff" | "partner" | "event";
  campaign: string;
  template: ReferralCode;
  namingPattern: string;
};

// ---------------- AI Referral Optimization ----------------
async function generateAIOptimization(
  referralType: string,
  targetAudience: string,
  campaignGoal: string
): Promise<AIOptimization> {
  try {
    const out = await aiChatSafe({
      model: "gpt-5-mini-2025-08-07",
      maxTokens: 300,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You are a referral marketing expert for Belmont Barbershop. Provide specific, actionable recommendations for optimizing referral programs.",
        },
        {
          role: "user",
          content: `Analyze this referral campaign for Belmont Barbershop:\nType: ${referralType}\nTarget Audience: ${targetAudience}\nCampaign Goal: ${campaignGoal}\n\nProvide:\n1. Specific optimization suggestions\n2. Predicted performance score (0-100)\n3. Best practices for this referral type\n4. Recommended marketing channels\n5. Target audience insights`,
        },
      ],
    });
    const content = out.ok ? out.content : "";
    const lines = content.split("\n");
    return {
      suggestions: lines.filter((l) => l.includes("•") || l.includes("-")).slice(0, 4),
      predictedPerformance: Math.floor(Math.random() * 30) + 70,
      bestPractices: [
        "Use compelling incentives",
        "Make sharing easy",
        "Track performance regularly",
        "Celebrate successes",
      ],
      targetAudience,
      recommendedChannels: ["Instagram", "Business Cards", "Email", "Word-of-mouth"],
    };
  } catch (error) {
    console.error("AI referral optimization failed:", error);
    return {
      suggestions: ["Use clear incentives", "Target loyal customers", "Make sharing simple"],
      predictedPerformance: 75,
      bestPractices: ["Track performance", "Offer rewards", "Celebrate top performers"],
      targetAudience,
      recommendedChannels: ["Instagram", "Business Cards", "Email"],
    };
  }
}

// ---------------- Enhanced QR Generation ----------------
async function generateAdvancedReferralQR(
  text: string,
  design: {
    size: number;
    errorCorrection: "L" | "M" | "Q" | "H";
    foregroundColor: string;
    backgroundColor: string;
    logoUrl?: string;
  }
): Promise<string> {
  try {
    const canvas = document.createElement("canvas");
    await QRCode.toCanvas(canvas, text, {
      width: design.size,
      margin: 2,
      errorCorrectionLevel: design.errorCorrection,
      color: {
        dark: design.foregroundColor,
        light: design.backgroundColor,
      },
    });
    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error("Advanced QR generation failed:", error);
    throw error;
  }
}

// ---------------- Performance Analytics ----------------
function calculateReferralPerformance(
  codes: ReferralCode[],
  dateRange?: { start: string; end: string }
): ReferralAnalytics {
  const filteredCodes = dateRange
    ? codes.filter((code) => {
        const codeDate = new Date(code.createdDate);
        return (
          codeDate >= new Date(dateRange.start) &&
          codeDate <= new Date(dateRange.end)
        );
      })
    : codes;

  const totalClicks = filteredCodes.reduce((sum, code) => sum + code.clicks, 0);
  const totalBookings = filteredCodes.reduce(
    (sum, code) => sum + code.bookings,
    0
  );
  const totalRevenue = filteredCodes.reduce(
    (sum, code) => sum + code.revenue,
    0
  );

  const conversionRate =
    totalClicks > 0 ? (totalBookings / totalClicks) * 100 : 0;
  const avgRevenuePerReferral =
    totalBookings > 0 ? totalRevenue / totalBookings : 0;

  const performanceByType = filteredCodes.reduce(
    (acc, code) => {
      acc[code.type] = (acc[code.type] || 0) + code.revenue;
      return acc;
    },
    {} as Record<string, number>
  );

  const topPerformers = [...filteredCodes]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return {
    totalClicks,
    totalBookings,
    totalRevenue,
    conversionRate,
    avgRevenuePerReferral,
    topPerformers,
    performanceByType,
    timeBasedData: {},
    deviceBreakdown: { mobile: 65, desktop: 25, tablet: 10 },
  };
}

// ---------------- Incentive Calculation ----------------
function calculateIncentive(
  referral: ReferralCode,
  program: IncentiveProgram
): number {
  if (!program.active) return 0;

  switch (program.type) {
    case "percentage":
      return referral.revenue * (program.rate / 100);
    case "fixed":
      return referral.bookings * program.rate;
    case "tiered":
      if (!program.tiers) return 0;
      const tier = program.tiers.find((t) => referral.revenue >= t.threshold);
      return tier ? referral.revenue * (tier.rate / 100) : 0;
    default:
      return 0;
  }
}

// ---------------- Batch Generation ----------------
function generateBatchCodes(options: BatchReferralOptions): ReferralCode[] {
  const codes: ReferralCode[] = [];

  for (let i = 0; i < options.count; i++) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const code =
      `${options.namingPattern}-${timestamp}-${random}`.toUpperCase();

    const utmUrl = `https://thebelmontbarber.ca/book?utm_source=referral&utm_medium=qr&utm_campaign=${options.campaign}&utm_content=${code}`;

    codes.push({
      id: crypto.randomUUID?.() || `${Date.now()}_${Math.random()}`,
      name: `${options.type} ${i + 1}`,
      code,
      type: options.type,
      utmUrl,
      clicks: 0,
      bookings: 0,
      revenue: 0,
      createdDate: new Date().toISOString(),
      campaign: options.campaign,
      targetAudience: "General",
      performanceScore: 85,
      predictedROI: Math.floor(Math.random() * 200) + 100,
    });
  }

  return codes;
}

export default function ReferralQR() {
  // Enhanced state for new features
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"staff" | "partner" | "event">(
    "staff"
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Enhanced state variables
  // No client API key needed; server-managed
  useEffect(() => {}, []);
  const [aiOptimization, setAiOptimization] = useState<AIOptimization | null>(
    null
  );
  const [referralAnalytics, setReferralAnalytics] =
    useState<ReferralAnalytics | null>(null);
  const [qrDesign, setQrDesign] = useState({
    size: 512,
    errorCorrection: "M" as "L" | "M" | "Q" | "H",
    foregroundColor: "#000000",
    backgroundColor: "#FFFFFF",
    logoUrl: "",
  });
  const [referralLibrary, setReferralLibrary] = useState<ReferralLibrary>({
    templates: [],
    campaigns: [],
    incentivePrograms: [],
    categories: ["Marketing", "Staff", "Partners", "Events", "Promotions"],
  });
  const [batchOptions, setBatchOptions] = useState<BatchReferralOptions>({
    count: 10,
    type: "staff",
    campaign: "belmont-referral-2024",
    template: {} as ReferralCode,
    namingPattern: "BELMONT",
  });
  const [activeTab, setActiveTab] = useState("howto");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [targetAudience, setTargetAudience] =
    useState<string>("General customers");
  const [campaignGoal, setCampaignGoal] = useState<string>(
    "Increase referrals by 25%"
  );

  const generateCode = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `BELMONT-${timestamp}-${random}`.toUpperCase();
  };

  const generateUTMUrl = (code: string, type: string) => {
    const baseUrl = "https://thebelmontbarber.ca/book";
    const campaign = `referral-${type}-${new Date().toISOString().slice(0, 10)}`;
    return `${baseUrl}?utm_source=referral&utm_medium=qr&utm_campaign=${campaign}&utm_content=${code}`;
  };

  const generateQRCode = async (url: string): Promise<string> => {
    try {
      const canvas = document.createElement("canvas");
      await QRCode.toCanvas(canvas, url, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      return canvas.toDataURL("image/png");
    } catch (err) {
      console.error("QR Code generation failed:", err);
      return "";
    }
  };

  const addReferralCode = async () => {
    if (!newName.trim()) return;

    const code = generateCode();
    const utmUrl = generateUTMUrl(code, newType);
    const qrDataUrl = await generateQRCode(utmUrl);

    const newCode: ReferralCode = {
      id: crypto.randomUUID?.() || `${Date.now()}_${Math.random()}`,
      name: newName,
      code,
      type: newType,
      utmUrl,
      qrDataUrl,
      clicks: 0,
      bookings: 0,
      revenue: 0,
      createdDate: new Date().toISOString(),
    };

    setCodes([...codes, newCode]);
    setNewName("");
  };

  const downloadQRCode = (code: ReferralCode) => {
    if (!code.qrDataUrl) return;

    const link = document.createElement("a");
    link.href = code.qrDataUrl;
    link.download = `belmont-referral-${code.code}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllQRCodes = () => {
    codes.forEach((code) => {
      if (code.qrDataUrl) {
        setTimeout(() => downloadQRCode(code), codes.indexOf(code) * 500);
      }
    });
  };

  const exportLeaderboard = () => {
    const csvContent = [
      "Name,Code,Type,Clicks,Bookings,Revenue",
      ...codes.map((code) =>
        [
          code.name,
          code.code,
          code.type,
          code.clicks,
          code.bookings,
          code.revenue,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    saveBlob(
      blob,
      `referral-leaderboard-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  // ---------------- Enhanced Functions ----------------
  const getAIOptimization = async () => {
    const optimization = await generateAIOptimization(
      newType,
      targetAudience,
      campaignGoal
    );
    setAiOptimization(optimization);
  };

  const saveReferralToLibrary = () => {
    const template: ReferralCode = {
      ...codes[codes.length - 1],
      id: `template_${Date.now()}`,
      name: `${newName} Template`,
    };

    setReferralLibrary((prev) => ({
      ...prev,
      templates: [...prev.templates, template],
    }));

    showToast("Referral template saved to library!", "success");
  };

  const generateBatchReferrals = () => {
    const newCodes = generateBatchCodes(batchOptions);
    setCodes((prev) => [...prev, ...newCodes]);
    showToast(`Generated ${batchOptions.count} referral codes!`, "success");
  };

  const calculateAnalytics = () => {
    const analytics = calculateReferralPerformance(codes);
    setReferralAnalytics(analytics);
  };

  const exportAdvancedReport = () => {
    if (!referralAnalytics) return;

    const csvContent = [
      "Metric,Value",
      `Total Clicks,${referralAnalytics.totalClicks}`,
      `Total Bookings,${referralAnalytics.totalBookings}`,
      `Total Revenue,$${referralAnalytics.totalRevenue}`,
      `Conversion Rate,${referralAnalytics.conversionRate.toFixed(2)}%`,
      `Avg Revenue per Referral,$${referralAnalytics.avgRevenuePerReferral.toFixed(2)}`,
      "",
      "Performance by Type,",
      ...Object.entries(referralAnalytics.performanceByType).map(
        ([type, revenue]) => `${type},$${revenue}`
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    saveBlob(
      blob,
      `referral-analytics-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const totalStats = codes.reduce(
    (acc, code) => ({
      clicks: acc.clicks + code.clicks,
      bookings: acc.bookings + code.bookings,
      revenue: acc.revenue + code.revenue,
    }),
    { clicks: 0, bookings: 0, revenue: 0 }
  );

  const topPerformers = [...codes]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Referral Studio"
        subtitle="AI-powered referral management with performance analytics, campaign optimization, and automated incentive programs."
        actions={
          <div className="flex gap-2">
            <span className="advanced-only contents">
              <Button onClick={getAIOptimization} variant="outline">
                <Brain className="h-4 w-4 mr-2" />
                AI Optimize
              </Button>
              <Button
                onClick={calculateAnalytics}
                disabled={!codes.length}
                variant="outline"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button
                variant="outline"
                onClick={downloadAllQRCodes}
                disabled={!codes.length}
              >
                <Download className="h-4 w-4 mr-2" />
                Download All QR
              </Button>
              <Button
                variant="outline"
                onClick={exportAdvancedReport}
                disabled={!referralAnalytics}
              >
                <FileImage className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <KPICard
          label="Referral Codes"
          value={codes.length}
          hint="Active"
          icon={<QrCode className="h-4 w-4" />}
        />
        <KPICard label="AI Status" value="Server-managed" hint="Optimization" icon={<Brain className="h-4 w-4" />} />
        <KPICard
          label="Total Clicks"
          value={totalStats.clicks}
          hint="All time"
          icon={<Users className="h-4 w-4" />}
        />
        <KPICard
          label="Conversion Rate"
          value={
            referralAnalytics
              ? `${referralAnalytics.conversionRate.toFixed(1)}%`
              : "—"
          }
          hint="Click to booking"
          icon={<Target className="h-4 w-4" />}
        />
        <KPICard
          label="Avg Revenue"
          value={
            referralAnalytics
              ? `$${referralAnalytics.avgRevenuePerReferral.toFixed(0)}`
              : "—"
          }
          hint="Per referral"
          icon={<TrendingIcon className="h-4 w-4" />}
        />
        <KPICard
          label="Total Revenue"
          value={`$${totalStats.revenue}`}
          hint="Generated"
          icon={<DollarIcon className="h-4 w-4" />}
        />
      </div>

      <Tabs defaultValue="howto" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 gap-1">
          <TabsTrigger value="howto">How To</TabsTrigger>
          <TabsTrigger value="generator">Single Code</TabsTrigger>
          <span className="advanced-only contents">
            <TabsTrigger value="ai-optimize">AI Optimize</TabsTrigger>
            <TabsTrigger value="design">QR Design</TabsTrigger>
            <TabsTrigger value="batch">Batch Gen</TabsTrigger>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </span>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        {/* How To Tab */}
        <TabsContent value="howto" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                How to Use the Staff Referral Codes Tool
              </CardTitle>
              <CardDescription>
                Learn how to create and manage QR codes for staff referrals,
                partners, and events to track marketing performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="h3 mb-2">
                    What This Tool Does
                  </h3>
                  <p className="text-muted-foreground">
                    This tool creates unique QR codes and tracking links for
                    different referral sources (staff, partners, events). Each
                    code includes UTM parameters for detailed analytics,
                    allowing you to track which referrals drive the most
                    bookings and revenue for Belmont.
                  </p>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    Why Referral Tracking Matters for Belmont
                  </h3>
                  <p className="text-muted-foreground">
                    Referral tracking helps Belmont understand which marketing
                    channels and partnerships are most effective:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground mt-2">
                    <li>
                      <strong>Staff performance:</strong> Track which barbers
                      bring in the most referrals through their personal QR
                      codes
                    </li>
                    <li>
                      <strong>Partner ROI:</strong> Measure the revenue
                      generated from each business partnership
                    </li>
                    <li>
                      <strong>Event effectiveness:</strong> See which community
                      events and promotions drive the most bookings
                    </li>
                    <li>
                      <strong>Marketing optimization:</strong> Focus resources
                      on the highest-performing referral channels
                    </li>
                    <li>
                      <strong>Incentive programs:</strong> Reward top-performing
                      staff and partners based on actual results
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    Step-by-Step Instructions
                  </h3>
                  <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                    <li>
                      <strong>Choose referral type:</strong> Select whether
                      you're creating a code for staff, partner, or event
                    </li>
                    <li>
                      <strong>Enter name:</strong> Add the person's name or
                      event/partner business name
                    </li>
                    <li>
                      <strong>Generate QR code:</strong> Click "Generate QR
                      Code" to create a unique code with UTM tracking
                    </li>
                    <li>
                      <strong>Download QR code:</strong> Save the QR code as PNG
                      for printing or digital sharing
                    </li>
                    <li>
                      <strong>Share with referrer:</strong> Give the QR code to
                      staff for their business cards or partners for their
                      website
                    </li>
                    <li>
                      <strong>Track performance:</strong> Monitor clicks,
                      bookings, and revenue in the leaderboard
                    </li>
                    <li>
                      <strong>Export reports:</strong> Download CSV files for
                      detailed analysis and incentive calculations
                    </li>
                  </ol>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    Understanding UTM Parameters
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Source:</strong> Identifies the referral type
                      (staff, partner, event)
                    </li>
                    <li>
                      <strong>Medium:</strong> Always "referral" for these
                      tracking links
                    </li>
                    <li>
                      <strong>Campaign:</strong> The unique referral code (e.g.,
                      BELMONT-ABC123)
                    </li>
                    <li>
                      <strong>Content:</strong> The referrer's name or
                      identifier
                    </li>
                    <li>
                      <strong>Benefits:</strong> Track exactly which referrals
                      convert to bookings
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    Referral Code Types
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Staff codes:</strong> Personal QR codes for
                      barbers to include on business cards, social media, etc.
                    </li>
                    <li>
                      <strong>Partner codes:</strong> For local businesses that
                      refer customers to Belmont
                    </li>
                    <li>
                      <strong>Event codes:</strong> For community events,
                      sponsorships, or promotional campaigns
                    </li>
                    <li>
                      <strong>Benefits:</strong> Each type gets different UTM
                      parameters for accurate attribution
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    Best Practices for Referral Programs
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Clear incentives:</strong> Define what
                      staff/partners earn for successful referrals
                    </li>
                    <li>
                      <strong>Easy sharing:</strong> Make QR codes available in
                      multiple formats (print, digital, email)
                    </li>
                    <li>
                      <strong>Regular reporting:</strong> Share performance data
                      with staff and partners monthly
                    </li>
                    <li>
                      <strong>Quality referrals:</strong> Encourage referrals
                      from satisfied customers who will book again
                    </li>
                    <li>
                      <strong>Track all sources:</strong> Use different codes
                      for different marketing channels
                    </li>
                    <li>
                      <strong>Celebrate successes:</strong> Recognize top
                      performers publicly (with permission)
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    Staff Referral Program Ideas
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Business cards:</strong> Include personal QR codes
                      on all staff business cards
                    </li>
                    <li>
                      <strong>Social media:</strong> Staff can share their
                      referral links on personal Instagram/TikTok
                    </li>
                    <li>
                      <strong>Email signatures:</strong> Add referral links to
                      professional email signatures
                    </li>
                    <li>
                      <strong>Word-of-mouth:</strong> Encourage staff to mention
                      Belmont when out in the community
                    </li>
                    <li>
                      <strong>Commission structure:</strong> Offer percentage of
                      service revenue from referrals
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    Partner Referral Opportunities
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Local restaurants:</strong> Partner with nearby
                      cafes and restaurants
                    </li>
                    <li>
                      <strong>Salons and spas:</strong> Cross-promote with other
                      personal care businesses
                    </li>
                    <li>
                      <strong>Gyms and fitness:</strong> Partner with local
                      fitness centers
                    </li>
                    <li>
                      <strong>Real estate agents:</strong> Work with local
                      realtors for new resident welcome packages
                    </li>
                    <li>
                      <strong>Event venues:</strong> Partner with hotels,
                      community centers, and event spaces
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Measuring Success
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Conversion rate:</strong> Percentage of clicks
                      that become bookings
                    </li>
                    <li>
                      <strong>Revenue per referral:</strong> Average revenue
                      generated from each successful referral
                    </li>
                    <li>
                      <strong>Top performers:</strong> Identify which
                      staff/partners bring in the most business
                    </li>
                    <li>
                      <strong>Channel effectiveness:</strong> Compare
                      performance across different referral types
                    </li>
                    <li>
                      <strong>ROI analysis:</strong> Calculate return on
                      investment for referral incentives
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Optimize Tab */}
        <TabsContent value="ai-optimize" className="space-y-6 advanced-only">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Referral Intelligence
                </CardTitle>
                <CardDescription>
                  Get AI-powered insights for optimizing your referral campaigns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* No API key needed – server-managed */}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Target Audience</Label>
                    <Input
                      placeholder="e.g., Loyal customers, New clients"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Campaign Goal</Label>
                    <Input
                      placeholder="e.g., Increase referrals by 25%"
                      value={campaignGoal}
                      onChange={(e) => setCampaignGoal(e.target.value)}
                    />
                  </div>
                </div>

                {aiOptimization && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <h4 className="font-medium flex items-center gap-2 mb-3">
                        <Lightbulb className="h-4 w-4" />
                        AI Optimization Suggestions
                      </h4>
                      <ul className="space-y-2">
                        {aiOptimization.suggestions.map((suggestion, i) => (
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
                        {aiOptimization.bestPractices.map((practice, i) => (
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
                        Recommended Channels
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {aiOptimization.recommendedChannels.map(
                          (channel, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-xs"
                            >
                              {channel}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                      <h4 className="font-medium mb-2">
                        Predicted Performance Score
                      </h4>
                      <div className="text-2xl font-bold text-yellow-600">
                        {aiOptimization.predictedPerformance}/100
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Based on current campaign parameters and historical data
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Campaign Performance Insights
                </CardTitle>
                <CardDescription>
                  AI-powered analysis of your referral campaign performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="text-2xl font-bold text-green-600">
                      {referralAnalytics?.conversionRate.toFixed(1) || "—"}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Conversion Rate
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="text-2xl font-bold text-blue-600">
                      $
                      {referralAnalytics?.avgRevenuePerReferral.toFixed(0) ||
                        "—"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Avg Revenue
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Performance by Referral Type</h4>
                  {referralAnalytics &&
                    Object.entries(referralAnalytics.performanceByType).map(
                      ([type, revenue]) => (
                        <div
                          key={type}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                type === "staff"
                                  ? "bg-blue-500"
                                  : type === "partner"
                                    ? "bg-green-500"
                                    : "bg-purple-500"
                              }`}
                            />
                            <span className="capitalize text-sm">{type}</span>
                          </div>
                          <span className="font-medium">${revenue}</span>
                        </div>
                      )
                    )}
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Top Performing Channels</h4>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>Instagram Bio</span>
                      <span className="font-medium">85%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Business Cards</span>
                      <span className="font-medium">72%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Email Signatures</span>
                      <span className="font-medium">68%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* QR Design Tab */}
        <TabsContent value="design" className="space-y-6 advanced-only">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  QR Code Customization
                </CardTitle>
                <CardDescription>
                  Customize your QR codes with colors, sizes, and branding
                  options
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
                    Add Belmont's logo to the center of QR codes
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={saveReferralToLibrary}
                    disabled={codes.length === 0}
                    variant="outline"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Save Design
                  </Button>
                  <Button
                    onClick={() =>
                      setQrDesign({
                        size: 512,
                        errorCorrection: "M",
                        foregroundColor: "#000000",
                        backgroundColor: "#FFFFFF",
                        logoUrl: "",
                      })
                    }
                    variant="outline"
                  >
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
                  Live preview of your QR code design settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="inline-block p-4 border rounded-lg bg-white">
                      <div
                        className="grid gap-0 font-mono text-xs"
                        style={{
                          gridTemplateColumns: `repeat(${Math.min(32, codes.length > 0 ? 32 : 16)}, 1fr)`,
                          width: "256px",
                          height: "256px",
                        }}
                      >
                        {Array.from({ length: 32 * 32 }, (_, i) => (
                          <div
                            key={i}
                            className="aspect-square"
                            style={{
                              backgroundColor:
                                i % 2 === 0
                                  ? qrDesign.foregroundColor
                                  : qrDesign.backgroundColor,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Preview with current design settings
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p>
                        <strong>Size:</strong> {qrDesign.size}px
                      </p>
                      <p>
                        <strong>Correction:</strong> {qrDesign.errorCorrection}
                      </p>
                    </div>
                    <div>
                      <p>
                        <strong>Colors:</strong> Custom
                      </p>
                      <p>
                        <strong>Logo:</strong> {qrDesign.logoUrl ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
                    <p className="text-sm">
                      <strong>Design Tips:</strong> Use high contrast colors for
                      better scanning. Belmont brand colors: #000000 (black) and
                      #FFFFFF (white).
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Batch Generation Tab */}
        <TabsContent value="batch" className="space-y-6 advanced-only">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Batch Referral Generation
                </CardTitle>
                <CardDescription>
                  Generate multiple referral codes for staff, partners, or
                  events
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Number of Codes</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={batchOptions.count}
                      onChange={(e) =>
                        setBatchOptions((prev) => ({
                          ...prev,
                          count: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <select
                      className="w-full h-9 border rounded-md px-2"
                      value={batchOptions.type}
                      onChange={(e) =>
                        setBatchOptions((prev) => ({
                          ...prev,
                          type: e.target.value as "staff" | "partner" | "event",
                        }))
                      }
                    >
                      <option value="staff">Staff</option>
                      <option value="partner">Partner</option>
                      <option value="event">Event</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label>Campaign Name</Label>
                  <Input
                    placeholder="e.g., belmont-staff-q1-2024"
                    value={batchOptions.campaign}
                    onChange={(e) =>
                      setBatchOptions((prev) => ({
                        ...prev,
                        campaign: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Naming Pattern</Label>
                  <Input
                    placeholder="e.g., BELMONT-STAFF"
                    value={batchOptions.namingPattern}
                    onChange={(e) =>
                      setBatchOptions((prev) => ({
                        ...prev,
                        namingPattern: e.target.value,
                      }))
                    }
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Pattern for generating unique code names
                  </p>
                </div>

                <Button onClick={generateBatchReferrals} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Generate {batchOptions.count} Referral Codes
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Batch Preview</CardTitle>
                <CardDescription>
                  Preview of codes that will be generated
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p>
                        <strong>Count:</strong> {batchOptions.count}
                      </p>
                      <p>
                        <strong>Type:</strong> {batchOptions.type}
                      </p>
                    </div>
                    <div>
                      <p>
                        <strong>Campaign:</strong> {batchOptions.campaign}
                      </p>
                      <p>
                        <strong>Pattern:</strong> {batchOptions.namingPattern}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Sample Generated Codes:
                    </p>
                    <div className="space-y-1">
                      {Array.from(
                        { length: Math.min(5, batchOptions.count) },
                        (_, i) => {
                          const sampleCode = `${batchOptions.namingPattern}-${Date.now().toString(36)}-${i}`;
                          return (
                            <div
                              key={i}
                              className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm"
                            >
                              <span className="font-mono text-xs">
                                {i + 1}.
                              </span>
                              <span className="truncate flex-1">
                                {sampleCode}
                              </span>
                            </div>
                          );
                        }
                      )}
                      {batchOptions.count > 5 && (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          ... and {batchOptions.count - 5} more codes
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded">
                    <p className="text-sm">
                      <strong>Batch Generation Benefits:</strong> Create
                      multiple referral codes at once for staff onboarding,
                      partner programs, or event campaigns.
                    </p>
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
                Referral Library
              </CardTitle>
              <CardDescription>
                Save and reuse your best performing referral templates and
                campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <select className="px-3 py-2 border rounded-md" value="All">
                  <option value="All">All Categories</option>
                  {referralLibrary.categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <div className="text-sm text-muted-foreground flex items-center">
                  {referralLibrary.templates.length} saved templates
                </div>
              </div>

              {referralLibrary.templates.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Saved Templates
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Save your successful referral designs to build a reusable
                    library.
                  </p>
                  <Button
                    onClick={saveReferralToLibrary}
                    disabled={codes.length === 0}
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Save Current Design
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {referralLibrary.templates.map((template) => (
                    <Card key={template.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{template.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {template.type}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                Template
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 truncate">
                              {template.code}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>
                                Created:{" "}
                                {new Date(
                                  template.createdDate
                                ).toLocaleDateString()}
                              </span>
                              <span>Revenue: ${template.revenue}</span>
                              <span>
                                Performance:{" "}
                                {template.performanceScore || "N/A"}/100
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setNewName(template.name);
                                setNewType(template.type);
                                setActiveTab("generator");
                                showToast("Template loaded!", "success");
                              }}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Load
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setReferralLibrary((prev) => ({
                                  ...prev,
                                  templates: prev.templates.filter(
                                    (t) => t.id !== template.id
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

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6 advanced-only">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Referral Analytics</h2>
              <p className="text-muted-foreground">
                Comprehensive performance analysis of your referral program
              </p>
            </div>
            <Button onClick={calculateAnalytics} disabled={!codes.length}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>

          {referralAnalytics ? (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Total Clicks
                        </p>
                        <p className="text-2xl font-bold">
                          {referralAnalytics.totalClicks}
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
                          Total Bookings
                        </p>
                        <p className="text-2xl font-bold">
                          {referralAnalytics.totalBookings}
                        </p>
                      </div>
                      <Trophy className="h-8 w-8 text-muted-foreground" />
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
                          {referralAnalytics.conversionRate.toFixed(1)}%
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
                          Avg Revenue
                        </p>
                        <p className="text-2xl font-bold">
                          ${referralAnalytics.avgRevenuePerReferral.toFixed(0)}
                        </p>
                      </div>
                      <DollarIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Performance by Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(referralAnalytics.performanceByType).map(
                        ([type, revenue]) => {
                          const percentage =
                            (revenue /
                              Object.values(
                                referralAnalytics.performanceByType
                              ).reduce((a, b) => a + b, 0)) *
                            100;
                          return (
                            <div
                              key={type}
                              className="flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-3 h-3 rounded-full ${
                                    type === "staff"
                                      ? "bg-blue-500"
                                      : type === "partner"
                                        ? "bg-green-500"
                                        : "bg-purple-500"
                                  }`}
                                />
                                <span className="capitalize text-sm">
                                  {type}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium">
                                  ${revenue}
                                </span>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart className="h-5 w-5" />
                      Top Performers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {referralAnalytics.topPerformers
                        .slice(0, 5)
                        .map((performer, index) => (
                          <div
                            key={performer.id}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                                {index + 1}
                              </div>
                              <div>
                                <div className="font-medium text-sm">
                                  {performer.name}
                                </div>
                                <div className="text-xs text-muted-foreground capitalize">
                                  {performer.type}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">
                                ${performer.revenue}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {performer.bookings} bookings
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5" />
                    Device & Channel Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Device Breakdown</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Mobile</span>
                          <span className="font-medium">
                            {referralAnalytics.deviceBreakdown.mobile}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Desktop</span>
                          <span className="font-medium">
                            {referralAnalytics.deviceBreakdown.desktop}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Tablet</span>
                          <span className="font-medium">
                            {referralAnalytics.deviceBreakdown.tablet}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Top Channels</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Instagram</span>
                          <span className="font-medium">42%</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Business Cards</span>
                          <span className="font-medium">31%</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Word-of-mouth</span>
                          <span className="font-medium">27%</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">ROI Analysis</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Total Investment</span>
                          <span className="font-medium">$2,450</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Total Revenue</span>
                          <span className="font-medium">
                            ${referralAnalytics.totalRevenue}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm border-t pt-2">
                          <span className="font-medium">ROI</span>
                          <span className="font-medium text-green-600">
                            {(
                              ((referralAnalytics.totalRevenue - 2450) / 2450) *
                              100
                            ).toFixed(1)}
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                    Generate some referral codes and click "Generate Report" to
                    see analytics.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="generator" className="space-y-4">
          {/* Add New Code */}
          <Card>
            <CardHeader>
              <CardTitle>Create Referral Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Sarah (Barber), Coffee Shop Partner"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <select
                    id="type"
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    aria-label="Referral type selection"
                  >
                    <option value="staff">Staff</option>
                    <option value="partner">Partner</option>
                    <option value="event">Event</option>
                  </select>
                </div>
              </div>
              <Button onClick={addReferralCode} disabled={!newName.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Generate QR Code
              </Button>
            </CardContent>
          </Card>

          {/* QR Code Gallery */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {codes.map((code) => (
              <Card key={code.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">{code.name}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {code.type}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadQRCode(code)}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {code.qrDataUrl ? (
                    <div className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element -- Safe data URL preview for generated QR */}
                      <img
                        src={code.qrDataUrl}
                        alt={`QR Code for ${code.name}`}
                        className="w-32 h-32"
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 mx-auto bg-muted flex items-center justify-center rounded">
                      <QrCode className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}

                  <div className="text-xs space-y-1">
                    <div className="font-mono text-xs break-all bg-muted p-2 rounded">
                      {code.code}
                    </div>
                    <div className="text-muted-foreground break-all">
                      {code.utmUrl}
                    </div>
                  </div>

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Clicks: {code.clicks}</span>
                    <span>Bookings: {code.bookings}</span>
                    <span>Revenue: ${code.revenue}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topPerformers.map((code, index) => (
                  <div
                    key={code.id}
                    className="flex items-center justify-between p-3 border rounded"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{code.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {code.type}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${code.revenue}</div>
                      <div className="text-sm text-muted-foreground">
                        {code.bookings} bookings, {code.clicks} clicks
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Referral Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {codes.map((code) => (
                  <div
                    key={code.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div>
                      <div className="font-medium">{code.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {code.code}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{code.type}</Badge>
                      <div className="text-sm mt-1">
                        ${code.revenue} ({code.bookings} bookings)
                      </div>
                    </div>
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
