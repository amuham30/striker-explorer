import type { Metadata } from "next";
import { Geist, Geist_Mono, Oswald } from "next/font/google";
import { SiteNav } from "@/components/site-nav";
import { Volleyball } from "lucide-react";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Broadcast-style condensed display face for headings
const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Striker Explorer — Top-5 League Scouting Dashboard",
  description:
    "Every player in Europe's top 5 leagues, 2025/26. Impact scores, market values, shot maps, position profiles and Barça-fit rankings.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} h-full antialiased`}
      style={{ colorScheme: "dark" }}
    >
      <body className="min-h-full flex flex-col">
        {/* Sticky app bar — identical position on every route */}
        <div className="sticky top-0 z-50 border-b border-line bg-canvas/85 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 md:px-10">
            <Link
              href="/"
              className="flex items-center gap-1.5 font-display text-sm font-semibold uppercase tracking-[0.18em] text-gold"
            >
              <Volleyball size={16} aria-hidden="true" />
              Striker<span className="text-ink">Explorer</span>
            </Link>
            <SiteNav />
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
