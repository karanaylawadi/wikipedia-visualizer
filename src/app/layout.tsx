import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Space_Grotesk } from "next/font/google";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.visualizer.wiki"),

  title: "Visualizer.wiki",
  description:
    "Explore Wikipedia visually through summaries, timelines and images.",
  applicationName: "Visualizer.wiki",

  keywords: [
    "Wikipedia",
    "visualizer",
    "timeline",
    "knowledge",
    "AI summaries",
  ],

  verification: {
    google: "bvKGYR_AZdGrVDgA68Cupls_CPMOrR6ijdFfA1AirkE",
  },

  manifest: "/manifest.json",

  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },

  alternates: {
    canonical: "/",
  },

  openGraph: {
    title: "Visualizer.wiki",
    description:
      "Explore Wikipedia visually through summaries, timelines and images.",
    url: "https://www.visualizer.wiki",
    siteName: "Visualizer.wiki",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Visualizer.wiki",
    description:
      "Explore Wikipedia visually through summaries, timelines and images.",
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
    <html lang="en" className={spaceGrotesk.variable}>
      <body>
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        {children}
      </body>
    </html>
  );
}