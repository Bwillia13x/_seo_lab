"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import {
  Upload,
  Shield,
  AlertTriangle,
  TrendingDown,
  Calendar,
} from "lucide-react";

export default function NoShowShield() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="No-Show Risk Shield"
        subtitle="Predict and prevent no-show appointments using historical data patterns."
        actions={
          <Button variant="outline" onClick={() => setLoaded(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Load Visit Data
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Risk Level"
          value={loaded ? "High" : "—"}
          hint="Current assessment"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <KPICard
          label="Appointments"
          value={loaded ? "1,247" : "—"}
          hint="Total tracked"
          icon={<Calendar className="h-4 w-4" />}
        />
        <KPICard
          label="No-Show Rate"
          value={loaded ? "12%" : "—"}
          hint="Historical average"
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <KPICard
          label="Protection"
          value={loaded ? "Active" : "Inactive"}
          hint="Risk prevention"
          icon={<Shield className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}
