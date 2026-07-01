import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const dayKey = searchParams.get('day')
  const tasks = await db.task.findMany({
    where: dayKey ? { dayKey } : {},
    orderBy: [{ dayKey: 'asc' }, { position: 'asc' }],
  })
  return NextResponse.json(tasks)
}

export async function POST(req: Request) {
  const { label, dayKey, priority } = await req.json()
  const maxPos = await db.task.aggregate({
    where: { dayKey },
    _max: { position: true },
  })
  const task = await db.task.create({
    data: { label, dayKey, priority: priority || 'media', position: (maxPos._max.position ?? -1) + 1 },
  })
  return NextResponse.json(task)
}

export async function PUT(req: Request) {
  const { id, label, done, dayKey, priority, moveDir } = await req.json()

  if (moveDir !== undefined) {
    const task = await db.task.findUnique({ where: { id } })
    if (!task) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const siblings = await db.task.findMany({
      where: { dayKey: task.dayKey },
      orderBy: { position: 'asc' },
    })
    const idx = siblings.findIndex(s => s.id === id)
    const swapIdx = idx + moveDir
    if (swapIdx < 0 || swapIdx >= siblings.length) return NextResponse.json({ ok: true })
    const a = siblings[idx], b = siblings[swapIdx]
    await db.$transaction([
      db.task.update({ where: { id: a.id }, data: { position: b.position } }),
      db.task.update({ where: { id: b.id }, data: { position: a.position } }),
    ])
    return NextResponse.json({ ok: true })
  }

  const data: Record<string, unknown> = {}
  if (label !== undefined) data.label = label
  if (done !== undefined) data.done = done
  if (dayKey !== undefined) data.dayKey = dayKey
  if (priority !== undefined) data.priority = priority
  const task = await db.task.update({ where: { id }, data })
  return NextResponse.json(task)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await db.task.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}