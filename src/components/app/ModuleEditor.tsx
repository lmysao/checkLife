"use client"

import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Pencil } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"
import { MODULE_COLORS } from "@/lib/helpers"

export function ModuleEditor() {
  const modules = useStore(s => s.modules)
  const groups = useStore(s => s.groups)
  const addModuleToGroup = useStore(s => s.addModuleToGroup)
  const updateModule = useStore(s => s.updateModule)
  const [open, setOpen] = useState(false)
  const [editKey, setEditKey] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState("")
  const [editAccent, setEditAccent] = useState("")

  const handleSave = async () => {
    if (!editKey) return
    await updateModule(editKey, { label: editLabel, accent: editAccent })
    setEditKey(null)
    toast.success("Módulo atualizado")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs h-7 gap-1" type="button">
          <Pencil className="w-3 h-3" /> Módulos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[400px]">
        <DialogHeader><DialogTitle>Editar módulos</DialogTitle></DialogHeader>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {modules.map(m => (
              <div key={m.key} className="border border-border rounded-xl p-3">
                {editKey === m.key ? (
                  <div className="space-y-2">
                    <Input value={editLabel} onChange={e => setEditLabel(e.target.value)} className="text-sm h-8" />
                    <div className="flex gap-1.5 flex-wrap">
                      {MODULE_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setEditAccent(c)}
                          className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                          style={{ backgroundColor: c, borderColor: editAccent === c ? "var(--foreground)" : "transparent" }}
                          type="button"
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSave} type="button">Salvar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditKey(null)} type="button">Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: m.accent }} />
                      <span className="font-bold text-sm">{m.label}</span>
                      {m.builtin && <span className="text-[10px] text-muted-foreground font-mono">padrão</span>}
                    </div>
                    <Button size="sm" variant="ghost" className="h-6" onClick={() => { setEditKey(m.key); setEditLabel(m.label); setEditAccent(m.accent) }} type="button">
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}