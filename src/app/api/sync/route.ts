import { NextResponse } from "next/server"
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  resetSupabaseClient,
} from "@/lib/supabase"
import {
  fullPush,
  importLegacyData,
  fullPull,
} from "@/lib/supabase-sync"
import { db } from "@/lib/db"

// GET: get sync status + config
export async function GET() {
  const config = await getSupabaseConfig()
  let syncConfig: any = null
  try {
    syncConfig = await db.syncConfig.findUnique({ where: { id: 1 } })
  } catch {}

  const result: any = {
    configured: !!config,
    url: config?.url ? config.url.replace(/\/$/, "").replace(/^(https?:\/\/[^/]+).*/, "$1") : null,
    lastPush: syncConfig?.lastPush,
    lastPull: syncConfig?.lastPull,
  }

  if (config) {
    const test = await testSupabaseConnection()
    result.connected = test.ok
    result.connectionError = test.error
  }

  return NextResponse.json(result)
}

// POST: various sync actions
export async function POST(req: Request) {
  const body = await req.json()
  const { action } = body

  switch (action) {
    case "test": {
      const result = await testSupabaseConnection()
      return NextResponse.json(result)
    }

    case "save-config": {
      const { url, anonKey } = body
      if (!url || !anonKey) {
        return NextResponse.json({ error: "URL e chave obrigatórias" }, { status: 400 })
      }
      await saveSupabaseConfig(url.trim(), anonKey.trim())
      const test = await testSupabaseConnection()
      return NextResponse.json({ saved: true, ...test })
    }

    case "clear-config": {
      await db.syncConfig.upsert({
        where: { id: 1 },
        update: { url: "", anonKey: "" },
        create: { id: 1, url: "", anonKey: "" },
      })
      resetSupabaseClient()
      return NextResponse.json({ cleared: true })
    }

    case "full-push": {
      try {
        const result = await fullPush()
        return NextResponse.json(result)
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
      }
    }

    case "import-legacy": {
      try {
        const result = await importLegacyData()
        return NextResponse.json(result)
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
      }
    }

    case "full-pull": {
      try {
        const result = await fullPull()
        return NextResponse.json(result)
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 })
  }
}