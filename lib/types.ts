export type Category = 
  | "books" 
  | "exercise" 
  | "food" 
  | "apps" 
  | "supplements" 
  | "habits" 
  | "music" 
  | "environment"

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

export const categoryLabels: Record<Category, string> = {
  books: "books",
  exercise: "exercise",
  food: "food & drinks",
  apps: "apps & tools",
  supplements: "supplements",
  habits: "habits",
  music: "music & audio",
  environment: "environment",
}

export const categoryIcons: Record<Category, string> = {
  books: "📚",
  exercise: "💪",
  food: "🍵",
  apps: "⚡",
  supplements: "💊",
  habits: "✨",
  music: "🎧",
  environment: "🏠",
}
