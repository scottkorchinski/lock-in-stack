export type Category = 
  | "apps" 
  | "environment"
  | "books" 
  | "exercise" 
  | "food" 
  | "habits" 
  | "music" 
  | "other"
  | "supplements" 
  | "techniques"

export interface StackItem {
  id: string
  category: Category
  name: string
  description?: string
  url?: string
  image?: string
}

export interface Stack {
  title: string
  items: StackItem[]
}

export function getOrderedCategories(items: Pick<StackItem, "category">[]): Category[] {
  const seen = new Set<Category>()
  const orderedCategories: Category[] = []

  for (const item of items) {
    if (seen.has(item.category)) continue

    seen.add(item.category)
    orderedCategories.push(item.category)
  }

  return orderedCategories
}

export const categoryOrder: Category[] = [
  "apps",
  "books",
  "environment",
  "exercise",
  "food",
  "habits",
  "music",
  "supplements",
  "techniques",
  "other",
]

export const categoryLabels: Record<Category, string> = {
  apps: "apps & tools",
  books: "books",
  environment: "environment",
  exercise: "exercise",
  food: "food & drinks",
  habits: "habits",
  music: "music & audio",
  other: "other",
  supplements: "supplements",
  techniques: "techniques",
}

export const categoryIcons: Record<Category, string> = {
  apps: "⚡",
  books: "📚",
  environment: "🏠",
  exercise: "💪",
  food: "🍵",
  habits: "✨",
  music: "🎧",
  other: "📦",
  supplements: "💊",
  techniques: "🎯",
}
