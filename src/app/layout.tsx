import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
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
  metadataBase: new URL("https://bayflood.watch"),
  title: "Bay Flood Watch",
  description: "Live flood alerts, creek gauges, and Bay tide outlook for the San Francisco Bay Area.",
  applicationName: "Bay Flood Watch",
  // Installed to the iPhone home screen: full-screen, with the status bar over our dark header color.
  appleWebApp: {
    capable: true,
    title: "Flood Watch",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Bay Flood Watch",
    description: "Live flood conditions for the SF Bay Area: NWS alerts, creek gauges, Bay tides, power outages, and traffic cams.",
    url: "/",
    siteName: "Bay Flood Watch",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1016" },
  ],
  // Let content extend under the notch and home indicator; safe-area insets keep controls clear.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
