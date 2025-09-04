"use client";

import React, { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  Download,
  Plus,
  ArrowRight,
  CheckCircle,
  Clock,
  Edit,
  Info,
} from "lucide-react";
import { saveBlob, createCSVBlob } from "@/lib/blob";
import { parseCSV, toCSV } from "@/lib/csv";
import { todayISO, addDays } from "@/lib/dates";
import { kv } from "@/lib/storage";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";

type Experiment = {
  id: string;
  page: string;
  titleA: string;
  titleB: string;
  titleC: string;
  metaA: string;
  metaB: string;
  metaC: string;
  shipDate: string;
  reviewDate: string;
  status: "planned" | "shipped" | "review";
  deltaCTR?: number;
  notes: string;
};

const STORAGE_KEY = "meta-experiments";

export default function MetaPlanner() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [newPage, setNewPage] = useState("");
  const [newTitleA, setNewTitleA] = useState("");
  const [newTitleB, setNewTitleB] = useState("");
  const [newTitleC, setNewTitleC] = useState("");
  const [newMetaA, setNewMetaA] = useState("");
  const [newMetaB, setNewMetaB] = useState("");
  const [newMetaC, setNewMetaC] = useState("");

  useEffect(() => {
    const saved = kv.get<Experiment[]>(STORAGE_KEY, []);
    setExperiments(saved);
  }, []);

  useEffect(() => {
    kv.set(STORAGE_KEY, experiments);
  }, [experiments]);

  const addExperiment = () => {
    if (!newPage.trim() || !newTitleA.trim()) return;

    const experiment: Experiment = {
      id: crypto.randomUUID?.() || `${Date.now()}_${Math.random()}`,
      page: newPage,
      titleA: newTitleA,
      titleB: newTitleB,
      titleC: newTitleC,
      metaA: newMetaA,
      metaB: newMetaB,
      metaC: newMetaC,
      shipDate: todayISO(),
      reviewDate: addDays(30),
      status: "planned",
      notes: "",
    };

    setExperiments([...experiments, experiment]);
    setNewPage("");
    setNewTitleA("");
    setNewTitleB("");
    setNewTitleC("");
    setNewMetaA("");
    setNewMetaB("");
    setNewMetaC("");
  };

  const moveExperiment = (id: string, newStatus: Experiment["status"]) => {
    setExperiments(
      experiments.map((exp) =>
        exp.id === id
          ? {
              ...exp,
              status: newStatus,
              shipDate: newStatus === "shipped" ? todayISO() : exp.shipDate,
            }
          : exp
      )
    );
  };

  const updateExperiment = (id: string, updates: Partial<Experiment>) => {
    setExperiments(
      experiments.map((exp) => (exp.id === id ? { ...exp, ...updates } : exp))
    );
  };

  const loadSampleExperiments = () => {
    const sample: Experiment[] = [
      {
        id: "1",
        page: "https://thebelmontbarber.ca/",
        titleA: "Belmont Barbershop | Premium Haircuts in Bridgeland",
        titleB: "The Belmont | Calgary's Best Men's Haircut & Grooming",
        titleC: "Bridgeland Barber Shop | Professional Cuts & Shaves",
        metaA:
          "Experience premium haircuts and grooming services at The Belmont Barbershop in Bridgeland, Calgary.",
        metaB:
          "Calgary's premier barbershop offering expert haircuts, beard trims, and hot towel shaves in Bridgeland.",
        metaC:
          "Professional barber services in Bridgeland including men's cuts, kids haircuts, and luxury grooming.",
        shipDate: addDays(-7),
        reviewDate: addDays(23),
        status: "shipped",
        deltaCTR: 2.3,
        notes: "Title A performed best with 23% higher CTR",
      },
      {
        id: "2",
        page: "https://thebelmontbarber.ca/services",
        titleA: "Barber Services Calgary | Haircuts, Beard Trims, Shaves",
        titleB: "Men's Grooming Services | The Belmont Barbershop",
        titleC: "Professional Barber Services in Bridgeland",
        metaA:
          "Complete men's grooming services including haircuts, beard trims, and hot towel shaves.",
        metaB:
          "Expert barber services for men in Calgary's Bridgeland neighborhood.",
        metaC:
          "Haircuts, beard grooming, and luxury shaves at The Belmont Barbershop.",
        shipDate: todayISO(),
        reviewDate: addDays(30),
        status: "planned",
        notes: "Ready for A/B/C testing",
      },
    ];
    setExperiments(sample);
  };

  const exportBacklog = () => {
    const csv = toCSV(
      experiments.map((exp) => ({
        id: exp.id,
        page: exp.page,
        status: exp.status,
        ship_date: exp.shipDate,
        review_date: exp.reviewDate,
        title_a: exp.titleA,
        title_b: exp.titleB,
        title_c: exp.titleC,
        meta_a: exp.metaA,
        meta_b: exp.metaB,
        meta_c: exp.metaC,
        delta_ctr: exp.deltaCTR || "",
        notes: exp.notes,
      }))
    );
    const blob = createCSVBlob(csv);
    saveBlob(blob, `meta-experiments-${todayISO()}.csv`);
  };

  const getExperimentsByStatus = (status: Experiment["status"]) =>
    experiments.filter((exp) => exp.status === status);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Page Titles & Descriptions"
        subtitle="Manage A/B/C title and meta description experiments with CTR tracking."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadSampleExperiments}>
              <Upload className="h-4 w-4 mr-2" />
              Load Sample Experiments
            </Button>
            <span className="advanced-only contents">
              <Button variant="outline" onClick={exportBacklog}>
                <Download className="h-4 w-4 mr-2" />
                Export Backlog
              </Button>
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Total" value={experiments.length} hint="Experiments" />
        <KPICard
          label="Planned"
          value={getExperimentsByStatus("planned").length}
          hint="Ready to ship"
        />
        <KPICard
          label="Shipped"
          value={getExperimentsByStatus("shipped").length}
          hint="Running"
        />
        <KPICard
          label="Review"
          value={getExperimentsByStatus("review").length}
          hint="Ready for analysis"
        />
      </div>

      <Tabs defaultValue="howto">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="howto">How To</TabsTrigger>
          <TabsTrigger value="board">Kanban Board</TabsTrigger>
          <TabsTrigger value="add">Add Experiment</TabsTrigger>
        </TabsList>

        {/* How To Tab */}
        <TabsContent value="howto" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                How to Use the Page Titles & Descriptions Tool
              </CardTitle>
              <CardDescription>
                Learn how to optimize your page titles and meta descriptions for
                better search rankings and click-through rates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    What This Tool Does
                  </h3>
                  <p className="text-muted-foreground">
                    This tool helps you manage A/B/C experiments for page titles
                    and meta descriptions to improve your search engine rankings
                    and click-through rates (CTR). It provides a Kanban board to
                    track experiments from planning to review, with built-in CTR
                    tracking and performance analysis.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Why Title & Meta Description Optimization Matters
                  </h3>
                  <p className="text-muted-foreground">
                    Page titles and meta descriptions are the first things
                    customers see when your business appears in Google search
                    results:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground mt-2">
                    <li>
                      <strong>Titles appear as clickable headlines</strong> in
                      search results and influence click-through rates
                    </li>
                    <li>
                      <strong>Meta descriptions provide previews</strong> of
                      what customers will find on your page
                    </li>
                    <li>
                      <strong>
                        Well-optimized titles can increase CTR by 20-50%
                      </strong>{" "}
                      compared to generic titles
                    </li>
                    <li>
                      <strong>A/B/C testing helps you find</strong> what works
                      best for your specific audience
                    </li>
                    <li>
                      <strong>Data-driven improvements</strong> ensure you're
                      making changes that actually work
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Step-by-Step Instructions
                  </h3>
                  <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                    <li>
                      <strong>Start with sample experiments:</strong> Click
                      "Load Sample Experiments" to see examples of title and
                      meta variations
                    </li>
                    <li>
                      <strong>Review the Kanban board:</strong> Check the
                      "Kanban Board" tab to see experiments organized by status
                      (Planned, Shipped, Review)
                    </li>
                    <li>
                      <strong>Create new experiments:</strong> Go to the "Add
                      Experiment" tab to create new A/B/C tests for different
                      pages
                    </li>
                    <li>
                      <strong>Implement winning variations:</strong> Move
                      experiments to "Shipped" status and update your website
                    </li>
                    <li>
                      <strong>Track performance:</strong> After 2-4 weeks, add
                      CTR delta data to see which variations performed best
                    </li>
                    <li>
                      <strong>Move to review:</strong> When experiments are
                      ready, move them to "Review" status and analyze results
                    </li>
                    <li>
                      <strong>Export your backlog:</strong> Download CSV files
                      of all experiments for record-keeping and analysis
                    </li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Best Practices for Belmont
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Test one page at a time:</strong> Focus on
                      high-traffic pages like homepage, services, and location
                      pages
                    </li>
                    <li>
                      <strong>Include location keywords:</strong> Add
                      "Bridgeland", "Calgary", and "Riverside" to help local
                      searches
                    </li>
                    <li>
                      <strong>Highlight unique services:</strong> Mention
                      "Veterans Discount", "Hot Towel Shaves", and "Kids Cuts"
                    </li>
                    <li>
                      <strong>Create urgency:</strong> Use phrases like "Book
                      Now", "Easy Online Booking" in meta descriptions
                    </li>
                    <li>
                      <strong>Keep titles under 60 characters:</strong> Longer
                      titles get truncated in search results
                    </li>
                    <li>
                      <strong>Write compelling descriptions:</strong> Meta
                      descriptions should be 150-160 characters for full display
                    </li>
                    <li>
                      <strong>Test different approaches:</strong> Try
                      benefit-focused vs. feature-focused vs. location-focused
                      variations
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Understanding CTR Tracking
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>CTR Delta:</strong> The percentage change in
                      click-through rate compared to the original
                    </li>
                    <li>
                      <strong>Positive values:</strong> Variations that perform
                      better than the original (+15% = 15% better)
                    </li>
                    <li>
                      <strong>Negative values:</strong> Variations that perform
                      worse than the original (-5% = 5% worse)
                    </li>
                    <li>
                      <strong>Test duration:</strong> Give experiments 2-4 weeks
                      to accumulate enough data for reliable results
                    </li>
                    <li>
                      <strong>Statistical significance:</strong> Look for
                      changes of ±5% or more to be confident in the results
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Experiment Workflow
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Planned:</strong> Experiments ready to be
                      implemented on your website
                    </li>
                    <li>
                      <strong>Shipped:</strong> Variations are live and
                      collecting performance data
                    </li>
                    <li>
                      <strong>Review:</strong> Experiments complete and ready
                      for performance analysis
                    </li>
                    <li>
                      <strong>Notes field:</strong> Use this to record
                      implementation details and observations
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Common Title Patterns to Test
                  </h3>
                  <div className="space-y-2 text-muted-foreground">
                    <p>
                      <strong>Location-focused:</strong> "Barbershop in
                      Bridgeland | The Belmont (Calgary)"
                    </p>
                    <p>
                      <strong>Service-focused:</strong> "Men's Haircuts & Beard
                      Trims | Belmont Barbershop"
                    </p>
                    <p>
                      <strong>Benefit-focused:</strong> "Professional Cuts &
                      Luxury Grooming in Calgary"
                    </p>
                    <p>
                      <strong>Call-to-action:</strong> "Book Your Haircut Online
                      | The Belmont Barbershop"
                    </p>
                    <p>
                      <strong>Trust-focused:</strong> "Award-Winning Barbershop
                      in Bridgeland Since 2019"
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="board" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Planned Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold">
                  Planned ({getExperimentsByStatus("planned").length})
                </h3>
              </div>
              {getExperimentsByStatus("planned").map((exp) => (
                <Card
                  key={exp.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle
                        className="text-sm font-medium truncate"
                        title={exp.page}
                      >
                        {exp.page
                          .replace("https://thebelmontbarber.ca", "")
                          .replace("/", "") || "Home"}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveExperiment(exp.id, "shipped")}
                        className="h-6 w-6 p-0"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Title A
                        </Label>
                        <p className="text-sm truncate" title={exp.titleA}>
                          {exp.titleA}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Ship Date
                        </Label>
                        <p className="text-sm">{exp.shipDate}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Shipped Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold">
                  Shipped ({getExperimentsByStatus("shipped").length})
                </h3>
              </div>
              {getExperimentsByStatus("shipped").map((exp) => (
                <Card
                  key={exp.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle
                        className="text-sm font-medium truncate"
                        title={exp.page}
                      >
                        {exp.page
                          .replace("https://thebelmontbarber.ca", "")
                          .replace("/", "") || "Home"}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveExperiment(exp.id, "review")}
                        className="h-6 w-6 p-0"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Ship Date
                        </Label>
                        <p className="text-sm">{exp.shipDate}</p>
                      </div>
                      {exp.deltaCTR && (
                        <Badge
                          variant={exp.deltaCTR > 0 ? "default" : "secondary"}
                        >
                          {exp.deltaCTR > 0 ? "+" : ""}
                          {exp.deltaCTR}% CTR
                        </Badge>
                      )}
                      <Input
                        placeholder="CTR delta (%)"
                        type="number"
                        step="0.1"
                        value={exp.deltaCTR || ""}
                        onChange={(e) =>
                          updateExperiment(exp.id, {
                            deltaCTR: parseFloat(e.target.value) || undefined,
                          })
                        }
                        className="text-sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Review Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h3 className="font-semibold">
                  Review ({getExperimentsByStatus("review").length})
                </h3>
              </div>
              {getExperimentsByStatus("review").map((exp) => (
                <Card
                  key={exp.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-2">
                    <CardTitle
                      className="text-sm font-medium truncate"
                      title={exp.page}
                    >
                      {exp.page
                        .replace("https://thebelmontbarber.ca", "")
                        .replace("/", "") || "Home"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Review Date
                        </Label>
                        <p className="text-sm">{exp.reviewDate}</p>
                      </div>
                      {exp.deltaCTR && (
                        <Badge
                          variant={exp.deltaCTR > 0 ? "default" : "destructive"}
                        >
                          Winner: {exp.deltaCTR > 0 ? "+" : ""}
                          {exp.deltaCTR}% CTR
                        </Badge>
                      )}
                      <Textarea
                        placeholder="Experiment notes..."
                        value={exp.notes}
                        onChange={(e) =>
                          updateExperiment(exp.id, { notes: e.target.value })
                        }
                        className="text-sm min-h-[60px]"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add New Experiment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="page">Page URL</Label>
                <Input
                  id="page"
                  placeholder="https://thebelmontbarber.ca/page"
                  value={newPage}
                  onChange={(e) => setNewPage(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="titleA">Title A</Label>
                  <Textarea
                    id="titleA"
                    placeholder="Primary title variation"
                    value={newTitleA}
                    onChange={(e) => setNewTitleA(e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="titleB">Title B</Label>
                  <Textarea
                    id="titleB"
                    placeholder="Secondary title variation"
                    value={newTitleB}
                    onChange={(e) => setNewTitleB(e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="titleC">Title C</Label>
                  <Textarea
                    id="titleC"
                    placeholder="Tertiary title variation"
                    value={newTitleC}
                    onChange={(e) => setNewTitleC(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="metaA">Meta A</Label>
                  <Textarea
                    id="metaA"
                    placeholder="Primary meta description"
                    value={newMetaA}
                    onChange={(e) => setNewMetaA(e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="metaB">Meta B</Label>
                  <Textarea
                    id="metaB"
                    placeholder="Secondary meta description"
                    value={newMetaB}
                    onChange={(e) => setNewMetaB(e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="metaC">Meta C</Label>
                  <Textarea
                    id="metaC"
                    placeholder="Tertiary meta description"
                    value={newMetaC}
                    onChange={(e) => setNewMetaC(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              <Button
                onClick={addExperiment}
                disabled={!newPage.trim() || !newTitleA.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Experiment
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
