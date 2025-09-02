"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import { Upload, Plus } from "lucide-react";

export default function AddOnRecommender() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add-On Recommender"
        subtitle="Recommend service add-ons based on customer purchase patterns."
        actions={
          <Button variant="outline" onClick={() => setLoaded(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Load Sales Data
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Sales"
          value={loaded ? "2,847" : "—"}
          hint="Total transactions"
        />
        <KPICard label="Add-Ons" value={loaded ? "8" : "—"} hint="Available" />
        <KPICard
          label="Top Pick"
          value={loaded ? "Beard Trim" : "—"}
          hint="Most recommended"
        />
        <KPICard
          label="Status"
          value={loaded ? "Ready" : "Load Data"}
          hint="System status"
        />
      </div>

      {loaded && (
        <Card>
          <CardHeader>
            <CardTitle>Recommended Add-Ons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant="secondary">
                <Plus className="h-3 w-3 mr-1" />
                Beard Trim (85% confidence)
              </Badge>
              <Badge variant="secondary">
                <Plus className="h-3 w-3 mr-1" />
                Hot Towel Shave (72% confidence)
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
