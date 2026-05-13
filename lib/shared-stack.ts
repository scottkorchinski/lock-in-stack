import "server-only"

import { isShortShareId } from "./share-links"
import { getStoredShareStack } from "./share-store"
import { decodeStack } from "./stack-utils"

export async function getSharedStack(encoded: string) {
  return isShortShareId(encoded)
    ? (await getStoredShareStack(encoded)) ?? decodeStack(encoded)
    : decodeStack(encoded)
}
