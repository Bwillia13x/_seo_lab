import "./globals.css";
import AppShell from "@/components/shell/AppShell";
import { ErrorBoundary } from "@/components/ui/error-boundary";

const SITE_BASE = process.env.NEXT_PUBLIC_SITE_BASE || "https://thebelmontbarber.ca";
const ALLOW_INDEXING = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

export const metadata = {
  title: "Belmont SEO Lab - Local SEO Tools for The Belmont Barbershop",
  description:
    "Professional SEO toolkit for The Belmont Barbershop in Bridgeland, Calgary. UTM tracking, review management, GBP posting, and local link building tools.",
  keywords: [
    "SEO tools",
    "local SEO",
    "UTM tracking",
    "Google Business Profile",
    "review management",
    "barbershop marketing",
    "Bridgeland Calgary",
    "mens haircut",
    "beard trim",
    "hot towel shave",
    "groomsmen party",
    "local business marketing",
    "barber shop marketing",
  ],
  authors: [{ name: "The Belmont Barbershop" }],
  creator: "The Belmont Barbershop",
  publisher: "The Belmont Barbershop",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(SITE_BASE),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: ALLOW_INDEXING,
    follow: ALLOW_INDEXING,
    googleBot: {
      index: ALLOW_INDEXING,
      follow: ALLOW_INDEXING,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Belmont SEO Lab - Professional Local SEO Tools",
    description:
      "Complete SEO toolkit for The Belmont Barbershop in Bridgeland, Calgary",
    url: SITE_BASE,
    siteName: "The Belmont Barbershop",
    locale: "en_CA",
    type: "website",
    images: [
      {
        url: "/images/PRAIRIESIGNALLOGO.png",
        width: 1200,
        height: 630,
        alt: "Prairie Signal - Belmont SEO Lab Professional Marketing Tools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Belmont SEO Lab - Professional Local SEO Tools",
    description:
      "Complete SEO toolkit for The Belmont Barbershop in Bridgeland, Calgary",
    creator: "@TheBelmontBarber",
    images: ["/images/PRAIRIESIGNALLOGO.png"],
  },
  verification: {
    google: undefined,
  },
  icons: {
    icon: "/images/PRAIRIESIGNALLOGO.png",
    shortcut: "/images/PRAIRIESIGNALLOGO.png",
    apple: "/images/PRAIRIESIGNALLOGO.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <body>
        <ErrorBoundary>
          <AppShell>{children}</AppShell>
        </ErrorBoundary>
      </body>
    </html>
  );
}
