export const MOOD_OPTIONS = [
  { v: 1, e: "😞", label: "Muito ruim" },
  { v: 2, e: "🙁", label: "Ruim" },
  { v: 3, e: "😐", label: "Neutro" },
  { v: 4, e: "🙂", label: "Bom" },
  { v: 5, e: "😄", label: "Muito bom" },
]

export const MOOD_COLORS: Record<number, string> = {
  1: "#B5566B", 2: "#D6A23C", 3: "#9C6B2E", 4: "#6B7A3A", 5: "#3C6B5A",
}

export const MODULE_COLORS = [
  "#C1502E", "#3C6B5A", "#6B7A3A", "#4A3B6B", "#9C6B2E",
  "#B5566B", "#2E6B62", "#5C4A3A", "#8B5A9F", "#5A7A8B",
]

export function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function weekKey(): string {
  const d = new Date()
  const onejan = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7)
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`
}

export function dateOffsetKey(baseKey: string, days: number): string {
  const [y, m, d] = baseKey.split("-").map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
}

export function endOfWeekKey(baseKey: string): string {
  const [y, m, d] = baseKey.split("-").map(Number)
  const dt = new Date(y, m - 1, d)
  const dow = dt.getDay()
  const daysToSunday = (7 - dow) % 7
  dt.setDate(dt.getDate() + daysToSunday)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
}

export function formatTaskDateLabel(dayKey: string): string {
  const today = todayKey()
  if (dayKey === today) return "hoje"
  if (dayKey === dateOffsetKey(today, 1)) return "amanhã"
  if (dayKey === dateOffsetKey(today, -1)) return "ontem"
  const [y, m, d] = dayKey.split("-").map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })
}

export function formatDateLabel(): string {
  return new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" })
}

export function lastNDays(n: number): string[] {
  const arr: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    arr.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
  }
  return arr
}

export function nowTime(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export function periodKeyFor(period: string): string {
  return period === "week" ? weekKey() : todayKey()
}

export type ModuleKind = "dashboard" | "checklist" | "mental_humor" | "tasks" | "history"

export interface Module {
  key: string
  label: string
  accent: string
  kind: string
  period: string
  builtin: boolean
  position: number
}

export interface ModuleGroup {
  id: string
  name: string
  position: number
  items: ModuleGroupItem[]
}

export interface ModuleGroupItem {
  id: string
  groupId: string
  moduleKey: string
  position: number
}

export interface ChecklistItem {
  id: string
  module: string
  label: string
  position: number
  active: boolean
}

export interface ChecklistStatus {
  itemId: string
  periodKey: string
  checked: boolean
}

export interface Task {
  id: string
  label: string
  done: boolean
  position: number
  dayKey: string
  priority: string
}

export interface MoodMoment {
  id: string
  dayKey: string
  time: string
  value: number
  note: string | null
}

export interface MoodDaily {
  dayKey: string
  value: number
  note: string | null
}

export interface WaterLog {
  dayKey: string
  count: number
}

export interface MacrosLog {
  dayKey: string
  carbs: number
  protein: number
  fat: number
}

export interface PyramidDay {
  dayKey: string
  counts: Record<string, number>
}

export interface GratitudeDay {
  dayKey: string
  items: string[]
}

export interface PyramidGroup {
  id: string
  label: string
  goal: number
  color: string
  icon: string
  note?: string
}

export interface NutritionSettings {
  weight: number
  cupSizeMl: number
  waterAutoCalc: boolean
  waterGoalOverride: number
  macros: { carbs: { goal: number; unit: string }; protein: { goal: number; unit: string }; fat: { goal: number; unit: string } }
  pyramidGroups: PyramidGroup[]
}

export function defaultNutritionSettings(): NutritionSettings {
  return {
    weight: 70,
    cupSizeMl: 250,
    waterAutoCalc: true,
    waterGoalOverride: 8,
    macros: {
      carbs: { goal: 250, unit: "g" },
      protein: { goal: 80, unit: "g" },
      fat: { goal: 60, unit: "g" },
    },
    pyramidGroups: [
      { id: "g_acucar", label: "Açúcares e gorduras", goal: 1, color: "#B5566B", icon: "🍭", note: "use com moderação" },
      { id: "g_protei", label: "Carnes, ovos, leite", goal: 3, color: "#C1502E", icon: "🥩" },
      { id: "g_frutas", label: "Frutas", goal: 3, color: "#D6A23C", icon: "🍎" },
      { id: "g_verdur", label: "Verduras e legumes", goal: 4, color: "#6B7A3A", icon: "🥬" },
      { id: "g_cereai", label: "Cereais e grãos", goal: 6, color: "#9C6B2E", icon: "🍞" },
    ],
  }
}