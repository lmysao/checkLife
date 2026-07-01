"use client"

import { useEffect } from "react"
import { useStore, type SyncStatus } from "@/lib/store"
import { ModuleTabs } from "./ModuleTabs"
import { Dashboard } from "./Dashboard"
import { ChecklistModule } from "./ChecklistModule"
import { BemEstarModule } from "./BemEstarModule"
import { TasksModule } from "./TasksModule"
import { HistoryModule } from "./HistoryModule"
import { toast, Toaster } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCw, Check, AlertCircle, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

function SyncIndicator({ status, lastSyncAt }: { status: SyncStatus; lastSyncAt: number | null }) {
  const config = {
    disconnected: { icon: <AlertCircle className="w-2.5 h-2.5" />, label: "Offline", color: "text-muted-foreground" },
    syncing: { icon: <RefreshCw className="w-2.5 h-2.5 animate-spin" />, label: "Salvando...", color: "text-muted-foreground" },
    synced: { icon: <Check className="w-2.5 h-2.5" />, label: "Sincronizado", color: "text-green-600" },
    error: { icon: <AlertCircle className="w-2.5 h-2.5" />, label: "Erro", color: "text-red-500" },
  }[status]

  const timeStr = lastSyncAt
    ? new Date(lastSyncAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : ""

  return (
    <div className={`flex items-center gap-1 text-[9px] font-mono ${config.color}`}>
      {config.icon}
      <span>{config.label}</span>
      {timeStr && <span className="opacity-70">{timeStr}</span>}
    </div>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-secondary transition-colors"
      type="button"
      aria-label="Alternar modo escuro"
    >
      {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
    </button>
  )
}

export function RitualApp() {
  const loaded = useStore(s => s.loaded)
  const activeTab = useStore(s => s.activeTab)
  const fetchInitialData = useStore(s => s.fetchInitialData)
  const modules = useStore(s => s.modules)
  const groups = useStore(s => s.groups)
  const syncStatus = useStore(s => s.syncStatus)
  const lastSyncAt = useStore(s => s.lastSyncAt)

  useEffect(() => {
    fetchInitialData().then(() => toast.success("Dados carregados"))
  }, [fetchInitialData])

  if (!loaded) {
    return (
      <div className="max-w-[480px] mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    )
  }

  const currentModule = modules.find(m => m.key === activeTab)
  const activeGroup = groups.find(g => g.items.some(i => i.moduleKey === activeTab))
  const isStacked = activeGroup?.stacked ?? false

  return (
    <div className="max-w-[480px] mx-auto px-4 pt-4 pb-28 min-h-screen flex flex-col">
      <header className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
          Ritual diário
        </h1>
        <div className="flex items-center gap-2">
          <SyncIndicator status={syncStatus} lastSyncAt={lastSyncAt} />
          <ThemeToggle />
        </div>
      </header>
      <ModuleTabs />
      <main className="flex-1 mt-3 space-y-3">
        {activeTab === "resumo" && <Dashboard />}
        {activeTab === "tarefas" && <TasksModule />}
        {activeTab === "historico" && <HistoryModule />}
        {activeTab === "bemestar" && <BemEstarModule />}

        {isStacked && activeGroup && (
          <div className="space-y-3">
            {activeGroup.items.map(item => {
              const mod = modules.find(m => m.key === item.moduleKey)
              if (!mod) return null
              return (
                <div key={item.moduleKey} className="space-y-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: mod.accent }} />
                    <h3 className="text-sm font-bold" style={{ color: mod.accent }}>{mod.label}</h3>
                  </div>
                  {mod.kind === "checklist" && <ChecklistModule moduleKey={mod.key} />}
                </div>
              )
            })}
          </div>
        )}

        {!isStacked && currentModule?.kind === "checklist" && !["resumo", "tarefas", "historico", "bemestar"].includes(activeTab) && (
          <ChecklistModule moduleKey={activeTab} />
        )}

        {!["resumo", "tarefas", "historico", "bemestar"].includes(activeTab) && !currentModule && (
          <p className="text-center text-muted-foreground py-8">Módulo não encontrado.</p>
        )}
      </main>
      <StickyFooter />
      <Toaster position="bottom-center" richColors />
    </div>
  )
}

function StickyFooter() {
  const modules = useStore(s => s.modules)
  const checklistItems = useStore(s => s.checklistItems)
  const statuses = useStore(s => s.statuses)
  const today = new Date()
  const dayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  const dayModules = modules.filter(m => m.kind === "checklist" && m.period === "day")
  let total = 0, done = 0
  dayModules.forEach(mk => {
    const items = checklistItems.filter(i => i.module === mk.key && i.active)
    total += items.length
    items.forEach(it => {
      const st = statuses.find(s => s.itemId === it.id && s.periodKey === dayKey)
      if (st?.checked) done++
    })
  })
  const pct = total ? Math.round(done / total * 100) : 0

  let best = 0
  for (const mk of dayModules) {
    let streak = 0
    for (let i = 0; i < 365; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      const items = checklistItems.filter(it => it.module === mk.key && it.active)
      if (items.length === 0) break
      const allChecked = items.every(it => statuses.find(s => s.itemId === it.id && s.periodKey === k)?.checked)
      if (allChecked) streak++
      else break
    }
    if (streak > best) best = streak
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-card border-t border-border px-4 py-2 flex items-center justify-between z-50">
      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
        {today.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
      </span>
      <div className="flex gap-2.5 items-center text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
        <span>{pct}% hoje</span>
        <span>·</span>
        <span>🔥 {best}</span>
      </div>
    </footer>
  )
}