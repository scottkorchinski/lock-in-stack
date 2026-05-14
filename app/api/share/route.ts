import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { buildStoredShareUrl } from "@/lib/share-links"
import { isShareStoreConfigured, saveSharedStack } from "@/lib/share-store"

export const runtime = "nodejs"

const categorySchema = z.enum([
  "apps",
  "books",
  "environment",
  "exercise",
  "food",
  "habits",
  "music",
  "other",
  "supplements",
  "techniques",
])

const stackSchema = z.object({
  title: z.string().min(1).max(120),
  items: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1).max(200),
      category: categorySchema,
      description: z.string().max(500).optional(),
      url: z.string().url().optional(),
      image: z.string().url().optional(),
    })
  ),
})

const requestSchema = z.object({
  shareId: z.string().min(8).max(16).optional(),
  stack: stackSchema,
})

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid share payload" }, { status: 400 })
  }

  if (!isShareStoreConfigured()) {
    return NextResponse.json({ error: "Short-link storage is not configured" }, { status: 503 })
  }

  try {
    const shareId = await saveSharedStack(parsed.data.stack, parsed.data.shareId)
    return NextResponse.json({
      shareId,
      url: buildStoredShareUrl(request.nextUrl.origin, shareId),
    })
  } catch (error) {
    console.error("Failed to save shared stack:", error)
    return NextResponse.json({ error: "Failed to create share link" }, { status: 500 })
  }
}
