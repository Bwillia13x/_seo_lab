"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import {
  Copy,
  Check,
  Download,
  Info,
  Settings,
  Wand2,
  Plus,
  Trash2,
  Play,
} from "lucide-react";
import { saveBlob } from "@/lib/blob";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";

// ---------------- Utilities ----------------
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function slugify(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function ellipsize(s: string, max: number) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

function isHttps(u: string) {
  try {
    const x = new URL(u);
    return x.protocol === "https:" || x.protocol === "http:";
  } catch {
    return false;
  }
}

function fmtPrice(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return undefined;
  return `$${n.toFixed(0)}+`;
}

// ---------------- Types ----------------
type HoursRow = { days: string[]; opens: string; closes: string };

type Service = {
  name: string;
  priceFrom?: number;
  durationMin?: number;
  description?: string;
};

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
  googleMaps?: string;
  instagram?: string;
  facebook?: string;
  appleMaps?: string;
  hours: HoursRow[];
  services: Service[];
};

// ---------------- Defaults ----------------
const DEFAULT_BIZ: Biz = {
  name: "The Belmont Barbershop",
  street: "[Street]",
  city: "Calgary",
  region: "AB",
  postal: "[T2x xXx]",
  country: "CA",
  phone: "403-000-0000",
  email: "hello@thebelmontbarber.ca",
  website: "https://thebelmontbarber.ca",
  lat: 51.05,
  lon: -114.05,
  priceRange: "$$",
  googleMaps: "https://maps.google.com/?q=the+belmont+barbershop",
  instagram: "https://www.instagram.com/thebelmontbarber",
  facebook: "https://www.facebook.com/thebelmontbarber",
  appleMaps: "https://apple.co/your-place",
  hours: [
    {
      days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      opens: "10:00",
      closes: "19:00",
    },
    { days: ["Sat", "Sun"], opens: "10:00", closes: "17:00" },
  ],
  services: [
    {
      name: "Men's Haircut",
      priceFrom: 40,
      durationMin: 30,
      description: "Classic cut with consultation and style.",
    },
    {
      name: "Skin Fade",
      priceFrom: 45,
      durationMin: 45,
      description: "Sharp fades with clean transitions and finish.",
    },
    {
      name: "Beard Trim",
      priceFrom: 20,
      durationMin: 15,
      description: "Beard shape, line‑up, hot towel finish.",
    },
    {
      name: "Hot Towel Shave",
      priceFrom: 35,
      durationMin: 30,
      description: "Traditional straight‑razor shave.",
    },
    {
      name: "Kids Cut",
      priceFrom: 30,
      durationMin: 30,
      description: "Patient, age‑appropriate cut and style.",
    },
  ],
};

// ---------------- Generators ----------------
function makeTitle(page: "home" | "service" | "area", biz: Biz, svc?: Service) {
  if (page === "home")
    return "Belmont Barbershop — Classic Cuts & Fades in Bridgeland/Riverside, Calgary";
  if (page === "area")
    return "Barbershop in Bridgeland/Riverside — The Belmont (Calgary)";
  if (page === "service" && svc)
    return `${svc.name} in Bridgeland — Belmont Barbershop (Calgary)`;
  return `${biz.name} — Calgary`;
}

function makeMeta(page: "home" | "service" | "area", biz: Biz, svc?: Service) {
  if (page === "home")
    return "Book a precise cut, skin fade, beard trim, or hot towel shave at Belmont in Bridgeland/Riverside. Easy online booking. Walk‑ins welcome.";
  if (page === "area")
    return "Your neighborhood barbershop in Bridgeland/Riverside, Calgary. Prices up front, friendly barbers, easy online booking.";
  if (page === "service" && svc)
    return `Sharp ${svc.name.toLowerCase()}s by seasoned barbers in Bridgeland/Riverside. View prices and book online in minutes.`;
  return `${biz.name} in Calgary — book online.`;
}

function makeOutline(
  page: "home" | "service" | "area",
  biz: Biz,
  svc?: Service
) {
  const bullets = (arr: string[]) => arr.map((x) => `- ${x}`).join("\n");
  if (page === "home") {
    return `H1: ${biz.name} — Barbershop in Bridgeland/Riverside\n\nH2: Services\n${bullets(
      biz.services.map((s) => `${s.name} — ${fmtPrice(s.priceFrom) || ""}`)
    )}\n\nH2: Why Belmont\n- Experienced barbers\n- Fair pricing\n- Walk‑ins welcome\n\nH2: Find Us\n- ${biz.street}, ${biz.city}\n- Near Bridgeland LRT`;
  }
  if (page === "area") {
    return `H1: Barbershop in Bridgeland/Riverside (Calgary)\n\nH2: Book a Chair\n- Online booking link\n\nH2: Getting Here\n- Steps from Bridgeland LRT\n- Parking tips\n\nH2: Popular Services\n${bullets(
      biz.services.map((s) => s.name)
    )}`;
  }
  if (page === "service" && svc) {
    return `H1: ${svc.name} in Bridgeland (Calgary)\n\nH2: What to Expect\n- Consultation\n- Technique\n- Finish\n\nH2: Pricing & Timing\n- ${
      fmtPrice(svc.priceFrom) || "See booking"
    } · ~${svc.durationMin || 30} min\n\nH2: Book Now`;
  }
  return "";
}

function makeFAQs(page: "home" | "service" | "area", biz: Biz, svc?: Service) {
  const faqs: { q: string; a: string }[] = [];
  if (page === "home" || page === "area") {
    faqs.push({
      q: "Do you take walk‑ins?",
      a: "Yes — when chairs are free. Online booking shows live availability.",
    });
    faqs.push({
      q: "Where are you located?",
      a: `${biz.street}, ${biz.city}. A short walk from the Bridgeland LRT.`,
    });
    faqs.push({
      q: "What are your hours?",
      a: biz.hours
        .map((h) => `${h.days.join("/")}: ${h.opens}–${h.closes}`)
        .join(" · "),
    });
  }
  if (page === "service" && svc) {
    faqs.push({
      q: `How long does a ${svc.name.toLowerCase()} take?`,
      a: `About ${svc.durationMin || 30} minutes depending on hair density and style.`,
    });
    faqs.push({
      q: "Do you offer skin fades and beards together?",
      a: "Yes — book back‑to‑back (or a combo if available in Square).",
    });
    faqs.push({
      q: "Can I bring a photo?",
      a: "Please do — it helps us tailor the cut to your growth pattern.",
    });
  }
  return faqs;
}

function sameAsArray(biz: Biz) {
  return [biz.googleMaps, biz.instagram, biz.facebook, biz.appleMaps].filter(
    Boolean
  );
}

function businessSchema(biz: Biz) {
  const openingHours = biz.hours.map((h) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: h.days.map(
      (d) =>
        (
          ({
            Mon: "Monday",
            Tue: "Tuesday",
            Wed: "Wednesday",
            Thu: "Thursday",
            Fri: "Friday",
            Sat: "Saturday",
            Sun: "Sunday",
          }) as Record<string, string>
        )[d] || d
    ),
    opens: h.opens,
    closes: h.closes,
  }));
  const svcList = biz.services.map((s) => ({
    "@type": "Service",
    name: s.name,
  }));
  return {
    "@context": "https://schema.org",
    "@type": "Barbershop",
    name: biz.name,
    image: ["[https://.../exterior.jpg]", "[https://.../interior.jpg]"],
    url: biz.website,
    telephone: biz.phone,
    priceRange: biz.priceRange,
    address: {
      "@type": "PostalAddress",
      streetAddress: biz.street,
      addressLocality: biz.city,
      addressRegion: biz.region,
      postalCode: biz.postal,
      addressCountry: biz.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: biz.lat, longitude: biz.lon },
    openingHoursSpecification: openingHours,
    sameAs: sameAsArray(biz),
    department: svcList,
  };
}

function pageServiceSchema(biz: Biz, svc: Service) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: svc.name,
    provider: {
      "@type": "Barbershop",
      name: biz.name,
      telephone: biz.phone,
      address: {
        "@type": "PostalAddress",
        streetAddress: biz.street,
        addressLocality: biz.city,
        addressRegion: biz.region,
        postalCode: biz.postal,
        addressCountry: biz.country,
      },
    },
    areaServed: [{ "@type": "AdministrativeArea", name: "Calgary" }],
    offers: svc.priceFrom
      ? { "@type": "Offer", price: String(svc.priceFrom), priceCurrency: "CAD" }
      : undefined,
  };
}

// ---------------- Component ----------------
export default function SEOBriefSchemaBuilder() {
  const [biz, setBiz] = useState<Biz>(DEFAULT_BIZ);
  const [copied, setCopied] = useState<string>("");

  function copy(text: string, which: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(""), 1200);
    });
  }

  // Page selections
  const pages = useMemo(() => {
    return [
      { key: "home" as const, label: "Homepage" },
      { key: "area" as const, label: "Area Page (Bridgeland/Riverside)" },
      ...biz.services.map((s, i) => ({
        key: `service:${i}` as const,
        label: `Service — ${s.name}`,
      })),
    ];
  }, [biz.services]);

  // Render page data
  function renderPageData(key: string) {
    let page: "home" | "service" | "area" = "home";
    let svc: Service | undefined;
    if (key === "home") page = "home";
    else if (key === "area") page = "area";
    else if (key.startsWith("service:")) {
      page = "service";
      const idx = parseInt(key.split(":")[1] || "0");
      svc = biz.services[idx];
    }
    const title = makeTitle(page, biz, svc);
    const meta = makeMeta(page, biz, svc);
    const outline = makeOutline(page, biz, svc);
    const faqs = makeFAQs(page, biz, svc);
    const schema =
      page === "service" && svc ? pageServiceSchema(biz, svc) : undefined;
    return { page, svc, title, meta, outline, faqs, schema };
  }

  // Exporters
  function exportBriefsTxt() {
    const blocks: string[] = [];
    for (const p of [
      "home",
      "area",
      ...biz.services.map((_, i) => `service:${i}`),
    ]) {
      const d = renderPageData(p);
      blocks.push(
        [
          `# ${d.page === "home" ? "Homepage" : d.page === "area" ? "Area" : `${d.svc?.name}`}`,
          `Title: ${d.title}`,
          `Meta: ${d.meta}`,
          "",
          d.outline,
          "",
          "FAQs:",
          ...d.faqs.map((x) => `Q: ${x.q}\nA: ${x.a}`),
        ].join("\n")
      );
    }
    const txt = blocks.join("\n\n---\n\n");
    saveBlob(
      new Blob([txt], { type: "text/plain;charset=utf-8;" }),
      "belmont-page-briefs.txt"
    );
  }

  function exportBusinessSchema() {
    const obj = businessSchema(biz);
    saveBlob(
      new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" }),
      "belmont-business-schema.json"
    );
  }

  function exportAllServiceSchemas() {
    const arr = biz.services.map((s) => pageServiceSchema(biz, s));
    saveBlob(
      new Blob([JSON.stringify(arr, null, 2)], { type: "application/json" }),
      "belmont-service-schemas.json"
    );
  }

  // Mutators
  function addService() {
    setBiz((b) => ({
      ...b,
      services: [
        ...b.services,
        {
          name: "New Service",
          priceFrom: undefined,
          durationMin: 30,
          description: "",
        },
      ],
    }));
  }

  function removeService(i: number) {
    setBiz((b) => ({
      ...b,
      services: b.services.filter((_, j) => j !== i),
    }));
  }

  // Tests
  type Test = { name: string; passed: boolean; details?: string };
  const tests: Test[] = useMemo(() => {
    const t: Test[] = [];
    // 1) URLs look valid
    t.push({
      name: "Website URL valid",
      passed: isHttps(biz.website),
      details: biz.website,
    });
    // 2) Business schema JSON serializes
    try {
      JSON.stringify(businessSchema(biz));
      t.push({ name: "Business schema serializes", passed: true });
    } catch (e: any) {
      t.push({
        name: "Business schema serializes",
        passed: false,
        details: String(e),
      });
    }
    // 3) Title lengths sensible
    const homeTitle = makeTitle("home", biz);
    t.push({
      name: "Home title <= 60",
      passed: homeTitle.length <= 60,
      details: String(homeTitle.length),
    });
    const areaMeta = makeMeta("area", biz);
    t.push({
      name: "Area meta <= 160",
      passed: makeMeta("area", biz).length <= 160,
      details: String(areaMeta.length),
    });
    // 4) Service schema offer optional
    const svc0 = biz.services[0];
    const svcSch = pageServiceSchema(biz, svc0);
    t.push({
      name: "Service offer optional",
      passed: true,
      details: svcSch.offers ? "has offer" : "no offer",
    });
    return t;
  }, [biz]);
  const passCount = tests.filter((x) => x.passed).length;

  const [activeKey, setActiveKey] = useState<string>("home");
  const active = renderPageData(activeKey);

  return (
    <div className="p-5 md:p-8 space-y-6">
      <PageHeader
        title="Website Guide"
        subtitle="Generate page briefs & JSON‑LD for Belmont — copy‑paste into your CMS today."
        showLogo={true}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Do this next</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <ol className="list-decimal pl-5 space-y-1">
            <li>Fill in Business Inputs (name, website, hours).</li>
            <li>Open Page Briefs and copy the Title and Meta for a page.</li>
            <li>Paste into your CMS page settings.</li>
            <li>Open JSON‑LD and export Business or Service schema.</li>
            <li>Paste the JSON‑LD into your site.</li>
          </ol>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Pages"
          value={Object.keys(pages).length}
          hint="Configured"
          icon={<Check className="h-4 w-4" />}
        />
        <KPICard
          label="Schema Types"
          value={2}
          hint="Business + Service"
          icon={<Info className="h-4 w-4" />}
        />
        <KPICard
          label="Services"
          value={biz.services.length}
          hint="Listed"
          icon={<Settings className="h-4 w-4" />}
        />
        <KPICard
          label="Optimization"
          value="Ready"
          hint="SEO prepared"
          icon={<Wand2 className="h-4 w-4" />}
        />
      </div>

      <Tabs defaultValue="howto">
        <TabsList>
          <TabsTrigger value="howto">How To</TabsTrigger>
          <TabsTrigger value="inputs">Business Inputs</TabsTrigger>
          <TabsTrigger value="pages">Page Briefs</TabsTrigger>
          <TabsTrigger value="schema">JSON‑LD</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
        </TabsList>

        {/* How To */}
        <TabsContent value="howto">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  How to Use the Website Improvement Guide
                </CardTitle>
                <CardDescription>
                  Create optimized page content and structured data to help
                  Google understand Belmont's services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="h3 mb-2">
                      What This Tool Does
                    </h3>
                    <p className="text-muted-foreground">
                      This tool creates optimized content and code for Belmont's
                      website that helps Google better understand what services
                      Belmont offers. It generates page titles, descriptions,
                      and special code (JSON-LD) that tells search engines about
                      Belmont's business information.
                    </p>
                  </div>

                  <div>
                    <h3 className="h3 mb-2">
                      Why Website Optimization Matters for Belmont
                    </h3>
                    <p className="text-muted-foreground">
                      When customers search for Belmont's services online,
                      Google uses the information on Belmont's website to decide
                      how to display Belmont in search results:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground mt-2">
                      <li>
                        Page titles appear in search results as clickable
                        headlines
                      </li>
                      <li>
                        Meta descriptions show a preview of what the page
                        contains
                      </li>
                      <li>
                        Structured data helps Google show Belmont's business
                        info in search results
                      </li>
                      <li>
                        Well-optimized pages rank higher and get more clicks
                        from customers
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="h3 mb-2">
                      Step-by-Step Instructions
                    </h3>
                    <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                      <li>
                        <strong>Enter business information:</strong> Go to the
                        "Business Inputs" tab and fill in Belmont's details
                        (name, address, phone, services, hours)
                      </li>
                      <li>
                        <strong>Generate page content:</strong> Click the "Page
                        Briefs" tab to see optimized titles and descriptions for
                        different pages on Belmont's website
                      </li>
                      <li>
                        <strong>Copy the suggestions:</strong> Click the copy
                        buttons to copy the recommended titles and descriptions
                      </li>
                      <li>
                        <strong>Update your website:</strong> Paste the
                        optimized titles and descriptions into your website's
                        content management system (CMS)
                      </li>
                      <li>
                        <strong>Add structured data:</strong> Go to the
                        "JSON-LD" tab to get special code that helps Google
                        understand Belmont's business information
                      </li>
                      <li>
                        <strong>Install the code:</strong> Copy the JSON-LD code
                        and paste it into your website's settings or page HTML
                      </li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="h3 mb-2">
                      Best Practices for Belmont
                    </h3>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>
                        <strong>Use clear, benefit-focused titles:</strong>{" "}
                        Instead of just "Haircuts", use "Professional Men's
                        Haircuts & Styling in Bridgeland"
                      </li>
                      <li>
                        <strong>Include location keywords:</strong> Add
                        "Bridgeland", "Riverside", or "Calgary" to help local
                        customers find Belmont
                      </li>
                      <li>
                        <strong>Highlight unique services:</strong> Mention
                        "Veterans Discount", "Groomsmen Party Packages", or "Hot
                        Towel Shaves" in titles
                      </li>
                      <li>
                        <strong>Add booking links:</strong> Include
                        calls-to-action like "Book Now" in titles and
                        descriptions
                      </li>
                      <li>
                        <strong>Keep descriptions under 160 characters:</strong>{" "}
                        Meta descriptions should be concise and compelling
                      </li>
                      <li>
                        <strong>Update regularly:</strong> Refresh page content
                        monthly to keep it current and effective
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="h3 mb-2">
                      Content Guidelines
                    </h3>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>
                        <strong>Titles:</strong> Keep under 60 characters for
                        best display in search results
                      </li>
                      <li>
                        <strong>Meta descriptions:</strong> Aim for 150-160
                        characters to fit perfectly in search results
                      </li>
                      <li>
                        <strong>One service per page:</strong> Focus each page
                        on a specific service (haircuts, beard trims, etc.)
                      </li>
                      <li>
                        <strong>Include booking CTAs:</strong> Add
                        calls-to-action and links to your booking system
                      </li>
                      <li>
                        <strong>Add internal links:</strong> Link to related
                        services and Belmont's location page
                      </li>
                      <li>
                        <strong>Natural language:</strong> Write for humans
                        first, search engines second. Avoid keyword stuffing
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="h3 mb-2">
                      Installing JSON-LD Structured Data
                    </h3>
                    <p className="text-muted-foreground mb-2">
                      Structured data (JSON-LD) helps Google display Belmont's
                      information in rich search results:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>
                        <strong>Copy the code:</strong> Click the copy button
                        next to the JSON-LD section
                      </li>
                      <li>
                        <strong>Paste into your CMS:</strong> Add the code to
                        your website's settings or page HTML
                      </li>
                      <li>
                        <strong>Test the code:</strong> Use Google's Rich
                        Results Test tool to verify it works
                      </li>
                      <li>
                        <strong>One script per page:</strong> Add the
                        appropriate JSON-LD to each relevant page
                      </li>
                    </ul>
                  </div>
                </div>
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
                  <Label>Price range</Label>
                  <select
                    value={biz.priceRange}
                    onChange={(e) =>
                      setBiz((b) => ({
                        ...b,
                        priceRange: e.target.value as any,
                      }))
                    }
                    className="w-full h-9 border rounded-md px-2"
                    aria-label="Price range selection"
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
                <div>
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    value={biz.lat}
                    onChange={(e) =>
                      setBiz((b) => ({
                        ...b,
                        lat: parseFloat(e.target.value || "0"),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    value={biz.lon}
                    onChange={(e) =>
                      setBiz((b) => ({
                        ...b,
                        lon: parseFloat(e.target.value || "0"),
                      }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Google Maps URL</Label>
                  <Input
                    value={biz.googleMaps || ""}
                    onChange={(e) =>
                      setBiz((b) => ({ ...b, googleMaps: e.target.value }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Instagram URL</Label>
                  <Input
                    value={biz.instagram || ""}
                    onChange={(e) =>
                      setBiz((b) => ({ ...b, instagram: e.target.value }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Facebook URL</Label>
                  <Input
                    value={biz.facebook || ""}
                    onChange={(e) =>
                      setBiz((b) => ({ ...b, facebook: e.target.value }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Apple Maps URL</Label>
                  <Input
                    value={biz.appleMaps || ""}
                    onChange={(e) =>
                      setBiz((b) => ({ ...b, appleMaps: e.target.value }))
                    }
                  />
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">Hours</div>
                  <div className="text-xs text-muted-foreground">
                    24h format
                  </div>
                </div>
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
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">Services</div>
                  <Button size="sm" variant="outline" onClick={addService}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead style={{ minWidth: 140 }}>Name</TableHead>
                        <TableHead>From $</TableHead>
                        <TableHead>Minutes</TableHead>
                        <TableHead style={{ minWidth: 220 }}>
                          Description
                        </TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {biz.services.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell>
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
                          </TableCell>
                          <TableCell>
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
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={s.durationMin ?? ""}
                              onChange={(e) =>
                                setBiz((b) => {
                                  const x = [...b.services];
                                  x[i] = {
                                    ...x[i],
                                    durationMin:
                                      e.target.value === ""
                                        ? undefined
                                        : Number(e.target.value),
                                  };
                                  return { ...b, services: x };
                                })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={s.description || ""}
                              onChange={(e) =>
                                setBiz((b) => {
                                  const x = [...b.services];
                                  x[i] = {
                                    ...x[i],
                                    description: e.target.value,
                                  };
                                  return { ...b, services: x };
                                })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeService(i)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Page Briefs */}
        <TabsContent value="pages">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Briefs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-5 gap-3 items-end">
                <div className="md:col-span-2">
                  <Label>Page</Label>
                  <select
                    className="w-full h-9 border rounded-md px-2"
                    value={activeKey}
                    onChange={(e) => setActiveKey(e.target.value)}
                    aria-label="Page selection"
                  >
                    {pages.map((p) => (
                      <option key={String(p.key)} value={String(p.key)}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-3 flex gap-2">
                  <Button variant="outline" onClick={exportBriefsTxt}>
                    <Download className="h-4 w-4 mr-2" />
                    Export All (.txt)
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label>Title (≤60 char)</Label>
                  <Input value={active.title} readOnly />
                  <div className="text-xs text-muted-foreground">
                    Length: {active.title.length} (aim ≤60)
                  </div>

                  <Label>Meta (≈150–160 char)</Label>
                  <Textarea value={active.meta} readOnly className="h-24" />
                  <div className="text-xs text-muted-foreground">
                    Length: {active.meta.length} (aim 150–160)
                  </div>

                  <Label>Outline (H1–H3)</Label>
                  <Textarea value={active.outline} readOnly className="h-56" />
                </div>
                <div className="space-y-3">
                  <Label>FAQs</Label>
                  <div className="space-y-2">
                    {active.faqs.map((f, i) => (
                      <div
                        key={i}
                        className="p-2 border rounded-md bg-muted/30"
                      >
                        <div className="text-xs text-muted-foreground">
                          Q{i + 1}
                        </div>
                        <div className="font-medium">{f.q}</div>
                        <div className="text-sm">{f.a}</div>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <Label>Internal links (suggested)</Label>
                  <div className="text-sm p-2 border rounded-md bg-muted/30">
                    {active.page === "home" && (
                      <>
                        <div>
                          Home → Services (
                          {biz.services.map((s) => s.name).join(", ")})
                        </div>
                        <div>Home → Area page (Bridgeland/Riverside)</div>
                      </>
                    )}
                    {active.page === "area" && (
                      <>
                        <div>Area → Services pages</div>
                        <div>Area → Home</div>
                      </>
                    )}
                    {active.page === "service" && (
                      <>
                        <div>Service → Booking</div>
                        <div>Service ↔ Related services</div>
                        <div>Service → Area page</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schema */}
        <TabsContent value="schema">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">JSON‑LD</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={exportBusinessSchema}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Business JSON‑LD
                </Button>
                <Button variant="outline" onClick={exportAllServiceSchemas}>
                  <Download className="h-4 w-4 mr-2" />
                  Export All Service JSON‑LD
                </Button>
              </div>
              <Separator />
              <Label>Preview (Business)</Label>
              <pre className="p-3 border rounded-md bg-muted/30 text-xs overflow-auto max-h-80">
                {JSON.stringify(businessSchema(biz), null, 2)}
              </pre>
              <Label>Preview (First Service)</Label>
              <pre className="p-3 border rounded-md bg-muted/30 text-xs overflow-auto max-h-80">
                {JSON.stringify(
                  pageServiceSchema(biz, biz.services[0]),
                  null,
                  2
                )}
              </pre>
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
      </Tabs>
    </div>
  );
}
