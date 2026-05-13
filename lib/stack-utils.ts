import { Stack } from "./types"
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string"

export function encodeStack(stack: Stack): string {
  const json = JSON.stringify(stack)
  return compressToEncodedURIComponent(json)
}

export function decodeStack(encoded: string): Stack | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    return JSON.parse(json) as Stack
  } catch {
    return null
  }
}

export function generateShareUrl(stack: Stack): string {
  const encoded = encodeStack(stack)
  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
  return `${baseUrl}/s/${encoded}`
}
