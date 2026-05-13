import { notFound } from "next/navigation"
import { getSharedStack } from "@/lib/shared-stack"
import { getSiteUrl } from "@/lib/site-url"
import { StackViewer } from "@/components/stack-viewer"

interface SharePageProps {
  params: Promise<{
    encoded: string
  }>
}

export async function generateMetadata({ params }: SharePageProps) {
  const { encoded } = await params
  const stack = await getSharedStack(encoded)

  if (!stack) {
    return {
      title: "stack not found",
    }
  }

  const description = `${stack.items.length} focus tools in this stack`
  const imageUrl = new URL(`/s/${encodeURIComponent(encoded)}/opengraph-image`, getSiteUrl()).toString()

  return {
    title: `${stack.title} | lock in stack`,
    description,
    openGraph: {
      title: `${stack.title} | lock in stack`,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${stack.title} preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${stack.title} | lock in stack`,
      description,
      images: [imageUrl],
    },
  }
}

export default async function SharePage({ params }: SharePageProps) {
  const { encoded } = await params
  const stack = await getSharedStack(encoded)

  if (!stack) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 sm:py-20">
        <StackViewer stack={stack} />
      </div>
    </main>
  )
}
