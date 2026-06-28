"use client"

import { useStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MOOD_OPTIONS, todayKey, formatDateLabel } from "@/lib/helpers"
import { Button } from "@/components/ui/button"

export function Dashboard() {
  const modules = useStore(s => s.modules)
  const checklistItems = useStore(s => s.checklistItems)
  const statuses = useStore(s => s.statuses)
  const tasks = useStore(s => s.tasks)
  const moodDailies = useStore(s => s.moodDailies)
  const waterLogs = useStore(s => s.waterLogs)
  const macrosLogs = useStore(s => s.macrosLogs)
  const pyramidLogs = useStore(s => s.pyramidLogs)
  const gratitudeLogs = useStore(s => s.gratitudeLogs)
  const nutritionSettings = useStore(s => s.nutritionSettings)
  const setActiveTab = useStore(s => s.setActiveTab)

  const day = todayKey()
  const dayModules = modules.filter(m => m.kind === "checklist" && m.period === "day")
  let totalItems = 0, totalChecked = 0
  dayModules.forEach(m => {
    const items = checklistItems.filter(i => i.module === m.key && i.active)
    totalItems += items.length
    items.forEach(it => { if (statuses.find(s => s.itemId === it.id && s.periodKey === day)?.checked) totalChecked++ })
  })
  const overall = totalItems ? Math.round(totalChecked / totalItems * 100) : 0

  const mood = moodDailies.find(m => m.dayKey === day)
  const moodOpt = mood ? MOOD_OPTIONS.find(o => o.v === mood.value) : null
  const water = waterLogs.find(w => w.dayKey === day)?.count || 0
  const waterGoal = nutritionSettings.waterAutoCalc
    ? Math.max(1, Math.round(Math.max(800, nutritionSettings.weight * 35) / nutritionSettings.cupSizeMl))
    : nutritionSettings.waterGoalOverride
  const macros = macrosLogs.find(m => m.dayKey === day)
  const pyCounts = pyramidLogs.find(p => p.dayKey === day)?.counts || {}
  const groups = nutritionSettings.pyramidGroups
  const totalPyGoal = groups.reduce((s, g) => s + g.goal, 0)
  const totalPyCons = groups.reduce((s, g) => s + (pyCounts[g.id] || 0), 0)
  const grat = (gratitudeLogs.find(g => g.dayKey === day)?.items || []).filter(x => x.trim()).length
  const dayTasks = tasks.filter(t => t.dayKey === day)
  const tasksDone = dayTasks.filter(t => t.done).length

  return (
    <div className="space-y-3 fade-in">
      {/* Hero */}
      <Card className="border-primary text-primary-foreground" style={{ backgroundColor: "var(--primary)", borderColor: "var(--primary)" }}>
        <CardContent className="pt-5 pb-5">
          <div className="flex justify-between items-start mb-1">
            <div>
              <CardTitle className="text-primary-foreground text-lg">Seu dia</CardTitle>
              <p className="text-xs opacity-80">{formatDateLabel()}</p>
            </div>
          </div>
          <div className="text-5xl font-bold leading-none my-2" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{overall}%</div>
          <p className="text-sm opacity-85">{totalChecked} de {totalItems} hábitos concluídos</p>
          <div className="h-1.5 rounded-full bg-white/25 mt-3">
            <div className="h-full rounded-full bg-primary-foreground transition-all" style={{ width: `${overall}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* Mini cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <MiniCard label="Humor" value={moodOpt ? moodOpt.e : "—"} sub={moodOpt ? moodOpt.label : "sem registro"} />
        <MiniCard label="Água" value={`${water}/${waterGoal}`} sub={`${Math.round(water / waterGoal * 100)}%`} />
        <MiniCard label="Carboidratos" value={`${macros?.carbs || 0}g`} sub={`${nutritionSettings.macros.carbs.goal}g meta`} />
        <MiniCard label="Tarefas" value={`${tasksDone}/${dayTasks.length}`} sub="concluídas" />
        <MiniCard label="Pirâmide" value={`${totalPyCons}/${totalPyGoal}`} sub="porções" />
        <MiniCard label="Gratidão" value={`${grat}/3`} sub={grat === 3 ? "completo" : "pendentes"} />
      </div>

      {/* Per-module bars */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm">Por módulo</CardTitle>
          <p className="text-[10px] font-mono text-muted-foreground">hoje</p>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {dayModules.map(m => {
            const items = checklistItems.filter(i => i.module === m.key && i.active)
            const checked = items.filter(it => statuses.find(s => s.itemId === it.id && s.periodKey === day)?.checked).length
            const pct = items.length ? Math.round(checked / items.length * 100) : 0
            return (
              <button key={m.key} onClick={() => setActiveTab(m.key)} className="w-full flex items-center gap-2.5 group" type="button">
                <span className="w-24 text-xs text-muted-foreground truncate">{m.label}</span>
                <div className="flex-1 h-2 rounded-full bg-border">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: m.accent }} />
                </div>
                <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">{pct}%</span>
              </button>
            )
          })}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <Card>
        <CardContent className="pt-4 pb-4 flex gap-2 flex-wrap">
          <Button size="sm" className="text-xs" onClick={() => setActiveTab("bemestar")}>Bem-estar</Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={() => setActiveTab("tarefas")}>Tarefas</Button>
          <Button size="sm" variant="ghost" className="text-xs" onClick={() => setActiveTab("historico")}>Histórico</Button>
        </CardContent>
      </Card>
    </div>
  )
}

function MiniCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="p-3">
      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold mt-0.5" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </Card>
  )
}