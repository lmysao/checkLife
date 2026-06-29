'use client'

import { useAppStore } from '@/lib/store'
import { todayKey } from '@/lib/helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { motion } from 'framer-motion'

export function PyramidSection() {
  const pyramidLogs = useAppStore(s => s.pyramidLogs)
  const nutritionSettings = useAppStore(s => s.nutritionSettings)
  const setPyramidCounts = useAppStore(s => s.setPyramidCounts)

  const tk = todayKey()
  const todayLog = pyramidLogs.find(l => l.dayKey === tk)
  const counts = todayLog?.counts || {}
  const groups = nutritionSettings?.pyramidGroups || []

  const handleTap = async (groupId: string, dir: number) => {
    const newCounts = { ...counts }
    newCounts[groupId] = Math.max(0, (newCounts[groupId] || 0) + dir)
    await setPyramidCounts(tk, newCounts)
  }

  // Render from top (narrowest) to bottom (widest)
  const sorted = [...groups].reverse()

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-base font-[family-name:var(--font-bricolage)]">🔺 Pirâmide alimentar</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex flex-col items-center gap-1">
          {sorted.map((g, idx) => {
            const current = counts[g.id] || 0
            const pct = g.goal > 0 ? Math.min(1, current / g.goal) : 0
            const widthPct = 40 + (idx / (sorted.length - 1 || 1)) * 60

            return (
              <motion.button
                key={g.id}
                onClick={() => handleTap(g.id, 1)}
                onContextMenu={e => { e.preventDefault(); handleTap(g.id, -1) }}
                className="relative w-full flex flex-col items-center justify-center py-2 rounded-lg cursor-pointer hover:opacity-90 transition-opacity active:scale-[0.98]"
                style={{ width: `${widthPct}%`, backgroundColor: g.color + '20' }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute inset-0 rounded-lg" style={{
                  backgroundColor: g.color,
                  opacity: 0.15 + pct * 0.35,
                }} />
                <div className="relative z-10 flex items-center gap-1.5">
                  <span className="text-base">{g.icon}</span>
                  <span className="text-xs font-medium truncate max-w-[120px]">{g.label}</span>
                  <span className="text-xs font-bold" style={{ color: g.color }}>
                    {current}/{g.goal}
                  </span>
                </div>
                {g.note && (
                  <span className="relative z-10 text-[10px] text-muted-foreground">{g.note}</span>
                )}
              </motion.button>
            )
          })}
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">Toque para +1 · Clique direito para −1</p>
      </CardContent>
    </Card>
  )
}