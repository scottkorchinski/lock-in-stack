import { load } from "cheerio"
import { NextRequest, NextResponse } from "next/server"

const REQUEST_TIMEOUT_MS = 8_000
const REQUEST_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; LockInStack/1.0)",
  Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
}

const TITLE_KEYS = ["og:title", "twitter:title"]
const DESCRIPTION_KEYS = [
  "og:description",
  "twitter:description",
  "description",
]
const IMAGE_KEYS = [
  "og:image",
  "og:image:url",
  "og:image:secure_url",
  "twitter:image",
  "twitter:image:src",
  "image",
]
const LINK_IMAGE_RELS = [
  "image_src",
  "apple-touch-icon",
  "apple-touch-icon-precomposed",
  "shortcut icon",
  "icon",
]

function normalizeText(value: string | null | undefined) {
  const normalized = value?.replace(/\s+/g, " ").trim()
  return normalized ? normalized : null
}

function resolveAbsoluteUrl(candidate: string | null | undefined, baseUrl: string) {
  if (!candidate) return null

  const normalizedCandidate = candidate.trim()
  if (
    !normalizedCandidate ||
    normalizedCandidate.startsWith("data:") ||
    normalizedCandidate.startsWith("javascript:") ||
    normalizedCandidate.startsWith("blob:")
  ) {
    return null
  }

  try {
    return new URL(normalizedCandidate, baseUrl).toString()
  } catch {
    return null
  }
}

function getFirstMetaContent(
  $: ReturnType<typeof load>,
  keys: string[]
) {
  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()))

  for (const meta of $("meta").toArray()) {
    const $meta = $(meta)
    const candidateKeys = [
      $meta.attr("property"),
      $meta.attr("name"),
      $meta.attr("itemprop"),
    ]
      .map((value) => value?.trim().toLowerCase())
      .filter(Boolean) as string[]

    if (!candidateKeys.some((key) => normalizedKeys.has(key))) continue

    const content = normalizeText($meta.attr("content"))
    if (content) return content
  }

  return null
}

function matchesRel(relValue: string | undefined, targetRel: string) {
  if (!relValue) return false

  const relTokens = relValue.toLowerCase().split(/\s+/).filter(Boolean)
  const targetTokens = targetRel.toLowerCase().split(/\s+/).filter(Boolean)

  return targetTokens.every((token) => relTokens.includes(token))
}

function getFirstLinkHref(
  $: ReturnType<typeof load>,
  rels: string[]
) {
  for (const rel of rels) {
    for (const link of $("link").toArray()) {
      const $link = $(link)
      if (!matchesRel($link.attr("rel"), rel)) continue

      const href = normalizeText($link.attr("href"))
      if (href) return href
    }
  }

  return null
}

function getBestImageFallback(
  $: ReturnType<typeof load>,
  baseUrl: string
) {
  const linkedImage = resolveAbsoluteUrl(getFirstLinkHref($, LINK_IMAGE_RELS), baseUrl)
  if (linkedImage) return linkedImage

  for (const img of $("img").toArray()) {
    const $img = $(img)
    const src = normalizeText($img.attr("src"))
    if (!src) continue

    const lowerSrc = src.toLowerCase()
    if (
      lowerSrc.includes("pixel") ||
      lowerSrc.includes("tracking") ||
      lowerSrc.includes("spacer")
    ) {
      continue
    }

    const resolvedSrc = resolveAbsoluteUrl(src, baseUrl)
    if (resolvedSrc) return resolvedSrc
  }

  return null
}

function getFilenameTitleFromUrl(url: string) {
  try {
    const pathname = new URL(url).pathname
    const lastSegment = pathname.split("/").filter(Boolean).pop()
    if (!lastSegment) return null

    return normalizeText(
      decodeURIComponent(lastSegment)
        .replace(/\.[a-z0-9]+$/i, "")
        .replace(/[-_]+/g, " ")
    )
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 })
  }

  let normalizedUrl: URL

  try {
    normalizedUrl = new URL(url)
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
  }

  if (!["http:", "https:"].includes(normalizedUrl.protocol)) {
    return NextResponse.json({ error: "Only http and https URLs are supported" }, { status: 400 })
  }

  try {
    const response = await fetch(normalizedUrl, {
      headers: REQUEST_HEADERS,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch URL" }, { status: 400 })
    }

    const finalUrl = response.url || normalizedUrl.toString()
    const contentType = response.headers.get("content-type") ?? ""

    if (contentType.startsWith("image/")) {
      return NextResponse.json({
        title: getFilenameTitleFromUrl(finalUrl),
        description: null,
        image: finalUrl,
      })
    }

    if (!contentType.includes("text/html")) {
      return NextResponse.json({
        title: null,
        description: null,
        image: null,
      })
    }

    const html = await response.text()
    const $ = load(html)
    const baseUrl =
      resolveAbsoluteUrl($("base").attr("href"), finalUrl) ?? finalUrl

    const title =
      getFirstMetaContent($, TITLE_KEYS) ??
      normalizeText($("title").first().text())
    const description = getFirstMetaContent($, DESCRIPTION_KEYS)
    const image =
      resolveAbsoluteUrl(getFirstMetaContent($, IMAGE_KEYS), baseUrl) ??
      getBestImageFallback($, baseUrl)

    return NextResponse.json({
      title,
      description,
      image,
    })
  } catch (error) {
    console.error("Error fetching OG data:", error)
    return NextResponse.json({ error: "Failed to fetch metadata" }, { status: 500 })
  }
}
