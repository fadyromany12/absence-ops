import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Absence Ops · Konecta GDC",
  description: "BPO workforce & compliance — absences, DCM verdicts, approvals and digital acknowledgements.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
