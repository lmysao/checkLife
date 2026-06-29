import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const day = searchParams.get('day')
  if (day) {
    const log = await db.pyramidLog.findUnique({ where: { dayKey: day } })
    return NextResponse.json(log ? { dayKey: log.dayKey, counts: JSON.parse(log.counts) } : { dayKey: day, counts: {} })
  }
  const logs = await db.pyramidLog.findMany({ orderBy: { dayKey: 'desc' } })
  return NextResponse.json(logs.map(l => ({ dayKey: l.dayKey, counts: JSON.parse(l.counts) })))
}

export async function POST(req: Request) {
  const { dayKey, counts } = await req.json()
  const log = await db.pyramidLog.upsert({
    where: { dayKey },
    update: { counts: JSON.stringify(counts), updatedAt: new Date() },
    create: { dayKey, counts: JSON.stringify(counts) },
  })
  return NextResponse.json({ dayKey: log.dayKey, counts: JSON.parse(log.counts) })
}