"use client"

import { useStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { todayKey, dateOffsetKey, endOfWeekKey, formatTaskDateLabel, formatDateLabel } from "@/lib/helpers"
import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react"
import { toast } from "sonner"

const PRIO_COLOR: Record<string, string> = { alta: "#B5566B", media: "#D6A23C", baixa: "#6B7A3A" }

export function TasksModule() {
  const tasks = useStore(s => s.tasks)
  const addTask = useStore(s => s.addTask)
  const toggleTask = useStore(s => s.toggleTask)
  const deleteTask = useStore(s => s.deleteTask)
  const moveTask = useStore(s => s.moveTask)
  const moveTaskToDay = useStore(s => s.moveTaskToDay)

  const today = todayKey()
  const tomorrow = dateOffsetKey(today, 1)
  const eow = endOfWeekKey(today)
  const [label, setLabel] = useState("")
  const [dateKey, setDateKey] = useState(today)
  const [priority, setPriority] = useState("media")
  const [quickDate, setQuickDate] = useState("today")

  const groups = [
    { key: "atrasadas", label: "⏰ Atrasadas", cls: "border-l-destructive bg-destructive/5", filter: (t: any) => t.dayKey < today && !t.done },
    { key: "hoje", label: "📍 Hoje", cls: "border-l-primary", filter: (t: any) => t.dayKey === today },
    { key: "amanha", label: "➡ Amanhã", cls: "", filter: (t: any) => t.dayKey === tomorrow },
    { key: "semana", label: "🗓 Esta semana", cls: "", filter: (t: any) => t.dayKey > tomorrow && t.dayKey <= eow },
    { key: "proximas", label: "📅 Próximas", cls: "", filter: (t: any) => t.dayKey > eow && !t.done },
    { key: "concluidas", label: "✓ Concluídas", cls: "opacity-70", filter: (t: any) => t.dayKey < today && t.done },
  ]

  const grouped = groups.map(g => ({
    ...g,
    tasks: tasks.filter(g.filter).sort((a, b) => a.dayKey < b.dayKey ? -1 : a.dayKey > b.dayKey ? 1 : a.position - b.position),
  })).filter(g => g.tasks.length > 0)

  const todayTasks = tasks.filter(t => t.dayKey === today)
  const todayDone = todayTasks.filter(t => t.done).length
  const totalOpen = tasks.filter(t => !t.done).length

  const handleAdd = useCallback(async () => {
    if (!label.trim()) return
    await addTask(label.trim(), dateKey, priority)
    setLabel("")
    toast.success("Tarefa adicionada")
  }, [label, dateKey, priority, addTask])

  return (
    <Card className="border-border fade-in">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-end justify-between">
          <div>
            <CardTitle className="text-lg" style={{ color: "#2E6B62" }}>Tarefas</CardTitle>
            <p className="text-[10px] font-mono text-muted-foreground">{formatDateLabel()} · {totalOpen} em aberto</p>
          </div>
          <span className="text-sm font-mono font-bold" style={{ color: "#2E6B62" }}>{todayDone}/{todayTasks.length}</span>
        </div>
        <div className="h-1.5 rounded-full bg-border mt-2">
          <div className="h-full rounded-full transition-all" style={{ width: `${todayTasks.length ? Math.round(todayDone / todayTasks.length * 100) : 0}%`, backgroundColor: "#2E6B62" }} />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {grouped.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-4">Nenhuma tarefa. Adicione abaixo. 🎯</p>
        )}

        {grouped.map(g => (
          <div key={g.key} className="mb-3">
            <div className={`flex items-center gap-2 mb-1.5 px-2.5 py-1 rounded-lg border-l-[3px] bg-input/50 ${g.cls}`}>
              <span className="text-xs font-bold flex-1">{g.label}</span>
              <span className="text-[10px] font-mono text-muted-foreground bg-card px-2 py-0.5 rounded-full border border-border">
                {g.tasks.filter(t => t.done).length}/{g.tasks.length}
              </span>
            </div>
            <ul className="space-y-0">
              {g.tasks.map(t => {
                const isOverdue = t.dayKey < today && !t.done
                const isToday = t.dayKey === today
                return (
                  <li key={t.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0 flex-wrap">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleTask(t.id)}
                      className={`w-7 h-7 rounded-md border-2 flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-colors ${
                        t.done ? "text-primary-foreground" : "text-transparent"
                      }`}
                      style={{ borderColor: "#2E6B62", backgroundColor: t.done ? "#2E6B62" : "transparent" }}
                      type="button"
                    >
                      OK
                    </motion.button>
                    <span className={`flex-1 text-sm min-w-[120px] ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.label}</span>
                    {/* Date pill */}
                    <label className={`text-[10px] font-mono px-2 py-0.5 rounded-full border cursor-pointer flex-shrink-0 ${
                      isOverdue ? "border-destructive text-destructive bg-destructive/5" :
                      isToday ? "border-primary text-primary bg-primary/5" :
                      "border-border text-muted-foreground"
                    }`}>
                      {formatTaskDateLabel(t.dayKey)}
                      <input type="date" value={t.dayKey} className="absolute opacity-0 w-0 h-0" onChange={e => {
                        if (e.target.value && e.target.value !== t.dayKey) {
                          moveTaskToDay(t.id, e.target.value)
                          toast.success("Tarefa movida")
                        }
                      }} />
                    </label>
                    {/* Priority */}
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full text-primary-foreground font-mono uppercase"
                      style={{ backgroundColor: PRIO_COLOR[t.priority] || "#6B5D4D" }}>
                      {t.priority}
                    </span>
                    {/* Actions */}
                    <div className="flex gap-0.5 flex-shrink-0">
                      <button onClick={() => moveTask(t.id, -1)} className="p-1 text-muted-foreground hover:text-foreground" type="button"><ArrowUp className="w-3 h-3" /></button>
                      <button onClick={() => moveTask(t.id, 1)} className="p-1 text-muted-foreground hover:text-foreground" type="button"><ArrowDown className="w-3 h-3" /></button>
                      <button onClick={() => { deleteTask(t.id); toast.warn("Tarefa removida") }} className="p-1 text-muted-foreground hover:text-destructive" type="button"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        {/* Add form */}
        <div className="flex gap-2 mt-3 flex-wrap items-end">
          <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Nova tarefa..." className="text-sm flex-1 min-w-[120px]" onKeyDown={e => e.key === "Enter" && handleAdd()} maxLength={120} />
          <Input type="date" value={dateKey} onChange={e => { setDateKey(e.target.value); setQuickDate("") }} className="text-sm w-auto" />
          <select value={priority} onChange={e => setPriority(e.target.value)} className="text-xs px-2 py-1.5 rounded-lg border border-border bg-input text-foreground h-9">
            <option value="baixa">baixa</option>
            <option value="media">média</option>
            <option value="alta">alta</option>
          </select>
          <Button size="sm" onClick={handleAdd} type="button">Add</Button>
        </div>
        <div className="flex gap-1 mt-2">
          {[
            { key: "today", label: "hoje", day: today },
            { key: "tomorrow", label: "amanhã", day: tomorrow },
            { key: "+3", label: "em 3 dias", day: dateOffsetKey(today, 3) },
            { key: "+7", label: "próx. semana", day: dateOffsetKey(today, 7) },
          ].map(d => (
            <button
              key={d.key}
              onClick={() => { setDateKey(d.day); setQuickDate(d.key) }}
              className={`text-[10px] font-mono px-2 py-1 rounded-md border transition-colors ${
                quickDate === d.key ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:border-primary hover:text-primary"
              }`}
              type="button"
            >
              {d.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}