"use client"

import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Trash2, Pencil, Settings, GripVertical } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"

export function GroupManager() {
  const groups = useStore(s => s.groups)
  const modules = useStore(s => s.modules)
  const createGroup = useStore(s => s.createGroup)
  const updateGroup = useStore(s => s.updateGroup)
  const deleteGroup = useStore(s => s.deleteGroup)
  const addModuleToGroup = useStore(s => s.addModuleToGroup)
  const removeModuleFromGroup = useStore(s => s.removeModuleFromGroup)
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [addModTo, setAddModTo] = useState<string | null>(null)

  const checklistModules = modules.filter(m => m.kind === "checklist")
  const specialKeys = new Set(["resumo", "tarefas", "historico", "bemestar"])

  const handleCreate = async () => {
    if (!newName.trim()) return
    await createGroup(newName.trim())
    setNewName("")
    toast.success("Grupo criado")
  }

  const handleRename = async (id: string) => {
    if (!editName.trim()) return
    await updateGroup(id, { name: editName.trim() })
    setEditingId(null)
    toast.success("Grupo renomeado")
  }

  const handleDelete = async (id: string) => {
    await deleteGroup(id)
    toast.success("Grupo excluído")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs h-7 gap-1" type="button">
          <Settings className="w-3 h-3" /> Grupos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[400px]">
        <DialogHeader><DialogTitle>Gerenciar grupos</DialogTitle></DialogHeader>
        <div className="flex gap-2">
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do grupo..." onKeyDown={e => e.key === "Enter" && handleCreate()} className="text-sm" />
          <Button size="sm" onClick={handleCreate} type="button"><Plus className="w-4 h-4" /></Button>
        </div>
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-3">
            {groups.map(g => (
              <div key={g.id} className="border border-border rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  {editingId === g.id ? (
                    <Input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleRename(g.id)} className="h-7 text-sm" autoFocus />
                  ) : (
                    <span className="font-bold text-sm">{g.name}</span>
                  )}
                  <div className="flex gap-1">
                    {editingId === g.id ? (
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => handleRename(g.id)} type="button">OK</Button>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-6" onClick={() => { setEditingId(g.id); setEditName(g.name) }} type="button">
                        <Pencil className="w-3 h-3" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-6 text-destructive" onClick={() => handleDelete(g.id)} type="button">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  {g.items.map(item => {
                    const mod = modules.find(m => m.key === item.moduleKey)
                    return mod ? (
                      <div key={item.id} className="flex items-center gap-2 text-xs">
                        <GripVertical className="w-3 h-3 text-muted-foreground" />
                        <span className="flex-1" style={{ color: mod.accent }}>{mod.label}</span>
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-muted-foreground" onClick={() => removeModuleFromGroup(item.id)} type="button">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : null
                  })}
                </div>
                {addModTo === g.id ? (
                  <div className="space-y-1">
                    {checklistModules
                      .filter(m => !specialKeys.has(m.key) && !g.items.some(i => i.moduleKey === m.key))
                      .map(m => (
                        <button
                          key={m.key}
                          onClick={() => { addModuleToGroup(g.id, m.key); setAddModTo(null); toast.success(`${m.label} adicionado ao grupo`) }}
                          className="flex items-center gap-2 text-xs w-full p-1 rounded hover:bg-secondary text-left"
                          type="button"
                        >
                          <Plus className="w-3 h-3" /> <span style={{ color: m.accent }}>{m.label}</span>
                        </button>
                      ))
                    }
                    <Button size="sm" variant="ghost" className="h-5 text-xs w-full" onClick={() => setAddModTo(null)} type="button">Cancelar</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="h-6 text-xs w-full" onClick={() => setAddModTo(g.id)} type="button">
                    <Plus className="w-3 h-3 mr-1" /> Adicionar módulo
                  </Button>
                )}
              </div>
            ))}
            {groups.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">Nenhum grupo criado.</p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}