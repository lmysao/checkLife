import { db } from "./db"
import { getSupabaseClient, resetSupabaseClient } from "./supabase"

// Fire-and-forget push: upsert a single record to Supabase after a local write
export async function pushRecord(table: string, record: Record<string, any>): Promise<void> {
  const sb = await getSupabaseClient()
  if (!sb) return

  try {
    if (table === "checklist_status") {
      // Composite PK
      await sb.from("v2_checklist_status").upsert(record, { onConflict: "item_id,period_key" })
    } else if (table === "mood_dailies" || table === "water_log" || table === "macros_log" || table === "pyramid_log" || table === "gratitude_log") {
      await sb.from(table).upsert(record, { onConflict: "day_key" })
    } else if (table === "nutrition_settings") {
      await sb.from("nutrition_settings").upsert(record, { onConflict: "id" })
    } else if (table === "modules") {
      await sb.from("v2_modules").upsert(record, { onConflict: "key" })
    } else if (table === "module_groups") {
      await sb.from("v2_module_groups").upsert(record, { onConflict: "id" })
    } else if (table === "module_group_items") {
      await sb.from("v2_module_group_items").upsert(record, { onConflict: "id" })
    } else if (table === "mood_moments") {
      await sb.from("v2_mood_moments").upsert(record, { onConflict: "id" })
    } else {
      // Generic: checklist_items, tasks
      await sb.from(table).upsert(record, { onConflict: "id" })
    }
    // Update lastPush
    await db.syncConfig.upsert({
      where: { id: 1 },
      update: { lastPush: new Date() },
      create: { id: 1, url: "", anonKey: "", lastPush: new Date() },
    })
  } catch (e) {
    console.error(`[supabase-sync] pushRecord(${table}) failed:`, e)
  }
}

// Fire-and-forget delete from Supabase
export async function pushDelete(table: string, id: string): Promise<void> {
  const sb = await getSupabaseClient()
  if (!sb) return

  try {
    await sb.from(table).delete().eq("id", id)
  } catch (e) {
    console.error(`[supabase-sync] pushDelete(${table}, ${id}) failed:`, e)
  }
}

// Full push: send ALL local data to Supabase
export async function fullPush(): Promise<{ pushed: number; errors: string[] }> {
  const sb = await getSupabaseClient()
  if (!sb) throw new Error("Supabase não configurado")

  const errors: string[] = []
  let pushed = 0

  async function upsertAll(table: string, records: any[], onConflict: string, transform?: (r: any) => any) {
    if (!records.length) return
    const rows = transform ? records.map(transform) : records
    const { error } = await sb.from(table).upsert(rows, { onConflict })
    if (error) {
      errors.push(`${table}: ${error.message}`)
    } else {
      pushed += records.length
    }
  }

  // Modules
  const modules = await db.module.findMany()
  await upsertAll("v2_modules", modules, "key", (m) => ({
    key: m.key, label: m.label, accent: m.accent, kind: m.kind,
    period: m.period, builtin: m.builtin, position: m.position,
  }))

  // Module Groups
  const groups = await db.moduleGroup.findMany()
  await upsertAll("v2_module_groups", groups, "id", (g) => ({
    id: g.id, name: g.name, position: g.position, stacked: g.stacked,
  }))

  // Module Group Items
  const groupItems = await db.moduleGroupItem.findMany()
  await upsertAll("v2_module_group_items", groupItems, "id", (i) => ({
    id: i.id, group_id: i.groupId, module_key: i.moduleKey, position: i.position,
  }))

  // Checklist Items
  const items = await db.checklistItem.findMany()
  await upsertAll("checklist_items", items, "id", (i) => ({
    id: i.id, module: i.module, label: i.label, position: i.position, active: i.active,
  }))

  // Checklist Status
  const statuses = await db.checklistStatus.findMany()
  await upsertAll("v2_checklist_status", statuses, "item_id,period_key", (s) => ({
    item_id: s.itemId, period_key: s.periodKey, checked: s.checked,
  }))

  // Tasks
  const tasks = await db.task.findMany()
  await upsertAll("tasks", tasks, "id", (t) => ({
    id: t.id, label: t.label, done: t.done, position: t.position,
    day_key: t.dayKey, priority: t.priority,
  }))

  // Mood Moments
  const moments = await db.moodMoment.findMany()
  await upsertAll("v2_mood_moments", moments, "id", (m) => ({
    id: m.id, day_key: m.dayKey, time: m.time, value: m.value, note: m.note,
  }))

  // Mood Dailies
  const dailies = await db.moodDaily.findMany()
  await upsertAll("mood_dailies", dailies, "day_key", (d) => ({
    day_key: d.dayKey, value: d.value, note: d.note,
  }))

  // Water Log
  const water = await db.waterLog.findMany()
  await upsertAll("water_log", water, "day_key", (w) => ({
    day_key: w.dayKey, count: w.count,
  }))

  // Macros Log
  const macros = await db.macrosLog.findMany()
  await upsertAll("macros_log", macros, "day_key", (m) => ({
    day_key: m.dayKey, carbs: m.carbs, protein: m.protein, fat: m.fat,
  }))

  // Pyramid Log
  const pyramids = await db.pyramidLog.findMany()
  await upsertAll("pyramid_log", pyramids, "day_key", (p) => ({
    day_key: p.dayKey, counts: typeof p.counts === "string" ? JSON.parse(p.counts) : p.counts,
  }))

  // Gratitude Log
  const gratitudes = await db.gratitudeLog.findMany()
  await upsertAll("gratitude_log", gratitudes, "day_key", (g) => ({
    day_key: g.dayKey, items: typeof g.items === "string" ? JSON.parse(g.items) : g.items,
  }))

  // Nutrition Settings
  const nutri = await db.nutritionSettings.findUnique({ where: { id: 1 } })
  if (nutri) {
    const settings = typeof nutri.settings === "string" ? JSON.parse(nutri.settings) : nutri.settings
    await upsertAll("nutrition_settings", [{ id: 1, settings }], "id")
  }

  // Update lastPush
  await db.syncConfig.upsert({
    where: { id: 1 },
    update: { lastPush: new Date() },
    create: { id: 1, url: "", anonKey: "", lastPush: new Date() },
  })

  return { pushed, errors }
}

// Import from OLD Supabase tables (the original app's schema with UUID PKs)
export async function importLegacyData(): Promise<{ imported: number; errors: string[] }> {
  const sb = await getSupabaseClient()
  if (!sb) throw new Error("Supabase não configurado")

  const errors: string[] = []
  let imported = 0

  // 1. Checklist Items (old table has uuid PK - we import with UUID as text ID)
  const { data: oldItems, error: e1 } = await sb.from("checklist_items").select("*").order("position")
  if (!e1 && oldItems?.length) {
    for (const item of oldItems) {
      try {
        await db.checklistItem.upsert({
          where: { id: item.id },
          update: { label: item.label, position: item.position, active: item.active, module: item.module },
          create: {
            id: item.id,
            module: item.module,
            label: item.label,
            position: item.position,
            active: item.active,
          },
        })
        imported++
      } catch (e: any) {
        errors.push(`checklist_item ${item.id}: ${e.message}`)
      }
    }
  } else if (e1) {
    errors.push(`checklist_items: ${e1.message}`)
  }

  // 2. Checklist Status (references checklist_items.id)
  const { data: oldStatus, error: e2 } = await sb.from("checklist_status").select("*")
  if (!e2 && oldStatus?.length) {
    for (const s of oldStatus) {
      try {
        await db.checklistStatus.upsert({
          where: { itemId_periodKey: { itemId: s.item_id, periodKey: s.period_key } },
          update: { checked: s.checked },
          create: { itemId: s.item_id, periodKey: s.period_key, checked: s.checked },
        })
        imported++
      } catch (e: any) {
        errors.push(`checklist_status ${s.item_id}: ${e.message}`)
      }
    }
  } else if (e2) {
    errors.push(`checklist_status: ${e2.message}`)
  }

  // 3. Tasks (old table has uuid PK)
  const { data: oldTasks, error: e3 } = await sb.from("tasks").select("*").order("position")
  if (!e3 && oldTasks?.length) {
    for (const t of oldTasks) {
      try {
        await db.task.upsert({
          where: { id: t.id },
          update: { label: t.label, done: t.done, position: t.position, dayKey: t.day_key, priority: t.priority },
          create: {
            id: t.id,
            label: t.label,
            done: t.done,
            position: t.position,
            dayKey: t.day_key,
            priority: t.priority,
          },
        })
        imported++
      } catch (e: any) {
        errors.push(`task ${t.id}: ${e.message}`)
      }
    }
  } else if (e3) {
    errors.push(`tasks: ${e3.message}`)
  }

  // 4. Mood Log (old table: day_key PK) → MoodDaily
  const { data: oldMood, error: e4 } = await sb.from("mood_log").select("*")
  if (!e4 && oldMood?.length) {
    for (const m of oldMood) {
      try {
        await db.moodDaily.upsert({
          where: { dayKey: m.day_key },
          update: { value: m.value, note: m.note },
          create: { dayKey: m.day_key, value: m.value, note: m.note },
        })
        imported++
      } catch (e: any) {
        errors.push(`mood_log ${m.day_key}: ${e.message}`)
      }
    }
  } else if (e4) {
    errors.push(`mood_log: ${e4.message}`)
  }

  // 5. Water Log
  const { data: oldWater, error: e5 } = await sb.from("water_log").select("*")
  if (!e5 && oldWater?.length) {
    for (const w of oldWater) {
      try {
        await db.waterLog.upsert({
          where: { dayKey: w.day_key },
          update: { count: w.count },
          create: { dayKey: w.day_key, count: w.count },
        })
        imported++
      } catch (e: any) {
        errors.push(`water_log ${w.day_key}: ${e.message}`)
      }
    }
  } else if (e5) {
    errors.push(`water_log: ${e5.message}`)
  }

  // 6. Macros Log
  const { data: oldMacros, error: e6 } = await sb.from("macros_log").select("*")
  if (!e6 && oldMacros?.length) {
    for (const m of oldMacros) {
      try {
        await db.macrosLog.upsert({
          where: { dayKey: m.day_key },
          update: { carbs: m.carbs || 0, protein: m.protein || 0, fat: m.fat || 0 },
          create: { dayKey: m.day_key, carbs: m.carbs || 0, protein: m.protein || 0, fat: m.fat || 0 },
        })
        imported++
      } catch (e: any) {
        errors.push(`macros_log ${m.day_key}: ${e.message}`)
      }
    }
  } else if (e6) {
    errors.push(`macros_log: ${e6.message}`)
  }

  // 7. Pyramid Log
  const { data: oldPyramid, error: e7 } = await sb.from("pyramid_log").select("*")
  if (!e7 && oldPyramid?.length) {
    for (const p of oldPyramid) {
      try {
        const counts = typeof p.counts === "string" ? p.counts : JSON.stringify(p.counts)
        await db.pyramidLog.upsert({
          where: { dayKey: p.day_key },
          update: { counts },
          create: { dayKey: p.day_key, counts },
        })
        imported++
      } catch (e: any) {
        errors.push(`pyramid_log ${p.day_key}: ${e.message}`)
      }
    }
  } else if (e7) {
    errors.push(`pyramid_log: ${e7.message}`)
  }

  // 8. Gratitude Log
  const { data: oldGrat, error: e8 } = await sb.from("gratitude_log").select("*")
  if (!e8 && oldGrat?.length) {
    for (const g of oldGrat) {
      try {
        const items = typeof g.items === "string" ? g.items : JSON.stringify(g.items)
        await db.gratitudeLog.upsert({
          where: { dayKey: g.day_key },
          update: { items },
          create: { dayKey: g.day_key, items },
        })
        imported++
      } catch (e: any) {
        errors.push(`gratitude_log ${g.day_key}: ${e.message}`)
      }
    }
  } else if (e8) {
    errors.push(`gratitude_log: ${e8.message}`)
  }

  // 9. Nutrition Settings
  const { data: oldNutri, error: e9 } = await sb.from("nutrition_settings").select("*").limit(1)
  if (!e9 && oldNutri?.length && oldNutri[0].settings) {
    try {
      const settings = typeof oldNutri[0].settings === "string"
        ? oldNutri[0].settings
        : JSON.stringify(oldNutri[0].settings)
      await db.nutritionSettings.upsert({
        where: { id: 1 },
        update: { settings },
        create: { id: 1, settings },
      })
      imported++
    } catch (e: any) {
      errors.push(`nutrition_settings: ${e.message}`)
    }
  } else if (e9) {
    errors.push(`nutrition_settings: ${e9.message}`)
  }

  // 10. Custom Modules → Modules
  const { data: oldCustoms, error: e10 } = await sb.from("custom_modules").select("*")
  if (!e10 && oldCustoms?.length) {
    for (const c of oldCustoms) {
      try {
        await db.module.upsert({
          where: { key: c.key },
          update: { label: c.label, accent: c.accent },
          create: {
            key: c.key,
            label: c.label,
            accent: c.accent,
            kind: "checklist",
            period: "day",
            builtin: false,
            position: 100,
          },
        })
        imported++
      } catch (e: any) {
        errors.push(`custom_module ${c.key}: ${e.message}`)
      }
    }
  } else if (e10) {
    errors.push(`custom_modules: ${e10.message}`)
  }

  return { imported, errors }
}

// Full pull: get all data from Supabase v2 tables and merge into SQLite
export async function fullPull(): Promise<{ pulled: number; errors: string[] }> {
  const sb = await getSupabaseClient()
  if (!sb) throw new Error("Supabase não configurado")

  const errors: string[] = []
  let pulled = 0

  // Modules
  const { data: mods, error: e1 } = await sb.from("v2_modules").select("*")
  if (!e1 && mods?.length) {
    for (const m of mods) {
      try {
        await db.module.upsert({
          where: { key: m.key },
          update: { label: m.label, accent: m.accent, kind: m.kind, period: m.period, position: m.position, builtin: m.builtin },
          create: { key: m.key, label: m.label, accent: m.accent, kind: m.kind, period: m.period, position: m.position, builtin: m.builtin },
        })
        pulled++
      } catch (e: any) { errors.push(`v2_modules ${m.key}: ${e.message}`) }
    }
  }

  // Module Groups
  const { data: grps, error: e2 } = await sb.from("v2_module_groups").select("*")
  if (!e2 && grps?.length) {
    for (const g of grps) {
      try {
        await db.moduleGroup.upsert({
          where: { id: g.id },
          update: { name: g.name, position: g.position, stacked: g.stacked },
          create: { id: g.id, name: g.name, position: g.position, stacked: g.stacked },
        })
        pulled++
      } catch (e: any) { errors.push(`v2_module_groups ${g.id}: ${e.message}`) }
    }
  }

  // Module Group Items
  const { data: gis, error: e3 } = await sb.from("v2_module_group_items").select("*")
  if (!e3 && gis?.length) {
    for (const i of gis) {
      try {
        await db.moduleGroupItem.upsert({
          where: { id: i.id },
          update: { groupId: i.group_id, moduleKey: i.module_key, position: i.position },
          create: { id: i.id, groupId: i.group_id, moduleKey: i.module_key, position: i.position },
        })
        pulled++
      } catch (e: any) { errors.push(`v2_module_group_items ${i.id}: ${e.message}`) }
    }
  }

  // Mood Moments
  const { data: mm, error: e4 } = await sb.from("v2_mood_moments").select("*")
  if (!e4 && mm?.length) {
    for (const m of mm) {
      try {
        await db.moodMoment.upsert({
          where: { id: m.id },
          update: { dayKey: m.day_key, time: m.time, value: m.value, note: m.note },
          create: { id: m.id, dayKey: m.day_key, time: m.time, value: m.value, note: m.note },
        })
        pulled++
      } catch (e: any) { errors.push(`v2_mood_moments ${m.id}: ${e.message}`) }
    }
  }

  // Mood Dailies
  const { data: md, error: e5 } = await sb.from("mood_dailies").select("*")
  if (!e5 && md?.length) {
    for (const d of md) {
      try {
        await db.moodDaily.upsert({
          where: { dayKey: d.day_key },
          update: { value: d.value, note: d.note },
          create: { dayKey: d.day_key, value: d.value, note: d.note },
        })
        pulled++
      } catch (e: any) { errors.push(`mood_dailies ${d.day_key}: ${e.message}`) }
    }
  }

  // Update lastPull
  await db.syncConfig.upsert({
    where: { id: 1 },
    update: { lastPull: new Date() },
    create: { id: 1, url: "", anonKey: "", lastPull: new Date() },
  })

  return { pulled, errors }
}