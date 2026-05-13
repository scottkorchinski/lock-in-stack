import "server-only"
import { randomBytes } from "node:crypto"
import { Redis } from "@upstash/redis"
import { isShortShareId } from "./share-links"
import { Stack } from "./types"

const SHARE_KEY_PREFIX = "share:"
const SHARE_TTL_SECONDS = 60 * 60 * 24 * 90

let redisClient: Redis | null | undefined

function getRedisClient() {
  if (redisClient !== undefined) {
    return redisClient
  }

  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN

  if (!url || !token) {
    redisClient = null
    return redisClient
  }

  redisClient = new Redis({ url, token })
  return redisClient
}

function getShareKey(shareId: string) {
  return `${SHARE_KEY_PREFIX}${shareId}`
}

function createShareId() {
  return randomBytes(6).toString("base64url")
}

export function isShareStoreConfigured() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

export async function getStoredShareStack(shareId: string) {
  const redis = getRedisClient()
  if (!redis || !isShortShareId(shareId)) return null

  const stored = await redis.get<Stack | string>(getShareKey(shareId))
  if (!stored) return null

  if (typeof stored === "object") {
    if (
      typeof stored.title === "string" &&
      Array.isArray(stored.items)
    ) {
      return stored as Stack
    }

    return null
  }

  try {
    return JSON.parse(stored) as Stack
  } catch {
    return null
  }
}

export async function saveSharedStack(stack: Stack, shareId?: string | null) {
  const redis = getRedisClient()
  if (!redis) {
    throw new Error("Share storage is not configured")
  }

  if (shareId && isShortShareId(shareId)) {
    await redis.set(getShareKey(shareId), stack, { ex: SHARE_TTL_SECONDS })
    return shareId
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const nextShareId = createShareId()
    const created = await redis.set(getShareKey(nextShareId), stack, {
      ex: SHARE_TTL_SECONDS,
      nx: true,
    })

    if (created === "OK") {
      return nextShareId
    }
  }

  throw new Error("Failed to create a unique share id")
}
