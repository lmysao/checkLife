import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'json'
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''

  const today = new Date()
  const toKey = to || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const fromKey = from || (() => {
    const d = new Date(today)
    d.setDate(d.getDate() - 30)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()

  try {
    if (type === 'json') {
      const data = await gatherAllData(fromKey, toKey)
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="ritual-${fromKey}_to_${toKey}.json"` },
      })
    }

    if (type === 'excel') {
      const buffer = await generateExcel(fromKey, toKey)
      return new NextResponse(buffer, {
        headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="ritual-${fromKey}_to_${toKey}.xlsx"` },
      })
    }

    if (type === 'diary') {
      const data = await gatherAllData(fromKey, toKey)
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="diary-${fromKey}_to_${toKey}.json"` },
      })
    }

    if (type === 'mood-image') {
      const data = await gatherAllData(fromKey, toKey)
      const html = generateMoodCalendarHTML(data, fromKey, toKey)
      return new Response(html, {
        headers: { 'Content-Type': 'text/html', 'Content-Disposition': `attachment; filename="mood-calendar-${fromKey}_to_${toKey}.html"` },
      })
    }

    return NextResponse.json({ error: 'Unknown export type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

async function gatherAllData(from: string, to: string) {
  const [modules, items, statuses, tasks, moodMoments, moodDailies, water, macros, pyramid, gratitude, nutri] = await Promise.all([
    db.module.findMany({ orderBy: { position: 'asc' } }),
    db.checklistItem.findMany({ where: { active: true }, orderBy: { position: 'asc' } }),
    db.checklistStatus.findMany(),
    db.task.findMany({ orderBy: [{ dayKey: 'asc' }, { position: 'asc' }] }),
    db.moodMoment.findMany({ where: { dayKey: { gte: from, lte: to } }, orderBy: [{ dayKey: 'asc' }, { time: 'asc' }] }),
    db.moodDaily.findMany({ where: { dayKey: { gte: from, lte: to } }, orderBy: { dayKey: 'asc' } }),
    db.waterLog.findMany({ where: { dayKey: { gte: from, lte: to } } }),
    db.macrosLog.findMany({ where: { dayKey: { gte: from, lte: to } } }),
    db.pyramidLog.findMany({ where: { dayKey: { gte: from, lte: to } } }),
    db.gratitudeLog.findMany({ where: { dayKey: { gte: from, lte: to } } }),
    db.nutritionSettings.findUnique({ where: { id: 1 } }),
  ])

  return {
    exportedAt: new Date().toISOString(),
    period: { from, to },
    modules,
    checklistItems: items,
    checklistStatuses: statuses,
    tasks,
    moodMoments,
    moodDailies,
    waterLogs: water.map(w => ({ dayKey: w.dayKey, count: w.count })),
    macrosLogs: macros.map(m => ({ dayKey: m.dayKey, carbs: m.carbs, protein: m.protein, fat: m.fat })),
    pyramidLogs: pyramid.map(p => ({ dayKey: p.dayKey, counts: JSON.parse(p.counts) })),
    gratitudeLogs: gratitude.map(g => ({ dayKey: g.dayKey, items: JSON.parse(g.items) })),
    nutritionSettings: nutri ? JSON.parse(nutri.settings) : null,
  }
}

async function generateExcel(from: string, to: string) {
  const [water, macros, pyramid, tasks] = await Promise.all([
    db.waterLog.findMany({ where: { dayKey: { gte: from, lte: to } }, orderBy: { dayKey: 'asc' } }),
    db.macrosLog.findMany({ where: { dayKey: { gte: from, lte: to } }, orderBy: { dayKey: 'asc' } }),
    db.pyramidLog.findMany({ where: { dayKey: { gte: from, lte: to } }, orderBy: { dayKey: 'asc' } }),
    db.task.findMany({ where: { dayKey: { gte: from, lte: to } }, orderBy: [{ dayKey: 'asc' }, { position: 'asc' }] }),
  ])

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Ritual Diário'

  // Sheet 1: Water
  const ws1 = wb.addWorksheet('Hidratação')
  ws1.columns = [{ header: 'Data', key: 'day' }, { header: 'Copos', key: 'count' }]
  ws1.addRow({ day: 'Data', count: 'Copos' }).font = { bold: true }
  water.forEach(w => ws1.addRow({ day: w.dayKey, count: w.count }))

  // Sheet 2: Macros
  const ws2 = wb.addWorksheet('Macros')
  ws2.columns = [{ header: 'Data', key: 'day' }, { header: 'Carboidratos (g)', key: 'carbs' }, { header: 'Proteínas (g)', key: 'protein' }, { header: 'Gorduras (g)', key: 'fat' }]
  ws2.addRow({ day: 'Data', carbs: 'Carboidratos (g)', protein: 'Proteínas (g)', fat: 'Gorduras (g)' }).font = { bold: true }
  macros.forEach(m => ws2.addRow({ day: m.dayKey, carbs: m.carbs, protein: m.protein, fat: m.fat }))

  // Sheet 3: Pyramid
  const ws3 = wb.addWorksheet('Pirâmide Alimentar')
  ws3.columns = [{ header: 'Data', key: 'day' }]
  const allGroups = new Set<string>()
  pyramid.forEach(p => { const c = JSON.parse(p.counts); Object.keys(c).forEach(k => allGroups.add(k)) })
  const groupArr = Array.from(allGroups)
  groupArr.forEach(g => ws3.addColumn({ header: g, key: g }))
  ws3.getRow(1).font = { bold: true }
  ws3.getRow(1).values = ['Data', ...groupArr]
  pyramid.forEach(p => {
    const c = JSON.parse(p.counts)
    ws3.addRow({ day: p.dayKey, ...groupArr.map(g => c[g] || 0) })
  })

  // Sheet 4: Tasks
  const ws4 = wb.addWorksheet('Tarefas')
  ws4.columns = [{ header: 'Data', key: 'day' }, { header: 'Tarefa', key: 'label' }, { header: 'Prioridade', key: 'priority' }, { header: 'Concluída', key: 'done' }]
  ws4.addRow({ day: 'Data', label: 'Tarefa', priority: 'Prioridade', done: 'Concluída' }).font = { bold: true }
  tasks.forEach(t => ws4.addRow({ day: t.dayKey, label: t.label, priority: t.priority, done: t.done ? 'Sim' : 'Não' }))

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

function generateMoodCalendarHTML(data: any, from: string, to: string) {
  const MOOD_COLORS: Record<number, string> = { 1: '#B5566B', 2: '#D6A23C', 3: '#9C6B2E', 4: '#6B7A3A', 5: '#3C6B5A' }
  const MOOD_EMOJIS: Record<number, string> = { 1: '😞', 2: '🙁', 3: '😐', 4: '🙂', 5: '😄' }
  const days: { key: string; value: number; emoji: string }[] = []

  // Generate all days in range
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  const start = new Date(fy, fm - 1, fd)
  const end = new Date(ty, tm - 1, td)
  const moodMap: Record<string, number> = {}
  data.moodDailies.forEach((m: any) => { moodMap[m.dayKey] = m.value })

  const d = new Date(start)
  while (d <= end) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const v = moodMap[key] || 0
    days.push({ key, value: v, emoji: v ? MOOD_EMOJIS[v] : '' })
    d.setDate(d.getDate() + 1)
  }

  // Group by month
  const months: Record<string, typeof days> = {}
  days.forEach(d => {
    const month = d.key.slice(0, 7)
    if (!months[month]) months[month] = []
    months[month].push(d)
  })

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Calendário de Humor</title>
<style>
  body { font-family: -apple-system, sans-serif; background: #F1E4C9; padding: 24px; }
  h1 { font-size: 24px; color: #2B2117; margin-bottom: 4px; }
  .sub { color: #6B5D4D; font-size: 12px; margin-bottom: 24px; }
  .month { margin-bottom: 24px; }
  .month h2 { font-size: 16px; color: #2B2117; margin-bottom: 8px; }
  .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; max-width: 500px; }
  .cell { width: 60px; height: 60px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #FFFBF2; border: 1px solid #D6C9B0; }
  .cell .emoji { font-size: 24px; }
  .cell .day { font-size: 10px; color: #6B5D4D; margin-top: 2px; }
  .cell .dow { font-size: 10px; color: #6B5D4D; font-weight: 600; height: 24px; background: transparent; border: none; }
  .legend { display: flex; gap: 12px; margin-top: 16px; }
  .legend-item { display: flex; align-items: center; gap: 4px; font-size: 12px; }
  .legend-dot { width: 16px; height: 16px; border-radius: 4px; }
</style></head><body>
  <h1>Calendário de Humor</h1>
  <p class="sub">${from} a ${to}</p>
  ${Object.entries(months).map(([month, days]) => {
    const [y, m] = month.split('-')
    const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
    const dayNames = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']
    // Pad first day
    const firstDayOfWeek = new Date(parseInt(y), parseInt(m) - 1, 1).getDay()
    const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
    return `<div class="month"><h2>${monthNames[parseInt(m) - 1]} ${y}</h2>
      <div class="grid">
        ${dayNames.map(d => `<div class="cell dow">${d}</div>`).join('')}
        ${Array(offset).fill('<div class="cell" style="background:transparent;border:none;"></div>').join('')}
        ${days.map(d => `<div class="cell" style="background:${d.value ? MOOD_COLORS[d.value] + '22' : '#FFFBF2'};border-color:${d.value ? MOOD_COLORS[d.value] : '#D6C9B0'}">
          <span class="emoji">${d.emoji}</span><span class="day">${d.key.slice(8)}</span>
        </div>`).join('')}
      </div></div>`
  }).join('')}
  <div class="legend">
    ${[1,2,3,4,5].map(v => `<div class="legend-item"><div class="legend-dot" style="background:${MOOD_COLORS[v]}"></div>${MOOD_EMOJIS[v]} ${['Muito ruim','Ruim','Neutro','Bom','Muito bom'][v-1]}</div>`).join('')}
  </div>
</body></html>`
}