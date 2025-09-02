"use client";
import React, { useMemo, useState } from "react";

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
  name: "The Belmont Barbershop",
  street: "915 General Ave NE",
  city: "Calgary",
  region: "AB",
  postal: "T2E 9E1",
  country: "CA",
  phone: "403-457-0420",
  email: "hello@thebelmontbarber.ca",
  website: "https://thebelmontbarber.ca",
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
  function payloadFor(site: Site) {
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
  }

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
  }, [biz]);
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
        title="Citation Builder & NAP Consistency Tracker"
        subtitle="Generate consistent payloads for top directories and track claim status."
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Targets" value={totalSites} />
        <KPICard label="Live" value={liveCount} />
        <KPICard label="Inconsistent" value={inconsistentCount} />
        <KPICard label="Tests Passed" value={`${passCount}/${tests.length}`} />
      </div>

      <Tabs defaultValue="inputs">
        <TabsList>
          <TabsTrigger value="inputs">Business Inputs</TabsTrigger>
          <TabsTrigger value="sites">Citations</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="consistency">Consistency</TabsTrigger>
          <TabsTrigger value="exports">Export/Import</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
          <TabsTrigger value="help">Help</TabsTrigger>
        </TabsList>

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
              <CardTitle className="text-base">Citation Targets</CardTitle>
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
        <TabsContent value="templates">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Descriptions & NAP</CardTitle>
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
              <CardTitle className="text-base">Quick Audit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                Use the table below to mark which fields are identical across
                your live profiles. Aim for a perfect match for{" "}
                <strong>Name</strong>, <strong>Phone</strong>, and{" "}
                <strong>Street</strong> — small differences in suite or
                punctuation are OK but avoid alternate names.
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
                Tip: If any field is unchecked for Google/Apple/Bing, fix those
                first; aggregators echo from them.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export/Import */}
        <TabsContent value="exports">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Exports</CardTitle>
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
                Import a CSV in the Citations tab to update status/profile URLs
                in bulk.
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
                Guidance
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Use the same exact <strong>Name</strong> and{" "}
                  <strong>Phone</strong> everywhere. Avoid abbreviations or
                  alternate spellings.
                </li>
                <li>
                  Descriptions: paste the <em>Long</em> version into
                  Google/Bing; use <em>Short</em> for Instagram bio and tight
                  fields.
                </li>
                <li>
                  Upload fresh photos monthly; prefer
                  exterior/interior/team/tools + recent work.
                </li>
                <li>
                  For the BIA directory, mention nearby anchors (Bridgeland LRT,
                  Edmonton Tr NE) and link your booking page.
                </li>
              </ul>
              <div className="text-xs text-muted-foreground">
                This tool stores data locally in memory while the canvas is
                open. Export JSON/CSV to save.
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
