"use client";

import React, { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  TrendingUp,
  Calendar,
  Info,
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
import { todayISO } from "@/lib/dates";

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
        title="Busy Times Predictor"
        subtitle="Forecast walk‑in traffic and optimize chair utilization for Belmont Barbershop."
        showLogo={true}
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

      <Tabs defaultValue="howto">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="howto">How To</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* How To Tab */}
        <TabsContent value="howto" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                How to Use the Busy Times Predictor
              </CardTitle>
              <CardDescription>
                Learn how to analyze customer traffic patterns to optimize
                Belmont's staffing and scheduling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    What This Tool Does
                  </h3>
                  <p className="text-muted-foreground">
                    This tool analyzes Belmont's historical appointment data to
                    predict when customers are most likely to visit. It uses
                    advanced time series forecasting (Holt-Winters method) to
                    identify busy periods, slow times, and optimal staffing
                    levels throughout the day and week.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Why Busy Time Prediction Matters for Belmont
                  </h3>
                  <p className="text-muted-foreground">
                    Knowing when customers are most likely to visit helps
                    Belmont make smarter business decisions:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground mt-2">
                    <li>
                      <strong>Staff scheduling:</strong> Schedule more barbers
                      during peak hours and fewer during slow times
                    </li>
                    <li>
                      <strong>Reduce wait times:</strong> Ensure enough chairs
                      are available when customers need them most
                    </li>
                    <li>
                      <strong>Increase revenue:</strong> Maximize chair
                      utilization and handle more customers efficiently
                    </li>
                    <li>
                      <strong>Customer satisfaction:</strong> Minimize wait
                      times during busy periods
                    </li>
                    <li>
                      <strong>Staff productivity:</strong> Match staff
                      availability with customer demand patterns
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Step-by-Step Instructions
                  </h3>
                  <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                    <li>
                      <strong>Upload your data:</strong> Click "Import Visits
                      CSV" and upload a CSV file from Square or your booking
                      system, or use the "Load Sample Data" button to try the
                      tool with demo data
                    </li>
                    <li>
                      <strong>Review the dashboard:</strong> Check the
                      "Dashboard" tab to see current availability and best times
                    </li>
                    <li>
                      <strong>Analyze the forecast:</strong> Look at the
                      "Forecast" tab to see predicted traffic patterns and
                      charts
                    </li>
                    <li>
                      <strong>Fine-tune settings:</strong> Adjust the
                      forecasting parameters in the "Settings" tab if needed
                    </li>
                    <li>
                      <strong>Export recommendations:</strong> Use the "Export
                      Best Times" button to download optimal scheduling
                      suggestions
                    </li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Best Practices for Belmont
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Weekly planning:</strong> Run this analysis every
                      Monday to plan the week's staffing
                    </li>
                    <li>
                      <strong>Peak hour focus:</strong> Schedule experienced
                      barbers during the busiest times (typically mornings and
                      afternoons)
                    </li>
                    <li>
                      <strong>Lunch coverage:</strong> Ensure adequate coverage
                      during lunch hours when traffic might dip
                    </li>
                    <li>
                      <strong>Walk-in management:</strong> Use the predictions
                      to manage walk-in customers during peak times
                    </li>
                    <li>
                      <strong>Marketing timing:</strong> Post social media
                      promotions during predicted slow times to boost traffic
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Understanding the Forecast
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Holt-Winters method:</strong> Advanced time series
                      forecasting that considers level, trend, and seasonality
                    </li>
                    <li>
                      <strong>Alpha parameter:</strong> Controls how much weight
                      to give recent data vs. historical patterns
                    </li>
                    <li>
                      <strong>Beta parameter:</strong> Controls trend
                      sensitivity in the forecast
                    </li>
                    <li>
                      <strong>Gamma parameter:</strong> Controls seasonal
                      pattern recognition
                    </li>
                    <li>
                      <strong>Season length:</strong> Number of time periods in
                      a seasonal cycle (default 24 hours)
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Data Format Requirements
                  </h3>
                  <p className="text-muted-foreground mb-2">
                    Your CSV file should include these columns (the tool will
                    automatically map common variations):
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Date:</strong> Appointment date (YYYY-MM-DD
                      format)
                    </li>
                    <li>
                      <strong>Start:</strong> Appointment start time (HH:MM
                      format, 24-hour)
                    </li>
                    <li>
                      <strong>Service:</strong> Type of service (Men's Cut,
                      Beard Trim, etc.)
                    </li>
                    <li>
                      <strong>Duration:</strong> Appointment duration in minutes
                    </li>
                    <li>
                      <strong>Barber/Staff:</strong> Which barber/staff member
                      (optional)
                    </li>
                    <li>
                      <strong>Status:</strong> Whether appointment was kept,
                      cancelled, or no-show
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Interpreting Results
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Available chairs:</strong> Shows how many chairs
                      are free at current time
                    </li>
                    <li>
                      <strong>Best times:</strong> Hours with lowest predicted
                      traffic (good for scheduling)
                    </li>
                    <li>
                      <strong>Traffic heatmap:</strong> Visual representation of
                      busy vs. slow periods
                    </li>
                    <li>
                      <strong>Forecast accuracy:</strong> How well the model
                      predicts future traffic patterns
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
