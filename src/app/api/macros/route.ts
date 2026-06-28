import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const day = searchParams.get('day')
  if (day) {
    const log = await db.macrosLog.findUnique({ where: { dayKey: day } })
    return NextResponse.json(log || { dayKey: day, carbs: 0, protein: 0, fat: 0 })
  }
  const logs = await db.macrosLog.findMany({ orderBy: { dayKey: 'desc' } })
  return NextResponse.json(logs)
}

export async function POST(req: Request) {
  const { dayKey, field, grams } = await req.json()
  const log = await db.macrosLog.upsert({
    where: { dayKey },
    update: { [field]: grams, updatedAt: new Date() },
    create: { dayKey, carbs: field === 'carbs' ? grams : 0, protein: field === 'protein' ? grams : 0, fat: field === 'fat' ? grams : 0 },
  })
  return NextResponse.json(log)
}

export async function PUT(req: Request) {
  const { dayKey, carbs, protein, fat } = await req.json()
  const log = await db.macrosLog.upsert({
    where: { dayKey },
    update: { carbs, protein, fat, updatedAt: new Date() },
    create: { dayKey, carbs, protein, fat },
  })
  return NextResponse.json(log)
}