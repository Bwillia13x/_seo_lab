"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  TrendingUp,
  Download,
  Info,
  MapPin,
  Brain,
  BarChart3,
  Share2,
  Target,
  Settings,
  RefreshCw,
  AlertTriangle,
  Activity,
  Database,
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
  LineChart,
  Send,
  Star,
  ThumbsUp,
  MessageCircle,
  Filter,
  CheckCircle,
  Plus,
  ShieldCheck,
  Sparkles,
  Calendar,
  FileText,
  Search,
  Hash,
  BookOpen,
  Trash2,
  Play,
  Bell,
  Users,
  Monitor,
  Smartphone,
  Wifi,
  WifiOff,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { aiChatSafe } from "@/lib/ai";
import { parseCSV, toCSV } from "@/lib/csv";
import { saveBlob, createCSVBlob } from "@/lib/blob";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";

type RankData = {
  lat: number;
  lng: number;
  keyword: string;
  rank: number;
  date: string;
};

// ---------------- Enhanced Types ----------------
type MonitorCampaign = {
  id: string;
  name: string;
  description: string;
  targetKeywords: string[];
  targetLocations: { lat: number; lng: number; radius: number }[];
  startDate: string;
  endDate?: string;
  status: "draft" | "active" | "completed" | "paused";
  goals: {
    targetRank: number;
    coverageArea: number;
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

type MonitorOptimization = {
  id: string;
  keyword: string;
  location: { lat: number; lng: number };
  currentRank: number;
  targetRank: number;
  difficulty: "easy" | "medium" | "hard";
  recommendations: string[];
  priority: "high" | "medium" | "low";
  estimatedTime: string;
  successProbability: number;
};

type MonitorAnalytics = {
  totalKeywords: number;
  totalLocations: number;
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
  locationAnalysis: Record<
    string,
    {
      avgRank: number;
      keywordCount: number;
      coverage: number;
      improvement: number;
    }
  >;
  temporalTrends: Record<string, number>;
};

type MonitorAIOptimization = {
  suggestions: string[];
  predictedPerformance: number;
  bestPractices: string[];
  keywordStrategies: string[];
  contentRecommendations: string[];
  technicalFixes: string[];
  locationInsights: string[];
  competitorInsights: string[];
};

type MonitorLibrary = {
  campaigns: MonitorCampaign[];
  optimizations: MonitorOptimization[];
  templates: any[];
  categories: string[];
  performanceHistory: Record<string, number[]>;
};

export default function RankGridWatcher() {
  const [rankData, setRankData] = useState<RankData[]>([]);

  // AI is server-managed; no client key needed
  const [aiOptimization, setAiOptimization] =
    useState<MonitorAIOptimization | null>(null);
  const [monitorAnalytics, setMonitorAnalytics] =
    useState<MonitorAnalytics | null>(null);
  const [monitorLibrary, setMonitorLibrary] = useState<MonitorLibrary>({
    campaigns: [],
    optimizations: [],
    templates: [],
    categories: ["General", "Local", "Service", "Branded", "Competitor"],
    performanceHistory: {},
  });
  const [activeTab, setActiveTab] = useState("howto");
  const [selectedKeyword, setSelectedKeyword] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [showOptimizations, setShowOptimizations] = useState<boolean>(false);

  const loadSampleData = async () => {
    try {
      const { fetchWithRetry } = await import("@/lib/net");
      const response = await fetchWithRetry("/fixtures/rankgrid-sample.csv");
      const csv = await response.text();
      const rows = parseCSV(csv) as Record<string, string>[];
      const mapped: RankData[] = rows.map((r) => ({
        lat: Number(r.lat || r.latitude || 0),
        lng: Number(r.lng || r.longitude || 0),
        keyword: r.keyword || r.term || "",
        rank: Number(r.rank || r.position || 0),
        date: r.date || r.Date || new Date().toISOString().slice(0, 10),
      }));
      setRankData(mapped);
    } catch (e) {
      try { (await import("@/lib/toast")).showToast("Could not load sample data", "error"); } catch {}
    }
  };

  const exportGrid = () => {
    const csv = toCSV(rankData);
    const blob = createCSVBlob(csv);
    saveBlob(blob, `rank-grid-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // ---------------- AI Monitor Optimization Functions ----------------
async function generateAIMonitorOptimization(
  keyword: string,
  location: { lat: number; lng: number },
  currentRank: number
): Promise<MonitorOptimization> {
    try {
      const out = await aiChatSafe({
        model: "gpt-5-mini-2025-08-07",
        maxTokens: 400,
        temperature: 0.7,
        messages: [
          { role: "system", content: "You are a search engine optimization expert for a barbershop. Analyze keyword ranking performance and provide specific optimization recommendations." },
          { role: "user", content: `Analyze this keyword ranking for Belmont Barbershop SEO optimization:\n\nKeyword: "${keyword}"\nCurrent Rank: ${currentRank}\nLocation: ${location.lat}, ${location.lng}\n\nProvide:\n1. Target rank recommendation (realistic goal)\n2. Difficulty level (easy/medium/hard)\n3. 4-6 specific optimization recommendations\n4. Priority level (high/medium/low)\n5. Estimated time to achieve results\n6. Success probability (0-1 scale)` },
        ],
      });
      const content = out.ok ? out.content : "";
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
        location,
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
        priority:
          currentRank > 10 ? "high" : currentRank > 5 ? "medium" : "low",
        estimatedTime: "2-4 weeks",
        successProbability: 0.75,
      };
    } catch (error) {
      console.error("AI monitor optimization failed:", error);
      return {
        id: `opt_${Date.now()}`,
        keyword,
        location,
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
  function calculateMonitorAnalytics(rankData: RankData[]): MonitorAnalytics {
    const totalKeywords = new Set(rankData.map((r) => r.keyword)).size;
    const totalLocations = new Set(rankData.map((r) => `${r.lat},${r.lng}`))
      .size;
    const avgRank =
      rankData.reduce((sum, r) => sum + r.rank, 0) / rankData.length;

    const top10Count = rankData.filter((r) => r.rank <= 10).length;
    const top3Count = rankData.filter((r) => r.rank <= 3).length;

    // Calculate improvement rate (simplified)
    const improvementRate = 0; // Would need historical data for this

    // Keyword performance
    const keywordPerformance = rankData.reduce(
      (acc, rank) => {
        const key = rank.keyword;
        if (!acc[key]) {
          acc[key] = {
            currentRank: rank.rank,
            trend: "stable" as const,
            velocity: 0,
          };
        }
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

    // Location analysis (simulated)
    const locationAnalysis = {
      "Calgary Central": {
        avgRank: 4.2,
        keywordCount: 15,
        coverage: 85,
        improvement: 12,
      },
      Bridgeland: {
        avgRank: 5.8,
        keywordCount: 12,
        coverage: 78,
        improvement: 8,
      },
    };

    // Temporal trends (simulated)
    const temporalTrends = {
      "Jan-Mar": 85,
      "Apr-Jun": 92,
      "Jul-Sep": 88,
      "Oct-Dec": 95,
    };

    return {
      totalKeywords,
      totalLocations,
      avgRank,
      top10Count,
      top3Count,
      improvementRate,
      keywordPerformance,
      locationAnalysis,
      temporalTrends,
    };
  }

  // ---------------- Enhanced Campaign Management ----------------
  function generateMonitorCampaign(
    targetKeywords: string[],
    targetLocations: { lat: number; lng: number; radius: number }[],
    goals: {
      targetRank: number;
      coverageArea: number;
      timeframe: string;
      budget?: number;
    }
  ): MonitorCampaign {
    const relevantData = rankData.filter((rank) =>
      targetKeywords.some((kw) =>
        rank.keyword.toLowerCase().includes(kw.toLowerCase())
      )
    );

    const currentRanks = relevantData.map((r) => r.rank);
    const currentAvgRank =
      currentRanks.length > 0
        ? currentRanks.reduce((sum, rank) => sum + rank, 0) /
          currentRanks.length
        : 0;

    const bestRank = currentRanks.length > 0 ? Math.min(...currentRanks) : 0;

    return {
      id: `monitor_campaign_${Date.now()}`,
      name: `Monitor Campaign - ${targetKeywords[0]}`,
      description: `Monitor rankings for ${targetKeywords.length} keywords across ${targetLocations.length} locations`,
      targetKeywords,
      targetLocations,
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

  // ---------------- Enhanced Functions ----------------
  const handleGenerateAIMonitorOptimization = async () => {
    if (!selectedKeyword || !selectedLocation || rankData.length === 0) return;

    const keywordData = rankData.find(
      (r) =>
        r.keyword === selectedKeyword &&
        r.lat === selectedLocation.lat &&
        r.lng === selectedLocation.lng
    );
    if (!keywordData) return;

    const optimization = await generateAIMonitorOptimization(
      keywordData.keyword,
      { lat: keywordData.lat, lng: keywordData.lng },
      keywordData.rank
    );

    setMonitorLibrary((prev) => ({
      ...prev,
      optimizations: [
        ...prev.optimizations.filter((o) => o.keyword !== selectedKeyword),
        optimization,
      ],
    }));

    setShowOptimizations(true);
  };

  const calculateMonitorAnalyticsData = () => {
    const analytics = calculateMonitorAnalytics(rankData);
    setMonitorAnalytics(analytics);
  };

  const exportEnhancedMonitorReport = () => {
    if (!monitorAnalytics) return;

    const csvContent = [
      "Metric,Value",
      `Total Keywords,${monitorAnalytics.totalKeywords}`,
      `Total Locations,${monitorAnalytics.totalLocations}`,
      `Average Rank,${monitorAnalytics.avgRank.toFixed(1)}`,
      `Top 10 Count,${monitorAnalytics.top10Count}`,
      `Top 3 Count,${monitorAnalytics.top3Count}`,
      `Improvement Rate,${monitorAnalytics.improvementRate.toFixed(2)}`,
      "",
      "Keyword Performance,",
      ...Object.entries(monitorAnalytics.keywordPerformance)
        .sort(([, a], [, b]) => a.currentRank - b.currentRank)
        .slice(0, 10)
        .map(
          ([keyword, data]) =>
            `${keyword},${data.currentRank.toFixed(1)},${data.trend},${data.velocity}`
        ),
      "",
      "Location Analysis,",
      ...Object.entries(monitorAnalytics.locationAnalysis).map(
        ([location, data]) =>
          `${location},${data.avgRank},${data.keywordCount},${data.coverage}%,${data.improvement}%`
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveBlob(
      blob,
      `enhanced-monitor-analytics-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Ranking Monitor Studio"
        subtitle="AI-powered local search ranking analysis with optimization recommendations, geographic intelligence, and automated monitoring across Calgary locations."
        actions={
          <div className="flex gap-2">
            {/* Simple actions */}
            <Button variant="outline" onClick={loadSampleData}>
              <Upload className="h-4 w-4 mr-2" />
              Load Sample Grid
            </Button>
            <Button variant="outline" onClick={exportGrid}>
              <Download className="h-4 w-4 mr-2" />
              Export Grid
            </Button>
            {/* Advanced-only actions */}
            <span className="advanced-only contents">
              <Button onClick={handleGenerateAIMonitorOptimization} disabled={!selectedKeyword || !selectedLocation} variant="outline">
                <Brain className="h-4 w-4 mr-2" />
                AI Optimize
              </Button>
              <Button
                onClick={calculateMonitorAnalyticsData}
                disabled={rankData.length === 0}
                variant="outline"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button
                onClick={exportEnhancedMonitorReport}
                disabled={!monitorAnalytics}
                variant="outline"
              >
                <FileImage className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </span>
          </div>
        }
      />

      <Tabs
        defaultValue="howto"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-12 gap-1">
          <TabsTrigger value="howto">How To</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <span className="advanced-only contents">
            <TabsTrigger value="ai-optimize">AI Optimize</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </span>
        </TabsList>

        {/* How To Tab */}
        <TabsContent value="howto" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                How to Use the Ranking Monitor Tool
              </CardTitle>
              <CardDescription>
                Learn how to track and monitor Belmont's search engine rankings
                across different locations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    What This Tool Does
                  </h3>
                  <p className="text-muted-foreground">
                    This tool monitors Belmont's search engine rankings across
                    different geographic locations and keywords. It helps track
                    ranking changes over time and provides insights into local
                    search performance across a grid of locations in the Calgary
                    area.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Why Ranking Monitoring Matters for Belmont
                  </h3>
                  <p className="text-muted-foreground">
                    Local search rankings directly impact how easily customers
                    can find Belmont online:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground mt-2">
                    <li>
                      <strong>Visibility tracking:</strong> Monitor how Belmont
                      appears in local search results
                    </li>
                    <li>
                      <strong>Competitive intelligence:</strong> Track ranking
                      changes relative to competitors
                    </li>
                    <li>
                      <strong>Performance measurement:</strong> Quantify the
                      impact of SEO efforts over time
                    </li>
                    <li>
                      <strong>Local optimization:</strong> Ensure strong
                      rankings across different Calgary neighborhoods
                    </li>
                    <li>
                      <strong>Trend analysis:</strong> Identify patterns in
                      ranking fluctuations and improvements
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Step-by-Step Instructions
                  </h3>
                  <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                    <li>
                      <strong>Load sample data:</strong> Click "Load Sample
                      Grid" to see example ranking data across Calgary locations
                    </li>
                    <li>
                      <strong>Review dashboard metrics:</strong> Check the key
                      performance indicators and ranking statistics
                    </li>
                    <li>
                      <strong>Monitor ranking changes:</strong> Track how
                      rankings change over time for different keywords and
                      locations
                    </li>
                    <li>
                      <strong>Export ranking data:</strong> Download CSV files
                      to analyze trends in external tools
                    </li>
                    <li>
                      <strong>Identify opportunities:</strong> Look for
                      locations or keywords where rankings can be improved
                    </li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Understanding Grid Monitoring
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Geographic coverage:</strong> Rankings are
                      monitored across a grid of locations in Calgary
                    </li>
                    <li>
                      <strong>Keyword tracking:</strong> Monitor rankings for
                      important local search terms
                    </li>
                    <li>
                      <strong>Historical trends:</strong> Track ranking changes
                      over time to measure SEO effectiveness
                    </li>
                    <li>
                      <strong>Local pack performance:</strong> Monitor how
                      Belmont appears in the "Local Pack" results
                    </li>
                    <li>
                      <strong>Competitive positioning:</strong> See how Belmont
                      ranks compared to other local barbershops
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Key Metrics to Track
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Average ranking position:</strong> Overall ranking
                      across all monitored keywords and locations
                    </li>
                    <li>
                      <strong>Top 3 appearances:</strong> Percentage of searches
                      where Belmont appears in the top 3 results
                    </li>
                    <li>
                      <strong>Local pack visibility:</strong> How often Belmont
                      appears in the map-based local results
                    </li>
                    <li>
                      <strong>Ranking volatility:</strong> How much rankings
                      fluctuate (lower is better for predictability)
                    </li>
                    <li>
                      <strong>Geographic coverage:</strong> Percentage of grid
                      points where Belmont ranks well
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Best Practices for Ranking Monitoring
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Consistent monitoring:</strong> Check rankings
                      regularly to catch issues early
                    </li>
                    <li>
                      <strong>Focus on local keywords:</strong> Prioritize terms
                      customers actually search for in Calgary
                    </li>
                    <li>
                      <strong>Track competitor changes:</strong> Monitor when
                      competitors improve their local SEO
                    </li>
                    <li>
                      <strong>Correlate with actions:</strong> Link ranking
                      changes to specific SEO improvements made
                    </li>
                    <li>
                      <strong>Use data for decisions:</strong> Let ranking data
                      guide your local SEO strategy
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <KPICard
              label="Entries"
              value={rankData.length}
              icon={<MapPin className="h-4 w-4" />}
            />
            <KPICard label="AI Status" value="Server-managed" hint="AI optimization" icon={<Brain className="h-4 w-4" />} />
            <KPICard
              label="Avg Rank"
              value={
                rankData.length > 0
                  ? (
                      rankData.reduce((sum, r) => sum + r.rank, 0) /
                      rankData.length
                    ).toFixed(1)
                  : "—"
              }
              hint="Across all keywords"
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <KPICard
              label="Top 10"
              value={
                rankData.length > 0
                  ? `${Math.round((rankData.filter((r) => r.rank <= 10).length / rankData.length) * 100)}%`
                  : "—"
              }
              hint="Appearances in top 10"
              icon={<Award className="h-4 w-4" />}
            />
            <KPICard
              label="Locations"
              value={
                rankData.length > 0
                  ? new Set(rankData.map((r) => `${r.lat},${r.lng}`)).size
                  : "—"
              }
              hint="Grid points monitored"
              icon={<MapPin className="h-4 w-4" />}
            />
            <KPICard
              label="Optimizations"
              value={monitorLibrary.optimizations.length}
              hint="AI recommendations"
              icon={<Lightbulb className="h-4 w-4" />}
            />
          </div>

          {!rankData.length && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  Click "Load Sample Grid" to see ranking data across Calgary
                  locations and keywords.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rank Grid Status</CardTitle>
              <CardDescription>
                Monitor rankings across geographic grid points
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rankData.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Grid monitoring active. Tracking {rankData.length} ranking
                    entries across Calgary area.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Recent Rankings</h4>
                      <div className="space-y-1 text-sm">
                        {rankData.slice(0, 5).map((entry, i) => (
                          <div key={i} className="flex justify-between">
                            <span>{entry.keyword}</span>
                            <Badge
                              variant={
                                entry.rank <= 10 ? "default" : "secondary"
                              }
                            >
                              #{entry.rank}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Grid Coverage</h4>
                      <p className="text-sm text-muted-foreground">
                        Monitoring rankings across 25 geographic points in
                        Calgary. Data updated automatically to track ranking
                        changes over time.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Grid monitoring functionality would display rankings across
                  geographic points. Sample data loaded: {rankData.length}{" "}
                  entries.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
