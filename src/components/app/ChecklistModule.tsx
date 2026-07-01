"use client"

import { useStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { todayKey, weekKey, periodKeyFor, formatDateLabel } from "@/lib/helpers"
import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowUp, ArrowDown, Pencil, Trash2, RotateCcw } from "lucide-react"
import { toast } from "sonner"

export function ChecklistModule({ moduleKey }: { moduleKey: string }) {
  const modules = useStore(s => s.modules)
  const checklistItems = useStore(s => s.checklistItems)
  const statuses = useStore(s => s.statuses)
  const editMode = useStore(s => s.editMode)
  const setEditMode = useStore(s => s.setEditMode)
  const toggleCheck = useStore(s => s.toggleCheck)
  const addChecklistItem = useStore(s => s.addChecklistItem)
  const updateChecklistItemLabel = useStore(s => s.updateChecklistItemLabel)
  const deleteChecklistItem = useStore(s => s.deleteChecklistItem)
  const moveChecklistItem = useStore(s => s.moveChecklistItem)

  const [newItem, setNewItem] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  const mod = modules.find(m => m.key === moduleKey)

  const period = mod?.period || "day"
  const periodKey = periodKeyFor(period)
  const items = checklistItems.filter(i => i.module === moduleKey && i.active).sort((a, b) => a.position - b.position)
  const checkedCount = items.filter(i => statuses.find(s => s.itemId === i.id && s.periodKey === periodKey)?.checked).length
  const pct = items.length ? Math.round(checkedCount / items.length * 100) : 0
  const isEditing = editMode[moduleKey]

  if (!mod) return null

  const handleAdd = async () => {
    if (!newItem.trim()) return
    await addChecklistItem(moduleKey, newItem.trim())
    setNewItem("")
  }

  const handleEdit = (id: string, label: string) => {
    setEditingId(id)
    setEditValue(label)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editValue.trim()) return
    await updateChecklistItemLabel(editingId, editValue.trim())
    setEditingId(null)
  }

  const handleReset = () => {
    const ids = items.map(i => i.id)
    ids.forEach(id => toggleCheck(id, periodKey))
    toast.warn("Checklist resetado")
  }

  return (
    <Card className="border-border fade-in">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-end justify-between">
          <div>
            <CardTitle className="text-lg" style={{ color: mod.accent }}>{mod.label}</CardTitle>
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
              {period === "week" ? `semana ${periodKey.split("-W")[1]}` : formatDateLabel()}
            </p>
          </div>
          <span className="text-sm font-mono font-bold" style={{ color: mod.accent }}>{checkedCount}/{items.length}</span>
        </div>
        <div className="h-1.5 rounded-full bg-border mt-2">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: mod.accent }} />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {items.length === 0 && !isEditing && (
          <p className="text-center text-muted-foreground text-sm py-4">Nenhum item ainda.</p>
        )}
        <ul className="space-y-0">
          {items.map(it => {
            const checked = statuses.find(s => s.itemId === it.id && s.periodKey === periodKey)?.checked
            return (
              <li key={it.id} className="flex items-center gap-2.5 py-2 border-b border-border last:border-0">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleCheck(it.id, periodKey)}
                  className={`w-7 h-7 rounded-md border-2 flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-colors ${
                    checked ? "text-primary-foreground" : "text-transparent"
                  }`}
                  style={{
                    borderColor: mod.accent,
                    backgroundColor: checked ? mod.accent : "transparent",
                  }}
                  type="button"
                >
                  OK
                </motion.button>
                {editingId === it.id ? (
                  <Input
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditingId(null) }}
                    className="h-7 text-sm flex-1"
                    autoFocus
                  />
                ) : (
                  <span className={`flex-1 text-sm ${checked ? "line-through text-muted-foreground" : ""}`}>{it.label}</span>
                )}
                {isEditing && editingId !== it.id && (
                  <div className="flex gap-0.5 flex-shrink-0">
                    <button onClick={() => moveChecklistItem(it.id, -1)} className="p-1 text-muted-foreground hover:text-foreground" type="button"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button onClick={() => moveChecklistItem(it.id, 1)} className="p-1 text-muted-foreground hover:text-foreground" type="button"><ArrowDown className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleEdit(it.id, it.label)} className="p-1 text-muted-foreground hover:text-foreground" type="button"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { deleteChecklistItem(it.id); toast.warn("Item removido") }} className="p-1 text-muted-foreground hover:text-destructive" type="button"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        <div className="flex gap-2 mt-3 flex-wrap">
          <Button size="sm" variant={isEditing ? "default" : "outline"} className="text-xs" onClick={() => setEditMode(moduleKey, !isEditing)} type="button">
            {isEditing ? "Concluir edição" : "Editar itens"}
          </Button>
          <Button size="sm" variant="ghost" className="text-xs" onClick={handleReset} type="button">
            <RotateCcw className="w-3 h-3 mr-1" /> Resetar {period === "week" ? "semana" : "dia"}
          </Button>
        </div>
        {isEditing && (
          <div className="flex gap-2 mt-3">
            <Input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Novo item..." onKeyDown={e => e.key === "Enter" && handleAdd()} className="text-sm flex-1" />
            <Button size="sm" onClick={handleAdd} type="button">Add</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}