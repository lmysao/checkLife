import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const statuses = await db.checklistStatus.findMany()
  return NextResponse.json(statuses)
}

export async function POST(req: Request) {
  const { itemId, periodKey, checked } = await req.json()
  const status = await db.checklistStatus.upsert({
    where: { itemId_periodKey: { itemId, periodKey } },
    update: { checked, updatedAt: new Date() },
    create: { itemId, periodKey, checked },
  })
  return NextResponse.json(status)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const itemId = searchParams.get('itemId')
  const periodKey = searchParams.get('periodKey')
  if (!itemId || !periodKey) return NextResponse.json({ error: 'missing params' }, { status: 400 })
  await db.checklistStatus.delete({ where: { itemId_periodKey: { itemId, periodKey } } })
  return NextResponse.json({ ok: true })
}