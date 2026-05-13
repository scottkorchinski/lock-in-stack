import { ImageResponse } from "next/og"
import { categoryLabels } from "@/lib/types"
import { getSharedStack } from "@/lib/shared-stack"

export const runtime = "nodejs"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

interface ShareImageProps {
  params: Promise<{
    encoded: string
  }>
}

async function getImageDataUrl(url: string) {
  try {
    const response = await fetch(url)
    if (!response.ok) return null

    const contentType = response.headers.get("content-type") || "image/jpeg"
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    return `data:${contentType};base64,${buffer.toString("base64")}`
  } catch {
    return null
  }
}

export default async function ShareOpengraphImage({ params }: ShareImageProps) {
  const { encoded } = await params
  const stack = await getSharedStack(encoded)

  if (!stack) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            height: "100%",
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #111827, #1f2937)",
            color: "#f9fafb",
            fontSize: 56,
            fontWeight: 700,
          }}
        >
          lockinstack
        </div>
      ),
      size
    )
  }

  const featuredImageUrl = stack.items.find((item) => item.image)?.image
  const featuredImage = featuredImageUrl ? await getImageDataUrl(featuredImageUrl) : null
  const featuredItems = stack.items.slice(0, 4)
  const categories = new Set(stack.items.map((item) => categoryLabels[item.category])).size

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          padding: 36,
          background: "linear-gradient(160deg, #f8fafc, #e2e8f0)",
          color: "#0f172a",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            borderRadius: 36,
            overflow: "hidden",
            background: "#ffffff",
            border: "1px solid rgba(15, 23, 42, 0.08)",
            boxShadow: "0 24px 60px rgba(15, 23, 42, 0.12)",
          }}
        >
          <div
            style={{
              display: "flex",
              width: featuredImage ? 420 : 280,
              height: "100%",
              position: "relative",
              alignItems: "flex-end",
              justifyContent: "flex-start",
              overflow: "hidden",
              background: featuredImage
                ? "#0f172a"
                : "linear-gradient(180deg, #111827, #1e293b)",
            }}
          >
            {featuredImage ? (
              <img
                src={featuredImage}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  inset: 0,
                  background:
                    "radial-gradient(circle at top left, rgba(99, 102, 241, 0.55), transparent 40%), radial-gradient(circle at bottom right, rgba(56, 189, 248, 0.35), transparent 35%)",
                }}
              />
            )}

            <div
              style={{
                display: "flex",
                position: "absolute",
                left: 24,
                top: 24,
                borderRadius: 999,
                padding: "10px 16px",
                background: "rgba(15, 23, 42, 0.72)",
                color: "#f8fafc",
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              lockinstack
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flex: 1,
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "40px 42px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  color: "#6366f1",
                  fontSize: 24,
                  fontWeight: 700,
                }}
              >
                <span>share your focus toolkit</span>
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 58,
                  lineHeight: 1.05,
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                }}
              >
                {stack.title}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    borderRadius: 999,
                    background: "#eef2ff",
                    color: "#4338ca",
                    padding: "10px 16px",
                    fontSize: 24,
                    fontWeight: 700,
                  }}
                >
                  {stack.items.length} tools
                </div>
                <div
                  style={{
                    display: "flex",
                    borderRadius: 999,
                    background: "#f1f5f9",
                    color: "#334155",
                    padding: "10px 16px",
                    fontSize: 24,
                    fontWeight: 600,
                  }}
                >
                  {categories} categories
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {featuredItems.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    borderRadius: 18,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    padding: "16px 18px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: 12,
                      height: 12,
                      borderRadius: 999,
                      background: "#6366f1",
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        fontSize: 26,
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      {item.name}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        fontSize: 20,
                        color: "#64748b",
                      }}
                    >
                      {categoryLabels[item.category]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    size
  )
}
