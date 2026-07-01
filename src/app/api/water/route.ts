import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const day = searchParams.get('day')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (from && to) {
    const logs = await db.waterLog.findMany({ where: { dayKey: { gte: from, lte: to } } })
    return NextResponse.json(logs)
  }
  if (day) {
    const log = await db.waterLog.findUnique({ where: { dayKey: day } })
    return NextResponse.json(log || { dayKey: day, count: 0 })
  }
  const logs = await db.waterLog.findMany({ orderBy: { dayKey: 'desc' } })
  return NextResponse.json(logs)
}

export async function POST(req: Request) {
  const { dayKey, count } = await req.json()
  const log = await db.waterLog.upsert({
    where: { dayKey },
    update: { count, updatedAt: new Date() },
    create: { dayKey, count },
  })
  return NextResponse.json(log)
}