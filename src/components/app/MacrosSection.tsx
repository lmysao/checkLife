'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { todayKey } from '@/lib/helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Wheat, Beef, Droplets } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

const MACRO_FIELDS = [
  { key: 'carbs', label: 'Carboidratos', color: '#D6A23C', icon: <Wheat className="h-3.5 w-3.5" />, quick: [25, 50, 75, 100] },
  { key: 'protein', label: 'Proteína', color: '#C1502E', icon: <Beef className="h-3.5 w-3.5" />, quick: [10, 20, 30, 50] },
  { key: 'fat', label: 'Gordura', color: '#9C6B2E', icon: <Droplets className="h-3.5 w-3.5" />, quick: [5, 10, 15, 25] },
] as const

export function MacrosSection() {
  const macrosLogs = useAppStore(s => s.macrosLogs)
  const nutritionSettings = useAppStore(s => s.nutritionSettings)
  const addMacro = useAppStore(s => s.addMacro)
  const setAllMacros = useAppStore(s => s.setAllMacros)

  const tk = todayKey()
  const todayLog = macrosLogs.find(l => l.dayKey === tk)
  const [addMode, setAddMode] = useState<string | null>(null)
  const [addValue, setAddValue] = useState('')

  const macros = nutritionSettings?.macros

  const handleQuickAdd = async (field: string, grams: number) => {
    const current = todayLog?.[field as keyof typeof todayLog] || 0
    await setAllMacros(tk,
      field === 'carbs' ? current + grams : (todayLog?.carbs || 0),
      field === 'protein' ? current + grams : (todayLog?.protein || 0),
      field === 'fat' ? current + grams : (todayLog?.fat || 0),
    )
    toast.success(`+${grams}g adicionado`)
  }

  const handleCustomAdd = async (field: string) => {
    const grams = parseInt(addValue)
    if (isNaN(grams) || grams <= 0) return
    const current = todayLog?.[field as keyof typeof todayLog] || 0
    await setAllMacros(tk,
      field === 'carbs' ? current + grams : (todayLog?.carbs || 0),
      field === 'protein' ? current + grams : (todayLog?.protein || 0),
      field === 'fat' ? current + grams : (todayLog?.fat || 0),
    )
    setAddMode(null)
    setAddValue('')
    toast.success(`+${grams}g adicionado`)
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-base font-[family-name:var(--font-bricolage)]">🍽️ Macronutrientes</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {MACRO_FIELDS.map(field => {
          const current = todayLog?.[field.key as keyof typeof todayLog] || 0
          const goal = macros?.[field.key as keyof typeof macros]?.goal || 100
          const pct = Math.min(100, Math.round((current / goal) * 100))
          const unit = macros?.[field.key as keyof typeof macros]?.unit || 'g'

          return (
            <div key={field.key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span style={{ color: field.color }}>{field.icon}</span>
                  <span className="text-sm font-medium">{field.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  <span className="font-semibold" style={{ color: field.color }}>{current}g</span> / {goal}{unit}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2.5 mb-2">
                <motion.div
                  className="h-2.5 rounded-full"
                  style={{ backgroundColor: field.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
              <div className="flex gap-1">
                {field.quick.map(q => (
                  <Button key={q} variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => handleQuickAdd(field.key, q)}>
                    +{q}g
                  </Button>
                ))}
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setAddMode(addMode === field.key ? null : field.key); setAddValue('') }}>
                  ...
                </Button>
              </div>
              {addMode === field.key && (
                <div className="flex gap-1 mt-1.5">
                  <Input
                    type="number"
                    placeholder="g"
                    value={addValue}
                    onChange={e => setAddValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCustomAdd(field.key) }}
                    className="h-7 text-sm w-20"
                    autoFocus
                  />
                  <Button size="sm" className="h-7 text-xs" style={{ backgroundColor: field.color }} onClick={() => handleCustomAdd(field.key)}>
                    Adicionar
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}