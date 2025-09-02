import "./globals.css";
import AppShell from "@/components/shell/AppShell";

export const metadata = {
  title: "Belmont SEO Lab",
  description: "SEO tools and analytics platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
