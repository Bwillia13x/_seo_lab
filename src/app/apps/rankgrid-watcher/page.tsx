"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, TrendingUp, Download } from "lucide-react";
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
        title="RankGrid Watcher"
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Entries" value={rankData.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rank Grid Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Grid monitoring functionality would display rankings across
            geographic points. Sample data loaded: {rankData.length} entries.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
