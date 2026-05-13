import { notFound } from "next/navigation"
import { decodeStack } from "@/lib/stack-utils"
import { StackViewer } from "@/components/stack-viewer"

interface SharePageProps {
  params: Promise<{
    encoded: string
  }>
}

export async function generateMetadata({ params }: SharePageProps) {
  const { encoded } = await params
  const stack = decodeStack(encoded)
  
  if (!stack) {
    return {
      title: "stack not found",
    }
  }

  return {
    title: `${stack.title} | lock in stack`,
    description: `${stack.items.length} focus tools in this stack`,
  }
}

export default async function SharePage({ params }: SharePageProps) {
  const { encoded } = await params
  const stack = decodeStack(encoded)

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
