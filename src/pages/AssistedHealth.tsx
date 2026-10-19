import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Calendar as CalendarIcon,
  Plus,
  Stethoscope,
  Syringe,
  Pill,
  HeartPulse,
  Sparkles,
  CheckCircle2,
  Circle,
  Trash2,
  Edit3,
  Clock,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  Filter,
  Compass,
  Repeat,
  PartyPopper,
  GraduationCap,
  Trophy,
  Scissors,
  Users,
  Car,
  Tag,
} from 'lucide-react'
import { useDog } from '@/contexts/DogContext'
import { nutritionService } from '@/services/nutrition'
import { DogAvatar } from '@/components/DogAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type {
  DogRecord,
  HealthEventRecord,
  HealthEventType,
  RoutineEventRecord,
  RoutineEventCategory,
  RoutineEventRepeat,
} from '@/types/nutrition'

// Tipos exclusivamente clínicos para o modal de saúde
const HEALTH_TYPE_CONFIG: Record<
  HealthEventType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; badge: string }
> = {
  consulta: {
    label: 'Consulta Veterinária',
    icon: Stethoscope,
    color: 'text-sky-400 bg-sky-500/15 border-sky-500/30',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },
  vacina: {
    label: 'Vacina',
    icon: Syringe,
    color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  medicacao: {
    label: 'Medicação Prescrita',
    icon: Pill,
    color: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  tratamento: {
    label: 'Tratamento em Andamento',
    icon: HeartPulse,
    color: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
}

// Categorias para eventos de vida e rotina independentes
const ROUTINE_CATEGORY_CONFIG: Record<
  RoutineEventCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; badge: string }
> = {
  passeio: {
    label: 'Passeio / Caminhada',
    icon: Compass,
    color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  aniversario: {
    label: 'Aniversário Pet',
    icon: PartyPopper,
    color: 'text-pink-400 bg-pink-500/15 border-pink-500/30',
    badge: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
  },
  adestramento: {
    label: 'Treino / Adestramento',
    icon: GraduationCap,
    color: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  competicao: {
    label: 'Competição / Prova',
    icon: Trophy,
    color: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
    badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  },
  banho_tosa: {
    label: 'Banho & Tosa / Spa',
    icon: Scissors,
    color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
  encontro: {
    label: 'Encontro de Pets',
    icon: Users,
    color: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },
  viagem: {
    label: 'Viagem / Hotel Pet',
    icon: Car,
    color: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
    badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  },
  outro: {
    label: 'Outro Evento',
    icon: Sparkles,
    color: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
}

export default function AssistedHealthPage() {
  const { id: paramId } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { dogs, activeDog, setActiveDogId } = useDog()

  const targetDog: DogRecord | null = useMemo(() => {
    if (paramId) {
      return dogs.find((d) => d.id === paramId) || activeDog || dogs[0] || null
    }
    return activeDog || dogs[0] || null
  }, [paramId, dogs, activeDog])

  // Seção primária: Saúde Clínica vs Eventos de Rotina
  const [activeSection, setActiveSection] = useState<'saude' | 'rotina'>('saude')

  // Sub-abas (Próximos, Calendário, Histórico)
  const [activeTab, setActiveTab] = useState<'proximos' | 'historico' | 'calendario'>('proximos')

  // Dados de Saúde Clínica
  const [healthEvents, setHealthEvents] = useState<HealthEventRecord[]>([])
  // Dados de Eventos de Rotina
  const [routineEvents, setRoutineEvents] = useState<RoutineEventRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filterHealthType, setFilterHealthType] = useState<string>('all')
  const [filterRoutineCategory, setFilterRoutineCategory] = useState<string>('all')

  // Mês do calendário
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(() => new Date())

  // --- Modal de Saúde Clínica ---
  const [healthModalOpen, setHealthModalOpen] = useState(false)
  const [editingHealthEvent, setEditingHealthEvent] = useState<HealthEventRecord | null>(null)
  const [healthSaving, setHealthSaving] = useState(false)

  const [formHealthType, setFormHealthType] = useState<HealthEventType>('consulta')
  const [formHealthTitle, setFormHealthTitle] = useState('')
  const [formHealthDate, setFormHealthDate] = useState(() => new Date().toISOString().split('T')[0])
  const [formHealthTime, setFormHealthTime] = useState('09:00')
  const [formHealthNotes, setFormHealthNotes] = useState('')
  const [formHealthDosage, setFormHealthDosage] = useState('')
  const [formHealthFrequency, setFormHealthFrequency] = useState('')
  const [formHealthDuration, setFormHealthDuration] = useState('')
  const [formHealthProfessional, setFormHealthProfessional] = useState('')
  const [formHealthLocation, setFormHealthLocation] = useState('')

  // --- Modal de Evento de Rotina ---
  const [routineModalOpen, setRoutineModalOpen] = useState(false)
  const [editingRoutineEvent, setEditingRoutineEvent] = useState<RoutineEventRecord | null>(null)
  const [routineSaving, setRoutineSaving] = useState(false)

  const [formRoutineTitle, setFormRoutineTitle] = useState('')
  const [formRoutineCategory, setFormRoutineCategory] = useState<RoutineEventCategory>('passeio')
  const [formRoutineDate, setFormRoutineDate] = useState(
    () => new Date().toISOString().split('T')[0],
  )
  const [formRoutineStartTime, setFormRoutineStartTime] = useState('08:00')
  const [formRoutineEndTime, setFormRoutineEndTime] = useState('09:00')
  const [formRoutineLocation, setFormRoutineLocation] = useState('')
  const [formRoutineNotes, setFormRoutineNotes] = useState('')
  const [formRoutineRepeat, setFormRoutineRepeat] = useState<RoutineEventRepeat>('nenhuma')

  // Carregar todos os dados
  const loadData = useCallback(async () => {
    if (!targetDog) {
      setHealthEvents([])
      setRoutineEvents([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [hEvents, rEvents] = await Promise.all([
        nutritionService.getHealthEvents(targetDog.id),
        nutritionService.getRoutineEvents(targetDog.id),
      ])
      setHealthEvents(hEvents)
      setRoutineEvents(rEvents)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [targetDog])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Handlers do Modal de Saúde Clínica
  const openCreateHealthModal = (presetType?: HealthEventType, presetDate?: string) => {
    setEditingHealthEvent(null)
    setFormHealthType(presetType || 'consulta')
    setFormHealthTitle('')
    setFormHealthDate(presetDate || new Date().toISOString().split('T')[0])
    setFormHealthTime('09:00')
    setFormHealthNotes('')
    setFormHealthDosage('')
    setFormHealthFrequency('')
    setFormHealthDuration('')
    setFormHealthProfessional('')
    setFormHealthLocation('')
    setHealthModalOpen(true)
  }

  const openEditHealthModal = (ev: HealthEventRecord) => {
    setEditingHealthEvent(ev)
    // Se o registro antigo era do tipo 'evento', faz fallback suave para consulta
    const safeType: HealthEventType =
      ev.type === 'evento' ? 'consulta' : (ev.type as HealthEventType)
    setFormHealthType(safeType)
    setFormHealthTitle(ev.title)
    if (ev.event_date.includes('T')) {
      const [d, t] = ev.event_date.split('T')
      setFormHealthDate(d)
      setFormHealthTime(t ? t.slice(0, 5) : '09:00')
    } else {
      setFormHealthDate(ev.event_date.slice(0, 10))
      setFormHealthTime('09:00')
    }
    setFormHealthNotes(ev.notes || '')
    setFormHealthDosage(ev.dosage || '')
    setFormHealthFrequency(ev.frequency || '')
    setFormHealthDuration(ev.duration || '')
    setFormHealthProfessional(ev.professional || '')
    setFormHealthLocation(ev.location || '')
    setHealthModalOpen(true)
  }

  const handleSaveHealthEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetDog) return
    if (!formHealthTitle.trim()) {
      toast.error('Informe o título do registro clínico.')
      return
    }
    setHealthSaving(true)
    const fullIsoDate = formHealthTime
      ? `${formHealthDate}T${formHealthTime}:00.000Z`
      : `${formHealthDate}T12:00:00.000Z`

    try {
      if (editingHealthEvent) {
        await nutritionService.updateHealthEvent(editingHealthEvent.id, {
          type: formHealthType,
          title: formHealthTitle.trim(),
          event_date: fullIsoDate,
          notes: formHealthNotes.trim(),
          dosage: formHealthDosage.trim(),
          frequency: formHealthFrequency.trim(),
          duration: formHealthDuration.trim(),
          professional: formHealthProfessional.trim(),
          location: formHealthLocation.trim(),
        })
        toast.success('Registro de saúde atualizado!')
      } else {
        await nutritionService.createHealthEvent({
          dog: targetDog.id,
          type: formHealthType,
          title: formHealthTitle.trim(),
          event_date: fullIsoDate,
          notes: formHealthNotes.trim(),
          completed: false,
          dosage: formHealthDosage.trim(),
          frequency: formHealthFrequency.trim(),
          duration: formHealthDuration.trim(),
          professional: formHealthProfessional.trim(),
          location: formHealthLocation.trim(),
        })
        toast.success('Registro de saúde agendado com sucesso!')
      }
      setHealthModalOpen(false)
      await loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar registro de saúde.')
    } finally {
      setHealthSaving(false)
    }
  }

  const handleToggleHealthComplete = async (ev: HealthEventRecord) => {
    try {
      const next = !ev.completed
      await nutritionService.toggleHealthEventCompleted(ev.id, next)
      setHealthEvents((prev) =>
        prev.map((item) => (item.id === ev.id ? { ...item, completed: next } : item)),
      )
      toast.success(next ? 'Marcado como concluído!' : 'Marcado como pendente.')
    } catch {
      toast.error('Não foi possível atualizar o status.')
    }
  }

  const handleDeleteHealthEvent = async (id: string) => {
    if (!confirm('Deseja realmente remover este registro clínico?')) return
    try {
      await nutritionService.deleteHealthEvent(id)
      setHealthEvents((prev) => prev.filter((item) => item.id !== id))
      toast.success('Registro excluído com sucesso.')
    } catch {
      toast.error('Erro ao excluir.')
    }
  }

  // Handlers do Modal de Eventos de Rotina
  const openCreateRoutineModal = (presetCategory?: RoutineEventCategory, presetDate?: string) => {
    setEditingRoutineEvent(null)
    setFormRoutineTitle('')
    setFormRoutineCategory(presetCategory || 'passeio')
    setFormRoutineDate(presetDate || new Date().toISOString().split('T')[0])
    setFormRoutineStartTime('08:00')
    setFormRoutineEndTime('09:00')
    setFormRoutineLocation('')
    setFormRoutineNotes('')
    setFormRoutineRepeat('nenhuma')
    setRoutineModalOpen(true)
  }

  const openEditRoutineModal = (ev: RoutineEventRecord) => {
    setEditingRoutineEvent(ev)
    setFormRoutineTitle(ev.title)
    setFormRoutineCategory(ev.category)
    setFormRoutineDate(ev.event_date.slice(0, 10))
    setFormRoutineStartTime(ev.start_time || '08:00')
    setFormRoutineEndTime(ev.end_time || '09:00')
    setFormRoutineLocation(ev.location || '')
    setFormRoutineNotes(ev.notes || '')
    setFormRoutineRepeat(ev.repeat || 'nenhuma')
    setRoutineModalOpen(true)
  }

  const handleSaveRoutineEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetDog) return
    if (!formRoutineTitle.trim()) {
      toast.error('Informe o título do evento.')
      return
    }
    setRoutineSaving(true)
    try {
      if (editingRoutineEvent) {
        await nutritionService.updateRoutineEvent(editingRoutineEvent.id, {
          title: formRoutineTitle.trim(),
          category: formRoutineCategory,
          event_date: formRoutineDate,
          start_time: formRoutineStartTime,
          end_time: formRoutineEndTime,
          location: formRoutineLocation.trim(),
          notes: formRoutineNotes.trim(),
          repeat: formRoutineRepeat,
        })
        toast.success('Evento de rotina atualizado!')
      } else {
        await nutritionService.createRoutineEvent({
          dog: targetDog.id,
          title: formRoutineTitle.trim(),
          category: formRoutineCategory,
          event_date: formRoutineDate,
          start_time: formRoutineStartTime,
          end_time: formRoutineEndTime,
          location: formRoutineLocation.trim(),
          notes: formRoutineNotes.trim(),
          repeat: formRoutineRepeat,
          completed: false,
        })
        toast.success('Evento de rotina criado com sucesso!')
      }
      setRoutineModalOpen(false)
      await loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar evento de rotina.')
    } finally {
      setRoutineSaving(false)
    }
  }

  const handleToggleRoutineComplete = async (ev: RoutineEventRecord) => {
    try {
      const next = !ev.completed
      await nutritionService.toggleRoutineEventCompleted(ev.id, next)
      setRoutineEvents((prev) =>
        prev.map((item) => (item.id === ev.id ? { ...item, completed: next } : item)),
      )
      toast.success(next ? 'Evento marcado como realizado!' : 'Evento marcado como pendente.')
    } catch {
      toast.error('Não foi possível atualizar o status.')
    }
  }

  const handleDeleteRoutineEvent = async (id: string) => {
    if (!confirm('Deseja realmente remover este evento de rotina?')) return
    try {
      await nutritionService.deleteRoutineEvent(id)
      setRoutineEvents((prev) => prev.filter((item) => item.id !== id))
      toast.success('Evento removido com sucesso.')
    } catch {
      toast.error('Erro ao excluir.')
    }
  }

  // Filtragem e separação por data
  const now = new Date()
  const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    .toISOString()
    .split('T')[0]

  // Eventos de Saúde
  const filteredHealth = useMemo(() => {
    if (filterHealthType === 'all') return healthEvents
    return healthEvents.filter((e) => e.type === filterHealthType)
  }, [healthEvents, filterHealthType])

  const upcomingHealth = useMemo(() => {
    return filteredHealth
      .filter((e) => {
        const d = e.event_date.slice(0, 10)
        return !e.completed && d >= todayStr
      })
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
  }, [filteredHealth, todayStr])

  const historyHealth = useMemo(() => {
    return filteredHealth
      .filter((e) => {
        const d = e.event_date.slice(0, 10)
        return e.completed || d < todayStr
      })
      .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
  }, [filteredHealth, todayStr])

  // Eventos de Rotina
  const filteredRoutine = useMemo(() => {
    if (filterRoutineCategory === 'all') return routineEvents
    return routineEvents.filter((e) => e.category === filterRoutineCategory)
  }, [routineEvents, filterRoutineCategory])

  const upcomingRoutine = useMemo(() => {
    return filteredRoutine
      .filter((e) => !e.completed && e.event_date >= todayStr)
      .sort((a, b) => {
        const diff = new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
        if (diff !== 0) return diff
        return (a.start_time || '').localeCompare(b.start_time || '')
      })
  }, [filteredRoutine, todayStr])

  const historyRoutine = useMemo(() => {
    return filteredRoutine
      .filter((e) => e.completed || e.event_date < todayStr)
      .sort((a, b) => {
        const diff = new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
        if (diff !== 0) return diff
        return (b.start_time || '').localeCompare(a.start_time || '')
      })
  }, [filteredRoutine, todayStr])

  // Gerador de dias do calendário
  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear()
    const month = currentCalendarDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: { date: Date; dateStr: string; isCurrentMonth: boolean }[] = []

    const startingDayOfWeek = firstDay.getDay()
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i)
      days.push({
        date: prevDate,
        dateStr: prevDate.toISOString().split('T')[0],
        isCurrentMonth: false,
      })
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const currentDate = new Date(year, month, d)
      days.push({
        date: currentDate,
        dateStr: currentDate.toISOString().split('T')[0],
        isCurrentMonth: true,
      })
    }
    const remaining = 35 - days.length
    for (let n = 1; n <= (remaining > 0 ? remaining : 0); n++) {
      const nextDate = new Date(year, month + 1, n)
      days.push({
        date: nextDate,
        dateStr: nextDate.toISOString().split('T')[0],
        isCurrentMonth: false,
      })
    }
    return days
  }, [currentCalendarDate])

  // Mapa combinado para exibição no calendário (distinção visual clara)
  const calendarEventsByDate = useMemo(() => {
    const map: Record<
      string,
      {
        health: HealthEventRecord[]
        routine: RoutineEventRecord[]
      }
    > = {}

    for (const h of healthEvents) {
      const key = h.event_date.slice(0, 10)
      if (!map[key]) map[key] = { health: [], routine: [] }
      map[key].health.push(h)
    }

    for (const r of routineEvents) {
      const key = r.event_date.slice(0, 10)
      if (!map[key]) map[key] = { health: [], routine: [] }
      map[key].routine.push(r)
    }

    return map
  }, [healthEvents, routineEvents])

  if (!targetDog && !loading) {
    return (
      <div className="py-16 text-center space-y-4">
        <HeartPulse className="w-12 h-12 text-primary mx-auto opacity-70" />
        <h2 className="text-lg font-bold text-foreground">Nenhum pet cadastrado</h2>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Cadastre seu primeiro pet para acompanhar consultas, vacinas e eventos de rotina.
        </p>
        <Button onClick={() => navigate('/caes/novo')} className="rounded-xl">
          <Plus className="w-4 h-4 mr-1.5" />
          Cadastrar Pet
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {targetDog && (
            <DogAvatar
              dog={targetDog}
              name={targetDog.name}
              avatarUrl={nutritionService.getAvatarUrl(targetDog)}
              size="md"
            />
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black tracking-tight text-foreground">
                Saúde & Rotina • {targetDog?.name || 'Pet'}
              </h1>
              <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                Prontuário & Vida Pet
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Agenda clínica independente e rotina completa do tutor e do pet
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
          {dogs.length > 1 && (
            <select
              aria-label="Trocar pet"
              value={targetDog?.id}
              onChange={(e) => {
                setActiveDogId(e.target.value)
                navigate(`/caes/${e.target.value}/saude`)
              }}
              className="bg-card border border-border/80 text-xs rounded-xl px-3 py-2 text-foreground font-medium focus:outline-none focus:border-primary shadow-sm"
            >
              {dogs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.breed || 'Pet'})
                </option>
              ))}
            </select>
          )}

          {activeSection === 'saude' ? (
            <Button
              onClick={() => openCreateHealthModal()}
              className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md h-9"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Registro de Saúde
            </Button>
          ) : (
            <Button
              onClick={() => openCreateRoutineModal()}
              className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md h-9"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Evento da Rotina
            </Button>
          )}
        </div>
      </div>

      {/* SELETOR PRINCIPAL DE SEÇÃO (SAÚDE CLÍNICA vs EVENTOS DA ROTINA) */}
      <div className="p-1.5 rounded-2xl bg-card border border-border/80 grid grid-cols-2 gap-2 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveSection('saude')}
          className={`py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeSection === 'saude'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          <span>Saúde Assistida (Clínica)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-mono">
            {healthEvents.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('rotina')}
          className={`py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeSection === 'rotina'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-300" />
          <span>Eventos & Rotina do Pet</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-mono">
            {routineEvents.length}
          </span>
        </button>
      </div>

      {/* CARDS DE ESTATÍSTICAS RÁPIDAS DEPENDENDO DA SEÇÃO */}
      {activeSection === 'saude' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div
            onClick={() => openCreateHealthModal('consulta')}
            className="p-3.5 rounded-2xl bg-card border border-border/80 hover:border-sky-500/50 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground">Consultas</span>
              <Stethoscope className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-foreground mt-1">
              {healthEvents.filter((e) => e.type === 'consulta').length}
            </div>
            <span className="text-[10px] text-sky-400 font-semibold">+ Agendar</span>
          </div>

          <div
            onClick={() => openCreateHealthModal('vacina')}
            className="p-3.5 rounded-2xl bg-card border border-border/80 hover:border-emerald-500/50 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground">Vacinas</span>
              <Syringe className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-foreground mt-1">
              {healthEvents.filter((e) => e.type === 'vacina').length}
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold">+ Registrar</span>
          </div>

          <div
            onClick={() => openCreateHealthModal('medicacao')}
            className="p-3.5 rounded-2xl bg-card border border-border/80 hover:border-amber-500/50 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground">Medicações</span>
              <Pill className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-foreground mt-1">
              {healthEvents.filter((e) => e.type === 'medicacao').length}
            </div>
            <span className="text-[10px] text-amber-400 font-semibold">+ Prescrição</span>
          </div>

          <div
            onClick={() => openCreateHealthModal('tratamento')}
            className="p-3.5 rounded-2xl bg-card border border-border/80 hover:border-rose-500/50 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground">Tratamentos</span>
              <HeartPulse className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-foreground mt-1">
              {healthEvents.filter((e) => e.type === 'tratamento').length}
            </div>
            <span className="text-[10px] text-rose-400 font-semibold">+ Acompanhar</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div
            onClick={() => openCreateRoutineModal('passeio')}
            className="p-3.5 rounded-2xl bg-card border border-border/80 hover:border-emerald-500/50 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground">Passeios</span>
              <Compass className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-foreground mt-1">
              {routineEvents.filter((e) => e.category === 'passeio').length}
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold">+ Planejar</span>
          </div>

          <div
            onClick={() => openCreateRoutineModal('adestramento')}
            className="p-3.5 rounded-2xl bg-card border border-border/80 hover:border-amber-500/50 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground">Treinos</span>
              <GraduationCap className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-foreground mt-1">
              {routineEvents.filter((e) => e.category === 'adestramento').length}
            </div>
            <span className="text-[10px] text-amber-400 font-semibold">+ Treino</span>
          </div>

          <div
            onClick={() => openCreateRoutineModal('banho_tosa')}
            className="p-3.5 rounded-2xl bg-card border border-border/80 hover:border-cyan-500/50 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground">Banho & Tosa</span>
              <Scissors className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-foreground mt-1">
              {routineEvents.filter((e) => e.category === 'banho_tosa').length}
            </div>
            <span className="text-[10px] text-cyan-400 font-semibold">+ Agendar</span>
          </div>

          <div
            onClick={() => openCreateRoutineModal('encontro')}
            className="p-3.5 rounded-2xl bg-card border border-border/80 hover:border-purple-500/50 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground">Encontros & Pets</span>
              <Users className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-foreground mt-1">
              {
                routineEvents.filter(
                  (e) => e.category === 'encontro' || e.category === 'aniversario',
                ).length
              }
            </div>
            <span className="text-[10px] text-purple-400 font-semibold">+ Social</span>
          </div>
        </div>
      )}

      {/* VIEW SWITCHER TABS & TYPE FILTER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-card border border-border/80">
          <button
            type="button"
            onClick={() => setActiveTab('proximos')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'proximos'
                ? activeSection === 'saude'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-purple-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Próximos ({activeSection === 'saude' ? upcomingHealth.length : upcomingRoutine.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('calendario')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'calendario'
                ? activeSection === 'saude'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-purple-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            Agenda Integrada
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('historico')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'historico'
                ? activeSection === 'saude'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-purple-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Histórico ({activeSection === 'saude' ? historyHealth.length : historyRoutine.length})
          </button>
        </div>

        {/* Filtros específicos por seção */}
        {activeTab !== 'calendario' && (
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            {activeSection === 'saude' ? (
              <select
                aria-label="Filtrar por tipo clínico"
                value={filterHealthType}
                onChange={(e) => setFilterHealthType(e.target.value)}
                className="bg-card border border-border/80 text-xs rounded-xl px-2.5 py-1.5 text-muted-foreground focus:outline-none focus:border-primary"
              >
                <option value="all">Todos os tipos clínicos</option>
                <option value="consulta">Consultas</option>
                <option value="vacina">Vacinas</option>
                <option value="medicacao">Medicações</option>
                <option value="tratamento">Tratamentos</option>
              </select>
            ) : (
              <select
                aria-label="Filtrar por categoria de rotina"
                value={filterRoutineCategory}
                onChange={(e) => setFilterRoutineCategory(e.target.value)}
                className="bg-card border border-border/80 text-xs rounded-xl px-2.5 py-1.5 text-muted-foreground focus:outline-none focus:border-purple-500"
              >
                <option value="all">Todas as categorias da rotina</option>
                <option value="passeio">Passeios</option>
                <option value="aniversario">Aniversários</option>
                <option value="adestramento">Adestramento</option>
                <option value="competicao">Competições</option>
                <option value="banho_tosa">Banho & Tosa</option>
                <option value="encontro">Encontros</option>
                <option value="viagem">Viagens</option>
                <option value="outro">Outros</option>
              </select>
            )}
          </div>
        )}
      </div>

      {/* ================= ABA 1: PRÓXIMOS ================= */}
      {activeTab === 'proximos' && (
        <div className="space-y-3">
          {activeSection === 'saude' ? (
            upcomingHealth.length === 0 ? (
              <div className="p-8 rounded-3xl bg-card/60 border border-border/80 text-center space-y-2">
                <HeartPulse className="w-8 h-8 text-muted-foreground mx-auto opacity-60" />
                <p className="text-xs font-bold text-foreground">Nenhum evento clínico agendado</p>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  Registre uma consulta veterinária, vacina periódica ou medicação contínua.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openCreateHealthModal()}
                  className="text-xs rounded-xl mt-2"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Agendar Registro Clínico
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingHealth.map((ev) => (
                  <HealthCard
                    key={ev.id}
                    event={ev}
                    onToggleComplete={handleToggleHealthComplete}
                    onEdit={openEditHealthModal}
                    onDelete={handleDeleteHealthEvent}
                  />
                ))}
              </div>
            )
          ) : upcomingRoutine.length === 0 ? (
            <div className="p-8 rounded-3xl bg-card/60 border border-purple-500/30 text-center space-y-2">
              <Sparkles className="w-8 h-8 text-purple-400 mx-auto opacity-60" />
              <p className="text-xs font-bold text-foreground">Nenhum evento da rotina agendado</p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                Agende passeios, festas de aniversário pet, sessões de adestramento, banho ou
                viagens.
              </p>
              <Button
                size="sm"
                onClick={() => openCreateRoutineModal()}
                className="text-xs rounded-xl mt-2 bg-purple-600 hover:bg-purple-500 text-white"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Criar Evento de Rotina
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingRoutine.map((ev) => (
                <RoutineCard
                  key={ev.id}
                  event={ev}
                  onToggleComplete={handleToggleRoutineComplete}
                  onEdit={openEditRoutineModal}
                  onDelete={handleDeleteRoutineEvent}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= ABA 2: CALENDÁRIO VISUAL INTEGRADO ================= */}
      {activeTab === 'calendario' && (
        <div className="p-5 rounded-3xl bg-card border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-foreground capitalize">
                {currentCalendarDate.toLocaleDateString('pt-BR', {
                  month: 'long',
                  year: 'numeric',
                })}
              </h2>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-sky-400" /> Registros Clínicos
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400" /> Eventos & Rotina
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8 rounded-xl"
                onClick={() => {
                  const d = new Date(currentCalendarDate)
                  d.setMonth(d.getMonth() - 1)
                  setCurrentCalendarDate(d)
                }}
              >
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-8 px-2 font-semibold"
                onClick={() => setCurrentCalendarDate(new Date())}
              >
                Hoje
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8 rounded-xl"
                onClick={() => {
                  const d = new Date(currentCalendarDate)
                  d.setMonth(d.getMonth() + 1)
                  setCurrentCalendarDate(d)
                }}
              >
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            <span>Dom</span>
            <span>Seg</span>
            <span>Ter</span>
            <span>Qua</span>
            <span>Qui</span>
            <span>Sex</span>
            <span>Sáb</span>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((day, idx) => {
              const dayData = calendarEventsByDate[day.dateStr] || { health: [], routine: [] }
              const isToday = day.dateStr === todayStr
              const totalEvents = dayData.health.length + dayData.routine.length

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (activeSection === 'saude') {
                      openCreateHealthModal('consulta', day.dateStr)
                    } else {
                      openCreateRoutineModal('passeio', day.dateStr)
                    }
                  }}
                  className={`min-h-[82px] sm:min-h-[96px] p-1.5 rounded-2xl border transition flex flex-col justify-between cursor-pointer ${
                    day.isCurrentMonth
                      ? 'bg-background/60 border-border/70 hover:border-primary/50'
                      : 'bg-background/20 border-border/30 opacity-40'
                  } ${isToday ? 'ring-2 ring-primary border-primary' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-bold ${
                        isToday
                          ? 'w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black'
                          : 'text-foreground'
                      }`}
                    >
                      {day.date.getDate()}
                    </span>
                    {totalEvents > 0 && (
                      <span className="text-[9px] font-bold px-1 rounded-full bg-primary/20 text-primary">
                        {totalEvents}
                      </span>
                    )}
                  </div>

                  {/* Lista de chips com visual claramente distinto */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {/* Saúde Clínica (borda ciano/azul/esmeralda) */}
                    {dayData.health.slice(0, 2).map((ev) => {
                      const cfg =
                        ev.type === 'evento'
                          ? HEALTH_TYPE_CONFIG.consulta
                          : HEALTH_TYPE_CONFIG[ev.type] || HEALTH_TYPE_CONFIG.consulta
                      return (
                        <div
                          key={`h-${ev.id}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditHealthModal(ev)
                          }}
                          className={`text-[8.5px] font-semibold truncate px-1 py-0.5 rounded-md border ${cfg.badge} flex items-center gap-1`}
                        >
                          <span className="w-1 h-1 rounded-full bg-sky-400 shrink-0" />
                          <span className={ev.completed ? 'line-through opacity-70' : ''}>
                            {ev.title}
                          </span>
                        </div>
                      )
                    })}

                    {/* Eventos de Rotina (borda roxa / lilás) */}
                    {dayData.routine.slice(0, 2).map((rev) => {
                      const rcfg =
                        ROUTINE_CATEGORY_CONFIG[rev.category] || ROUTINE_CATEGORY_CONFIG.outro
                      return (
                        <div
                          key={`r-${rev.id}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditRoutineModal(rev)
                          }}
                          className={`text-[8.5px] font-semibold truncate px-1 py-0.5 rounded-md border bg-purple-500/20 text-purple-200 border-purple-500/40 flex items-center gap-1`}
                        >
                          <span className="w-1 h-1 rounded-full bg-purple-400 shrink-0" />
                          <span className={rev.completed ? 'line-through opacity-70' : ''}>
                            {rev.title}
                          </span>
                        </div>
                      )
                    })}

                    {totalEvents > 4 && (
                      <span className="text-[8px] text-muted-foreground font-semibold pl-1">
                        +{totalEvents - 4} mais
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ================= ABA 3: HISTÓRICO ================= */}
      {activeTab === 'historico' && (
        <div className="space-y-3">
          {activeSection === 'saude' ? (
            historyHealth.length === 0 ? (
              <div className="p-8 rounded-3xl bg-card/60 border border-border/80 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground mx-auto opacity-60" />
                <p className="text-xs font-bold text-foreground">
                  Nenhum evento clínico no histórico
                </p>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  Conforme consultas forem realizadas e vacinas aplicadas, elas serão arquivadas
                  aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {historyHealth.map((ev) => (
                  <HealthCard
                    key={ev.id}
                    event={ev}
                    onToggleComplete={handleToggleHealthComplete}
                    onEdit={openEditHealthModal}
                    onDelete={handleDeleteHealthEvent}
                  />
                ))}
              </div>
            )
          ) : historyRoutine.length === 0 ? (
            <div className="p-8 rounded-3xl bg-card/60 border border-purple-500/30 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-purple-400 mx-auto opacity-60" />
              <p className="text-xs font-bold text-foreground">
                Nenhum evento de rotina no histórico
              </p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                Passeios concluídos, aniversários e encontros passados serão listados aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {historyRoutine.map((ev) => (
                <RoutineCard
                  key={ev.id}
                  event={ev}
                  onToggleComplete={handleToggleRoutineComplete}
                  onEdit={openEditRoutineModal}
                  onDelete={handleDeleteRoutineEvent}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL DE SAÚDE CLÍNICA (SEM "EVENTO") ================= */}
      <Dialog open={healthModalOpen} onOpenChange={setHealthModalOpen}>
        <DialogContent className="max-w-md bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-foreground">
              {editingHealthEvent ? 'Editar Registro de Saúde' : 'Novo Registro de Saúde'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Acompanhamento clínico de {targetDog?.name || 'seu pet'} (consultas, vacinas,
              medicações e tratamentos).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveHealthEvent} className="space-y-3.5 pt-2">
            {/* Seletor com APENAS os 4 tipos clínicos */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Tipo de Ação Clínica</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(HEALTH_TYPE_CONFIG) as HealthEventType[]).map((typeKey) => {
                  const cfg = HEALTH_TYPE_CONFIG[typeKey]
                  const Icon = cfg.icon
                  const isSelected = formHealthType === typeKey
                  return (
                    <button
                      key={typeKey}
                      type="button"
                      onClick={() => setFormHealthType(typeKey)}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? `${cfg.color} border-current font-bold shadow-sm`
                          : 'bg-background/60 border-border/70 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="text-xs truncate">{cfg.label.split(' ')[0]}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Título */}
            <div className="space-y-1">
              <Label htmlFor="health-title" className="text-xs font-semibold text-foreground">
                Título do Procedimento *
              </Label>
              <Input
                id="health-title"
                value={formHealthTitle}
                onChange={(e) => setFormHealthTitle(e.target.value)}
                placeholder={
                  formHealthType === 'vacina'
                    ? 'Ex: Vacina V10 (Déctupla) Anual'
                    : formHealthType === 'medicacao'
                      ? 'Ex: Apoquel 5.4mg'
                      : formHealthType === 'consulta'
                        ? 'Ex: Consulta de Rotina / Check-up Geral'
                        : 'Ex: Sessão de Fisioterapia / Acupuntura'
                }
                className="bg-background text-xs h-10 rounded-xl"
                required
              />
            </div>

            {/* Data e Horário */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="health-date" className="text-xs font-semibold text-foreground">
                  Data *
                </Label>
                <Input
                  id="health-date"
                  type="date"
                  value={formHealthDate}
                  onChange={(e) => setFormHealthDate(e.target.value)}
                  className="bg-background text-xs h-10 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="health-time" className="text-xs font-semibold text-foreground">
                  Horário
                </Label>
                <Input
                  id="health-time"
                  type="time"
                  value={formHealthTime}
                  onChange={(e) => setFormHealthTime(e.target.value)}
                  className="bg-background text-xs h-10 rounded-xl"
                />
              </div>
            </div>

            {/* Campos específicos de Medicação / Tratamento */}
            {(formHealthType === 'medicacao' || formHealthType === 'tratamento') && (
              <div className="p-3 rounded-2xl bg-background/50 border border-border/80 space-y-2.5">
                <span className="text-[11px] font-bold text-primary block">
                  Detalhes da Prescrição
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="dosage" className="text-[11px] text-muted-foreground">
                      Dosagem
                    </Label>
                    <Input
                      id="dosage"
                      value={formHealthDosage}
                      onChange={(e) => setFormHealthDosage(e.target.value)}
                      placeholder="Ex: 1 comp, 2.5ml"
                      className="bg-background text-xs h-9 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="frequency" className="text-[11px] text-muted-foreground">
                      Frequência
                    </Label>
                    <Input
                      id="frequency"
                      value={formHealthFrequency}
                      onChange={(e) => setFormHealthFrequency(e.target.value)}
                      placeholder="Ex: A cada 12h, 1x/dia"
                      className="bg-background text-xs h-9 rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="duration" className="text-[11px] text-muted-foreground">
                    Duração / Período
                  </Label>
                  <Input
                    id="duration"
                    value={formHealthDuration}
                    onChange={(e) => setFormHealthDuration(e.target.value)}
                    placeholder="Ex: Por 14 dias, uso contínuo"
                    className="bg-background text-xs h-9 rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Profissional e Local */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="professional" className="text-xs font-semibold text-foreground">
                  Veterinário / Responsável
                </Label>
                <Input
                  id="professional"
                  value={formHealthProfessional}
                  onChange={(e) => setFormHealthProfessional(e.target.value)}
                  placeholder="Ex: Dra. Camila"
                  className="bg-background text-xs h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="location" className="text-xs font-semibold text-foreground">
                  Clínica / Hospital
                </Label>
                <Input
                  id="location"
                  value={formHealthLocation}
                  onChange={(e) => setFormHealthLocation(e.target.value)}
                  placeholder="Ex: PetCare Moema"
                  className="bg-background text-xs h-10 rounded-xl"
                />
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1">
              <Label htmlFor="health-notes" className="text-xs font-semibold text-foreground">
                Observações Clínicas
              </Label>
              <Textarea
                id="health-notes"
                value={formHealthNotes}
                onChange={(e) => setFormHealthNotes(e.target.value)}
                placeholder="Ex: Manter em jejum; retorno em 15 dias; apresentar laudo de sangue."
                className="bg-background text-xs min-h-[70px] rounded-xl resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setHealthModalOpen(false)}
                className="rounded-xl text-xs h-9"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={healthSaving}
                className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-5 shadow-sm"
              >
                {healthSaving
                  ? 'Gravando...'
                  : editingHealthEvent
                    ? 'Salvar Alterações'
                    : 'Criar Registro'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL DE EVENTO DE ROTINA (NOVO / INDEPENDENTE) ================= */}
      <Dialog open={routineModalOpen} onOpenChange={setRoutineModalOpen}>
        <DialogContent className="max-w-md bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              {editingRoutineEvent ? 'Editar Evento da Rotina' : 'Novo Evento da Rotina & Vida Pet'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Passeios, aniversários, adestramento, competições, banho e encontros de{' '}
              {targetDog?.name || 'seu pet'}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRoutineEvent} className="space-y-3.5 pt-2">
            {/* Categoria do evento de rotina */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Categoria do Evento</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(Object.keys(ROUTINE_CATEGORY_CONFIG) as RoutineEventCategory[]).map((catKey) => {
                  const cfg = ROUTINE_CATEGORY_CONFIG[catKey]
                  const Icon = cfg.icon
                  const isSelected = formRoutineCategory === catKey
                  return (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => setFormRoutineCategory(catKey)}
                      className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/20 text-purple-200 font-bold shadow-sm'
                          : 'bg-background/60 border-border/70 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-[10px] truncate w-full">{cfg.label.split('/')[0]}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Título do evento */}
            <div className="space-y-1">
              <Label htmlFor="routine-title" className="text-xs font-semibold text-foreground">
                Título do Evento *
              </Label>
              <Input
                id="routine-title"
                value={formRoutineTitle}
                onChange={(e) => setFormRoutineTitle(e.target.value)}
                placeholder={
                  formRoutineCategory === 'passeio'
                    ? 'Ex: Caminhada no Parque do Ibirapuera'
                    : formRoutineCategory === 'aniversario'
                      ? 'Ex: Aniversário de 3 anos do pet'
                      : formRoutineCategory === 'adestramento'
                        ? 'Ex: Treino de obediência e foco'
                        : formRoutineCategory === 'competicao'
                          ? 'Ex: Prova de Agility / Morfologia'
                          : formRoutineCategory === 'banho_tosa'
                            ? 'Ex: Banho de ozonioterapia e tosa higiênica'
                            : 'Ex: Encontro de pets da raça no parque'
                }
                className="bg-background text-xs h-10 rounded-xl"
                required
              />
            </div>

            {/* Data */}
            <div className="space-y-1">
              <Label htmlFor="routine-date" className="text-xs font-semibold text-foreground">
                Data do Evento *
              </Label>
              <Input
                id="routine-date"
                type="date"
                value={formRoutineDate}
                onChange={(e) => setFormRoutineDate(e.target.value)}
                className="bg-background text-xs h-10 rounded-xl"
                required
              />
            </div>

            {/* Horário de Início e Horário de Término */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label
                  htmlFor="start-time"
                  className="text-xs font-semibold text-foreground flex items-center gap-1"
                >
                  <Clock className="w-3 h-3 text-purple-400" />
                  Hora de Início *
                </Label>
                <Input
                  id="start-time"
                  type="time"
                  value={formRoutineStartTime}
                  onChange={(e) => setFormRoutineStartTime(e.target.value)}
                  className="bg-background text-xs h-10 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="end-time"
                  className="text-xs font-semibold text-foreground flex items-center gap-1"
                >
                  <Clock className="w-3 h-3 text-purple-400" />
                  Hora de Término *
                </Label>
                <Input
                  id="end-time"
                  type="time"
                  value={formRoutineEndTime}
                  onChange={(e) => setFormRoutineEndTime(e.target.value)}
                  className="bg-background text-xs h-10 rounded-xl"
                  required
                />
              </div>
            </div>

            {/* Local e Repetição */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <div className="space-y-1">
                <Label
                  htmlFor="routine-location"
                  className="text-xs font-semibold text-foreground min-h-[1.25rem] flex items-center"
                >
                  Local / Endereço
                </Label>
                <Input
                  id="routine-location"
                  value={formRoutineLocation}
                  onChange={(e) => setFormRoutineLocation(e.target.value)}
                  placeholder="Ex: Praça dos Cachorros"
                  className="bg-background text-xs h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="routine-repeat"
                  className="text-xs font-semibold text-foreground min-h-[1.25rem] flex items-center gap-1.5"
                >
                  <Repeat className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Repetição</span>
                </Label>
                <select
                  id="routine-repeat"
                  value={formRoutineRepeat}
                  onChange={(e) => setFormRoutineRepeat(e.target.value as RoutineEventRepeat)}
                  className="w-full bg-background border border-input text-xs h-10 rounded-xl px-3 text-foreground"
                >
                  <option value="nenhuma">Não se repete</option>
                  <option value="diaria">Todos os dias</option>
                  <option value="semanal">Semanalmente</option>
                  <option value="quinzenal">A cada 15 dias</option>
                  <option value="mensal">Mensalmente</option>
                  <option value="anual">Anualmente (aniversário)</option>
                </select>
              </div>
            </div>

            {/* Notas e Detalhes */}
            <div className="space-y-1">
              <Label htmlFor="routine-notes" className="text-xs font-semibold text-foreground">
                Notas & Detalhes da Rotina
              </Label>
              <Textarea
                id="routine-notes"
                value={formRoutineNotes}
                onChange={(e) => setFormRoutineNotes(e.target.value)}
                placeholder="Ex: Levar petiscos, brinquedo favorito e água fresca; combinar carona com amigos."
                className="bg-background text-xs min-h-[70px] rounded-xl resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRoutineModalOpen(false)}
                className="rounded-xl text-xs h-9"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={routineSaving}
                className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs h-9 px-5 shadow-sm"
              >
                {routineSaving
                  ? 'Gravando...'
                  : editingRoutineEvent
                    ? 'Salvar Alterações'
                    : 'Criar Evento'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * Cartão de Registro de Saúde Clínica
 */
function HealthCard({
  event,
  onToggleComplete,
  onEdit,
  onDelete,
}: {
  event: HealthEventRecord
  onToggleComplete: (ev: HealthEventRecord) => void
  onEdit: (ev: HealthEventRecord) => void
  onDelete: (id: string) => void
}) {
  const safeType: HealthEventType =
    event.type === 'evento' ? 'consulta' : (event.type as HealthEventType)
  const cfg = HEALTH_TYPE_CONFIG[safeType] || HEALTH_TYPE_CONFIG.consulta
  const Icon = cfg.icon

  const dateObj = new Date(event.event_date)
  const isDateValid = !isNaN(dateObj.getTime())
  const formattedDate = isDateValid
    ? dateObj.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : event.event_date

  const timeStr =
    event.event_date.includes('T') && event.event_date.split('T')[1]?.slice(0, 5) !== '00:00'
      ? event.event_date.split('T')[1]?.slice(0, 5)
      : null

  return (
    <div
      className={`p-4 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        event.completed
          ? 'bg-card/40 border-border/40 opacity-75'
          : 'bg-card border-border/80 hover:border-border shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onToggleComplete(event)}
          title={event.completed ? 'Marcar como pendente' : 'Marcar como concluído'}
          className="mt-0.5 cursor-pointer text-muted-foreground hover:text-primary transition"
        >
          {event.completed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground hover:text-primary" />
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-black tracking-tight ${
                event.completed ? 'line-through text-muted-foreground' : 'text-foreground'
              }`}
            >
              {event.title}
            </span>
            <Badge className={`text-[9px] px-2 py-0 border ${cfg.badge}`}>{cfg.label}</Badge>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1 font-medium">
              <CalendarIcon className="w-3 h-3 text-primary" />
              {formattedDate} {timeStr ? `às ${timeStr}` : ''}
            </span>

            {event.dosage && (
              <span className="flex items-center gap-1 font-semibold text-foreground/80">
                <Pill className="w-3 h-3 text-amber-400" />
                {event.dosage}
                {event.frequency ? ` • ${event.frequency}` : ''}
              </span>
            )}

            {event.duration && (
              <span className="text-[10px] text-muted-foreground">({event.duration})</span>
            )}

            {event.professional && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {event.professional}
              </span>
            )}

            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {event.location}
              </span>
            )}
          </div>

          {event.notes && (
            <p className="text-[11px] text-muted-foreground leading-relaxed pt-0.5 line-clamp-2">
              {event.notes}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onEdit(event)}
          className="w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground"
          title="Editar registro clínico"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onDelete(event.id)}
          className="w-8 h-8 rounded-xl text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
          title="Excluir registro clínico"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

/**
 * Cartão de Evento da Rotina (Visualmente distinguível com paleta púrpura/violeta e horários de Início e Fim)
 */
function RoutineCard({
  event,
  onToggleComplete,
  onEdit,
  onDelete,
}: {
  event: RoutineEventRecord
  onToggleComplete: (ev: RoutineEventRecord) => void
  onEdit: (ev: RoutineEventRecord) => void
  onDelete: (id: string) => void
}) {
  const cfg = ROUTINE_CATEGORY_CONFIG[event.category] || ROUTINE_CATEGORY_CONFIG.outro
  const Icon = cfg.icon

  const dateParts = event.event_date.split('-')
  const formattedDate =
    dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : event.event_date

  return (
    <div
      className={`p-4 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        event.completed
          ? 'bg-purple-950/20 border-purple-900/30 opacity-70'
          : 'bg-card border-purple-500/30 hover:border-purple-500/60 shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onToggleComplete(event)}
          title={event.completed ? 'Marcar como não realizado' : 'Marcar como realizado'}
          className="mt-0.5 cursor-pointer text-muted-foreground hover:text-purple-400 transition"
        >
          {event.completed ? (
            <CheckCircle2 className="w-5 h-5 text-purple-400" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground hover:text-purple-400" />
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-black tracking-tight ${
                event.completed ? 'line-through text-muted-foreground' : 'text-foreground'
              }`}
            >
              {event.title}
            </span>
            <Badge className={`text-[9px] px-2 py-0 border ${cfg.badge} flex items-center gap-1`}>
              <Icon className="w-2.5 h-2.5" />
              <span>{cfg.label}</span>
            </Badge>

            {event.repeat && event.repeat !== 'nenhuma' && (
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0 border-purple-400/40 text-purple-300"
              >
                <Repeat className="w-2.5 h-2.5 mr-1 inline" />
                {event.repeat}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1 font-medium text-purple-300">
              <CalendarIcon className="w-3 h-3" />
              {formattedDate}
            </span>

            {/* Início e Fim */}
            <span className="flex items-center gap-1 font-semibold text-foreground/90 bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20">
              <Clock className="w-3 h-3 text-purple-400" />
              {event.start_time || '--:--'} às {event.end_time || '--:--'}
            </span>

            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-purple-400" />
                {event.location}
              </span>
            )}
          </div>

          {event.notes && (
            <p className="text-[11px] text-muted-foreground leading-relaxed pt-0.5 line-clamp-2">
              {event.notes}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onEdit(event)}
          className="w-8 h-8 rounded-xl text-muted-foreground hover:text-purple-300 hover:bg-purple-500/10"
          title="Editar evento de rotina"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onDelete(event.id)}
          className="w-8 h-8 rounded-xl text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
          title="Excluir evento de rotina"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}
