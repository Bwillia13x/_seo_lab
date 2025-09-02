"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        title="Title/Meta Multivariate Planner"
        subtitle="Manage A/B/C title and meta description experiments with CTR tracking."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadSampleExperiments}>
              <Upload className="h-4 w-4 mr-2" />
              Load Sample Experiments
            </Button>
            <Button variant="outline" onClick={exportBacklog}>
              <Download className="h-4 w-4 mr-2" />
              Export Backlog
            </Button>
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

      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board">Kanban Board</TabsTrigger>
          <TabsTrigger value="add">Add Experiment</TabsTrigger>
        </TabsList>

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
