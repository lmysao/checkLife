'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { todayKey, nowTime, MOOD_OPTIONS, MOOD_COLORS } from '@/lib/helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Clock, Smile } from 'lucide-react'
import { toast } from 'sonner'

export function MoodSection() {
  const moodMoments = useAppStore(s => s.moodMoments)
  const moodDailies = useAppStore(s => s.moodDailies)
  const addMoodMoment = useAppStore(s => s.addMoodMoment)
  const deleteMoodMoment = useAppStore(s => s.deleteMoodMoment)
  const saveMoodDaily = useAppStore(s => s.saveMoodDaily)

  const tk = todayKey()
  const [showAddMoment, setShowAddMoment] = useState(false)
  const [newTime, setNewTime] = useState(nowTime())
  const [newValue, setNewValue] = useState(3)
  const [newNote, setNewNote] = useState('')
  const [dailyValue, setDailyValue] = useState(3)
  const [dailyNote, setDailyNote] = useState('')

  const todayMoments = moodMoments
    .filter(m => m.dayKey === tk)
    .sort((a, b) => a.time.localeCompare(b.time))

  const todayDaily = moodDailies.find(d => d.dayKey === tk)

  const handleAddMoment = async () => {
    await addMoodMoment(tk, newTime, newValue, newNote || undefined)
    setShowAddMoment(false)
    setNewTime(nowTime())
    setNewValue(3)
    setNewNote('')
    toast.success('Momento registrado')
  }

  const handleSaveDaily = async () => {
    await saveMoodDaily(tk, dailyValue, dailyNote || undefined)
    toast.success('Avaliação do dia salva')
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center gap-2 text-base font-[family-name:var(--font-bricolage)]">
          <Smile className="h-4 w-4" style={{ color: MOOD_COLORS[3] }} />
          Humor
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Moments */}
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Momentos do dia</p>
          <div className="space-y-1.5">
            <AnimatePresence>
              {todayMoments.map(moment => (
                <motion.div
                  key={moment.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50"
                >
                  <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground font-mono">{moment.time}</span>
                  <span className="text-lg">{MOOD_OPTIONS.find(o => o.v === moment.value)?.e}</span>
                  {moment.note && (
                    <span className="text-xs text-muted-foreground truncate flex-1">{moment.note}</span>
                  )}
                  <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0" onClick={() => deleteMoodMoment(moment.id)}>
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
            {todayMoments.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">Nenhum momento registrado</p>
            )}
          </div>

          {!showAddMoment ? (
            <Button variant="outline" size="sm" className="w-full mt-2 text-xs" onClick={() => { setShowAddMoment(true); setNewTime(nowTime()) }}>
              <Plus className="h-3 w-3 mr-1" /> Registrar momento
            </Button>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 p-3 rounded-lg border border-border space-y-2"
            >
              <Input
                type="time"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="flex gap-1 justify-center">
                {MOOD_OPTIONS.map(o => (
                  <button
                    key={o.v}
                    onClick={() => setNewValue(o.v)}
                    className={`text-2xl p-1 rounded-lg transition-transform cursor-pointer ${newValue === o.v ? 'scale-125 bg-secondary' : 'hover:scale-110'}`}
                  >
                    {o.e}
                  </button>
                ))}
              </div>
              <Input
                placeholder="Nota (opcional)"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => setShowAddMoment(false)}>Cancelar</Button>
                <Button size="sm" className="flex-1 h-8" style={{ backgroundColor: MOOD_COLORS[newValue] }} onClick={handleAddMoment}>
                  Salvar
                </Button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Daily evaluation */}
        <div className="border-t border-border pt-3">
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Avaliação do dia</p>
          {todayDaily ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50">
              <span className="text-2xl">{MOOD_OPTIONS.find(o => o.v === todayDaily.value)?.e}</span>
              <span className="text-sm">{MOOD_OPTIONS.find(o => o.v === todayDaily.value)?.label}</span>
              {todayDaily.note && <span className="text-xs text-muted-foreground truncate flex-1">{todayDaily.note}</span>}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-1 justify-center">
                {MOOD_OPTIONS.map(o => (
                  <button
                    key={o.v}
                    onClick={() => setDailyValue(o.v)}
                    className={`text-2xl p-1 rounded-lg transition-transform cursor-pointer ${dailyValue === o.v ? 'scale-125 bg-secondary' : 'hover:scale-110'}`}
                  >
                    {o.e}
                  </button>
                ))}
              </div>
              <Textarea
                placeholder="Nota sobre o dia (opcional)"
                value={dailyNote}
                onChange={e => setDailyNote(e.target.value)}
                className="text-sm min-h-[60px] resize-none"
                rows={2}
              />
              <Button size="sm" className="w-full h-8" style={{ backgroundColor: MOOD_COLORS[dailyValue] }} onClick={handleSaveDaily}>
                Salvar avaliação
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}