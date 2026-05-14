"use client"

import { ReactNode, useEffect, useRef, useState } from "react"
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Plus, X, Share2, Check, Copy, Link as LinkIcon, Loader2, ExternalLink, ImageIcon, ChevronDown, PencilLine, GripVertical } from "lucide-react"
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
import { StackItem, Category, categoryLabels, categoryIcons, categoryOrder, getOrderedCategories } from "@/lib/types"
import { buildStoredShareUrl } from "@/lib/share-links"
import { generateShareUrl } from "@/lib/stack-utils"

const STACK_STORAGE_KEY = "lock-in-stack-builder"
const CATEGORY_DRAG_ID_PREFIX = "category:"
const ITEM_DRAG_ID_PREFIX = "item:"

interface PersistedBuilderState {
  title: string
  items: StackItem[]
  hasGeneratedShareLink?: boolean
  shareId?: string | null
}

function getCategoryDragId(category: Category) {
  return `${CATEGORY_DRAG_ID_PREFIX}${category}`
}

function getItemDragId(itemId: string) {
  return `${ITEM_DRAG_ID_PREFIX}${itemId}`
}

function reorderCategories(items: StackItem[], activeCategory: Category, overCategory: Category) {
  const orderedCategories = getOrderedCategories(items)
  const activeIndex = orderedCategories.indexOf(activeCategory)
  const overIndex = orderedCategories.indexOf(overCategory)

  if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
    return items
  }

  const reorderedCategories = arrayMove(orderedCategories, activeIndex, overIndex)
  return reorderedCategories.flatMap((category) =>
    items.filter((item) => item.category === category)
  )
}

function reorderItemsWithinCategory(items: StackItem[], activeItemId: string, overItemId: string) {
  const activeItem = items.find((item) => item.id === activeItemId)
  const overItem = items.find((item) => item.id === overItemId)

  if (!activeItem || !overItem || activeItem.category !== overItem.category) {
    return items
  }

  const categoryItemIds = items
    .filter((item) => item.category === activeItem.category)
    .map((item) => item.id)
  const activeIndex = categoryItemIds.indexOf(activeItemId)
  const overIndex = categoryItemIds.indexOf(overItemId)

  if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
    return items
  }

  const reorderedIds = arrayMove(categoryItemIds, activeIndex, overIndex)
  const reorderedItems = reorderedIds
    .map((itemId) => items.find((item) => item.id === itemId))
    .filter((item): item is StackItem => Boolean(item))
  let reorderedIndex = 0

  return items.map((item) =>
    item.category === activeItem.category ? reorderedItems[reorderedIndex++] : item
  )
}

function SortableCategorySection({
  category,
  itemCount,
  collapsed,
  onToggle,
  children,
}: {
  category: Category
  itemCount: number
  collapsed: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: getCategoryDragId(category),
      data: {
        type: "category",
        category,
      },
    })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`overflow-hidden rounded-xl border border-border bg-card ${
        isDragging ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-center gap-2 bg-secondary/50 px-2 py-2">
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background/70 hover:text-foreground"
          aria-label={`drag ${categoryLabels[category]} section`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-foreground transition-colors hover:bg-background/40"
        >
          <span>{categoryIcons[category]}</span>
          <span>{categoryLabels[category]}</span>
          <span className="text-xs text-muted-foreground">({itemCount})</span>
          <ChevronDown
            className={`ml-auto h-4 w-4 text-muted-foreground transition-transform ${
              collapsed ? "-rotate-90" : ""
            }`}
          />
        </button>
      </div>
      {!collapsed && children}
    </div>
  )
}

function SortableItemRow({
  item,
  children,
}: {
  item: StackItem
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: getItemDragId(item.id),
      data: {
        type: "item",
        itemId: item.id,
        category: item.category,
      },
    })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`flex items-start gap-2 ${isDragging ? "opacity-70" : ""}`}
    >
      <button
        type="button"
        className="mt-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
        aria-label={`drag ${item.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export function StackBuilder() {
  const [title, setTitle] = useState("my lock in stack")
  const [items, setItems] = useState<StackItem[]>([])
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemName, setEditingItemName] = useState("")
  const [editingItemDescription, setEditingItemDescription] = useState("")
  const [editingItemUrl, setEditingItemUrl] = useState("")
  const [editingItemImage, setEditingItemImage] = useState("")
  const [editingItemCategory, setEditingItemCategory] = useState<Category>("apps")
  const [editingManualImageInput, setEditingManualImageInput] = useState("")
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
  const [isFetchingEditMetadata, setIsFetchingEditMetadata] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<Category>>(new Set())
  const [hasLoadedPersistedStack, setHasLoadedPersistedStack] = useState(false)
  const metadataRequestIdRef = useRef(0)
  const editMetadataRequestIdRef = useRef(0)
  const latestUrlRef = useRef("")
  const latestEditUrlRef = useRef("")
  const lastSharedSnapshotRef = useRef<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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

  const resetEditingItemFields = () => {
    setEditingItemName("")
    setEditingItemDescription("")
    setEditingItemUrl("")
    setEditingItemImage("")
    setEditingItemCategory("apps")
    setEditingManualImageInput("")
  }

  const cancelEditingItem = () => {
    editMetadataRequestIdRef.current += 1
    latestEditUrlRef.current = ""
    setEditingItemId(null)
    setIsFetchingEditMetadata(false)
    resetEditingItemFields()
  }

  const startEditingItem = (item: StackItem) => {
    editMetadataRequestIdRef.current += 1
    latestEditUrlRef.current = item.url ?? ""
    setEditingItemId(item.id)
    setIsFetchingEditMetadata(false)
    setEditingItemName(item.name)
    setEditingItemDescription(item.description ?? "")
    setEditingItemUrl(item.url ?? "")
    setEditingItemImage(item.image ?? "")
    setEditingManualImageInput(item.image ?? "")
    setEditingItemCategory(item.category)
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

  const fetchEditingMetadata = async (url: string) => {
    const normalizedUrl = url.trim()

    if (!isValidUrl(normalizedUrl)) return

    const requestId = editMetadataRequestIdRef.current
    setIsFetchingEditMetadata(true)

    try {
      const response = await fetch(`/api/og?url=${encodeURIComponent(normalizedUrl)}`)
      if (response.ok) {
        const data = await response.json()
        if (
          editMetadataRequestIdRef.current !== requestId ||
          latestEditUrlRef.current !== normalizedUrl
        ) {
          return
        }

        setEditingItemName(data.title || "")
        setEditingItemDescription(data.description || "")
        setEditingItemImage(data.image || "")
        setEditingManualImageInput("")
      }
    } catch (error) {
      console.error("Failed to fetch metadata:", error)
    } finally {
      if (
        editMetadataRequestIdRef.current === requestId &&
        latestEditUrlRef.current === normalizedUrl
      ) {
        setIsFetchingEditMetadata(false)
      }
    }
  }

  const handleEditUrlChange = (value: string) => {
    editMetadataRequestIdRef.current += 1
    latestEditUrlRef.current = value.trim()
    setIsFetchingEditMetadata(false)

    if (value.trim() !== editingItemUrl.trim()) {
      setEditingItemName("")
      setEditingItemDescription("")
      setEditingItemImage("")
      setEditingManualImageInput("")
    }

    setEditingItemUrl(value)
  }

  const handleEditUrlBlur = () => {
    if (editingItemUrl && isValidUrl(editingItemUrl)) {
      fetchEditingMetadata(editingItemUrl)
    }
  }

  const addItem = () => {
    const trimmedName = newItemName.trim()
    if (!trimmedName) return

    const item: StackItem = {
      id: crypto.randomUUID(),
      name: trimmedName,
      description: newItemDescription.trim() || undefined,
      category: newItemCategory,
      url: newItemUrl.trim() || undefined,
      image: newItemImage || undefined,
    }

    setItems((prev) => [...prev, item])
    metadataRequestIdRef.current += 1
    latestUrlRef.current = ""
    setIsFetching(false)
    resetPendingItemFields()
    setNewItemUrl("")
  }

  const saveEditedItem = () => {
    const trimmedName = editingItemName.trim()
    if (!editingItemId || !trimmedName) return

    setItems((prev) =>
      prev.map((item) =>
        item.id === editingItemId
          ? {
              ...item,
              name: trimmedName,
              description: editingItemDescription.trim() || undefined,
              category: editingItemCategory,
              url: editingItemUrl.trim() || undefined,
              image: editingItemImage || undefined,
            }
          : item
      )
    )

    cancelEditingItem()
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))

    if (editingItemId === id) {
      cancelEditingItem()
    }
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

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return

    const activeData = active.data.current
    const overData = over.data.current

    if (!activeData || !overData) return

    setItems((prev) => {
      if (
        activeData.type === "category" &&
        overData.type === "category"
      ) {
        return reorderCategories(prev, activeData.category, overData.category)
      }

      if (
        activeData.type === "item" &&
        overData.type === "item"
      ) {
        return reorderItemsWithinCategory(prev, activeData.itemId, overData.itemId)
      }

      return prev
    })
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
  const orderedCategories = getOrderedCategories(items)

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
                {categoryOrder.map((cat) => (
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

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedCategories.map((category) => getCategoryDragId(category))}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-6">
                {orderedCategories.map((category) => (
                  <SortableCategorySection
                    key={category}
                    category={category}
                    itemCount={groupedItems[category].length}
                    collapsed={collapsedCategories.has(category)}
                    onToggle={() => toggleCategory(category)}
                  >
                    <SortableContext
                      items={groupedItems[category].map((item) => getItemDragId(item.id))}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-1 p-2">
                        {groupedItems[category].map((item) => (
                          <SortableItemRow key={item.id} item={item}>
                            {editingItemId === item.id ? (
                              <div className="space-y-4 rounded-lg bg-secondary/40 p-4">
                                <div className="relative">
                                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                  <Input
                                    value={editingItemUrl}
                                    onChange={(e) => handleEditUrlChange(e.target.value)}
                                    onBlur={handleEditUrlBlur}
                                    placeholder="paste a link (optional) - we'll fetch the details..."
                                    className="pl-10 bg-background border-border"
                                  />
                                  {isFetchingEditMetadata && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                                  )}
                                </div>

                                {editingItemImage && (
                                  <div className="relative h-32 w-full overflow-hidden rounded-lg bg-background">
                                    <img
                                      src={editingItemImage}
                                      alt="preview"
                                      className="h-full w-full object-cover"
                                    />
                                    <button
                                      onClick={() => setEditingItemImage("")}
                                      className="absolute top-2 right-2 rounded-full bg-background/80 p-1 text-foreground hover:bg-background"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}

                                {!editingItemImage && (
                                  <div className="relative">
                                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                      value={editingManualImageInput}
                                      onChange={(e) => setEditingManualImageInput(e.target.value)}
                                      onBlur={() => {
                                        if (
                                          editingManualImageInput &&
                                          isValidUrl(editingManualImageInput)
                                        ) {
                                          setEditingItemImage(editingManualImageInput)
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (
                                          e.key === "Enter" &&
                                          editingManualImageInput &&
                                          isValidUrl(editingManualImageInput)
                                        ) {
                                          setEditingItemImage(editingManualImageInput)
                                        }
                                      }}
                                      placeholder="add image url (optional)..."
                                      className="pl-10 bg-background border-border"
                                    />
                                  </div>
                                )}

                                <div className="flex flex-col gap-3 sm:flex-row">
                                  <Select
                                    value={editingItemCategory}
                                    onValueChange={(value) => setEditingItemCategory(value as Category)}
                                  >
                                    <SelectTrigger className="w-full bg-background border-border sm:w-[180px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover border-border">
                                      {categoryOrder.map((cat) => (
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
                                    value={editingItemName}
                                    onChange={(e) => setEditingItemName(e.target.value)}
                                    placeholder="item name..."
                                    className="flex-1 bg-background border-border"
                                    onKeyDown={(e) => e.key === "Enter" && saveEditedItem()}
                                  />
                                </div>

                                <Input
                                  value={editingItemDescription}
                                  onChange={(e) => setEditingItemDescription(e.target.value)}
                                  placeholder="brief description (optional)..."
                                  className="bg-background border-border"
                                  onKeyDown={(e) => e.key === "Enter" && saveEditedItem()}
                                />

                                <div className="flex flex-col gap-2 sm:flex-row">
                                  <Button
                                    onClick={saveEditedItem}
                                    disabled={!editingItemName.trim()}
                                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                                  >
                                    <Check className="w-4 h-4 mr-2" />
                                    save changes
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="border-border"
                                    onClick={cancelEditingItem}
                                  >
                                    cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="group flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-secondary/30">
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
                                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={() => startEditingItem(item)}
                                  >
                                    <PencilLine className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeItem(item.id)}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </SortableItemRow>
                        ))}
                      </div>
                    </SortableContext>
                  </SortableCategorySection>
                ))}
              </div>
            </SortableContext>
          </DndContext>

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
