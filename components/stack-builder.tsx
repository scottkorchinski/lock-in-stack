"use client"

import { useEffect, useRef, useState } from "react"
import { Plus, X, Share2, Check, Copy, Link as LinkIcon, Loader2, ExternalLink, ImageIcon, ChevronDown, PencilLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StackItem, Category, categoryLabels, categoryIcons } from "@/lib/types"
import { buildStoredShareUrl } from "@/lib/share-links"
import { generateShareUrl } from "@/lib/stack-utils"

const STACK_STORAGE_KEY = "lock-in-stack-builder"

interface PersistedBuilderState {
  title: string
  items: StackItem[]
  hasGeneratedShareLink?: boolean
  shareId?: string | null
}

export function StackBuilder() {
  const [title, setTitle] = useState("my lock in stack")
  const [items, setItems] = useState<StackItem[]>([])
  const [newItemName, setNewItemName] = useState("")
  const [newItemDescription, setNewItemDescription] = useState("")
  const [newItemUrl, setNewItemUrl] = useState("")
  const [newItemImage, setNewItemImage] = useState("")
  const [newItemCategory, setNewItemCategory] = useState<Category>("apps")
  const [manualImageInput, setManualImageInput] = useState("")
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareId, setShareId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<Category>>(new Set())
  const [hasLoadedPersistedStack, setHasLoadedPersistedStack] = useState(false)
  const metadataRequestIdRef = useRef(0)
  const latestUrlRef = useRef("")
  const lastSharedSnapshotRef = useRef<string | null>(null)

  useEffect(() => {
    try {
      const rawPersistedState = window.localStorage.getItem(STACK_STORAGE_KEY)
      if (!rawPersistedState) return

      const persistedState = JSON.parse(rawPersistedState) as Partial<PersistedBuilderState>
      const persistedTitle =
        typeof persistedState.title === "string" && persistedState.title.trim()
          ? persistedState.title
          : "my lock in stack"
      const persistedItems = Array.isArray(persistedState.items) ? persistedState.items : []

      setTitle(persistedTitle)
      setItems(persistedItems)

      if (persistedState.shareId) {
        setShareId(persistedState.shareId)
        setShareUrl(buildStoredShareUrl(window.location.origin, persistedState.shareId))
        lastSharedSnapshotRef.current = JSON.stringify({ title: persistedTitle, items: persistedItems })
      } else if (persistedState.hasGeneratedShareLink && persistedItems.length > 0) {
        setShareUrl(generateShareUrl({ title: persistedTitle, items: persistedItems }))
      }
    } catch (error) {
      console.error("Failed to load saved stack:", error)
    } finally {
      setHasLoadedPersistedStack(true)
    }
  }, [])

  useEffect(() => {
    if (!hasLoadedPersistedStack) return

    const persistedState: PersistedBuilderState = {
      title,
      items,
      hasGeneratedShareLink: Boolean(shareUrl),
      shareId,
    }

    window.localStorage.setItem(STACK_STORAGE_KEY, JSON.stringify(persistedState))
  }, [hasLoadedPersistedStack, items, shareId, shareUrl, title])

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

  const isValidUrl = (string: string) => {
    try {
      new URL(string)
      return true
    } catch {
      return false
    }
  }

  const resetPendingItemFields = () => {
    setNewItemName("")
    setNewItemDescription("")
    setNewItemImage("")
    setManualImageInput("")
  }

  const fetchMetadata = async (url: string) => {
    const normalizedUrl = url.trim()

    if (!isValidUrl(normalizedUrl)) return

    const requestId = metadataRequestIdRef.current
    setIsFetching(true)

    try {
      const response = await fetch(`/api/og?url=${encodeURIComponent(normalizedUrl)}`)
      if (response.ok) {
        const data = await response.json()
        if (metadataRequestIdRef.current !== requestId || latestUrlRef.current !== normalizedUrl) return

        setNewItemName(data.title || "")
        setNewItemDescription(data.description || "")
        setNewItemImage(data.image || "")
        setManualImageInput("")
      }
    } catch (error) {
      console.error("Failed to fetch metadata:", error)
    } finally {
      if (metadataRequestIdRef.current === requestId && latestUrlRef.current === normalizedUrl) {
        setIsFetching(false)
      }
    }
  }

  const handleUrlChange = (value: string) => {
    metadataRequestIdRef.current += 1
    latestUrlRef.current = value.trim()
    setIsFetching(false)

    if (value.trim() !== newItemUrl.trim()) {
      resetPendingItemFields()
    }

    setNewItemUrl(value)
  }

  const handleUrlBlur = () => {
    if (newItemUrl && isValidUrl(newItemUrl)) {
      fetchMetadata(newItemUrl)
    }
  }

  const addItem = () => {
    if (!newItemName.trim()) return

    const item: StackItem = {
      id: crypto.randomUUID(),
      name: newItemName.trim(),
      description: newItemDescription.trim() || undefined,
      category: newItemCategory,
      url: newItemUrl.trim() || undefined,
      image: newItemImage || undefined,
    }

    setItems([...items, item])
    metadataRequestIdRef.current += 1
    latestUrlRef.current = ""
    setIsFetching(false)
    resetPendingItemFields()
    setNewItemUrl("")
  }

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  async function syncShareLink(existingShareId?: string | null, snapshotOverride?: string) {
    const stack = { title, items }
    const snapshot = snapshotOverride ?? JSON.stringify(stack)

    setIsSharing(true)
    setShareError(null)

    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shareId: existingShareId ?? shareId ?? undefined,
          stack,
        }),
      })

      if (!response.ok) {
        throw new Error("Short-link storage unavailable")
      }

      const data = (await response.json()) as { shareId: string; url: string }
      setShareId(data.shareId)
      setShareUrl(data.url)
      setCopied(false)
      lastSharedSnapshotRef.current = snapshot
    } catch (error) {
      console.error("Failed to create short share link:", error)
      if (existingShareId ?? shareId) {
        setShareError("couldn't sync your latest changes yet, but your short link still works")
      } else {
        setShareId(null)
        setShareUrl(generateShareUrl(stack))
        setShareError("short links will work after storage is connected; using a long link for now")
      }
      lastSharedSnapshotRef.current = null
    } finally {
      setIsSharing(false)
    }
  }

  const handleShare = () => {
    void syncShareLink()
  }

  useEffect(() => {
    if (!shareId) {
      if (!shareUrl) return

      const nextShareUrl = generateShareUrl({ title, items })
      if (nextShareUrl !== shareUrl) {
        setShareUrl(nextShareUrl)
        setCopied(false)
      }
      return
    }

    const snapshot = JSON.stringify({ title, items })
    if (snapshot === lastSharedSnapshotRef.current) return

    const timeoutId = window.setTimeout(() => {
      void syncShareLink(shareId, snapshot)
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [items, shareId, shareUrl, title])

  const copyToClipboard = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const groupedItems = items.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    },
    {} as Record<Category, StackItem[]>
  )
  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      {/* Title Input */}
      <div className="space-y-3 rounded-xl border border-border bg-card/70 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <PencilLine className="w-4 h-4" />
          <span>stack name</span>
        </div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="name your stack..."
          className="h-auto border-border bg-secondary/60 px-4 py-3 text-2xl font-bold text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
        />
        <p className="text-muted-foreground text-sm">
          add your focus tools below
        </p>
      </div>

      {/* Add Item Form */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-4">
          {/* URL Input */}
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={newItemUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              onBlur={handleUrlBlur}
              placeholder="paste a link (optional) - we'll fetch the details..."
              className="pl-10 bg-secondary border-border"
            />
            {isFetching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
            )}
          </div>

          {/* Preview Image */}
          {newItemImage && (
            <div className="relative w-full h-32 rounded-lg overflow-hidden bg-secondary">
              <img
                src={newItemImage}
                alt="preview"
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setNewItemImage("")}
                className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Manual Image URL Input (shown when no image is set) */}
          {!newItemImage && (
            <div className="relative">
              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={manualImageInput}
                onChange={(e) => setManualImageInput(e.target.value)}
                onBlur={() => {
                  if (manualImageInput && isValidUrl(manualImageInput)) {
                    setNewItemImage(manualImageInput)
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && manualImageInput && isValidUrl(manualImageInput)) {
                    setNewItemImage(manualImageInput)
                  }
                }}
                placeholder="add image url (optional)..."
                className="pl-10 bg-secondary border-border"
              />
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Select
              value={newItemCategory}
              onValueChange={(v) => setNewItemCategory(v as Category)}
            >
              <SelectTrigger className="w-full sm:w-[180px] bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {(Object.keys(categoryLabels) as Category[]).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    <span className="flex items-center gap-2">
                      <span>{categoryIcons[cat]}</span>
                      <span>{categoryLabels[cat]}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="item name..."
              className="flex-1 bg-secondary border-border"
              onKeyDown={(e) => e.key === "Enter" && addItem()}
            />
          </div>
          <Input
            value={newItemDescription}
            onChange={(e) => setNewItemDescription(e.target.value)}
            placeholder="brief description (optional)..."
            className="bg-secondary border-border"
            onKeyDown={(e) => e.key === "Enter" && addItem()}
          />
          <Button
            onClick={addItem}
            disabled={!newItemName.trim()}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            add to stack
          </Button>
        </CardContent>
      </Card>

      {/* Stack Preview */}
      {items.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              your stack ({items.length} items)
            </h2>
          </div>

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
                  {groupedItems[category].map((item) => (
                    <div
                      key={item.id}
                      className="p-3 flex items-start gap-3 group hover:bg-secondary/30 transition-colors"
                    >
                      {item.image && (
                        <div className="w-12 h-12 rounded-md overflow-hidden shrink-0 bg-secondary">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">
                            {item.name}
                          </p>
                          {item.url && (
                            <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                          )}
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Share Section */}
          <div className="pt-4 space-y-4">
            {!shareUrl ? (
              <Button
                onClick={handleShare}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                size="lg"
                disabled={isSharing}
              >
                {isSharing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4 mr-2" />
                )}
                {isSharing ? "creating short link..." : "generate share link"}
              </Button>
            ) : (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm text-primary font-medium">
                    share link generated!
                  </p>
                  {isSharing && shareId && (
                    <p className="text-xs text-muted-foreground">
                      updating the shared stack...
                    </p>
                  )}
                  {shareError && (
                    <p className="text-xs text-muted-foreground">
                      {shareError}
                    </p>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={shareUrl}
                      readOnly
                      className="bg-secondary border-border text-sm sm:flex-1"
                    />
                    <div className="flex gap-2">
                      <Button asChild variant="outline" className="flex-1 border-border sm:flex-none">
                        <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          open link
                        </a>
                      </Button>
                      <Button
                        onClick={copyToClipboard}
                        variant="outline"
                        className="shrink-0 border-border"
                      >
                        {copied ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {items.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">no items yet</p>
          <p className="text-sm mt-1">
            add your first focus tool to get started
          </p>
        </div>
      )}
    </div>
  )
}
