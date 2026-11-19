import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bay-flood.vercel.app"),
  title: "Bay Flood Watch",
  description: "Live flood alerts, creek gauges, and Bay tide outlook for the San Francisco Bay Area.",
  openGraph: {
    title: "Bay Flood Watch",
    description: "Live flood conditions for the SF Bay Area: NWS alerts, creek gauges, Bay tides, power outages, and traffic cams.",
    url: "/",
    siteName: "Bay Flood Watch",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
