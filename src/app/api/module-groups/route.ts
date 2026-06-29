import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const groups = await db.moduleGroup.findMany({
    orderBy: { position: 'asc' },
    include: { items: { orderBy: { position: 'asc' } } },
  })
  return NextResponse.json(groups)
}

export async function POST(req: Request) {
  const { name, stacked } = await req.json()
  const maxPos = await db.moduleGroup.aggregate({ _max: { position: true } })
  const group = await db.moduleGroup.create({
    data: { name, stacked: !!stacked, position: (maxPos._max.position ?? -1) + 1 },
  })
  return NextResponse.json(group)
}

export async function PUT(req: Request) {
  const { id, name, position, stacked } = await req.json()
  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name
  if (position !== undefined) data.position = position
  if (stacked !== undefined) data.stacked = stacked
  const group = await db.moduleGroup.update({ where: { id }, data })
  return NextResponse.json(group)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await db.moduleGroup.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}