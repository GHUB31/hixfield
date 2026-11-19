import type { Metadata } from "next";
import { PublishView } from "@/components/publish/publish-view";

export const metadata: Metadata = {
  title: "Publish",
  description: "Postiz social media scheduling queue with mandatory human publishing approval.",
};

export default function PublishPage() {
  return <PublishView />;
}
