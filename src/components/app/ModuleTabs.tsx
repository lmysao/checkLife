"use client"

import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Plus, Settings, X } from "lucide-react"
import { useState } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { MODULE_COLORS } from "@/lib/helpers"
import { toast } from "sonner"
import { GroupManager } from "./GroupManager"
import { ModuleEditor } from "./ModuleEditor"

export function ModuleTabs() {
  const activeTab = useStore(s => s.activeTab)
  const setActiveTab = useStore(s => s.setActiveTab)
  const modules = useStore(s => s.modules)
  const groups = useStore(s => s.groups)
  const deleteModule = useStore(s => s.deleteModule)

  // Determine which modules are in groups
  const groupedKeys = new Set(groups.flatMap(g => g.items.map(i => i.moduleKey)))
  const specialKeys = new Set(["resumo", "tarefas", "historico", "bemestar"])

  // Build tab structure: special tabs, then groups (with their modules), then ungrouped checklist modules
  const tabs: { key: string; label: string; accent: string; custom?: boolean; isGroup?: boolean }[] = []

  // Special tabs first
  for (const m of modules) {
    if (specialKeys.has(m.key)) {
      tabs.push({ key: m.key, label: m.label, accent: m.accent })
    }
  }

  // Group tabs
  for (const g of groups) {
    tabs.push({ key: `group_${g.id}`, label: g.name, accent: "#6B7A3A", isGroup: true })
  }

  // Ungrouped checklist modules (not in special, not in groups)
  for (const m of modules) {
    if (!specialKeys.has(m.key) && !groupedKeys.has(m.key) && m.kind === "checklist") {
      tabs.push({ key: m.key, label: m.label, accent: m.accent, custom: !m.builtin })
    }
  }

  // When clicking a group tab, show the first module in that group
  const handleTabClick = (key: string) => {
    if (key.startsWith("group_")) {
      const groupId = key.replace("group_", "")
      const group = groups.find(g => g.id === groupId)
      if (group && group.items.length > 0) {
        setActiveTab(group.items[0].moduleKey)
      }
      return
    }
    setActiveTab(key)
  }

  // Check if active tab is in a group
  const activeGroup = groups.find(g => g.items.some(i => i.moduleKey === activeTab))

  return (
    <div className="space-y-2">
      <nav className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => handleTabClick(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
              (t.key === activeTab || (t.isGroup && activeGroup?.id === t.key.replace("group_", "")))
                ? "text-primary-foreground border-transparent shadow-sm"
                : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
            }`}
            style={t.key === activeTab || (t.isGroup && activeGroup?.id === t.key.replace("group_", ""))
              ? { backgroundColor: t.accent, borderColor: t.accent }
              : {}
            }
          >
            {t.label}
            {t.custom && (
              <X
                className="w-3 h-3 opacity-50 hover:opacity-100"
                onClick={e => { e.stopPropagation(); deleteModule(t.key); toast.warn("Módulo excluído") }}
              />
            )}
          </button>
        ))}
        <CreateModuleButton />
      </nav>
      {/* Show group sub-navigation if in a group */}
      {activeGroup && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
          {activeGroup.items.map(item => {
            const m = modules.find(mod => mod.key === item.moduleKey)
            if (!m) return null
            return (
              <button
                key={item.moduleKey}
                onClick={() => setActiveTab(item.moduleKey)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  activeTab === item.moduleKey
                    ? "border-transparent text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
                style={activeTab === item.moduleKey ? { backgroundColor: m.accent } : {}}
              >
                {m.label}
              </button>
            )
          })}
        </div>
      )}
      {/* Management buttons */}
      <div className="flex gap-2">
        <GroupManager />
        <ModuleEditor />
      </div>
    </div>
  )
}

function CreateModuleButton() {
  const createModule = useStore(s => s.createModule)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [color, setColor] = useState(MODULE_COLORS[0])

  const submit = () => {
    if (!name.trim()) { toast.warning("Dê um nome ao módulo"); return }
    createModule(name.trim(), color)
    setName("")
    setOpen(false)
    toast.success("Módulo criado")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="w-7 h-7 rounded-full border-dashed flex-shrink-0" type="button">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[360px]">
        <DialogHeader><DialogTitle>Novo módulo</DialogTitle></DialogHeader>
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Nome</label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Academia, Estudos..." onKeyDown={e => e.key === "Enter" && submit()} />
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Cor</label>
        <div className="flex gap-2 flex-wrap">
          {MODULE_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
              style={{ backgroundColor: c, borderColor: color === c ? "var(--foreground)" : "transparent" }}
            />
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} style={{ backgroundColor: color, borderColor: color }}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}