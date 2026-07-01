import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

const BUILTIN_MODULES = [
  { key: "resumo",      label: "Resumo",      kind: "dashboard",    accent: "#C1502E", builtin: true, position: 0 },
  { key: "manha",       label: "Manhã",       kind: "checklist",    period: "day",  accent: "#C1502E", builtin: true, position: 1 },
  { key: "bemestar",    label: "Bem-estar",   kind: "mental_humor", period: "day",  accent: "#3C6B5A", builtin: true, position: 2 },
  { key: "organizacao", label: "Organização",  kind: "checklist",    period: "day",  accent: "#6B7A3A", builtin: true, position: 3 },
  { key: "noturno",     label: "Noturno",     kind: "checklist",    period: "day",  accent: "#4A3B6B", builtin: true, position: 4 },
  { key: "semanal",     label: "Semanal",     kind: "checklist",    period: "week", accent: "#9C6B2E", builtin: true, position: 5 },
  { key: "saida",       label: "Saída",       kind: "checklist",    period: "day",  accent: "#B5566B", builtin: true, position: 6 },
  { key: "tarefas",     label: "Tarefas",     kind: "tasks",        accent: "#2E6B62", builtin: true, position: 7 },
  { key: "historico",   label: "Histórico",   kind: "history",      accent: "#5C4A3A", builtin: true, position: 8 },
]

const DEFAULT_CHECKLISTS: Record<string, string[]> = {
  manha: ["Tomei banho","Lavei o rosto","Escovei os dentes","Usei fio dental","Cortei/limpei as unhas","Passei desodorante","Pentes/arrumei o cabelo"],
  bemestar: ["Dormi bem","Tomei água suficiente","Tomei sol / fui lá fora","Fiz uma pausa sem celular","Falei com alguém hoje","Respirei/meditei um pouco"],
  organizacao: ["Guarda-roupa organizado","Roupas lavadas","Cama feita","Mesa organizada","Louça lavada","Lixo retirado"],
  noturno: ["Escovei os dentes","Lavei o rosto","Separei a roupa de amanhã","Carreguei o celular","Configurei o alarme"],
  semanal: ["Troquei o lençol","Limpei o quarto/casa","Organizei o guarda-roupa a fundo","Cortei as unhas a fundo","Cortei/aparei o cabelo"],
  saida: ["Passei perfume","Passei desodorante","Peguei carteira/documentos","Peguei celular e carregador","Peguei as chaves","Tranquei a porta","Levei garrafa de água","Conferi o tempo (chuva/frio)"],
}

const DEFAULT_NUTRITION_SETTINGS = {
  weight: 70,
  cupSizeMl: 250,
  waterAutoCalc: true,
  waterGoalOverride: 8,
  macros: {
    carbs:   { goal: 250, unit: "g" },
    protein: { goal: 80,  unit: "g" },
    fat:     { goal: 60,  unit: "g" },
  },
  pyramidGroups: [
    { id: "g_acucar",  label: "Açúcares e gorduras", goal: 1, color: "#B5566B", icon: "🍭", note: "use com moderação" },
    { id: "g_protei",  label: "Carnes, ovos, leite",  goal: 3, color: "#C1502E", icon: "🥩" },
    { id: "g_frutas",  label: "Frutas",               goal: 3, color: "#D6A23C", icon: "🍎" },
    { id: "g_verdur",  label: "Verduras e legumes",   goal: 4, color: "#6B7A3A", icon: "🥬" },
    { id: "g_cereai",  label: "Cereais e grãos",      goal: 6, color: "#9C6B2E", icon: "🍞" },
  ],
}

export async function POST() {
  try {
    // Seed modules (upsert - don't overwrite custom labels/colors)
    for (const m of BUILTIN_MODULES) {
      await db.module.upsert({
        where: { key: m.key },
        update: {},
        create: m,
      })
    }

    // Seed checklist items only if module has no items
    for (const [mod, items] of Object.entries(DEFAULT_CHECKLISTS)) {
      const existing = await db.checklistItem.count({ where: { module: mod } })
      if (existing === 0) {
        for (let i = 0; i < items.length; i++) {
          await db.checklistItem.create({
            data: { module: mod, label: items[i], position: i, active: true },
          })
        }
      }
    }

    // Seed nutrition settings if not exists
    const nutri = await db.nutritionSettings.findUnique({ where: { id: 1 } })
    if (!nutri) {
      await db.nutritionSettings.create({
        data: { id: 1, settings: JSON.stringify(DEFAULT_NUTRITION_SETTINGS) },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}