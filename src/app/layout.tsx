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
    default: "Hixfield, the open-source Higgsfield",
    template: "%s · Hixfield",
  },
  description:
    "Cinematic camera-controlled AI video, Soul-style images, consistent characters, and talking avatars. Self-hosted on the official Higgsfield API with your own key. MIT licensed.",
  metadataBase: new URL("https://hixfield.vercel.app"),
  openGraph: {
    title: "Hixfield, the open-source Higgsfield",
    description:
      "Someone just open-sourced the Higgsfield create experience. Bring your own API key, run one command.",
    images: ["/media/hero-soundstage.webp"],
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
};

const DIRECTION_CONTRACT = `
THESIS: A night grading suite for AI cinematography — the preset gallery IS the interface. Refuses the SaaS-dashboard arrangement of stat cards and hero metrics.
OWN-WORLD: Layered near-blacks (#09090b→#17171d) under hairline borders; one lime signal #ccff00 committed at page scale on Persuade surfaces; Archivo (width axis as the expressive range) with Spline Sans Mono strictly for data — timecodes, seeds, credits, job ids. Playhead sliders, recording-lamp status pulses.
STORY: A developer pastes a key pair, watches 50+ camera presets load with live video thumbnails, stacks two motions, and gets a DoP shot — then stars the repo.
FIRST VIEWPORT (landing): Full-bleed generated soundstage still under a wide-set HIXFIELD wordmark, one-line hook, two actions — Run it (copy command) and GitHub star count, live preset strip below the fold line.
FORM: Grading-suite console; #1 of the derivation; brief-pinned (dark + lime + preset-video-cards), no seed roll owed.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${splineMono.variable}`}>
      <body>
        <script type="text/x-direction-contract" dangerouslySetInnerHTML={{ __html: DIRECTION_CONTRACT }} />
        {children}
      </body>
    </html>
  );
}
