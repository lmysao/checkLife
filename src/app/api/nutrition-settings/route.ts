import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  let settings = await db.nutritionSettings.findUnique({ where: { id: 1 } })
  if (!settings) {
    const defaults = {
      weight: 70, cupSizeMl: 250, waterAutoCalc: true, waterGoalOverride: 8,
      macros: { carbs: { goal: 250, unit: "g" }, protein: { goal: 80, unit: "g" }, fat: { goal: 60, unit: "g" } },
      pyramidGroups: [
        { id: "g_acucar", label: "Açúcares e gorduras", goal: 1, color: "#B5566B", icon: "🍭", note: "use com moderação" },
        { id: "g_protei", label: "Carnes, ovos, leite", goal: 3, color: "#C1502E", icon: "🥩" },
        { id: "g_frutas", label: "Frutas", goal: 3, color: "#D6A23C", icon: "🍎" },
        { id: "g_verdur", label: "Verduras e legumes", goal: 4, color: "#6B7A3A", icon: "🥬" },
        { id: "g_cereai", label: "Cereais e grãos", goal: 6, color: "#9C6B2E", icon: "🍞" },
      ],
    }
    settings = await db.nutritionSettings.create({ data: { id: 1, settings: JSON.stringify(defaults) } })
  }
  return NextResponse.json({ id: settings.id, ...JSON.parse(settings.settings) })
}

export async function PUT(req: Request) {
  const body = await req.json()
  const { id, ...rest } = body
  const settings = await db.nutritionSettings.upsert({
    where: { id: 1 },
    update: { settings: JSON.stringify(rest), updatedAt: new Date() },
    create: { id: 1, settings: JSON.stringify(rest) },
  })
  return NextResponse.json({ id: settings.id, ...JSON.parse(settings.settings) })
}