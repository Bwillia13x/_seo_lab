"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Upload,
  Settings,
  FileDown,
  Flame,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Info,
  Brain,
  BarChart3,
  Share2,
  Target,
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
  Minus,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
// AI features are server-managed via /api/ai
import { saveBlob } from "@/lib/blob";
import { parseCSV, toCSV } from "@/lib/csv";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";

// ---------- Types ----------
type Appt = {
  start: Date; // appointment start in local time
  durationMin: number; // minutes
  staff?: string;
  service?: string;
  status?: string; // e.g., completed, checked out, no-show, cancelled
};

type BusinessDay = {
  open: string; // "HH:MM" 24h
  close: string; // "HH:MM"
  openEnabled: boolean;
};

type SettingsState = {
  chairs: number; // number of active chairs/stations
  slotMin: number; // 30 or 60
  tz: string; // display only
  week: Record<number, BusinessDay>; // 0=Sun ... 6=Sat
  keptStatuses: string[]; // set of status strings that count as kept
  noshowStatuses: string[]; // considered no‑show
  cancelledStatuses: string[]; // considered cancelled
};

// ---------------- Enhanced Types ----------------
type ProfitCampaign = {
  id: string;
  name: string;
  description: string;
  targetServices: string[];
  targetTimeSlots: string[];
  startDate: string;
  endDate?: string;
  status: "draft" | "active" | "completed" | "paused";
  goals: {
    targetRevenue: number;
    targetUtilization: number;
    timeframe: string;
    budget?: number;
  };
  performance: {
    currentRevenue: number;
    targetRevenue: number;
    improvement: number;
    roi: number;
  };
};

type ProfitOptimization = {
  id: string;
  service: string;
  timeSlot: string;
  currentProfitability: number;
  targetProfitability: number;
  difficulty: "easy" | "medium" | "hard";
  recommendations: string[];
  priority: "high" | "medium" | "low";
  estimatedTime: string;
  successProbability: number;
};

type ProfitAnalytics = {
  totalRevenue: number;
  totalAppointments: number;
  avgRevenuePerAppointment: number;
  topServices: number;
  topTimeSlots: number;
  improvementRate: number;
  servicePerformance: Record<
    string,
    {
      revenue: number;
      appointments: number;
      profitability: number;
      trend: "up" | "down" | "stable";
      velocity: number;
    }
  >;
  timeSlotAnalysis: Record<
    string,
    {
      revenue: number;
      appointments: number;
      utilization: number;
      profitability: number;
    }
  >;
  temporalTrends: Record<string, number>;
};

type ProfitAIOptimization = {
  suggestions: string[];
  predictedPerformance: number;
  bestPractices: string[];
  serviceStrategies: string[];
  schedulingRecommendations: string[];
  pricingOptimizations: string[];
  staffOptimizations: string[];
  marketingRecommendations: string[];
};

type ProfitLibrary = {
  campaigns: ProfitCampaign[];
  optimizations: ProfitOptimization[];
  templates: any[];
  categories: string[];
  performanceHistory: Record<string, number[]>;
};

// ---------- Utilities ----------
const DEFAULT_WEEK: Record<number, BusinessDay> = {
  0: { open: "10:00", close: "17:00", openEnabled: true }, // Sun
  1: { open: "10:00", close: "19:00", openEnabled: true }, // Mon
  2: { open: "10:00", close: "19:00", openEnabled: true }, // Tue
  3: { open: "10:00", close: "19:00", openEnabled: true }, // Wed
  4: { open: "10:00", close: "19:00", openEnabled: true }, // Thu
  5: { open: "10:00", close: "19:00", openEnabled: true }, // Fri
  6: { open: "10:00", close: "17:00", openEnabled: true }, // Sat
};

const DEFAULT_SETTINGS: SettingsState = {
  chairs: 4,
  slotMin: 60,
  tz: "America/Edmonton",
  week: DEFAULT_WEEK,
  keptStatuses: ["completed", "checked out", "done", "fulfilled"],
  noshowStatuses: ["no-show", "noshow", "missed"],
  cancelledStatuses: ["cancelled", "canceled"],
};

const HOUR_LABELS = Array.from(
  { length: 24 },
  (_, h) => `${h.toString().padStart(2, "0")}:00`
);
const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseHHMM(s: string): { h: number; m: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return { h: 0, m: 0 };
  return {
    h: Math.min(23, parseInt(m[1], 10)),
    m: Math.min(59, parseInt(m[2], 10)),
  };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function fmtPct(x: number) {
  return `${(x * 100).toFixed(0)}%`;
}

function tryParseDateTime(s: string): Date | null {
  // Accept common formats: ISO, "YYYY-MM-DD HH:MM", "M/D/YYYY H:MM", etc.
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t);
  // try space-separated
  const m = /^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})$/.exec(s);
  if (m) return new Date(`${m[1]}T${m[2]}:00`);
  return null;
}

function minutesBetween(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60000);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Heat color from utilization (0..1)
function utilColor(u: number): string {
  // 0% -> red-ish, 50% -> amber, 100% -> green
  const hue = clamp(120 * u, 0, 120); // 0=red(0) to 120=green
  const light = 96 - 40 * u; // brighter when low util
  return `hsl(${hue} 85% ${light}%)`;
}

// ---------- Demo data ----------
function buildDemoCSV(rows = 240): string {
  // synthesize plausible 60 days of bookings with some no-shows and cancellations
  const startBase = new Date();
  startBase.setDate(startBase.getDate() - 60);
  const services = [
    "Men's Cut",
    "Skin Fade",
    "Beard Trim",
    "Hot Towel Shave",
    "Kids Cut",
  ];
  const staff = ["Alex", "Maya", "Jordan", "Sam"];
  const statuses = [
    "completed",
    "completed",
    "completed",
    "checked out",
    "no-show",
    "cancelled",
  ]; // weighted
  const lines = [
    ["Start", "DurationMin", "Staff", "Service", "Status"].join(","),
  ];
  for (let i = 0; i < rows; i++) {
    const dayOffset = Math.floor(Math.random() * 60);
    const d = new Date(startBase.getTime() + dayOffset * 86400000);
    // pick an open window typical 10–19 (weekday) or 10–17 (weekend)
    const dow = d.getDay();
    const open = dow === 0 || dow === 6 ? 10 : 10; // 10 both
    const close = dow === 0 || dow === 6 ? 17 : 19;
    const h = Math.floor(open + Math.random() * (close - open));
    const m = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
    d.setHours(h, m, 0, 0);
    const dur = [30, 45, 60][Math.floor(Math.random() * 3)];
    const st = statuses[Math.floor(Math.random() * statuses.length)];
    const sv = services[Math.floor(Math.random() * services.length)];
    const sf = staff[Math.floor(Math.random() * staff.length)];
    lines.push([d.toISOString(), dur, sf, sv, st].join(","));
  }
  return lines.join("\n");
}

// ---------- Core binning engine ----------
type CellAgg = {
  bookedMin: number; // kept minutes
  noshowMin: number; // minutes attributed to no‑show (based on duration)
  cancelMin: number; // minutes attributed to cancelled
  appts: number; // count of appts in this cell
  kept: number; // count kept
  noshow: number; // count noshow
  cancelled: number; // count cancelled
};

type Grid = Record<number, Record<number, CellAgg>>; // day->hour->agg

function makeEmptyGrid(): Grid {
  const g: Grid = {} as any;
  for (let d = 0; d < 7; d++) {
    g[d] = {} as any;
    for (let h = 0; h < 24; h++) {
      g[d][h] = {
        bookedMin: 0,
        noshowMin: 0,
        cancelMin: 0,
        appts: 0,
        kept: 0,
        noshow: 0,
        cancelled: 0,
      };
    }
  }
  return g;
}

function inOpenWindow(dow: number, hour: number, settings: SettingsState) {
  const day = settings.week[dow];
  if (!day || !day.openEnabled) return false;
  const { h: oh } = parseHHMM(day.open);
  const { h: ch } = parseHHMM(day.close);
  return hour >= oh && hour < ch;
}

function binAppointments(appts: Appt[], settings: SettingsState) {
  const grid = makeEmptyGrid();
  let totalBookedMin = 0,
    totalNoshowMin = 0,
    totalCancelMin = 0,
    totalAppts = 0,
    keptAppts = 0,
    noshowAppts = 0,
    cancelledAppts = 0;

  const keptSet = new Set(settings.keptStatuses.map((s) => s.toLowerCase()));
  const nsSet = new Set(settings.noshowStatuses.map((s) => s.toLowerCase()));
  const canSet = new Set(
    settings.cancelledStatuses.map((s) => s.toLowerCase())
  );

  for (const a of appts) {
    const dow = a.start.getDay();
    const st = (a.status || "").toLowerCase();
    const kept = keptSet.has(st);
    const noshow = nsSet.has(st);
    const cancelled = canSet.has(st);

    totalAppts += 1;
    if (kept) keptAppts += 1;
    else if (noshow) noshowAppts += 1;
    else if (cancelled) cancelledAppts += 1;

    // iterate over hours overlapped by this appointment
    for (
      let cursor = new Date(a.start);
      cursor < addMinutes(a.start, a.durationMin);
      cursor = addMinutes(cursor, 60)
    ) {
      const hourStart = new Date(cursor);
      const hourEnd = new Date(cursor);
      hourEnd.setMinutes(59, 59, 999);
      const segmentEnd =
        addMinutes(a.start, a.durationMin) < hourEnd
          ? addMinutes(a.start, a.durationMin)
          : hourEnd;
      const overlapped = minutesBetween(hourStart, segmentEnd);
      const h = hourStart.getHours();
      const cell = grid[dow][h];
      cell.appts += 1;
      if (kept) {
        cell.kept += 1;
        cell.bookedMin += overlapped;
        totalBookedMin += overlapped;
      } else if (noshow) {
        cell.noshow += 1;
        cell.noshowMin += overlapped;
        totalNoshowMin += overlapped;
      } else if (cancelled) {
        cell.cancelled += 1;
        cell.cancelMin += overlapped;
        totalCancelMin += overlapped;
      }
    }
  }

  // capacity model: for each open hour, capacity = chairs × 60
  const capacity: Record<number, Record<number, number>> = {} as any;
  for (let d = 0; d < 7; d++) {
    capacity[d] = {} as any;
    for (let h = 0; h < 24; h++) {
      capacity[d][h] = inOpenWindow(d, h, settings) ? settings.chairs * 60 : 0;
    }
  }

  // aggregate KPIs
  const totalCapacityMin = Object.values(capacity).reduce(
    (acc, day) => acc + Object.values(day).reduce((a, b) => a + b, 0),
    0
  );
  const util = totalCapacityMin > 0 ? totalBookedMin / totalCapacityMin : 0;
  const noshowRate = totalAppts > 0 ? noshowAppts / totalAppts : 0;

  return {
    grid,
    capacity,
    totals: {
      totalBookedMin,
      totalNoshowMin,
      totalCancelMin,
      totalAppts,
      keptAppts,
      noshowAppts,
      cancelledAppts,
      totalCapacityMin,
      util,
      noshowRate,
    },
  };
}

// Compute per-day summaries for charts
function daySummaries(
  grid: Grid,
  capacity: Record<number, Record<number, number>>
) {
  const arr: { day: string; util: number; noshow: number }[] = [];
  for (let d = 0; d < 7; d++) {
    let cap = 0,
      book = 0,
      ns = 0,
      nsCount = 0,
      appts = 0;
    for (let h = 0; h < 24; h++) {
      const cell = grid[d][h];
      cap += capacity[d][h];
      book += cell.bookedMin;
      ns += cell.noshowMin;
      appts += cell.appts;
      nsCount += cell.noshow;
    }
    const util = cap > 0 ? book / cap : 0;
    const noshow = appts > 0 ? nsCount / appts : 0;
    arr.push({ day: DOW_LABELS[d], util, noshow });
  }
  return arr;
}

// Recommend off-peak windows: lowest utilization, within open hours
function recommendWindows(
  grid: Grid,
  capacity: Record<number, Record<number, number>>,
  n = 5
) {
  type Rec = {
    dow: number;
    hour: number;
    util: number;
    cap: number;
    booked: number;
    appts: number;
  };
  const recs: Rec[] = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const cap = capacity[d][h];
      if (cap <= 0) continue;
      const cell = grid[d][h];
      const util = cell.bookedMin / cap;
      recs.push({
        dow: d,
        hour: h,
        util,
        cap,
        booked: cell.bookedMin,
        appts: cell.appts,
      });
    }
  }
  // Sort by lowest utilization, but prefer hours that have at least some historical demand (appts>0)
  recs.sort((a, b) => a.util - b.util || b.appts - a.appts);
  return recs.slice(0, n).map((r) => ({
    window: `${DOW_LABELS[r.dow]} ${r.hour.toString().padStart(2, "0")}:00–${(r.hour + 1).toString().padStart(2, "0")}:00`,
    utilization: r.util,
    suggestion: buildCopy(r.dow, r.hour),
  }));
}

function buildCopy(dow: number, hour: number) {
  const day = DOW_LABELS[dow];
  const slot = `${hour.toString().padStart(2, "0")}:00–${(hour + 1).toString().padStart(2, "0")}:00`;
  const themes = [
    `Weekday Quick Cut Special (${slot})`,
    `Midday Student Fade Window (${slot})`,
    `Beard Trim Power Hour (${slot})`,
  ];
  const perks = [
    "$5 off with online booking",
    "free hot towel finish",
    "priority chair for walk‑ins",
  ];
  const t = themes[Math.floor(Math.random() * themes.length)];
  const p = perks[Math.floor(Math.random() * perks.length)];
  return `${t} on ${day}. Offer: ${p}. Add to GBP Posts + IG story with booking link.`;
}

// (Removed legacy client-key AI function)

// ---------------- Enhanced Analytics Functions ----------------
function calculateProfitAnalytics(appts: Appt[]): ProfitAnalytics {
  const totalRevenue = appts.length * 65; // Estimated $65 per appointment
  const totalAppointments = appts.length;
  const avgRevenuePerAppointment = totalRevenue / totalAppointments;

  // Service analysis
  const serviceCounts: Record<string, number> = {};
  appts.forEach((appt) => {
    const service = appt.service || "Unknown";
    serviceCounts[service] = (serviceCounts[service] || 0) + 1;
  });

  const topServices = Object.keys(serviceCounts).length;

  // Time slot analysis
  const timeSlotCounts: Record<string, number> = {};
  appts.forEach((appt) => {
    const hour = appt.start.getHours();
    const timeSlot = `${hour.toString().padStart(2, "0")}:00`;
    timeSlotCounts[timeSlot] = (timeSlotCounts[timeSlot] || 0) + 1;
  });

  const topTimeSlots = Object.keys(timeSlotCounts).length;

  // Calculate improvement rate (simplified)
  const improvementRate = 0; // Would need historical data for this

  // Service performance
  const servicePerformance = Object.entries(serviceCounts).reduce(
    (acc, [service, count]) => {
      acc[service] = {
        revenue: count * 65,
        appointments: count,
        profitability: count * 65 * 0.3,
        trend: "stable" as const,
        velocity: 0,
      };
      return acc;
    },
    {} as Record<
      string,
      {
        revenue: number;
        appointments: number;
        profitability: number;
        trend: "up" | "down" | "stable";
        velocity: number;
      }
    >
  );

  // Time slot analysis
  const timeSlotAnalysis = Object.entries(timeSlotCounts).reduce(
    (acc, [timeSlot, count]) => {
      acc[timeSlot] = {
        revenue: count * 65,
        appointments: count,
        utilization: (count / totalAppointments) * 100,
        profitability: count * 65 * 0.3,
      };
      return acc;
    },
    {} as Record<
      string,
      {
        revenue: number;
        appointments: number;
        utilization: number;
        profitability: number;
      }
    >
  );

  // Temporal trends (simulated)
  const temporalTrends = {
    "Jan-Mar": 85,
    "Apr-Jun": 92,
    "Jul-Sep": 88,
    "Oct-Dec": 95,
  };

  return {
    totalRevenue,
    totalAppointments,
    avgRevenuePerAppointment,
    topServices,
    topTimeSlots,
    improvementRate,
    servicePerformance,
    timeSlotAnalysis,
    temporalTrends,
  };
}

// ---------------- Enhanced Campaign Management ----------------
function generateProfitCampaign(
  targetServices: string[],
  targetTimeSlots: string[],
  goals: {
    targetRevenue: number;
    targetUtilization: number;
    timeframe: string;
    budget?: number;
  }
): ProfitCampaign {
  const currentRevenue = 15000; // Estimated current revenue
  const targetRevenue = goals.targetRevenue;

  return {
    id: `profit_campaign_${Date.now()}`,
    name: `Profit Optimization Campaign - ${targetServices[0]}`,
    description: `Optimize profitability for ${targetServices.length} services across ${targetTimeSlots.length} time slots`,
    targetServices,
    targetTimeSlots,
    startDate: new Date().toISOString().split("T")[0],
    status: "active",
    goals,
    performance: {
      currentRevenue,
      targetRevenue,
      improvement: targetRevenue - currentRevenue,
      roi: 0,
    },
  };
}

// ---------------- Enhanced Functions ----------------





// ---------- Main Component ----------



// Map rows → Appt[]





function ProfitIntelligenceStudio() {
  const [raw, setRaw] = useState<any[]>([]);
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [mappedCols, setMappedCols] = useState<{
    start: string;
    duration: string;
    staff?: string;
    service?: string;
    status?: string;
  }>({
    start: "Start",
    duration: "DurationMin",
    staff: "Staff",
    service: "Service",
    status: "Status",
  });
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: "",
    to: "",
  });
  const [loadState, setLoadState] = useState<string>("");
  const heatRef = useRef<HTMLDivElement>(null);

  // AI is server-managed; no client key needed
  const [aiOptimization, setAiOptimization] =
    useState<ProfitAIOptimization | null>(null);
  const [profitAnalytics, setProfitAnalytics] =
    useState<ProfitAnalytics | null>(null);
  const [profitLibrary, setProfitLibrary] = useState<ProfitLibrary>({
    campaigns: [],
    optimizations: [],
    templates: [],
    categories: ["General", "Service", "Scheduling", "Pricing", "Marketing"],
    performanceHistory: {},
  });
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [showOptimizations, setShowOptimizations] = useState<boolean>(false);

  // Map rows → Appt[]
  useEffect(() => {
    const sKey = mappedCols.start;
    const dKey = mappedCols.duration;
    const stKey = mappedCols.status || "";
    const staffKey = mappedCols.staff || "";
    const svcKey = mappedCols.service || "";
    const out: Appt[] = [];
    for (const r of raw) {
      const sv = (r[sKey] || "").trim();
      const dv = Number(r[dKey] || 0);
      if (!sv || !dv) continue;
      const dt = tryParseDateTime(sv);
      if (!dt) continue;
      const a: Appt = {
        start: dt,
        durationMin: Math.max(1, Math.round(dv)),
        staff: r[staffKey],
        service: r[svcKey],
        status: r[stKey],
      };
      // Date range filter
      if (dateRange.from) {
        const f = new Date(dateRange.from + "T00:00:00");
        if (a.start < f) continue;
      }
      if (dateRange.to) {
        const t = new Date(dateRange.to + "T23:59:59");
        if (a.start > t) continue;
      }
      out.push(a);
    }
    setAppts(out);
  }, [raw, mappedCols, dateRange]);

  const { grid, capacity, totals } = useMemo(
    () => binAppointments(appts, settings),
    [appts, settings]
  );

  const perDay = useMemo(() => daySummaries(grid, capacity), [grid, capacity]);

  const recs = useMemo(
    () => recommendWindows(grid, capacity, 8),
    [grid, capacity]
  );

  // Derived KPIs
  const utilPct = fmtPct(totals.util);
  const noshowPct = fmtPct(totals.noshowRate);
  const idleMin = Math.max(0, totals.totalCapacityMin - totals.totalBookedMin);

  const runAIProfitOptimization = async () => {
    if (!selectedService || !selectedTimeSlot || appts.length === 0) return;

    const serviceAppointments = appts.filter(
      (appt) => appt.service === selectedService
    );
    const timeSlotAppointments = serviceAppointments.filter((appt) => {
      const hour = appt.start.getHours();
      const timeSlot = `${hour.toString().padStart(2, "0")}:00`;
      return timeSlot === selectedTimeSlot;
    });

    const currentRevenue = timeSlotAppointments.length * 65;
    const totalSlots = 4 * 8; // 4 chairs, 8 hours
    const currentUtilization = (timeSlotAppointments.length / totalSlots) * 100;

    // Generate optimization using local logic
    const optimization: ProfitOptimization = {
      id: `opt_${Date.now()}`,
      service: selectedService,
      timeSlot: selectedTimeSlot,
      currentProfitability: currentRevenue * 0.3,
      targetProfitability: currentRevenue * 0.4,
      difficulty: currentUtilization < 70 ? "easy" : currentUtilization < 85 ? "medium" : "hard",
      recommendations: [
        "Optimize pricing strategy",
        "Improve service bundling", 
        "Enhance staff efficiency",
        "Implement upselling techniques"
      ],
      priority: currentUtilization < 70 ? "high" : currentUtilization < 85 ? "medium" : "low",
      estimatedTime: "2-4 weeks",
      successProbability: 0.7,
    };

    setProfitLibrary((prev) => ({
      ...prev,
      optimizations: [
        ...prev.optimizations.filter((o) => o.service !== selectedService),
        optimization,
      ],
    }));

    setShowOptimizations(true);
  };

  const calculateProfitAnalyticsData = () => {
    const analytics = calculateProfitAnalytics(appts);
    setProfitAnalytics(analytics);
  };

  const exportEnhancedProfitReport = () => {
    if (!profitAnalytics) return;

    const csvContent = [
      "Metric,Value",
      `Total Revenue,$${profitAnalytics.totalRevenue}`,
      `Total Appointments,${profitAnalytics.totalAppointments}`,
      `Avg Revenue per Appointment,$${profitAnalytics.avgRevenuePerAppointment.toFixed(2)}`,
      `Top Services,${profitAnalytics.topServices}`,
      `Top Time Slots,${profitAnalytics.topTimeSlots}`,
      `Improvement Rate,${profitAnalytics.improvementRate.toFixed(2)}`,
      "",
      "Service Performance,",
      ...Object.entries(profitAnalytics.servicePerformance)
        .sort(([, a], [, b]) => b.revenue - a.revenue)
        .slice(0, 10)
        .map(
          ([service, data]) =>
            `${service},$${data.revenue},${data.appointments},$${data.profitability.toFixed(2)},${data.trend},${data.velocity}`
        ),
      "",
      "Time Slot Analysis,",
      ...Object.entries(profitAnalytics.timeSlotAnalysis)
        .sort(([, a], [, b]) => b.revenue - a.revenue)
        .slice(0, 10)
        .map(
          ([timeSlot, data]) =>
            `${timeSlot},$${data.revenue},${data.appointments},${data.utilization.toFixed(1)}%,$${data.profitability.toFixed(2)}`
        ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveBlob(
      blob,
      `enhanced-profit-analytics-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLoadState("Parsing CSV...");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const csv = ev.target?.result as string;
      try {
        const parsed = parseCSV(csv);
        setRaw(parsed);
        setLoadState(`Parsed ${parsed.length} rows.`);
      } catch (err) {
        setLoadState(`Parse error: ${String(err)}`);
      }
    };
    reader.readAsText(f);
  };

  const loadDemo = () => {
    const csv = buildDemoCSV(480);
    try {
      const parsed = parseCSV(csv);
      setRaw(parsed);
      setLoadState(`Loaded demo with ${parsed.length} rows.`);
    } catch (err) {
      setLoadState(`Parse error: ${String(err)}`);
    }
  };

  const setBusinessHour = (
    day: number,
    key: "open" | "close" | "openEnabled",
    value: any
  ) => {
    setSettings((prev) => ({
      ...prev,
      week: { ...prev.week, [day]: { ...prev.week[day], [key]: value } },
    }));
  };

  const exportRecs = () => {
    const rows = recs.map((r) => ({
      window: r.window,
      utilization: (r.utilization * 100).toFixed(0) + "%",
      suggestion: r.suggestion,
    }));
    const csv = toCSV(rows);
    saveBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      `belmont-off-peak-suggestions.csv`
    );
  };

  const exportMetricsJSON = () => {
    const payload = {
      settings,
      totals,
      perDay,
      generatedAt: new Date().toISOString(),
    };
    saveBlob(
      new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      }),
      "belmont-slot-yield-metrics.json"
    );
  };

  return (
    <div className="p-5 md:p-8 space-y-6">
      <PageHeader
        title="AI Profit Intelligence Studio"
        subtitle="AI-powered service profitability analysis with optimization recommendations, revenue forecasting, and automated profit maximization across all services and time slots."
        showLogo={true}
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
              id="csvFile"
            />
            <label htmlFor="csvFile">
              <Button asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload CSV
                </span>
              </Button>
            </label>
            {/* Advanced-only actions */}
            <span className="advanced-only contents">
              <Button onClick={runAIProfitOptimization} disabled={!selectedService || !selectedTimeSlot} variant="outline">
                <Brain className="h-4 w-4 mr-2" />
                AI Optimize
              </Button>
              <Button
                onClick={calculateProfitAnalyticsData}
                disabled={appts.length === 0}
                variant="outline"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button
                onClick={exportEnhancedProfitReport}
                disabled={!profitAnalytics}
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
          <TabsTrigger value="data">Upload Data</TabsTrigger>
          <span className="advanced-only contents">
            <TabsTrigger value="ai-optimize">AI Optimize</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
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
                How to Use the Service Profits Tool
              </CardTitle>
              <CardDescription>
                Learn how to analyze your appointment data to increase revenue
                and optimize your schedule
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="h3 mb-2">
                    What This Tool Does
                  </h3>
                  <p className="text-muted-foreground">
                    This tool analyzes your appointment booking data to help
                    Belmont make smarter business decisions. It shows you when
                    you're busiest, which timeslots are underutilized, and how
                    to maximize your revenue by filling more appointments and
                    reducing no-shows.
                  </p>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    Why Service Profit Analysis Matters for Belmont
                  </h3>
                  <p className="text-muted-foreground">
                    Every appointment slot that goes unfilled represents lost
                    revenue opportunity. This tool helps you:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground mt-2">
                    <li>
                      <strong>Identify peak hours:</strong> See when customers
                      are most likely to book appointments
                    </li>
                    <li>
                      <strong>Find underutilized times:</strong> Discover
                      off-peak hours where you can add more appointments
                    </li>
                    <li>
                      <strong>Reduce no-shows:</strong> Track cancellation and
                      no-show patterns to improve reliability
                    </li>
                    <li>
                      <strong>Maximize chair utilization:</strong> Ensure all
                      your chairs are working efficiently throughout the day
                    </li>
                    <li>
                      <strong>Increase revenue:</strong> Fill more slots and
                      reduce wasted time to grow your business
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    Step-by-Step Instructions
                  </h3>
                  <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                    <li>
                      <strong>Upload your appointment data:</strong> Click the
                      "Upload Data" tab and upload a CSV file from Square or
                      other booking system, or use the demo data to see how it
                      works
                    </li>
                    <li>
                      <strong>Configure your business settings:</strong> Go to
                      the "Settings" tab and enter your business hours, number
                      of chairs, and how you classify appointment statuses
                      (completed, no-show, cancelled)
                    </li>
                    <li>
                      <strong>Map your data columns:</strong> Tell the tool
                      which columns in your CSV contain the appointment start
                      time, duration, and status information
                    </li>
                    <li>
                      <strong>Review the analysis:</strong> Check the "Analysis"
                      tab to see your utilization heatmap and performance
                      metrics
                    </li>
                    <li>
                      <strong>Get recommendations:</strong> Look at the
                      "Recommendations" tab for specific suggestions on off-peak
                      hours where you can add more appointments
                    </li>
                    <li>
                      <strong>Export your insights:</strong> Download CSV files
                      with your recommendations or JSON data for your records
                    </li>
                  </ol>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    Best Practices for Belmont
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Regular analysis:</strong> Run this analysis
                      weekly to track your performance trends
                    </li>
                    <li>
                      <strong>Focus on high-value services:</strong> Use the
                      insights to schedule more profitable services during peak
                      times
                    </li>
                    <li>
                      <strong>Promote off-peak specials:</strong> Use the
                      recommendations to create special offers for slower times
                    </li>
                    <li>
                      <strong>Monitor no-show rates:</strong> Keep no-show rates
                      below 10% by following up with reminders
                    </li>
                    <li>
                      <strong>Staff scheduling:</strong> Use the utilization
                      data to schedule staff more efficiently
                    </li>
                    <li>
                      <strong>Marketing timing:</strong> Post on social media
                      during times when customers are most likely to book
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    Understanding the Metrics
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Utilization:</strong> Percentage of available time
                      that was actually booked (aim for 70-85%)
                    </li>
                    <li>
                      <strong>No-show rate:</strong> Percentage of appointments
                      where customers didn't show up (keep under 10%)
                    </li>
                    <li>
                      <strong>Idle minutes:</strong> Total minutes where chairs
                      were available but not booked
                    </li>
                    <li>
                      <strong>Heatmap colors:</strong> Green = high utilization,
                      Red = low utilization, Gray = closed hours
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="h3 mb-2">
                    Data Requirements
                  </h3>
                  <p className="text-muted-foreground mb-2">
                    Your CSV file should include these key columns (you can map
                    them in the tool):
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Start datetime:</strong> When the appointment
                      begins (e.g., "2024-01-15T14:00:00")
                    </li>
                    <li>
                      <strong>Duration:</strong> How long the appointment lasts
                      in minutes (e.g., 30, 45, 60)
                    </li>
                    <li>
                      <strong>Status:</strong> Whether the appointment was
                      completed, cancelled, or no-show
                    </li>
                    <li>
                      <strong>Optional:</strong> Staff member and service type
                      for more detailed analysis
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upload Data Tab */}
        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Your Appointment Data
              </CardTitle>
              <CardDescription>
                Upload a CSV file from Square or your booking system, or try the
                demo data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  variant="secondary"
                  onClick={loadDemo}
                  className="flex-1"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Load Demo Data
                </Button>
                <div className="flex-1">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={onFile}
                    className="hidden"
                    id="csvFile"
                  />
                  <label htmlFor="csvFile">
                    <Button variant="outline" className="w-full" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload CSV File
                      </span>
                    </Button>
                  </label>
                </div>
              </div>

              {loadState && (
                <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                  {loadState}
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                <p className="mb-2">
                  <strong>Expected CSV format:</strong> Your file should include
                  appointment start times, durations, and status information.
                </p>
                <p>
                  Don't worry about exact column names - you can map them in the
                  next step.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* KPI Cards */}
          {totals.totalAppts > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard
                label="Utilization"
                value={utilPct}
                icon={
                  totals.util > 0.7 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-amber-600" />
                  )
                }
                hint="Booked minutes / capacity minutes"
              />
              <KPICard
                label="No‑Show Rate"
                value={noshowPct}
                icon={<TrendingDown className="h-4 w-4 text-amber-600" />}
                hint="No‑shows / all appointments"
              />
              <KPICard
                label="Idle Minutes"
                value={idleMin.toLocaleString()}
                icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
                hint="Capacity − booked over period"
              />
              <KPICard
                label="Total Appointments"
                value={totals.totalAppts}
                icon={<TrendingUp className="h-4 w-4" />}
                hint={`Kept ${totals.keptAppts} · No‑show ${totals.noshowAppts} · Cancel ${totals.cancelledAppts}`}
              />
            </div>
          )}

          {/* Column Mapping */}
          {raw.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Column Mapping (match your CSV headings)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-5 gap-3">
                <div>
                  <Label>Start datetime</Label>
                  <Input
                    value={mappedCols.start}
                    onChange={(e) =>
                      setMappedCols((c) => ({ ...c, start: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Duration (minutes)</Label>
                  <Input
                    value={mappedCols.duration}
                    onChange={(e) =>
                      setMappedCols((c) => ({ ...c, duration: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Input
                    value={mappedCols.status}
                    onChange={(e) =>
                      setMappedCols((c) => ({ ...c, status: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Staff (optional)</Label>
                  <Input
                    value={mappedCols.staff}
                    onChange={(e) =>
                      setMappedCols((c) => ({ ...c, staff: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Service (optional)</Label>
                  <Input
                    value={mappedCols.service}
                    onChange={(e) =>
                      setMappedCols((c) => ({ ...c, service: e.target.value }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6 advanced-only">
          {totals.totalAppts === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  No data to analyze yet. Upload your appointment data or load
                  the demo to see the analysis.
                </p>
              </CardContent>
            </Card>
          )}

          {totals.totalAppts > 0 && (
            <>
              {/* Heatmap & charts */}
              <div className="grid lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2 flex items-center justify-between">
                    <CardTitle className="text-base">
                      Utilization Heatmap (hour × day)
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => heatRef.current && window.print()}
                      >
                        <FileDown className="h-4 w-4 mr-1" />
                        Print Heatmap
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div ref={heatRef} className="overflow-auto">
                      <div className="min-w-[720px]">
                        {/* header row */}
                        <div className="grid grid-cols-[120px_repeat(24,1fr)] sticky top-0 bg-background z-10">
                          <div className="p-2 text-xs font-medium">
                            Day / Hour
                          </div>
                          {HOUR_LABELS.map((h, i) => (
                            <div
                              key={i}
                              className="p-2 text-[10px] text-center text-muted-foreground"
                            >
                              {h}
                            </div>
                          ))}
                        </div>
                        {/* rows */}
                        {Array.from({ length: 7 }, (_, d) => d).map((d) => (
                          <div
                            key={d}
                            className="grid grid-cols-[120px_repeat(24,1fr)] border-b"
                          >
                            <div className="p-2 text-xs font-medium flex items-center gap-2">
                              {DOW_LABELS[d]}
                              <Badge variant="secondary">
                                {fmtPct(perDay[d].util)}
                              </Badge>
                            </div>
                            {Array.from({ length: 24 }, (_, h) => h).map(
                              (h) => {
                                const cell = grid[d][h];
                                const cap = capacity[d][h];
                                const u = cap > 0 ? cell.bookedMin / cap : 0;
                                const active = cap > 0;
                                const color = active
                                  ? utilColor(u)
                                  : "hsl(0 0% 96%)";
                                return (
                                  <div
                                    key={h}
                                    className="h-8 border-r"
                                    style={{ background: color }}
                                    title={`Utilization: ${fmtPct(u)}\nKept min: ${cell.bookedMin} / Cap: ${cap}\nAppts: kept ${cell.kept} · no‑show ${cell.noshow} · cancel ${cell.cancelled}`}
                                  ></div>
                                );
                              }
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Per‑Day Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="h-full">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={perDay}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" />
                          <YAxis
                            tickFormatter={(v) => `${Math.round(v * 100)}%`}
                          />
                          <ReTooltip
                            formatter={(v) =>
                              `${Math.round((v as number) * 100)}%`
                            }
                          />
                          <Legend />
                          <Bar dataKey="util" name="Utilization" />
                          <Bar dataKey="noshow" name="No‑show rate" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6 advanced-only">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Business Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-4 gap-3">
                <div>
                  <Label>Chairs</Label>
                  <Input
                    type="number"
                    min={1}
                    value={settings.chairs}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        chairs: clamp(parseInt(e.target.value || "1"), 1, 50),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Slot minutes</Label>
                  <Input
                    type="number"
                    min={15}
                    step={15}
                    value={settings.slotMin}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        slotMin: clamp(
                          parseInt(e.target.value || "60"),
                          15,
                          120
                        ),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Timezone</Label>
                  <Input
                    value={settings.tz}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, tz: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Date range (from)</Label>
                  <Input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) =>
                      setDateRange((r) => ({ ...r, from: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Date range (to)</Label>
                  <Input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) =>
                      setDateRange((r) => ({ ...r, to: e.target.value }))
                    }
                  />
                </div>
              </div>

              <Separator className="my-2" />

              {/* Hours grid */}
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 7 }, (_, d) => d).map((d) => {
                  const day = settings.week[d];
                  return (
                    <div key={d} className="border rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{DOW_LABELS[d]}</div>
                        <div className="flex items-center gap-2 text-xs">
                          <span>Open</span>
                          <Checkbox
                            checked={day.openEnabled}
                            onCheckedChange={(v) =>
                              setBusinessHour(d, "openEnabled", Boolean(v))
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Open</Label>
                          <Input
                            value={day.open}
                            onChange={(e) =>
                              setBusinessHour(d, "open", e.target.value)
                            }
                            placeholder="10:00"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Close</Label>
                          <Input
                            value={day.close}
                            onChange={(e) =>
                              setBusinessHour(d, "close", e.target.value)
                            }
                            placeholder="19:00"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Separator className="my-2" />

              {/* Status mapping */}
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <Label>Kept statuses (comma‑sep)</Label>
                  <Input
                    value={settings.keptStatuses.join(", ")}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        keptStatuses: e.target.value
                          .split(/\s*,\s*/)
                          .filter(Boolean),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>No‑show statuses</Label>
                  <Input
                    value={settings.noshowStatuses.join(", ")}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        noshowStatuses: e.target.value
                          .split(/\s*,\s*/)
                          .filter(Boolean),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Cancelled statuses</Label>
                  <Input
                    value={settings.cancelledStatuses.join(", ")}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        cancelledStatuses: e.target.value
                          .split(/\s*,\s*/)
                          .filter(Boolean),
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          {totals.totalAppts === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  No recommendations available yet. Upload your appointment data
                  to see optimization suggestions.
                </p>
              </CardContent>
            </Card>
          )}

          {totals.totalAppts > 0 && (
            <Card>
              <CardHeader className="pb-2 flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Flame className="h-4 w-4" />
                  Off‑Peak Windows (Top Suggestions)
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={exportRecs}>
                    <FileDown className="h-4 w-4 mr-1" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportMetricsJSON}
                  >
                    <FileDown className="h-4 w-4 mr-1" />
                    Export Metrics (JSON)
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Window</TableHead>
                      <TableHead>Utilization</TableHead>
                      <TableHead>Suggestion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recs.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {r.window}
                        </TableCell>
                        <TableCell>{fmtPct(r.utilization)}</TableCell>
                        <TableCell className="text-sm">
                          {r.suggestion}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {recs.length === 0 && (
                  <div className="text-sm text-muted-foreground mt-2">
                    No recommendations yet — upload data or load demo.
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ProfitIntelligenceStudio;
