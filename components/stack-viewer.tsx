"use client"

import Link from "next/link"
import { ArrowLeft, Share2, ExternalLink, ChevronDown } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Stack, Category, categoryLabels, categoryIcons, StackItem } from "@/lib/types"

interface StackViewerProps {
  stack: Stack
}

export function StackViewer({ stack }: StackViewerProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<Category>>(new Set())
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set())

  const toggleCategory = (category: Category) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const toggleDescription = (itemId: string) => {
    setExpandedDescriptions((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  const openItemLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const groupedItems = stack.items.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    },
    {} as Record<Category, StackItem[]>
  )

  const ItemContent = ({ item }: { item: StackItem }) => {
    const isExpanded = expandedDescriptions.has(item.id)
    const canExpandDescription = (item.description?.length ?? 0) > 140

    return (
      <div className="p-4 flex items-start gap-4">
        {item.image && (
          <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-secondary">
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">
              {item.name}
            </p>
            {item.url && (
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            )}
          </div>
          {item.description && (
            <div className="mt-1 space-y-1">
              <p className={`text-sm text-muted-foreground ${isExpanded ? "" : "line-clamp-2"}`}>
                {item.description}
              </p>
              {canExpandDescription && (
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={(event) => {
                    event.stopPropagation()
                    toggleDescription(item.id)
                  }}
                >
                  {isExpanded ? "show less" : "show more"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <div className="flex items-center">
        <Link href="/">
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            create your own
          </Button>
        </Link>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">{stack.title}</h1>
        <p className="text-muted-foreground">
          {stack.items.length} items in this stack
        </p>
      </div>

      <div className="space-y-6">
        {(Object.keys(groupedItems) as Category[]).map((category) => (
          <div key={category} className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full px-4 py-3 bg-secondary/50 hover:bg-secondary text-sm font-medium text-foreground flex items-center gap-2 transition-colors"
            >
              <span>{categoryIcons[category]}</span>
              <span>{categoryLabels[category]}</span>
              <span className="text-xs text-muted-foreground">({groupedItems[category].length})</span>
              <ChevronDown 
                className={`w-4 h-4 ml-auto text-muted-foreground transition-transform ${
                  collapsedCategories.has(category) ? "-rotate-90" : ""
                }`} 
              />
            </button>
            {!collapsedCategories.has(category) && (
              <div className="divide-y divide-border">
                {groupedItems[category].map((item) => 
                  item.url ? (
                    <div
                      key={item.id} 
                      role="link"
                      tabIndex={0}
                      onClick={() => openItemLink(item.url!)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          openItemLink(item.url!)
                        }
                      }}
                      className="block cursor-pointer hover:bg-secondary/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <ItemContent item={item} />
                    </div>
                  ) : (
                    <div key={item.id}>
                      <ItemContent item={item} />
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="pt-8 border-t border-border text-center">
        <p className="text-muted-foreground text-sm mb-4">
          want to share your own focus stack?
        </p>
        <Link href="/">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Share2 className="w-4 h-4 mr-2" />
            create your stack
          </Button>
        </Link>
      </div>
    </div>
  )
}
