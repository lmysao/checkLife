import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { db } from "./db"

let _client: SupabaseClient | null = null

export interface SupabaseConfig {
  url: string
  anonKey: string
}

export async function getSupabaseConfig(): Promise<SupabaseConfig | null> {
  // Check DB first
  try {
    const config = await db.syncConfig.findUnique({ where: { id: 1 } })
    if (config?.url && config?.anonKey) {
      return { url: config.url, anonKey: config.anonKey }
    }
  } catch {}

  // Fall back to env vars
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (url && key) return { url, anonKey: key }

  return null
}

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (_client) return _client

  const config = await getSupabaseConfig()
  if (!config) return null

  try {
    _client = createClient(config.url, config.anonKey, {
      auth: { persistSession: false },
    })
    return _client
  } catch {
    return null
  }
}

export function resetSupabaseClient() {
  _client = null
}

export async function saveSupabaseConfig(url: string, anonKey: string): Promise<void> {
  await db.syncConfig.upsert({
    where: { id: 1 },
    update: { url, anonKey },
    create: { id: 1, url, anonKey },
  })
  resetSupabaseClient()
}

export async function testSupabaseConnection(): Promise<{ ok: boolean; error?: string }> {
  const client = await getSupabaseClient()
  if (!client) return { ok: false, error: "Supabase não configurado" }

  try {
    const { error } = await client.from("checklist_items").select("id").limit(1)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message || "Erro de conexão" }
  }
}