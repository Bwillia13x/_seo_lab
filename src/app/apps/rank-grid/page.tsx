"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
} from "lucide-react";
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
};

// -------- Color & scoring --------
function rankHue(rank: number) {
  // 1 green -> 20 red
  const r = clamp(rank, 1, 20);
  return 120 - ((r - 1) / 19) * 120; // 120..0
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
    };
    setSnapshots((prev) => [snap, ...prev]);
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
  function runTests(): Test[] {
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
  }

  const tests = useMemo(() => runTests(), []);
  const passCount = tests.filter((t) => t.passed).length;

  return (
    <div className="p-5 md:p-8 space-y-6">
      <PageHeader
        title="Local Rank Grid Tracker"
        subtitle="Map your Local Pack ranks over a grid, track visibility, and export snapshots."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadDemo}>
              <Sparkles className="h-4 w-4 mr-2" />
              Load Demo
            </Button>
            <Button variant="outline" onClick={clearGrid}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="grid">
        <TabsList>
          <TabsTrigger value="grid">Grid Input</TabsTrigger>
          <TabsTrigger value="snapshots">Snapshots</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
          <TabsTrigger value="help">Help</TabsTrigger>
        </TabsList>

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
                  <Label>Show numbers on cells</Label>
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

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <KPICard
                  label="Average Rank"
                  value={Number.isFinite(m.avg) ? m.avg.toFixed(2) : "—"}
                />
                <KPICard
                  label="Top‑3 Cells"
                  value={`${m.top3} / ${m.filled}`}
                />
                <KPICard
                  label="Top‑10 Cells"
                  value={`${m.top10} / ${m.filled}`}
                />
                <KPICard
                  label="Visibility Score"
                  value={`${m.visScore.toFixed(1)}%`}
                />
                <KPICard label="Coverage" value={`${m.coverage.toFixed(0)}%`} />
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
              <CardTitle className="text-base">
                Visibility Trend (by date)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <ReTooltip />
                    <Legend />
                    {keywordList.map((k, i) => (
                      <Line
                        key={k}
                        dataKey={k}
                        name={`${k} (Vis%)`}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
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
