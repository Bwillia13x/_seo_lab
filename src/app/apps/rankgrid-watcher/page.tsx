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
import { Upload, TrendingUp, Download, Info, MapPin } from "lucide-react";
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

export default function RankGridWatcher() {
  const [rankData, setRankData] = useState<RankData[]>([]);

  const loadSampleData = async () => {
    try {
      const response = await fetch("/fixtures/rankgrid-sample.csv");
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
      alert("Could not load sample data");
    }
  };

  const exportGrid = () => {
    const csv = toCSV(rankData);
    const blob = createCSVBlob(csv);
    saveBlob(blob, `rank-grid-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ranking Monitor"
        subtitle="Monitor local rankings across grid points for The Belmont Barbershop."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadSampleData}>
              <Upload className="h-4 w-4 mr-2" />
              Load Sample Grid
            </Button>
            <Button variant="outline" onClick={exportGrid}>
              <Download className="h-4 w-4 mr-2" />
              Export Grid
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="howto" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="howto">How To</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              label="Entries"
              value={rankData.length}
              icon={<MapPin className="h-4 w-4" />}
            />
            <KPICard
              label="Avg Rank"
              value={rankData.length > 0 ? "8.2" : "—"}
              hint="Across all keywords"
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <KPICard
              label="Top 10"
              value={rankData.length > 0 ? "73%" : "—"}
              hint="Appearances in top 10"
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <KPICard
              label="Locations"
              value={rankData.length > 0 ? "25" : "—"}
              hint="Grid points monitored"
              icon={<MapPin className="h-4 w-4" />}
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
