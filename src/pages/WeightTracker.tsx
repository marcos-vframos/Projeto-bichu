import { BCS_ENABLED } from '@/lib/features'
import { formatPortion } from '@/lib/format-portion'
import { weightDate } from '@/lib/weight-date'
import DietPlanSummary from '@/components/DietPlanSummary'
import DailyMealChecklist from '@/components/DailyMealChecklist'
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Scale,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Minus,
  Calendar,
  Sparkles,
  Activity,
  AlertTriangle,
  ChevronRight,
  Calculator,
  Save,
  Clock,
  Flame,
  Check,
  Info,
  Camera,
  Upload,
  Layers,
  Box,
  Stethoscope,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { useDog } from '@/contexts/DogContext'
import { nutritionService } from '@/services/nutrition'
import { WeightSheet } from '@/components/WeightSheet'
import BcsInteractivePage from '@/pages/BcsInteractive'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { calculateNutrition, getDefaultMeals } from '@/lib/nutrition-calculator'
import { compressImageFile } from '@/lib/image-compress'
import { parseNutritionLabelText, type ExtractedFoodData } from '@/lib/label-parser'
import type {
  DogRecord,
  WeightLogRecord,
  BcsEvaluationRecord,
  FeedingPlanRecord,
  FeedingGoal,
  ActivityLevel,
  FoodRecord,
  MealItem,
} from '@/types/nutrition'

export default function WeightTrackerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const {
    dogs,
    activeDog,
    loading: dogContextLoading,
    setActiveDogId,
    refreshDogs,
    refreshActivePlan,
  } = useDog()

  // Prioritize URL id, then activeDog, then first dog
  const targetId = id || activeDog?.id || dogs[0]?.id

  const [dog, setDog] = useState<DogRecord | null>(null)
  const [weights, setWeights] = useState<WeightLogRecord[]>([])
  const [latestBcs, setLatestBcs] = useState<BcsEvaluationRecord | null>(null)
  const [foods, setFoods] = useState<FoodRecord[]>([])
  const [currentPlan, setCurrentPlan] = useState<FeedingPlanRecord | null>(null)
  const [loading, setLoading] = useState(true)

  // Sub-tabs: "tudo" (visão integrada recomendada), "peso" (pesagens), "bcs" (guia BCS completo), "plano" (nutrição)
  const [activeSubTab, setActiveSubTab] = useState<'tudo' | 'peso' | 'bcs' | 'plano'>('tudo')

  // Open sheet if query param ?novo=1 is present
  const [sheetOpen, setSheetOpen] = useState(searchParams.get('novo') === '1')

  // PLAN STATE
  const [goal, setGoal] = useState<FeedingGoal>('manter')
  const [activity, setActivity] = useState<ActivityLevel>('moderada')
  const [foodKcalPerKg, setFoodKcalPerKg] = useState<number>(3500)
  const [foodName, setFoodName] = useState<string>('Ração Padrão')
  const [selectedFoodId, setSelectedFoodId] = useState<string>('')
  const [mealsCount, setMealsCount] = useState<number>(2)
  const [customMeals, setCustomMeals] = useState<MealItem[]>([])
  const [savingPlan, setSavingPlan] = useState(false)

  // UPLOAD PHOTO MODAL (ITEM 5)
  const [photoModalOpen, setPhotoModalOpen] = useState(false)
  const [frontPhoto, setFrontPhoto] = useState<File | null>(null)
  const [frontPhotoPreview, setFrontPhotoPreview] = useState<string | null>(null)
  const [specPhoto, setSpecPhoto] = useState<File | null>(null)
  const [specPhotoPreview, setSpecPhotoPreview] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<ExtractedFoodData | null>(null)
  const [manualText, setManualText] = useState('')
  const [uploadingFood, setUploadingFood] = useState(false)

  const frontInputRef = useRef<HTMLInputElement | null>(null)
  const specInputRef = useRef<HTMLInputElement | null>(null)

  const loadData = useCallback(async () => {
    if (!targetId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [dogData, weightsData, bcsData, catalogData, planData] = await Promise.all([
        nutritionService.getDogById(targetId),
        nutritionService.getWeightLogs(targetId),
        nutritionService.getLatestBcsEvaluation(targetId),
        nutritionService.getFoodsCatalog(),
        nutritionService.getActivePlan(targetId),
      ])

      setDog(dogData)
      setWeights(weightsData)
      setLatestBcs(bcsData)
      setFoods(dogData?.species === 'felina' ? [] : catalogData)
      setCurrentPlan(planData)
      if (dogData) {
        setActivity(dogData.activity_level || 'moderada')
      }

      if (planData) {
        setGoal(dogData?.species === 'felina' ? 'manter' : planData.goal || 'manter')
        setFoodKcalPerKg(planData.kcal_per_kg || 3500)
        setFoodName(planData.food_name || 'Ração Padrão')
        setMealsCount(planData.meals_per_day || 2)
        if (planData.meals_json && planData.meals_json.length > 0) {
          setCustomMeals(planData.meals_json)
        }
        if (planData.food) {
          setSelectedFoodId(planData.food)
        } else {
          setSelectedFoodId('')
        }
      } else if (dogData) {
        setGoal('manter')
        setFoodKcalPerKg(3500)
        setFoodName('Ração Padrão')
        setMealsCount(2)
        setSelectedFoodId('')
        const initialCalc = calculateNutrition({
          species: dogData.species,
      birthDate: dogData.birth_date,
      weightKg: dogData.weight_kg,
          sterilized: dogData.sterilized,
          activityLevel: dogData.activity_level,
          goal: 'manter',
          foodKcalPerKg: 3500,
          mealsPerDay: 2,
        })
        setCustomMeals(getDefaultMeals(2, initialCalc.dailyGrams))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [targetId])

  useEffect(() => { const changed = () => { void loadData() }; window.addEventListener('bichu:weight-changed', changed); return () => window.removeEventListener('bichu:weight-changed', changed) }, [loadData])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Real-time NRC / WSAVA calculation
  const calculation = useMemo(() => {
    if (!dog) {
      return {
        rer: 0,
        baseFactor: 1.6,
        activityAdjustmentPercent: 0,
        totalFactor: 1.6,
        dailyKcal: 0,
        dailyGrams: 0,
        foodKcalPerKg: 3500,
        mealsPerDay: 2,
      }
    }

    const computed = calculateNutrition({
      species: dog.species,
      birthDate: dog.birth_date,
      weightKg: dog.weight_kg,
      sterilized: dog.sterilized,
      activityLevel: activity,
      goal,
      foodKcalPerKg,
      mealsPerDay: mealsCount,
    })
    if (currentPlan?.diet_mode && currentPlan.diet_mode !== 'commercial') return { ...computed, dailyKcal: currentPlan.daily_kcal, dailyGrams: currentPlan.daily_grams, foodKcalPerKg: currentPlan.kcal_per_kg }
    return computed
  }, [dog, activity, goal, foodKcalPerKg, mealsCount, currentPlan])

  const handleGoalChange = (newGoal: FeedingGoal) => { if (dog?.species !== 'felina' || newGoal === 'manter') setGoal(newGoal) }

  // Sync meals when count or grams change
  useEffect(() => {
    if (!calculation.dailyGrams) return
    setCustomMeals((prev) => {
      if (prev.length === mealsCount) {
        const basePortion = Math.floor(calculation.dailyGrams / mealsCount)
        const remainder = calculation.dailyGrams - basePortion * mealsCount
        return prev.map((m, idx) => ({
          ...m,
          grams: basePortion + (idx === 0 ? remainder : 0),
        }))
      }
      return getDefaultMeals(mealsCount, calculation.dailyGrams)
    })
  }, [mealsCount, calculation.dailyGrams])

  const handleFoodSelect = (foodId: string) => {
    setSelectedFoodId(foodId)
    const found = foods.find((f) => f.id === foodId)
    if (found) {
      setFoodName(`${found.brand} - ${found.name}`)
      setFoodKcalPerKg(found.kcal_per_kg)
    }
  }

  const handleMealLabelChange = (index: number, label: string) => {
    setCustomMeals((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], label }
      return copy
    })
  }

  const handleMealTimeChange = (index: number, time: string) => {
    setCustomMeals((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], time }
      return copy
    })
  }

  const handleMealGramsChange = (index: number, grams: number) => {
    setCustomMeals((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], grams: Math.max(0, grams) }
      return copy
    })
  }

  const handleSavePlan = async () => {
    if (!dog) return
    if (currentPlan?.diet_mode && currentPlan.diet_mode !== 'commercial') { toast.info('Edite a receita ou combinação na área de alimentação natural do comparador.'); return }
    setSavingPlan(true)
    try {
      await nutritionService.savePlan(dog.id, {
        diet_mode: 'commercial',
        food_name: foodName,
        kcal_per_kg: foodKcalPerKg,
        meals_per_day: mealsCount,
        daily_kcal: calculation.dailyKcal,
        daily_grams: calculation.dailyGrams,
        goal,
        meals_json: customMeals,
        food: selectedFoodId || undefined,
      })

      if (dog.activity_level !== activity) {
        await nutritionService.updateDog(dog.id, { activity_level: activity })
      }

      await refreshActivePlan()
      await refreshDogs()
      toast.success('Plano alimentar e meta calórica atualizados com sucesso!')
    } catch (e) {
      console.error(e)
      toast.error('Erro ao salvar plano alimentar.')
    } finally {
      setSavingPlan(false)
    }
  }

  const handleDeleteWeight = async (logId: string) => {
    if (weights.length <= 1) {
      toast.error('O pet deve manter pelo menos um registro de peso.')
      return
    }
    try {
      const ok = await nutritionService.deleteWeightLog(logId)
      if (ok) {
        toast.success('Registro de peso removido.')
        await loadData()
        await refreshDogs()
      }
    } catch {
      toast.error('Erro ao excluir registro.')
    }
  }

  // PHOTO UPLOAD & RE-CALCULATION (Item 5)
  const handleFrontPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImageFile(file, 1200, 0.85)
      setFrontPhoto(compressed)
      setFrontPhotoPreview(URL.createObjectURL(compressed))
    } catch {
      setFrontPhoto(file)
      setFrontPhotoPreview(URL.createObjectURL(file))
    }
  }

  const handleSpecPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImageFile(file, 1200, 0.85)
      setSpecPhoto(compressed)
      setSpecPhotoPreview(URL.createObjectURL(compressed))
    } catch {
      setSpecPhoto(file)
      setSpecPhotoPreview(URL.createObjectURL(file))
    }
  }

  const handleAnalyzeLabel = () => {
    // Analisa o texto manual ou texto de OCR
    const parsed = parseNutritionLabelText(manualText)
    setExtractedData(parsed)
    if (parsed.kcal_per_kg) {
      toast.success(`Energia metabolizável identificada: ${parsed.kcal_per_kg} kcal/kg!`)
    } else {
      toast.info('Revise e confirme os valores abaixo para recalcular.')
    }
  }

  const handleApplyExtractedFoodToPlan = async () => {
    if (!frontPhoto || !specPhoto) {
      toast.error('É obrigatório enviar a foto da frente e da especificação da embalagem.')
      return
    }

    const kcal = extractedData?.kcal_per_kg || foodKcalPerKg
    const name = extractedData?.name || foodName

    setUploadingFood(true)
    try {
      // 1. Persiste no banco de dados user_foods (Item 6 - LGPD sem dados pessoais)
      const fd = new FormData()
      fd.append('name', name)
      fd.append('brand', extractedData?.brand || 'Marca Informada')
      fd.append('kcal_per_kg', String(kcal))
      if (extractedData?.protein_pct) fd.append('protein_pct', String(extractedData.protein_pct))
      if (extractedData?.fat_pct) fd.append('fat_pct', String(extractedData.fat_pct))
      if (extractedData?.fiber_pct) fd.append('fiber_pct', String(extractedData.fiber_pct))
      if (extractedData?.package_weight_kg)
        fd.append('package_weight_kg', String(extractedData.package_weight_kg))
      if (extractedData?.package_price_brl)
        fd.append('package_price_brl', String(extractedData.package_price_brl))
      if (extractedData?.ingredients) fd.append('ingredients', extractedData.ingredients)
      if (manualText) fd.append('raw_extracted_text', manualText)
      fd.append('front_photo', frontPhoto)
      fd.append('spec_photo', specPhoto)
      fd.append('status', 'validado')

      await nutritionService.createUserFood(fd)

      // 2. Aplica imediatamente ao plano alimentar e recalcula gramaturas
      setFoodName(name)
      setFoodKcalPerKg(kcal)
      setPhotoModalOpen(false)
      toast.success(
        `Ração registrada no banco! Densidade ${kcal} kcal/kg aplicada ao plano com recálculo automático.`,
      )
    } catch (err) {
      console.error(err)
      toast.error('Erro ao cadastrar ração da embalagem.')
    } finally {
      setUploadingFood(false)
    }
  }

  const isDogContextLoading = dogContextLoading && dogs.length === 0

  if (loading || isDogContextLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <div className="w-9 h-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-xs text-muted-foreground">
          Carregando dados complementares de peso e plano...
        </p>
      </div>
    )
  }

  if (!dog) {
    return (
      <div className="py-16 text-center space-y-4 max-w-sm mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-foreground">Pet não encontrado</h2>
          <p className="text-xs text-muted-foreground">
            O pet selecionado não foi encontrado ou não está cadastrado.
          </p>
        </div>
        <Button onClick={() => navigate('/caes')} variant="outline" className="text-xs rounded-xl">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Voltar para Meus pets
        </Button>
      </div>
    )
  }

  // Weight Trend calculation
  const sortedWeights = [...weights].sort(
    (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime(),
  )

  const initialWeight = sortedWeights[0]?.weight_kg || dog.weight_kg
  const currentWeight = sortedWeights[sortedWeights.length - 1]?.weight_kg || dog.weight_kg
  const diffWeight = Number((currentWeight - initialWeight).toFixed(1))

  // CROSS-VERIFICATION BCS (Item 2)
  const bcsScore = latestBcs?.score || null
  const bcsDateStr = latestBcs?.evaluated_at
    ? new Date(latestBcs.evaluated_at).toLocaleDateString('pt-BR')
    : null

  // Cross analysis logic:
  // Se peso subiu e BCS alto (>=7): alerta de sobrepeso/obesidade
  // Se peso subiu e BCS baixo (<=3): ganho positivo em recuperação
  // Se peso caiu e BCS alto (>=7): perda positiva em dieta
  // Se peso caiu e BCS baixo (<=3): alerta de desnutrição/perda excessiva
  let bcsCrossStatus: {
    level: 'warning' | 'alert' | 'positive' | 'neutral'
    message: string
    recommendation: string
  } = {
    level: 'neutral',
    message: bcsScore ? `BCS histórico ${bcsScore}/9, informado anteriormente` : 'Nenhuma avaliação BCS recente',
    recommendation: 'Faça avaliações regulares para calibrar a meta física.',
  }

  if (BCS_ENABLED && bcsScore !== null) {
    if (diffWeight > 0 && bcsScore >= 7) {
      bcsCrossStatus = {
        level: 'alert',
        message: `Peso em alta (+${diffWeight}kg) com BCS ${bcsScore}/9 (Sobrepeso/Obesidade)`,
        recommendation:
          'Atenção: o ganho de peso coincide com escore corporal elevado. Procure o médico veterinário para ajuste de meta calórica e prevenção de sobrecarga articular.',
      }
    } else if (diffWeight < 0 && bcsScore <= 3) {
      bcsCrossStatus = {
        level: 'alert',
        message: `Peso em queda (${diffWeight}kg) com BCS ${bcsScore}/9 (Abaixo do Ideal)`,
        recommendation:
          'Atenção: redução de peso com escore já abaixo do ideal. Procure o médico veterinário para investigar causas e ajustar o aporte calórico.',
      }
    } else if (diffWeight < 0 && bcsScore >= 7) {
      bcsCrossStatus = {
        level: 'positive',
        message: `Emagrecimento em curso (${diffWeight}kg) corrigindo BCS ${bcsScore}/9`,
        recommendation:
          'Evolução positiva! A perda gradual de peso está aproximando o pet do escore corporal ideal (4–5/9).',
      }
    } else if (diffWeight > 0 && bcsScore <= 3) {
      bcsCrossStatus = {
        level: 'positive',
        message: `Ganho de peso registrado (+${diffWeight}kg) para recuperar BCS ${bcsScore}/9`,
        recommendation:
          'Recuperação corporal favorável. Monitore até atingir as costelas facilmente palpáveis com leve cobertura de gordura.',
      }
    } else {
      bcsCrossStatus = {
        level: 'neutral',
        message: `BCS ${bcsScore}/9 avaliado em ${bcsDateStr} • Variação de ${diffWeight > 0 ? `+${diffWeight}` : diffWeight}kg`,
        recommendation:
          bcsScore >= 4 && bcsScore <= 5
            ? 'Condição corporal ideal mantida com sucesso!'
            : 'Mantenha o acompanhamento nutricional para ajuste da porção diária.',
      }
    }
  }

  // SVG Chart calculation
  const chartPoints = sortedWeights.map((w, index) => ({
    x: index,
    y: w.weight_kg,
    date: weightDate(w.logged_at).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    }),
  }))

  const minVal = Math.min(...chartPoints.map((p) => p.y), currentWeight - 1)
  const maxVal = Math.max(...chartPoints.map((p) => p.y), currentWeight + 1)
  const range = maxVal - minVal || 1

  const svgWidth = 400
  const svgHeight = 140
  const paddingX = 30
  const paddingY = 24

  const pointsString = chartPoints
    .map((p, idx) => {
      const x =
        chartPoints.length > 1
          ? paddingX + (idx / (chartPoints.length - 1)) * (svgWidth - paddingX * 2)
          : svgWidth / 2
      const y = svgHeight - paddingY - ((p.y - minVal) / range) * (svgHeight - paddingY * 2)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="space-y-6 pb-12">
      <DietPlanSummary plan={currentPlan} />
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl hover:bg-muted"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black tracking-tight text-foreground">
                Controle de Peso & Plano • {dog.name}
              </h1>
              <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                Integrado
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Acompanhamento de pesagens e plano alimentar diário
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
          {dogs.length > 1 && (
            <select
              aria-label="Trocar pet ativo"
              value={dog.id}
              onChange={(e) => {
                setActiveDogId(e.target.value)
                navigate(`/caes/${e.target.value}/peso`)
              }}
              className="bg-card border border-border/80 text-xs rounded-xl px-3 py-2 text-foreground font-medium focus:outline-none focus:border-primary shadow-sm"
            >
              {dogs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.weight_kg}kg)
                </option>
              ))}
            </select>
          )}

          <Button
            onClick={() => setSheetOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-md h-9"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nova Pesagem
          </Button>
        </div>
      </div>

      {/* SUB-TABS: "TUDO", "PESO", "BCS", "PLANO" */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-card border border-border/80 w-fit flex-wrap">
        <button
          type="button"
          onClick={() => setActiveSubTab('tudo')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeSubTab === 'tudo'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Visão Completa
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('peso')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeSubTab === 'peso'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          Controle de Peso
        </button>
        <button
          type="button"
          disabled={!BCS_ENABLED}
          onClick={() => setActiveSubTab('bcs')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeSubTab === 'bcs'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          BCS · próxima versão
          {BCS_ENABLED && bcsScore && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-primary font-mono ml-0.5">
              {bcsScore}/9
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('plano')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeSubTab === 'plano'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          Plano Alimentar
        </button>
      </div>

      {/* TOP ROW: WEIGHT HERO & BCS CROSS-CHECK (Item 2) */}
      {(activeSubTab === 'tudo' || activeSubTab === 'peso') && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Peso Atual */}
            <div className="p-4 rounded-3xl bg-card border border-border/80">
              <span className="text-xs text-muted-foreground font-medium">Peso Atual</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-black text-foreground">{currentWeight}</span>
                <span className="text-xs font-bold text-primary">kg</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Última pesagem:{' '}
                {sortedWeights[sortedWeights.length - 1]
                  ? weightDate(sortedWeights[sortedWeights.length - 1].logged_at).toLocaleDateString(
                      'pt-BR',
                    )
                  : 'Hoje'}
              </p>
            </div>

            {/* Variação de Peso */}
            <div className="p-4 rounded-3xl bg-card border border-border/80">
              <span className="text-xs text-muted-foreground font-medium">Variação de Peso</span>
              <div className="flex items-center gap-1.5 mt-1">
                {diffWeight > 0 ? (
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                ) : diffWeight < 0 ? (
                  <TrendingDown className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Minus className="w-5 h-5 text-muted-foreground" />
                )}
                <span
                  className={`text-2xl font-black ${
                    diffWeight > 0
                      ? 'text-amber-400'
                      : diffWeight < 0
                        ? 'text-emerald-400'
                        : 'text-foreground'
                  }`}
                >
                  {diffWeight > 0 ? `+${diffWeight}` : diffWeight}
                </span>
                <span className="text-xs font-bold text-muted-foreground">kg</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Desde o primeiro registro ({initialWeight}kg)
              </p>
            </div>

            {/* BCS Mais Recente do Pet (Item 2) */}
            <div className="p-4 rounded-3xl bg-card border border-border/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">
                    BCS histórico · módulo inativo
                  </span>
                  <Activity className="w-4 h-4 text-primary" />
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-3xl font-black text-primary">
                    {bcsScore ? `${bcsScore}` : '--'}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">/ 9</span>
                  {BCS_ENABLED && bcsScore && (
                    <Badge
                      className={`ml-2 text-[10px] ${
                        bcsScore >= 7
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : bcsScore <= 3
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {bcsScore >= 7 ? 'Acima' : bcsScore <= 3 ? 'Abaixo' : 'Ideal'}
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {bcsDateStr ? `Avaliado em ${bcsDateStr}` : 'Nenhuma avaliação realizada'}
                </p>
              </div>

              <button disabled={!BCS_ENABLED}
                type="button"
                onClick={() => {
                  const bcsSection = document.getElementById('secao-guia-bcs')
                  if (bcsSection) {
                    bcsSection.scrollIntoView({ behavior: 'smooth' })
                  } else {
                    setActiveSubTab('bcs')
                  }
                }}
                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 mt-2 self-start cursor-pointer"
              >
                <span>BCS disponível em versão futura</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* SINALIZAÇÃO DE VERIFICAÇÃO CRUZADA (Item 2) */}
          {BCS_ENABLED && (          <div
            className={`p-4 rounded-3xl border flex items-start gap-3 transition-colors ${
              bcsCrossStatus.level === 'alert'
                ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                : bcsCrossStatus.level === 'warning'
                  ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                  : bcsCrossStatus.level === 'positive'
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                    : 'bg-card border-border/80 text-muted-foreground'
            }`}
          >
            <AlertTriangle
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                bcsCrossStatus.level === 'alert'
                  ? 'text-rose-400'
                  : bcsCrossStatus.level === 'warning'
                    ? 'text-amber-400'
                    : bcsCrossStatus.level === 'positive'
                      ? 'text-emerald-400'
                      : 'text-primary'
              }`}
            />
            <div className="space-y-1 text-xs min-w-0 flex-1">
              <p className="font-extrabold text-foreground">{bcsCrossStatus.message}</p>
              <p className="text-[11px] leading-relaxed opacity-90">
                {bcsCrossStatus.recommendation}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const bcsSection = document.getElementById('secao-guia-bcs')
                if (bcsSection) {
                  bcsSection.scrollIntoView({ behavior: 'smooth' })
                } else {
                  setActiveSubTab('bcs')
                }
              }}
              className="text-[11px] rounded-xl shrink-0 h-8 font-bold border-current cursor-pointer"
            >
              Avaliar no BCS
            </Button>
          </div>)}

          {/* SVG EVOLUTION CHART */}
          <div className="p-5 rounded-3xl bg-card border border-border/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Gráfico de Evolução (kg)
                </h2>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                {chartPoints.length} registros
              </span>
            </div>

            {chartPoints.length <= 1 ? (
              <div className="h-32 flex flex-col items-center justify-center p-4 rounded-2xl bg-background/50 border border-border/50 text-center">
                <Scale className="w-6 h-6 text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">
                  Adicione pelo menos 2 registros para visualizar a curva de evolução ao longo do
                  tempo.
                </p>
              </div>
            ) : (
              <div className="w-full overflow-hidden rounded-2xl bg-background/50 border border-border/50 p-2">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-36 overflow-visible"
                >
                  <defs>
                    <linearGradient id="weightLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>

                  <line
                    x1={paddingX}
                    y1={svgHeight / 2}
                    x2={svgWidth - paddingX}
                    y2={svgHeight / 2}
                    stroke="currentColor"
                    strokeOpacity="0.08"
                    strokeDasharray="4"
                  />

                  <polyline
                    fill="none"
                    stroke="url(#weightLineGrad)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={pointsString}
                  />

                  {chartPoints.map((p, idx) => {
                    const x =
                      chartPoints.length > 1
                        ? paddingX + (idx / (chartPoints.length - 1)) * (svgWidth - paddingX * 2)
                        : svgWidth / 2
                    const y =
                      svgHeight - paddingY - ((p.y - minVal) / range) * (svgHeight - paddingY * 2)

                    return (
                      <g key={idx}>
                        <circle
                          cx={x}
                          cy={y}
                          r="5"
                          className="fill-emerald-400 stroke-card stroke-2"
                        />
                        <text
                          x={x}
                          y={y - 10}
                          textAnchor="middle"
                          className="fill-white text-[10px] font-extrabold"
                        >
                          {p.y}kg
                        </text>
                        <text
                          x={x}
                          y={svgHeight - 6}
                          textAnchor="middle"
                          className="fill-muted-foreground text-[9px]"
                        >
                          {p.date}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            )}
          </div>
        </div>
      )}

      {BCS_ENABLED && (activeSubTab === 'tudo' || activeSubTab === 'bcs') && (
        <section id="secao-guia-bcs" className="scroll-mt-6">
          {activeSubTab === 'bcs' ? (
            <BcsInteractivePage embedded />
          ) : (
            <div className="rounded-3xl border border-border/80 bg-card p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">BCS e condição muscular · Fase 14</h2>
                <p className="text-sm text-muted-foreground">{dog.species === 'felina' ? 'Registro de avaliação felina' : 'Avaliação 3D com protocolo guiado'} para {dog.name}.</p>
              </div>
              <Button onClick={() => setActiveSubTab('bcs')}>Abrir avaliação</Button>
            </div>
          )}
        </section>
      )}

      {/* PLANO ALIMENTAR INTEGRADO (Item 4: todo conteúdo atual de plano movido aqui) */}
      {(activeSubTab === 'tudo' || activeSubTab === 'plano') && (
        <div className="space-y-4">
          {/* Highlight Meta Diária */}
          <div className="p-5 sm:p-6 rounded-3xl bg-card border-2 border-primary/50 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Meta Diária Calculada (NRC & WSAVA)
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                {dog.weight_kg}kg • {dog.sterilized ? 'Castrado' : 'Inteiro'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 py-2 border-y border-border/50">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Calorias / Dia</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-3xl sm:text-4xl font-black text-foreground">
                    {calculation.dailyKcal}
                  </span>
                  <span className="text-sm font-bold text-primary">kcal</span>
                </div>
              </div>

              <div className="border-l border-border/50 pl-4">
                <p className="text-xs text-muted-foreground font-semibold">Porção do alimento</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-3xl sm:text-4xl font-black text-primary">
                    {formatPortion(calculation.dailyGrams)}
                  </span>
                  <span className="text-sm font-bold text-foreground">g/dia</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed pt-1">
              Destaque:{' '}
              <strong className="text-foreground">
                {calculation.dailyKcal} kcal/dia ≈ {formatPortion(calculation.dailyGrams)} g/dia
              </strong>{' '}
              distribuídos em <strong>{mealsCount} refeições</strong>.
            </p>
          </div>

          {/* 1. Objetivo Nutricional */}
          <div className="p-5 rounded-3xl bg-card border border-border space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
              1. Objetivo Nutricional
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'manter', label: 'Manter Peso', desc: 'Fator padrão de manutenção' },
                { id: 'emagrecer', label: 'Emagrecer', desc: 'Déficit calórico controlado' },
                { id: 'ganhar', label: 'Ganhar Peso', desc: 'Superávit calórico planejado' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={dog.species === 'felina' && item.id !== 'manter'}
                  onClick={() => handleGoalChange(item.id as FeedingGoal)}
                  className={`p-3 rounded-2xl border text-left transition ${
                    goal === item.id
                      ? 'bg-primary/20 border-primary text-foreground shadow-sm'
                      : 'bg-card border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{item.label}</span>
                    {goal === item.id && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                    {item.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Nível de Atividade */}
          <div className="p-5 rounded-3xl bg-card border border-border space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
              2. Nível de Atividade Física
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'baixa', label: 'Baixa / Sedentário', adj: '-10% kcal' },
                { id: 'moderada', label: 'Moderada', adj: '+10% kcal' },
                { id: 'alta', label: 'Alta / Muito Ativo', adj: '+20% kcal' },
              ].map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => setActivity(act.id as ActivityLevel)}
                  className={`p-3 rounded-2xl border text-left transition ${
                    activity === act.id
                      ? 'bg-primary/15 border-primary text-foreground font-semibold'
                      : 'bg-card border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  <p className="text-xs font-bold text-foreground">{act.label}</p>
                  <p className="text-[10px] text-primary mt-0.5">{act.adj}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Ração e Densidade Calórica COM BOTÃO DE UPLOAD DE FOTOS (Item 5) */}
          <div className="p-5 rounded-3xl bg-card border border-border space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  3. Ração e Densidade Calórica
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Informe os dados ou envie fotos da embalagem para recálculo automático
                </p>
              </div>

              {/* BOTÃO EXCLUSIVO DE UPLOAD DE FOTOS (Item 5) */}
              <Button
                type="button"
                onClick={() => setPhotoModalOpen(true)}
                className="bg-primary/15 hover:bg-primary/25 text-primary border border-primary/40 font-bold text-xs rounded-xl h-9 shadow-sm"
              >
                <Camera className="w-3.5 h-3.5 mr-1.5" />
                Upload Fotos da Embalagem
              </Button>
            </div>

            {/* Catalog Selector */}
            {foods.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Ou selecione do catálogo de rações:
                  </Label>
                  <button
                    type="button"
                    onClick={() => navigate('/comparador')}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <Scale className="w-3 h-3" />
                    Comparar rações
                  </button>
                </div>
                <Select value={selectedFoodId} onValueChange={handleFoodSelect}>
                  <SelectTrigger className="bg-card border-border text-xs h-11 rounded-xl text-foreground">
                    <SelectValue placeholder="Escolher ração do catálogo..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 bg-card border-border">
                    {foods.map((f) => (
                      <SelectItem key={f.id} value={f.id} className="text-xs text-foreground">
                        {f.brand} - {f.name} ({f.kcal_per_kg} kcal/kg)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="food-name" className="text-xs font-semibold text-foreground">
                  Nome ou Marca da Ração
                </Label>
                <Input
                  id="food-name"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  className="bg-card border-border text-xs h-11 rounded-xl text-foreground"
                  placeholder="Ex: Premier Pet Adulto"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="kcal-kg" className="text-xs font-semibold text-foreground">
                  Energia Metabolizável (kcal / kg)
                </Label>
                <div className="relative">
                  <Input
                    id="kcal-kg"
                    type="number"
                    min="1000"
                    max="6000"
                    step="10"
                    value={foodKcalPerKg}
                    onChange={(e) => setFoodKcalPerKg(Number(e.target.value) || 3500)}
                    className="bg-card border-border text-xs h-11 rounded-xl pr-16 font-bold text-foreground"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    kcal/kg
                  </span>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-card border border-border flex items-start gap-2 text-[11px] text-muted-foreground">
              <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <span>
                Média de rações comerciais brasileiras:{' '}
                <strong className="text-foreground">3.500 kcal/kg</strong>. O upload da foto do
                rótulo permite conferir o valor exato garantido pelo fabricante.
              </span>
            </div>
          </div>

          {/* 4. Divisão das Refeições */}
          <div className="p-5 rounded-3xl bg-card border border-border space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                4. Fracionamento das Refeições
              </Label>
              <span className="text-xs font-bold text-primary">
                {formatPortion(calculation.dailyGrams)} g total
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[2, 3, 4].map((count) => (
                <Button
                  key={count}
                  type="button"
                  variant={mealsCount === count ? 'default' : 'outline'}
                  onClick={() => setMealsCount(count)}
                  className={`h-10 text-xs rounded-xl font-bold ${
                    mealsCount === count
                      ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {count} refeições / dia
                </Button>
              ))}
            </div>

            <div className="space-y-2.5 pt-1">
              {customMeals.map((meal, idx) => {
                const mealKcal = Math.round((meal.grams * foodKcalPerKg) / 1000)
                return (
                  <div
                    key={meal.id || idx}
                    className="p-3.5 rounded-2xl bg-black/25 border border-white/5 hover:border-primary/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <input
                        type="text"
                        value={meal.label}
                        onChange={(e) => handleMealLabelChange(idx, e.target.value)}
                        className="bg-transparent border-0 h-6 p-0 text-xs font-bold text-foreground focus:outline-none focus:text-primary transition-colors w-full"
                        placeholder="Nome da refeição"
                      />
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-primary" />
                          <input
                            type="time"
                            value={meal.time || ''}
                            onChange={(e) => handleMealTimeChange(idx, e.target.value)}
                            className="bg-transparent border-0 text-muted-foreground text-[11px] p-0 focus:outline-none cursor-pointer"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Flame className="w-3 h-3 text-amber-500" />
                          <span className="font-semibold text-foreground/80">{mealKcal} kcal</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <div className="flex items-center gap-1 bg-black/40 border border-white/10 px-2 py-1 rounded-xl">
                        <input
                          type="number"
                          value={Number(meal.grams.toFixed(1))}
                          onChange={(e) => handleMealGramsChange(idx, Number(e.target.value))}
                          className="w-14 text-right text-xs font-black bg-transparent border-0 text-foreground focus:outline-none"
                        />
                        <span className="text-xs font-bold text-muted-foreground">g</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

      {dog?.species === 'felina' && <p className="rounded-xl border border-border bg-card p-4 text-sm text-foreground">Estimativa felina de manutenção ou crescimento, conforme a idade cadastrada. Informe a energia da ração própria para gatos. Ganho e perda de peso exigem revisão veterinária. <a href="https://www.msdvetmanual.com/multimedia/table/daily-maintenance-energy-requirements-for-dogs-and-cats" target="_blank" rel="noreferrer" className="underline">Referência MSD</a>.</p>}
      {import.meta.env.VITE_PILOT_MODE === 'true' && dog && <DailyMealChecklist key={dog.id} dogId={dog.id} meals={customMeals} />}

          {/* Salvar Plano */}
          <div className="pt-2">
            <Button
              type="button"
              disabled={savingPlan}
              onClick={handleSavePlan}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20"
            >
              <Save className="w-4 h-4 mr-2" />
              {savingPlan ? 'Gravando...' : 'Salvar Plano Nutricional'}
            </Button>
          </div>
        </div>
      )}

      {/* HISTÓRICO DE PESAGENS */}
      {(activeSubTab === 'tudo' || activeSubTab === 'peso') && (
        <div className="p-5 rounded-3xl bg-card border border-border/80 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Histórico de Pesagens ({weights.length})
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSheetOpen(true)}
              className="text-xs rounded-xl h-8 font-semibold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Adicionar
            </Button>
          </div>

          <div className="space-y-2">
            {[...sortedWeights].reverse().map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-background/60 border border-border/60 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">
                      {weightDate(item.logged_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {idx === 0 ? 'Pesagem mais recente' : 'Histórico'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-base font-black text-emerald-400">{item.weight_kg} kg</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteWeight(item.id)}
                    className="w-8 h-8 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL UPLOAD FOTOS DA EMBALAGEM COM RECÁLCULO AUTOMÁTICO (Item 5 & 6) */}
      <Dialog open={photoModalOpen} onOpenChange={setPhotoModalOpen}>
        <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-foreground flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              Upload de Fotos da Embalagem & Recálculo
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Envie a foto da frente da embalagem e a foto da especificação/rótulo nutricional. Os
              dados serão validados e o plano será recalculado automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Foto 1: Frente da Embalagem */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>1. Frente da Embalagem *</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  Identifica marca/nome
                </span>
              </Label>
              <div
                onClick={() => frontInputRef.current?.click()}
                className="p-3 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 transition cursor-pointer text-center bg-background/50 flex flex-col items-center justify-center min-h-[90px]"
              >
                {frontPhotoPreview ? (
                  <div className="relative">
                    <img
                      src={frontPhotoPreview}
                      alt="Frente"
                      className="max-h-32 rounded-xl object-contain"
                    />
                    <span className="text-[10px] text-primary font-bold mt-1 block">
                      Trocar foto
                    </span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                    <span className="text-xs font-semibold text-foreground">
                      Selecionar foto da frente
                    </span>
                    <span className="text-[10px] text-muted-foreground">PNG, JPG até 10MB</span>
                  </>
                )}
                <input
                  ref={frontInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFrontPhotoSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Foto 2: Especificação / Tabela Nutricional */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>2. Foto da Especificação / Rótulo *</span>
                <span className="text-[10px] text-primary font-normal">
                  Kcal/kg e níveis de garantia
                </span>
              </Label>
              <div
                onClick={() => specInputRef.current?.click()}
                className="p-3 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 transition cursor-pointer text-center bg-background/50 flex flex-col items-center justify-center min-h-[90px]"
              >
                {specPhotoPreview ? (
                  <div className="relative">
                    <img
                      src={specPhotoPreview}
                      alt="Especificação"
                      className="max-h-32 rounded-xl object-contain"
                    />
                    <span className="text-[10px] text-primary font-bold mt-1 block">
                      Trocar foto
                    </span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                    <span className="text-xs font-semibold text-foreground">
                      Selecionar foto da especificação
                    </span>
                    <span className="text-[10px] text-muted-foreground">PNG, JPG até 10MB</span>
                  </>
                )}
                <input
                  ref={specInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSpecPhotoSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Texto ou Valores Manuais Extraídos (sem inventar nada - Item 7) */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-background/60 border border-border/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Texto da Embalagem / Digitação do Rótulo
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleAnalyzeLabel}
                  className="text-[11px] h-7 px-2 font-bold text-primary"
                >
                  Extrair / Analisar
                </Button>
              </div>

              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Exemplo do texto do rótulo:&#10;Energia metabolizável: 3800 kcal/kg. Proteína bruta (mín): 26%. Extrato etéreo: 14%. Matéria fibrosa: 3.5%. Peso: 15kg."
                className="w-full h-20 bg-background border border-border/70 rounded-xl p-2 text-xs focus:outline-none focus:border-primary resize-none text-foreground"
              />

              {/* Campos editáveis confirmados pelo usuário (sem números inventados) */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    Energia (kcal/kg) *
                  </label>
                  <Input
                    type="number"
                    value={extractedData?.kcal_per_kg || foodKcalPerKg}
                    onChange={(e) =>
                      setExtractedData((prev) => ({
                        ...prev,
                        kcal_per_kg: Number(e.target.value) || 0,
                      }))
                    }
                    className="h-8 text-xs font-bold bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    Proteína Bruta (%)
                  </label>
                  <Input
                    type="number"
                    placeholder="Informar valor"
                    value={extractedData?.protein_pct ?? ''}
                    onChange={(e) =>
                      setExtractedData((prev) => ({
                        ...prev,
                        protein_pct: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    className="h-8 text-xs bg-background text-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPhotoModalOpen(false)}
                className="text-xs rounded-xl h-9"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={uploadingFood || !frontPhoto || !specPhoto}
                onClick={handleApplyExtractedFoodToPlan}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl h-9 px-5 shadow-sm"
              >
                {uploadingFood ? 'Gravando e recalculando...' : 'Confirmar & Recalcular'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* WEIGHT SHEET FOR LOGGING WEIGHT */}
      <WeightSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        dog={dog}
        onSaved={async () => {
          await loadData()
          await refreshDogs()
        }}
      />
    </div>
  )
}
