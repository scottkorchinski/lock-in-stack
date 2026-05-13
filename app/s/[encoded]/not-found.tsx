import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-6 px-4">
        <h1 className="text-4xl font-bold text-foreground">stack not found</h1>
        <p className="text-muted-foreground max-w-md">
          this stack link may be invalid or expired. want to create your own?
        </p>
        <Link href="/">
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
            create your stack
          </Button>
        </Link>
      </div>
    </main>
  )
}
