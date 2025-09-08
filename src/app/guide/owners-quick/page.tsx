"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Printer } from "lucide-react";
import { BELMONT_CONSTANTS } from "@/lib/constants";

export default function OwnersQuickGuide() {
  function printPage() {
    if (typeof window !== "undefined") window.print();
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Belmont Owner’s Quick Guide</h1>
        <Button onClick={printPage} variant="outline" aria-label="Print Quick Guide">
          <Printer className="h-4 w-4 mr-2" /> Print
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What you’ll use today</CardTitle>
          <CardDescription>Simple tools. Quick wins.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-disc pl-5 space-y-1">
            <li>Campaign Link Builder (makes special tracking links)</li>
            <li>Review Request Links (easy review invites)</li>
            <li>Google Business Posts (quick posts for your profile)</li>
            <li>Dashboard (see what’s working)</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Three quick wins (today)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 border rounded">
            <div className="font-semibold">1) Create a tracking link</div>
            <div className="text-sm text-muted-foreground">Pick where you’ll share (Google, Instagram, email). Copy the link and share it.</div>
            <div className="mt-2">
              <Button asChild size="sm" variant="outline"><Link href="/apps/utm-dashboard">Open Campaign Link Builder<ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
            </div>
          </div>
          <div className="p-3 border rounded">
            <div className="font-semibold">2) Ask for two reviews</div>
            <div className="text-sm text-muted-foreground">Copy the message (email or text) and send to two recent customers.</div>
            <div className="mt-2">
              <Button asChild size="sm" variant="outline"><Link href="/apps/review-link">Open Review Request Links<ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
            </div>
          </div>
          <div className="p-3 border rounded">
            <div className="font-semibold">3) Post one update on Google</div>
            <div className="text-sm text-muted-foreground">Choose a service to feature (men’s cut, beard trim). Post it.</div>
            <div className="mt-2">
              <Button asChild size="sm" variant="outline"><Link href="/apps/gbp-composer">Open Google Business Posts<ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What to check on the Dashboard (weekly)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>Open <Link className="underline" href="/apps/dashboard">/apps/dashboard</Link></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Conversions by Source (30 days): where bookings come from (Google, Instagram, etc.)</li>
            <li>Conversions by Service (30 days): what people book most (men’s cut, beard trim, etc.)</li>
            <li>Contact & Location: phone, address, hours, and quick actions</li>
            <li>Reviews on Google: star rating and total reviews</li>
          </ul>
          <div className="text-sm mt-2">Tips: Double down on what works. If Instagram drives bookings, post there more. If beard trims are up, feature them.</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Helpful links (Belmont)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-disc pl-5 space-y-1">
            <li>Book Now: <a className="underline" href={BELMONT_CONSTANTS.BOOK_URL} target="_blank" rel="noopener noreferrer">Fresha Booking</a></li>
            <li>Website: <a className="underline" href={BELMONT_CONSTANTS.WEBSITE_URL} target="_blank" rel="noopener noreferrer">thebelmontbarber.ca</a></li>
            <li>Call: <a className="underline" href={BELMONT_CONSTANTS.PHONE_TEL}>{BELMONT_CONSTANTS.PHONE_DISPLAY}</a></li>
            <li>Directions: <a className="underline" href={BELMONT_CONSTANTS.MAP_URL} target="_blank" rel="noopener noreferrer">{BELMONT_CONSTANTS.ADDRESS_STR}</a></li>
            <li>Leave a Review: <a className="underline" href={BELMONT_CONSTANTS.REVIEW_GOOGLE_URL} target="_blank" rel="noopener noreferrer">Google review link</a></li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>If something looks confusing</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>It’s okay. This system is designed to be simple.</p>
          <p>You can’t break anything. If you do, we’ll fix it.</p>
          <p>Need help? Email <a className="underline" href="mailto:info@thebelmontbarber.ca">info@thebelmontbarber.ca</a> or call <a className="underline" href={BELMONT_CONSTANTS.PHONE_TEL}>{BELMONT_CONSTANTS.PHONE_DISPLAY}</a>.</p>
        </CardContent>
      </Card>
    </div>
  );
}
