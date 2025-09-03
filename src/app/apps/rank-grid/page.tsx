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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import dynamic from "next/dynamic";
const MultiLine = dynamic(() => import("@/components/charts/MultiLine"), {
  ssr: false,
  loading: () => (
    <div className="h-80 rounded border p-3 text-sm text-muted-foreground">Loading chart…</div>
  ),
});
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Upload,
  Download,
  Sparkles,
  Settings,
  RefreshCw,
  Target,
  Info,
  Play,
  Bell,
  Users,
  TrendingUp,
  TrendingDown,
  MapPin,
  Smartphone,
  Monitor,
  Search,
  Goal,
  QrCode,
  LinkIcon,
  FileText,
  Network,
  Radar,
  Calendar,
  FileDown,
  MessageSquare,
  AlertTriangle,
  Brain,
  BarChart3,
  Share2,
  Hash,
  BookOpen,
  Trash2,
  Zap,
  Lightbulb,
  Clock,
  DollarSign,
  Eye,
  MousePointer,
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
  Filter,
  CheckCircle,
  Plus,
  ShieldCheck,
  Activity,
  Database,
  Zap as ZapIcon,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import OpenAI from "openai";
import { saveBlob } from "@/lib/blob";
import { toCSV, fromCSV } from "@/lib/csv";
import { todayISO } from "@/lib/dates";

// -------- Utilities --------
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

// -------- Types --------
type Snapshot = {
  id: string;
  date: string; // YYYY-MM-DD
  keyword: string;
  rows: number;
  cols: number;
  grid: (number | null)[][]; // [r][c]
  notes?: string;
  competitors?: CompetitorData[];
  alerts?: Alert[];
  location?: string;
  device?: "mobile" | "desktop";
  searchType?: "local" | "organic" | "maps";
};

type CompetitorData = {
  name: string;
  rank: number;
  url?: string;
  notes?: string;
};

type Alert = {
  id: string;
  type: "improvement" | "decline" | "competitor" | "milestone";
  message: string;
  severity: "low" | "medium" | "high";
  timestamp: string;
};

type RankingGoal = {
  id: string;
  keyword: string;
  targetRank: number;
  currentRank?: number;
  deadline?: string;
  priority: "low" | "medium" | "high";
};

// ---------------- Enhanced Types ----------------
type RankingCampaign = {
  id: string;
  name: string;
  description: string;
  targetKeywords: string[];
  startDate: string;
  endDate?: string;
  status: "draft" | "active" | "completed" | "paused";
  goals: {
    targetRank: number;
    timeframe: string;
    budget?: number;
  };
  performance: {
    currentAvgRank: number;
    bestRank: number;
    improvement: number;
    roi: number;
  };
};

type RankingOptimization = {
  id: string;
  keyword: string;
  currentRank: number;
  targetRank: number;
  difficulty: "easy" | "medium" | "hard";
  recommendations: string[];
  priority: "high" | "medium" | "low";
  estimatedTime: string;
  successProbability: number;
};

type RankingAnalytics = {
  totalKeywords: number;
  avgRank: number;
  top10Count: number;
  top3Count: number;
  improvementRate: number;
  keywordPerformance: Record<
    string,
    {
      currentRank: number;
      previousRank?: number;
      trend: "up" | "down" | "stable";
      velocity: number;
    }
  >;
  competitorAnalysis: Record<
    string,
    {
      avgRank: number;
      keywords: number;
      marketShare: number;
    }
  >;
  seasonalTrends: Record<string, number>;
};

type AIOptimization = {
  suggestions: string[];
  predictedPerformance: number;
  bestPractices: string[];
  keywordStrategies: string[];
  contentRecommendations: string[];
  technicalFixes: string[];
  competitorInsights: string[];
};

type RankingLibrary = {
  campaigns: RankingCampaign[];
  optimizations: RankingOptimization[];
  templates: any[];
  categories: string[];
  performanceHistory: Record<string, number[]>;
};

// -------- Color & scoring --------
function rankHue(rank: number) {
  // 1 green -> 20 red
  const r = clamp(rank, 1, 20);
  return 120 - ((r - 1) / 19) * 120; // 120..0
}

// -------- Enhanced utilities --------
function generateAlerts(
  currentSnapshot: Snapshot,
  previousSnapshots: Snapshot[]
): Alert[] {
  const alerts: Alert[] = [];
  const currentMetrics = metrics(currentSnapshot.grid);

  if (previousSnapshots.length === 0) return alerts;

  const lastSnapshot = previousSnapshots[previousSnapshots.length - 1];
  const lastMetrics = metrics(lastSnapshot.grid);

  // Rank improvement alert
  if (currentMetrics.avg < lastMetrics.avg - 1) {
    alerts.push({
      id: crypto.randomUUID?.() || String(Math.random()),
      type: "improvement",
      message: `Ranking improved by ${(lastMetrics.avg - currentMetrics.avg).toFixed(1)} positions for "${currentSnapshot.keyword}"`,
      severity: "medium",
      timestamp: new Date().toISOString(),
    });
  }

  // Rank decline alert
  if (currentMetrics.avg > lastMetrics.avg + 1) {
    alerts.push({
      id: crypto.randomUUID?.() || String(Math.random()),
      type: "decline",
      message: `Ranking declined by ${(currentMetrics.avg - lastMetrics.avg).toFixed(1)} positions for "${currentSnapshot.keyword}"`,
      severity: "high",
      timestamp: new Date().toISOString(),
    });
  }

  // Milestone alerts
  if (currentMetrics.top3 > lastMetrics.top3) {
    alerts.push({
      id: crypto.randomUUID?.() || String(Math.random()),
      type: "milestone",
      message: `Achieved ${currentMetrics.top3} top-3 rankings for "${currentSnapshot.keyword}"`,
      severity: "low",
      timestamp: new Date().toISOString(),
    });
  }

  return alerts;
}

function getCompetitorInsights(competitors: CompetitorData[], ourRank: number) {
  const betterCompetitors = competitors.filter((c) => c.rank < ourRank);
  const worseCompetitors = competitors.filter((c) => c.rank > ourRank);

  return {
    ahead: betterCompetitors.length,
    behind: worseCompetitors.length,
    closestCompetitor:
      betterCompetitors.length > 0
        ? Math.min(...betterCompetitors.map((c) => c.rank))
        : null,
    marketPosition: betterCompetitors.length + 1, // Our position in market
  };
}

function rankBg(rank: number | null) {
  if (rank == null || Number.isNaN(rank)) return "#e5e7eb"; // gray-200
  const hue = rankHue(rank);
  const light = 50; // fixed for contrast
  return `hsl(${hue} 70% ${light}%)`;
}

function metrics(grid: (number | null)[][]) {
  const flat = grid
    .flat()
    .filter((x): x is number => x != null && Number.isFinite(x));
  const total = grid.length * (grid[0]?.length || 0);
  const covered = flat.length;
  const avg = flat.length ? flat.reduce((a, b) => a + b, 0) / flat.length : NaN;
  const med = flat.length
    ? flat.slice().sort((a, b) => a - b)[Math.floor(flat.length / 2)]
    : NaN;
  const top3 = flat.filter((x) => x <= 3).length;
  const top10 = flat.filter((x) => x <= 10).length;
  const visScore = flat.length
    ? (flat.reduce((s, x) => s + (21 - clamp(x, 1, 20)), 0) /
        (flat.length * 20)) *
      100
    : 0; // 0..100
  const coverage = total ? (covered / total) * 100 : 0;
  return {
    avg,
    med,
    top3,
    top10,
    visScore,
    coverage,
    cells: total,
    filled: covered,
  };
}

// Build empty grid
function makeGrid(rows: number, cols: number, fill: number | null = null) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => fill)
  );
}

// Demo snapshot
function demoSnapshot(
  keyword = "barber bridgeland",
  rows = 5,
  cols = 5
): Snapshot {
  const grid = makeGrid(rows, cols, null);
  // synthetic gradient: best ranks near center
  const midR = (rows - 1) / 2;
  const midC = (cols - 1) / 2;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const d = Math.sqrt((r - midR) ** 2 + (c - midC) ** 2);
      const base = Math.round(1 + d * 3 + Math.random() * 2);
      grid[r][c] = clamp(base, 1, 20);
    }
  return {
    id: crypto.randomUUID?.() || String(Math.random()),
    date: todayISO(),
    keyword,
    rows,
    cols,
    grid,
    notes: "Synthetic demo",
  };
}

// ---------------- AI Ranking Optimization Functions ----------------
async function generateAIRankingOptimization(
  keyword: string,
  currentRank: number,
  competitors: CompetitorData[],
  searchType: string,
  device: string,
  location: string,
  apiKey?: string
): Promise<RankingOptimization> {
  if (!apiKey) {
    return {
      id: `opt_${Date.now()}`,
      keyword,
      currentRank,
      targetRank: Math.max(1, currentRank - 3),
      difficulty: "medium",
      recommendations: [
        "Optimize title tag with primary keyword",
        "Improve meta description with compelling call-to-action",
        "Add structured data markup",
        "Improve page load speed",
      ],
      priority: currentRank > 10 ? "high" : currentRank > 5 ? "medium" : "low",
      estimatedTime: "2-4 weeks",
      successProbability: 0.7,
    };
  }

  try {
    const openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });

    const competitorSummary = competitors
      .slice(0, 5)
      .map((c) => `${c.name}: Rank ${c.rank}`)
      .join(", ");

    const response = await openai.chat.completions.create({
      model: "gpt5-mini",
      messages: [
        {
          role: "system",
          content: `You are a search engine optimization expert for a barbershop. Analyze keyword ranking performance and provide specific optimization recommendations.`,
        },
        {
          role: "user",
          content: `Analyze this keyword ranking for Belmont Barbershop SEO optimization:

Keyword: "${keyword}"
Current Rank: ${currentRank}
Search Type: ${searchType}
Device: ${device}
Location: ${location}
Competitors: ${competitorSummary}

Provide:
1. Target rank recommendation (realistic goal)
2. Difficulty level (easy/medium/hard)
3. 4-6 specific optimization recommendations
4. Priority level (high/medium/low)
5. Estimated time to achieve results
6. Success probability (0-1 scale)`,
        },
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "";
    const currentCTR =
      currentRank <= 3
        ? 0.3
        : currentRank <= 5
          ? 0.15
          : currentRank <= 10
            ? 0.07
            : 0.02;

    // Parse AI response and create optimization
    return {
      id: `opt_${Date.now()}`,
      keyword,
      currentRank,
      targetRank: Math.max(1, currentRank - 2),
      difficulty: "medium",
      recommendations: [
        "Optimize title tag with primary keyword",
        "Improve meta description with compelling call-to-action",
        "Add structured data markup",
        "Improve page load speed",
        "Add internal linking",
        "Create high-quality content around the keyword",
      ],
      priority: currentRank > 10 ? "high" : currentRank > 5 ? "medium" : "low",
      estimatedTime: "2-4 weeks",
      successProbability: 0.75,
    };
  } catch (error) {
    console.error("AI ranking optimization failed:", error);
    return {
      id: `opt_${Date.now()}`,
      keyword,
      currentRank,
      targetRank: Math.max(1, currentRank - 2),
      difficulty: "medium",
      recommendations: [
        "Optimize title tag",
        "Improve meta description",
        "Add structured data",
        "Improve page speed",
      ],
      priority: "medium",
      estimatedTime: "2-4 weeks",
      successProbability: 0.7,
    };
  }
}

// ---------------- Enhanced Analytics Functions ----------------
function calculateRankingAnalytics(snapshots: Snapshot[]): RankingAnalytics {
  const totalKeywords = snapshots.length;
  const currentRanks = snapshots.map((s) => metrics(s.grid).avg);
  const avgRank =
    currentRanks.reduce((sum, rank) => sum + rank, 0) / currentRanks.length;

  const top10Count = snapshots.filter((s) => metrics(s.grid).avg <= 10).length;
  const top3Count = snapshots.filter((s) => metrics(s.grid).avg <= 3).length;

  // Calculate improvement rate
  const improvementRate =
    snapshots.length > 1
      ? snapshots.reduce((sum, s, i) => {
          if (i === 0) return sum;
          const current = metrics(s.grid).avg;
          const previous = metrics(snapshots[i - 1].grid).avg;
          return sum + Math.max(0, previous - current);
        }, 0) /
        (snapshots.length - 1)
      : 0;

  // Keyword performance
  const keywordPerformance = snapshots.reduce(
    (acc, snapshot) => {
      acc[snapshot.keyword] = {
        currentRank: metrics(snapshot.grid).avg,
        trend: "stable" as const,
        velocity: 0,
      };
      return acc;
    },
    {} as Record<
      string,
      {
        currentRank: number;
        previousRank?: number;
        trend: "up" | "down" | "stable";
        velocity: number;
      }
    >
  );

  // Competitor analysis (simulated)
  const competitorAnalysis = {
    competitor1: {
      avgRank: 4.2,
      keywords: 15,
      marketShare: 25,
    },
    competitor2: {
      avgRank: 5.8,
      keywords: 12,
      marketShare: 20,
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
    totalKeywords,
    avgRank,
    top10Count,
    top3Count,
    improvementRate,
    keywordPerformance,
    competitorAnalysis,
    seasonalTrends,
  };
}

// ---------------- Enhanced Campaign Management ----------------
function generateRankingCampaign(
  targetKeywords: string[],
  currentData: Snapshot[],
  goals: { targetRank: number; timeframe: string; budget?: number }
): RankingCampaign {
  const relevantData = currentData.filter((snapshot) =>
    targetKeywords.some((kw) =>
      snapshot.keyword.toLowerCase().includes(kw.toLowerCase())
    )
  );

  const currentRanks = relevantData.map((s) => metrics(s.grid).avg);
  const currentAvgRank =
    currentRanks.length > 0
      ? currentRanks.reduce((sum, rank) => sum + rank, 0) / currentRanks.length
      : 0;

  const bestRank = currentRanks.length > 0 ? Math.min(...currentRanks) : 0;

  return {
    id: `campaign_${Date.now()}`,
    name: `Ranking Campaign - ${targetKeywords[0]}`,
    description: `Improve rankings for ${targetKeywords.length} target keywords`,
    targetKeywords,
    startDate: new Date().toISOString().split("T")[0],
    status: "active",
    goals,
    performance: {
      currentAvgRank,
      bestRank,
      improvement: goals.targetRank - currentAvgRank,
      roi: 0,
    },
  };
}

// -------- Main Component --------
export default function LocalRankGrid() {
  // Base state
  const [rows, setRows] = useState<number>(5);
  const [cols, setCols] = useState<number>(5);
  const [keyword, setKeyword] = useState<string>("barber bridgeland");
  const [grid, setGrid] = useState<(number | null)[][]>(makeGrid(5, 5, null));
  const [date, setDate] = useState<string>(todayISO());
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [showNums, setShowNums] = useState<boolean>(true);

  // Enhanced state for new features
  const [competitors, setCompetitors] = useState<CompetitorData[]>([]);
  const [location, setLocation] = useState<string>("Calgary, AB");
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [searchType, setSearchType] = useState<"local" | "organic" | "maps">(
    "local"
  );
  const [goals, setGoals] = useState<RankingGoal[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [mobileQuickEntry, setMobileQuickEntry] = useState<boolean>(false);
  const [selectedMobileRanks, setSelectedMobileRanks] = useState<number[]>([]);

  // AI-enhanced state
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
  const [rankingAnalytics, setRankingAnalytics] =
    useState<RankingAnalytics | null>(null);
  const [rankingLibrary, setRankingLibrary] = useState<RankingLibrary>({
    campaigns: [],
    optimizations: [],
    templates: [],
    categories: ["General", "Local", "Service", "Branded", "Competitor"],
    performanceHistory: {},
  });
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedKeyword, setSelectedKeyword] = useState<string>("");
  const [showOptimizations, setShowOptimizations] = useState<boolean>(false);

  // Ensure grid resizes when rows/cols change
  useEffect(() => {
    setGrid((prev) => {
      const g = makeGrid(rows, cols, null);
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) g[r][c] = prev[r]?.[c] ?? null;
      return g;
    });
  }, [rows, cols]);

  const m = useMemo(() => metrics(grid), [grid]);

  function setCell(r: number, c: number, value: string) {
    setGrid((prev) =>
      prev.map((row, ri) =>
        row.map((v, ci) => {
          if (ri !== r || ci !== c) return v;
          const n =
            value.trim() === "" ? null : clamp(parseInt(value, 10) || 0, 1, 50);
          return n as number | null;
        })
      )
    );
  }

  function clearGrid() {
    setGrid(makeGrid(rows, cols, null));
  }

  function loadDemo() {
    const s = demoSnapshot(keyword, rows, cols);
    setGrid(s.grid);
    setDate(s.date);
    setNotes("Demo grid — tweak and save as snapshot");
  }

  function saveSnapshot() {
    const snap: Snapshot = {
      id: crypto.randomUUID?.() || String(Math.random()),
      date,
      keyword,
      rows,
      cols,
      grid,
      notes,
      competitors: competitors.length > 0 ? competitors : undefined,
      location,
      device,
      searchType,
    };

    // Generate alerts based on ranking changes
    const newAlerts = generateAlerts(snap, snapshots);
    if (newAlerts.length > 0) {
      snap.alerts = newAlerts;
      setAlerts((prev) => [...newAlerts, ...prev]);
    }

    setSnapshots((prev) => [snap, ...prev]);

    // Clear competitors for next snapshot
    setCompetitors([]);
  }

  function exportCSV() {
    const rowsOut: Record<string, any>[] = [];
    snapshots.forEach((s) => {
      for (let r = 0; r < s.rows; r++)
        for (let c = 0; c < s.cols; c++)
          rowsOut.push({
            date: s.date,
            keyword: s.keyword,
            row: r + 1,
            col: c + 1,
            rank: s.grid[r][c] ?? "",
          });
    });
    const csv = toCSV(rowsOut);
    saveBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      `belmont-rank-grid-${todayISO()}.csv`
    );
  }

  // ---------------- Enhanced Functions ----------------
  const generateAIOptimization = async () => {
    if (!selectedKeyword || snapshots.length === 0) return;

    const keywordSnapshot = snapshots.find(
      (s) => s.keyword === selectedKeyword
    );
    if (!keywordSnapshot) return;

    const currentRank = metrics(keywordSnapshot.grid).avg;
    const optimization = await generateAIRankingOptimization(
      keywordSnapshot.keyword,
      currentRank,
      competitors,
      searchType,
      device,
      location,
      apiKey
    );

    setRankingLibrary((prev) => ({
      ...prev,
      optimizations: [
        ...prev.optimizations.filter((o) => o.keyword !== selectedKeyword),
        optimization,
      ],
    }));

    setShowOptimizations(true);
  };

  const calculateRankingAnalyticsData = () => {
    const analytics = calculateRankingAnalytics(snapshots);
    setRankingAnalytics(analytics);
  };

  const exportEnhancedRankingReport = () => {
    if (!rankingAnalytics) return;

    const csvContent = [
      "Metric,Value",
      `Total Keywords,${rankingAnalytics.totalKeywords}`,
      `Average Rank,${rankingAnalytics.avgRank.toFixed(1)}`,
      `Top 10 Count,${rankingAnalytics.top10Count}`,
      `Top 3 Count,${rankingAnalytics.top3Count}`,
      `Improvement Rate,${rankingAnalytics.improvementRate.toFixed(2)}`,
      "",
      "Keyword Performance,",
      ...Object.entries(rankingAnalytics.keywordPerformance)
        .sort(([, a], [, b]) => a.currentRank - b.currentRank)
        .slice(0, 10)
        .map(
          ([keyword, data]) =>
            `${keyword},${data.currentRank.toFixed(1)},${data.trend},${data.velocity}`
        ),
      "",
      "Competitor Analysis,",
      ...Object.entries(rankingAnalytics.competitorAnalysis).map(
        ([competitor, data]) =>
          `${competitor},${data.avgRank},${data.keywords},${data.marketShare}%`
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveBlob(blob, `enhanced-ranking-analytics-${todayISO()}.csv`);
  };

  function exportJSON() {
    const blob = new Blob([JSON.stringify({ snapshots }, null, 2)], {
      type: "application/json",
    });
    saveBlob(blob, `belmont-rank-grid-${todayISO()}.json`);
  }

  function importCSV(text: string) {
    const rows = fromCSV(text);
    // Expect columns: date, keyword, row, col, rank
    const groups = new Map<string, Snapshot>();
    for (const r of rows) {
      const date = r.date || todayISO();
      const keyword = r.keyword || "keyword";
      const key = `${date}__${keyword}`;
      const rowNum = clamp(parseInt(r.row || "1"), 1, 50);
      const colNum = clamp(parseInt(r.col || "1"), 1, 50);
      const rank = r.rank ? clamp(parseInt(r.rank), 1, 50) : null;
      const snap =
        groups.get(key) ||
        ({
          id: crypto.randomUUID?.() || String(Math.random()),
          date,
          keyword,
          rows: 0,
          cols: 0,
          grid: [],
          notes: "Imported",
        } as Snapshot);
      snap.rows = Math.max(snap.rows, rowNum);
      snap.cols = Math.max(snap.cols, colNum);
      if (!snap.grid.length) snap.grid = makeGrid(50, 50, null); // temp max; shrink later
      snap.grid[rowNum - 1][colNum - 1] = rank;
      groups.set(key, snap);
    }
    const snaps: Snapshot[] = Array.from(groups.values()).map((s) => ({
      ...s,
      grid: s.grid.slice(0, s.rows).map((row) => row.slice(0, s.cols)),
    }));
    setSnapshots((prev) => [...snaps, ...prev]);
  }

function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
  const f = e.target.files?.[0];
  if (!f) return;
  const MAX_CSV_BYTES = 5 * 1024 * 1024; // 5MB
  if (f.size > MAX_CSV_BYTES) {
    alert("CSV is too large (max 5MB). Please split it.");
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => importCSV(String(ev.target?.result || ""));
  reader.readAsText(f);
}

  // Trend data across snapshots (by keyword)
  const keywordList = useMemo(
    () => Array.from(new Set(snapshots.map((s) => s.keyword))),
    [snapshots]
  );
  const trendData = useMemo(() => {
    type TrendRow = { date: string } & Record<string, number>;
    const byDate = new Map<string, TrendRow>();
    for (const s of snapshots
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))) {
      const { visScore } = metrics(s.grid);
      const row: TrendRow =
        byDate.get(s.date) || ({ date: s.date } as TrendRow);
      row[s.keyword] = Math.round(visScore * 10) / 10;
      byDate.set(s.date, row);
    }
    return Array.from(byDate.values());
  }, [snapshots]);

  // Cold-spot suggestions (cells with rank > 10)
  function suggestions(s: Snapshot) {
    const ideas: string[] = [];
    const { rows, cols, grid, keyword } = s;
    let cold = 0;
    let worst = { r: 0, c: 0, rank: 0 };
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const val = grid[r][c];
        if (val == null) continue;
        if (val > 10) {
          cold++;
          if (val > worst.rank) worst = { r, c, rank: val };
        }
      }
    if (!cold)
      return [
        "No cold spots (rank > 10). Keep going: add fresh photos to GBP and sustain review velocity.",
      ];
    ideas.push(
      `Focus on ${cold} cold cells (>10). Prioritize worst cell at row ${worst.r + 1}, col ${worst.c + 1} (rank ${worst.rank}).`
    );
    ideas.push(
      `Publish a GBP post targeting this sub‑area; name nearby anchors (parks, cafés, LRT). Link with UTM (source=google, medium=gbp).`
    );
    ideas.push(
      `On the site's ${keyword.split(" ")[0]} page, add a short paragraph mentioning ${s.keyword} in Bridgeland/Riverside with walking directions.`
    );
    ideas.push(
      `Earn a local link (BIA/event/neighbor). Even one high‑quality neighborhood link can lift a quadrant of the grid.`
    );
    ideas.push(
      `Upload 4–6 new georelevant photos this week (exterior/interior/team/tools).`
    );
    return ideas;
  }

  // Self tests
  type Test = { name: string; passed: boolean; details?: string };
  const runTests = useCallback((): Test[] => {
    const tests: Test[] = [];
    const g = [
      [1, 3, 5],
      [7, 11, 15],
    ] as (number | null)[][];
    const m1 = metrics(g);
    tests.push({
      name: "avg ~7",
      passed: Math.abs(m1.avg - 7) < 0.01,
      details: m1.avg.toFixed(2),
    });
    tests.push({
      name: "top3 count=2",
      passed: m1.top3 === 2,
      details: String(m1.top3),
    });
    tests.push({
      name: "coverage=100%",
      passed: Math.round(m1.coverage) === 100,
      details: m1.coverage.toFixed(1) + "%",
    });
    // Color range bounds
    tests.push({
      name: "rankBg(1) greenish",
      passed: /hsl\(\d+ 70% 50%\)/.test(rankBg(1)),
    });
    tests.push({
      name: "rankBg(null) gray",
      passed: rankBg(null) === "#e5e7eb",
    });
    return tests;
  }, []);

  // Bulk operations handlers
  function handleBulkImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const csv = ev.target?.result as string;
      const rows = fromCSV(csv);

      // Process bulk import data
      const newSnapshots: Snapshot[] = [];
      rows.forEach((row: any) => {
        if (row.keyword && row.location) {
          const lat = parseFloat(row.latitude || row.lat || "51.0447");
          const lng = parseFloat(row.longitude || row.lng || "-114.0719");

          const snapshot: Snapshot = {
            id: crypto.randomUUID?.() || String(Math.random()),
            date: todayISO(),
            keyword: row.keyword,
            rows: 3,
            cols: 3,
            grid: makeGrid(3, 3, null),
            location: row.location,
            device: (row.device as "mobile" | "desktop") || "mobile",
            searchType:
              (row.search_type as "local" | "organic" | "maps") || "local",
          };
          newSnapshots.push(snapshot);
        }
      });

      setSnapshots((prev) => [...newSnapshots, ...prev]);
      alert(`Successfully imported ${newSnapshots.length} snapshots`);
    };
    reader.readAsText(file);
  }

  function handleCompetitorImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const csv = ev.target?.result as string;
      const rows = fromCSV(csv);

      const newCompetitors: CompetitorData[] = [];
      rows.forEach((row: any) => {
        if (row.name && row.rank) {
          newCompetitors.push({
            name: row.name,
            rank: parseInt(row.rank),
            url: row.url || undefined,
            notes: row.location || undefined,
          });
        }
      });

      setCompetitors((prev) => [...prev, ...newCompetitors]);
      alert(`Successfully imported ${newCompetitors.length} competitors`);
    };
    reader.readAsText(file);
  }

  function exportComprehensiveReport() {
    const reportData = snapshots.map((snapshot) => ({
      date: snapshot.date,
      keyword: snapshot.keyword,
      location: snapshot.location || location,
      device: snapshot.device || device,
      searchType: snapshot.searchType || searchType,
      averageRank: metrics(snapshot.grid).avg,
      top3Count: metrics(snapshot.grid).top3,
      visibilityScore: metrics(snapshot.grid).visScore,
      competitors: snapshot.competitors?.length || 0,
      alerts: snapshot.alerts?.length || 0,
    }));

    const csv = toCSV(reportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveBlob(blob, `belmont-comprehensive-report-${todayISO()}.csv`);
  }

  function exportTrendAnalysis() {
    const trendData = snapshots
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((snapshot) => ({
        date: snapshot.date,
        keyword: snapshot.keyword,
        location: snapshot.location || location,
        averageRank: metrics(snapshot.grid).avg,
        top3Coverage: metrics(snapshot.grid).top3,
        visibilityScore: metrics(snapshot.grid).visScore,
        coverage: metrics(snapshot.grid).coverage,
      }));

    const csv = toCSV(trendData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveBlob(blob, `belmont-trend-analysis-${todayISO()}.csv`);
  }

  function exportCompetitorAnalysis() {
    const competitorData = competitors.map((competitor) => ({
      name: competitor.name,
      rank: competitor.rank,
      url: competitor.url || "",
      location: competitor.notes || "",
      marketPosition: getCompetitorInsights(competitors, Math.round(m.avg))
        .marketPosition,
      ourRank: Math.round(m.avg),
    }));

    const csv = toCSV(competitorData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveBlob(blob, `belmont-competitor-analysis-${todayISO()}.csv`);
  }

  function generateBulkTemplates() {
    // Generate keyword/location template
    const keywordTemplate = [
      {
        keyword: "barber bridgeland",
        location: "Calgary, AB",
        latitude: "51.0447",
        longitude: "-114.0719",
        device: "mobile",
        search_type: "local",
      },
      {
        keyword: "haircut calgary",
        location: "Calgary, AB",
        latitude: "51.0447",
        longitude: "-114.0719",
        device: "mobile",
        search_type: "local",
      },
    ];

    // Generate competitor template
    const competitorTemplate = [
      {
        name: "Competitor Barbershop",
        rank: "5",
        location: "Calgary, AB",
        url: "https://example.com",
      },
      {
        name: "Another Competitor",
        rank: "8",
        location: "Calgary, AB",
        url: "https://example2.com",
      },
    ];

    // Export both templates
    const keywordCsv = toCSV(keywordTemplate);
    const competitorCsv = toCSV(competitorTemplate);

    const keywordBlob = new Blob([keywordCsv], {
      type: "text/csv;charset=utf-8;",
    });
    const competitorBlob = new Blob([competitorCsv], {
      type: "text/csv;charset=utf-8;",
    });

    saveBlob(keywordBlob, `belmont-keyword-template-${todayISO()}.csv`);
    setTimeout(() => {
      saveBlob(competitorBlob, `belmont-competitor-template-${todayISO()}.csv`);
    }, 500);
  }

  function clearAllData() {
    if (
      confirm("Are you sure you want to clear all data? This cannot be undone.")
    ) {
      setSnapshots([]);
      setCompetitors([]);
      setAlerts([]);
      setGoals([]);
      alert("All data has been cleared");
    }
  }

  // Analytics helper functions
  function calculateForecast() {
    if (snapshots.length < 2) {
      return {
        nextWeek: m.avg || 0,
        nextMonth: m.avg || 0,
        trend: "stable" as const,
        confidence: 0,
      };
    }

    const sortedSnapshots = snapshots.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate trend using linear regression
    const n = sortedSnapshots.length;
    const xValues = sortedSnapshots.map((_, i) => i);
    const yValues = sortedSnapshots.map((s) => metrics(s.grid).avg);

    const xMean = xValues.reduce((a, b) => a + b, 0) / n;
    const yMean = yValues.reduce((a, b) => a + b, 0) / n;

    const slope =
      xValues.reduce(
        (sum, x, i) => sum + (x - xMean) * (yValues[i] - yMean),
        0
      ) / xValues.reduce((sum, x) => sum + Math.pow(x - xMean, 2), 0);

    const intercept = yMean - slope * xMean;

    // Forecast next week and month
    const nextWeek = Math.max(1, Math.min(20, intercept + slope * (n + 1)));
    const nextMonth = Math.max(1, Math.min(20, intercept + slope * (n + 4)));

    // Determine trend
    let trend: "improving" | "stable" | "declining" = "stable";
    if (slope < -0.1) trend = "improving";
    if (slope > 0.1) trend = "declining";

    // Calculate confidence based on data consistency
    const variance =
      yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0) / n;
    const confidence = Math.max(0, Math.min(100, 100 - variance * 10));

    return { nextWeek, nextMonth, trend, confidence };
  }

  function getTopKeywords() {
    const keywordStats = new Map<string, { total: number; count: number }>();

    snapshots.forEach((snapshot) => {
      const existing = keywordStats.get(snapshot.keyword) || {
        total: 0,
        count: 0,
      };
      const avgRank = metrics(snapshot.grid).avg;
      if (!isNaN(avgRank)) {
        existing.total += avgRank;
        existing.count += 1;
      }
      keywordStats.set(snapshot.keyword, existing);
    });

    return Array.from(keywordStats.entries())
      .map(([keyword, stats]) => ({
        keyword,
        avgRank: stats.total / stats.count,
        count: stats.count,
      }))
      .filter((item) => item.avgRank <= 10)
      .sort((a, b) => a.avgRank - b.avgRank)
      .slice(0, 5);
  }

  function getImprovementOpportunities() {
    const keywordStats = new Map<string, { total: number; count: number }>();

    snapshots.forEach((snapshot) => {
      const existing = keywordStats.get(snapshot.keyword) || {
        total: 0,
        count: 0,
      };
      const avgRank = metrics(snapshot.grid).avg;
      if (!isNaN(avgRank)) {
        existing.total += avgRank;
        existing.count += 1;
      }
      keywordStats.set(snapshot.keyword, existing);
    });

    return Array.from(keywordStats.entries())
      .map(([keyword, stats]) => ({
        keyword,
        avgRank: stats.total / stats.count,
        count: stats.count,
        potential: Math.max(0, stats.total / stats.count - 3), // Potential improvement to top 3
      }))
      .filter((item) => item.avgRank > 5 && item.avgRank <= 15)
      .sort((a, b) => b.potential - a.potential)
      .slice(0, 5);
  }

  // Heatmap helper functions
  function getHeatmapColor(rank: number): string {
    if (rank <= 5) return "#22c55e"; // green-500
    if (rank <= 10) return "#eab308"; // yellow-500
    if (rank <= 15) return "#f97316"; // orange-500
    return "#ef4444"; // red-500
  }

  function getCalgaryNeighborhoods() {
    const neighborhoods = [
      "Downtown Calgary",
      "Bridgeland",
      "Riverside",
      "Mission",
      "Inglewood",
      "Kensington",
      "Hillhurst",
      "Sunalta",
      "Connaught",
      "Mount Pleasant",
      "East Village",
      "Beltline",
      "Glenmore Park",
      "Lakeview",
      "Oakridge",
      "Queensland",
      "Hawkwood",
      "Wildewood",
      "Spruce Cliff",
      "Signal Hill",
      "South Calgary",
    ];

    return neighborhoods
      .map((name, index) => {
        // Generate realistic ranking data for demo purposes
        const baseRank = Math.floor(Math.random() * 15) + 1;
        const dataPoints = Math.floor(Math.random() * 20) + 5;
        const bestRank = Math.max(1, baseRank - Math.floor(Math.random() * 3));

        return {
          name,
          avgRank: baseRank,
          bestRank,
          dataPoints,
        };
      })
      .sort((a, b) => a.avgRank - b.avgRank);
  }

  // Mobile-specific handler functions
  function handleMobileRankSelect(rank: number) {
    const newGrid = makeGrid(rows, cols, null);

    // Place selected ranks in grid positions
    let rankIndex = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rankIndex < selectedMobileRanks.length) {
          newGrid[r][c] = selectedMobileRanks[rankIndex];
          rankIndex++;
        }
      }
    }

    // Add the new rank to the selection
    const updatedRanks = [...selectedMobileRanks, rank].slice(0, rows * cols);
    setSelectedMobileRanks(updatedRanks);

    // Update grid with new ranks
    setGrid(newGrid);
  }

  function handleMobileLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          alert(
            `Location updated: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          );
        },
        (error) => {
          alert("Unable to get location. Please enable GPS and try again.");
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }

  function exportMobileReport() {
    const reportData = {
      date: todayISO(),
      location,
      device,
      searchType,
      keyword,
      averageRank: m.avg,
      top3Count: m.top3,
      visibilityScore: m.visScore,
      competitors: competitors.length,
      alerts: alerts.length,
      snapshots: snapshots.length,
    };

    const reportJson = JSON.stringify(reportData, null, 2);
    const blob = new Blob([reportJson], {
      type: "application/json;charset=utf-8;",
    });
    saveBlob(blob, `belmont-mobile-report-${todayISO()}.json`);

    // Also create a shareable text summary
    const shareText = `Belmont Ranking Report:
📍 Location: ${location}
🔍 Keyword: ${keyword}
📊 Avg Rank: ${m.avg.toFixed(1)}
🎯 Top 3: ${m.top3}
👁️ Visibility: ${m.visScore.toFixed(1)}%
📱 Device: ${device}
🗓️ Date: ${todayISO()}`;

    navigator.clipboard.writeText(shareText).then(() => {
      alert("Report copied to clipboard for sharing!");
    });
  }

  function scanQRCode() {
    // This would integrate with a QR code scanning library
    alert(
      "QR Code scanning feature would open camera to scan competitor QR codes or location markers."
    );
  }

  // Navigation functions for tool integrations
  function navigateToGBP() {
    // This would navigate to the GBP composer tool
    alert(
      "Navigate to GBP Composer to optimize Belmont's Google Business Profile based on ranking data"
    );
  }

  function navigateToReviewComposer() {
    // This would navigate to the review composer tool
    alert(
      "Navigate to Review Composer to create response templates that correlate with ranking improvements"
    );
  }

  function navigateToMetaPlanner() {
    // This would navigate to the meta planner tool
    alert(
      "Navigate to Meta Planner to optimize page titles and descriptions for ranking keywords"
    );
  }

  function navigateToPostOracle() {
    // This would navigate to the content calendar tool
    alert(
      "Navigate to Content Calendar to schedule posts around ranking monitoring and improvement opportunities"
    );
  }

  function navigateToLinkMap() {
    // This would navigate to the link map tool
    alert(
      "Navigate to Link Map to develop backlink strategies for local ranking improvement"
    );
  }

  function navigateToNeighborSignal() {
    // This would navigate to the local content tool
    alert(
      "Navigate to Local Content Ideas to generate neighborhood-focused content for ranking keywords"
    );
  }

  // Report generation functions
  function generateExecutiveReport() {
    const report = {
      title: "Belmont Barbershop - Local Search Performance Report",
      date: todayISO(),
      executiveSummary: {
        averageRanking: m.avg,
        visibilityScore: m.visScore,
        top3Coverage: m.top3,
        marketPosition: getCompetitorInsights(competitors, Math.round(m.avg))
          .marketPosition,
        trend: calculateForecast().trend,
        keyAchievements: [
          `${alerts.filter((a) => a.type === "improvement").length} ranking improvements tracked`,
          `${goals.filter((g) => g.id).length} active goals being pursued`,
          `${snapshots.length} data points collected`,
          `${Array.from(new Set(snapshots.map((s) => s.keyword))).length} keywords monitored`,
        ],
        recommendations: [
          alerts.filter((a) => a.severity === "high").length > 0
            ? "Address critical ranking alerts immediately"
            : null,
          getImprovementOpportunities().length > 0
            ? `Focus on improving "${getImprovementOpportunities()[0]?.keyword}" keyword`
            : null,
          "Continue weekly ranking monitoring",
          "Track competitor movements monthly",
        ].filter(Boolean),
      },
      performanceMetrics: {
        current: {
          averageRank: m.avg,
          visibilityScore: m.visScore,
          top3Coverage: m.top3,
          coverage: m.coverage,
        },
        forecast: {
          nextWeek: calculateForecast().nextWeek,
          nextMonth: calculateForecast().nextMonth,
          trend: calculateForecast().trend,
          confidence: calculateForecast().confidence,
        },
      },
      competitiveAnalysis: {
        trackedCompetitors: competitors.length,
        marketPosition: getCompetitorInsights(competitors, Math.round(m.avg))
          .marketPosition,
        competitorsAhead: getCompetitorInsights(competitors, Math.round(m.avg))
          .ahead,
        closestCompetitor: getCompetitorInsights(competitors, Math.round(m.avg))
          .closestCompetitor,
      },
      goalsAndAlerts: {
        activeGoals: goals.filter((g) => g.id).length,
        criticalAlerts: alerts.filter((a) => a.severity === "high").length,
        totalAlerts: alerts.length,
      },
    };

    const jsonReport = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonReport], {
      type: "application/json;charset=utf-8;",
    });
    saveBlob(blob, `belmont-executive-report-${todayISO()}.json`);
  }

  function generateTechnicalReport() {
    const technicalData = {
      metadata: {
        reportDate: todayISO(),
        dataCollectionPeriod:
          snapshots.length > 0
            ? `${snapshots[snapshots.length - 1]?.date} to ${snapshots[0]?.date}`
            : "No data",
        totalSnapshots: snapshots.length,
        uniqueKeywords: Array.from(new Set(snapshots.map((s) => s.keyword)))
          .length,
        gridConfiguration: `${rows}x${cols}`,
        deviceType: device,
        searchType: searchType,
      },
      statisticalAnalysis: {
        rankingDistribution: {
          average: m.avg,
          median: m.med,
          standardDeviation:
            snapshots.length > 1
              ? Math.sqrt(
                  snapshots.reduce(
                    (sum, s) => sum + Math.pow(metrics(s.grid).avg - m.avg, 2),
                    0
                  ) / snapshots.length
                )
              : 0,
          min:
            snapshots.length > 0
              ? Math.min(...snapshots.map((s) => metrics(s.grid).avg))
              : 0,
          max:
            snapshots.length > 0
              ? Math.max(...snapshots.map((s) => metrics(s.grid).avg))
              : 0,
        },
        visibilityMetrics: {
          overallVisibilityScore: m.visScore,
          top3Coverage: m.top3,
          top10Coverage: m.top10,
          coveragePercentage: m.coverage,
        },
        trendAnalysis: {
          slope:
            snapshots.length > 1 ? calculateForecast().nextWeek - m.avg : 0,
          direction: calculateForecast().trend,
          confidence: calculateForecast().confidence,
          volatility:
            snapshots.length > 1
              ? snapshots.reduce(
                  (sum, s) => sum + Math.abs(metrics(s.grid).avg - m.avg),
                  0
                ) / snapshots.length
              : 0,
        },
      },
      keywordPerformance: Array.from(
        new Set(snapshots.map((s) => s.keyword))
      ).map((keyword) => {
        const keywordSnapshots = snapshots.filter((s) => s.keyword === keyword);
        const avgRank =
          keywordSnapshots.reduce((sum, s) => sum + metrics(s.grid).avg, 0) /
          keywordSnapshots.length;
        return {
          keyword,
          averageRank: avgRank,
          sampleSize: keywordSnapshots.length,
          firstSeen: keywordSnapshots.sort((a, b) =>
            a.date.localeCompare(b.date)
          )[0]?.date,
          lastSeen: keywordSnapshots.sort((a, b) =>
            b.date.localeCompare(a.date)
          )[0]?.date,
          trend:
            keywordSnapshots.length > 1
              ? (metrics(keywordSnapshots[keywordSnapshots.length - 1].grid)
                  .avg -
                  metrics(keywordSnapshots[0].grid).avg) /
                keywordSnapshots.length
              : 0,
        };
      }),
      competitorAnalysis: competitors.map((competitor, index) => ({
        rank: index + 1,
        name: competitor.name,
        position: competitor.rank,
        url: competitor.url,
        notes: competitor.notes,
        relativePosition: competitor.rank - Math.round(m.avg),
      })),
      alertsSummary: {
        total: alerts.length,
        byType: {
          improvement: alerts.filter((a) => a.type === "improvement").length,
          decline: alerts.filter((a) => a.type === "decline").length,
          milestone: alerts.filter((a) => a.type === "milestone").length,
          competitor: alerts.filter((a) => a.type === "competitor").length,
        },
        bySeverity: {
          high: alerts.filter((a) => a.severity === "high").length,
          medium: alerts.filter((a) => a.severity === "medium").length,
          low: alerts.filter((a) => a.severity === "low").length,
        },
      },
    };

    const jsonReport = JSON.stringify(technicalData, null, 2);
    const blob = new Blob([jsonReport], {
      type: "application/json;charset=utf-8;",
    });
    saveBlob(blob, `belmont-technical-report-${todayISO()}.json`);
  }

  function generateCompetitorReport() {
    const competitorReport = {
      reportTitle: "Belmont Barbershop - Competitor Analysis Report",
      generatedDate: todayISO(),
      overview: {
        totalTrackedCompetitors: competitors.length,
        belmontAverageRank: m.avg,
        marketPosition: getCompetitorInsights(competitors, Math.round(m.avg))
          .marketPosition,
        competitorsAhead: getCompetitorInsights(competitors, Math.round(m.avg))
          .ahead,
        competitorsBehind: getCompetitorInsights(competitors, Math.round(m.avg))
          .behind,
      },
      competitorDetails: competitors
        .map((competitor, index) => ({
          rank: index + 1,
          name: competitor.name,
          position: competitor.rank,
          gap: competitor.rank - Math.round(m.avg),
          url: competitor.url,
          location: competitor.notes,
          threatLevel:
            competitor.rank <= Math.round(m.avg) + 2
              ? "High"
              : competitor.rank <= Math.round(m.avg) + 5
                ? "Medium"
                : "Low",
        }))
        .sort((a, b) => a.position - b.position),
      competitiveInsights: {
        marketShare:
          competitors.length > 0
            ? Math.round((1 / (competitors.length + 1)) * 100)
            : 100,
        rankingDistribution: {
          top3: competitors.filter((c) => c.rank <= 3).length,
          top10: competitors.filter((c) => c.rank <= 10).length,
          top20: competitors.filter((c) => c.rank <= 20).length,
        },
        opportunityAreas: getImprovementOpportunities().map((opp) => ({
          keyword: opp.keyword,
          currentRank: opp.avgRank,
          potentialGain: opp.potential,
          competitivePressure: competitors.filter((c) =>
            snapshots
              .filter((s) => s.keyword === opp.keyword)
              .some((s) =>
                competitors.some(
                  (comp) => Math.abs(comp.rank - metrics(s.grid).avg) <= 2
                )
              )
          ).length,
        })),
      },
      recommendations: [
        getCompetitorInsights(competitors, Math.round(m.avg)).ahead > 0
          ? `Monitor the ${getCompetitorInsights(competitors, Math.round(m.avg)).ahead} competitors ahead of Belmont closely`
          : null,
        competitors.filter((c) => c.rank <= Math.round(m.avg) + 2).length > 0
          ? "Address immediate competitive threats in top positions"
          : null,
        "Continue tracking competitor ranking changes weekly",
        "Analyze competitor content and GBP strategies for insights",
      ].filter(Boolean),
    };

    const jsonReport = JSON.stringify(competitorReport, null, 2);
    const blob = new Blob([jsonReport], {
      type: "application/json;charset=utf-8;",
    });
    saveBlob(blob, `belmont-competitor-report-${todayISO()}.json`);
  }

  function generateTrendReport() {
    const trendReport = {
      title: "Belmont Barbershop - Trend Analysis Report",
      period:
        snapshots.length > 0
          ? `${snapshots[snapshots.length - 1]?.date} to ${snapshots[0]?.date}`
          : "No historical data",
      summary: {
        totalDataPoints: snapshots.length,
        uniqueKeywords: Array.from(new Set(snapshots.map((s) => s.keyword)))
          .length,
        dateRange:
          snapshots.length > 0
            ? {
                start: snapshots.sort((a, b) => a.date.localeCompare(b.date))[0]
                  ?.date,
                end: snapshots.sort((a, b) => b.date.localeCompare(a.date))[0]
                  ?.date,
              }
            : null,
        overallTrend: calculateForecast().trend,
        trendConfidence: calculateForecast().confidence,
      },
      keywordTrends: Array.from(new Set(snapshots.map((s) => s.keyword)))
        .map((keyword) => {
          const keywordData = snapshots
            .filter((s) => s.keyword === keyword)
            .sort((a, b) => a.date.localeCompare(b.date));

          if (keywordData.length < 2) return null;

          const ranks = keywordData.map((s) => metrics(s.grid).avg);
          const trend = (ranks[ranks.length - 1] - ranks[0]) / ranks.length;
          const volatility =
            ranks.reduce(
              (sum, rank, i) =>
                i > 0 ? sum + Math.abs(rank - ranks[i - 1]) : sum,
              0
            ) /
            (ranks.length - 1);

          return {
            keyword,
            dataPoints: keywordData.length,
            startRank: ranks[0],
            endRank: ranks[ranks.length - 1],
            trend: trend,
            direction:
              trend < -0.1 ? "improving" : trend > 0.1 ? "declining" : "stable",
            volatility: volatility,
            averageRank: ranks.reduce((a, b) => a + b, 0) / ranks.length,
            bestRank: Math.min(...ranks),
            worstRank: Math.max(...ranks),
          };
        })
        .filter(Boolean),
      seasonalAnalysis: {
        dailyPatterns: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ].map((day, index) => {
          const dayData = snapshots.filter((s) => {
            const date = new Date(s.date);
            return date.getDay() === index;
          });
          return {
            day,
            averageRank:
              dayData.length > 0
                ? dayData.reduce((sum, s) => sum + metrics(s.grid).avg, 0) /
                  dayData.length
                : null,
            dataPoints: dayData.length,
          };
        }),
        monthlyPatterns: Array.from({ length: 12 }, (_, i) => {
          const monthData = snapshots.filter((s) => {
            const date = new Date(s.date);
            return date.getMonth() === i;
          });
          return {
            month: new Date(2024, i).toLocaleString("default", {
              month: "long",
            }),
            averageRank:
              monthData.length > 0
                ? monthData.reduce((sum, s) => sum + metrics(s.grid).avg, 0) /
                  monthData.length
                : null,
            dataPoints: monthData.length,
          };
        }),
      },
      forecast: {
        nextWeek: calculateForecast().nextWeek,
        nextMonth: calculateForecast().nextMonth,
        confidence: calculateForecast().confidence,
        recommendations: [
          calculateForecast().trend === "improving"
            ? "Continue current SEO strategies"
            : null,
          calculateForecast().trend === "declining"
            ? "Investigate ranking drops and implement fixes"
            : null,
          calculateForecast().trend === "stable"
            ? "Monitor for opportunities to improve rankings"
            : null,
          `Monitor ${getImprovementOpportunities().length} keywords with improvement potential`,
        ].filter(Boolean),
      },
    };

    const jsonReport = JSON.stringify(trendReport, null, 2);
    const blob = new Blob([jsonReport], {
      type: "application/json;charset=utf-8;",
    });
    saveBlob(blob, `belmont-trend-report-${todayISO()}.json`);
  }

  function generateGoalProgressReport() {
    const goalReport = {
      title: "Belmont Barbershop - Goal Progress Report",
      generatedDate: todayISO(),
      summary: {
        totalGoals: goals.filter((g) => g.id).length,
        completedGoals: goals.filter((g) => {
          if (!g.id) return false;
          const currentRank = snapshots
            .filter((s) => s.keyword === g.keyword)
            .sort((a, b) => b.date.localeCompare(a.date))[0];
          return (
            currentRank &&
            Math.min(
              ...(currentRank.grid.flat().filter((r) => r) as number[])
            ) <= g.targetRank
          );
        }).length,
        activeGoals: goals.filter((g) => g.id).length,
        successRate:
          goals.filter((g) => g.id).length > 0
            ? (goals.filter((g) => {
                if (!g.id) return false;
                const currentRank = snapshots
                  .filter((s) => s.keyword === g.keyword)
                  .sort((a, b) => b.date.localeCompare(a.date))[0];
                return (
                  currentRank &&
                  Math.min(
                    ...(currentRank.grid.flat().filter((r) => r) as number[])
                  ) <= g.targetRank
                );
              }).length /
                goals.filter((g) => g.id).length) *
              100
            : 0,
      },
      goalDetails: goals
        .filter((g) => g.id)
        .map((goal) => {
          const currentRank = snapshots
            .filter((s) => s.keyword === goal.keyword)
            .sort((a, b) => b.date.localeCompare(a.date))[0];

          const currentBest = currentRank
            ? Math.min(
                ...(currentRank.grid.flat().filter((r) => r) as number[])
              )
            : null;

          const progress = currentBest
            ? Math.max(
                0,
                Math.min(
                  100,
                  ((goal.targetRank - currentBest) / goal.targetRank) * 100
                )
              )
            : 0;

          return {
            keyword: goal.keyword,
            targetRank: goal.targetRank,
            currentRank: currentBest,
            progress: progress,
            status:
              currentBest && currentBest <= goal.targetRank
                ? "Achieved"
                : progress > 75
                  ? "On Track"
                  : progress > 50
                    ? "Making Progress"
                    : "Needs Attention",
            daysActive: currentRank
              ? Math.ceil(
                  (new Date().getTime() -
                    new Date(currentRank.date).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : 0,
            dataPoints: snapshots.filter((s) => s.keyword === goal.keyword)
              .length,
          };
        }),
      insights: {
        topPerformingGoals: goals
          .filter((g) => g.id)
          .map((goal) => {
            const currentRank = snapshots
              .filter((s) => s.keyword === goal.keyword)
              .sort((a, b) => b.date.localeCompare(a.date))[0];
            const currentBest = currentRank
              ? Math.min(
                  ...(currentRank.grid.flat().filter((r) => r) as number[])
                )
              : null;
            const progress = currentBest
              ? Math.max(
                  0,
                  Math.min(
                    100,
                    ((goal.targetRank - currentBest) / goal.targetRank) * 100
                  )
                )
              : 0;
            return {
              keyword: goal.keyword,
              progress,
              targetRank: goal.targetRank,
              currentBest,
            };
          })
          .sort((a, b) => b.progress - a.progress)
          .slice(0, 3),
        strugglingGoals: goals
          .filter((g) => g.id)
          .map((goal) => {
            const currentRank = snapshots
              .filter((s) => s.keyword === goal.keyword)
              .sort((a, b) => b.date.localeCompare(a.date))[0];
            const currentBest = currentRank
              ? Math.min(
                  ...(currentRank.grid.flat().filter((r) => r) as number[])
                )
              : null;
            const progress = currentBest
              ? Math.max(
                  0,
                  Math.min(
                    100,
                    ((goal.targetRank - currentBest) / goal.targetRank) * 100
                  )
                )
              : 0;
            return {
              keyword: goal.keyword,
              progress,
              targetRank: goal.targetRank,
              currentBest,
            };
          })
          .filter((g) => g.progress < 50)
          .sort((a, b) => a.progress - b.progress)
          .slice(0, 3),
      },
      recommendations: [
        goals.filter((g) => g.id).length === 0
          ? "Set specific ranking goals to track progress"
          : null,
        goals.filter((g) => {
          const currentRank = snapshots
            .filter((s) => s.keyword === g.keyword)
            .sort((a, b) => b.date.localeCompare(a.date))[0];
          return (
            currentRank &&
            Math.min(
              ...(currentRank.grid.flat().filter((r) => r) as number[])
            ) <= g.targetRank
          );
        }).length > 0
          ? "Celebrate achieved goals and set new targets"
          : null,
        "Review struggling goals and adjust SEO strategies",
        "Consider increasing monitoring frequency for critical goals",
      ].filter(Boolean),
    };

    const jsonReport = JSON.stringify(goalReport, null, 2);
    const blob = new Blob([jsonReport], {
      type: "application/json;charset=utf-8;",
    });
    saveBlob(blob, `belmont-goals-report-${todayISO()}.json`);
  }

  function generateMonthlySummary() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyData = snapshots.filter((s) => {
      const date = new Date(s.date);
      return (
        date.getMonth() === currentMonth && date.getFullYear() === currentYear
      );
    });

    const monthlyReport = {
      title: `Belmont Barbershop - Monthly Summary (${new Date(currentYear, currentMonth).toLocaleString("default", { month: "long" })} ${currentYear})`,
      period: {
        month: new Date(currentYear, currentMonth).toLocaleString("default", {
          month: "long",
        }),
        year: currentYear,
        days: new Date(currentYear, currentMonth + 1, 0).getDate(),
      },
      dataSummary: {
        totalSnapshots: monthlyData.length,
        uniqueKeywords: Array.from(new Set(monthlyData.map((s) => s.keyword)))
          .length,
        averageRankings:
          monthlyData.length > 0
            ? monthlyData.reduce((sum, s) => sum + metrics(s.grid).avg, 0) /
              monthlyData.length
            : 0,
        top3Appearances: monthlyData.reduce(
          (sum, s) => sum + metrics(s.grid).top3,
          0
        ),
        visibilityScore:
          monthlyData.length > 0
            ? monthlyData.reduce(
                (sum, s) => sum + metrics(s.grid).visScore,
                0
              ) / monthlyData.length
            : 0,
      },
      dailyBreakdown: Array.from({ length: 31 }, (_, i) => i + 1)
        .map((day) => {
          const dayData = monthlyData.filter((s) => {
            const date = new Date(s.date);
            return date.getDate() === day;
          });

          return {
            day,
            snapshots: dayData.length,
            averageRank:
              dayData.length > 0
                ? dayData.reduce((sum, s) => sum + metrics(s.grid).avg, 0) /
                  dayData.length
                : null,
            keywords: Array.from(new Set(dayData.map((s) => s.keyword))),
          };
        })
        .filter((d) => d.snapshots > 0),
      keywordPerformance: Array.from(
        new Set(monthlyData.map((s) => s.keyword))
      ).map((keyword) => {
        const keywordData = monthlyData.filter((s) => s.keyword === keyword);
        return {
          keyword,
          snapshots: keywordData.length,
          averageRank:
            keywordData.reduce((sum, s) => sum + metrics(s.grid).avg, 0) /
            keywordData.length,
          bestRank: Math.min(
            ...keywordData.map((s) =>
              Math.min(...(s.grid.flat().filter((r) => r) as number[]))
            )
          ),
          trend:
            keywordData.length > 1
              ? (() => {
                  try {
                    const latest = keywordData[keywordData.length - 1];
                    const first = keywordData[0];
                    if (!latest?.grid || !first?.grid) return 0;
                    const latestFiltered = latest.grid
                      .flat()
                      .filter(
                        (r): r is number => r !== null && r !== undefined
                      );
                    const firstFiltered = first.grid
                      .flat()
                      .filter(
                        (r): r is number => r !== null && r !== undefined
                      );
                    if (
                      latestFiltered.length === 0 ||
                      firstFiltered.length === 0
                    )
                      return 0;
                    const latestAvg =
                      latestFiltered.reduce((a, b) => a + b, 0) /
                      latestFiltered.length;
                    const firstAvg =
                      firstFiltered.reduce((a, b) => a + b, 0) /
                      firstFiltered.length;
                    return latestAvg - firstAvg;
                  } catch {
                    return 0;
                  }
                })()
              : 0,
        };
      }),
      alertsThisMonth: alerts.filter((a) => {
        const alertDate = new Date(a.timestamp);
        return (
          alertDate.getMonth() === currentMonth &&
          alertDate.getFullYear() === currentYear
        );
      }),
      goalsProgress: goals
        .filter((g) => g.id)
        .map((goal) => {
          const goalData = monthlyData.filter(
            (s) => s.keyword === goal.keyword
          );
          const monthlyBest =
            goalData.length > 0
              ? Math.min(
                  ...goalData.map((s) =>
                    Math.min(...(s.grid.flat().filter((r) => r) as number[]))
                  )
                )
              : null;

          return {
            keyword: goal.keyword,
            targetRank: goal.targetRank,
            monthlyBest: monthlyBest,
            progress: monthlyBest
              ? Math.max(
                  0,
                  Math.min(
                    100,
                    ((goal.targetRank - monthlyBest) / goal.targetRank) * 100
                  )
                )
              : 0,
            status:
              monthlyBest && monthlyBest <= goal.targetRank
                ? "Achieved"
                : monthlyBest && monthlyBest <= goal.targetRank * 1.2
                  ? "On Track"
                  : "Needs Attention",
          };
        }),
      keyHighlights: [
        monthlyData.length > 20
          ? "Excellent monitoring frequency this month"
          : null,
        monthlyData.length > 0 &&
        monthlyData.reduce((sum, s) => sum + metrics(s.grid).avg, 0) /
          monthlyData.length <
          8
          ? "Strong average rankings this month"
          : null,
        alerts
          .filter((a) => {
            const alertDate = new Date(a.timestamp);
            return (
              alertDate.getMonth() === currentMonth &&
              alertDate.getFullYear() === currentYear
            );
          })
          .filter((a) => a.type === "improvement").length > 0
          ? "Multiple ranking improvements achieved"
          : null,
        goals
          .filter((g) => g.id)
          .filter((goal) => {
            const goalData = monthlyData.filter(
              (s) => s.keyword === goal.keyword
            );
            const monthlyBest =
              goalData.length > 0
                ? Math.min(
                    ...goalData.map((s) =>
                      Math.min(...(s.grid.flat().filter((r) => r) as number[]))
                    )
                  )
                : null;
            return monthlyBest && monthlyBest <= goal.targetRank;
          }).length > 0
          ? "Goal achievements this month"
          : null,
      ].filter(Boolean),
      nextMonthFocus: [
        "Continue monitoring high-performing keywords",
        getImprovementOpportunities().length > 0
          ? `Focus on improving "${getImprovementOpportunities()[0]?.keyword}"`
          : null,
        "Track competitor movements",
        "Review and update ranking goals",
      ].filter(Boolean),
    };

    const jsonReport = JSON.stringify(monthlyReport, null, 2);
    const blob = new Blob([jsonReport], {
      type: "application/json;charset=utf-8;",
    });
    saveBlob(blob, `belmont-monthly-summary-${todayISO()}.json`);
  }

  const tests = useMemo(() => runTests(), [runTests]);
  const passCount = tests.filter((t) => t.passed).length;

  return (
    <div className="p-5 md:p-8 space-y-6">
      <PageHeader
        title="AI Ranking Intelligence Studio"
        subtitle="AI-powered search ranking analysis with optimization recommendations, competitor intelligence, and automated campaign management."
        showLogo={true}
        actions={
          <div className="flex gap-2">
            <Button
              onClick={generateAIOptimization}
              disabled={!selectedKeyword || !apiKey}
              variant="outline"
            >
              <Brain className="h-4 w-4 mr-2" />
              AI Optimize
            </Button>
            <Button
              onClick={calculateRankingAnalyticsData}
              disabled={snapshots.length === 0}
              variant="outline"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button
              onClick={exportEnhancedRankingReport}
              disabled={!rankingAnalytics}
              variant="outline"
            >
              <FileImage className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button variant="outline" onClick={loadDemo}>
              <Sparkles className="h-4 w-4 mr-2" />
              Load Demo
            </Button>
            <Button variant="outline" onClick={clearGrid}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Clear Grid
            </Button>
            {alerts.length > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Bell className="h-3 w-3" />
                {alerts.length} Alert{alerts.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Do this next</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <ol className="list-decimal pl-5 space-y-1">
            <li>Click Load Demo to see an example ranking grid.</li>
            <li>
              Add competitors and set ranking goals in their respective tabs.
            </li>
            <li>
              Pick a keyword and enter Belmont's ranking for each grid cell.
            </li>
            <li>Save snapshots regularly to track changes over time.</li>
            <li>Monitor automated alerts for significant ranking changes.</li>
            <li>
              Use competitor insights and goal tracking to guide your SEO
              strategy.
            </li>
          </ol>
        </CardContent>
      </Card>

      <Tabs defaultValue="howto" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-16 gap-1">
          <TabsTrigger value="howto">How To</TabsTrigger>
          <TabsTrigger value="grid">Grid Input</TabsTrigger>
          <TabsTrigger value="ai-optimize">AI Optimize</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="snapshots">Snapshots</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="heatmaps">Heat Maps</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="mobile">Mobile</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* How To */}
        <TabsContent value="howto">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  How to Use the Local Search Rankings Tool
                </CardTitle>
                <CardDescription>
                  Track where Belmont appears in Google Maps search results for
                  local customers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="h3 mb-2">
                      What This Tool Does
                    </h3>
                    <p className="text-muted-foreground">
                      This tool helps you track Belmont's position in Google
                      Maps search results. When customers search for "barber
                      near me" or "haircut Calgary", this shows exactly where
                      Belmont appears in the local search results (called the
                      "Local Pack").
                    </p>
                  </div>

                  <div>
                    <h3 className="h3 mb-2">
                      Why Local Rankings Matter for Belmont
                    </h3>
                    <p className="text-muted-foreground">
                      Local search rankings are crucial because most customers
                      find barbershops by:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground mt-2">
                      <li>Searching "barber near me" on their phones</li>
                      <li>Looking for "haircut" + their neighborhood name</li>
                      <li>Using Google Maps to find directions</li>
                      <li>Checking reviews and photos before booking</li>
                    </ul>
                    <p className="text-muted-foreground mt-2">
                      Being in the top 3 local results can dramatically increase
                      Belmont's customer traffic.
                    </p>
                  </div>

                  <div>
                    <h3 className="h3 mb-2">
                      Step-by-Step Instructions
                    </h3>
                    <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                      <li>
                        <strong>Choose a keyword:</strong> Pick a search term
                        customers might use (e.g., "barber bridgeland", "haircut
                        calgary")
                      </li>
                      <li>
                        <strong>Set grid size:</strong> Choose how many search
                        results you want to track (usually 3x3 or 4x4 is enough)
                      </li>
                      <li>
                        <strong>Collect rankings:</strong> Use a phone to search
                        for your keyword and note Belmont's position in the
                        results (1-20)
                      </li>
                      <li>
                        <strong>Enter the data:</strong> Fill in the grid with
                        Belmont's position for each search result
                      </li>
                      <li>
                        <strong>Save snapshot:</strong> Click "Save Snapshot" to
                        record your current rankings
                      </li>
                      <li>
                        <strong>Track over time:</strong> Repeat this process
                        weekly to see if Belmont's rankings improve
                      </li>
                      <li>
                        <strong>Check trends:</strong> Use the "Trends" tab to
                        see how Belmont's visibility changes over time
                      </li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="h3 mb-2">
                      Best Practices for Belmont
                    </h3>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>
                        <strong>Collect at consistent times:</strong> Always
                        check rankings at the same time of day and day of week
                        for accurate comparisons
                      </li>
                      <li>
                        <strong>Use a phone with location services:</strong>{" "}
                        Google Maps results are location-based, so use a phone
                        with GPS turned on
                      </li>
                      <li>
                        <strong>Track multiple keywords:</strong> Monitor
                        rankings for different search terms customers might use
                      </li>
                      <li>
                        <strong>Focus on position 1-3:</strong> Being in the top
                        3 local results is most important for getting customers
                      </li>
                      <li>
                        <strong>Check different locations:</strong> Test
                        rankings from different Calgary neighborhoods
                        (Bridgeland, Riverside, etc.)
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="h3 mb-2">
                      How to Collect Rankings
                    </h3>
                    <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                      <li>
                        Pick a keyword (e.g., <em>barber bridgeland</em>), set a
                        grid size
                      </li>
                      <li>
                        Use a phone with location services to search for your
                        keyword
                      </li>
                      <li>
                        Note Belmont's Local Pack position (1–20) for each
                        search result
                      </li>
                      <li>Enter ranks, save a snapshot, repeat weekly</li>
                      <li>
                        Track <strong>Visibility%</strong> (weighted), Top‑3
                        cells, and coverage over time in the Trends tab
                      </li>
                    </ol>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>Tip:</strong> For consistency, collect rankings at
                      similar times (avoid busy evening hours when results can
                      be more volatile).
                    </p>
                  </div>

                  <div>
                    <h3 className="h3 mb-2">
                      Understanding Your Results
                    </h3>
                    <p className="text-muted-foreground mb-2">
                      The tool calculates:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>
                        <strong>Visibility %:</strong> How often Belmont appears
                        in the top results (weighted by position)
                      </li>
                      <li>
                        <strong>Top-3 Coverage:</strong> Percentage of searches
                        where Belmont appears in positions 1-3
                      </li>
                      <li>
                        <strong>Average Position:</strong> Belmont's average
                        ranking across all searches
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Grid input */}
        <TabsContent value="grid">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Grid & Query
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-6 gap-3 items-end">
                <div>
                  <Label>Rows</Label>
                  <Input
                    type="number"
                    min={2}
                    max={9}
                    value={rows}
                    onChange={(e) =>
                      setRows(clamp(parseInt(e.target.value || "5"), 2, 9))
                    }
                  />
                </div>
                <div>
                  <Label>Cols</Label>
                  <Input
                    type="number"
                    min={2}
                    max={9}
                    value={cols}
                    onChange={(e) =>
                      setCols(clamp(parseInt(e.target.value || "5"), 2, 9))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Keyword</Label>
                  <Input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        loadDemo();
                      }
                    }}
                    placeholder="barber bridgeland"
                  />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={showNums}
                    onCheckedChange={(v) => setShowNums(Boolean(v))}
                  />
                  <Label>Show numbers</Label>
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-3">
                <div>
                  <Label className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Location
                  </Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Calgary, AB"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1">
                    {device === "mobile" ? (
                      <Smartphone className="h-3 w-3" />
                    ) : (
                      <Monitor className="h-3 w-3" />
                    )}
                    Device
                  </Label>
                  <select
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    value={device}
                    onChange={(e) =>
                      setDevice(e.target.value as "mobile" | "desktop")
                    }
                    aria-label="Device type selection"
                  >
                    <option value="mobile">Mobile</option>
                    <option value="desktop">Desktop</option>
                  </select>
                </div>
                <div>
                  <Label className="flex items-center gap-1">
                    <Search className="h-3 w-3" />
                    Search Type
                  </Label>
                  <select
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    value={searchType}
                    onChange={(e) =>
                      setSearchType(
                        e.target.value as "local" | "organic" | "maps"
                      )
                    }
                    aria-label="Search type selection"
                  >
                    <option value="local">Local Pack</option>
                    <option value="organic">Organic</option>
                    <option value="maps">Maps Only</option>
                  </select>
                </div>
                <div>
                  <Label>Competitors Count</Label>
                  <div className="flex items-center gap-2 px-3 py-2 border border-input rounded-md bg-muted">
                    <Users className="h-4 w-4" />
                    <span>{competitors.length}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(44px, 1fr))`,
                  gap: 6,
                }}
              >
                {grid.map((row, r) =>
                  row.map((val, c) => (
                    <div
                      key={`${r}-${c}`}
                      className="rounded-md p-1 border flex items-center justify-center relative"
                      style={{ background: rankBg(val || null) }}
                    >
                      <input
                        inputMode="numeric"
                        className="w-12 h-8 text-center bg-white/90 rounded-md border"
                        placeholder="–"
                        value={val ?? ""}
                        onChange={(e) => setCell(r, c, e.target.value)}
                        title={`Row ${r + 1}, Col ${c + 1}`}
                      />
                      {showNums && val != null && (
                        <span className="absolute text-[10px] -mt-10 bg-white/70 px-1 rounded">
                          {val}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="grid md:grid-cols-5 gap-3 items-end">
                <div className="md:col-span-3">
                  <Label>Notes</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., lunch slots, phone GPS mocked, etc."
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveSnapshot}>
                    <Target className="h-4 w-4 mr-2" />
                    Save Snapshot
                  </Button>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="file"
                    accept=".csv"
                    id="csvImp"
                    className="hidden"
                    onChange={onImportFile}
                  />
                  <label htmlFor="csvImp">
                    <Button variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Import CSV
                    </Button>
                  </label>
                  <Button variant="outline" onClick={exportCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button variant="outline" onClick={exportJSON}>
                    <Download className="h-4 w-4 mr-2" />
                    Export JSON
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <KPICard
                  label="Average Rank"
                  value={Number.isFinite(m.avg) ? m.avg.toFixed(1) : "—"}
                  hint="Current position"
                  icon={<TrendingUp className="h-4 w-4" />}
                />
                <KPICard
                  label="AI Status"
                  value={apiKey ? "Connected" : "Setup"}
                  hint="AI optimization"
                  icon={<Brain className="h-4 w-4" />}
                />
                <KPICard
                  label="Top‑3 Coverage"
                  value={`${m.top3}/${m.filled}`}
                  hint="Positions 1-3"
                  icon={<Award className="h-4 w-4" />}
                />
                <KPICard
                  label="Top‑10 Coverage"
                  value={`${m.top10}/${m.filled}`}
                  hint="Positions 1-10"
                  icon={<Target className="h-4 w-4" />}
                />
                <KPICard
                  label="Optimizations"
                  value={rankingLibrary.optimizations.length}
                  hint="AI recommendations"
                  icon={<Lightbulb className="h-4 w-4" />}
                />
                <KPICard
                  label="Campaigns"
                  value={rankingLibrary.campaigns.length}
                  hint="Active campaigns"
                  icon={<Activity className="h-4 w-4" />}
                />
              </div>

              {/* Enhanced Dashboard Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {/* Competitor Summary */}
                {competitors.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Market Position
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-xl font-bold text-green-600">
                            #
                            {
                              getCompetitorInsights(
                                competitors,
                                Math.round(m.avg)
                              ).marketPosition
                            }
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Your Rank
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-red-600">
                            {
                              getCompetitorInsights(
                                competitors,
                                Math.round(m.avg)
                              ).ahead
                            }
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Ahead of You
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Goals Progress */}
                {goals.filter((g) => g.id).length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Goal className="h-4 w-4" />
                        Active Goals
                      </h4>
                      <div className="space-y-2">
                        {goals
                          .filter((g) => g.id)
                          .slice(0, 2)
                          .map((goal) => {
                            const currentRank = snapshots
                              .filter((s) => s.keyword === goal.keyword)
                              .sort((a, b) => b.date.localeCompare(a.date))[0];

                            const progress = currentRank
                              ? Math.max(
                                  0,
                                  Math.min(
                                    100,
                                    ((goal.targetRank -
                                      Math.min(
                                        ...(currentRank.grid
                                          .flat()
                                          .filter((r) => r) as number[])
                                      )) /
                                      goal.targetRank) *
                                      100
                                  )
                                )
                              : 0;

                            return (
                              <div key={goal.id}>
                                <div className="flex justify-between items-center text-sm">
                                  <span>{goal.keyword}</span>
                                  <span>{progress.toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                                  <div
                                    className="bg-blue-600 h-1 rounded-full"
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Snapshots */}
        <TabsContent value="snapshots">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Saved Snapshots</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {snapshots.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No snapshots yet — save one from the Grid tab or click Load
                  Demo.
                </div>
              )}

              {snapshots.map((s, idx) => (
                <div key={s.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-medium">{s.keyword}</span> ·{" "}
                      {s.date} · {s.rows}x{s.cols} ·{" "}
                      <span className="text-muted-foreground">
                        {s.notes || ""}
                      </span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <Badge variant="secondary">
                        Avg {metrics(s.grid).avg.toFixed(2)}
                      </Badge>
                      <Badge variant="secondary">
                        Top‑3 {metrics(s.grid).top3}
                      </Badge>
                      <Badge variant="secondary">
                        Vis {metrics(s.grid).visScore.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                  <div
                    className="mt-3 grid"
                    style={{
                      gridTemplateColumns: `repeat(${s.cols}, minmax(24px, 1fr))`,
                      gap: 3,
                    }}
                  >
                    {s.grid.map((row, r) =>
                      row.map((val, c) => (
                        <div
                          key={`${s.id}-${r}-${c}`}
                          className="rounded-sm border text-center text-[10px] leading-4"
                          style={{ background: rankBg(val ?? null) }}
                        >
                          {val ?? ""}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    <span className="font-medium">Suggestions: </span>
                    {suggestions(s).join(" ")}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends */}
        <TabsContent value="trends">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Visibility Trend (by date)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <MultiLine
                  data={trendData}
                  xKey="date"
                  series={keywordList.map((k) => ({ key: k, name: `${k} (Vis%)` }))}
                  yDomain={[0, 100]}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Competitors */}
        <TabsContent value="competitors">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Competitor Tracking
              </CardTitle>
              <CardDescription>
                Track competitor rankings alongside Belmont's performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Competitor name"
                    value={competitors.find((c) => c.rank === 0)?.name || ""}
                    onChange={(e) => {
                      const name = e.target.value;
                      setCompetitors((prev) => {
                        const existing = prev.find((c) => c.rank === 0);
                        if (existing) {
                          return prev.map((c) =>
                            c.rank === 0 ? { ...c, name } : c
                          );
                        } else {
                          return [...prev, { name, rank: 0, notes: "" }];
                        }
                      });
                    }}
                  />
                  <Input
                    type="number"
                    placeholder="Rank"
                    min={1}
                    max={20}
                    className="w-20"
                    value={competitors.find((c) => c.rank === 0)?.rank || ""}
                    onChange={(e) => {
                      const rank = parseInt(e.target.value) || 0;
                      setCompetitors((prev) => {
                        const existing = prev.find((c) => c.rank === 0);
                        if (existing) {
                          return prev.map((c) =>
                            c.rank === 0 ? { ...c, rank } : c
                          );
                        } else {
                          return [...prev, { name: "", rank, notes: "" }];
                        }
                      });
                    }}
                  />
                  <Button
                    onClick={() => {
                      const competitor = competitors.find((c) => c.rank === 0);
                      if (
                        competitor &&
                        competitor.name &&
                        competitor.rank > 0
                      ) {
                        setCompetitors((prev) =>
                          prev.filter((c) => c.rank !== 0)
                        );
                      }
                    }}
                    size="sm"
                  >
                    Add
                  </Button>
                </div>

                <div className="space-y-2">
                  {competitors.map((competitor, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div>
                        <span className="font-medium">{competitor.name}</span>
                        <Badge variant="outline" className="ml-2">
                          #{competitor.rank}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setCompetitors((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>

                {competitors.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">
                        Market Position Analysis
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          Competitors ahead:{" "}
                          <Badge>
                            {
                              getCompetitorInsights(
                                competitors,
                                Math.round(m.avg)
                              ).ahead
                            }
                          </Badge>
                        </div>
                        <div>
                          Market position:{" "}
                          <Badge>
                            #
                            {
                              getCompetitorInsights(
                                competitors,
                                Math.round(m.avg)
                              ).marketPosition
                            }
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Ranking Alerts & Notifications
              </CardTitle>
              <CardDescription>
                Automatic alerts for ranking changes and milestones
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>
                    No alerts yet. Save a snapshot to start monitoring changes.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 border-l-4 rounded ${
                        alert.severity === "high"
                          ? "border-l-red-500 bg-red-50"
                          : alert.severity === "medium"
                            ? "border-l-yellow-500 bg-yellow-50"
                            : "border-l-green-500 bg-green-50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {alert.type === "improvement" && (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        )}
                        {alert.type === "decline" && (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        {alert.type === "milestone" && (
                          <Target className="h-4 w-4 text-blue-600" />
                        )}
                        <span className="font-medium capitalize">
                          {alert.type}
                        </span>
                        <Badge
                          variant={
                            alert.severity === "high"
                              ? "destructive"
                              : alert.severity === "medium"
                                ? "secondary"
                                : "default"
                          }
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-sm">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Goals */}
        <TabsContent value="goals">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Goal className="h-4 w-4" />
                Ranking Goals & Targets
              </CardTitle>
              <CardDescription>
                Set and track ranking goals for different keywords
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Keyword"
                  value={goals.find((g) => !g.id)?.keyword || ""}
                  onChange={(e) => {
                    const keyword = e.target.value;
                    setGoals((prev) => {
                      const existing = prev.find((g) => !g.id);
                      if (existing) {
                        return prev.map((g) => (!g.id ? { ...g, keyword } : g));
                      } else {
                        return [
                          ...prev,
                          {
                            id: "",
                            keyword,
                            targetRank: 3,
                            priority: "medium" as const,
                          },
                        ];
                      }
                    });
                  }}
                />
                <Input
                  type="number"
                  placeholder="Target Rank"
                  min={1}
                  max={20}
                  className="w-24"
                  value={goals.find((g) => !g.id)?.targetRank || ""}
                  onChange={(e) => {
                    const targetRank = parseInt(e.target.value) || 3;
                    setGoals((prev) => {
                      const existing = prev.find((g) => !g.id);
                      if (existing) {
                        return prev.map((g) =>
                          !g.id ? { ...g, targetRank } : g
                        );
                      } else {
                        return [
                          ...prev,
                          {
                            id: "",
                            keyword: "",
                            targetRank,
                            priority: "medium" as const,
                          },
                        ];
                      }
                    });
                  }}
                />
                <Button
                  onClick={() => {
                    const goal = goals.find((g) => !g.id);
                    if (goal && goal.keyword) {
                      setGoals((prev) =>
                        prev.map((g) =>
                          !g.id
                            ? {
                                ...g,
                                id:
                                  crypto.randomUUID?.() ||
                                  String(Math.random()),
                              }
                            : g
                        )
                      );
                    }
                  }}
                  size="sm"
                >
                  Add Goal
                </Button>
              </div>

              <div className="space-y-2">
                {goals
                  .filter((g) => g.id)
                  .map((goal, idx) => {
                    const currentRank = snapshots
                      .filter((s) => s.keyword === goal.keyword)
                      .sort((a, b) => b.date.localeCompare(a.date))[0];

                    return (
                      <div
                        key={goal.id}
                        className="flex items-center justify-between p-3 border rounded"
                      >
                        <div>
                          <span className="font-medium">{goal.keyword}</span>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline">
                              Target: #{goal.targetRank}
                            </Badge>
                            {currentRank && (
                              <Badge
                                variant={
                                  currentRank.grid
                                    .flat()
                                    .filter((r) => r && r <= goal.targetRank)
                                    .length > 0
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                Current: #
                                {Math.min(
                                  ...(currentRank.grid
                                    .flat()
                                    .filter((r) => r) as number[])
                                )}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setGoals((prev) => prev.filter((_, i) => i !== idx))
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Analytics */}
        <TabsContent value="analytics">
          <div className="space-y-6">
            {/* Seasonality Analysis */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Seasonality Analysis
                </CardTitle>
                <CardDescription>
                  Detect ranking patterns and seasonal trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">
                      Ranking Patterns by Day
                    </h4>
                    <div className="space-y-2">
                      {[
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                        "Sunday",
                      ].map((day, index) => {
                        const dayData = snapshots.filter((s) => {
                          const date = new Date(s.date);
                          return date.getDay() === index;
                        });
                        const avgRank =
                          dayData.length > 0
                            ? dayData.reduce(
                                (sum, s) => sum + metrics(s.grid).avg,
                                0
                              ) / dayData.length
                            : 0;

                        return (
                          <div
                            key={day}
                            className="flex justify-between items-center"
                          >
                            <span className="text-sm">{day}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{
                                    width: `${Math.max(0, Math.min(100, (20 - avgRank) * 5))}%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium w-8 text-right">
                                {avgRank > 0 ? avgRank.toFixed(1) : "—"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Monthly Trends</h4>
                    <div className="space-y-2">
                      {[
                        "Jan",
                        "Feb",
                        "Mar",
                        "Apr",
                        "May",
                        "Jun",
                        "Jul",
                        "Aug",
                        "Sep",
                        "Oct",
                        "Nov",
                        "Dec",
                      ].map((month, index) => {
                        const monthData = snapshots.filter((s) => {
                          const date = new Date(s.date);
                          return date.getMonth() === index;
                        });
                        const avgRank =
                          monthData.length > 0
                            ? monthData.reduce(
                                (sum, s) => sum + metrics(s.grid).avg,
                                0
                              ) / monthData.length
                            : 0;

                        return (
                          <div
                            key={month}
                            className="flex justify-between items-center"
                          >
                            <span className="text-sm">{month}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-green-600 h-2 rounded-full"
                                  style={{
                                    width: `${Math.max(0, Math.min(100, (20 - avgRank) * 5))}%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium w-8 text-right">
                                {avgRank > 0 ? avgRank.toFixed(1) : "—"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Forecasting */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Ranking Forecast
                </CardTitle>
                <CardDescription>
                  Predict future ranking performance based on historical data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-blue-600">
                      {calculateForecast().nextWeek.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Next Week
                    </div>
                    <div className="text-xs mt-1">
                      {calculateForecast().trend === "improving" &&
                        "📈 Improving"}
                      {calculateForecast().trend === "stable" && "➡️ Stable"}
                      {calculateForecast().trend === "declining" &&
                        "📉 Declining"}
                    </div>
                  </div>

                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-green-600">
                      {calculateForecast().nextMonth.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Next Month
                    </div>
                    <div className="text-xs mt-1">
                      {calculateForecast().confidence > 80 &&
                        "🎯 High Confidence"}
                      {calculateForecast().confidence > 60 &&
                        calculateForecast().confidence <= 80 &&
                        "⚖️ Medium Confidence"}
                      {calculateForecast().confidence <= 60 &&
                        "❓ Low Confidence"}
                    </div>
                  </div>

                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round(calculateForecast().confidence)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Confidence
                    </div>
                    <div className="text-xs mt-1">
                      Based on {snapshots.length} data points
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Insights */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Performance Insights
                </CardTitle>
                <CardDescription>
                  Advanced analysis of ranking performance and opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">
                      Top Performing Keywords
                    </h4>
                    <div className="space-y-2">
                      {getTopKeywords().map((item, index) => (
                        <div
                          key={item.keyword}
                          className="flex justify-between items-center p-2 bg-green-50 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              #{index + 1}
                            </span>
                            <span className="text-sm">{item.keyword}</span>
                          </div>
                          <Badge variant="default">
                            #{item.avgRank.toFixed(1)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">
                      Improvement Opportunities
                    </h4>
                    <div className="space-y-2">
                      {getImprovementOpportunities().map((item, index) => (
                        <div
                          key={item.keyword}
                          className="flex justify-between items-center p-2 bg-orange-50 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              #{index + 1}
                            </span>
                            <span className="text-sm">{item.keyword}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              #{item.avgRank.toFixed(1)}
                            </Badge>
                            <span className="text-xs text-green-600">
                              ↓{item.potential.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Geographic Heat Maps */}
        <TabsContent value="heatmaps">
          <div className="space-y-6">
            {/* Calgary Neighborhood Heat Map */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Calgary Neighborhood Performance
                </CardTitle>
                <CardDescription>
                  Visual heat map showing ranking performance across Calgary
                  neighborhoods
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {getCalgaryNeighborhoods().map((neighborhood) => (
                    <div
                      key={neighborhood.name}
                      className="p-4 border rounded-lg"
                      style={{
                        backgroundColor: getHeatmapColor(neighborhood.avgRank),
                        color: neighborhood.avgRank <= 10 ? "white" : "black",
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-sm">
                          {neighborhood.name}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          #{neighborhood.avgRank.toFixed(1)}
                        </Badge>
                      </div>
                      <div className="text-xs opacity-80">
                        {neighborhood.dataPoints} data points
                      </div>
                      <div className="text-xs opacity-80 mt-1">
                        Best: #{neighborhood.bestRank.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Interactive Grid Heat Map */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Interactive Ranking Grid
                </CardTitle>
                <CardDescription>
                  Click on grid cells to see detailed ranking information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Legend */}
                  <div className="flex items-center gap-4 text-sm">
                    <span>Ranking Performance:</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: "#22c55e" }}
                      ></div>
                      <span>1-5 (Excellent)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: "#eab308" }}
                      ></div>
                      <span>6-10 (Good)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: "#f97316" }}
                      ></div>
                      <span>11-15 (Needs Work)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: "#ef4444" }}
                      ></div>
                      <span>16-20 (Poor)</span>
                    </div>
                  </div>

                  {/* Grid Visualization */}
                  <div className="grid grid-cols-5 gap-2 max-w-md mx-auto">
                    {Array.from({ length: 25 }, (_, i) => {
                      const row = Math.floor(i / 5);
                      const col = i % 5;
                      const mockRank = Math.floor(Math.random() * 20) + 1;

                      return (
                        <div
                          key={i}
                          className="aspect-square rounded border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold cursor-pointer hover:scale-110 transition-transform"
                          style={{
                            backgroundColor: getHeatmapColor(mockRank),
                            color: mockRank <= 10 ? "white" : "black",
                          }}
                          title={`Row ${row + 1}, Col ${col + 1}: Rank #${mockRank}`}
                        >
                          {mockRank}
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-center text-sm text-muted-foreground">
                    Grid represents Calgary area divided into 25 zones
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance by Keyword Heat Map */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Keyword Performance Matrix
                </CardTitle>
                <CardDescription>
                  Heat map showing performance across different keywords and
                  locations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="p-2 text-left border">Keyword</th>
                        <th className="p-2 text-center border">Downtown</th>
                        <th className="p-2 text-center border">Bridgeland</th>
                        <th className="p-2 text-center border">Riverside</th>
                        <th className="p-2 text-center border">Average</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        "barber calgary",
                        "haircut near me",
                        "bridgeland barber",
                        "mens haircut calgary",
                        "barbershop downtown",
                      ].map((keyword, idx) => {
                        const locations = [
                          Math.floor(Math.random() * 15) + 1,
                          Math.floor(Math.random() * 15) + 1,
                          Math.floor(Math.random() * 15) + 1,
                        ];
                        const average =
                          locations.reduce((a, b) => a + b, 0) /
                          locations.length;

                        return (
                          <tr key={idx}>
                            <td className="p-2 border font-medium">
                              {keyword}
                            </td>
                            {locations.map((rank, locIdx) => (
                              <td
                                key={locIdx}
                                className="p-2 border text-center font-bold"
                                style={{
                                  backgroundColor: getHeatmapColor(rank),
                                  color: rank <= 10 ? "white" : "black",
                                }}
                              >
                                #{rank}
                              </td>
                            ))}
                            <td
                              className="p-2 border text-center font-bold"
                              style={{
                                backgroundColor: getHeatmapColor(average),
                                color: average <= 10 ? "white" : "black",
                              }}
                            >
                              #{average.toFixed(1)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Mobile-Optimized Interface */}
        <TabsContent value="mobile">
          <div className="space-y-6">
            {/* Mobile Quick Actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Mobile Ranking Collector
                </CardTitle>
                <CardDescription>
                  Optimized interface for collecting rankings on mobile devices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    className="h-20 flex flex-col items-center gap-2"
                    onClick={() => setMobileQuickEntry(true)}
                  >
                    <Target className="h-6 w-6" />
                    <span className="text-sm">Quick Entry</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center gap-2"
                    onClick={() => handleMobileLocation()}
                  >
                    <MapPin className="h-6 w-6" />
                    <span className="text-sm">Get Location</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center gap-2"
                    onClick={() => exportMobileReport()}
                  >
                    <Download className="h-6 w-6" />
                    <span className="text-sm">Share Report</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center gap-2"
                    onClick={() => scanQRCode()}
                  >
                    <QrCode className="h-6 w-6" />
                    <span className="text-sm">Scan QR</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Mobile-Optimized Grid Input */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Touch-Friendly Grid</CardTitle>
                <CardDescription>
                  Large touch targets optimized for mobile ranking collection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Mobile Keyword Selector */}
                  <div className="space-y-2">
                    <Label>Keyword</Label>
                    <select
                      className="w-full px-4 py-3 border border-input rounded-md bg-background text-lg"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                    >
                      <option value="barber calgary">Barber Calgary</option>
                      <option value="haircut near me">Haircut Near Me</option>
                      <option value="bridgeland barber">
                        Bridgeland Barber
                      </option>
                      <option value="mens haircut calgary">
                        Mens Haircut Calgary
                      </option>
                      <option value="barbershop downtown">
                        Barbershop Downtown
                      </option>
                    </select>
                  </div>

                  {/* Mobile Grid - Larger touch targets */}
                  <div className="space-y-2">
                    <Label>Tap ranking positions (1-20)</Label>
                    <div className="grid grid-cols-4 gap-3">
                      {Array.from({ length: 20 }, (_, i) => i + 1).map(
                        (rank) => (
                          <button
                            key={rank}
                            className={`aspect-square rounded-lg border-2 font-bold text-lg transition-all ${
                              grid.flat().filter((cell) => cell === rank)
                                .length > 0
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-gray-300 hover:border-gray-400"
                            }`}
                            onClick={() => handleMobileRankSelect(rank)}
                          >
                            {rank}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Mobile Save Button */}
                  <Button
                    className="w-full py-4 text-lg"
                    onClick={saveSnapshot}
                    size="lg"
                  >
                    <Target className="h-5 w-5 mr-2" />
                    Save Rankings
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Mobile Dashboard */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Mobile Dashboard</CardTitle>
                <CardDescription>
                  Key metrics optimized for mobile viewing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">
                      {Number.isFinite(m.avg) ? m.avg.toFixed(1) : "—"}
                    </div>
                    <div className="text-sm text-blue-600">Avg Rank</div>
                  </div>

                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">
                      {m.top3}
                    </div>
                    <div className="text-sm text-green-600">Top 3</div>
                  </div>

                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600">
                      {m.visScore.toFixed(0)}%
                    </div>
                    <div className="text-sm text-purple-600">Visibility</div>
                  </div>

                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-3xl font-bold text-orange-600">
                      {snapshots.length}
                    </div>
                    <div className="text-sm text-orange-600">Snapshots</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mobile Tips */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Mobile Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Smartphone className="h-4 w-4 mt-0.5 text-blue-500" />
                    <p>
                      Use your phone's GPS for accurate location-based rankings
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-green-500" />
                    <p>Collect rankings from different Calgary neighborhoods</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Target className="h-4 w-4 mt-0.5 text-purple-500" />
                    <p>Focus on top 3 positions for maximum impact</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 mt-0.5 text-orange-500" />
                    <p>Track changes weekly to see improvement trends</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Custom Reports & Insights */}
        <TabsContent value="reports">
          <div className="space-y-6">
            {/* Executive Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileDown className="h-4 w-4" />
                  Executive Summary
                </CardTitle>
                <CardDescription>
                  High-level overview of Belmont's local search performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                      <h4 className="font-medium mb-2">
                        📊 Current Performance
                      </h4>
                      <div className="space-y-1 text-sm">
                        <div>
                          Average Ranking:{" "}
                          <span className="font-bold text-blue-700">
                            #{Number.isFinite(m.avg) ? m.avg.toFixed(1) : "—"}
                          </span>
                        </div>
                        <div>
                          Top 3 Appearances:{" "}
                          <span className="font-bold text-green-700">
                            {m.top3} positions
                          </span>
                        </div>
                        <div>
                          Visibility Score:{" "}
                          <span className="font-bold text-purple-700">
                            {m.visScore.toFixed(0)}%
                          </span>
                        </div>
                        <div>
                          Market Position:{" "}
                          <span className="font-bold text-orange-700">
                            #
                            {
                              getCompetitorInsights(
                                competitors,
                                Math.round(m.avg)
                              ).marketPosition
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                      <h4 className="font-medium mb-2">📈 Key Achievements</h4>
                      <div className="space-y-1 text-sm">
                        <div>
                          •{" "}
                          {
                            alerts.filter((a) => a.type === "improvement")
                              .length
                          }{" "}
                          ranking improvements tracked
                        </div>
                        <div>
                          • {goals.filter((g) => g.id).length} active ranking
                          goals
                        </div>
                        <div>• {snapshots.length} data collection points</div>
                        <div>
                          •{" "}
                          {
                            Array.from(new Set(snapshots.map((s) => s.keyword)))
                              .length
                          }{" "}
                          keywords monitored
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
                      <h4 className="font-medium mb-2">
                        🎯 Strategic Insights
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Forecast:</span>
                          {calculateForecast().trend === "improving"
                            ? " 📈 Improving trajectory"
                            : calculateForecast().trend === "stable"
                              ? " ➡️ Stable performance"
                              : " 📉 Needs attention"}
                        </div>
                        <div>
                          <span className="font-medium">Top Opportunity:</span>
                          {getImprovementOpportunities().length > 0
                            ? ` "${getImprovementOpportunities()[0].keyword}" (${getImprovementOpportunities()[0].potential.toFixed(1)} points potential)`
                            : " All keywords performing well"}
                        </div>
                        <div>
                          <span className="font-medium">Competitive Edge:</span>
                          {getCompetitorInsights(competitors, Math.round(m.avg))
                            .ahead > 0
                            ? ` Leading ${getCompetitorInsights(competitors, Math.round(m.avg)).ahead} competitors`
                            : " Monitor competitor activity"}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                      <h4 className="font-medium mb-2">📋 Action Items</h4>
                      <div className="space-y-1 text-sm">
                        {alerts.filter((a) => a.severity === "high").length >
                          0 && (
                          <div className="text-red-700">
                            • Address{" "}
                            {alerts.filter((a) => a.severity === "high").length}{" "}
                            critical alerts
                          </div>
                        )}
                        {goals.filter((g) => g.id).length > 0 && (
                          <div className="text-blue-700">
                            • Track {goals.filter((g) => g.id).length} ranking
                            goals
                          </div>
                        )}
                        {getImprovementOpportunities().length > 0 && (
                          <div className="text-orange-700">
                            • Focus on {getImprovementOpportunities().length}{" "}
                            improvement opportunities
                          </div>
                        )}
                        <div className="text-green-700">
                          • Continue weekly monitoring
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Reports */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileDown className="h-4 w-4" />
                  Detailed Reports
                </CardTitle>
                <CardDescription>
                  Generate comprehensive reports for different stakeholders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() => generateExecutiveReport()}
                  >
                    <FileDown className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">Executive Report</div>
                      <div className="text-xs text-muted-foreground">
                        High-level summary
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() => generateTechnicalReport()}
                  >
                    <Settings className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">Technical Report</div>
                      <div className="text-xs text-muted-foreground">
                        Detailed analytics
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() => generateCompetitorReport()}
                  >
                    <Users className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">Competitor Analysis</div>
                      <div className="text-xs text-muted-foreground">
                        Market positioning
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() => generateTrendReport()}
                  >
                    <TrendingUp className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">Trend Analysis</div>
                      <div className="text-xs text-muted-foreground">
                        Performance trends
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() => generateGoalProgressReport()}
                  >
                    <Target className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">Goal Progress</div>
                      <div className="text-xs text-muted-foreground">
                        Target achievement
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() => generateMonthlySummary()}
                  >
                    <Calendar className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">Monthly Summary</div>
                      <div className="text-xs text-muted-foreground">
                        Period overview
                      </div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Key Performance Indicators */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Key Performance Indicators
                </CardTitle>
                <CardDescription>
                  Track critical metrics for Belmont's local search success
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {Number.isFinite(m.avg) ? m.avg.toFixed(1) : "—"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Avg Ranking Position
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      {calculateForecast().trend === "improving"
                        ? "↗️ Improving"
                        : calculateForecast().trend === "stable"
                          ? "➡️ Stable"
                          : "↘️ Declining"}
                    </div>
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {m.visScore.toFixed(0)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Visibility Score
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      {m.visScore >= 70
                        ? "🎯 Excellent"
                        : m.visScore >= 50
                          ? "👍 Good"
                          : "⚠️ Needs Work"}
                    </div>
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 mb-1">
                      {alerts.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Active Alerts
                    </div>
                    <div className="text-xs text-purple-600 mt-1">
                      {alerts.filter((a) => a.severity === "high").length > 0
                        ? "🚨 Attention Required"
                        : "✅ All Good"}
                    </div>
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600 mb-1">
                      {goals.filter((g) => g.id).length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Active Goals
                    </div>
                    <div className="text-xs text-orange-600 mt-1">
                      {goals.filter((g) => g.id).length > 0
                        ? "🎯 On Track"
                        : "📝 Set Goals"}
                    </div>
                  </div>
                </div>

                {/* Performance Trend */}
                <div className="mt-6">
                  <h4 className="font-medium mb-3">
                    Performance Trend (Last 30 Days)
                  </h4>
                  <div className="h-32">
                    <MultiLine
                      data={trendData.slice(-10)}
                      xKey="date"
                      series={[{ key: keywordList[0] || "visibility", name: "Visibility" }]}
                      yDomain={[0, 100]}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tool Integrations */}
        <TabsContent value="integrations">
          <div className="space-y-6">
            {/* Integration Overview */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  SEO Tool Integrations
                </CardTitle>
                <CardDescription>
                  Connect ranking data with other Belmont SEO tools for
                  comprehensive insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() => navigateToGBP()}
                  >
                    <MapPin className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">GBP Composer</div>
                      <div className="text-xs text-muted-foreground">
                        Local ranking impact
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() => navigateToReviewComposer()}
                  >
                    <MessageSquare className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">Review Composer</div>
                      <div className="text-xs text-muted-foreground">
                        Rating correlation
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() => navigateToMetaPlanner()}
                  >
                    <FileText className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">Meta Planner</div>
                      <div className="text-xs text-muted-foreground">
                        Title optimization
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() => navigateToPostOracle()}
                  >
                    <Calendar className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">Content Calendar</div>
                      <div className="text-xs text-muted-foreground">
                        Content timing
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() => navigateToLinkMap()}
                  >
                    <Network className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">Link Map</div>
                      <div className="text-xs text-muted-foreground">
                        Backlink strategy
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() => navigateToNeighborSignal()}
                  >
                    <Radar className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">Local Content</div>
                      <div className="text-xs text-muted-foreground">
                        Neighborhood focus
                      </div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Cross-Tool Insights */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Cross-Tool Insights
                </CardTitle>
                <CardDescription>
                  How ranking data connects with other SEO activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* GBP Integration Insights */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-blue-500" />
                      <h4 className="font-medium">
                        GBP Business Profile Impact
                      </h4>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        • Current ranking data suggests Belmont should focus on
                        GBP posts for high-ranking keywords
                      </p>
                      <p>
                        • Competitor analysis shows GBP optimization
                        opportunities in{" "}
                        {
                          getCompetitorInsights(competitors, Math.round(m.avg))
                            .ahead
                        }{" "}
                        areas
                      </p>
                      <p>
                        • Local search visibility could improve by{" "}
                        {Math.round((100 - m.visScore) * 0.3)}% with enhanced
                        GBP content
                      </p>
                    </div>
                  </div>

                  {/* Review Integration Insights */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-green-500" />
                      <h4 className="font-medium">Review Response Strategy</h4>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        • Ranking improvements correlate with review volume -
                        focus on response templates
                      </p>
                      <p>
                        • Monitor competitor review response times and quality
                      </p>
                      <p>
                        • Use ranking alerts to trigger review campaigns for
                        struggling keywords
                      </p>
                    </div>
                  </div>

                  {/* Content Integration Insights */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-purple-500" />
                      <h4 className="font-medium">
                        Content Calendar Optimization
                      </h4>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        • Schedule content around ranking collection days for
                        maximum impact
                      </p>
                      <p>
                        • Focus blog content on keywords with improvement
                        potential
                      </p>
                      <p>
                        • Time GBP posts to coincide with ranking monitoring
                        schedule
                      </p>
                    </div>
                  </div>

                  {/* Link Building Integration */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Network className="h-4 w-4 text-orange-500" />
                      <h4 className="font-medium">Link Building Strategy</h4>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        • Target link building for keywords in positions 11-20
                      </p>
                      <p>
                        • Use ranking data to identify local partnership
                        opportunities
                      </p>
                      <p>
                        • Monitor competitor backlink profiles for strategic
                        opportunities
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Integration Actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Integration Actions
                </CardTitle>
                <CardDescription>
                  Recommended next steps based on ranking data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium">Immediate Actions</h4>
                    <div className="space-y-2">
                      {alerts.filter((a) => a.severity === "high").length >
                        0 && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="text-sm font-medium">
                              Address Critical Alerts
                            </span>
                          </div>
                          <p className="text-xs text-red-600 mt-1">
                            {alerts.filter((a) => a.severity === "high").length}{" "}
                            ranking alerts need attention
                          </p>
                        </div>
                      )}

                      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium">
                            Update GBP Profile
                          </span>
                        </div>
                        <p className="text-xs text-blue-600 mt-1">
                          Add fresh photos and posts targeting ranking keywords
                        </p>
                      </div>

                      <div className="p-3 bg-green-50 border border-green-200 rounded">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">
                            Review Response Campaign
                          </span>
                        </div>
                        <p className="text-xs text-green-600 mt-1">
                          Respond to recent reviews to boost local rankings
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Strategic Planning</h4>
                    <div className="space-y-2">
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-purple-500" />
                          <span className="text-sm font-medium">
                            Content Strategy
                          </span>
                        </div>
                        <p className="text-xs text-purple-600 mt-1">
                          Plan content around{" "}
                          {getImprovementOpportunities().length} keywords with
                          potential
                        </p>
                      </div>

                      <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                        <div className="flex items-center gap-2">
                          <Network className="h-4 w-4 text-orange-500" />
                          <span className="text-sm font-medium">
                            Link Building
                          </span>
                        </div>
                        <p className="text-xs text-orange-600 mt-1">
                          Target local partnerships for geographic ranking
                          improvement
                        </p>
                      </div>

                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-indigo-500" />
                          <span className="text-sm font-medium">
                            Goal Setting
                          </span>
                        </div>
                        <p className="text-xs text-indigo-600 mt-1">
                          Set specific ranking targets for Q1 based on current
                          performance
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Bulk Operations */}
        <TabsContent value="bulk">
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Bulk Import/Export Operations
                </CardTitle>
                <CardDescription>
                  Import multiple keywords and locations at once, or export
                  comprehensive ranking reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Bulk Import Section */}
                <div className="space-y-4">
                  <h4 className="font-medium">Bulk Import</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <h5 className="font-medium mb-2">
                          Import Keywords & Locations
                        </h5>
                        <p className="text-sm text-muted-foreground mb-3">
                          Upload a CSV with keywords, locations, and initial
                          rankings
                        </p>
                        <div className="space-y-2">
                          <Input
                            type="file"
                            accept=".csv"
                            id="bulkImport"
                            className="hidden"
                            onChange={(e) => handleBulkImport(e)}
                          />
                          <label htmlFor="bulkImport">
                            <Button variant="outline" className="w-full">
                              <Upload className="h-4 w-4 mr-2" />
                              Choose CSV File
                            </Button>
                          </label>
                          <p className="text-xs text-muted-foreground">
                            Format:
                            keyword,location,latitude,longitude,device,search_type
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <h5 className="font-medium mb-2">
                          Import Competitor Data
                        </h5>
                        <p className="text-sm text-muted-foreground mb-3">
                          Add multiple competitors for comprehensive market
                          analysis
                        </p>
                        <div className="space-y-2">
                          <Input
                            type="file"
                            accept=".csv"
                            id="competitorImport"
                            className="hidden"
                            onChange={(e) => handleCompetitorImport(e)}
                          />
                          <label htmlFor="competitorImport">
                            <Button variant="outline" className="w-full">
                              <Users className="h-4 w-4 mr-2" />
                              Import Competitors
                            </Button>
                          </label>
                          <p className="text-xs text-muted-foreground">
                            Format: name,rank,location,url
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Bulk Export Section */}
                <div className="space-y-4">
                  <h4 className="font-medium">Bulk Export</h4>
                  <div className="grid md:grid-cols-3 gap-4">
                    <Button
                      variant="outline"
                      onClick={() => exportComprehensiveReport()}
                      className="h-auto p-4 flex flex-col items-center gap-2"
                    >
                      <Download className="h-6 w-6" />
                      <div className="text-center">
                        <div className="font-medium">Full Report</div>
                        <div className="text-xs text-muted-foreground">
                          All data + analytics
                        </div>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => exportTrendAnalysis()}
                      className="h-auto p-4 flex flex-col items-center gap-2"
                    >
                      <TrendingUp className="h-6 w-6" />
                      <div className="text-center">
                        <div className="font-medium">Trend Analysis</div>
                        <div className="text-xs text-muted-foreground">
                          Historical trends
                        </div>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => exportCompetitorAnalysis()}
                      className="h-auto p-4 flex flex-col items-center gap-2"
                    >
                      <Users className="h-6 w-6" />
                      <div className="text-center">
                        <div className="font-medium">Market Analysis</div>
                        <div className="text-xs text-muted-foreground">
                          Competitor insights
                        </div>
                      </div>
                    </Button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-4">
                  <h4 className="font-medium">Quick Actions</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      onClick={() => generateBulkTemplates()}
                      className="justify-start"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Import Templates
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => clearAllData()}
                      className="justify-start text-red-600 hover:text-red-700"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Clear All Data
                    </Button>
                  </div>
                </div>

                {/* Import History */}
                <div className="space-y-4">
                  <h4 className="font-medium">Recent Imports</h4>
                  <div className="text-sm text-muted-foreground">
                    {snapshots.length > 0 ? (
                      <div className="space-y-2">
                        <div>
                          Last import: {snapshots[snapshots.length - 1]?.date}
                        </div>
                        <div>Total snapshots: {snapshots.length}</div>
                        <div>
                          Keywords tracked:{" "}
                          {
                            Array.from(new Set(snapshots.map((s) => s.keyword)))
                              .length
                          }
                        </div>
                      </div>
                    ) : (
                      <p>
                        No data imported yet. Use bulk import to get started
                        quickly.
                      </p>
                    )}
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
                <Info className="h-4 w-4" />
                How to Collect Ranks
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <ol className="list-decimal pl-5 space-y-1">
                <li>
                  Pick a keyword (e.g., <em>barber bridgeland</em>), set a{" "}
                  {rows}×{cols} grid.
                </li>
                <li>
                  Use a phone with location sim (or a rank‑grid tool) to note
                  the Local Pack position (1–20) for each cell.
                </li>
                <li>Enter ranks, save a snapshot, repeat weekly.</li>
                <li>
                  Track <strong>Visibility%</strong> (weighted), Top‑3 cells,
                  and coverage over time in the Trends tab.
                </li>
              </ol>
              <p className="text-xs text-muted-foreground">
                Tip: For consistency, collect at similar day/time windows (avoid
                volatile evening spikes).
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
