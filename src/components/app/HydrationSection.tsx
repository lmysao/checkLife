'use client'

import { useAppStore } from '@/lib/store'
import { todayKey } from '@/lib/helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'
import { motion } from 'framer-motion'

interface Props {
  onOpenSettings: () => void
}

export function HydrationSection({ onOpenSettings }: Props) {
  const waterLogs = useAppStore(s => s.waterLogs)
  const nutritionSettings = useAppStore(s => s.nutritionSettings)
  const setWater = useAppStore(s => s.setWater)

  const tk = todayKey()
  const todayLog = waterLogs.find(l => l.dayKey === tk)
  const count = todayLog?.count || 0

  const waterGoal = nutritionSettings?.waterAutoCalc
    ? Math.round((nutritionSettings.weight * 35) / nutritionSettings.cupSizeMl)
    : nutritionSettings?.waterGoalOverride || 8

  const pct = Math.min(1, count / waterGoal)
  const circumference = 2 * Math.PI * 42
  const strokeDashoffset = circumference * (1 - pct)

  const handleSet = async (n: number) => {
    const newVal = Math.max(0, count + n)
    await setWater(tk, newVal)
  }

  const handleZero = async () => {
    await setWater(tk, 0)
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-[family-name:var(--font-bricolage)]">
            💧 Hidratação
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onOpenSettings}>
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex flex-col items-center">
          {/* SVG Ring */}
          <div className="relative w-32 h-32 mb-3">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--secondary)" strokeWidth="6" />
              <motion.circle
                cx="50" cy="50" r="42" fill="none"
                stroke="#2E6B62"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold font-[family-name:var(--font-bricolage)]" style={{ color: pct >= 1 ? '#2E6B62' : 'var(--foreground)' }}>
                {count}
              </span>
              <span className="text-xs text-muted-foreground">/ {waterGoal} copos</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => handleSet(-1)}>
              −1
            </Button>
            <Button size="sm" className="h-9 px-5" style={{ backgroundColor: '#2E6B62' }} onClick={() => handleSet(1)}>
              +1 copo
            </Button>
            <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={handleZero}>
              0
            </Button>
          </div>

          {/* Cup grid */}
          <div className="flex flex-wrap gap-1 mt-3 justify-center max-w-[240px]">
            {Array.from({ length: waterGoal }).map((_, i) => (
              <motion.div
                key={i}
                className="w-6 h-6 rounded-md text-xs flex items-center justify-center text-white font-medium"
                style={{ backgroundColor: i < count ? '#2E6B62' : 'var(--secondary)', color: i < count ? 'white' : 'var(--muted-foreground)' }}
                initial={false}
                animate={{ scale: i === count - 1 ? 1.2 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                {i < count ? '💧' : ''}
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}