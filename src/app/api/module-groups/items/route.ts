import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { groupId, moduleKey } = await req.json()
  const maxPos = await db.moduleGroupItem.aggregate({
    where: { groupId },
    _max: { position: true },
  })
  const item = await db.moduleGroupItem.create({
    data: { groupId, moduleKey, position: (maxPos._max.position ?? -1) + 1 },
  })
  return NextResponse.json(item)
}

export async function PUT(req: Request) {
  const { id, groupId, moduleKey, position } = await req.json()
  const data: Record<string, unknown> = {}
  if (groupId !== undefined) data.groupId = groupId
  if (moduleKey !== undefined) data.moduleKey = moduleKey
  if (position !== undefined) data.position = position
  const item = await db.moduleGroupItem.update({ where: { id }, data })
  return NextResponse.json(item)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await db.moduleGroupItem.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}