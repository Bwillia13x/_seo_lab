"use client";

import React, { useState } from "react";
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
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import { Upload, Plus, Info, TrendingUp, Target } from "lucide-react";

export default function AddOnRecommender() {
  const [loaded, setLoaded] = useState(false);

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
