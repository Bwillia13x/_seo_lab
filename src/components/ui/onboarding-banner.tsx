"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getOnboardingStatus } from "@/lib/analytics";
import { AlertTriangle, CheckCircle } from "lucide-react";

export function OnboardingBanner() {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState({
    placeIdSet: false,
    bookingSet: false,
    phoneSet: false,
    addressSet: false,
    complete: false,
  });

  useEffect(() => {
    try {
      setStatus(getOnboardingStatus());
      setReady(true);
    } catch {
      setReady(true);
    }
  }, []);

  if (!ready || status.complete) return null;

  const items = [
    { ok: status.placeIdSet, label: "Google Place ID" },
    { ok: status.bookingSet, label: "Booking URL" },
    { ok: status.phoneSet, label: "Phone" },
    { ok: status.addressSet, label: "Address" },
  ];

  return (
    <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Finish Setup for Best Results
        </CardTitle>
        <CardDescription>
          Set your review link and confirm booking/contact info. Takes ~2 minutes.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3 text-sm">
        <div className="flex flex-wrap gap-3">
          {items.map((i) => (
            <span key={i.label} className="inline-flex items-center gap-1">
              {i.ok ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              )}
              {i.label}
            </span>
          ))}
        </div>
        <Button asChild size="sm">
          <Link href="/apps/onboarding">Open Onboarding</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
