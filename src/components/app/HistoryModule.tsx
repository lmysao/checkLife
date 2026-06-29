"use client"

import { useStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { todayKey, lastNDays, MOOD_OPTIONS, MOOD_COLORS, formatDateLabel } from "@/lib/helpers"
import { Download } from "lucide-react"
import { SyncSettings } from "./SyncSettings"

export function HistoryModule() {
  const modules = useStore(s => s.modules)
  const checklistItems = useStore(s => s.checklistItems)
  const statuses = useStore(s => s.statuses)
  const tasks = useStore(s => s.tasks)
  const moodDailies = useStore(s => s.moodDailies)
  const waterLogs = useStore(s => s.waterLogs)
  const macrosLogs = useStore(s => s.macrosLogs)
  const pyramidLogs = useStore(s => s.pyramidLogs)
  const nutritionSettings = useStore(s => s.nutritionSettings)

  const dayModules = modules.filter(m => m.kind === "checklist" && m.period === "day")
  const day = todayKey()

  // Streaks
  const computeStreak = (moduleKey: string) => {
    const items = checklistItems.filter(i => i.module === moduleKey && i.active)
    if (!items.length) return 0
    let streak = 0
    for (let i = 0; i < 365; i++) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      if (items.every(it => statuses.find(s => s.itemId === it.id && s.periodKey === k)?.checked)) streak++
      else break
    }
    return streak
  }

  // Completion %
  const computePct = (moduleKey: string, n: number) => {
    const items = checklistItems.filter(i => i.module === moduleKey && i.active)
    if (!items.length) return 0
    const days = lastNDays(n)
    let total = 0, done = 0
    days.forEach(d => items.forEach(it => {
      const st = statuses.find(s => s.itemId === it.id && s.periodKey === d)
      total++; if (st?.checked) done++
    }))
    return total ? Math.round(done / total * 100) : 0
  }

  const waterGoal = nutritionSettings.waterAutoCalc
    ? Math.max(1, Math.round(Math.max(800, nutritionSettings.weight * 35) / nutritionSettings.cupSizeMl))
    : nutritionSettings.waterGoalOverride
  const carbsGoal = nutritionSettings.macros.carbs.goal

  return (
    <div className="space-y-3 fade-in">
      {/* Streaks */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Sequência atual</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {dayModules.map(m => (
              <div key={m.key} className="text-[11px] font-mono px-2.5 py-2 rounded-xl border border-border bg-input">
                <b style={{ color: m.accent }}>{computeStreak(m.key)}</b>
                <span className="text-muted-foreground ml-1">{m.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Completion 7 days */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Conclusão — últimos 7 dias</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {dayModules.map(m => {
            const pct = computePct(m.key, 7)
            return (
              <div key={m.key} className="flex items-center gap-2.5">
                <span className="w-24 text-xs text-muted-foreground truncate">{m.label}</span>
                <div className="flex-1 h-2 rounded-full bg-border">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: m.accent }} />
                </div>
                <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">{pct}%</span>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Mood chart 30 days */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Humor — últimos 30 dias</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4">
          <MoodChart days={30} dailies={moodDailies} />
        </CardContent>
      </Card>

      {/* Water chart */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm">Hidratação — últimos 7 dias <span className="text-[10px] font-normal text-muted-foreground">meta: {waterGoal} copos</span></CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <BarChart
            days={7}
            data={lastNDays(7).map(d => {
              const w = waterLogs.find(l => l.dayKey === d)
              const c = w?.count || 0
              return { value: c, max: waterGoal, color: c >= waterGoal ? "#5C7A3A" : "#5BA3D0" }
            })}
          />
        </CardContent>
      </Card>

      {/* Carbs chart */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm">Carboidratos — últimos 7 dias <span className="text-[10px] font-normal text-muted-foreground">meta: {carbsGoal}g</span></CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <BarChart
            days={7}
            data={lastNDays(7).map(d => {
              const m = macrosLogs.find(l => l.dayKey === d)
              const v = m?.carbs || 0
              return { value: v, max: carbsGoal, color: v >= carbsGoal ? "#6B7A3A" : "#D6A23C" }
            })}
          />
        </CardContent>
      </Card>

      {/* Pyramid summary */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Pirâmide alimentar — últimos 7 dias</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {nutritionSettings.pyramidGroups.map(g => {
            let total = 0
            lastNDays(7).forEach(d => {
              const p = pyramidLogs.find(l => l.dayKey === d)
              if (p) total += p.counts[g.id] || 0
            })
            const weekGoal = g.goal * 7
            const pct = weekGoal ? Math.min(100, Math.round(total / weekGoal * 100)) : 0
            return (
              <div key={g.id} className="flex items-center gap-2.5">
                <span className="w-28 text-xs text-muted-foreground">{g.icon} {g.label}</span>
                <div className="flex-1 h-2 rounded-full bg-border">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: g.color }} />
                </div>
                <span className="text-[11px] font-mono text-muted-foreground w-12 text-right">{total}/{weekGoal}</span>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Tasks week */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Tarefas — últimos 7 dias</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4">
          {(() => {
            const weekDays = lastNDays(7)
            const weekTasks = tasks.filter(t => weekDays.includes(t.dayKey))
            const weekDone = weekTasks.filter(t => t.done).length
            return <p className="text-xs text-muted-foreground">{weekDone} de {weekTasks.length} tarefas concluídas.</p>
          })()}
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Exportar dados</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-xs text-muted-foreground mb-3">Exporte seus dados em diferentes formatos.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => {
              const a = document.createElement('a')
              a.href = `/api/export?type=excel`
              a.download = 'ritual-nutricao.xlsx'
              a.click()
            }} type="button"><Download className="w-3 h-3" /> Excel (nutrição)</Button>
            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => {
              const a = document.createElement('a')
              a.href = `/api/export?type=diary`
              a.download = 'diario.json'
              a.click()
            }} type="button"><Download className="w-3 h-3" /> Diário (JSON)</Button>
            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => {
              const a = document.createElement('a')
              a.href = `/api/export?type=json`
              a.download = 'ritual-completo.json'
              a.click()
            }} type="button"><Download className="w-3 h-3" /> Tudo (JSON)</Button>
            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => {
              const a = document.createElement('a')
              a.href = `/api/export?type=mood-image`
              a.download = 'calendario-humor.html'
              a.click()
            }} type="button"><Download className="w-3 h-3" /> Calendário humor</Button>
          </div>
        </CardContent>
      </Card>

      {/* Supabase Sync */}
      <SyncSettings />
    </div>
  )
}

function MoodChart({ days, dailies }: { days: number; dailies: { dayKey: string; value: number }[] }) {
  const dayList = lastNDays(days)
  const hasMood = dayList.some(d => dailies.find(m => m.dayKey === d))
  return (
    <>
      <div className="flex items-end gap-[2px] h-16">
        {dayList.map(d => {
          const entry = dailies.find(m => m.dayKey === d)
          const v = entry?.value || 0
          return (
            <div
              key={d}
              className="flex-1 rounded-t transition-all min-h-[2px]"
              style={{
                height: v ? `${v * 12}px` : "2px",
                backgroundColor: v ? MOOD_COLORS[v] : "var(--border)",
              }}
              title={`${d} — ${entry ? MOOD_OPTIONS.find(o => o.v === v)?.label : ""}`}
            />
          )
        })}
      </div>
      <div className="flex gap-[2px]">
        {dayList.map(d => (
          <span key={d} className="flex-1 text-center text-[8px] font-mono text-muted-foreground">{d.slice(8)}</span>
        ))}
      </div>
      {!hasMood && <p className="text-center text-muted-foreground text-sm py-2">Sem registros de humor ainda.</p>}
    </>
  )
}

function BarChart({ days, data }: { days: number; data: { value: number; max: number; color: string }[] }) {
  return (
    <>
      <div className="flex items-end gap-[2px] h-16">
        {data.map((d, i) => {
          const pct = d.max ? Math.min(100, d.value / d.max * 100) : 0
          return (
            <div
              key={i}
              className="flex-1 rounded-t transition-all min-h-[2px]"
              style={{ height: d.value ? Math.max(4, pct / 100 * 64) + "px" : "2px", backgroundColor: d.value ? d.color : "var(--border)" }}
            />
          )
        })}
      </div>
      <div className="flex gap-[2px]">
        {lastNDays(days).map(d => (
          <span key={d} className="flex-1 text-center text-[8px] font-mono text-muted-foreground">{d.slice(8)}</span>
        ))}
      </div>
    </>
  )
}