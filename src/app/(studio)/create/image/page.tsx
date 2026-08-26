import type { Metadata } from "next";
import { CreateImage } from "@/components/create-image/create-image";

export const metadata: Metadata = { title: "Create image" };

export default function CreateImagePage() {
  return <CreateImage />;
}
