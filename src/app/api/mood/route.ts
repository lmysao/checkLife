import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET ?day=YYYY-MM-DD  → returns { moments: [...], daily: {...} }
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const dayKey = searchParams.get('day')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (from && to) {
    // Range query for history/diary
    const moments = await db.moodMoment.findMany({
      where: { dayKey: { gte: from, lte: to } },
      orderBy: [{ dayKey: 'asc' }, { time: 'asc' }],
    })
    const dailies = await db.moodDaily.findMany({
      where: { dayKey: { gte: from, lte: to } },
      orderBy: { dayKey: 'asc' },
    })
    return NextResponse.json({ moments, dailies })
  }

  if (dayKey) {
    const moments = await db.moodMoment.findMany({
      where: { dayKey },
      orderBy: { time: 'asc' },
    })
    const daily = await db.moodDaily.findUnique({ where: { dayKey } })
    return NextResponse.json({ moments, daily })
  }

  // All mood data
  const moments = await db.moodMoment.findMany({ orderBy: { createdAt: 'desc' } })
  const dailies = await db.moodDaily.findMany({ orderBy: { dayKey: 'desc' } })
  return NextResponse.json({ moments, dailies })
}

// POST: create a mood moment
export async function POST(req: Request) {
  const { dayKey, time, value, note } = await req.json()
  const moment = await db.moodMoment.create({ data: { dayKey, time, value, note: note || null } })
  return NextResponse.json(moment)
}

// PUT: update daily mood evaluation
export async function PUT(req: Request) {
  const { dayKey, value, note } = await req.json()
  const daily = await db.moodDaily.upsert({
    where: { dayKey },
    update: { value, note: note || null, updatedAt: new Date() },
    create: { dayKey, value, note: note || null },
  })
  return NextResponse.json(daily)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await db.moodMoment.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}