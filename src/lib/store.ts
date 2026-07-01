import { create } from "zustand"
import {
  type Module, type ModuleGroup, type ChecklistItem, type ChecklistStatus,
  type Task, type MoodMoment, type MoodDaily, type WaterLog, type MacrosLog,
  type PyramidDay, type GratitudeDay, type NutritionSettings, defaultNutritionSettings,
  todayKey,
} from "./helpers"

export type SyncStatus = "syncing" | "synced" | "error" | "disconnected"

interface AppState {
  loaded: boolean
  activeTab: string
  modules: Module[]
  groups: ModuleGroup[]
  checklistItems: ChecklistItem[]
  statuses: ChecklistStatus[]
  tasks: Task[]
  moodMoments: MoodMoment[]
  moodDailies: MoodDaily[]
  waterLogs: WaterLog[]
  macrosLogs: MacrosLog[]
  pyramidLogs: PyramidDay[]
  gratitudeLogs: GratitudeDay[]
  nutritionSettings: NutritionSettings
  editMode: Record<string, boolean>
  syncStatus: SyncStatus
  lastSyncAt: number | null
  _setSyncStatus: (status: SyncStatus) => void

  fetchInitialData: () => Promise<void>
  setActiveTab: (tab: string) => void
  toggleCheck: (itemId: string, periodKey: string) => Promise<void>
  addChecklistItem: (moduleKey: string, label: string) => Promise<void>
  updateChecklistItemLabel: (id: string, label: string) => Promise<void>
  deleteChecklistItem: (id: string) => Promise<void>
  moveChecklistItem: (id: string, dir: number) => Promise<void>
  setEditMode: (key: string, val: boolean) => void
  addTask: (label: string, dayKey: string, priority: string) => Promise<void>
  toggleTask: (id: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  moveTask: (id: string, dir: number) => Promise<void>
  moveTaskToDay: (id: string, newDayKey: string) => Promise<void>
  addMoodMoment: (dayKey: string, time: string, value: number, note?: string) => Promise<void>
  deleteMoodMoment: (id: string) => Promise<void>
  saveMoodDaily: (dayKey: string, value: number, note?: string) => Promise<void>
  setWater: (dayKey: string, count: number) => Promise<void>
  addMacro: (dayKey: string, field: string, grams: number) => Promise<void>
  setPyramidCounts: (dayKey: string, counts: Record<string, number>) => Promise<void>
  saveGratitude: (dayKey: string, items: string[]) => Promise<void>
  saveNutritionSettings: (s: NutritionSettings) => Promise<void>
  createModule: (label: string, accent: string) => Promise<void>
  updateModule: (key: string, data: Partial<Module>) => Promise<void>
  deleteModule: (key: string) => Promise<void>
  createGroup: (name: string, stacked?: boolean) => Promise<void>
  updateGroup: (id: string, data: { name?: string; position?: number; stacked?: boolean }) => Promise<void>
  deleteGroup: (id: string) => Promise<void>
  addModuleToGroup: (groupId: string, moduleKey: string) => Promise<void>
  removeModuleFromGroup: (itemId: string) => Promise<void>
}

// Sync-aware API wrapper
const api = (url: string, opts?: RequestInit, trackSync = true) => {
  if (trackSync) useStore.getState()._setSyncStatus("syncing")
  return fetch(url, { headers: { "Content-Type": "application/json" }, ...opts })
    .then(r => {
      if (!r.ok) throw new Error(`${r.status}`)
      return r.json()
    })
    .then(data => {
      if (trackSync) {
        useStore.setState({ syncStatus: "synced", lastSyncAt: Date.now() })
      }
      return data
    })
    .catch(err => {
      if (trackSync) {
        useStore.setState({ syncStatus: "error" })
      }
      throw err
    })
}

export const useStore = create<AppState>((set, get) => ({
  loaded: false,
  activeTab: "resumo",
  modules: [],
  groups: [],
  checklistItems: [],
  statuses: [],
  tasks: [],
  moodMoments: [],
  moodDailies: [],
  waterLogs: [],
  macrosLogs: [],
  pyramidLogs: [],
  gratitudeLogs: [],
  nutritionSettings: defaultNutritionSettings(),
  editMode: {},
  syncStatus: "disconnected",
  lastSyncAt: null,

  // Internal sync tracking
  _setSyncStatus: (status: SyncStatus) => set({ syncStatus: status }),

  fetchInitialData: async () => {
    set({ syncStatus: "syncing" })
    try {
      let [modules, groups, items, statuses, tasks, mood, water, macros, pyramid, gratitude, nutri] = await Promise.all([
        api("/api/modules", undefined, false),
        api("/api/module-groups", undefined, false),
        api("/api/checklist-items", undefined, false),
        api("/api/checklist-status", undefined, false),
        api("/api/tasks", undefined, false),
        api(`/api/mood?day=${todayKey()}`, undefined, false),
        api("/api/water", undefined, false),
        api("/api/macros", undefined, false),
        api("/api/pyramid", undefined, false),
        api("/api/gratitude", undefined, false),
        api("/api/nutrition-settings", undefined, false),
      ])
      
      // Auto-seed if no modules exist
      if (!modules || modules.length === 0) {
        await api("/api/seed", { method: "POST" }, false)
        // Refetch after seeding
        const [newModules, newGroups, newItems] = await Promise.all([
          api("/api/modules", undefined, false),
          api("/api/module-groups", undefined, false),
          api("/api/checklist-items", undefined, false),
        ])
        modules = newModules || []
        groups = newGroups || []
        items = newItems || []
      }
      
      set({
        loaded: true,
        syncStatus: "synced",
        lastSyncAt: Date.now(),
        modules: modules || [],
        groups: (groups || []).map((g: any) => ({ ...g, stacked: g.stacked ?? false })),
        checklistItems: items || [],
        statuses: statuses || [],
        tasks: tasks || [],
        moodMoments: mood?.moments || [],
        moodDailies: mood?.dailies ? [mood.daily].filter(Boolean) : [],
        waterLogs: (water || []).map((w: any) => ({ dayKey: w.dayKey, count: w.count })),
        macrosLogs: (macros || []).map((m: any) => ({ dayKey: m.dayKey, carbs: m.carbs, protein: m.protein, fat: m.fat })),
        pyramidLogs: (pyramid || []).map((p: any) => ({ dayKey: p.dayKey, counts: typeof p.counts === "string" ? JSON.parse(p.counts) : p.counts })),
        gratitudeLogs: (gratitude || []).map((g: any) => ({ dayKey: g.dayKey, items: typeof g.items === "string" ? JSON.parse(g.items) : g.items })),
        nutritionSettings: nutri?.id ? (typeof nutri.settings === "string" ? { ...defaultNutritionSettings(), ...JSON.parse(nutri.settings) } : { ...defaultNutritionSettings(), ...nutri }) : defaultNutritionSettings(),
      })
    } catch {
      set({ loaded: true, syncStatus: "error" })
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  toggleCheck: async (itemId, periodKey) => {
    const st = get().statuses.find(s => s.itemId === itemId && s.periodKey === periodKey)
    const newVal = st ? !st.checked : true
    await api("/api/checklist-status", { method: "POST", body: JSON.stringify({ itemId, periodKey, checked: newVal }) })
    const statuses = get().statuses.filter(s => !(s.itemId === itemId && s.periodKey === periodKey))
    if (newVal || st) statuses.push({ itemId, periodKey, checked: newVal })
    set({ statuses })
  },

  addChecklistItem: async (moduleKey, label) => {
    const item = await api("/api/checklist-items", { method: "POST", body: JSON.stringify({ module: moduleKey, label }) })
    set(s => ({ checklistItems: [...s.checklistItems, item] }))
  },

  updateChecklistItemLabel: async (id, label) => {
    await api("/api/checklist-items", { method: "PUT", body: JSON.stringify({ id, label }) })
    set(s => ({ checklistItems: s.checklistItems.map(i => i.id === id ? { ...i, label } : i) }))
  },

  deleteChecklistItem: async (id) => {
    await api(`/api/checklist-items?id=${id}`, { method: "DELETE" })
    set(s => ({
      checklistItems: s.checklistItems.filter(i => i.id !== id),
      statuses: s.statuses.filter(st => st.itemId !== id),
    }))
  },

  moveChecklistItem: async (id, dir) => {
    await api("/api/checklist-items", { method: "PUT", body: JSON.stringify({ id, module: "_", label: dir < 0 ? "up" : "down" }) })
    const item = get().checklistItems.find(i => i.id === id)
    if (item) {
      const items = await api(`/api/checklist-items?module=${item.module}`)
      set({ checklistItems: get().checklistItems.filter(i => i.module !== item.module).concat(items || []) })
    }
  },

  setEditMode: (key, val) => set(s => ({ editMode: { ...s.editMode, [key]: val } })),

  addTask: async (label, dayKey, priority) => {
    const task = await api("/api/tasks", { method: "POST", body: JSON.stringify({ label, dayKey, priority }) })
    set(s => ({ tasks: [...s.tasks, task] }))
  },

  toggleTask: async (id) => {
    const t = get().tasks.find(t => t.id === id)
    if (!t) return
    const done = !t.done
    await api("/api/tasks", { method: "PUT", body: JSON.stringify({ id, done }) })
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, done } : t) }))
  },

  deleteTask: async (id) => {
    await api(`/api/tasks?id=${id}`, { method: "DELETE" })
    set(s => ({ tasks: s.tasks.filter(t => t.id !== id) }))
  },

  moveTask: async (id, dir) => {
    await api("/api/tasks", { method: "PUT", body: JSON.stringify({ id, moveDir: dir }) })
    const tasks = await api("/api/tasks")
    set({ tasks: tasks || [] })
  },

  moveTaskToDay: async (id, newDayKey) => {
    await api("/api/tasks", { method: "PUT", body: JSON.stringify({ id, dayKey: newDayKey }) })
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, dayKey: newDayKey } : t) }))
  },

  addMoodMoment: async (dayKey, time, value, note) => {
    const m = await api("/api/mood", { method: "POST", body: JSON.stringify({ dayKey, time, value, note: note || null }) })
    set(s => ({ moodMoments: [...s.moodMoments, m] }))
  },

  deleteMoodMoment: async (id) => {
    await api(`/api/mood?id=${id}`, { method: "DELETE" })
    set(s => ({ moodMoments: s.moodMoments.filter(m => m.id !== id) }))
  },

  saveMoodDaily: async (dayKey, value, note) => {
    const d = await api("/api/mood", { method: "PUT", body: JSON.stringify({ dayKey, value, note: note || null }) })
    set(s => {
      const filtered = s.moodDailies.filter(m => m.dayKey !== dayKey)
      return { moodDailies: [...filtered, d] }
    })
  },

  setWater: async (dayKey, count) => {
    await api("/api/water", { method: "POST", body: JSON.stringify({ dayKey, count }) })
    set(s => {
      const filtered = s.waterLogs.filter(w => w.dayKey !== dayKey)
      return { waterLogs: [...filtered, { dayKey, count }] }
    })
  },

  addMacro: async (dayKey, field, grams) => {
    await api("/api/macros", { method: "POST", body: JSON.stringify({ dayKey, field, grams }) })
    const m = await api(`/api/macros?day=${dayKey}`)
    set(s => {
      const filtered = s.macrosLogs.filter(l => l.dayKey !== dayKey)
      return { macrosLogs: [...filtered, m] }
    })
  },

  setPyramidCounts: async (dayKey, counts) => {
    await api("/api/pyramid", { method: "POST", body: JSON.stringify({ dayKey, counts }) })
    set(s => {
      const filtered = s.pyramidLogs.filter(p => p.dayKey !== dayKey)
      return { pyramidLogs: [...filtered, { dayKey, counts }] }
    })
  },

  saveGratitude: async (dayKey, items) => {
    await api("/api/gratitude", { method: "POST", body: JSON.stringify({ dayKey, items }) })
    set(s => {
      const filtered = s.gratitudeLogs.filter(g => g.dayKey !== dayKey)
      return { gratitudeLogs: [...filtered, { dayKey, items }] }
    })
  },

  saveNutritionSettings: async (s) => {
    const updated = await api("/api/nutrition-settings", { method: "PUT", body: JSON.stringify(s) })
    set({ nutritionSettings: updated })
  },

  createModule: async (label, accent) => {
    const key = `custom_${Date.now()}`
    const mod = await api("/api/modules", { method: "POST", body: JSON.stringify({ key, label, accent, kind: "checklist", period: "day", builtin: false, position: get().modules.length }) })
    set(s => ({ modules: [...s.modules, mod] }))
  },

  updateModule: async (key, data) => {
    const mod = await api("/api/modules", { method: "PUT", body: JSON.stringify({ key, ...data }) })
    set(s => ({ modules: s.modules.map(m => m.key === key ? { ...m, ...mod } : m) }))
  },

  deleteModule: async (key) => {
    await api(`/api/modules?key=${key}`, { method: "DELETE" })
    set(s => ({
      modules: s.modules.filter(m => m.key !== key),
      checklistItems: s.checklistItems.filter(i => i.module !== key),
    }))
    if (get().activeTab === key) set({ activeTab: "resumo" })
  },

  createGroup: async (name, stacked = false) => {
    const group = await api("/api/module-groups", { method: "POST", body: JSON.stringify({ name, stacked }) })
    set(s => ({ groups: [...s.groups, { ...group, items: [], stacked: group.stacked ?? false }] }))
  },

  updateGroup: async (id, data) => {
    await api("/api/module-groups", { method: "PUT", body: JSON.stringify({ id, ...data }) })
    set(s => ({ groups: s.groups.map(g => g.id === id ? { ...g, ...data } : g) }))
  },

  deleteGroup: async (id) => {
    await api(`/api/module-groups?id=${id}`, { method: "DELETE" })
    set(s => ({ groups: s.groups.filter(g => g.id !== id) }))
  },

  addModuleToGroup: async (groupId, moduleKey) => {
    await api("/api/module-groups/items", { method: "POST", body: JSON.stringify({ groupId, moduleKey }) })
    const groups = await api("/api/module-groups")
    set({ groups: (groups || []).map((g: any) => ({ ...g, stacked: g.stacked ?? false })) })
  },

  removeModuleFromGroup: async (itemId) => {
    await api(`/api/module-groups/items?id=${itemId}`, { method: "DELETE" })
    const groups = await api("/api/module-groups")
    set({ groups: (groups || []).map((g: any) => ({ ...g, stacked: g.stacked ?? false })) })
  },
}))