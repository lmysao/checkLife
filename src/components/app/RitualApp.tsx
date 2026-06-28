"use client"

import { useEffect } from "react"
import { useStore } from "@/lib/store"
import { ModuleTabs } from "./ModuleTabs"
import { Dashboard } from "./Dashboard"
import { ChecklistModule } from "./ChecklistModule"
import { BemEstarModule } from "./BemEstarModule"
import { TasksModule } from "./TasksModule"
import { HistoryModule } from "./HistoryModule"
import { toast, Toaster } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

export function RitualApp() {
  const loaded = useStore(s => s.loaded)
  const activeTab = useStore(s => s.activeTab)
  const fetchInitialData = useStore(s => s.fetchInitialData)
  const modules = useStore(s => s.modules)

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

  return (
    <div className="max-w-[480px] mx-auto px-4 pt-4 pb-28 min-h-screen flex flex-col">
      <header className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
          Ritual diário
        </h1>
      </header>
      <ModuleTabs />
      <main className="flex-1 mt-3 space-y-3">
        {activeTab === "resumo" && <Dashboard />}
        {currentModule?.kind === "checklist" && <ChecklistModule moduleKey={activeTab} />}
        {currentModule?.kind === "mental_humor" && <BemEstarModule />}
        {activeTab === "tarefas" && <TasksModule />}
        {activeTab === "historico" && <HistoryModule />}
        {!["resumo", "tarefas", "historico"].includes(activeTab) && !currentModule && (
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
  const tasks = useStore(s => s.tasks)
  const today = new Date()
  const dayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  const dayModules = modules.filter(m => m.kind === "checklist" && m.period === "day")
  let total = 0, done = 0
  dayModules.forEach(key => {
    const items = checklistItems.filter(i => i.module === key.key && i.active)
    total += items.length
    items.forEach(it => {
      const st = statuses.find(s => s.itemId === it.id && s.periodKey === dayKey)
      if (st?.checked) done++
    })
  })
  const pct = total ? Math.round(done / total * 100) : 0

  // Best streak
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