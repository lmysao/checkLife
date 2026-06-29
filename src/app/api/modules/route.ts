import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const modules = await db.module.findMany({ orderBy: { position: 'asc' } })
  return NextResponse.json(modules)
}

export async function POST(req: Request) {
  const { key, label, accent, kind, period, builtin, position } = await req.json()
  const mod = await db.module.create({
    data: { key, label, accent: accent || '#C1502E', kind: kind || 'checklist', period: period || 'day', builtin: builtin || false, position: position ?? 0 },
  })
  return NextResponse.json(mod)
}

export async function PUT(req: Request) {
  const { key, label, accent, position } = await req.json()
  const data: Record<string, unknown> = {}
  if (label !== undefined) data.label = label
  if (accent !== undefined) data.accent = accent
  if (position !== undefined) data.position = position
  const mod = await db.module.update({ where: { key }, data })
  return NextResponse.json(mod)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })
  // Delete associated items and statuses
  const items = await db.checklistItem.findMany({ where: { module: key }, select: { id: true } })
  if (items.length > 0) {
    await db.checklistStatus.deleteMany({ where: { itemId: { in: items.map(i => i.id) } } })
    await db.checklistItem.deleteMany({ where: { module: key } })
  }
  // Remove from groups
  await db.moduleGroupItem.deleteMany({ where: { moduleKey: key } })
  await db.module.delete({ where: { key } })
  return NextResponse.json({ ok: true })
}