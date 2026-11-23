import type { Metadata, Viewport } from "next";
import { Inter, Space_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EVIE-LABS — Self-Hosted AI Creative Studio",
    template: "%s · EVIE-LABS",
  },
  description:
    "Self-hosted AI creative platform for EVIE-LABS: Higgsfield official API & open-source skills, ComfyUI Colab/cloud GPU routing, Supercomputer campaign agent, spend guardrails, and Postiz approval publishing.",
  openGraph: {
    title: "EVIE-LABS — Self-Hosted AI Creative Studio",
    description:
      "Cinema-grade AI video, Soul image aesthetics, multi-provider GPU/API routing, Supercomputer agent orchestration, and approval-gated social scheduling.",
    images: ["/media/hero-soundstage.webp"],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
