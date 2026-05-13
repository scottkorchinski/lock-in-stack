import { StackBuilder } from "@/components/stack-builder"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 sm:py-20">
        <header className="text-center mb-12 space-y-4">
          <h1 className="text-4xl sm:text-6xl font-bold text-foreground tracking-tight text-balance">
            lock<span className="text-primary">in</span>stack.
          </h1>
          <p className="text-muted-foreground text-lg italic max-w-md mx-auto text-pretty">
            share your focus toolkit. the books, apps, habits, and tools that help you lock in.
          </p>
        </header>

        <StackBuilder />
      </div>
    </main>
  )
}
