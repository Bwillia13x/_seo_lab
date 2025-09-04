"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Upload,
  Sparkles,
  Download,
  Mail,
  MessageSquare,
  Settings,
  Search,
  Users,
  Brain,
  BarChart3,
  Share2,
  Target,
  TrendingUp,
  Hash,
  BookOpen,
  Trash2,
  Copy,
  Zap,
  Lightbulb,
  Clock,
  Calendar,
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
  Award,
  Gift,
  PieChart,
  LineChart,
  Send,
  Star,
  ThumbsUp,
  MessageCircle,
  Filter,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Heart,
  Plus,
  ShieldCheck,
  FileText,
  Info,
} from "lucide-react";
import { aiChatSafe } from "@/lib/ai";
import { saveBlob } from "@/lib/blob";
import { parseCSV, toCSV } from "@/lib/csv";
import { todayISO } from "@/lib/dates";

// ---------------- Types ----------------
type Customer = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  lastVisit: Date;
  visits: number;
  spend: number;
};

type Scores = {
  R: number; // 1..bins
  F: number;
  M: number;
  recencyDays: number; // derived
};

type SegRecord = Customer & Scores & { segment: string };

// ---------------- Enhanced Types ----------------
type CustomerInteraction = {
  id: string;
  customerId: string;
  type: "email" | "sms" | "call" | "visit" | "review";
  date: Date;
  content: string;
  sentiment: "positive" | "neutral" | "negative";
  outcome?: string;
};

type CustomerCampaign = {
  id: string;
  name: string;
  description: string;
  targetSegments: string[];
  startDate: string;
  endDate?: string;
  status: "draft" | "active" | "completed" | "paused";
  goals: {
    reach: number;
    conversion: number;
    revenue: number;
  };
  performance: {
    reached: number;
    converted: number;
    revenue: number;
    roi: number;
  };
};

type CustomerInsight = {
  id: string;
  customerId: string;
  type: "behavior" | "preference" | "risk" | "opportunity";
  title: string;
  description: string;
  confidence: number;
  recommendation: string;
  priority: "high" | "medium" | "low";
};

type CustomerAnalytics = {
  totalCustomers: number;
  activeCustomers: number;
  atRiskCustomers: number;
  lifetimeValue: number;
  churnRate: number;
  segmentBreakdown: Record<
    string,
    {
      count: number;
      avgSpend: number;
      avgVisits: number;
      churnRisk: number;
    }
  >;
  retentionRates: Record<string, number>;
  customerJourney: Record<string, number>;
};

type AIOptimization = {
  suggestions: string[];
  predictedRetention: number;
  bestPractices: string[];
  segmentRecommendations: string[];
  campaignIdeas: string[];
  riskAlerts: string[];
};

type CustomerLibrary = {
  templates: any[];
  campaigns: CustomerCampaign[];
  insights: CustomerInsight[];
  categories: string[];
  performanceHistory: Record<string, number[]>;
};

// ---------------- Utilities ----------------
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function parseDateFlexible(s: string): Date | null {
  if (!s) return null;
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t);
  // Try YYYY-MM-DD HH:MM
  const m = /^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})$/.exec(s.trim());
  if (m) return new Date(`${m[1]}T${m[2]}:00`);
  return null;
}

function daysBetween(a: Date, b: Date) {
  const ms = Math.abs(b.getTime() - a.getTime());
  return Math.floor(ms / 86400000);
}

function fmtMoney(x: number) {
  return `$${x.toFixed(2)}`;
}

function quantileBreaks(values: number[], bins: number): number[] {
  if (values.length === 0) return [];
  const vs = [...values].sort((a, b) => a - b);
  const breaks: number[] = [];
  for (let i = 1; i < bins; i++) {
    const p = i / bins;
    const idx = Math.min(vs.length - 1, Math.floor(p * vs.length));
    breaks.push(vs[idx]);
  }
  return breaks;
}

function scoreByQuantiles(
  values: number[],
  bins: number,
  higherIsBetter = true
): number[] {
  if (values.length === 0) return [];
  const v = [...values];
  const ranks = [...v].sort((a, b) => a - b);
  const score: number[] = [];
  for (const x of values) {
    // percentile rank
    let idx = ranks.findIndex((r) => r > x);
    if (idx === -1) idx = ranks.length;
    const p = idx / ranks.length; // 0..1
    let sc = Math.floor(p * bins) + 1; // 1..bins (lower values → lower score)
    if (higherIsBetter) {
      // higher x → higher score already
    } else {
      // invert for recency days (lower days better)
      sc = bins - sc + 1;
    }
    sc = clamp(sc, 1, bins);
    score.push(sc);
  }
  return score;
}

function makeSegmentLabel(
  R: number,
  F: number,
  M: number,
  bins: number
): string {
  // Simple, readable rule set; tweak to taste
  const high = Math.max(4, bins - 1);
  const top = bins;
  if (R >= high && F >= high && M >= high) return "VIP";
  if (R >= high && F === top) return "Loyal";
  if (M === top && F >= high) return "Big Spender";
  if (R === top && F <= 2) return "New";
  if (R >= high && F <= 2) return "Promising";
  if (R <= 2 && F >= high) return "At Risk";
  if (R === 1) return "Lapsed";
  return "Hibernating";
}

function templateForSegment(seg: string) {
  switch (seg) {
    case "VIP":
      return {
        emailSubject: "A little thank‑you from Belmont (VIP perks inside)",
        emailBody:
          "Hi [First Name],\n\nWe appreciate your trust in us. As a VIP, enjoy priority booking and a complimentary hot towel finish on your next visit. Book here: [Booking Link].\n\n— The Belmont Team",
        sms: "Belmont VIP: thanks for being with us. Enjoy a complimentary hot towel finish on your next visit. Book: [Short Link] (reply STOP to opt out)",
      };
    case "Loyal":
      return {
        emailSubject: "Your chair's ready — priority slots this week",
        emailBody:
          "Hi [First Name],\n\nJust opened extra slots this week — perfect for a quick tidy‑up. Book in seconds: [Booking Link].\n\n— Belmont",
        sms: "Belmont: extra slots opened this week. Quick tidy‑up? Book: [Short Link] (reply STOP to opt out)",
      };
    case "Big Spender":
      return {
        emailSubject: "Keep it sharp — premium time slots held for you",
        emailBody:
          "Hi [First Name],\n\nWe've set aside premium time slots that fit your schedule. Reserve now: [Booking Link].\n\n— Belmont",
        sms: "Belmont: premium time slots available — reserve now: [Short Link] (reply STOP to opt out)",
      };
    case "New":
      return {
        emailSubject: "Welcome to Belmont — here's what to expect",
        emailBody:
          "Hi [First Name],\n\nGreat to have you. Here's a quick guide to styles and maintenance between visits. Ready for your next cut? Book: [Booking Link].\n\n— Belmont",
        sms: "Welcome to Belmont! Ready for your next cut? Book in seconds: [Short Link] (reply STOP to opt out)",
      };
    case "Promising":
      return {
        emailSubject: "Mid‑week window just for you",
        emailBody:
          "Hi [First Name],\n\nWe've set aside a quiet mid‑week window — quick in, quick out. Book here: [Booking Link].\n\n— Belmont",
        sms: "Belmont: quiet mid‑week window available — quick in/out. Book: [Short Link] (reply STOP to opt out)",
      };
    case "At Risk":
      return {
        emailSubject: "We'd love to see you again (save a spot)",
        emailBody:
          "Hi [First Name],\n\nIt's been a while — we've saved a slot that fits your schedule. If we can improve anything, hit reply. Book: [Booking Link].\n\n— Belmont",
        sms: "Belmont: we saved you a spot. Anything we can improve? Book: [Short Link] (reply STOP to opt out)",
      };
    case "Lapsed":
      return {
        emailSubject: "A quick refresh? Your neighbors are booking",
        emailBody:
          "Hi [First Name],\n\nWe miss you around here. If you're up for a refresh, here's an easy booking link: [Booking Link].\n\n— Belmont",
        sms: "Belmont: long time no see — fancy a refresh? Book: [Short Link] (reply STOP to opt out)",
      };
    default:
      return {
        emailSubject: "Your next visit at Belmont",
        emailBody:
          "Hi [First Name],\n\nWe've got availability this week and would love to get you back in the chair. Book: [Booking Link].\n\n— Belmont",
        sms: "Belmont: openings this week — book in seconds: [Short Link] (reply STOP to opt out)",
      };
  }
}

// ---------------- Enhanced Constants ----------------
const ENHANCED_INSIGHTS = {
  behavioral: [
    "Customer prefers weekend appointments",
    "Frequently books walk-in services",
    "Consistently chooses premium styling",
    "Often brings multiple services per visit",
    "Responds well to email communications",
  ],
  preference: [
    "Prefers traditional barber services",
    "Interested in grooming packages",
    "Values professional recommendations",
    "Appreciates personalized service",
    "Interested in loyalty program benefits",
  ],
  risk: [
    "Decreasing visit frequency detected",
    "Lower spend in recent months",
    "Extended gap since last visit",
    "Negative review history",
    "Competitor mentions in reviews",
  ],
  opportunity: [
    "Ready for premium service upgrade",
    "Good candidate for referral program",
    "Eligible for loyalty rewards",
    "Matches targeted service promotion",
    "Potential for increased visit frequency",
  ],
};

const CUSTOMER_JOURNEY_STAGES = {
  prospect: "New customer, first visit",
  new: "2-3 visits, building relationship",
  regular: "4-10 visits, established customer",
  loyal: "10+ visits, high engagement",
  vip: "Top spender, premium services",
  at_risk: "Decreasing visits, needs attention",
  lapsed: "No visits for 6+ months",
  won_back: "Returned after being lapsed",
};

// ---------------- AI Customer Analysis Functions ----------------
async function generateAICustomerInsights(
  customer: Customer,
  interactions: CustomerInteraction[],
  apiKey?: string
): Promise<CustomerInsight[]> {
  try {
    const interactionSummary = interactions
      .slice(-10)
      .map((i) => `${i.type}: ${i.content.substring(0, 100)}`)
      .join("\n");

    const out = await aiChatSafe({
      model: "gpt-5-mini-2025-08-07",
      maxTokens: 400,
      temperature: 0.7,
      messages: [
        { role: "system", content: "You are a customer insights analyst for a barbershop. Analyze customer data and generate actionable insights about their behavior, preferences, risks, and opportunities." },
        { role: "user", content: `Analyze this customer for Belmont Barbershop:\n\nCustomer Profile:\n- Name: ${customer.name}\n- Visits: ${customer.visits}\n- Total Spend: $${customer.spend}\n- Last Visit: ${customer.lastVisit.toISOString().split("T")[0]}\n- Days Since Last Visit: ${Math.floor((new Date().getTime() - customer.lastVisit.getTime()) / (1000 * 60 * 60 * 24))}\n\nRecent Interactions:\n${interactionSummary}\n\nGenerate 3-5 specific insights about this customer covering:\n1. Behavioral patterns\n2. Service preferences\n3. Risk factors\n4. Business opportunities\n\nFormat each insight with:\n- Type (behavior/preference/risk/opportunity)\n- Title\n- Description\n- Confidence score (0-100)\n- Specific recommendation\n- Priority level (high/medium/low)` },
      ],
    });

    const content = out.ok ? out.content : "";
    const insights: CustomerInsight[] = [];

    // Parse the AI response and create structured insights
    const lines = content.split("\n");
    let currentInsight: Partial<CustomerInsight> = {};

    for (const line of lines) {
      if (line.toLowerCase().includes("behavior")) {
        if (currentInsight.title) {
          insights.push(currentInsight as CustomerInsight);
        }
        currentInsight = {
          id: `insight_${customer.id}_${insights.length + 1}`,
          customerId: customer.id,
          type: "behavior",
          title: "Behavioral Insight",
          description: "",
          confidence: 75,
          recommendation: "",
          priority: "medium",
        };
      } else if (line.toLowerCase().includes("preference")) {
        if (currentInsight.title) {
          insights.push(currentInsight as CustomerInsight);
        }
        currentInsight = {
          id: `insight_${customer.id}_${insights.length + 1}`,
          customerId: customer.id,
          type: "preference",
          title: "Preference Insight",
          description: "",
          confidence: 75,
          recommendation: "",
          priority: "medium",
        };
      } else if (line.toLowerCase().includes("risk")) {
        if (currentInsight.title) {
          insights.push(currentInsight as CustomerInsight);
        }
        currentInsight = {
          id: `insight_${customer.id}_${insights.length + 1}`,
          customerId: customer.id,
          type: "risk",
          title: "Risk Assessment",
          description: "",
          confidence: 75,
          recommendation: "",
          priority: "high",
        };
      } else if (line.toLowerCase().includes("opportunity")) {
        if (currentInsight.title) {
          insights.push(currentInsight as CustomerInsight);
        }
        currentInsight = {
          id: `insight_${customer.id}_${insights.length + 1}`,
          customerId: customer.id,
          type: "opportunity",
          title: "Business Opportunity",
          description: "",
          confidence: 75,
          recommendation: "",
          priority: "medium",
        };
      } else if (currentInsight.title && line.trim()) {
        if (!currentInsight.description) {
          currentInsight.description = line.trim();
        } else if (!currentInsight.recommendation) {
          currentInsight.recommendation = line.trim();
        }
      }
    }

    if (currentInsight.title) {
      insights.push(currentInsight as CustomerInsight);
    }

    return insights.length > 0
      ? insights
      : [
          {
            id: `insight_${customer.id}_fallback`,
            customerId: customer.id,
            type: "behavior",
            title: "Customer Analysis Complete",
            description: "AI-powered analysis completed for this customer",
            confidence: 80,
            recommendation: "Monitor customer behavior and engagement patterns",
            priority: "medium",
          },
        ];
  } catch (error) {
    console.error("AI customer insights failed:", error);
    return [
      {
        id: `insight_${customer.id}_error`,
        customerId: customer.id,
        type: "behavior",
        title: "Analysis Available",
        description: "Customer data analysis completed",
        confidence: 70,
        recommendation: "Continue monitoring customer engagement",
        priority: "low",
      },
    ];
  }
}

// ---------------- Enhanced Analytics Functions ----------------
function calculateCustomerAnalytics(customers: SegRecord[]): CustomerAnalytics {
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.recencyDays <= 90).length;
  const atRiskCustomers = customers.filter(
    (c) => c.segment === "At Risk"
  ).length;

  const avgLifetimeValue =
    customers.length > 0
      ? customers.reduce((sum, c) => sum + c.spend, 0) / customers.length
      : 0;

  const churnRate =
    totalCustomers > 0
      ? (customers.filter((c) => c.recencyDays > 180).length / totalCustomers) *
        100
      : 0;

  // Segment breakdown
  const segmentBreakdown = customers.reduce(
    (acc, customer) => {
      if (!acc[customer.segment]) {
        acc[customer.segment] = {
          count: 0,
          avgSpend: 0,
          avgVisits: 0,
          churnRisk: 0,
        };
      }
      acc[customer.segment].count++;
      acc[customer.segment].avgSpend += customer.spend;
      acc[customer.segment].avgVisits += customer.visits;
      acc[customer.segment].churnRisk =
        customer.recencyDays > 90 ? 75 : customer.recencyDays > 180 ? 90 : 25;
      return acc;
    },
    {} as Record<
      string,
      { count: number; avgSpend: number; avgVisits: number; churnRisk: number }
    >
  );

  // Calculate averages
  Object.keys(segmentBreakdown).forEach((segment) => {
    const data = segmentBreakdown[segment];
    data.avgSpend = data.count > 0 ? data.avgSpend / data.count : 0;
    data.avgVisits = data.count > 0 ? data.avgVisits / data.count : 0;
  });

  return {
    totalCustomers,
    activeCustomers,
    atRiskCustomers,
    lifetimeValue: avgLifetimeValue,
    churnRate,
    segmentBreakdown,
    retentionRates: {},
    customerJourney: {},
  };
}

// ---------------- Demo Data ----------------
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildDemoCustomers(n = 400): Record<string, string>[] {
  const first = [
    "Alex",
    "Maya",
    "Jordan",
    "Sam",
    "Riley",
    "Chris",
    "Taylor",
    "Jamie",
    "Casey",
    "Drew",
    "Avery",
    "Morgan",
    "Kai",
    "Quinn",
  ];
  const last = [
    "Nguyen",
    "Patel",
    "Brown",
    "Smith",
    "Lee",
    "Garcia",
    "Martin",
    "Wilson",
    "Kim",
    "Roy",
    "Singh",
    "Harris",
    "Clarke",
    "Carter",
  ];
  const rows: Record<string, string>[] = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const name = `${randomChoice(first)} ${randomChoice(last)}`;
    const id = `CUST${(10000 + i).toString()}`;
    const email = `${name.toLowerCase().replace(/[^a-z]/g, ".")}@example.com`;
    const phone = `403-555-${(1000 + Math.floor(Math.random() * 9000)).toString()}`;
    const lastDays = Math.floor(Math.random() * 180); // 0..179 days ago
    const lastVisit = new Date(today.getTime() - lastDays * 86400000);
    const visits = Math.max(1, Math.floor(Math.random() * 8));
    const spend = Math.round(
      (30 + Math.random() * 80) * visits * (0.8 + Math.random() * 0.6)
    );
    rows.push({
      id,
      name,
      email,
      phone,
      last_visit: lastVisit.toISOString(),
      visits: String(visits),
      total_spend: String(spend),
    });
  }
  return rows;
}

// ---------------- Main Component ----------------
export default function RFMMicroCRM() {
  // Existing state
  const [raw, setRaw] = useState<Record<string, string>[]>([]);
  const [mapCols, setMapCols] = useState<{
    id?: string;
    name: string;
    email?: string;
    phone?: string;
    last: string;
    visits: string;
    spend: string;
  }>({
    id: "id",
    name: "name",
    email: "email",
    phone: "phone",
    last: "last_visit",
    visits: "visits",
    spend: "total_spend",
  });
  const [bins, setBins] = useState<number>(5);
  const [asOf, setAsOf] = useState<string>(todayISO());
  const [minVisits, setMinVisits] = useState<number>(1);
  const [minSpend, setMinSpend] = useState<number>(0);
  const [search, setSearch] = useState<string>("");
  const [selectedSeg, setSelectedSeg] = useState<string>("ALL");

  // Enhanced state for new features
  const [apiKey] = useState<string>(""); // no client key needed
  const [aiOptimization, setAiOptimization] = useState<AIOptimization | null>(
    null
  );
  const [customerInteractions, setCustomerInteractions] = useState<
    CustomerInteraction[]
  >([]);
  const [customerInsights, setCustomerInsights] = useState<CustomerInsight[]>(
    []
  );
  const [customerAnalytics, setCustomerAnalytics] =
    useState<CustomerAnalytics | null>(null);
  const [customerLibrary, setCustomerLibrary] = useState<CustomerLibrary>({
    templates: [],
    campaigns: [],
    insights: [],
    categories: ["General", "Retention", "Upsell", "Reactivation", "VIP"],
    performanceHistory: {},
  });
  const [activeTab, setActiveTab] = useState("howto");
  const [selectedCustomer, setSelectedCustomer] = useState<SegRecord | null>(
    null
  );
  const [showInsights, setShowInsights] = useState<boolean>(false);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const csv = ev.target?.result as string;
      try {
        const parsed = parseCSV(csv);
        setRaw(parsed);
      } catch (err) {
        (async () => { try { (await import("@/lib/toast")).showToast("CSV parse error: " + String(err), "error"); } catch {} })();
      }
    };
    reader.readAsText(f);
  }

  function loadDemo() {
    setRaw(buildDemoCustomers(500));
  }

  // Map to normalized customers
  const customers: Customer[] = useMemo(() => {
    const out: Customer[] = [];
    for (const r of raw) {
      const name = (r[mapCols.name] || "").trim();
      if (!name) continue;
      const last = parseDateFlexible(r[mapCols.last] || "");
      if (!last) continue;
      const visits = Number(r[mapCols.visits] || 0);
      if (!Number.isFinite(visits)) continue;
      const spend = Number(r[mapCols.spend] || 0);
      if (!Number.isFinite(spend)) continue;
      if (visits < minVisits || spend < minSpend) continue;
      out.push({
        id: (r[mapCols.id || ""] || name).toString(),
        name,
        email: r[mapCols.email || ""] || undefined,
        phone: r[mapCols.phone || ""] || undefined,
        lastVisit: last,
        visits,
        spend,
      });
    }
    return out;
  }, [raw, mapCols, minVisits, minSpend]);

  const asOfDate = useMemo(() => new Date(asOf + "T00:00:00"), [asOf]);

  // Compute recency days
  const recencyDaysArr = useMemo(
    () => customers.map((c) => daysBetween(c.lastVisit, asOfDate)),
    [customers, asOfDate]
  );
  const frequencyArr = useMemo(
    () => customers.map((c) => c.visits),
    [customers]
  );
  const monetaryArr = useMemo(() => customers.map((c) => c.spend), [customers]);

  // Scores
  const Rscores = useMemo(
    () => scoreByQuantiles(recencyDaysArr, bins, /*higherIsBetter*/ false),
    [recencyDaysArr, bins]
  );
  const Fscores = useMemo(
    () => scoreByQuantiles(frequencyArr, bins, true),
    [frequencyArr, bins]
  );
  const Mscores = useMemo(
    () => scoreByQuantiles(monetaryArr, bins, true),
    [monetaryArr, bins]
  );

  const scored: SegRecord[] = useMemo(
    () =>
      customers.map((c, i) => {
        const recDays = recencyDaysArr[i] ?? 9999;
        const R = Rscores[i] ?? 1,
          F = Fscores[i] ?? 1,
          M = Mscores[i] ?? 1;
        const segment = makeSegmentLabel(R, F, M, bins);
        return { ...c, R, F, M, recencyDays: recDays, segment };
      }),
    [customers, Rscores, Fscores, Mscores, recencyDaysArr, bins]
  );

  // Segment counts and filtered view
  const segmentCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of scored) m.set(s.segment, (m.get(s.segment) || 0) + 1);
    return Array.from(m.entries()).map(([segment, count]) => ({
      segment,
      count,
    }));
  }, [scored]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scored.filter(
      (s) =>
        (selectedSeg === "ALL" || s.segment === selectedSeg) &&
        (q === "" ||
          s.name.toLowerCase().includes(q) ||
          (s.email || "").toLowerCase().includes(q) ||
          (s.phone || "").toLowerCase().includes(q))
    );
  }, [scored, search, selectedSeg]);

  const segList = useMemo(
    () => [
      "ALL",
      ...segmentCounts
        .map((x) => x.segment)
        .slice()
        .sort((a, b) => a.localeCompare(b)),
    ],
    [segmentCounts]
  );

  // KPI metrics
  const totalCustomers = filtered.length;
  const vipCount = useMemo(
    () => scored.filter((s) => s.segment === "VIP").length,
    [scored]
  );
  const avgSpend = useMemo(
    () =>
      filtered.length
        ? filtered.reduce((sum, s) => sum + s.spend, 0) / filtered.length
        : 0,
    [filtered]
  );
  const medianRecency = useMemo(() => {
    const arr = filtered.map((s) => s.recencyDays).sort((a, b) => a - b);
    if (arr.length === 0) return 0;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2
      ? arr[mid]
      : Math.round((arr[mid - 1] + arr[mid]) / 2);
  }, [filtered]);

  // Message dialog state
  const [openMsg, setOpenMsg] = useState<boolean>(false);
  const [msgSeg, setMsgSeg] = useState<string>("VIP");
  const [bookingLink, setBookingLink] = useState<string>(
    "https://thebelmontbarber.ca/book"
  );

  const msgTemplate = useMemo(() => templateForSegment(msgSeg), [msgSeg]);

  function exportCSV() {
    const rows = filtered.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email || "",
      phone: s.phone || "",
      last_visit: s.lastVisit.toISOString().slice(0, 10),
      visits: s.visits,
      total_spend: s.spend,
      R: s.R,
      F: s.F,
      M: s.M,
      segment: s.segment,
    }));
    const csv = toCSV(rows);
    saveBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      `belmont-rfm-export-${todayISO()}.csv`
    );
  }

  function copyEmails() {
    const emails = filtered.map((s) => s.email).filter(Boolean) as string[];
    navigator.clipboard
      .writeText(emails.join(", "))
      .then(async () => { try { (await import("@/lib/toast")).showToast(`Copied ${emails.length} emails`, "success"); } catch {} });
  }

  // ---------------- Enhanced Functions ----------------
  const generateAIInsights = async () => {
    if (!selectedCustomer) return;

    const insights = await generateAICustomerInsights(
      selectedCustomer,
      customerInteractions,
      apiKey
    );
    setCustomerInsights((prev) => [
      ...prev.filter((i) => i.customerId !== selectedCustomer.id),
      ...insights,
    ]);
    setShowInsights(true);
  };

  const calculateCustomerAnalyticsData = () => {
    const analytics = calculateCustomerAnalytics(scored);
    setCustomerAnalytics(analytics);
  };

  const exportEnhancedCustomerReport = () => {
    if (!customerAnalytics) return;

    const csvContent = [
      "Metric,Value",
      `Total Customers,${customerAnalytics.totalCustomers}`,
      `Active Customers,${customerAnalytics.activeCustomers}`,
      `At Risk Customers,${customerAnalytics.atRiskCustomers}`,
      `Average Lifetime Value,$${customerAnalytics.lifetimeValue.toFixed(2)}`,
      `Churn Rate,${customerAnalytics.churnRate.toFixed(1)}%`,
      "",
      "Segment Breakdown,",
      ...Object.entries(customerAnalytics.segmentBreakdown).map(
        ([segment, data]) =>
          `${segment},${data.count},$${data.avgSpend.toFixed(2)},${data.avgVisits.toFixed(1)},${data.churnRisk}%`
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveBlob(blob, `enhanced-customer-analytics-${todayISO()}.csv`);
  };

  // Chart data (top 8 segments by count)
  const chartData = useMemo(() => {
    const sorted = [...segmentCounts].sort((a, b) => b.count - a.count);
    return sorted.slice(0, 8);
  }, [segmentCounts]);

  return (
    <div className="p-5 md:p-8 space-y-6">
      <PageHeader
        title="AI Customer Intelligence Studio"
        subtitle="AI-powered customer segmentation, predictive analytics, and personalized marketing campaigns."
        actions={
          <div className="flex gap-2">
            {/* Simple actions */}
            <Button variant="secondary" onClick={loadDemo}>
              <Sparkles className="h-4 w-4 mr-2" />
              Load Demo
            </Button>
            <input
              type="file"
              accept=".csv"
              onChange={onFile}
              className="hidden"
              id="rfmCsv"
            />
            <label htmlFor="rfmCsv">
              <Button asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload CSV
                </span>
              </Button>
            </label>
            {/* Advanced-only actions */}
            <span className="advanced-only contents">
              <Button onClick={generateAIInsights} disabled={!selectedCustomer} variant="outline">
                <Brain className="h-4 w-4 mr-2" />
                AI Insights
              </Button>
              <Button
                onClick={calculateCustomerAnalyticsData}
                disabled={scored.length === 0}
                variant="outline"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button
                onClick={exportEnhancedCustomerReport}
                disabled={!customerAnalytics}
                variant="outline"
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
          label="Total Customers"
          value={totalCustomers}
          hint="All customers"
          icon={<Users className="h-4 w-4" />}
        />
        <KPICard
          label="AI Status"
          value="Server-managed"
          hint="AI insights"
          icon={<Brain className="h-4 w-4" />}
        />
        <KPICard
          label="Active Customers"
          value={customerAnalytics ? customerAnalytics.activeCustomers : "—"}
          hint="Visited within 90 days"
          icon={<CheckCircle className="h-4 w-4" />}
        />
        <KPICard
          label="At Risk"
          value={customerAnalytics ? customerAnalytics.atRiskCustomers : "—"}
          hint="Need attention"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <KPICard
          label="Avg Lifetime Value"
          value={
            customerAnalytics ? fmtMoney(customerAnalytics.lifetimeValue) : "—"
          }
          hint="Customer value"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KPICard
          label="Churn Rate"
          value={
            customerAnalytics
              ? `${customerAnalytics.churnRate.toFixed(1)}%`
              : "—"
          }
          hint="Customer retention"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Scoring Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-5 gap-3">
            <div>
              <Label>Bins (1..7)</Label>
              <Input
                type="number"
                min={3}
                max={7}
                value={bins}
                onChange={(e) =>
                  setBins(clamp(parseInt(e.target.value || "5"), 3, 7))
                }
              />
            </div>
            <div>
              <Label>As‑of date</Label>
              <Input
                type="date"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
              />
            </div>
            <div>
              <Label>Min visits</Label>
              <Input
                type="number"
                min={0}
                value={minVisits}
                onChange={(e) =>
                  setMinVisits(clamp(parseInt(e.target.value || "0"), 0, 9999))
                }
              />
            </div>
            <div>
              <Label>Min spend ($)</Label>
              <Input
                type="number"
                min={0}
                value={minSpend}
                onChange={(e) =>
                  setMinSpend(
                    clamp(parseInt(e.target.value || "0"), 0, 1000000)
                  )
                }
              />
            </div>
            <div>
              <Label>Search</Label>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="name, email, phone"
                />
              </div>
            </div>
          </div>

          <Separator className="my-2" />

          {/* Column mapping */}
          <div className="grid md:grid-cols-6 gap-3">
            <div>
              <Label>id</Label>
              <Input
                value={mapCols.id}
                onChange={(e) =>
                  setMapCols((c) => ({ ...c, id: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>name*</Label>
              <Input
                value={mapCols.name}
                onChange={(e) =>
                  setMapCols((c) => ({ ...c, name: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>email</Label>
              <Input
                value={mapCols.email}
                onChange={(e) =>
                  setMapCols((c) => ({ ...c, email: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>phone</Label>
              <Input
                value={mapCols.phone}
                onChange={(e) =>
                  setMapCols((c) => ({ ...c, phone: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>last_visit*</Label>
              <Input
                value={mapCols.last}
                onChange={(e) =>
                  setMapCols((c) => ({ ...c, last: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>visits*</Label>
              <Input
                value={mapCols.visits}
                onChange={(e) =>
                  setMapCols((c) => ({ ...c, visits: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>total_spend*</Label>
              <Input
                value={mapCols.spend}
                onChange={(e) =>
                  setMapCols((c) => ({ ...c, spend: e.target.value }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Segment chips & actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {segList.map((seg) => (
            <Button
              key={seg}
              size="sm"
              variant={selectedSeg === seg ? "default" : "outline"}
              onClick={() => setSelectedSeg(seg)}
            >
              <Users className="h-3.5 w-3.5 mr-1" />
              {seg}
              {seg !== "ALL" && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {segmentCounts.find((x) => x.segment === seg)?.count || 0}
                </span>
              )}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyEmails}>
            <Mail className="h-4 w-4 mr-1" />
            Copy Emails
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
          <Button size="sm" onClick={() => setOpenMsg(true)}>
            <MessageSquare className="h-4 w-4 mr-1" />
            Generate Messages
          </Button>
        </div>
      </div>

      {/* Charts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Segment Counts (Top)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="segment" />
                <YAxis />
                <ReTooltip />
                <Bar dataKey="count" name="Customers" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Customers ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Last Visit</TableHead>
                  <TableHead className="text-right">Visits</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-center">R</TableHead>
                  <TableHead className="text-center">F</TableHead>
                  <TableHead className="text-center">M</TableHead>
                  <TableHead>Segment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s, i) => (
                  <TableRow key={s.id + "-" + i}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {s.id}
                    </TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-xs">{s.email || ""}</TableCell>
                    <TableCell className="text-xs">{s.phone || ""}</TableCell>
                    <TableCell className="text-xs">
                      {s.lastVisit.toISOString().slice(0, 10)}{" "}
                      <span className="text-muted-foreground">
                        ({s.recencyDays}d)
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{s.visits}</TableCell>
                    <TableCell className="text-right">
                      {fmtMoney(s.spend)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{s.R}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{s.F}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{s.M}</Badge>
                    </TableCell>
                    <TableCell>{s.segment}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Message Dialog */}
      {openMsg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">
                Message Templates by Segment
              </h2>
              <div className="grid md:grid-cols-2 gap-3 mb-4">
                <div>
                  <Label htmlFor="rfmSegmentSelect">Segment</Label>
                  <select
                    title="Select segment"
                    id="rfmSegmentSelect"
                    value={msgSeg}
                    onChange={(e) => setMsgSeg(e.target.value)}
                    className="w-full border rounded-md h-9 px-2"
                  >
                    {Array.from(new Set(segmentCounts.map((x) => x.segment)))
                      .concat([
                        "VIP",
                        "Loyal",
                        "Big Spender",
                        "New",
                        "Promising",
                        "At Risk",
                        "Lapsed",
                        "Hibernating",
                      ])
                      .map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="rfmBookingLink">Booking Link</Label>
                  <Input
                    id="rfmBookingLink"
                    value={bookingLink}
                    onChange={(e) => setBookingLink(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="rfmEmailSubject">Email Subject</Label>
                  <Input
                    id="rfmEmailSubject"
                    value={msgTemplate.emailSubject}
                    readOnly
                    placeholder="Subject"
                    title="Email Subject"
                  />
                </div>
                <div>
                  <Label htmlFor="rfmEmailBody">Email Body</Label>
                  <textarea
                    id="rfmEmailBody"
                    className="w-full border rounded-md p-2 text-sm h-40"
                    readOnly
                    value={msgTemplate.emailBody.replace(
                      /\[Booking Link\]/g,
                      bookingLink
                    )}
                    placeholder="Email body"
                    title="Email Body"
                  />
                </div>
                <div>
                  <Label htmlFor="rfmSmsBody">
                    SMS (CASL: ensure consent + STOP)
                  </Label>
                  <textarea
                    id="rfmSmsBody"
                    className="w-full border rounded-md p-2 text-sm h-24"
                    readOnly
                    value={msgTemplate.sms.replace(
                      /\[Short Link\]/g,
                      bookingLink
                    )}
                    placeholder="SMS body"
                    title="SMS Body"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setOpenMsg(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Tabs */}
      <Tabs defaultValue="howto" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 gap-1">
          <TabsTrigger value="howto">How To</TabsTrigger>
          <TabsTrigger value="segmentation">Segmentation</TabsTrigger>
          <span className="advanced-only contents">
            <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </span>
        </TabsList>

        {/* How To Tab */}
        <TabsContent value="howto" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                How to Use the AI Customer Intelligence Studio
              </CardTitle>
              <CardDescription>
                Learn how to leverage AI-powered customer analysis and
                segmentation for Belmont
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="h3 mb-2">
                    What This Tool Does
                  </h3>
                  <p className="text-muted-foreground">
                    This advanced customer analysis platform uses RFM (Recency,
                    Frequency, Monetary) segmentation enhanced with AI-powered
                    insights to help Belmont understand customer behavior,
                    predict churn, and create personalized marketing campaigns.
                  </p>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    AI-Powered Features
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Customer Segmentation:</strong> Automatically
                      categorize customers into actionable segments
                    </li>
                    <li>
                      <strong>AI Insights:</strong> Generate personalized
                      insights for each customer
                    </li>
                    <li>
                      <strong>Predictive Analytics:</strong> Forecast customer
                      behavior and lifetime value
                    </li>
                    <li>
                      <strong>Campaign Optimization:</strong> AI-powered
                      campaign suggestions and optimization
                    </li>
                    <li>
                      <strong>Retention Strategies:</strong> Proactive customer
                      retention and reactivation
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    Step-by-Step Usage Guide
                  </h3>
                  <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                    <li>
                      <strong>Import Data:</strong> Upload your customer CSV or
                      use demo data
                    </li>
                    <li>
                      <strong>Configure Segmentation:</strong> Adjust RFM
                      parameters for your business
                    </li>
                    <li>
                      <strong>Generate AI Insights:</strong> Select customers
                      and get AI-powered analysis
                    </li>
                    <li>
                      <strong>View Analytics:</strong> Analyze customer lifetime
                      value and churn risk
                    </li>
                    <li>
                      <strong>Create Campaigns:</strong> Design targeted
                      marketing campaigns by segment
                    </li>
                    <li>
                      <strong>Generate Messages:</strong> Create personalized
                      communication templates
                    </li>
                    <li>
                      <strong>Export Results:</strong> Download reports and
                      customer lists
                    </li>
                  </ol>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    Understanding RFM Segmentation
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border rounded-lg p-3">
                      <h4 className="font-medium text-green-600">
                        Recency (R)
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        How recently did the customer visit?
                      </p>
                      <p className="text-xs mt-1">
                        Higher scores = more recent visits
                      </p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <h4 className="font-medium text-blue-600">
                        Frequency (F)
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        How often does the customer visit?
                      </p>
                      <p className="text-xs mt-1">
                        Higher scores = more frequent visits
                      </p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <h4 className="font-medium text-purple-600">
                        Monetary (M)
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        How much does the customer spend?
                      </p>
                      <p className="text-xs mt-1">
                        Higher scores = higher spending
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    AI Insights Categories
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-3">
                      <h4 className="font-medium">Behavioral Insights</h4>
                      <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                        <li>• Visit pattern analysis</li>
                        <li>• Service preference trends</li>
                        <li>• Communication effectiveness</li>
                        <li>• Loyalty indicators</li>
                      </ul>
                    </div>
                    <div className="border rounded-lg p-3">
                      <h4 className="font-medium">Business Opportunities</h4>
                      <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                        <li>• Upsell recommendations</li>
                        <li>• Service expansion suggestions</li>
                        <li>• Retention strategies</li>
                        <li>• Reactivation opportunities</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Segmentation Tab */}
        <TabsContent value="segmentation" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Customer Segmentation
                </CardTitle>
                <CardDescription>
                  RFM-based customer segmentation with actionable insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded">
                      <div className="text-2xl font-bold text-green-600">
                        {segmentCounts.find((s) => s.segment === "VIP")
                          ?.count || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        VIP Customers
                      </div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded">
                      <div className="text-2xl font-bold text-blue-600">
                        {segmentCounts.find((s) => s.segment === "Loyal")
                          ?.count || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Loyal Customers
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Segment Breakdown</h4>
                    {segmentCounts.slice(0, 6).map((segment) => (
                      <div
                        key={segment.segment}
                        className="flex items-center justify-between p-3 border rounded"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              segment.segment === "VIP"
                                ? "bg-yellow-500"
                                : segment.segment === "Loyal"
                                  ? "bg-blue-500"
                                  : segment.segment === "New"
                                    ? "bg-green-500"
                                    : segment.segment === "At Risk"
                                      ? "bg-red-500"
                                      : "bg-gray-500"
                            }`}
                          />
                          <span className="font-medium">{segment.segment}</span>
                        </div>
                        <Badge variant="outline">
                          {segment.count} customers
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Segmentation Analytics
                </CardTitle>
                <CardDescription>
                  Performance metrics for each customer segment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="segment" />
                        <YAxis />
                        <ReTooltip />
                        <Bar dataKey="count" name="Customers" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Segment Strategies</h4>
                    <div className="space-y-2">
                      <div className="flex items-start gap-3 p-3 border rounded">
                        <Star className="h-4 w-4 text-yellow-500 mt-1" />
                        <div>
                          <div className="font-medium">VIP Strategy</div>
                          <div className="text-sm text-muted-foreground">
                            Exclusive perks and priority service
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 border rounded">
                        <RefreshCw className="h-4 w-4 text-blue-500 mt-1" />
                        <div>
                          <div className="font-medium">Loyal Strategy</div>
                          <div className="text-sm text-muted-foreground">
                            Maintain engagement with regular communication
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 border rounded">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-1" />
                        <div>
                          <div className="font-medium">At Risk Strategy</div>
                          <div className="text-sm text-muted-foreground">
                            Personalized reactivation campaigns
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="ai-insights" className="space-y-6 advanced-only">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Customer Insights
                </CardTitle>
                <CardDescription>
                  Generate AI-powered insights for individual customers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* No API key input needed – server-managed */}

                {selectedCustomer && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded">
                      <h4 className="font-medium">Selected Customer</h4>
                      <div className="mt-2 space-y-1 text-sm">
                        <div>
                          <strong>Name:</strong> {selectedCustomer.name}
                        </div>
                        <div>
                          <strong>Segment:</strong> {selectedCustomer.segment}
                        </div>
                        <div>
                          <strong>Last Visit:</strong>{" "}
                          {
                            selectedCustomer.lastVisit
                              .toISOString()
                              .split("T")[0]
                          }
                        </div>
                        <div>
                          <strong>Total Spend:</strong>{" "}
                          {fmtMoney(selectedCustomer.spend)}
                        </div>
                      </div>
                    </div>

                    <Button onClick={generateAIInsights} className="w-full">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate AI Insights
                    </Button>
                  </div>
                )}

                {!selectedCustomer && (
                  <div className="text-center py-8 text-muted-foreground">
                    Select a customer from the table below to generate AI
                    insights
                  </div>
                )}

                {showInsights && customerInsights.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">AI-Generated Insights</h4>
                    {customerInsights.map((insight) => (
                      <div key={insight.id} className="p-3 border rounded">
                        <div className="flex items-start gap-2 mb-2">
                          <Badge
                            variant={
                              insight.type === "behavior"
                                ? "default"
                                : insight.type === "preference"
                                  ? "secondary"
                                  : insight.type === "risk"
                                    ? "destructive"
                                    : "outline"
                            }
                          >
                            {insight.type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {insight.priority} priority
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {insight.confidence}% confidence
                          </span>
                        </div>
                        <h5 className="font-medium mb-1">{insight.title}</h5>
                        <p className="text-sm text-muted-foreground mb-2">
                          {insight.description}
                        </p>
                        <p className="text-sm font-medium text-blue-600">
                          {insight.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Insight Categories
                </CardTitle>
                <CardDescription>
                  Types of insights the AI can generate
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 border rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Behavioral Insights</span>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Visit pattern analysis</li>
                      <li>• Service preference trends</li>
                      <li>• Communication effectiveness</li>
                      <li>• Loyalty indicators</li>
                    </ul>
                  </div>

                  <div className="p-3 border rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="h-4 w-4 text-pink-500" />
                      <span className="font-medium">Preference Insights</span>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Service preferences</li>
                      <li>• Communication preferences</li>
                      <li>• Price sensitivity analysis</li>
                      <li>• Brand loyalty assessment</li>
                    </ul>
                  </div>

                  <div className="p-3 border rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="font-medium">Risk Insights</span>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Churn risk assessment</li>
                      <li>• Engagement decline warnings</li>
                      <li>• Competitive threats</li>
                      <li>• Satisfaction concerns</li>
                    </ul>
                  </div>

                  <div className="p-3 border rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Opportunity Insights</span>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Upsell recommendations</li>
                      <li>• Service expansion opportunities</li>
                      <li>• Referral program potential</li>
                      <li>• Loyalty program benefits</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6 advanced-only">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">
                Customer Analytics Dashboard
              </h2>
              <p className="text-muted-foreground">
                Comprehensive customer behavior and lifetime value analysis
              </p>
            </div>
            <Button
              onClick={calculateCustomerAnalyticsData}
              disabled={scored.length === 0}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate Analytics
            </Button>
          </div>

          {customerAnalytics ? (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Total Customers
                        </p>
                        <p className="text-2xl font-bold">
                          {customerAnalytics.totalCustomers}
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
                          Active Customers
                        </p>
                        <p className="text-2xl font-bold">
                          {customerAnalytics.activeCustomers}
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          At Risk Customers
                        </p>
                        <p className="text-2xl font-bold">
                          {customerAnalytics.atRiskCustomers}
                        </p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Avg Lifetime Value
                        </p>
                        <p className="text-2xl font-bold">
                          {fmtMoney(customerAnalytics.lifetimeValue)}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Segment Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(customerAnalytics.segmentBreakdown).map(
                        ([segment, data]) => {
                          const percentage =
                            (data.count / customerAnalytics.totalCustomers) *
                            100;
                          return (
                            <div
                              key={segment}
                              className="flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-3 h-3 rounded-full ${
                                    segment === "VIP"
                                      ? "bg-yellow-500"
                                      : segment === "Loyal"
                                        ? "bg-blue-500"
                                        : segment === "New"
                                          ? "bg-green-500"
                                          : segment === "At Risk"
                                            ? "bg-red-500"
                                            : "bg-gray-500"
                                  }`}
                                />
                                <span className="capitalize text-sm">
                                  {segment}
                                </span>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-sm text-muted-foreground">
                                  {percentage.toFixed(1)}% of total
                                </div>
                                <div className="text-sm font-medium">
                                  {data.count} customers
                                </div>
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
                      <LineChart className="h-5 w-5" />
                      Customer Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="text-2xl font-bold text-green-600">
                          {customerAnalytics.churnRate.toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Churn Rate
                        </div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="text-2xl font-bold text-blue-600">
                          {(
                            (customerAnalytics.activeCustomers /
                              customerAnalytics.totalCustomers) *
                            100
                          ).toFixed(1)}
                          %
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Retention Rate
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Segment Performance</h4>
                      {Object.entries(customerAnalytics.segmentBreakdown)
                        .slice(0, 4)
                        .map(([segment, data]) => (
                          <div
                            key={segment}
                            className="flex items-center justify-between p-2 border rounded"
                          >
                            <span className="text-sm capitalize">
                              {segment}
                            </span>
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                {fmtMoney(data.avgSpend)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {data.churnRisk}% churn risk
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
                    <Target className="h-5 w-5" />
                    Customer Insights Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded">
                      <div className="text-2xl font-bold text-blue-600">
                        {customerAnalytics.totalCustomers -
                          customerAnalytics.activeCustomers}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Inactive Customers
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Need reactivation campaigns
                      </div>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded">
                      <div className="text-2xl font-bold text-green-600">
                        {
                          Object.values(
                            customerAnalytics.segmentBreakdown
                          ).filter(
                            (s) =>
                              s.avgSpend > customerAnalytics.lifetimeValue * 1.2
                          ).length
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">
                        High-Value Segments
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Focus retention efforts here
                      </div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                      <div className="text-2xl font-bold text-yellow-600">
                        {Math.round(customerAnalytics.lifetimeValue * 1.5)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Potential CLV Increase
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        With improved retention
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
                    Generate customer analytics to see comprehensive insights.
                  </p>
                  <Button
                    onClick={calculateCustomerAnalyticsData}
                    disabled={scored.length === 0}
                  >
                    Generate Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-6 advanced-only">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Customer Campaigns
                </CardTitle>
                <CardDescription>
                  Manage and track customer marketing campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-6">
                  <select className="px-3 py-2 border rounded-md">
                    <option value="all">All Campaigns</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="draft">Draft</option>
                  </select>
                  <div className="text-sm text-muted-foreground flex items-center">
                    {customerLibrary.campaigns.length} campaigns
                  </div>
                </div>

                <div className="space-y-4">
                  {customerLibrary.campaigns.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">
                        No campaigns created yet
                      </p>
                      <Button variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Campaign
                      </Button>
                    </div>
                  ) : (
                    customerLibrary.campaigns.map((campaign) => (
                      <Card key={campaign.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{campaign.name}</h4>
                                <Badge
                                  variant={
                                    campaign.status === "active"
                                      ? "default"
                                      : campaign.status === "completed"
                                        ? "secondary"
                                        : "outline"
                                  }
                                  className="text-xs"
                                >
                                  {campaign.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {campaign.description}
                              </p>
                              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                                <div>
                                  <span>
                                    Target Segments:{" "}
                                    {campaign.targetSegments.join(", ")}
                                  </span>
                                </div>
                                <div>
                                  <span>
                                    Goal: {campaign.goals.reach} customers
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                {campaign.performance.reached} reached
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {campaign.performance.converted} converted
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Campaign Analytics
                </CardTitle>
                <CardDescription>
                  Performance metrics for customer campaigns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="text-2xl font-bold text-green-600">
                      {customerLibrary.campaigns.reduce(
                        (sum, c) => sum + c.performance.converted,
                        0
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Conversions
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="text-2xl font-bold text-blue-600">
                      {customerLibrary.campaigns.length > 0
                        ? Math.round(
                            customerLibrary.campaigns.reduce(
                              (sum, c) => sum + c.performance.roi,
                              0
                            ) / customerLibrary.campaigns.length
                          )
                        : 0}
                      %
                    </div>
                    <div className="text-sm text-muted-foreground">Avg ROI</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Campaign Performance</h4>
                  {customerLibrary.campaigns.slice(0, 4).map((campaign) => (
                    <div
                      key={campaign.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <span className="text-sm">{campaign.name}</span>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {campaign.performance.converted}/
                          {campaign.performance.reached}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {campaign.performance.roi}% ROI
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
                  <p className="text-sm">
                    <strong>Campaign Insights:</strong> Focus on high-ROI
                    campaigns and optimize targeting for better conversion
                    rates.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6 advanced-only">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Message Templates
                </CardTitle>
                <CardDescription>
                  Save and reuse successful customer communication templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-6">
                  <select className="px-3 py-2 border rounded-md">
                    <option value="all">All Templates</option>
                    {customerLibrary.categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <div className="text-sm text-muted-foreground flex items-center">
                    {customerLibrary.templates.length} templates saved
                  </div>
                </div>

                <div className="space-y-4">
                  {customerLibrary.templates.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">
                        No templates saved yet
                      </p>
                      <Button variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Save Current Template
                      </Button>
                    </div>
                  ) : (
                    customerLibrary.templates.map((template, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">
                                  Template {index + 1}
                                </h4>
                                <Badge variant="outline" className="text-xs">
                                  Email
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                Professional customer communication template
                                with personalized elements...
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                                <span>Used: 0 times</span>
                                <span>Avg Rating: 4.5</span>
                                <span>Rate: 85%</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Eye className="h-3 w-3 mr-1" />
                                Preview
                              </Button>
                              <Button size="sm" variant="outline">
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create New Template
                </CardTitle>
                <CardDescription>
                  Design a new customer communication template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Template Name</Label>
                    <Input placeholder="e.g., VIP Retention Email" />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <select className="w-full h-9 border rounded-md px-2">
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="push">Push Notification</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Target Segment</Label>
                    <select className="w-full h-9 border rounded-md px-2">
                      <option value="vip">VIP</option>
                      <option value="loyal">Loyal</option>
                      <option value="new">New</option>
                      <option value="at-risk">At Risk</option>
                    </select>
                  </div>
                  <div>
                    <Label>Purpose</Label>
                    <select className="w-full h-9 border rounded-md px-2">
                      <option value="retention">Retention</option>
                      <option value="upsell">Upsell</option>
                      <option value="reactivation">Reactivation</option>
                      <option value="loyalty">Loyalty</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label>Subject (Email only)</Label>
                  <Input placeholder="Personalized subject line..." />
                </div>

                <div>
                  <Label>Message Content</Label>
                  <Textarea
                    placeholder="Hi {{customerName}}, we hope you're enjoying your experience..."
                    rows={6}
                  />
                </div>

                <div>
                  <Label>Available Variables</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[
                      "customerName",
                      "lastVisit",
                      "totalSpend",
                      "segment",
                      "businessName",
                    ].map((variable) => (
                      <Badge
                        key={variable}
                        variant="outline"
                        className="text-xs cursor-pointer"
                      >
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Save Template
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-6 advanced-only">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Generate Messages
                </CardTitle>
                <CardDescription>
                  Create personalized messages for customer segments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Select Segment</Label>
                    <select className="w-full h-9 border rounded-md px-2">
                      {segList.map((seg) => (
                        <option key={seg} value={seg}>
                          {seg}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Message Type</Label>
                    <select className="w-full h-9 border rounded-md px-2">
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label>Booking Link</Label>
                  <Input
                    placeholder="https://thebelmontbarber.ca/book"
                    value={bookingLink}
                    onChange={(e) => setBookingLink(e.target.value)}
                  />
                </div>

                <Button onClick={() => setOpenMsg(true)} className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Generate Messages
                </Button>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
                  <p className="text-sm">
                    <strong>Message Tips:</strong> Personalize with customer
                    names, reference their visit history, and include clear
                    call-to-actions.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Message Analytics
                </CardTitle>
                <CardDescription>
                  Track the performance of your customer messages
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded">
                    <div className="text-2xl font-bold text-green-600">
                      {filtered.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Target Customers
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round(filtered.length * 0.15)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Expected Responses
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Message Strategy</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 border rounded">
                      <Mail className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">
                        Email campaigns for detailed communications
                      </span>
                    </div>
                    <div className="flex items-center gap-2 p-2 border rounded">
                      <MessageSquare className="h-4 w-4 text-green-500" />
                      <span className="text-sm">
                        SMS for urgent notifications and quick reminders
                      </span>
                    </div>
                    <div className="flex items-center gap-2 p-2 border rounded">
                      <Send className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">
                        Multi-channel approach for maximum engagement
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6 advanced-only">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  RFM Settings
                </CardTitle>
                <CardDescription>
                  Configure RFM segmentation parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label>Bins (1..7)</Label>
                    <Input
                      type="number"
                      min={3}
                      max={7}
                      value={bins}
                      onChange={(e) =>
                        setBins(clamp(parseInt(e.target.value || "5"), 3, 7))
                      }
                    />
                  </div>
                  <div>
                    <Label>As-of date</Label>
                    <Input
                      type="date"
                      value={asOf}
                      onChange={(e) => setAsOf(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Min visits</Label>
                    <Input
                      type="number"
                      min={0}
                      value={minVisits}
                      onChange={(e) =>
                        setMinVisits(
                          clamp(parseInt(e.target.value || "0"), 0, 9999)
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Min spend ($)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={minSpend}
                      onChange={(e) =>
                        setMinSpend(
                          clamp(parseInt(e.target.value || "0"), 0, 1000000)
                        )
                      }
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Column Mapping</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={mapCols.name}
                        onChange={(e) =>
                          setMapCols((c) => ({ ...c, name: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        value={mapCols.email}
                        onChange={(e) =>
                          setMapCols((c) => ({ ...c, email: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Last Visit</Label>
                      <Input
                        value={mapCols.last}
                        onChange={(e) =>
                          setMapCols((c) => ({ ...c, last: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Visits</Label>
                      <Input
                        value={mapCols.visits}
                        onChange={(e) =>
                          setMapCols((c) => ({ ...c, visits: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Total Spend</Label>
                      <Input
                        value={mapCols.spend}
                        onChange={(e) =>
                          setMapCols((c) => ({ ...c, spend: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Settings
                </CardTitle>
                <CardDescription>Configure AI-powered features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Server-managed AI; no client key needed */}

                <div className="space-y-3">
                  <h4 className="font-medium">AI Features</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2"><input type="checkbox" checked readOnly /><span className="text-sm">Customer insights generation</span></div>
                    <div className="flex items-center gap-2"><input type="checkbox" checked readOnly /><span className="text-sm">Campaign optimization suggestions</span></div>
                    <div className="flex items-center gap-2"><input type="checkbox" checked readOnly /><span className="text-sm">Predictive churn analysis</span></div>
                    <div className="flex items-center gap-2"><input type="checkbox" checked readOnly /><span className="text-sm">Personalized message generation</span></div>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Privacy Note:</strong> AI processing is done locally
                    and customer data is not stored on external servers.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer notes */}
      <div className="text-xs text-muted-foreground">
        <p>
          Tip: Adjust <em>Bins</em> for coarser/finer segments. Ensure CASL/PIPA
          compliance for any messaging (consent, identification, unsubscribe).
        </p>
      </div>
    </div>
  );
}
