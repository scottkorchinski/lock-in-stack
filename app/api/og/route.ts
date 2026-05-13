import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 })
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LockInStack/1.0)",
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch URL" }, { status: 400 })
    }

    const html = await response.text()

    // Parse Open Graph meta tags
    const getMetaContent = (property: string): string | null => {
      const ogMatch = html.match(
        new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, "i")
      )
      if (ogMatch) return ogMatch[1]

      const ogMatchReverse = html.match(
        new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, "i")
      )
      if (ogMatchReverse) return ogMatchReverse[1]

      // Try name attribute as fallback
      const nameMatch = html.match(
        new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, "i")
      )
      if (nameMatch) return nameMatch[1]

      const nameMatchReverse = html.match(
        new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${property}["']`, "i")
      )
      if (nameMatchReverse) return nameMatchReverse[1]

      return null
    }

    // Get title
    let title = getMetaContent("og:title") || getMetaContent("twitter:title")
    if (!title) {
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
      title = titleMatch ? titleMatch[1] : null
    }

    // Get description
    let description = getMetaContent("og:description") || getMetaContent("twitter:description") || getMetaContent("description")

    // Get image
    let image = getMetaContent("og:image") || getMetaContent("twitter:image")

    // Make relative image URLs absolute
    if (image && !image.startsWith("http")) {
      const urlObj = new URL(url)
      image = image.startsWith("/")
        ? `${urlObj.protocol}//${urlObj.host}${image}`
        : `${urlObj.protocol}//${urlObj.host}/${image}`
    }

    // Decode HTML entities
    const decodeHtml = (str: string | null): string | null => {
      if (!str) return null
      return str
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .trim()
    }

    return NextResponse.json({
      title: decodeHtml(title),
      description: decodeHtml(description),
      image,
    })
  } catch (error) {
    console.error("Error fetching OG data:", error)
    return NextResponse.json({ error: "Failed to fetch metadata" }, { status: 500 })
  }
}
