import type { Metadata } from "next";
import { SiteSettings } from "@/components/site-settings";
import "./globals.css";

export const metadata: Metadata = {
  title: "TDS Strategy Lab | Tower Defense Simulator guide",
  description: "Source-linked Tower Defense Simulator reference with solo strategies, tower statistics, and an interactive 3D defense scene.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SiteSettings />
        {children}
      </body>
    </html>
  );
}
