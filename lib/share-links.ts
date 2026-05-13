const SHORT_SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{8,16}$/

export function isShortShareId(value: string) {
  return SHORT_SHARE_ID_PATTERN.test(value)
}

export function buildStoredShareUrl(baseUrl: string, shareId: string) {
  return `${baseUrl}/s/${shareId}`
}
