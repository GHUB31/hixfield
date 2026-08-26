import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getClient } from "@/lib/higgsfield/client";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const list = await getClient().listSoulIds(1, 100);
    return NextResponse.json({
      characters: list.items.map((c) => ({ id: c.id, name: c.name, status: c.status })),
    });
  } catch (err) {
    return apiError(err);
  }
}

const Body = z.object({
  name: z.string().min(1).max(80),
  image_urls: z.array(z.string().url()).min(1).max(10),
});

/** Training is async upstream; the page polls GET until the Soul ID reports completed. */
export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());
    const soulId = await getClient().createSoulId(
      {
        name: body.name,
        input_images: body.image_urls.map((u) => ({
          type: "image_url" as never,
          image_url: u,
        })),
      },
      false
    );
    return NextResponse.json(
      { character: { id: soulId.id, name: soulId.name, status: soulId.status } },
      { status: 201 }
    );
  } catch (err) {
    return apiError(err);
  }
}
