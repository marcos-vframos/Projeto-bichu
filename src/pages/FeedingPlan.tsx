import { formatPortion } from '@/lib/format-portion'
import DietPlanSummary from '@/components/DietPlanSummary'
import DailyMealChecklist from '@/components/DailyMealChecklist'
import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calculator,
  Save,
  Sparkles,
  Info,
  Clock,
  Check,
  ChevronDown,
  Activity,
  Scale,
  Flame,
} from 'lucide-react'
import { useDog } from '@/contexts/DogContext'
import { nutritionService } from '@/services/nutrition'
import { calculateNutrition, getDefaultMeals } from '@/lib/nutrition-calculator'
import type { DogRecord, FeedingGoal, ActivityLevel, FoodRecord, MealItem, FeedingPlanRecord } from '@/types/nutrition'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

export default function FeedingPlanPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { refreshActivePlan, refreshDogs } = useDog()

  const [savedPlan, setSavedPlan] = useState<FeedingPlanRecord | null>(null)
  const [dog, setDog] = useState<DogRecord | null>(null)
  const [foods, setFoods] = useState<FoodRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Plan parameters
  const [goal, setGoal] = useState<FeedingGoal>('manter')
  const [activity, setActivity] = useState<ActivityLevel>('moderada')
  const [foodKcalPerKg, setFoodKcalPerKg] = useState<number>(3500)
  const [foodName, setFoodName] = useState<string>('Ração Padrão')
  const [selectedFoodId, setSelectedFoodId] = useState<string>('')
  const [mealsCount, setMealsCount] = useState<number>(2)
  const [customMeals, setCustomMeals] = useState<MealItem[]>([])

  // Load dog, catalog and active plan
  useEffect(() => {
    if (!id) return
    let active = true

    async function load() {
      setLoading(true)
      setDog(null)
      try {
        const [dogData, foodsData, currentPlan] = await Promise.all([
          nutritionService.getDogById(id!),
          nutritionService.getFoodsCatalog(),
          nutritionService.getActivePlan(id!),
        ])

        if (!active) return

        if (!dogData) {
          toast.error('Pet não encontrado')
          navigate('/caes')
          return
        }

        setSavedPlan(currentPlan)
        setDog(dogData)
        setFoods(dogData.species === 'felina' ? [] : foodsData)
        setActivity(dogData.activity_level || 'moderada')

        if (currentPlan) {
          setGoal(dogData.species === 'felina' ? 'manter' : currentPlan.goal || 'manter')
          setFoodKcalPerKg(currentPlan.kcal_per_kg || 3500)
          setFoodName(currentPlan.food_name || 'Ração Padrão')
          setMealsCount(currentPlan.meals_per_day || 2)
          if (currentPlan.meals_json && currentPlan.meals_json.length > 0) {
            setCustomMeals(currentPlan.meals_json)
          }
          if (currentPlan.food) {
            setSelectedFoodId(currentPlan.food)
          } else {
            setSelectedFoodId('')
          }
        } else {
          // Initialize default meals
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
      } catch (err) {
        console.error(err)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [id, navigate])

  // Real-time calculation using NRC / WSAVA
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
        foodEnergyValid: false,
        mealsPerDay: 2,
      }
    }

    return calculateNutrition({
      species: dog.species,
      birthDate: dog.birth_date,
      weightKg: dog.weight_kg,
      sterilized: dog.sterilized,
      activityLevel: activity,
      goal,
      foodKcalPerKg,
      mealsPerDay: mealsCount,
    })
  }, [dog, activity, goal, foodKcalPerKg, mealsCount])

  // Sync meals array when mealsCount or dailyGrams change
  useEffect(() => {
    if (!calculation.dailyGrams) return
    setCustomMeals((prev) => {
      if (prev.length === mealsCount) {
        // Just redistribute grams proportionally
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
    if (!calculation.foodEnergyValid) { toast.error('Informe a energia do alimento em kcal/kg antes de salvar.'); return }
    if (!dog) return
    if (savedPlan?.diet_mode && savedPlan.diet_mode !== 'commercial') { toast.info('Edite o plano prescrito na área de alimentação natural do comparador.'); return }
    setSaving(true)

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

      // Update dog's activity level if altered here
      if (dog.activity_level !== activity) {
        await nutritionService.updateDog(dog.id, { activity_level: activity }, dog.revision)
      }

      await refreshActivePlan()
      await refreshDogs()
      toast.success('Plano salvo com sucesso!')
      navigate(`/caes/${dog.id}`)
    } catch (e) {
      console.error(e)
      toast.error('Erro ao salvar o plano de nutrição.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <div className="w-9 h-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-xs text-muted-foreground">Carregando parâmetros nutricionais...</p>
      </div>
    )
  }

  if (!dog) return null

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar */}
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
          <h1 className="text-xl font-black tracking-tight text-foreground">
            Plano de Alimentação • {dog.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            Cálculo metabólico individualizado (NRC & WSAVA)
          </p>
        </div>
      </div>

      {/* QUICK ACCESS CHIPS TO BCS & FOOD COMPARISON */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => navigate(`/bcs/${dog.id}`)}
          className="p-3 rounded-2xl bg-card border border-border hover:border-primary/50 transition flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-primary transition">
                Guia Visual BCS (1 a 9)
              </p>
              <p className="text-[11px] text-muted-foreground">
                Avaliar e ajustar porção automaticamente
              </p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90 group-hover:text-primary transition" />
        </button>

        <button
          type="button"
          onClick={() => navigate('/comparador')}
          className="p-3 rounded-2xl bg-card border border-border hover:border-primary/50 transition flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-primary transition">
                Comparador de Rações
              </p>
              <p className="text-[11px] text-muted-foreground">
                Custo/dia e ingredientes de marcas BR
              </p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90 group-hover:text-primary transition" />
        </button>
      </div>

      {/* HIGHLIGHT HERO RESULT */}
      <div className="p-5 sm:p-6 rounded-3xl bg-card border-2 border-primary/50 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Meta Diária Calculada
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

      {/* 1. OBJETIVO NUTRICIONAL */}
      <div className="p-5 rounded-3xl bg-card border border-border space-y-3">
        <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
          1. Objetivo Nutricional
        </Label>
        <p className="text-xs text-muted-foreground">
          O fator multiplicador é calibrado de acordo com a meta física do pet.
        </p>

        <div className="grid grid-cols-3 gap-2">
          {[
            {
              id: 'manter',
              label: 'Manter Peso',
              desc: 'Fator padrão de manutenção',
            },
            {
              id: 'emagrecer',
              label: 'Emagrecer',
              desc: 'Fator 1.0 (déficit controlado)',
            },
            {
              id: 'ganhar',
              label: 'Ganhar Peso',
              desc: 'Fator 2.0 (superávit calórico)',
            },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={dog.species === 'felina' && item.id !== 'manter'}
              onClick={() => setGoal(item.id as FeedingGoal)}
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
              <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 2. ATIVIDADE DO CÃO */}
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
      {/* 3. TRANSPARÊNCIA DO CÁLCULO CIENTÍFICO (NRC) */}
      <div className="p-4 rounded-2xl bg-card/60 border border-border/70 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
          <Calculator className="w-4 h-4" />
          <span>Fórmula de Cálculo Transparente</span>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border text-xs space-y-1.5 font-mono">
          <div className="flex justify-between text-muted-foreground">
            <span>RER = 70 × ({dog.weight_kg}^0.75):</span>
            <span className="text-foreground font-bold">{calculation.rer} kcal</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Fator Base (objetivo + castração):</span>
            <span className="text-foreground font-bold">{calculation.baseFactor}x</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Ajuste de Atividade ({activity}):</span>
            <span className="text-primary font-bold">
              {calculation.activityAdjustmentPercent > 0 ? '+' : ''}
              {calculation.activityAdjustmentPercent}%
            </span>
          </div>
          <div className="pt-1.5 border-t border-border flex justify-between text-foreground font-bold">
            <span>Kcal Final / dia:</span>
            <span className="text-primary">{calculation.dailyKcal} kcal</span>
          </div>
        </div>
      </div>

      {/* 4. SELEÇÃO DA RAÇÃO / DENSIDADE CALÓRICA */}
      <div className="p-5 rounded-3xl bg-card border border-border space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
            3. Ração e Densidade Calórica
          </Label>
          <span className="text-[11px] text-muted-foreground">Embalagem do produto</span>
        </div>

        {/* Catalog Selector */}
        {foods.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                Selecionar do Catálogo de Rações Populares:
              </Label>
              <button
                type="button"
                onClick={() => navigate('/comparador')}
                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
              >
                <Scale className="w-3 h-3" />
                Comparar marcas lado a lado
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
                min="1"
                max="10000"
                step="1"
                value={foodKcalPerKg}
                aria-invalid={!calculation.foodEnergyValid}
                aria-describedby="food-energy-help"
                onChange={(e) => setFoodKcalPerKg(Number(e.target.value))}
                className="bg-card border-border text-xs h-11 rounded-xl pr-16 font-bold text-foreground"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                kcal/kg
              </span>
            </div>
              <p id="food-energy-help" role={!calculation.foodEnergyValid ? 'alert' : undefined} className="text-xs text-muted-foreground">{calculation.foodEnergyValid ? 'Informe a energia do alimento em kcal/kg, inclusive quando inferior a 1.000. Valores em kcal/100 g precisam ser multiplicados por 10.' : 'Informe uma energia positiva e válida. O plano não será salvo com este valor.'}</p>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-card border border-border flex items-start gap-2 text-[11px] text-muted-foreground">
          <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <span>
            Não sabe a energia metabolizável? O valor médio das rações comerciais brasileiras é{' '}
            <strong className="text-foreground">3.500 kcal/kg</strong> (usado como padrão).
          </span>
        </div>
      </div>

      {/* 5. DIVISÃO DAS REFEIÇÕES */}
      <div className="p-5 rounded-3xl bg-card border border-border space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
            4. Fracionamento das Refeições
          </Label>
          <span className="text-xs font-bold text-primary">{formatPortion(calculation.dailyGrams)} g total</span>
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

        {/* Meal cards editor refinado com kcal por porção e rótulos fluídos */}
        <div className="space-y-2.5 pt-1">
          {customMeals.map((meal, idx) => {
            const mealKcal = Math.round((meal.grams * foodKcalPerKg) / 1000)
            return (
              <div
                key={meal.id || idx}
                className="p-3.5 rounded-2xl bg-black/25 border border-white/5 hover:border-primary/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
      <DietPlanSummary plan={savedPlan} />
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

      {/* SAVE BUTTON */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate(-1)}
          className="flex-1 rounded-xl h-12 text-xs"
        >
          Voltar
        </Button>

        <Button
          type="button"
          disabled={saving}
          onClick={handleSavePlan}
          className="flex-[2] h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Gravando...' : 'Salvar Plano Nutricional'}
        </Button>
      </div>
    </div>
  )
}
