import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Space_Grotesk } from "next/font/google";
import { BRAND } from "@/lib/brand";
import "./globals.css";

/* Ink & Signal type stack — self-hosted via next/font (no FOUT, no Google
   round-trip): Space Grotesk for display, Geist Sans for UI, Geist Mono for
   data. globals.css maps the .ao-* helper classes onto these variables. */
const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: `${BRAND.name} · ${BRAND.org}`,
  description: `${BRAND.name} — ${BRAND.tagline}. Cases, DCM verdicts, approvals and digital acknowledgements.`,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} ${display.variable}`}>{children}</body>
    </html>
  );
}
