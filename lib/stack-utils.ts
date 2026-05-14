import { Category, Stack, StackItem, categoryOrder } from "./types"
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string"

const legacyShareCategoryOrder: Category[] = [
  "books",
  "exercise",
  "food",
  "apps",
  "supplements",
  "habits",
  "music",
  "environment",
]

const shareCategoryOrder = categoryOrder

interface CompactStackPayload {
  v: 1 | 2
  t: string
  i: CompactStackItem[]
}

type CompactStackItem = [string, number, string?, string?, string?]

function encodeStackItem(item: StackItem): CompactStackItem {
  const compactItem: CompactStackItem = [
    item.name,
    shareCategoryOrder.indexOf(item.category),
  ]

  if (item.description || item.url || item.image) {
    compactItem[2] = item.description || ""
  }

  if (item.url || item.image) {
    compactItem[3] = item.url || ""
  }

  if (item.image) {
    compactItem[4] = item.image
  }

  return compactItem
}

function decodeStackPayload(payload: unknown): Stack | null {
  if (!payload || typeof payload !== "object") return null

  if ("v" in payload && "t" in payload && "i" in payload) {
    const compactPayload = payload as Partial<CompactStackPayload>
    if (
      (compactPayload.v !== 1 && compactPayload.v !== 2) ||
      typeof compactPayload.t !== "string" ||
      !Array.isArray(compactPayload.i)
    ) {
      return null
    }

    const decodedCategoryOrder =
      compactPayload.v === 1 ? legacyShareCategoryOrder : shareCategoryOrder

    const items: StackItem[] = compactPayload.i.flatMap((item, index) => {
      if (!Array.isArray(item) || typeof item[0] !== "string" || typeof item[1] !== "number") {
        return []
      }

      const category = decodedCategoryOrder[item[1]]
      if (!category) return []

      return [
        {
          id: `shared-${index}`,
          name: item[0],
          category,
          description: item[2] || undefined,
          url: item[3] || undefined,
          image: item[4] || undefined,
        },
      ]
    })

    return {
      title: compactPayload.t,
      items,
    }
  }

  if ("title" in payload && "items" in payload) {
    const stack = payload as Partial<Stack>
    if (typeof stack.title !== "string" || !Array.isArray(stack.items)) {
      return null
    }

    return stack as Stack
  }

  return null
}

export function encodeStack(stack: Stack): string {
  const payload: CompactStackPayload = {
    v: 2,
    t: stack.title,
    i: stack.items.map(encodeStackItem),
  }
  const json = JSON.stringify(payload)
  return compressToEncodedURIComponent(json)
}

export function decodeStack(encoded: string): Stack | null {
  const candidates = new Set([encoded])

  try {
    candidates.add(decodeURIComponent(encoded))
  } catch {
    // Ignore malformed percent-encoding and fall back to the raw value.
  }

  for (const candidate of candidates) {
    try {
      const json = decompressFromEncodedURIComponent(candidate)
      if (!json) continue
      return decodeStackPayload(JSON.parse(json))
    } catch {
      // Try the next candidate representation.
    }
  }

  return null
}

export function generateShareUrl(stack: Stack): string {
  const encoded = encodeStack(stack)
  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
  return `${baseUrl}/s/${encodeURIComponent(encoded)}`
}
