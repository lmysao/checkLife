import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const moduleKey = searchParams.get('module')
  const items = await db.checklistItem.findMany({
    where: moduleKey ? { module: moduleKey, active: true } : {},
    orderBy: { position: 'asc' },
  })
  return NextResponse.json(items)
}

export async function POST(req: Request) {
  const { module: moduleKey, label } = await req.json()
  const maxPos = await db.checklistItem.aggregate({
    where: { module: moduleKey },
    _max: { position: true },
  })
  const item = await db.checklistItem.create({
    data: { module: moduleKey, label, position: (maxPos._max.position ?? -1) + 1, active: true },
  })
  return NextResponse.json(item)
}

export async function PUT(req: Request) {
  const { id, label, position, active, module: moduleKey } = await req.json()
  if (moduleKey && label !== undefined) {
    // Reorder: swap positions
    const item = await db.checklistItem.findUnique({ where: { id } })
    if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const siblings = await db.checklistItem.findMany({
      where: { module: item.module },
      orderBy: { position: 'asc' },
    })
    const idx = siblings.findIndex(s => s.id === id)
    const dir = label === 'up' ? -1 : 1 // reuse label field for direction
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= siblings.length) return NextResponse.json({ ok: true })
    const a = siblings[idx], b = siblings[swapIdx]
    await db.$transaction([
      db.checklistItem.update({ where: { id: a.id }, data: { position: b.position } }),
      db.checklistItem.update({ where: { id: b.id }, data: { position: a.position } }),
    ])
    return NextResponse.json({ ok: true })
  }
  const data: Record<string, unknown> = {}
  if (label !== undefined) data.label = label
  if (position !== undefined) data.position = position
  if (active !== undefined) data.active = active
  const item = await db.checklistItem.update({ where: { id }, data })
  return NextResponse.json(item)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await db.checklistStatus.deleteMany({ where: { itemId: id } })
  await db.checklistItem.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}