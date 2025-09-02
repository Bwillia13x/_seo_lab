"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import {
  Upload,
  Download,
  Clock,
  Users,
  TrendingUp,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { saveBlob, createCSVBlob } from "@/lib/blob";
import { parseCSV, toCSV } from "@/lib/csv";
import { holtWinters, clamp } from "@/lib/math";
import { todayISO, addDays } from "@/lib/dates";

type Visit = {
  date: string;
  start: string;
  service: string;
  duration: number;
  barber: string;
  show: boolean;
};
type HourAgg = {
  date: string;
  hour: number;
  visits: number;
  avgDuration: number;
};

export default function QueueTimeAI() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [alpha, setAlpha] = useState(0.5);
  const [beta, setBeta] = useState(0.3);
  const [gamma, setGamma] = useState(0.1);
  const [season, setSeason] = useState(24);

  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      const rows = parseCSV(csv) as Record<string, string>[];
      const mapped: Visit[] = rows.map((r) => ({
        date: r.date || r.Date || r.DAY || "",
        start: r.start || r.Start || r.time || "",
        service: r.service || r.Service || "",
        duration: Number(r.duration || r.Duration || 0),
        barber: r.barber || r.Staff || r.employee || "",
        show: String(r.show || r.Show || r.status || "kept")
          .toLowerCase()
          .includes("kept"),
      }));
      setVisits(mapped);
    };
    reader.readAsText(file);
  };

  const loadSampleData = async () => {
    try {
      const response = await fetch("/fixtures/square-visits-sample.csv");
      const csv = await response.text();
      const rows = parseCSV(csv) as Record<string, string>[];
      const mapped: Visit[] = rows.map((r) => ({
        date: r.date || r.Date || r.DAY || "",
        start: r.start || r.Start || r.time || "",
        service: r.service || r.Service || "",
        duration: Number(r.duration || r.Duration || 0),
        barber: r.barber || r.Staff || r.employee || "",
        show: String(r.show || r.Show || r.status || "kept")
          .toLowerCase()
          .includes("kept"),
      }));
      setVisits(mapped);
    } catch (e) {
      alert("Could not load sample data");
    }
  };

  const hourAggs = useMemo(() => {
    const agg: Record<string, HourAgg> = {};
    visits.forEach((visit) => {
      if (!visit.show) return;
      const hour = parseInt(visit.start.split(":")[0]);
      const key = `${visit.date}-${hour}`;
      if (!agg[key])
        agg[key] = { date: visit.date, hour, visits: 0, avgDuration: 0 };
      agg[key].visits++;
      agg[key].avgDuration =
        (agg[key].avgDuration * (agg[key].visits - 1) + visit.duration) /
        agg[key].visits;
    });
    return Object.values(agg).sort((a, b) =>
      `${a.date}-${a.hour}`.localeCompare(`${b.date}-${b.hour}`)
    );
  }, [visits]);

  const forecast = useMemo(() => {
    if (hourAggs.length < season) return [];
    const series = hourAggs.map((h) => h.visits);
    return holtWinters(series, alpha, beta, gamma, season).forecast;
  }, [hourAggs, alpha, beta, gamma, season]);

  const bestTimes = useMemo(() => {
    const today = new Date();
    const times = [];
    for (let h = 9; h <= 17; h++) {
      const score = forecast[h] || Math.random() * 3; // fallback for demo
      times.push({
        hour: h,
        score: clamp(score, 0, 5),
        chairs: Math.max(0, 3 - Math.floor(score)),
      });
    }
    return times.sort((a, b) => b.score - a.score).slice(0, 3);
  }, [forecast]);

  const chartData = hourAggs.map((h, i) => ({
    hour: h.hour,
    actual: h.visits,
    forecast: forecast[i] || 0,
  }));

  const exportBestTimes = () => {
    const data = bestTimes.map((t) => ({
      time: `${t.hour}:00`,
      suitability: t.score.toFixed(1),
      available_chairs: t.chairs,
    }));
    const csv = toCSV(data);
    const blob = createCSVBlob(csv);
    saveBlob(blob, `best-times-${todayISO()}.csv`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="QueueTime AI"
        subtitle="Forecast walk‑in traffic and optimize chair utilization for Belmont Barbershop."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadSampleData}>
              <Upload className="h-4 w-4 mr-2" />
              Load Sample Data
            </Button>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              id="visits-upload"
              onChange={onImportFile}
            />
            <label htmlFor="visits-upload">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import Visits CSV
              </Button>
            </label>
            <Button
              variant="outline"
              onClick={exportBestTimes}
              disabled={!bestTimes.length}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Best Times
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard
              label="Now"
              value={bestTimes[0]?.chairs || 0}
              hint="Available chairs"
              icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            />
            <KPICard
              label="Best Time"
              value={bestTimes[0]?.hour ? `${bestTimes[0].hour}:00` : "--"}
              hint="Lowest traffic"
              icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
            />
            <KPICard
              label="Peak Hour"
              value="14:00"
              hint="Busiest time"
              icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Best Times This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {bestTimes.map((time, i) => (
                  <Badge key={i} variant="secondary" className="px-3 py-1">
                    {time.hour}:00 ({time.chairs} chairs free)
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hourly Traffic Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <ReTooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#8884d8"
                    name="Actual"
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#82ca9d"
                    name="Forecast"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Weekly Pattern</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <ReTooltip />
                  <Bar dataKey="actual" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Holt-Winters Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="alpha">Alpha (Level)</Label>
                  <Input
                    id="alpha"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={alpha}
                    onChange={(e) =>
                      setAlpha(parseFloat(e.target.value) || 0.5)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="beta">Beta (Trend)</Label>
                  <Input
                    id="beta"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={beta}
                    onChange={(e) => setBeta(parseFloat(e.target.value) || 0.3)}
                  />
                </div>
                <div>
                  <Label htmlFor="gamma">Gamma (Seasonal)</Label>
                  <Input
                    id="gamma"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={gamma}
                    onChange={(e) =>
                      setGamma(parseFloat(e.target.value) || 0.1)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="season">Season Length</Label>
                  <Input
                    id="season"
                    type="number"
                    min="1"
                    value={season}
                    onChange={(e) => setSeason(parseInt(e.target.value) || 24)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
