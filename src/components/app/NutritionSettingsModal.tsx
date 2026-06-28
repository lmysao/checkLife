"use client"

import { useStore } from "@/lib/store"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { useState } from "react"
import type { NutritionSettings, PyramidGroup } from "@/lib/helpers"
import { defaultNutritionSettings } from "@/lib/helpers"
import { Trash2 } from "lucide-react"
import { MODULE_COLORS } from "@/lib/helpers"

export function NutritionSettingsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const nutritionSettings = useStore(s => s.nutritionSettings)
  const saveNutritionSettings = useStore(s => s.saveNutritionSettings)
  const [s, setS] = useState<NutritionSettings>(nutritionSettings)

  const waterGoal = s.waterAutoCalc
    ? Math.max(1, Math.round(Math.max(800, s.weight * 35) / s.cupSizeMl))
    : s.waterGoalOverride
  const needMl = Math.max(800, Math.round(s.weight * 35))

  const handleSave = async () => {
    await saveNutritionSettings(s)
    onOpenChange(false)
    toast.success("Nutrição configurada")
  }

  const handleReset = () => {
    setS(defaultNutritionSettings())
    toast.success("Padrão restaurado")
  }

  const updatePyramidGroup = (idx: number, data: Partial<PyramidGroup>) => {
    const groups = [...s.pyramidGroups]
    groups[idx] = { ...groups[idx], ...data }
    setS({ ...s, pyramidGroups: groups })
  }

  const deletePyramidGroup = (idx: number) => {
    if (s.pyramidGroups.length <= 1) { toast.warning("Mantenha pelo menos 1 grupo"); return }
    const groups = s.pyramidGroups.filter((_, i) => i !== idx)
    setS({ ...s, pyramidGroups: groups })
  }

  const addPyramidGroup = () => {
    const icons = ["🍞", "🥩", "🍎", "🥬", "🍭", "🥛", "🍚", "🥚", "🐟", "🧀", "🍩", "🥦"]
    s.pyramidGroups.push({
      id: `g_${Date.now()}`,
      label: "Novo grupo",
      goal: 3,
      color: MODULE_COLORS[s.pyramidGroups.length % MODULE_COLORS.length],
      icon: icons[s.pyramidGroups.length % icons.length],
    })
    setS({ ...s })
  }

  const movePyramidGroup = (idx: number, dir: number) => {
    const groups = [...s.pyramidGroups]
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= groups.length) return
    ;[groups[idx], groups[newIdx]] = [groups[newIdx], groups[idx]]
    setS({ ...s, pyramidGroups: groups })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] max-h-[85vh]">
        <DialogHeader><DialogTitle>Configurar nutrição</DialogTitle></DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-4 pb-4">
            {/* Water */}
            <div>
              <h4 className="text-sm font-bold mb-2">💧 Hidratação</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm">Seu peso <span className="text-xs text-muted-foreground">(kg)</span></label>
                  <Input type="number" value={s.weight} onChange={e => setS({ ...s, weight: Math.max(20, parseFloat(e.target.value) || 70) })} className="w-20 h-8 text-sm text-right" min={20} max={300} />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm">Tamanho do copo <span className="text-xs text-muted-foreground">(ml)</span></label>
                  <Input type="number" value={s.cupSizeMl} onChange={e => setS({ ...s, cupSizeMl: Math.max(50, parseInt(e.target.value) || 250) })} className="w-20 h-8 text-sm text-right" min={50} max={1000} step={10} />
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={s.waterAutoCalc} onChange={e => setS({ ...s, waterAutoCalc: e.target.checked })} className="w-4 h-4 accent-primary" />
                  Calcular meta automaticamente pelo peso
                </label>
                {!s.waterAutoCalc && (
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Meta manual (copos)</label>
                    <Input type="number" value={s.waterGoalOverride} onChange={e => setS({ ...s, waterGoalOverride: Math.max(1, parseInt(e.target.value) || 8) })} className="w-20 h-8 text-sm text-right" min={1} max={30} />
                  </div>
                )}
                <div className="text-xs text-muted-foreground bg-primary/10 rounded-lg p-2">
                  Cálculo: <b className="text-primary">{s.weight} kg</b> × 35 ml = <b className="text-primary">{needMl} ml</b> → <b className="text-primary">{waterGoal} copos</b> de {s.cupSizeMl} ml
                </div>
              </div>
            </div>

            {/* Macros */}
            <div>
              <h4 className="text-sm font-bold mb-2">🥗 Macros (metas em gramas)</h4>
              <div className="space-y-2">
                {(["carbs", "protein", "fat"] as const).map(k => {
                  const labels = { carbs: "Carboidratos", protein: "Proteínas", fat: "Gorduras" }
                  return (
                    <div key={k} className="flex items-center justify-between">
                      <label className="text-sm">{labels[k]}</label>
                      <Input type="number" value={s.macros[k].goal} onChange={e => {
                        const macros = { ...s.macros }
                        macros[k] = { ...macros[k], goal: Math.max(0, parseInt(e.target.value) || 0) }
                        setS({ ...s, macros })
                      }} className="w-20 h-8 text-sm text-right" min={0} step={5} />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Pyramid */}
            <div>
              <h4 className="text-sm font-bold mb-2">🔺 Pirâmide alimentar</h4>
              <p className="text-[11px] text-muted-foreground mb-2">Ordem: topo (modere) → base (coma mais)</p>
              <div className="space-y-1.5">
                {s.pyramidGroups.map((g, idx) => (
                  <div key={g.id} className="flex items-center gap-1.5 p-1.5 rounded-lg border border-border bg-input">
                    <button onClick={() => movePyramidGroup(idx, -1)} className="text-muted-foreground hover:text-foreground" type="button">↑</button>
                    <button onClick={() => movePyramidGroup(idx, 1)} className="text-muted-foreground hover:text-foreground" type="button">↓</button>
                    <input
                      type="text"
                      value={g.icon}
                      onChange={e => updatePyramidGroup(idx, { icon: e.target.value })}
                      className="w-7 text-center text-sm border border-border rounded bg-card text-foreground p-0.5"
                      maxLength={2}
                    />
                    <input type="color" value={g.color} onChange={e => updatePyramidGroup(idx, { color: e.target.value })} className="w-6 h-6 rounded-full border-0 p-0 cursor-pointer" />
                    <input
                      type="text"
                      value={g.label}
                      onChange={e => updatePyramidGroup(idx, { label: e.target.value })}
                      className="flex-1 min-w-0 text-xs border border-border rounded bg-card text-foreground px-1.5 py-1"
                      maxLength={28}
                    />
                    <Input type="number" value={g.goal} onChange={e => updatePyramidGroup(idx, { goal: Math.max(0, parseInt(e.target.value) || 0) })} className="w-12 h-6 text-xs text-right px-1" min={0} />
                    <button onClick={() => deletePyramidGroup(idx)} className="text-destructive hover:text-destructive" type="button">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input placeholder="Novo grupo..." className="text-xs flex-1 h-7" id="newPyGroup" />
                <Button size="sm" className="text-xs h-7" onClick={() => {
                  const input = document.getElementById("newPyGroup") as HTMLInputElement
                  const name = input?.value?.trim()
                  if (!name) { toast.warning("Dê um nome"); return }
                  const icons = ["🍞", "🥩", "🍎", "🥬", "🍭"]
                  s.pyramidGroups.push({
                    id: `g_${Date.now()}`, label: name, goal: 3,
                    color: MODULE_COLORS[s.pyramidGroups.length % MODULE_COLORS.length],
                    icon: icons[s.pyramidGroups.length % icons.length],
                  })
                  setS({ ...s })
                  input.value = ""
                }} type="button">+ Grupo</Button>
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button size="sm" variant="destructive" className="text-xs" onClick={handleReset} type="button">Restaurar padrão</Button>
          <Button size="sm" variant="ghost" className="text-xs" onClick={() => onOpenChange(false)} type="button">Cancelar</Button>
          <Button size="sm" className="text-xs" onClick={handleSave} type="button">Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}