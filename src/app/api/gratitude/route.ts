import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const day = searchParams.get('day')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (from && to) {
    const logs = await db.gratitudeLog.findMany({ where: { dayKey: { gte: from, lte: to } } })
    return NextResponse.json(logs.map(l => ({ dayKey: l.dayKey, items: JSON.parse(l.items) })))
  }
  if (day) {
    const log = await db.gratitudeLog.findUnique({ where: { dayKey: day } })
    return NextResponse.json(log ? { dayKey: log.dayKey, items: JSON.parse(log.items) } : { dayKey: day, items: ["", "", ""] })
  }
  const logs = await db.gratitudeLog.findMany({ orderBy: { dayKey: 'desc' } })
  return NextResponse.json(logs.map(l => ({ dayKey: l.dayKey, items: JSON.parse(l.items) })))
}

export async function POST(req: Request) {
  const { dayKey, items } = await req.json()
  const log = await db.gratitudeLog.upsert({
    where: { dayKey },
    update: { items: JSON.stringify(items), updatedAt: new Date() },
    create: { dayKey, items: JSON.stringify(items) },
  })
  return NextResponse.json({ dayKey: log.dayKey, items: JSON.parse(log.items) })
}