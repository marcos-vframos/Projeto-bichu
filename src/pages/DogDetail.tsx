import { formatPortion } from '@/lib/format-portion'
import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Edit2,
  Check,
  Scale,
  Soup,
  TrendingUp,
  AlertCircle,
  Activity,
  Calendar,
  Sparkles,
  Info,
  Box,
} from 'lucide-react'
import { useDog } from '@/contexts/DogContext'
import { DogAvatar } from '@/components/DogAvatar'
import { WeightSheet } from '@/components/WeightSheet'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { nutritionService } from '@/services/nutrition'
import { formatAge } from '@/lib/nutrition-calculator'
import { toast } from 'sonner'
import type { DogRecord, FeedingPlanRecord, WeightLogRecord } from '@/types/nutrition'

export default function DogDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { activeDog, setActiveDogId, refreshDogs } = useDog()

  const [dog, setDog] = useState<DogRecord | null>(null)
  const [plan, setPlan] = useState<FeedingPlanRecord | null>(null)
  const [weights, setWeights] = useState<WeightLogRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [weightSheetOpen, setWeightSheetOpen] = useState(false)

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setDog(null)
    setPlan(null)
    setWeights([])
    try {
      const dogData = await nutritionService.getDogById(id)
      setDog(dogData)

      if (dogData) {
        const [planData, weightsData] = await Promise.all([
          nutritionService.getActivePlan(id),
          nutritionService.getWeightLogs(id),
        ])
        setPlan(planData)
        setWeights(weightsData)
      } else {
        setPlan(null)
        setWeights([])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <div className="w-9 h-9 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        <p className="text-xs text-muted-foreground">Carregando detalhes do pet...</p>
      </div>
    )
  }

  if (!dog) {
    return (
      <div className="py-12 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-foreground">Pet não encontrado</h2>
        <Button onClick={() => navigate('/caes')} variant="outline" className="text-xs">
          Voltar para Meus pets
        </Button>
      </div>
    )
  }

  const isActive = activeDog?.id === dog.id

  const handleSetActive = () => {
    setActiveDogId(dog.id)
    toast.success(`${dog.name} agora é o pet ativo`)
  }

  // Estimated BCS (Body Condition Score 1-9) approximation based on condition
  const getBcsEstimate = () => {
    if (dog.body_condition === 'abaixo_do_ideal') {
      return { score: '3/9', label: 'Abaixo do peso ideal', color: 'text-amber-400' }
    }
    if (dog.body_condition === 'acima_do_ideal') {
      return { score: '7/9', label: 'Acima do peso ideal (Sobrepeso)', color: 'text-rose-400' }
    }
    return { score: '5/9', label: 'Peso Ideal / Saudável', color: 'text-emerald-400' }
  }

  const bcs = getBcsEstimate()

  return (
    <div className="space-y-6 pb-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => navigate('/caes')}
          className="w-9 h-9 rounded-xl hover:bg-muted"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Button>

        <div className="flex items-center gap-2">
          {!isActive && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSetActive}
              className="text-xs h-9 rounded-xl border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Tornar Ativo
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => navigate(`/caes/${dog.id}/editar`)}
            className="text-xs h-9 rounded-xl bg-card border border-border/80 hover:bg-muted text-foreground"
          >
            <Edit2 className="w-3.5 h-3.5 mr-1.5" />
            Editar
          </Button>
        </div>
      </div>

      {/* Hero Profile Header */}
      <div className="p-5 sm:p-6 rounded-3xl bg-card border border-border/80 space-y-4 relative overflow-hidden">
        <div className="flex items-start gap-4">
          <DogAvatar name={dog.name} avatarUrl={nutritionService.getAvatarUrl(dog)} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-foreground tracking-tight truncate">
                {dog.name}
              </h1>
              {isActive && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Pet ativo
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-0.5">{dog.breed || 'SRD'}</p>

            <div className="flex items-center gap-2 flex-wrap mt-2.5">
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-background/80 border border-border/60 text-foreground/90 font-medium">
                {formatAge(dog.birth_date)}
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-background/80 border border-border/60 text-foreground/90 font-medium capitalize">
                {dog.sex === 'femea' ? 'Fêmea' : 'Macho'}
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-background/80 border border-border/60 text-foreground/90 font-medium">
                {dog.sterilized ? 'Castrado(a)' : 'Inteiro'}
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
                {dog.weight_kg} kg
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="resumo" className="w-full">
        <TabsList className="grid grid-cols-3 bg-card border border-border/80 h-11 rounded-2xl p-1">
          <TabsTrigger value="resumo" className="text-xs rounded-xl font-semibold">
            Resumo
          </TabsTrigger>
          <TabsTrigger value="plano" className="text-xs rounded-xl font-semibold">
            Plano
          </TabsTrigger>
          <TabsTrigger value="peso" className="text-xs rounded-xl font-semibold">
            Histórico Peso
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: RESUMO */}
        <TabsContent value="resumo" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-card border border-border/70">
              <span className="text-xs text-muted-foreground font-medium">Calorias / Dia</span>
              <div className="text-2xl font-black text-foreground mt-1">
                {plan?.daily_kcal || '---'}
                <span className="text-xs font-normal text-emerald-400 ml-1">kcal</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Metabolismo de repouso x fator
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/70">
              <span className="text-xs text-muted-foreground font-medium">Porção do alimento</span>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                {plan?.daily_grams ? formatPortion(plan.daily_grams) : '---'}
                <span className="text-xs font-normal text-muted-foreground ml-1">g/dia</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Em {plan?.meals_per_day || 2} refeições diárias
              </p>
            </div>
          </div>

          {/* BCS Body Condition Score Card */}
          <div className="p-4 rounded-2xl bg-card border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Condição Corporal (Escala BCS 1 a 9)</span>
              </div>
              <span className={`text-xs font-black ${bcs.color}`}>{bcs.score}</span>
            </div>

            <p className="text-xs text-muted-foreground">{bcs.label}</p>

            <div className="flex items-center justify-between pt-1 border-t border-border/50">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-primary" />
                Modelo 3D Morfofisiológico interativo 360°
              </span>
              <Button
                size="sm"
                onClick={() => navigate(`/bcs/${dog.id}`)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl h-8"
              >
                Abrir Guia 3D BCS
              </Button>
            </div>
          </div>

          {/* Quick CTA to feeding plan */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-card to-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-foreground">Deseja ajustar as porções?</p>
              <p className="text-[11px] text-muted-foreground">
                Recalcule com base na marca da ração e objetivo.
              </p>
            </div>
            <Button
              onClick={() => navigate(`/caes/${dog.id}/plano`)}
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs rounded-xl"
            >
              Abrir Calculadora
            </Button>
          </div>
        </TabsContent>

        {/* TAB 2: PLANO */}
        <TabsContent value="plano" className="space-y-4 mt-4">
          <div className="p-5 rounded-2xl bg-card border border-border/70 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Soup className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-foreground">Plano Ativo</h3>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/caes/${dog.id}/plano`)}
                className="text-xs h-8 rounded-lg border-emerald-500/40 text-emerald-400"
              >
                Ajustar Plano
              </Button>
            </div>

            {plan ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-background/50 border border-border/50">
                    <span className="text-muted-foreground">Ração Utilizada</span>
                    <p className="font-bold text-foreground mt-0.5">{plan.food_name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {plan.kcal_per_kg} kcal/kg
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-background/50 border border-border/50">
                    <span className="text-muted-foreground">Objetivo</span>
                    <p className="font-bold text-foreground capitalize mt-0.5">
                      {plan.goal === 'emagrecer'
                        ? 'Perda de Peso'
                        : plan.goal === 'ganhar'
                          ? 'Ganho de Peso'
                          : 'Manter Peso'}
                    </p>
                  </div>
                </div>

                {/* Meals list */}
                {plan.meals_json && plan.meals_json.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Divisão das Refeições:
                    </span>
                    <div className="space-y-1.5">
                      {plan.meals_json.map((m, idx) => (
                        <div
                          key={m.id || idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-background/60 border border-border/50 text-xs"
                        >
                          <span className="font-medium text-foreground">{m.label}</span>
                          <span className="font-bold text-emerald-400">{formatPortion(m.grams)} g</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-xs text-muted-foreground mb-3">Nenhum plano configurado.</p>
                <Button
                  onClick={() => navigate(`/caes/${dog.id}/plano`)}
                  className="bg-emerald-500 text-black font-semibold text-xs rounded-xl"
                >
                  Criar Primeiro Plano
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 3: PESO */}
        <TabsContent value="peso" className="space-y-4 mt-4">
          <div className="p-5 rounded-2xl bg-card border border-border/70 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Histórico de Peso</h3>
                <p className="text-xs text-muted-foreground">
                  {weights.length} registros cadastrados
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setWeightSheetOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs rounded-xl"
              >
                <Scale className="w-3.5 h-3.5 mr-1" />
                Registrar Peso
              </Button>
            </div>

            {/* Weights List */}
            {weights.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhum registro de peso além do inicial.
              </p>
            ) : (
              <div className="space-y-2">
                {[...weights].reverse().map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {new Date(w.logged_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <span className="font-black text-foreground text-sm">{w.weight_kg} kg</span>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => navigate(`/caes/${dog.id}/peso`)}
              className="w-full text-xs rounded-xl border-border/70 hover:border-emerald-500/50"
            >
              <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
              Ver Gráfico Completo de Evolução
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <WeightSheet
        open={weightSheetOpen}
        onOpenChange={setWeightSheetOpen}
        dog={dog}
        onSaved={loadData}
      />
    </div>
  )
}
