import type { Metadata } from "next";
import { RoutingView } from "@/components/routing/routing-view";

export const metadata: Metadata = {
  title: "Routing & Spend",
  description:
    "Model router across ComfyUI Colab GPUs, Hugging Face Router, and Higgsfield API with spend tracking and budget caps.",
};

export default function RoutingPage() {
  return <RoutingView />;
}
