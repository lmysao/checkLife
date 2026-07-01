"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { todayKey, formatDateLabel, MOOD_OPTIONS, MOOD_COLORS, nowTime } from "@/lib/helpers"
import { toast } from "sonner"
import { Plus, Trash2, Settings, Minus, RotateCcw } from "lucide-react"
import { ChecklistModule } from "./ChecklistModule"
import { NutritionSettingsModal } from "./NutritionSettingsModal"

export function BemEstarModule() {
  return (
    <div className="space-y-3 fade-in">
      <ChecklistModule moduleKey="bemestar" />
      <MoodSection />
      <HydrationSection />
      <MacrosSection />
      <PyramidSection />
      <GratitudeSection />
    </div>
  )
}

// ============ MOOD SECTION (MOMENT-BASED + DAILY EVALUATION) ============
function MoodSection() {
  const moodMoments = useStore(s => s.moodMoments)
  const moodDailies = useStore(s => s.moodDailies)
  const addMoodMoment = useStore(s => s.addMoodMoment)
  const deleteMoodMoment = useStore(s => s.deleteMoodMoment)
  const saveMoodDaily = useStore(s => s.saveMoodDaily)
  const [newTime, setNewTime] = useState(nowTime())
  const [newVal, setNewVal] = useState<number | null>(null)
  const [newNote, setNewNote] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  // Local form state for daily evaluation (initializes from store, user can edit before saving)
  const [draftVal, setDraftVal] = useState<number | null>(null)
  const [draftNote, setDraftNote] = useState("")

  const day = todayKey()
  const daily = moodDailies.find(m => m.dayKey === day)
  const dayMoments = moodMoments.filter(m => m.dayKey === day).sort((a, b) => a.time.localeCompare(b.time))
  // Show draft if user has started editing, otherwise show saved value
  const dailyVal = draftVal ?? daily?.value ?? null
  const dailyNote = draftVal !== null ? draftNote : (daily?.note || "")

  return (
    <Card className="border-border">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-lg" style={{ color: "#3C6B5A" }}>Humor do dia</CardTitle>
        <p className="text-[10px] font-mono text-muted-foreground">{formatDateLabel()}</p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Moments list */}
        {dayMoments.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Momentos do dia</p>
            {dayMoments.map(m => (
              <div key={m.id} className="flex items-center gap-2 text-sm border border-border rounded-lg p-2">
                <span className="text-xs font-mono text-muted-foreground w-10 flex-shrink-0">{m.time}</span>
                <span className="text-lg">{MOOD_OPTIONS.find(o => o.v === m.value)?.e}</span>
                <span className="flex-1 text-xs text-muted-foreground truncate">{m.note || ""}</span>
                <button onClick={() => deleteMoodMoment(m.id)} className="text-muted-foreground hover:text-destructive flex-shrink-0" type="button">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add moment form */}
        {showAdd ? (
          <div className="border border-border rounded-lg p-3 space-y-2">
            <div className="flex gap-2 items-end">
              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase">Hora</label>
                <Input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="h-8 text-sm w-24" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase">Como está?</label>
              <div className="flex gap-1.5 mt-1">
                {MOOD_OPTIONS.map(o => (
                  <button
                    key={o.v}
                    onClick={() => setNewVal(o.v)}
                    className={`flex-1 text-xl py-2 rounded-lg border-2 transition-all ${
                      newVal === o.v ? "border-primary scale-105" : "border-border hover:border-primary/50"
                    }`}
                    style={newVal === o.v ? { borderColor: MOOD_COLORS[o.v], backgroundColor: MOOD_COLORS[o.v] + "22" } : {}}
                    title={o.label}
                    type="button"
                  >
                    {o.e}
                  </button>
                ))}
              </div>
            </div>
            <Input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="O que está sentindo? (opcional)" className="text-sm" />
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="text-xs" onClick={() => setShowAdd(false)} type="button">Cancelar</Button>
              <Button size="sm" className="text-xs" onClick={async () => {
                if (!newVal) { toast.warning("Escolha um humor"); return }
                await addMoodMoment(day, newTime, newVal, newNote || undefined)
                setNewVal(null); setNewNote(""); setShowAdd(false)
                toast.success("Momento registrado")
              }} type="button">Registrar</Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="text-xs w-full" onClick={() => { setShowAdd(true); setNewTime(nowTime()) }} type="button">
            <Plus className="w-3 h-3 mr-1" /> Adicionar momento
          </Button>
        )}

        {/* Daily evaluation */}
        <div className="border-t border-border pt-3">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Avaliação do dia</p>
          <div className="flex gap-1.5 mb-2">
            {MOOD_OPTIONS.map(o => (
              <button
                key={o.v}
                onClick={() => setDraftVal(o.v)}
                className={`flex-1 text-xl py-2 rounded-lg border-2 transition-all ${
                  dailyVal === o.v ? "border-primary scale-105" : "border-border hover:border-primary/50"
                }`}
                style={dailyVal === o.v ? { borderColor: MOOD_COLORS[o.v], backgroundColor: MOOD_COLORS[o.v] + "22" } : {}}
                title={o.label}
                type="button"
              >
                {o.e}
              </button>
            ))}
          </div>
          <Textarea
            value={dailyNote}
            onChange={e => setDraftNote(e.target.value)}
            placeholder="Anotação sobre o dia (opcional)"
            className="text-sm min-h-[60px] resize-y"
          />
          <Button
            size="sm"
            className="text-xs mt-2"
            style={{ backgroundColor: dailyVal ? MOOD_COLORS[dailyVal] : undefined }}
            onClick={async () => {
              if (!dailyVal) { toast.warning("Escolha um humor"); return }
              await saveMoodDaily(day, dailyVal, dailyNote || undefined)
              setDraftVal(null)
              setDraftNote("")
              toast.success("Avaliação salva")
            }}
            type="button"
          >
            Salvar avaliação
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============ HYDRATION ============
function HydrationSection() {
  const waterLogs = useStore(s => s.waterLogs)
  const nutritionSettings = useStore(s => s.nutritionSettings)
  const setWater = useStore(s => s.setWater)
  const [nutriOpen, setNutriOpen] = useState(false)

  const day = todayKey()
  const water = waterLogs.find(w => w.dayKey === day)?.count || 0
  const ns = nutritionSettings
  const waterGoal = ns.waterAutoCalc
    ? Math.max(1, Math.round(Math.max(800, ns.weight * 35) / ns.cupSizeMl))
    : ns.waterGoalOverride
  const waterMl = water * ns.cupSizeMl
  const goalMl = waterGoal * ns.cupSizeMl
  const pct = waterGoal ? Math.min(100, Math.round(water / waterGoal * 100)) : 0
  const RING_C = 2 * Math.PI * 36
  const ringOffset = RING_C * (1 - pct / 100)

  return (
    <>
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-end justify-between">
            <div>
              <CardTitle className="text-lg" style={{ color: "#5BA3D0" }}>Hidratação</CardTitle>
              <p className="text-[10px] font-mono text-muted-foreground">
                {ns.waterAutoCalc ? "meta automática (peso)" : "meta manual"}
              </p>
            </div>
            <Button size="sm" variant="ghost" className="text-xs h-6" onClick={() => setNutriOpen(true)} type="button">
              <Settings className="w-3 h-3" /> Config
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="flex items-center gap-4">
            {/* Ring */}
            <div className="w-20 h-20 flex-shrink-0 relative flex items-center justify-center">
              <svg viewBox="0 0 84 84" className="w-full h-full" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="42" cy="42" r="36" fill="none" stroke="var(--border)" strokeWidth="8" />
                <circle cx="42" cy="42" r="36" fill="none" stroke="#5BA3D0" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={RING_C} strokeDashoffset={ringOffset} style={{ transition: "stroke-dashoffset 0.4s ease" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <b className="text-lg font-mono leading-none">{water}</b>
                <span className="text-[9px] text-muted-foreground font-mono">/{waterGoal}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0 text-sm">
              <p>Você precisa de <b className="font-mono" style={{ color: "var(--primary)" }}>{waterGoal} copos</b> ({goalMl} ml)</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tomou: {water} copos · {waterMl} ml
              </p>
              {water >= waterGoal ? (
                <p className="text-xs font-bold mt-1" style={{ color: "#5C7A3A" }}>✓ Meta atingida!</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Faltam: {waterGoal - water} copos ({(waterGoal - water) * ns.cupSizeMl} ml)
                </p>
              )}
            </div>
          </div>
          {/* Cups */}
          <div className="flex gap-1 flex-wrap justify-center">
            {Array.from({ length: Math.min(16, Math.max(waterGoal, water)) }, (_, i) => (
              <button
                key={i}
                onClick={() => setWater(day, i < water ? i : i + 1)}
                className="w-6 h-8 rounded-sm border-2 relative transition-all hover:-translate-y-0.5"
                style={{
                  borderColor: i + 1 <= water ? "#5BA3D0" : "var(--border)",
                  opacity: i >= waterGoal ? 0.5 : 1,
                }}
                type="button"
              >
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-b-sm transition-all"
                  style={{
                    height: i + 1 <= water ? "78%" : "0%",
                    backgroundColor: "#5BA3D0",
                  }}
                />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs" onClick={() => setWater(day, water + 1)} type="button">+1 copo</Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => setWater(day, Math.max(0, water - 1))} type="button">
              <Minus className="w-3 h-3" /> 1
            </Button>
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => setWater(day, 0)} type="button">
              <RotateCcw className="w-3 h-3 mr-1" /> Zerar
            </Button>
          </div>
        </CardContent>
      </Card>
      <NutritionSettingsModal key={`nutri-${nutriOpen}`} open={nutriOpen} onOpenChange={setNutriOpen} />
    </>
  )
}

// ============ MACROS ============
function MacrosSection() {
  const macrosLogs = useStore(s => s.macrosLogs)
  const nutritionSettings = useStore(s => s.nutritionSettings)
  const addMacro = useStore(s => s.addMacro)
  const [nutriOpen, setNutriOpen] = useState(false)
  const [field, setField] = useState("carbs")
  const [grams, setGrams] = useState("15")

  const day = todayKey()
  const macros = macrosLogs.find(m => m.dayKey === day) || { dayKey: day, carbs: 0, protein: 0, fat: 0 }
  const cfg = nutritionSettings.macros
  const macroMeta = [
    { key: "carbs", label: "Carboidratos", color: "#D6A23C" },
    { key: "protein", label: "Proteínas", color: "#C1502E" },
    { key: "fat", label: "Gorduras", color: "#9C6B2E" },
  ]

  return (
    <>
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-end justify-between">
            <div>
              <CardTitle className="text-lg" style={{ color: "#D6A23C" }}>Macros</CardTitle>
              <p className="text-[10px] font-mono text-muted-foreground">meta vs consumido (g)</p>
            </div>
            <Button size="sm" variant="ghost" className="h-6" onClick={() => setNutriOpen(true)} type="button">
              <Settings className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2.5">
          {macroMeta.map(mm => {
            const goal = (cfg as any)[mm.key]?.goal || 0
            const cons = (macros as any)[mm.key] || 0
            const pct = goal ? Math.min(100, Math.round(cons / goal * 100)) : 0
            return (
              <div key={mm.key} className="flex items-center gap-2.5 py-1.5 border-b border-border last:border-0">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: mm.color }} />
                <span className="w-20 text-xs font-bold flex-shrink-0">{mm.label}</span>
                <div className="flex-1 h-2 rounded-full bg-border">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: mm.color }} />
                </div>
                <span className="text-[11px] font-mono text-muted-foreground w-16 text-right">
                  <b className="text-foreground">{cons}</b>/{goal}g
                </span>
                <div className="flex gap-0.5 flex-shrink-0">
                  <button onClick={() => addMacro(day, mm.key, -5)} className="w-6 h-6 rounded-md border border-border flex items-center justify-center text-sm hover:border-primary" type="button">−</button>
                  <button onClick={() => addMacro(day, mm.key, 5)} className="w-6 h-6 rounded-md border border-border flex items-center justify-center text-sm hover:border-primary" type="button">+</button>
                </div>
              </div>
            )
          })}
          {/* Quick add carbs */}
          <div className="flex gap-1 flex-wrap">
            {[5, 10, 15, 25, 40].map(g => (
              <button
                key={g}
                onClick={() => addMacro(day, "carbs", g)}
                className="text-[10px] font-mono px-2 py-1 rounded-md border border-border hover:border-primary hover:text-primary"
                type="button"
              >
                +{g}g carb
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-end">
            <select
              value={field}
              onChange={e => setField(e.target.value)}
              className="text-xs px-2 py-1.5 rounded-lg border border-border bg-input text-foreground"
            >
              <option value="carbs">Carboidratos</option>
              <option value="protein">Proteínas</option>
              <option value="fat">Gorduras</option>
            </select>
            <Input type="number" value={grams} onChange={e => setGrams(e.target.value)} className="h-8 text-xs w-16" placeholder="g" min="0" />
            <Button size="sm" className="text-xs" onClick={() => {
              const g = parseInt(grams, 10)
              if (!g || g <= 0) { toast.warning("Informe gramas"); return }
              addMacro(day, field, g)
            }} type="button">+ Adicionar</Button>
          </div>
        </CardContent>
      </Card>
      <NutritionSettingsModal key={`nutri-${nutriOpen}`} open={nutriOpen} onOpenChange={setNutriOpen} />
    </>
  )
}

// ============ PYRAMID ============
function PyramidSection() {
  const pyramidLogs = useStore(s => s.pyramidLogs)
  const nutritionSettings = useStore(s => s.nutritionSettings)
  const setPyramidCounts = useStore(s => s.setPyramidCounts)
  const [nutriOpen, setNutriOpen] = useState(false)

  const day = todayKey()
  const counts = pyramidLogs.find(p => p.dayKey === day)?.counts || {}
  const groups = nutritionSettings.pyramidGroups || []
  const totalGoal = groups.reduce((s, g) => s + g.goal, 0)
  const totalCons = groups.reduce((s, g) => s + (counts[g.id] || 0), 0)
  const n = groups.length

  const handleTap = async (groupId: string) => {
    const newCounts = { ...counts, [groupId]: (counts[groupId] || 0) + 1 }
    await setPyramidCounts(day, newCounts)
  }

  const handleRightClick = async (e: React.MouseEvent, groupId: string) => {
    e.preventDefault()
    const newCounts = { ...counts, [groupId]: Math.max(0, (counts[groupId] || 0) - 1) }
    await setPyramidCounts(day, newCounts)
  }

  const handleReset = () => {
    const newCounts: Record<string, number> = {}
    groups.forEach(g => { newCounts[g.id] = 0 })
    setPyramidCounts(day, newCounts)
    toast.warn("Pirâmide resetada")
  }

  return (
    <>
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-end justify-between">
            <div>
              <CardTitle className="text-lg" style={{ color: "#9C6B2E" }}>Pirâmide alimentar</CardTitle>
              <p className="text-[10px] font-mono text-muted-foreground">{totalCons}/{totalGoal} porções hoje</p>
            </div>
            <Button size="sm" variant="ghost" className="h-6" onClick={() => setNutriOpen(true)} type="button">
              <Settings className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-col items-center gap-1 my-3">
            {groups.map((g, idx) => {
              const cons = counts[g.id] || 0
              const widthPct = 40 + (idx / Math.max(1, n - 1)) * 60
              return (
                <button
                  key={g.id}
                  onClick={() => handleTap(g.id)}
                  onContextMenu={e => handleRightClick(e, g.id)}
                  className="flex items-center justify-between gap-2 text-primary-foreground rounded-lg px-3 transition-transform hover:scale-[1.02] active:scale-[0.98] w-full"
                  style={{ width: `${widthPct}%`, backgroundColor: g.color, minHeight: 34, padding: "8px 12px" }}
                  title={`${g.note ? g.note + " · " : ""}meta: ${g.goal} porções. Clique: +1, Botão direito: -1`}
                  type="button"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm">{g.icon || "•"}</span>
                    <span className="text-xs font-bold truncate">{g.label}</span>
                  </div>
                  <span className="text-xs font-mono font-bold flex-shrink-0">{cons}/{g.goal}</span>
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-muted-foreground text-center -mt-1 mb-2">Toque: +1 porção · Botão direito: −1</p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="text-xs" onClick={handleReset} type="button">
              <RotateCcw className="w-3 h-3 mr-1" /> Zerar dia
            </Button>
          </div>
        </CardContent>
      </Card>
      <NutritionSettingsModal key={`nutri-${nutriOpen}`} open={nutriOpen} onOpenChange={setNutriOpen} />
    </>
  )
}

// ============ GRATITUDE ============
function GratitudeSection() {
  const gratitudeLogs = useStore(s => s.gratitudeLogs)
  const saveGratitude = useStore(s => s.saveGratitude)

  const day = todayKey()
  const saved = gratitudeLogs.find(g => g.dayKey === day)
  const [vals, setVals] = useState<string[]>(() => {
    if (saved?.items?.length) {
      // Pad to 3 items
      const items = [...saved.items]
      while (items.length < 3) items.push("")
      return items.slice(0, 3)
    }
    return ["", "", ""]
  })

  return (
    <Card className="border-border">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-lg" style={{ color: "#3C6B5A" }}>Gratidão</CardTitle>
        <p className="text-[10px] font-mono text-muted-foreground">3 coisas boas de hoje</p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={{ backgroundColor: "var(--primary-foreground)", color: "var(--primary)" }}>
              {i + 1}
            </span>
            <Input
              value={vals[i] || ""}
              onChange={e => { const n = [...vals]; n[i] = e.target.value; setVals(n) }}
              placeholder="Sou grato por..."
              className="text-sm"
            />
          </div>
        ))}
        <Button size="sm" className="text-xs" onClick={async () => {
          await saveGratitude(day, vals)
          toast.success("Gratidão salva")
        }} type="button">Salvar gratidão</Button>
      </CardContent>
    </Card>
  )
}