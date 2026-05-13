import { Stack } from "./types"
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string"

export function encodeStack(stack: Stack): string {
  const json = JSON.stringify(stack)
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
      return JSON.parse(json) as Stack
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
