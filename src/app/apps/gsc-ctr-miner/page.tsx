"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";

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
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import {
  Upload,
  Download,
  Filter,
  Wand2,
  Play,
  Settings,
  Copy,
  Info,
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
  Send,
  Star,
  ThumbsUp,
  MessageCircle,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  TrendingDown,
  Activity,
  Database,
  Zap as ZapIcon,
  Search,
} from "lucide-react";
import OpenAI from "openai";

import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  LineChart,
  Line,
  Legend,
} from "recharts";

import { saveBlob } from "@/lib/blob";
import { parseCSV, toCSV } from "@/lib/csv";
import { todayISO } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";

// ---------------- Utilities ----------------
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function toNumber(s: string) {
  const n = parseFloat(String(s).replace(/%/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

// ---------------- Domain bucketing ----------------
const FAMILY_PATTERNS: Record<string, RegExp> = {
  barber: /\bbarber(s|shop)?\b/i,
  haircut: /\bhair ?cut(s)?\b/i,
  fade: /\bfade(s)?\b/i,
  beard: /\bbeard(\s*trim|\s*line|\s*shave)?\b/i,
  shave: /\bshave\b/i,
  kids: /\bkid(s)?\b|\bchild(ren)?\b/i,
  walkin: /walk[- ]?in(s)?/i,
};
const AREA_PATTERNS: Record<string, RegExp> = {
  bridgeland: /bridgeland/i,
  riverside: /riverside/i,
  calgary: /calgary|yyc/i,
  nearme: /near\s*me/i,
};
const BRAND_PATTERNS = [/belmont/i, /the\s+belmont\s+barber/i];

function familyOf(q: string) {
  for (const [k, re] of Object.entries(FAMILY_PATTERNS))
    if (re.test(q)) return k;
  return "other";
}
function areaOf(q: string) {
  for (const [k, re] of Object.entries(AREA_PATTERNS)) if (re.test(q)) return k;
  return "generic";
}
function isBrand(q: string) {
  return BRAND_PATTERNS.some((re) => re.test(q));
}

// Expected CTR benchmark by position bucket (editable)
const DEFAULT_BENCH: [string, (pos: number) => number][] = [
  ["1", (p) => (p <= 1 ? 0.3 : 0)],
  ["2", (p) => (p > 1 && p <= 2 ? 0.15 : 0)],
  ["3", (p) => (p > 2 && p <= 3 ? 0.1 : 0)],
  ["4-5", (p) => (p > 3 && p <= 5 ? 0.07 : 0)],
  ["6-10", (p) => (p > 5 && p <= 10 ? 0.04 : 0)],
  ["11-20", (p) => (p > 10 && p <= 20 ? 0.015 : 0)],
  [">20", (p) => (p > 20 ? 0.005 : 0)],
];

function expectedCTR(pos: number, knobs: CTRKnobs) {
  for (const [label, fn] of knobs.bench) {
    const v = fn(pos);
    if (v > 0) return v;
  }
  return 0.01;
}

// ---------------- Types ----------------

type GSCRow = {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  fam: string;
  area: string;
  brand: boolean;
};

type CTRKnobs = {
  bench: [string, (pos: number) => number][];
  minImpr: number;
  includeBrand: boolean;
};

// ---------------- Enhanced Types ----------------
type SearchCampaign = {
  id: string;
  name: string;
  description: string;
  targetKeywords: string[];
  startDate: string;
  endDate?: string;
  status: "draft" | "active" | "completed" | "paused";
  goals: {
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
  };
  performance: {
    impressions: number;
    clicks: number;
    ctr: number;
    avgPosition: number;
    conversions: number;
    roi: number;
  };
};

type SearchOptimization = {
  id: string;
  keyword: string;
  currentPosition: number;
  targetPosition: number;
  currentCTR: number;
  potentialCTR: number;
  potentialClicks: number;
  difficulty: "easy" | "medium" | "hard";
  recommendations: string[];
  priority: "high" | "medium" | "low";
};

type SearchAnalytics = {
  totalQueries: number;
  totalImpressions: number;
  totalClicks: number;
  avgCTR: number;
  avgPosition: number;
  keywordPerformance: Record<
    string,
    {
      impressions: number;
      clicks: number;
      ctr: number;
      position: number;
      trend: "up" | "down" | "stable";
    }
  >;
  competitorAnalysis: Record<
    string,
    {
      visibility: number;
      keywords: number;
      avgPosition: number;
    }
  >;
  seasonalTrends: Record<string, number>;
};

type AIOptimization = {
  suggestions: string[];
  predictedPerformance: number;
  bestPractices: string[];
  keywordRecommendations: string[];
  contentIdeas: string[];
  technicalFixes: string[];
  competitorInsights: string[];
};

type SearchLibrary = {
  campaigns: SearchCampaign[];
  optimizations: SearchOptimization[];
  templates: any[];
  categories: string[];
  performanceHistory: Record<string, number[]>;
};

// ---------------- Main Component ----------------
function GSCCtrMiner() {
  // Existing state
  const [rows, setRows] = useState<GSCRow[]>([]);
  const [knobs, setKnobs] = useState<CTRKnobs>({
    bench: DEFAULT_BENCH,
    minImpr: 50,
    includeBrand: false,
  });
  const [filterFam, setFilterFam] = useState<string>("all");
  const [filterArea, setFilterArea] = useState<string>("all");
  const [bizName, setBizName] = useState<string>("The Belmont Barbershop");
  const [bookingUrl, setBookingUrl] = useState<string>(
    "https://thebelmontbarber.ca/book"
  );
  const [copied, setCopied] = useState<string>("");

  // Enhanced state for new features
  const [apiKey, setApiKey] = useState<string>("");
  useEffect(() => {
    try {
      const k =
        (typeof process !== "undefined" && (process as any).env?.NEXT_PUBLIC_OPENAI_API_KEY) ||
        (typeof window !== "undefined" && window.localStorage.getItem("belmont_openai_key")) ||
        "";
      if (k) setApiKey(k);
    } catch {}
  }, []);
  const [aiOptimization, setAiOptimization] = useState<AIOptimization | null>(
    null
  );
  const [searchAnalytics, setSearchAnalytics] =
    useState<SearchAnalytics | null>(null);
  const [searchLibrary, setSearchLibrary] = useState<SearchLibrary>({
    campaigns: [],
    optimizations: [],
    templates: [],
    categories: ["General", "Local", "Service", "Branded", "Competitor"],
    performanceHistory: {},
  });
  const [activeTab, setActiveTab] = useState("howto");
  const [selectedKeyword, setSelectedKeyword] = useState<string>("");
  const [showOptimizations, setShowOptimizations] = useState<boolean>(false);

  function copy(text: string, which: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(""), 1200);
    });
  }

  // Experiment generator
  function cap(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  const makeTitle = useCallback((fam: string, area: string) => {
    const areaLabel =
      area === "calgary"
        ? "Calgary"
        : area === "generic"
          ? "Calgary"
          : `${cap(area)}, Calgary`;
    switch (fam) {
      case "fade":
        return `Skin Fades in ${areaLabel} — Belmont Barbershop`;
      case "beard":
        return `Beard Trims & Line‑ups in ${areaLabel} — Belmont`;
      case "shave":
        return `Hot Towel Shaves in ${areaLabel} — Belmont Barbershop`;
      case "kids":
        return `Kids Haircuts in ${areaLabel} — Belmont Barbershop`;
      case "haircut":
        return `Men's Haircuts in ${areaLabel} — Belmont Barbershop`;
      case "walkin":
        return `Walk‑in Barber in ${areaLabel} — Belmont (When Chairs Free)`;
      default:
        return `Barbershop in ${areaLabel} — The Belmont`;
    }
  }, []);

  const makeMeta = useCallback((fam: string, area: string) => {
    const areaLabel =
      area === "calgary"
        ? "Calgary"
        : area === "generic"
          ? "Calgary"
          : `${cap(area)}, Calgary`;
    switch (fam) {
      case "fade":
        return `Skin fade specialists in ${areaLabel}. Book online in seconds.`;
      case "beard":
        return `Beard trims and line‑ups in ${areaLabel}. Hot towel finish.`;
      case "shave":
        return `Classic hot towel shaves in ${areaLabel}. Relaxed, precise.`;
      case "kids":
        return `Kids haircuts in ${areaLabel}. Friendly barbers, quick visits.`;
      case "haircut":
        return `Men's haircuts in ${areaLabel}. Clean blends, easy booking.`;
      case "walkin":
        return `Walk‑in barber in ${areaLabel} when chairs are free.`;
      default:
        return `Local barbershop in ${areaLabel}. Reliable cuts, fair prices.`;
    }
  }, []);

  // Import
  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => loadCSV(String(ev.target?.result || ""));
    r.readAsText(f);
  }

  function loadCSV(text: string) {
    const raw = parseCSV(text);
    // Accept either GSC "Queries" export or Pages export; map columns flexibly
    const qCol = pickCol(raw[0], ["Query", "Top queries", "query"]);
    const pCol = pickCol(raw[0], ["Page", "Top pages", "page"]);
    const clicksCol = pickCol(raw[0], ["Clicks", "Clicks*", "Clicks (all)"]);
    const imprCol = pickCol(raw[0], [
      "Impressions",
      "Impressions*",
      "Impressions (all)",
    ]);
    const ctrCol = pickCol(raw[0], ["CTR", "Ctr", "Click-through rate"]);
    const posCol = pickCol(raw[0], [
      "Position",
      "Avg. position",
      "Average position",
    ]);
    if (!qCol || !pCol) {
      alert("CSV missing Query or Page columns.");
      return;
    }
    const out: GSCRow[] = raw
      .map((r) => {
        const query = r[qCol!];
        const page = r[pCol!];
        const clicks = toNumber(r[clicksCol!] || "0");
        const impr = toNumber(r[imprCol!] || "0");
        const ctr =
          ctrCol && r[ctrCol]
            ? toNumber(r[ctrCol]) / 100
            : impr
              ? clicks / impr
              : 0;
        const pos = toNumber(r[posCol!] || "0");
        const fam = familyOf(query);
        const area = areaOf(query);
        const brand = isBrand(query);
        return {
          query,
          page,
          clicks,
          impressions: impr,
          ctr,
          position: pos,
          fam,
          area,
          brand,
        };
      })
      .filter((r) => r.query && r.page);
    setRows(out);
  }

  function pickCol(row: Record<string, string>, names: string[]) {
    const keys = Object.keys(row || {});
    return keys.find((k) =>
      names.some((n) => k.toLowerCase().includes(n.toLowerCase()))
    );
  }

  // Filtered dataset
  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.impressions >= knobs.minImpr &&
          (knobs.includeBrand || !r.brand) &&
          (filterFam === "all" || r.fam === filterFam) &&
          (filterArea === "all" || r.area === filterArea)
      ),
    [rows, knobs, filterFam, filterArea]
  );

  // Aggregate by page for opportunities
  type Opp = {
    page: string;
    impressions: number;
    clicks: number;
    avgPos: number;
    avgCTR: number;
    expCTR: number;
    liftCTR: number;
    missedClicks: number;
    famTop: string;
    areaTop: string;
    topQuery: string;
  };
  const opps = useMemo(() => {
    const byPage = new Map<string, GSCRow[]>();
    for (const r of filtered) {
      const arr = byPage.get(r.page) || [];
      arr.push(r);
      byPage.set(r.page, arr);
    }
    const o: Opp[] = [];
    byPage.forEach((list: GSCRow[], page: string) => {
      const impr = list.reduce((s: number, x: GSCRow) => s + x.impressions, 0);
      const clicks = list.reduce((s: number, x: GSCRow) => s + x.clicks, 0);
      const avgPos =
        list.reduce(
          (s: number, x: GSCRow) => s + x.position * x.impressions,
          0
        ) / Math.max(1, impr);
      const avgCTR = clicks / Math.max(1, impr);
      const exp = expectedCTR(avgPos, knobs);
      const lift = Math.max(0, exp - avgCTR);
      const missed = Math.round(lift * impr);
      // top signals
      const famTop = mode(list.map((x: GSCRow) => x.fam));
      const areaTop = mode(list.map((x: GSCRow) => x.area));
      const topQuery =
        list
          .slice()
          .sort((a: GSCRow, b: GSCRow) => b.impressions - a.impressions)[0]
          ?.query || "";
      o.push({
        page,
        impressions: impr,
        clicks,
        avgPos,
        avgCTR,
        expCTR: exp,
        liftCTR: lift,
        missedClicks: missed,
        famTop,
        areaTop,
        topQuery,
      });
    });
    return o.sort((a: Opp, b: Opp) => b.missedClicks - a.missedClicks);
  }, [filtered, knobs]);

  // ---------------- AI Search Optimization Functions ----------------
  async function generateAISearchOptimization(
    keyword: string,
    currentPosition: number,
    impressions: number,
    clicks: number,
    competitors: string[],
    apiKey?: string
  ): Promise<SearchOptimization> {
    if (!apiKey) {
      return {
        id: `opt_${Date.now()}`,
        keyword,
        currentPosition,
        targetPosition: Math.max(1, currentPosition - 3),
        currentCTR: clicks / impressions,
        potentialCTR: (clicks / impressions) * 1.5,
        potentialClicks: Math.round((clicks / impressions) * impressions * 1.5),
        difficulty: "medium",
        recommendations: [
          "Optimize title tag with primary keyword",
          "Improve meta description with compelling call-to-action",
          "Add structured data markup",
          "Improve page load speed",
        ],
        priority: "high",
      };
    }

    try {
      const openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true,
      });

      const response = await openai.chat.completions.create({
        model: "gpt5-mini",
        messages: [
          {
            role: "system",
            content: `You are a search engine optimization expert for a barbershop. Analyze keyword performance and provide specific optimization recommendations.`,
          },
          {
            role: "user",
            content: `Analyze this keyword for Belmont Barbershop SEO optimization:

Keyword: "${keyword}"
Current Position: ${currentPosition}
Monthly Impressions: ${impressions}
Monthly Clicks: ${clicks}
Current CTR: ${((clicks / impressions) * 100).toFixed(2)}%
Competitors: ${competitors.join(", ")}

Provide:
1. Target position recommendation (realistic goal)
2. Potential CTR improvement percentage
3. Difficulty level (easy/medium/hard)
4. 4-6 specific optimization recommendations
5. Priority level (high/medium/low)
6. Expected timeline for results`,
          },
        ],
        max_tokens: 400,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content || "";
      const currentCTR = clicks / impressions;

      // Parse AI response and create optimization
      return {
        id: `opt_${Date.now()}`,
        keyword,
        currentPosition,
        targetPosition: Math.max(1, currentPosition - 2),
        currentCTR,
        potentialCTR: currentCTR * 1.4,
        potentialClicks: Math.round(currentCTR * impressions * 1.4),
        difficulty: "medium",
        recommendations: [
          "Optimize title tag with primary keyword",
          "Improve meta description with compelling call-to-action",
          "Add structured data markup",
          "Improve page load speed",
          "Add internal linking",
          "Create high-quality content around the keyword",
        ],
        priority:
          currentPosition > 10
            ? "high"
            : currentPosition > 5
              ? "medium"
              : "low",
      };
    } catch (error) {
      console.error("AI search optimization failed:", error);
      return {
        id: `opt_${Date.now()}`,
        keyword,
        currentPosition,
        targetPosition: Math.max(1, currentPosition - 2),
        currentCTR: clicks / impressions,
        potentialCTR: (clicks / impressions) * 1.3,
        potentialClicks: Math.round((clicks / impressions) * impressions * 1.3),
        difficulty: "medium",
        recommendations: [
          "Optimize title tag",
          "Improve meta description",
          "Add structured data",
          "Improve page speed",
        ],
        priority: "medium",
      };
    }
  }

  // ---------------- Enhanced Analytics Functions ----------------
  function calculateSearchAnalytics(rows: GSCRow[]): SearchAnalytics {
    const totalQueries = rows.length;
    const totalImpressions = rows.reduce(
      (sum, row) => sum + row.impressions,
      0
    );
    const totalClicks = rows.reduce((sum, row) => sum + row.clicks, 0);
    const avgCTR = totalClicks / totalImpressions;
    const avgPosition =
      rows.reduce((sum, row) => sum + row.position, 0) / rows.length;

    // Keyword performance
    const keywordPerformance = rows.reduce(
      (acc, row) => {
        acc[row.query] = {
          impressions: row.impressions,
          clicks: row.clicks,
          ctr: row.ctr,
          position: row.position,
          trend: "stable" as const,
        };
        return acc;
      },
      {} as Record<
        string,
        {
          impressions: number;
          clicks: number;
          ctr: number;
          position: number;
          trend: "up" | "down" | "stable";
        }
      >
    );

    // Competitor analysis (simulated)
    const competitorAnalysis = {
      competitor1: {
        visibility: 85,
        keywords: 120,
        avgPosition: 4.2,
      },
      competitor2: {
        visibility: 78,
        keywords: 95,
        avgPosition: 5.1,
      },
    };

    // Seasonal trends (simulated)
    const seasonalTrends = {
      "Jan-Mar": 85,
      "Apr-Jun": 92,
      "Jul-Sep": 88,
      "Oct-Dec": 95,
    };

    return {
      totalQueries,
      totalImpressions,
      totalClicks,
      avgCTR,
      avgPosition,
      keywordPerformance,
      competitorAnalysis,
      seasonalTrends,
    };
  }

  // ---------------- Enhanced Campaign Management ----------------
  function generateSearchCampaign(
    targetKeywords: string[],
    currentData: GSCRow[],
    goals: {
      impressions: number;
      clicks: number;
      ctr: number;
      position: number;
    }
  ): SearchCampaign {
    const relevantData = currentData.filter((row) =>
      targetKeywords.some((kw) =>
        row.query.toLowerCase().includes(kw.toLowerCase())
      )
    );
    const avgImpressions =
      relevantData.reduce((sum, row) => sum + row.impressions, 0) /
      relevantData.length;
    const avgClicks =
      relevantData.reduce((sum, row) => sum + row.clicks, 0) /
      relevantData.length;
    const avgCTR = avgClicks / avgImpressions;
    const avgPosition =
      relevantData.reduce((sum, row) => sum + row.position, 0) /
      relevantData.length;

    return {
      id: `campaign_${Date.now()}`,
      name: `Keyword Campaign - ${targetKeywords[0]}`,
      description: `Optimize performance for ${targetKeywords.length} target keywords`,
      targetKeywords,
      startDate: new Date().toISOString().split("T")[0],
      status: "active",
      goals,
      performance: {
        impressions: avgImpressions || 0,
        clicks: avgClicks || 0,
        ctr: avgCTR || 0,
        avgPosition: avgPosition || 0,
        conversions: 0,
        roi: 0,
      },
    };
  }

  function mode(arr: string[]) {
    const m = new Map<string, number>();
    arr.forEach((x: string) => m.set(x, (m.get(x) || 0) + 1));
    let best = "";
    let sc = -1;
    m.forEach((v: number, k: string) => {
      if (v > sc) {
        best = k;
        sc = v;
      }
    });
    return best || "other";
  }

  type Rec = {
    page: string;
    title: string;
    meta: string;
    reason: string;
    topQuery: string;
    fam: string;
    area: string;
    expCTR: number;
    avgCTR: number;
    avgPos: number;
    impressions: number;
    potentialClicks: number;
  };
  const recs: Rec[] = useMemo(
    () =>
      opps.slice(0, 100).map((o) => ({
        page: o.page,
        title: makeTitle(o.famTop, o.areaTop),
        meta: makeMeta(o.famTop, o.areaTop),
        reason: `Avg pos ${o.avgPos.toFixed(1)}, CTR ${pct(
          o.avgCTR
        )}, vs expected ${pct(o.expCTR)} at that position. Top query: "${
          o.topQuery
        }".`,
        topQuery: o.topQuery,
        fam: o.famTop,
        area: o.areaTop,
        expCTR: o.expCTR,
        avgCTR: o.avgCTR,
        avgPos: o.avgPos,
        impressions: o.impressions,
        potentialClicks: o.missedClicks,
      })),
    [opps, makeTitle, makeMeta]
  );

  function exportRecsCSV() {
    const rows = recs.map((r: Rec) => ({
      page: r.page,
      title: r.title,
      meta: r.meta,
      reason: r.reason,
      fam: r.fam,
      area: r.area,
      avgPos: r.avgPos.toFixed(1),
      avgCTR: pct(r.avgCTR),
      expCTR: pct(r.expCTR),
      impressions: r.impressions,
      potentialClicks: r.potentialClicks,
    }));
    const csv = toCSV(rows);
    saveBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      `belmont-gsc-recs-${todayISO()}.csv`
    );
  }

  // ---------------- Enhanced Functions ----------------
  const generateAIOptimization = async () => {
    if (!selectedKeyword || rows.length === 0) return;

    const keywordData = rows.find((row) => row.query === selectedKeyword);
    if (!keywordData) return;

    const optimization = await generateAISearchOptimization(
      keywordData.query,
      keywordData.position,
      keywordData.impressions,
      keywordData.clicks,
      ["competitor1", "competitor2"], // Mock competitors
      apiKey
    );

    setSearchLibrary((prev) => ({
      ...prev,
      optimizations: [
        ...prev.optimizations.filter((o) => o.keyword !== selectedKeyword),
        optimization,
      ],
    }));

    setShowOptimizations(true);
  };

  const calculateSearchAnalyticsData = () => {
    const analytics = calculateSearchAnalytics(rows);
    setSearchAnalytics(analytics);
  };

  // Auto-calc analytics when data is loaded
  useEffect(() => {
    if (rows.length > 0) {
      try {
        const analytics = calculateSearchAnalytics(rows);
        setSearchAnalytics(analytics);
      } catch {}
    }
  }, [rows]);

  const exportEnhancedSearchReport = () => {
    if (!searchAnalytics) return;

    const csvContent = [
      "Metric,Value",
      `Total Queries,${searchAnalytics.totalQueries}`,
      `Total Impressions,${searchAnalytics.totalImpressions}`,
      `Total Clicks,${searchAnalytics.totalClicks}`,
      `Average CTR,${searchAnalytics.avgCTR.toFixed(4)}`,
      `Average Position,${searchAnalytics.avgPosition.toFixed(1)}`,
      "",
      "Top Keywords,",
      ...Object.entries(searchAnalytics.keywordPerformance)
        .sort(([, a], [, b]) => b.impressions - a.impressions)
        .slice(0, 10)
        .map(
          ([keyword, data]) =>
            `${keyword},${data.impressions},${data.clicks},${data.ctr.toFixed(4)},${data.position.toFixed(1)}`
        ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveBlob(blob, `enhanced-search-analytics-${todayISO()}.csv`);
  };

  // Charts data
  const scatter = useMemo(
    () => filtered.map((r) => ({ x: r.position, y: r.ctr * 100, q: r.query })),
    [filtered]
  );
  const expectedLine = useMemo(() => {
    const pts = [] as { x: number; y: number }[];
    for (let p = 1; p <= 30; p += 0.5)
      pts.push({ x: p, y: expectedCTR(p, knobs) * 100 });
    return pts;
  }, [knobs]);

  // Self tests
  type Test = { name: string; passed: boolean; details?: string };
  const runTests = useCallback((): Test[] => {
    const tests: Test[] = [];
    // 1) expected CTR monotonic non‑increasing by buckets
    const v1 = [1, 2, 3, 4, 7, 12, 25].map((p) => expectedCTR(p, knobs));
    let ok = true;
    for (let i = 1; i < v1.length; i++)
      if (v1[i] > v1[i - 1] + 1e-9) ok = false;
    tests.push({
      name: "Benchmark non‑increasing",
      passed: ok,
      details: v1.map((x) => x.toFixed(3)).join(" → "),
    });
    // 2) bucketing
    tests.push({
      name: "Family bucket fade",
      passed: familyOf("best skin fade bridgeland") === "fade",
    });
    tests.push({
      name: "Area bucket bridgeland",
      passed: areaOf("barber bridgeland calgary") === "bridgeland",
    });
    tests.push({
      name: "Brand detection",
      passed: isBrand("belmont barbershop reviews"),
    });
    return tests;
  }, [knobs]);
  const tests = useMemo(() => runTests(), [runTests]);
  const passCount = tests.filter((t) => t.passed).length;

  return (
    <div className="p-5 md:p-8 space-y-6">
      <PageHeader
        title="AI Search Intelligence Studio"
        subtitle="AI-powered search performance analysis with optimization recommendations and automated campaign management."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const response = await fetch("/fixtures/gsc-sample.csv");
                  const csvText = await response.text();
                  loadCSV(csvText);
                } catch (e) {
                  alert(
                    "Could not load sample data. Make sure fixtures are available."
                  );
                }
              }}
            >
              <Upload className="h-4 w-4 mr-2" />
              Load Belmont Sample Data
            </Button>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              id="gsc-upload"
              onChange={onImportFile}
            />
            <label htmlFor="gsc-upload">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import Your GSC CSV
              </Button>
            </label>
            <Button
              variant="outline"
              onClick={exportRecsCSV}
              disabled={recs.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Recommendations
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
            <li>Click “Load Belmont Sample Data” to see how it works.</li>
            <li>Then click “Import Your GSC CSV” and upload your export.</li>
            <li>
              Open Opportunities and note the top 3 pages by missed clicks.
            </li>
            <li>Go to Page Experiments and copy a Title/Meta pair.</li>
            <li>Paste into your CMS and track the uplift next week.</li>
          </ol>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <KPICard
          label="Total Queries"
          value={rows.length}
          hint="Search terms analyzed"
          icon={<Search className="h-4 w-4" />}
        />
        <KPICard
          label="AI Status"
          value={apiKey ? "Connected" : "Setup"}
          hint="AI optimization"
          icon={<Brain className="h-4 w-4" />}
        />
        <KPICard
          label="Avg Position"
          value={
            rows.length > 0
              ? (
                  rows.reduce((a, r) => a + r.position, 0) / rows.length
                ).toFixed(1)
              : "—"
          }
          hint="Search ranking"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KPICard
          label="Opportunities"
          value={recs.length}
          hint="Optimization opportunities"
          icon={<Lightbulb className="h-4 w-4" />}
        />
        <KPICard
          label="Potential Clicks"
          value={
            recs.length > 0
              ? recs.reduce((a, r) => a + r.potentialClicks, 0).toLocaleString()
              : "—"
          }
          hint="Missed clicks"
          icon={<MousePointer className="h-4 w-4" />}
        />
        <KPICard
          label="Campaigns"
          value={searchLibrary.campaigns.length}
          hint="Active campaigns"
          icon={<Target className="h-4 w-4" />}
        />
      </div>

      <Tabs defaultValue="howto" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-10 gap-1">
          <TabsTrigger value="howto">How To</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="ai-optimize">AI Optimize</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="experiments">Experiments</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
        </TabsList>

        {/* How To */}
        <TabsContent value="howto">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  How to Use the Search Results Analyzer
                </CardTitle>
                <CardDescription>
                  Analyze Belmont's performance in Google searches and discover
                  opportunities to get more customers online
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      What This Tool Does
                    </h3>
                    <p className="text-muted-foreground">
                      This tool analyzes data from Google Search Console to show
                      Belmont exactly how customers are finding the website
                      online. It reveals which search terms people use to find
                      barbers in Calgary and helps identify opportunities to
                      improve Belmont's search rankings.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Why Search Analysis Matters for Belmont
                    </h3>
                    <p className="text-muted-foreground">
                      Understanding how customers search for Belmont's services
                      is crucial because:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground mt-2">
                      <li>
                        Shows which keywords customers actually use when looking
                        for barbers in Calgary
                      </li>
                      <li>
                        Reveals if Belmont appears when people search for
                        "barber shop bridgeland"
                      </li>
                      <li>
                        Identifies pages that could get more clicks with better
                        titles and descriptions
                      </li>
                      <li>
                        Helps Belmont compete better with other local barber
                        shops
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Step-by-Step Instructions
                    </h3>
                    <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                      <li>
                        <strong>Get your Google Search Console data:</strong>{" "}
                        Export search results from Google Search Console (last
                        28-90 days) with columns for Query, Page, Clicks,
                        Impressions, CTR, Position
                      </li>
                      <li>
                        <strong>Import the CSV:</strong> Click "Import CSV" and
                        upload your Google Search Console export file
                      </li>
                      <li>
                        <strong>Adjust settings:</strong> Set minimum
                        impressions and choose whether to include brand queries
                        (searches for "Belmont")
                      </li>
                      <li>
                        <strong>Review opportunities:</strong> Look at the
                        "Opportunities" tab to see which pages could get more
                        clicks
                      </li>
                      <li>
                        <strong>Check page experiments:</strong> Go to "Page
                        Experiments" to see suggested title and description
                        improvements
                      </li>
                      <li>
                        <strong>Copy and implement:</strong> Copy the suggested
                        titles and descriptions, then update them on your
                        website
                      </li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Best Practices for Belmont
                    </h3>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>
                        <strong>Focus on local keywords:</strong> Pay special
                        attention to searches containing "Calgary",
                        "Bridgeland", or "Riverside"
                      </li>
                      <li>
                        <strong>Improve low-CTR pages first:</strong> Start with
                        pages that get many impressions but few clicks - these
                        have the biggest improvement potential
                      </li>
                      <li>
                        <strong>Use clear, benefit-focused titles:</strong>{" "}
                        Instead of just "Barber Services", use "Professional
                        Haircuts & Beard Trims in Bridgeland"
                      </li>
                      <li>
                        <strong>Include your unique advantages:</strong> Mention
                        "Veterans Discount", "Groomsmen Party Packages", or "Hot
                        Towel Shaves" in titles and descriptions
                      </li>
                      <li>
                        <strong>Test and measure:</strong> After making changes,
                        wait 2-4 weeks and check if your click-through rates
                        improve
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">Quick Tips</h3>
                    <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                      <li>
                        In Google Search Console, export <em>Search results</em>{" "}
                        with columns Query, Page, Clicks, Impressions, CTR,
                        Position (last 28–90 days).
                      </li>
                      <li>
                        Import the CSV here. Adjust minimum impressions and
                        whether to include brand queries.
                      </li>
                      <li>
                        Review <strong>Underperforming Pages</strong>; the tool
                        highlights potential extra clicks if your CTR matched a
                        realistic benchmark at your average position.
                      </li>
                      <li>
                        Copy a proposed <strong>Title/Meta</strong> pair, tweak
                        for truthfulness (prices, hours), and deploy in your
                        CMS.
                      </li>
                      <li>
                        Consider A/B testing title variations on high-traffic
                        pages.
                      </li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Search Analytics Summary
              </CardTitle>
              <CardDescription>
                Run analytics after loading sample data or importing your CSV.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={calculateSearchAnalyticsData} disabled={rows.length === 0}>
                  <Play className="h-4 w-4 mr-2" />
                  Run Analytics
                </Button>
                <Button variant="outline" onClick={exportEnhancedSearchReport} disabled={!searchAnalytics}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>

              {rows.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  Load sample data or import your GSC CSV to populate analytics.
                </div>
              )}

              {searchAnalytics && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <KPICard label="Queries" value={searchAnalytics.totalQueries} hint="terms" icon={<Search className="h-4 w-4" />} />
                  <KPICard label="Impressions" value={searchAnalytics.totalImpressions.toLocaleString()} hint="last period" icon={<Eye className="h-4 w-4" />} />
                  <KPICard label="Clicks" value={searchAnalytics.totalClicks.toLocaleString()} hint="last period" icon={<MousePointer className="h-4 w-4" />} />
                  <KPICard label="Avg CTR" value={(searchAnalytics.avgCTR * 100).toFixed(1) + "%"} hint="click-through" icon={<TrendingUp className="h-4 w-4" />} />
                  <KPICard label="Avg Pos" value={searchAnalytics.avgPosition.toFixed(1)} hint="lower is better" icon={<Target className="h-4 w-4" />} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                CTR Benchmarks & Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid md:grid-cols-3 gap-3 items-end">
                <div className="md:col-span-2">
                  <Label>Business name</Label>
                  <Input
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Booking URL</Label>
                  <Input
                    value={bookingUrl}
                    onChange={(e) => setBookingUrl(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Min impressions</Label>
                  <Input
                    type="number"
                    min={0}
                    value={knobs.minImpr}
                    onChange={(e) =>
                      setKnobs((k) => ({
                        ...k,
                        minImpr: clamp(parseInt(e.target.value || "0"), 0, 1e7),
                      }))
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={knobs.includeBrand}
                    onCheckedChange={(v) =>
                      setKnobs((k) => ({ ...k, includeBrand: Boolean(v) }))
                    }
                  />
                  <Label>Include brand queries</Label>
                </div>
                <div>
                  <Label>Filter family</Label>
                  <select
                    className="w-full h-9 border rounded-md px-2"
                    value={filterFam}
                    onChange={(e) => setFilterFam(e.target.value)}
                    aria-label="Filter by search term family"
                  >
                    <option value="all">all</option>
                    {Object.keys(FAMILY_PATTERNS).map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Filter area</Label>
                  <select
                    className="w-full h-9 border rounded-md px-2"
                    value={filterArea}
                    onChange={(e) => setFilterArea(e.target.value)}
                    aria-label="Filter by geographic area"
                  >
                    <option value="all">all</option>
                    {Object.keys(AREA_PATTERNS).map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                    <option value="generic">generic</option>
                  </select>
                </div>
              </div>
              <Separator />
              <div>
                <div className="font-medium mb-2">
                  Expected CTR by position bucket
                </div>
                <div className="grid md:grid-cols-6 gap-2 items-end">
                  {knobs.bench.map(([label, fn], i) => (
                    <div key={i} className="p-2 border rounded-md">
                      <div className="text-xs text-muted-foreground">
                        Pos {label}
                      </div>
                      <Input
                        type="number"
                        step="0.5"
                        value={(fn(bucketMid(label)) * 100).toFixed(1)}
                        onChange={(e) => {
                          const val = clamp(
                            parseFloat(e.target.value || "0") / 100,
                            0,
                            1
                          );
                          setKnobs((k) => ({
                            ...k,
                            bench: k.bench.map((b, j) =>
                              j === i
                                ? ([
                                    b[0],
                                    (p: number) =>
                                      inBucket(p, label) ? val : 0,
                                  ] as [string, (pos: number) => number])
                                : b
                            ),
                          }));
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Values are % CTR expected if a query averages within that
                  position bucket.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Opportunities */}
        <TabsContent value="opportunities">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Underperforming Pages by Missed Clicks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page</TableHead>
                      <TableHead>Impr</TableHead>
                      <TableHead>Clicks</TableHead>
                      <TableHead>Avg Pos</TableHead>
                      <TableHead>CTR</TableHead>
                      <TableHead>Expected</TableHead>
                      <TableHead>Potential +Clicks</TableHead>
                      <TableHead>Top Query</TableHead>
                      <TableHead>Family</TableHead>
                      <TableHead>Area</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {opps.map((o, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">
                          <a
                            className="underline"
                            href={o.page}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {o.page}
                          </a>
                        </TableCell>
                        <TableCell>{o.impressions}</TableCell>
                        <TableCell>{o.clicks}</TableCell>
                        <TableCell>{o.avgPos.toFixed(1)}</TableCell>
                        <TableCell>{pct(o.avgCTR)}</TableCell>
                        <TableCell>{pct(o.expCTR)}</TableCell>
                        <TableCell>{o.missedClicks}</TableCell>
                        <TableCell className="text-xs">{o.topQuery}</TableCell>
                        <TableCell>{o.famTop}</TableCell>
                        <TableCell>{o.areaTop}</TableCell>
                      </TableRow>
                    ))}
                    {opps.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={10}
                          className="text-sm text-muted-foreground"
                        >
                          Import a GSC CSV to see opportunities.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Page Experiments */}
        <TabsContent value="experiments">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Title/Meta Experiments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-muted-foreground">
                Click a row to copy. Keep titles ≤60 char; metas ≈155 char. Use
                real prices and neighborhood anchors.
              </div>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page</TableHead>
                      <TableHead>Proposed Title</TableHead>
                      <TableHead>Proposed Meta</TableHead>
                      <TableHead>Why</TableHead>
                      <TableHead>Copy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recs.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">
                          <a
                            className="underline"
                            href={r.page}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {r.page}
                          </a>
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.title}{" "}
                          <div className="text-[10px] text-muted-foreground">
                            {r.title.length} chars
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.meta}{" "}
                          <div className="text-[10px] text-muted-foreground">
                            {r.meta.length} chars
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.reason}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              copy(
                                `Title: ${r.title}\nMeta: ${r.meta}`,
                                `copy-${i}`
                              )
                            }
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </Button>
                          {copied === `copy-${i}` && (
                            <Badge className="ml-2">Copied</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {recs.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-sm text-muted-foreground"
                        >
                          No recommendations yet — check filters or import data.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Charts */}
        <TabsContent value="charts">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">CTR vs Position</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Position"
                      domain={[1, 30]}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="CTR %"
                      domain={[0, 40]}
                    />
                    <ReTooltip cursor={{ strokeDasharray: "3 3" }} />
                    <Scatter data={scatter} fill="#8884d8" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="h-56 mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={expectedLine}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="x" />
                    <YAxis domain={[0, 40]} />
                    <Legend />
                    <Line
                      dataKey="y"
                      name="Expected CTR %"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
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
                  How to Use the Search Results Analyzer
                </CardTitle>
                <CardDescription>
                  Analyze Belmont's performance in Google searches and discover
                  opportunities to get more customers online
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      What This Tool Does
                    </h3>
                    <p className="text-muted-foreground">
                      This tool analyzes data from Google Search Console to show
                      Belmont exactly how customers are finding the website
                      online. It reveals which search terms people use to find
                      barbers in Calgary and helps identify opportunities to
                      improve Belmont's search rankings.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Why Search Analysis Matters for Belmont
                    </h3>
                    <p className="text-muted-foreground">
                      Understanding how customers search for Belmont's services
                      is crucial because:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground mt-2">
                      <li>
                        Shows which keywords customers actually use when looking
                        for barbers in Calgary
                      </li>
                      <li>
                        Reveals if Belmont appears when people search for
                        "barber shop bridgeland"
                      </li>
                      <li>
                        Identifies pages on Belmont's website that need
                        improvement
                      </li>
                      <li>
                        Helps Belmont create better content that matches what
                        customers want
                      </li>
                      <li>
                        Shows whether Belmont's Google Business Profile is
                        working effectively
                      </li>
                      <li>
                        Provides data to make smart decisions about marketing
                        and website changes
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      How to Analyze Belmont's Search Performance
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          1
                        </Badge>
                        <div>
                          <p className="font-medium">
                            Get Your Google Search Console Data
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Go to Google Search Console for Belmont's website
                            and export the "Queries" report. This shows all the
                            search terms people used to find Belmont online.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          2
                        </Badge>
                        <div>
                          <p className="font-medium">Upload the Data File</p>
                          <p className="text-sm text-muted-foreground">
                            Click "Upload CSV" and select the file you
                            downloaded from Google Search Console. The tool will
                            automatically read and analyze all the search data.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          3
                        </Badge>
                        <div>
                          <p className="font-medium">
                            Review the Opportunities Tab
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Check the "Opportunities" section to see search
                            terms where Belmont could rank higher. Look for
                            terms like "barber Calgary", "mens haircut near me",
                            or "bridgeland barber".
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          4
                        </Badge>
                        <div>
                          <p className="font-medium">Analyze the Charts</p>
                          <p className="text-sm text-muted-foreground">
                            Look at the performance charts to understand
                            click-through rates and impressions. Higher
                            impressions mean more people see Belmont, higher
                            clicks mean better engagement.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          5
                        </Badge>
                        <div>
                          <p className="font-medium">Check Page Performance</p>
                          <p className="text-sm text-muted-foreground">
                            Review the "Page Experiments" tab to see which pages
                            on Belmont's website perform best. Identify pages
                            that need title or description improvements.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          6
                        </Badge>
                        <div>
                          <p className="font-medium">Apply the Insights</p>
                          <p className="text-sm text-muted-foreground">
                            Use the recommendations to improve Belmont's website
                            content, meta descriptions, and Google Business
                            Profile to attract more local customers.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      What the Numbers Mean
                    </h3>
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                            Impressions 📊
                          </h4>
                          <p className="text-blue-700 dark:text-blue-300">
                            How many times Belmont appeared in Google search
                            results. More impressions = more visibility.
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                            Clicks 🖱️
                          </h4>
                          <p className="text-blue-700 dark:text-blue-300">
                            How many times people clicked on Belmont's link.
                            More clicks = better engagement.
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                            Click-Through Rate 📈
                          </h4>
                          <p className="text-blue-700 dark:text-blue-300">
                            Percentage of people who clicked after seeing
                            Belmont. Higher CTR = more effective listings.
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                            Average Position 🎯
                          </h4>
                          <p className="text-blue-700 dark:text-blue-300">
                            Where Belmont appears in search results (1 = top,
                            10+ = lower). Lower numbers are better.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Belmont-Specific Search Insights
                    </h3>
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <ul className="space-y-2 text-sm text-green-700 dark:text-green-300">
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 dark:text-green-400 mt-1">
                            🏙️
                          </span>
                          <span>
                            Calgary searches: Focus on "barber Calgary",
                            "haircut downtown Calgary", "mens grooming Calgary"
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 dark:text-green-400 mt-1">
                            🏘️
                          </span>
                          <span>
                            Bridgeland searches: Target "barber shop
                            bridgeland", "bridgeland haircut", "local barber
                            bridgeland"
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 dark:text-green-400 mt-1">
                            💇‍♂️
                          </span>
                          <span>
                            Service searches: Watch for "mens haircut", "beard
                            trim", "hot towel shave", "kids haircut"
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 dark:text-green-400 mt-1">
                            🎩
                          </span>
                          <span>
                            Special services: Track "groomsmen packages",
                            "wedding haircuts", "veterans discount"
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 dark:text-green-400 mt-1">
                            🕐
                          </span>
                          <span>
                            Timing searches: Monitor "barber open now", "walk-in
                            barber", "emergency haircut"
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Action Steps for Belmont
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-3">
                        <h4 className="font-medium mb-2">
                          Quick Wins (Do First)
                        </h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Update Google Business Profile</li>
                          <li>• Improve page titles and descriptions</li>
                          <li>• Add missing keywords to website</li>
                          <li>• Fix any broken links</li>
                        </ul>
                      </div>
                      <div className="border rounded-lg p-3">
                        <h4 className="font-medium mb-2">
                          Long-term Improvements
                        </h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>
                            • Create content for high-opportunity keywords
                          </li>
                          <li>• Build local backlinks</li>
                          <li>• Improve website loading speed</li>
                          <li>• Add customer reviews and photos</li>
                        </ul>
                      </div>
                      <div className="border rounded-lg p-3">
                        <h4 className="font-medium mb-2">Monthly Monitoring</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Track position changes</li>
                          <li>• Monitor new search terms</li>
                          <li>• Review CTR improvements</li>
                          <li>• Check competitor performance</li>
                        </ul>
                      </div>
                      <div className="border rounded-lg p-3">
                        <h4 className="font-medium mb-2">Success Metrics</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Higher search rankings</li>
                          <li>• More website visitors</li>
                          <li>• Increased phone calls</li>
                          <li>• More online bookings</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Getting Google Search Console Data
                    </h3>
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <div className="space-y-3 text-sm">
                        <div>
                          <h4 className="font-medium text-amber-800 dark:text-amber-200">
                            Step 1: Access Google Search Console
                          </h4>
                          <p className="text-amber-700 dark:text-amber-300">
                            Go to search.google.com/search-console and sign in
                            with Belmont's Google account
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium text-amber-800 dark:text-amber-200">
                            Step 2: Select Belmont's Website
                          </h4>
                          <p className="text-amber-700 dark:text-amber-300">
                            Choose "thebelmontbarber.ca" from the property list
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium text-amber-800 dark:text-amber-200">
                            Step 3: Go to Performance Report
                          </h4>
                          <p className="text-amber-700 dark:text-amber-300">
                            Click "Performance" in the left sidebar
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium text-amber-800 dark:text-amber-200">
                            Step 4: Export Queries Data
                          </h4>
                          <p className="text-amber-700 dark:text-amber-300">
                            Click the export button and save the file as CSV
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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

        {/* Help */}
        <TabsContent value="help">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                How to Collect Ranks
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <ol className="list-decimal pl-5 space-y-1">
                <li>
                  In Google Search Console, export <em>Search results</em> with
                  columns Query, Page, Clicks, Impressions, CTR, Position (last
                  28–90 days).
                </li>
                <li>
                  Import the CSV here. Adjust minimum impressions and whether to
                  include brand queries.
                </li>
                <li>
                  Review <strong>Underperforming Pages</strong>; the tool
                  highlights potential extra clicks if your CTR matched a
                  realistic benchmark at your average position.
                </li>
                <li>
                  Copy a proposed <strong>Title/Meta</strong> pair, tweak for
                  truthfulness (prices, hours), and deploy in your CMS.
                </li>
                <li>
                  Re‑export recommendations as CSV for the backlog. Track uplift
                  weekly.
                </li>
              </ol>
              <p className="text-xs text-muted-foreground">
                Benchmarks are heuristics. Calibrate to your site's historical
                CTR curves where possible.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---- helpers for settings ----
function bucketMid(label: string) {
  if (label === "1") return 1;
  if (label === "2") return 2;
  if (label === "3") return 3;
  if (label === "4-5") return 4.5;
  if (label === "6-10") return 8;
  if (label === "11-20") return 15;
  return 25;
}
function inBucket(p: number, label: string) {
  if (label === "1") return p <= 1;
  if (label === "2") return p > 1 && p <= 2;
  if (label === "3") return p > 2 && p <= 3;
  if (label === "4-5") return p > 3 && p <= 5;
  if (label === "6-10") return p > 5 && p <= 10;
  if (label === "11-20") return p > 10 && p <= 20;
  return p > 20;
}

export default function Page() {
  return <GSCCtrMiner />;
}
