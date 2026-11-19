import type { Metadata, Viewport } from "next";
import { Archivo, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  axes: ["wdth"],
  display: "swap",
});

const splineMono = Spline_Sans_Mono({
  subsets: ["latin"],
  variable: "--font-spline-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Vyolab Studio — Self-Hosted AI Creative Platform",
    template: "%s · Vyolab Studio",
  },
  description:
    "Self-hosted AI creative platform for Vyolab (forked from Hixfield): Higgsfield official API & open-source skills, ComfyUI Colab/cloud GPU routing, Supercomputer campaign agent, spend guardrails, and Postiz approval publishing.",
  openGraph: {
    title: "Vyolab Studio — Self-Hosted AI Creative Platform",
    description:
      "Camera-controlled AI video, multi-provider GPU/API routing, Supercomputer campaign orchestration, and human-approved Postiz publishing.",
    images: ["/media/hero-soundstage.webp"],
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${splineMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
