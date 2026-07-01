"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useStore } from "@/lib/store"
import { toast } from "sonner"
import { Cloud, CloudOff, Upload, Download, Database, Trash2, Loader2, Check, AlertCircle } from "lucide-react"

interface SyncStatusData {
  configured: boolean
  connected?: boolean
  url: string | null
  connectionError?: string
  lastPush: string | null
  lastPull: string | null
}

export function SyncSettings() {
  const [status, setStatus] = useState<SyncStatusData>({ configured: false, url: null })
  const [url, setUrl] = useState("")
  const [key, setKey] = useState("")
  const [loading, setLoading] = useState("")
  const fetchInitialData = useStore(s => s.fetchInitialData)
  const _setSyncStatus = useStore(s => s._setSyncStatus)
  const initialized = useRef(false)

  // Update global sync indicator based on Supabase connection
  const applySyncStatus = (s: SyncStatusData) => {
    if (!s.configured) return
    _setSyncStatus(s.connected ? "synced" : "error")
  }

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    fetch("/api/sync").then(r => r.json()).then(data => {
      setStatus(data)
      applySyncStatus(data)
    }).catch(() => {})
  }, [])

  const handleSave = async () => {
    if (!url || !key) return toast.error("Preencha URL e chave")
    setLoading("save")
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save-config", url, anonKey: key }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success("Conectado ao Supabase!")
        setUrl("")
        setKey("")
        const statusRes = await fetch("/api/sync")
        const newStatus = await statusRes.json()
        setStatus(newStatus)
        applySyncStatus(newStatus)
      } else {
        toast.error(`Erro: ${data.error || "falha na conexão"}`)
      }
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`)
    }
    setLoading("")
  }

  const handleClear = async () => {
    setLoading("clear")
    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear-config" }),
      })
      toast.success("Configuração removida")
      const statusRes = await fetch("/api/sync")
      const newStatus = await statusRes.json()
      setStatus(newStatus)
      applySyncStatus(newStatus)
    } catch {}
    setLoading("")
  }

  const handleImportLegacy = async () => {
    setLoading("import")
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import-legacy" }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(`Erro: ${data.error}`)
      } else {
        toast.success(`Importados ${data.imported} registros do Supabase!`)
        if (data.errors.length > 0) {
          toast.warning(`${data.errors.length} erros (veja o console)`)
          console.warn("[import-legacy errors]", data.errors)
        }
        await fetchInitialData()
      }
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`)
    }
    setLoading("")
  }

  const handlePush = async () => {
    setLoading("push")
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "full-push" }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(`Erro: ${data.error}`)
      } else {
        toast.success(`Backup: ${data.pushed} registros enviados!`)
        if (data.errors.length > 0) {
          toast.warning(`${data.errors.length} erros parciais`)
        }
        const statusRes = await fetch("/api/sync")
        setStatus(await statusRes.json())
      }
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`)
    }
    setLoading("")
  }

  const handlePull = async () => {
    setLoading("pull")
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "full-pull" }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(`Erro: ${data.error}`)
      } else {
        toast.success(`Restaurados ${data.pulled} registros do backup!`)
        await fetchInitialData()
        const statusRes = await fetch("/api/sync")
        setStatus(await statusRes.json())
      }
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`)
    }
    setLoading("")
  }

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cloud className="w-4 h-4" />
            Backup na nuvem (Supabase)
          </CardTitle>
          {status.configured && (
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${status.connected ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"}`}>
              {status.connected ? "Conectado" : "Desconectado"}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {status.configured ? (
          <>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {status.connected ? <Check className="w-3.5 h-3.5 text-green-600" /> : <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
              <span className="font-mono truncate">{status.url}</span>
            </div>
            {status.lastPush && (
              <p className="text-[10px] text-muted-foreground font-mono">
                Último backup: {new Date(status.lastPush).toLocaleString("pt-BR")}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm" variant="outline" className="text-xs gap-1"
                onClick={handleImportLegacy}
                disabled={!!loading}
              >
                {loading === "import" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
                Importar dados antigos
              </Button>
              <Button
                size="sm" className="text-xs gap-1"
                onClick={handlePush}
                disabled={!!loading}
              >
                {loading === "push" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                Fazer backup
              </Button>
              <Button
                size="sm" variant="outline" className="text-xs gap-1"
                onClick={handlePull}
                disabled={!!loading}
              >
                {loading === "pull" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                Restaurar backup
              </Button>
              <Button
                size="sm" variant="ghost" className="text-xs gap-1 text-destructive"
                onClick={handleClear}
                disabled={!!loading}
              >
                {loading === "clear" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Desconectar
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <b>Importar dados antigos</b> traz dados da versão anterior do app. <br />
              <b>Fazer backup</b> envia todos os dados locais para a nuvem. <br />
              <b>Restaurar backup</b> baixa dados da nuvem e mescla com os locais.
            </p>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Conecte ao Supabase para fazer backup automático e sincronizar entre dispositivos.
            </p>
            <div className="space-y-2">
              <Input
                placeholder="URL do projeto (ex: https://xxx.supabase.co)"
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="text-xs h-8"
                type="url"
              />
              <Input
                placeholder="Chave anon (anon public key)"
                value={key}
                onChange={e => setKey(e.target.value)}
                className="text-xs h-8 font-mono"
                type="password"
              />
            </div>
            <Button
              size="sm" className="text-xs gap-1 w-full"
              onClick={handleSave}
              disabled={!url || !key || !!loading}
            >
              {loading === "save" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Cloud className="w-3 h-3" />}
              Conectar e salvar
            </Button>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Encontre a URL e chave em <b>Settings → API</b> no painel do Supabase.
              Use a <b>anon public</b> key (não a service_role).
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}