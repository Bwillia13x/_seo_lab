import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export default function TrialGuidePage() {
  return (
    <div className="p-5 md:p-8 space-y-6">
      <PageHeader title="Client Trial Guide" subtitle="Quick links and a 10‑minute demo script." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trial URLs (Production)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <ul className="list-disc pl-5">
            <li><a className="underline" href="/">App</a></li>
            <li><a className="underline" href="/apps/dashboard">Dashboard</a></li>
            <li><a className="underline" href="/apps/gsc-ctr-miner">GSC CTR Miner</a></li>
            <li><a className="underline" href="/apps/utm-dashboard">UTM Link Builder</a></li>
            <li><a className="underline" href="/apps/utm-qr">QR Maker</a></li>
            <li><a className="underline" href="/apps/review-link">Review Links</a></li>
            <li><a className="underline" href="/apps/review-composer">Review Composer</a></li>
            <li><a className="underline" href="/apps/gbp-composer">GBP Composer</a></li>
            <li><a className="underline" href="/apps/rank-grid">Rank Grid</a></li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">10‑Minute Demo Script</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              <strong>Dashboard:</strong> Click “Load Demo Metrics” to populate KPI cards and charts.
              Export a quick metrics CSV.
            </li>
            <li>
              <strong>UTM Link Builder:</strong> Enter booking URL (https://thebelmontbarber.ca/book), choose a preset, and Build.
            </li>
            <li>
              <strong>QR Maker:</strong> Paste the UTM URL; pick a size; generate and download the QR PNG.
            </li>
            <li>
              <strong>Review Links:</strong> Verify the Google review link; copy Email/SMS templates; preview the printable QR card.
            </li>
            <li>
              <strong>GSC CTR Miner:</strong> Load Belmont sample data; run Analytics; open Opportunities and export recommendations.
            </li>
            <li>
              <strong>GBP Composer:</strong> Generate a Belmont‑branded post and copy.
            </li>
            <li>
              <strong>Rank Grid:</strong> Load demo data in Grid Input; show empty vs populated states.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

