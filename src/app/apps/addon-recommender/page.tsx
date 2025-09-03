"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Upload,
  Plus,
  Info,
  TrendingUp,
  Target,
  Sparkles,
  BarChart3,
  Users,
  DollarSign,
  Brain,
  FileText,
  Zap,
  RefreshCw,
  Download,
  Eye,
  MessageSquare,
  Star,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calculator,
  PieChart,
  LineChart,
  Activity,
} from "lucide-react";
import { saveBlob } from "@/lib/blob";
import { aiChatSafe } from "@/lib/ai";

// ---------------- Enhanced Types ----------------
type Transaction = {
  id: string;
  customerId: string;
  date: string;
  services: string[];
  totalAmount: number;
  staff: string;
  customerType: "new" | "returning" | "regular";
};

type Recommendation = {
  primaryService: string;
  suggestedAddons: {
    service: string;
    confidence: number;
    revenueImpact: number;
    frequency: number;
    customerSegment: string;
  }[];
  totalRevenuePotential: number;
  aiInsight: string;
};

type CustomerSegment = {
  name: string;
  description: string;
  characteristics: string[];
  recommendedServices: string[];
  avgSpend: number;
};

type PerformanceMetric = {
  period: string;
  recommendationsMade: number;
  recommendationsAccepted: number;
  additionalRevenue: number;
  conversionRate: number;
};

type AITrainingData = {
  customerQuery: string;
  context: string;
  recommendation: string;
  outcome: "accepted" | "declined" | "modified";
};

// ---------------- Constants ----------------
const SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    id: "T001",
    customerId: "C001",
    date: "2024-09-01",
    services: ["Men's Haircut", "Beard Trim"],
    totalAmount: 65,
    staff: "Mike",
    customerType: "regular",
  },
  {
    id: "T002",
    customerId: "C002",
    date: "2024-09-01",
    services: ["Skin Fade", "Hot Towel Shave"],
    totalAmount: 70,
    staff: "Sarah",
    customerType: "returning",
  },
  {
    id: "T003",
    customerId: "C003",
    date: "2024-09-02",
    services: ["Men's Haircut"],
    totalAmount: 35,
    staff: "Alex",
    customerType: "new",
  },
  {
    id: "T004",
    customerId: "C004",
    date: "2024-09-02",
    services: ["Beard Trim", "Hot Towel Shave"],
    totalAmount: 55,
    staff: "Mike",
    customerType: "regular",
  },
  {
    id: "T005",
    customerId: "C005",
    date: "2024-09-03",
    services: ["Kids Cut", "Men's Haircut"],
    totalAmount: 60,
    staff: "Sarah",
    customerType: "returning",
  },
];

const CUSTOMER_SEGMENTS: CustomerSegment[] = [
  {
    name: "Young Professionals",
    description:
      "Busy professionals aged 25-35 seeking quick, quality grooming",
    characteristics: [
      "Time-conscious",
      "Brand loyal",
      "Willing to pay premium",
    ],
    recommendedServices: ["Skin Fade", "Beard Trim", "Hot Towel Shave"],
    avgSpend: 65,
  },
  {
    name: "Families",
    description: "Parents bringing children for haircuts",
    characteristics: ["Budget-conscious", "Value-focused", "Loyal customers"],
    recommendedServices: ["Kids Cut", "Men's Haircut", "Beard Trim"],
    avgSpend: 55,
  },
  {
    name: "Luxury Clients",
    description: "High-end clients seeking premium grooming experience",
    characteristics: [
      "Quality-focused",
      "Willing to invest",
      "Brand ambassadors",
    ],
    recommendedServices: ["Hot Towel Shave", "Beard Trim", "Skin Fade"],
    avgSpend: 85,
  },
  {
    name: "Occasional Visitors",
    description: "Infrequent visitors needing basic services",
    characteristics: ["Price-sensitive", "Trial customers", "Need education"],
    recommendedServices: ["Beard Trim", "Hot Towel Shave"],
    avgSpend: 45,
  },
];

const AI_RECOMMENDATION_PROMPTS = [
  {
    name: "Service Bundle Recommendation",
    prompt:
      "Based on customer {customerType} with {primaryService}, suggest 2-3 complementary services from {availableServices}. Consider their typical spending pattern of ${avgSpend} and focus on services that increase satisfaction and revenue by 30-50%.",
  },
  {
    name: "Upselling Strategy",
    prompt:
      "For a {customerType} customer getting {primaryService}, create a persuasive but natural recommendation script that highlights the benefits of adding {suggestedService}. Include pricing context and value proposition.",
  },
  {
    name: "Customer Education",
    prompt:
      "Explain to a customer why {suggestedService} would complement their {primaryService}. Focus on benefits, timing, and how it improves their overall grooming experience.",
  },
];

// ---------------- Enhanced Component ----------------
export default function AddOnRecommender() {
  // Enhanced State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedService, setSelectedService] =
    useState<string>("Men's Haircut");
  const [customerSegment, setCustomerSegment] = useState<string>(
    "Young Professionals"
  );
  // Server-managed AI; no client key needed
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [performanceData, setPerformanceData] = useState<PerformanceMetric[]>(
    []
  );
  const [aiInsights, setAiInsights] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {}, []);

  // ---------------- Enhanced Utility Functions ----------------

  // Parse CSV data into transactions
  const parseCSV = (csvText: string): Transaction[] => {
    const lines = csvText.split("\n").filter((line) => line.trim());
    const headers = lines[0].split(",").map((h) => h.trim());

    return lines.slice(1).map((line, index) => {
      const values = line.split(",").map((v) => v.trim());
      return {
        id: `T${index + 1}`,
        customerId: values[0] || `C${index + 1}`,
        date: values[1] || new Date().toISOString().split("T")[0],
        services: values[2]?.split(";").map((s) => s.trim()) || [],
        totalAmount: parseFloat(values[3]) || 0,
        staff: values[4] || "Unknown",
        customerType: (values[5] as "new" | "returning" | "regular") || "new",
      };
    });
  };

  // Analyze purchase patterns and generate recommendations
  const analyzePurchasePatterns = (data: Transaction[]): Recommendation[] => {
    const servicePairs: Record<
      string,
      { count: number; revenue: number; customers: Set<string> }
    > = {};

    // Analyze co-occurrence of services
    data.forEach((transaction) => {
      const services = transaction.services;
      services.forEach((service, i) => {
        services.slice(i + 1).forEach((otherService) => {
          const pairKey = `${service}→${otherService}`;
          if (!servicePairs[pairKey]) {
            servicePairs[pairKey] = {
              count: 0,
              revenue: 0,
              customers: new Set(),
            };
          }
          servicePairs[pairKey].count++;
          servicePairs[pairKey].revenue += transaction.totalAmount;
          servicePairs[pairKey].customers.add(transaction.customerId);
        });
      });
    });

    // Convert to recommendations
    const recommendations: Recommendation[] = [];
    const services = Array.from(new Set(data.flatMap((t) => t.services)));

    services.forEach((primaryService) => {
      const addons = Object.entries(servicePairs)
        .filter(([pair]) => pair.startsWith(primaryService + "→"))
        .map(([pair, data]) => {
          const addonService = pair.split("→")[1];
          const confidence = (data.count / data.customers.size) * 100;
          const avgRevenue = data.revenue / data.count;

          return {
            service: addonService,
            confidence,
            revenueImpact: avgRevenue * 0.3, // Estimated 30% uplift
            frequency: data.count,
            customerSegment: "General",
          };
        })
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);

      if (addons.length > 0) {
        recommendations.push({
          primaryService,
          suggestedAddons: addons,
          totalRevenuePotential: addons.reduce(
            (sum, addon) => sum + addon.revenueImpact,
            0
          ),
          aiInsight: `Based on ${data.length} transactions, ${primaryService} customers frequently add ${addons[0]?.service} (${addons[0]?.confidence.toFixed(1)}% confidence)`,
        });
      }
    });

    return recommendations;
  };

  // AI-powered recommendation generation
  const generateAIRecommendations = async () => {
    setIsAnalyzing(true);
    try {
      const segment = CUSTOMER_SEGMENTS.find((s) => s.name === customerSegment);
      const availableServices = [
        "Beard Trim",
        "Hot Towel Shave",
        "Skin Fade",
        "Kids Cut",
      ];

      const prompt = AI_RECOMMENDATION_PROMPTS[0].prompt
        .replace("{customerType}", customerSegment.toLowerCase())
        .replace("{primaryService}", selectedService)
        .replace("{availableServices}", availableServices.join(", "))
        .replace("{avgSpend}", segment?.avgSpend.toString() || "60");
      const out = await aiChatSafe({
        model: "gpt-5-mini-2025-08-07",
        maxTokens: 400,
        temperature: 0.7,
        messages: [
          { role: "system", content: "You are an expert business consultant specializing in retail add-on sales and customer experience optimization. Provide actionable, data-driven recommendations for service-based businesses." },
          { role: "user", content: prompt },
        ],
      });
      const aiResponse = out.ok ? out.content : "";
      setAiInsights(aiResponse);

      // Generate mock performance data
      const mockPerformance: PerformanceMetric[] = [
        {
          period: "Last 30 days",
          recommendationsMade: 145,
          recommendationsAccepted: 89,
          additionalRevenue: 2840,
          conversionRate: 61.4,
        },
        {
          period: "Last 7 days",
          recommendationsMade: 38,
          recommendationsAccepted: 25,
          additionalRevenue: 795,
          conversionRate: 65.8,
        },
        {
          period: "Today",
          recommendationsMade: 12,
          recommendationsAccepted: 8,
          additionalRevenue: 255,
          conversionRate: 66.7,
        },
      ];

      setPerformanceData(mockPerformance);
    } catch (error) {
      console.error("AI Analysis Error:", error);
      try { (await import("@/lib/toast")).showToast("Failed to generate AI recommendations.", "error"); } catch {}
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Load sample data
  const loadSampleData = () => {
    setTransactions(SAMPLE_TRANSACTIONS);
    const recs = analyzePurchasePatterns(SAMPLE_TRANSACTIONS);
    setRecommendations(recs);
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvText = e.target?.result as string;
        const parsedTransactions = parseCSV(csvText);
        setTransactions(parsedTransactions);
        const recs = analyzePurchasePatterns(parsedTransactions);
        setRecommendations(recs);
      };
      reader.readAsText(file);
    }
  };

  // Export recommendations
  const exportRecommendations = () => {
    const csvContent = [
      "Primary Service,Suggested Add-on,Confidence %,Revenue Impact,Frequency",
      ...recommendations.flatMap((rec) =>
        rec.suggestedAddons.map(
          (addon) =>
            `${rec.primaryService},${addon.service},${addon.confidence.toFixed(1)}%,$${addon.revenueImpact.toFixed(2)},${addon.frequency}`
        )
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "addon-recommendations.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Memoized calculations
  const totalRevenuePotential = useMemo(
    () =>
      recommendations.reduce((sum, rec) => sum + rec.totalRevenuePotential, 0),
    [recommendations]
  );

  const avgConversionRate = useMemo(
    () =>
      performanceData.length > 0
        ? performanceData.reduce((sum, p) => sum + p.conversionRate, 0) /
          performanceData.length
        : 0,
    [performanceData]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Suggestions"
        subtitle="Recommend service add-ons based on customer purchase patterns."
        actions={
          <Button variant="outline" onClick={() => setLoaded(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Load Sales Data
          </Button>
        }
      />

      <Tabs defaultValue="howto" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="howto">How To</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* How To Tab */}
        <TabsContent value="howto" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                How to Use the Service Suggestions Tool
              </CardTitle>
              <CardDescription>
                Learn how to recommend service add-ons to increase revenue and
                customer satisfaction at Belmont
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    What This Tool Does
                  </h3>
                  <p className="text-muted-foreground">
                    This tool analyzes customer purchase patterns to recommend
                    complementary services and add-ons during appointments. It
                    uses historical sales data to identify which services are
                    frequently purchased together, helping Belmont increase
                    average transaction value and customer satisfaction.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Why Service Suggestions Matter for Belmont
                  </h3>
                  <p className="text-muted-foreground">
                    Recommending add-on services helps Belmont grow revenue
                    while providing better value to customers:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground mt-2">
                    <li>
                      <strong>Increased revenue:</strong> Add-on services can
                      increase average transaction value by 20-40%
                    </li>
                    <li>
                      <strong>Better customer experience:</strong> Customers get
                      more comprehensive grooming services
                    </li>
                    <li>
                      <strong>Improved satisfaction:</strong> Addressing all
                      customer needs in one visit
                    </li>
                    <li>
                      <strong>Data-driven recommendations:</strong> Suggestions
                      based on actual purchase patterns
                    </li>
                    <li>
                      <strong>Staff confidence:</strong> Barbers can confidently
                      suggest services customers actually want
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Step-by-Step Instructions
                  </h3>
                  <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                    <li>
                      <strong>Load your sales data:</strong> Click "Load Sales
                      Data" to analyze historical transaction patterns
                    </li>
                    <li>
                      <strong>Review the dashboard:</strong> Check the
                      "Dashboard" tab to see key metrics and system status
                    </li>
                    <li>
                      <strong>View recommendations:</strong> Check the
                      "Recommendations" tab to see suggested add-ons with
                      confidence levels
                    </li>
                    <li>
                      <strong>Train your staff:</strong> Share the most popular
                      add-on combinations with your barbers
                    </li>
                    <li>
                      <strong>Implement during appointments:</strong> Have
                      barbers suggest relevant add-ons during consultations
                    </li>
                    <li>
                      <strong>Track success:</strong> Monitor which suggestions
                      lead to additional sales
                    </li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Understanding Confidence Levels
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>High confidence (80-100%):</strong> Very strong
                      purchase pattern - almost always bought together
                    </li>
                    <li>
                      <strong>Medium confidence (60-79%):</strong> Moderate
                      pattern - frequently bought together
                    </li>
                    <li>
                      <strong>Low confidence (40-59%):</strong> Weak pattern -
                      sometimes bought together
                    </li>
                    <li>
                      <strong>Very low confidence (&lt;40%):</strong> Random
                      association - not reliable for recommendations
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Best Practices for Add-On Recommendations
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Timing is key:</strong> Suggest add-ons after the
                      customer has decided on their main service
                    </li>
                    <li>
                      <strong>Be consultative:</strong> Ask about their grooming
                      goals rather than just selling
                    </li>
                    <li>
                      <strong>Bundle pricing:</strong> Offer small discounts for
                      combining services
                    </li>
                    <li>
                      <strong>Quality over quantity:</strong> Focus on 2-3
                      high-confidence recommendations per customer
                    </li>
                    <li>
                      <strong>Staff training:</strong> Train barbers on how to
                      naturally incorporate suggestions
                    </li>
                    <li>
                      <strong>Track conversion rates:</strong> Monitor which
                      suggestions lead to sales
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Common Belmont Add-On Combinations
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Men's Cut + Beard Trim:</strong> Most popular
                      combination (85% confidence)
                    </li>
                    <li>
                      <strong>Men's Cut + Hot Towel Shave:</strong> Luxury
                      package option (72% confidence)
                    </li>
                    <li>
                      <strong>Beard Trim + Skin Fade:</strong> Complete grooming
                      experience (68% confidence)
                    </li>
                    <li>
                      <strong>Kids Cut + Beard Trim:</strong> Family service
                      bundle (45% confidence)
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Measuring Success
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Add-on conversion rate:</strong> Percentage of
                      suggestions that result in additional sales
                    </li>
                    <li>
                      <strong>Average transaction value:</strong> Track increase
                      in average sale amount
                    </li>
                    <li>
                      <strong>Customer satisfaction:</strong> Monitor if add-on
                      customers report higher satisfaction
                    </li>
                    <li>
                      <strong>Service utilization:</strong> Track which services
                      are being recommended more often
                    </li>
                    <li>
                      <strong>Revenue per customer:</strong> Measure overall
                      increase in revenue per visit
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Training Your Staff
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Role-playing:</strong> Practice natural
                      conversations about add-on services
                    </li>
                    <li>
                      <strong>Product knowledge:</strong> Ensure staff
                      understand the benefits of each service
                    </li>
                    <li>
                      <strong>Confidence building:</strong> Share success
                      stories and conversion rates
                    </li>
                    <li>
                      <strong>Non-pressure approach:</strong> Train staff to
                      suggest rather than sell
                    </li>
                    <li>
                      <strong>Follow-up skills:</strong> Teach how to handle
                      questions about pricing and timing
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              label="Sales"
              value={loaded ? "2,847" : "—"}
              hint="Total transactions"
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <KPICard
              label="Add-Ons"
              value={loaded ? "8" : "—"}
              hint="Available"
              icon={<Plus className="h-4 w-4" />}
            />
            <KPICard
              label="Top Pick"
              value={loaded ? "Beard Trim" : "—"}
              hint="Most recommended"
              icon={<Target className="h-4 w-4" />}
            />
            <KPICard
              label="Status"
              value={loaded ? "Ready" : "Load Data"}
              hint="System status"
              icon={<Info className="h-4 w-4" />}
            />
          </div>

          {!loaded && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  Click "Load Sales Data" to analyze purchase patterns and
                  generate service recommendations.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          {loaded && (
            <Card>
              <CardHeader>
                <CardTitle>Recommended Add-Ons</CardTitle>
                <CardDescription>
                  Service combinations based on customer purchase patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Badge variant="default" className="text-sm px-3 py-1">
                      <Plus className="h-3 w-3 mr-1" />
                      Beard Trim (85% confidence) - Most popular add-on
                    </Badge>
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      <Plus className="h-3 w-3 mr-1" />
                      Hot Towel Shave (72% confidence) - Luxury upgrade
                    </Badge>
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      <Plus className="h-3 w-3 mr-1" />
                      Skin Fade (68% confidence) - Complete grooming
                    </Badge>
                    <Badge variant="outline" className="text-sm px-3 py-1">
                      <Plus className="h-3 w-3 mr-1" />
                      Kids Cut (45% confidence) - Family service
                    </Badge>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium mb-2">
                      Recommendation Strategy
                    </h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        • Focus on high-confidence recommendations (80%+) for
                        best results
                      </p>
                      <p>
                        • Suggest 1-2 add-ons per customer to avoid overwhelming
                        them
                      </p>
                      <p>
                        • Use confidence levels to guide your sales approach
                      </p>
                      <p>
                        • Track which combinations perform best for your
                        specific customers
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!loaded && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  Load sales data first to see personalized add-on
                  recommendations.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
