import type { Metadata } from "next";
import { CampaignsView } from "@/components/campaigns/campaigns-view";

export const metadata: Metadata = {
  title: "Campaigns",
  description:
    "Supercomputer-style agent that turns a brand brief into scripts, storyboards, consistent images, videos, captions, and approval-gated scheduled posts.",
};

export default function CampaignsPage() {
  return <CampaignsView />;
}
