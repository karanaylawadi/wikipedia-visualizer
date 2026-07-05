import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://visualizer.wiki"),
  title: "Visualizer.wiki",
  description: "Explore Wikipedia visually through summaries, timelines and images.",
  applicationName: "Visualizer.wiki",
  keywords: ["Wikipedia", "visualizer", "timeline", "knowledge", "AI summaries"],
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Visualizer.wiki",
    description: "Explore Wikipedia visually through summaries, timelines and images.",
    url: "https://visualizer.wiki",
    siteName: "Visualizer.wiki",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Visualizer.wiki",
    description: "Explore Wikipedia visually through summaries, timelines and images.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        {children}
      </body>
    </html>
  );
}