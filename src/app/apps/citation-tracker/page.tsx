"use client";
import React, { useCallback, useMemo, useState } from "react";
import { BELMONT_CONSTANTS } from "@/lib/constants";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import {
  Download,
  Upload,
  Copy,
  Settings,
  RefreshCw,
  Info,
  Play,
} from "lucide-react";

import { saveBlob } from "@/lib/blob";
import { toCSV, fromCSV } from "@/lib/csv";
import { todayISO } from "@/lib/dates";

// ---------------- Types ----------------

type HoursRow = { days: string[]; opens: string; closes: string };

type Service = { name: string; priceFrom?: number };

type Biz = {
  name: string;
  street: string;
  city: string;
  region: string;
  postal: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  lat: number;
  lon: number;
  priceRange: "$" | "$$" | "$$$";
  hours: HoursRow[];
  services: Service[];
};

type Status = "todo" | "pending" | "live" | "inconsistent";

type Site = {
  key: string;
  name: string;
  portal?: string; // manage/claim URL
  search?: string; // public search URL
  profileUrl?: string; // final profile URL
  email?: string;
  username?: string;
  phoneVerify?: boolean;
  status: Status;
  lastChecked?: string;
  notes?: string;
  descLimit?: number; // recommended character limit
};

// ---------------- Defaults ----------------
const DEFAULT_BIZ: Biz = {
  name: BELMONT_CONSTANTS.BUSINESS_NAME,
  street: "915 General Ave NE",
  city: "Calgary",
  region: "AB",
  postal: "T2E 9E1",
  country: "CA",
  phone: BELMONT_CONSTANTS.PHONE_DISPLAY,
  email: "hello@thebelmontbarber.ca",
  website: BELMONT_CONSTANTS.WEBSITE_URL,
  lat: 51.05,
  lon: -114.05,
  priceRange: "$$",
  hours: [
    {
      days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      opens: "10:00",
      closes: "19:00",
    },
    { days: ["Sat", "Sun"], opens: "10:00", closes: "17:00" },
  ],
  services: [
    { name: "Men's Haircut", priceFrom: 40 },
    { name: "Skin Fade", priceFrom: 45 },
    { name: "Beard Trim", priceFrom: 20 },
    { name: "Hot Towel Shave", priceFrom: 35 },
    { name: "Kids Cut", priceFrom: 30 },
    { name: "Groomsmen Party Package", priceFrom: 150 },
  ],
};

const DEFAULT_SITES: Site[] = [
  {
    key: "google",
    name: "Google Business Profile",
    portal: "https://business.google.com/",
    search: "https://www.google.com/maps",
    status: "todo",
    descLimit: 750,
  },
  {
    key: "apple",
    name: "Apple Business Connect",
    portal: "https://businessconnect.apple.com/",
    search: "https://maps.apple.com",
    status: "todo",
    descLimit: 500,
  },
  {
    key: "bing",
    name: "Bing Places",
    portal: "https://www.bingplaces.com/",
    search: "https://www.bing.com/maps",
    status: "todo",
    descLimit: 750,
  },
  {
    key: "facebook",
    name: "Facebook Page",
    portal: "https://facebook.com/",
    search: "https://facebook.com/search/pages",
    status: "todo",
    descLimit: 255,
  },
  {
    key: "instagram",
    name: "Instagram",
    portal: "https://www.instagram.com/",
    search: "https://www.instagram.com/explore/",
    status: "todo",
    descLimit: 150,
  },
  {
    key: "yelp",
    name: "Yelp.ca",
    portal: "https://biz.yelp.ca/",
    search: "https://www.yelp.ca/",
    status: "todo",
    descLimit: 3000,
  },
  {
    key: "yellowpages",
    name: "YellowPages.ca",
    portal: "https://business.yellowpages.ca/",
    search: "https://www.yellowpages.ca/",
    status: "todo",
    descLimit: 750,
  },
  {
    key: "411",
    name: "411.ca",
    portal: "https://411.ca/",
    search: "https://411.ca/business",
    status: "todo",
    descLimit: 750,
  },
  {
    key: "cylex",
    name: "Cylex Canada",
    portal: "https://www.cylex-canada.ca/",
    search: "https://www.cylex-canada.ca/",
    status: "todo",
    descLimit: 1000,
  },
  {
    key: "foursquare",
    name: "Foursquare",
    portal: "https://foursquare.com/",
    search: "https://foursquare.com/explore",
    status: "todo",
    descLimit: 1000,
  },
  {
    key: "bbb",
    name: "BBB.org (optional)",
    portal: "https://www.bbb.org/",
    search: "https://www.bbb.org/ca",
    status: "todo",
    descLimit: 500,
  },
  {
    key: "local_bia",
    name: "Bridgeland‑Riverside BIA/Community Directory",
    portal: "https://www.bria.org/" as any,
    search: "https://www.visitbridgeland.com/" as any,
    status: "todo",
    descLimit: 500,
  },
];

// ---------------- Description Maker ---------------
function oneLineAddress(b: Biz) {
  return `${b.street}, ${b.city}, ${b.region} ${b.postal}, ${b.country}`;
}
function hoursInline(b: Biz) {
  return b.hours
    .map((h) => `${h.days.join("/")}: ${h.opens}–${h.closes}`)
    .join(" · ");
}
function servicesInline(b: Biz) {
  return b.services
    .map((s) => (s.priceFrom ? `${s.name} (${s.priceFrom}+)` : s.name))
    .join(", ");
}

function makeDesc(b: Biz, len: number) {
  const base = `${
    b.name
  } — barbershop in Bridgeland/Riverside, Calgary. Services: ${servicesInline(
    b
  )}. Book online: ${b.website}. ${oneLineAddress(b)}. Hours: ${hoursInline(
    b
  )}.`;
  if (base.length <= len) return base;
  const alt = `${b.name} — barbershop in Bridgeland/Riverside. ${servicesInline(
    b
  )}. Book: ${b.website}. ${oneLineAddress(b)}.`;
  if (alt.length <= len) return alt;
  const short = `${b.name} — barbershop in Bridgeland/Riverside. Book: ${b.website}.`;
  return short.slice(0, len);
}

function napBlock(b: Biz) {
  return `${b.name}\n${b.street}\n${b.city}, ${b.region} ${b.postal}\n${b.country}\n${b.phone}\n${b.website}`;
}

// ---------------- Main Component ---------------
function CitationNAPTracker() {
  const [biz, setBiz] = useState<Biz>(DEFAULT_BIZ);
  const [sites, setSites] = useState<Site[]>(DEFAULT_SITES);
  const [copied, setCopied] = useState<string>("");
  const [compareText, setCompareText] = useState<string>("");

  const canonicalNAP = useMemo(() => normalizeNAP(napBlock(biz)), [biz]);
  const compareNAP = useMemo(() => normalizeNAP(compareText), [compareText]);
  const napMatch = useMemo(
    () => (compareText.trim() ? canonicalNAP === compareNAP : null),
    [canonicalNAP, compareNAP, compareText]
  );

  function normalizeNAP(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function copy(text: string, which: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(""), 1200);
    });
  }

  function updateSite(i: number, patch: Partial<Site>) {
    setSites((prev) =>
      prev.map((s, idx) =>
        idx === i
          ? {
              ...s,
              ...patch,
              lastChecked: patch.status ? todayISO() : s.lastChecked,
            }
          : s
      )
    );
  }

  // Payload preview for a single site
  const payloadFor = useCallback((site: Site) => {
    const limit = site.descLimit ?? 750;
    const d = makeDesc(biz, limit);
    return [
      `Name: ${biz.name}`,
      `Category: Barbershop`,
      `Phone: ${biz.phone}`,
      `Website: ${biz.website}`,
      `Address: ${oneLineAddress(biz)}`,
      `Hours: ${hoursInline(biz)}`,
      `Description (${d.length}/${limit}):`,
      d,
      `Services: ${servicesInline(biz)}`,
    ].join("\n");
  }, [biz]);

  function exportCSV() {
    const rows = sites.map((s) => ({
      key: s.key,
      name: s.name,
      status: s.status,
      lastChecked: s.lastChecked || "",
      profileUrl: s.profileUrl || "",
      email: s.email || "",
      username: s.username || "",
      notes: s.notes || "",
    }));
    const csv = toCSV(rows);
    saveBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      `belmont-citations-${todayISO()}.csv`
    );
  }

  function exportJSON() {
    saveBlob(
      new Blob([JSON.stringify({ biz, sites }, null, 2)], {
        type: "application/json",
      }),
      `belmont-citations-${todayISO()}.json`
    );
  }

  function exportAllPayloads() {
    const parts = sites
      .map((s) => `--- ${s.name} ---\n${payloadFor(s)}`)
      .join("\n\n");
    saveBlob(
      new Blob([parts], { type: "text/plain;charset=utf-8;" }),
      `belmont-citation-payloads-${todayISO()}.txt`
    );
  }

  function importCSVFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      const rows = fromCSV(String(ev.target?.result || ""));
      setSites((prev) =>
        prev.map((s) => {
          const r = rows.find((x) => x.key === s.key);
          if (!r) return s;
          return {
            ...s,
            status: (r.status as Status) || s.status,
            lastChecked: r.lastChecked || s.lastChecked,
            profileUrl: r.profileUrl || s.profileUrl,
            email: r.email || s.email,
            username: r.username || s.username,
            notes: r.notes || s.notes,
          };
        })
      );
    };
    r.readAsText(f);
  }

  // Self‑tests
  type Test = { name: string; passed: boolean; details?: string };
  const tests: Test[] = useMemo(() => {
    const t: Test[] = [];
    const d160 = makeDesc(biz, 160);
    t.push({
      name: "Desc 160 ≤ 160",
      passed: d160.length <= 160,
      details: String(d160.length),
    });
    const d750 = makeDesc(biz, 750);
    t.push({
      name: "Desc 750 ≤ 750",
      passed: d750.length <= 750,
      details: String(d750.length),
    });
    const payloadGoogle = payloadFor({ ...DEFAULT_SITES[0], status: "todo" });
    t.push({
      name: "Payload includes address",
      passed: /Address:/.test(payloadGoogle),
    });
    const csv = toCSV([{ a: 1, b: "x" }]);
    t.push({ name: "CSV roundtrip header", passed: /^a,b/.test(csv) });
    return t;
  }, [biz, payloadFor]);
  const passCount = tests.filter((x) => x.passed).length;
  const totalSites = sites.length;
  const liveCount = useMemo(
    () => sites.filter((s) => s.status === "live").length,
    [sites]
  );
  const inconsistentCount = useMemo(
    () => sites.filter((s) => s.status === "inconsistent").length,
    [sites]
  );

  return (
    <div className="p-5 md:p-8 space-y-6">
      <PageHeader
        title="Business Listings Check"
        subtitle="Track and fix business listings across major sites."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              setBiz(DEFAULT_BIZ);
              setSites(DEFAULT_SITES);
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Do this next</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <ol className="list-decimal pl-5 space-y-1">
            <li>
              Open the Citations tab and mark your Google Business Profile as
              "Live".
            </li>
            <li>
              Click the Portal link for each site and check if you already have
              a listing.
            </li>
            <li>
              If you have a listing, copy the Profile URL and mark it as "Live".
            </li>
            <li>
              If you don't have a listing, mark it as "To Do" and plan to create
              it.
            </li>
            <li>
              Use the Templates tab to get ready-made descriptions for each
              site.
            </li>
            <li>
              Check the Consistency tab to make sure all your listings match
              exactly.
            </li>
          </ol>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Targets" value={totalSites} />
        <KPICard label="Live" value={liveCount} />
        <KPICard label="Inconsistent" value={inconsistentCount} />
        <KPICard label="Tests Passed" value={`${passCount}/${tests.length}`} />
      </div>

      <Tabs defaultValue="howto">
        <TabsList>
          <TabsTrigger value="howto">How To</TabsTrigger>
          <TabsTrigger value="inputs">Your Business Info</TabsTrigger>
          <TabsTrigger value="sites">Your Listings</TabsTrigger>
          <TabsTrigger value="consistency">Check for Mistakes</TabsTrigger>
          <span className="advanced-only contents">
            <TabsTrigger value="templates">Ready-Made Content</TabsTrigger>
            <TabsTrigger value="exports">Save/Load Progress</TabsTrigger>
            <TabsTrigger value="tests">Tests</TabsTrigger>
          </span>
        </TabsList>

        {/* How To */}
        <TabsContent value="howto">
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  What Are Business Listings & Why Do They Matter?
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p>
                  <strong>Business listings</strong> are your shop's information
                  that appears on websites like Google Maps, Yelp, Yellow Pages,
                  and Facebook. They're like having your business card posted in
                  hundreds of online phone books.
                </p>
                <p>
                  <strong>Why they matter:</strong> When customers search for
                  "barber shop near me" or "haircut Calgary", these listings
                  help them find and contact you. Google especially uses this
                  information to decide where your business appears in search
                  results.
                </p>
                <p>
                  <strong>The goal:</strong> Have your exact same business
                  information (name, address, phone) on as many relevant
                  websites as possible. This builds trust with search engines
                  and helps more customers find you.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  How to Use This Tool - Step by Step
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-4">
                <div>
                  <h4 className="font-semibold text-base mb-2">
                    1. First Time Setup
                  </h4>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      Go to the "Your Business Info" tab and enter your shop's
                      information (name, address, phone, website, hours,
                      services)
                    </li>
                    <li>
                      Make sure everything is exactly right - this will be your
                      "master copy" that all listings should match
                    </li>
                    <li>
                      The tool will automatically create descriptions and
                      contact information for each website
                    </li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold text-base mb-2">
                    2. Check Your Existing Listings
                  </h4>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      Go to the "Your Listings" tab to see the list of important
                      websites
                    </li>
                    <li>
                      For each website, click the "Portal" or "Search" link to
                      check if you already have a listing
                    </li>
                    <li>
                      If you find your listing:
                      <ul className="list-disc pl-5 mt-1">
                        <li>
                          Copy the web address (URL) of your listing and paste
                          it in the "Profile URL" box
                        </li>
                        <li>Change the status to "Live"</li>
                        <li>
                          Add any login information (username/email) if you
                          remember it
                        </li>
                      </ul>
                    </li>
                    <li>
                      If you don't have a listing yet:
                      <ul className="list-disc pl-5 mt-1">
                        <li>Leave the status as "To Do"</li>
                        <li>Add a note about when you plan to create it</li>
                      </ul>
                    </li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold text-base mb-2">
                    3. Get Ready-Made Content
                  </h4>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      Go to the "Ready-Made Content" tab to see automatically
                      created descriptions
                    </li>
                    <li>
                      The tool creates three versions: Short (for
                      Instagram/Twitter), Medium, and Long (for Google/Yelp)
                    </li>
                    <li>
                      Click "Copy" buttons to copy the descriptions you need
                    </li>
                    <li>
                      The "NAP Block" shows your name, address, and phone in a
                      standard format
                    </li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold text-base mb-2">
                    4. Check for Mistakes
                  </h4>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      Go to the "Check for Mistakes" tab to compare your
                      listings
                    </li>
                    <li>
                      Check the boxes for each piece of information that matches
                      exactly
                    </li>
                    <li>
                      Focus on getting your name, phone, and address exactly the
                      same everywhere
                    </li>
                    <li>
                      If something doesn't match, make a note to fix it on that
                      website
                    </li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold text-base mb-2">
                    5. Create New Listings
                  </h4>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      Start with the most important websites first: Google,
                      Apple Maps, Bing, Facebook
                    </li>
                    <li>Click the "Portal" link to go to their signup page</li>
                    <li>
                      Use the descriptions and information from the "Ready-Made
                      Content" tab
                    </li>
                    <li>
                      Copy your business information exactly as it appears in
                      the "Your Business Info" tab
                    </li>
                    <li>Upload good photos of your shop, team, and work</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold text-base mb-2">
                    6. Keep Everything Updated
                  </h4>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      Check back every 3-6 months to make sure your information
                      is still correct
                    </li>
                    <li>
                      Update hours for holidays, add new services, refresh
                      photos
                    </li>
                    <li>
                      Export your progress using the "Save/Load Progress" tab to
                      keep track of what you've done
                    </li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  What the Status Labels Mean
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">📝 To Do</h4>
                    <p>
                      You haven't created a listing on this website yet. This is
                      where you should start.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">⏳ Pending</h4>
                    <p>
                      You've started the process of creating a listing but it's
                      not live yet.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">✅ Live</h4>
                    <p>
                      Your listing is published and customers can see it on this
                      website.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">⚠️ Inconsistent</h4>
                    <p>
                      You have a listing but the information doesn't match your
                      master copy (different name, phone, or address).
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Tips for Success</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Use the exact same words everywhere:</strong> Don't
                    use "The Belmont Barbershop" in one place and "Belmont
                    Barber Shop" in another. Pick one version and stick with it.
                  </li>
                  <li>
                    <strong>Include your neighborhood:</strong> Add "Bridgeland"
                    or "Riverside" to your descriptions so local customers can
                    find you more easily.
                  </li>
                  <li>
                    <strong>Add good photos:</strong> Include pictures of your
                    shop exterior, interior, team members, equipment, and recent
                    haircut examples. Fresh photos make your listings more
                    trustworthy.
                  </li>
                  <li>
                    <strong>Link to your booking page:</strong> Most websites
                    let you add a link to your online booking system. Use this
                    everywhere to make it easy for customers to book
                    appointments.
                  </li>
                  <li>
                    <strong>Respond to reviews:</strong> Many listing sites let
                    customers leave reviews. Always respond politely, even to
                    negative reviews - it shows you care about your customers.
                  </li>
                  <li>
                    <strong>Start with Google:</strong> Google Business Profile
                    is the most important listing. Make sure this one is perfect
                    before moving to others.
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Saving Your Work</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p>
                  This tool keeps your information in your browser while you're
                  using it. To save your progress:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Go to the "Save/Load Progress" tab</li>
                  <li>
                    Click "Export Status CSV" to save just the website statuses
                  </li>
                  <li>
                    Click "Export JSON" to save everything (including your
                    business information)
                  </li>
                  <li>Use "Import CSV" to load your saved work later</li>
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  <strong>Tip:</strong> Export your work every few weeks so you
                  don't lose track of what you've completed.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Inputs */}
        <TabsContent value="inputs">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Business Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Label>Business name</Label>
                  <Input
                    value={biz.name}
                    onChange={(e) =>
                      setBiz((b) => ({ ...b, name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="priceRange">Price range</Label>
                  <select
                    id="priceRange"
                    title="Select price range"
                    value={biz.priceRange}
                    onChange={(e) =>
                      setBiz((b) => ({
                        ...b,
                        priceRange: e.target.value as any,
                      }))
                    }
                    className="w-full h-9 border rounded-md px-2"
                  >
                    <option value="$">$</option>
                    <option value="$$">$$</option>
                    <option value="$$$">$$$</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label>Website</Label>
                  <Input
                    value={biz.website}
                    onChange={(e) =>
                      setBiz((b) => ({ ...b, website: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={biz.phone}
                    onChange={(e) =>
                      setBiz((b) => ({ ...b, phone: e.target.value }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Email</Label>
                  <Input
                    value={biz.email}
                    onChange={(e) =>
                      setBiz((b) => ({ ...b, email: e.target.value }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Street</Label>
                  <Input
                    value={biz.street}
                    onChange={(e) =>
                      setBiz((b) => ({ ...b, street: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    value={biz.city}
                    onChange={(e) =>
                      setBiz((b) => ({ ...b, city: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Region</Label>
                  <Input
                    value={biz.region}
                    onChange={(e) =>
                      setBiz((b) => ({ ...b, region: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Postal</Label>
                  <Input
                    value={biz.postal}
                    onChange={(e) =>
                      setBiz((b) => ({ ...b, postal: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input
                    value={biz.country}
                    onChange={(e) =>
                      setBiz((b) => ({ ...b, country: e.target.value }))
                    }
                  />
                </div>
              </div>

              <Separator />

              <div>
                <div className="font-medium mb-2">Hours</div>
                <div className="grid md:grid-cols-3 gap-2">
                  {biz.hours.map((h, i) => (
                    <div key={i} className="p-2 border rounded-md">
                      <div className="text-xs mb-1">{h.days.join("/")}</div>
                      <div className="flex gap-2 items-center">
                        <Input
                          value={h.opens}
                          onChange={(e) =>
                            setBiz((b) => {
                              const x = [...b.hours];
                              x[i] = { ...x[i], opens: e.target.value };
                              return { ...b, hours: x };
                            })
                          }
                        />
                        <span>–</span>
                        <Input
                          value={h.closes}
                          onChange={(e) =>
                            setBiz((b) => {
                              const x = [...b.hours];
                              x[i] = { ...x[i], closes: e.target.value };
                              return { ...b, hours: x };
                            })
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <div className="font-medium mb-2">Services</div>
                <div className="grid md:grid-cols-3 gap-2">
                  {biz.services.map((s, i) => (
                    <div key={i} className="p-2 border rounded-md">
                      <div className="text-xs text-muted-foreground">
                        Service {i + 1}
                      </div>
                      <Input
                        value={s.name}
                        onChange={(e) =>
                          setBiz((b) => {
                            const x = [...b.services];
                            x[i] = { ...x[i], name: e.target.value };
                            return { ...b, services: x };
                          })
                        }
                      />
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div>
                          <Label className="text-xs">From $</Label>
                          <Input
                            type="number"
                            value={s.priceFrom ?? ""}
                            onChange={(e) =>
                              setBiz((b) => {
                                const x = [...b.services];
                                x[i] = {
                                  ...x[i],
                                  priceFrom:
                                    e.target.value === ""
                                      ? undefined
                                      : Number(e.target.value),
                                };
                                return { ...b, services: x };
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sites */}
        <TabsContent value="sites">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Websites to Check</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Site</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Profile URL</TableHead>
                      <TableHead>Login / Email</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sites.map((s, i) => (
                      <TableRow key={s.key}>
                        <TableCell>
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-muted-foreground flex gap-2 flex-wrap">
                            {s.portal && (
                              <a
                                className="underline"
                                href={s.portal}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Portal
                              </a>
                            )}
                            {s.search && (
                              <a
                                className="underline"
                                href={s.search}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Search
                              </a>
                            )}
                            {s.profileUrl && (
                              <a
                                className="underline"
                                href={s.profileUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Profile
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Label htmlFor={`status-${i}`}>Status</Label>
                          <select
                            id={`status-${i}`}
                            title="Select status"
                            className="h-9 border rounded-md px-2"
                            value={s.status}
                            onChange={(e) =>
                              updateSite(i, {
                                status: e.target.value as Status,
                              })
                            }
                          >
                            <option value="todo">To Do</option>
                            <option value="pending">Pending</option>
                            <option value="live">Live</option>
                            <option value="inconsistent">Inconsistent</option>
                          </select>
                          <div className="text-xs text-muted-foreground">
                            {s.lastChecked ? `Checked ${s.lastChecked}` : "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={s.profileUrl || ""}
                            onChange={(e) =>
                              updateSite(i, { profileUrl: e.target.value })
                            }
                            placeholder="https://..."
                          />
                        </TableCell>
                        <TableCell>
                          <div className="grid grid-cols-1 gap-1">
                            <Input
                              value={s.username || ""}
                              onChange={(e) =>
                                updateSite(i, { username: e.target.value })
                              }
                              placeholder="username"
                            />
                            <Input
                              value={s.email || ""}
                              onChange={(e) =>
                                updateSite(i, { email: e.target.value })
                              }
                              placeholder="email"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Textarea
                            value={s.notes || ""}
                            onChange={(e) =>
                              updateSite(i, { notes: e.target.value })
                            }
                            className="h-16"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                copy(payloadFor(s), `payload-${s.key}`)
                              }
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              Copy Payload
                            </Button>
                            {copied === `payload-${s.key}` && (
                              <Badge>Copied</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={exportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={exportJSON}>
                  <Download className="h-4 w-4 mr-2" />
                  Export JSON
                </Button>
                <Button onClick={exportAllPayloads}>
                  <Download className="h-4 w-4 mr-2" />
                  Export All Payloads (.txt)
                </Button>
                <input
                  type="file"
                  id="imp"
                  accept=".csv"
                  className="hidden"
                  onChange={importCSVFile}
                />
                <label htmlFor="imp">
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Import CSV
                  </Button>
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="advanced-only">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Ready-Made Descriptions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <Label>Short (≤160 chars)</Label>
                  <Textarea
                    value={makeDesc(biz, 160)}
                    readOnly
                    className="h-28"
                  />
                  <div className="text-xs text-muted-foreground">
                    {makeDesc(biz, 160).length}/160
                  </div>
                </div>
                <div>
                  <Label>Medium (≤350 chars)</Label>
                  <Textarea
                    value={makeDesc(biz, 350)}
                    readOnly
                    className="h-28"
                  />
                  <div className="text-xs text-muted-foreground">
                    {makeDesc(biz, 350).length}/350
                  </div>
                </div>
                <div>
                  <Label>Long (≤750 chars)</Label>
                  <Textarea
                    value={makeDesc(biz, 750)}
                    readOnly
                    className="h-28"
                  />
                  <div className="text-xs text-muted-foreground">
                    {makeDesc(biz, 750).length}/750
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>NAP Block (canonical)</Label>
                  <Textarea value={napBlock(biz)} readOnly className="h-40" />
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      onClick={() => copy(napBlock(biz), "nap")}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy NAP
                    </Button>
                    {copied === "nap" && <Badge>Copied</Badge>}
                  </div>
                </div>
                <div>
                  <Label>Paste Existing Listing Text (to compare)</Label>
                  <Textarea
                    value={compareText}
                    onChange={(e) => setCompareText(e.target.value)}
                    className="h-40"
                    placeholder="Paste an existing listing's name, address, phone, website..."
                  />
                  <div className="text-sm mt-2">
                    {napMatch === null ? (
                      <span className="text-muted-foreground">
                        Paste to check consistency…
                      </span>
                    ) : napMatch ? (
                      <span className="text-green-700">
                        ✅ Consistent with canonical NAP
                      </span>
                    ) : (
                      <span className="text-red-700">
                        ⚠️ Mismatch — update the listing to match your canonical
                        NAP
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Consistency */}
        <TabsContent value="consistency">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Check for Mistakes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                Check the boxes below to mark which pieces of your business
                information match exactly across all your live listings. Focus
                on getting your <strong>business name</strong>,
                <strong>phone number</strong>, and{" "}
                <strong>street address</strong> exactly the same everywhere.
                Small differences in punctuation are OK, but avoid using
                different versions of your business name.
              </p>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field</TableHead>
                      {sites.map((s) => (
                        <TableHead key={s.key}>{s.key}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      "name",
                      "phone",
                      "street",
                      "city",
                      "region",
                      "postal",
                      "website",
                    ].map((field) => (
                      <TableRow key={field}>
                        <TableCell className="font-medium">
                          {field.toUpperCase()}
                        </TableCell>
                        {sites.map((s, i) => (
                          <TableCell key={s.key}>
                            <div className="flex items-center gap-2 text-xs">
                              <Checkbox
                                checked={(s as any)[`f_${field}`] === true}
                                onCheckedChange={(v) =>
                                  updateSite(i, {
                                    [`f_${field}`]: Boolean(v),
                                  } as any)
                                }
                              />
                              <span className="text-muted-foreground">
                                match
                              </span>
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="text-xs text-muted-foreground">
                <strong>Tip:</strong> If any information doesn't match on
                Google, Apple Maps, or Bing, fix those first. Other websites
                often copy information from these major sites, so getting them
                right helps everything else stay consistent.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export/Import */}
        <TabsContent value="exports" className="advanced-only">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Save Your Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button onClick={exportAllPayloads}>
                  <Download className="h-4 w-4 mr-2" />
                  Export All Payloads (.txt)
                </Button>
                <Button variant="outline" onClick={exportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Status CSV
                </Button>
                <Button variant="outline" onClick={exportJSON}>
                  <Download className="h-4 w-4 mr-2" />
                  Export JSON (all)
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                You can load previously saved work by importing a CSV file in
                the "Your Listings" tab. This lets you update many websites at
                once instead of one by one.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tests */}
        <TabsContent value="tests" className="advanced-only">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Play className="h-4 w-4" />
                System Check
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
      </Tabs>
    </div>
  );
}

export default function Page() {
  return <CitationNAPTracker />;
}
