import DietPlanSummary from '@/components/DietPlanSummary'
import {dirtyPresenceEnabled} from '@/lib/dirty-presence'
import { formatPortion } from '@/lib/format-portion'
import NaturalDiet from '@/components/NaturalDiet'
import FoodQuality from '@/components/FoodQuality'
import { preferenceStorage } from '@/lib/preferences'
import ManualFoodDialog from '@/components/ManualFoodDialog'
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Trash2,
  TrendingDown,
  Check,
  Search,
  DollarSign,
  Soup,
  X,
  AlertCircle,
  Info,
  Camera,
  Upload,
  Edit2,
} from 'lucide-react'
import { useDog } from '@/contexts/DogContext'
import { nutritionService } from '@/services/nutrition'
import { DogAvatar } from '@/components/DogAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { compressImageFile } from '@/lib/image-compress'
import { parseNutritionLabelText, type ExtractedFoodData } from '@/lib/label-parser'
import type { FoodRecord, FeedingPlanRecord, FoodTier, UserFoodRecord } from '@/types/nutrition'

const DEFAULT_COMPARED_BRANDS = [
  'Premier Formula Adulto',
  'Golden Formula Adulto',
  'Royal Canin Maxi Adult',
]

interface EditableFoodValues {
  kcal_per_kg?: number
  package_weight_kg?: number
  package_price_brl?: number
  protein_pct?: number
  fat_pct?: number
}

export default function FoodComparisonPage() {
  const navigate = useNavigate()
  const { activeDog, activePlan, dogs, setActiveDogId, refreshActivePlan } = useDog()
  const [comparisonOpen,setComparisonOpen]=useState(false)
  const labPresence=dirtyPresenceEnabled()

  const [species, setSpecies] = useState(activeDog?.species === 'felina' ? 'felina' : 'canina')
  const [category, setCategory] = useState('seca')
  const [natural, setNatural] = useState(false)
  const [allFoods, setAllFoods] = useState<FoodRecord[]>([])
  const [userFoods, setUserFoods] = useState<UserFoodRecord[]>([])
  const [selectedFoodIds, setSelectedFoodIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [applyingFood, setApplyingFood] = useState<string | null>(null)
  const [manualFoodOpen, setManualFoodOpen] = useState(false)
  const [catalogModalOpen, setCatalogModalOpen] = useState(false)

  // Filters for catalog modal
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTier, setSelectedTier] = useState<string>('all')
  const [selectedLifeStage, setSelectedLifeStage] = useState<string>('all')

  // Item 7: Valores destacados editáveis manualmente por id da ração
  // para que não hajam invenções e cálculos errôneos
  const [manualOverrides, setManualOverrides] = useState<Record<string, EditableFoodValues>>(() => JSON.parse(preferenceStorage.getItem('bichu_food_overrides') || '{}'))
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null)
  const [editKcal, setEditKcal] = useState<string>('')
  const [editPrice, setEditPrice] = useState<string>('')
  const [editWeight, setEditWeight] = useState<string>('')
  const [editProtein, setEditProtein] = useState<string>('')

  // Item 5 & 6: Upload fotos de embalagem (frente + rótulo) e banco de dados user_foods
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [frontFile, setFrontFile] = useState<File | null>(null)
  const [frontPreview, setFrontPreview] = useState<string | null>(null)
  const [specFile, setSpecFile] = useState<File | null>(null)
  const [specPreview, setSpecPreview] = useState<string | null>(null)
  const [ocrText, setOcrText] = useState('')
  const [extractedFields, setExtractedFields] = useState<ExtractedFoodData | null>(null)

  const frontInputRef = useRef<HTMLInputElement | null>(null)
  const specInputRef = useRef<HTMLInputElement | null>(null)

  // Load foods catalog & user foods
  const loadFoods = async () => {
    setLoading(true)
    try {
      const [catalog, uFoods] = await Promise.all([
        nutritionService.getFoodsCatalog(),
        nutritionService.getUserFoods(),
      ])

      // Converte user_foods em FoodRecord para enriquecer o catálogo do comparador
      const mappedUserFoods: FoodRecord[] = uFoods.map((u) => ({
        id: `user_${u.id}`,
        name: u.name,
        brand: u.brand,
        kcal_per_kg: u.kcal_per_kg,
        protein_pct: u.protein_pct,
        fat_pct: u.fat_pct,
        fiber_pct: u.fiber_pct,
        moisture_pct: u.moisture_pct,
        life_stage: (u.life_stage as any) || 'adulto',
        tier: u.tier || 'premium',
        package_weight_kg: u.package_weight_kg,
        package_price_brl: u.package_price_brl,
        species: u.species || 'canina', category: u.category || 'seca', benefits: u.benefits, ingredient_origin: u.ingredient_origin, quality_control: u.quality_control, source_url: u.source_url, nutritional_adequacy: u.nutritional_adequacy, health_indication: u.health_indication,
        ingredients: u.ingredients || 'Dados informados pelo tutor.',
      }))

      const combined = [...catalog, ...mappedUserFoods]
      setAllFoods(combined)
      setUserFoods(uFoods)

      // Initial selection: 3 foods
      if (selectedFoodIds.length === 0) {
        const initialSelected = combined
          .filter((f) =>
            DEFAULT_COMPARED_BRANDS.some((b) => f.name.includes(b) || f.brand.includes(b)),
          )
          .slice(0, 3)
          .map((f) => f.id)

        if (initialSelected.length >= 2) {
          setSelectedFoodIds(initialSelected)
        } else {
          setSelectedFoodIds(combined.slice(0, 3).map((f) => f.id))
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFoods()
  }, [])

  // Daily kcal target of active dog
  const dailyKcalTarget = activePlan?.daily_kcal || 0

  useEffect(() => { preferenceStorage.setItem('bichu_food_overrides', JSON.stringify(manualOverrides)) }, [manualOverrides])
  useEffect(() => { setSelectedFoodIds(allFoods.filter(f => (f.species || 'canina') === species && (f.category || 'seca') === category).slice(0,3).map(f=>f.id)) }, [species, category, allFoods.length])
  // Filter catalog modal
  const filteredCatalog = useMemo(() => {
    return allFoods.filter((f) => {
      const matchesSearch =
        !searchQuery.trim() ||
        f.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.ingredients && f.ingredients.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesTier = selectedTier === 'all' || f.tier === selectedTier
      const matchesLifeStage = selectedLifeStage === 'all' || f.life_stage === selectedLifeStage

      return matchesSearch && matchesTier && matchesLifeStage && (f.species || 'canina') === species && (f.category || 'seca') === category
    })
  }, [allFoods, searchQuery, selectedTier, selectedLifeStage, species, category])

  // Toggle selection
  const handleToggleSelect = (foodId: string) => {
    if (selectedFoodIds.includes(foodId)) {
      if (selectedFoodIds.length <= 1) {
        toast.error('Mantenha pelo menos 1 ração selecionada.')
        return
      }
      setSelectedFoodIds((prev) => prev.filter((id) => id !== foodId))
    } else {
      if (selectedFoodIds.length >= 4) {
        toast.error('Você pode comparar no máximo 4 marcas simultaneamente.')
        return
      }
      setSelectedFoodIds((prev) => [...prev, foodId])
    }
  }

  // Item 7: Exclusão com confirmação (remove do comparador ou do banco se for user food)
  const handleDeleteFood = async (foodId: string) => {
    if (
      !confirm(
        'Deseja remover esta ração do comparador? Se foi adicionada manualmente ou detectada com informações inventadas, ela será excluída.',
      )
    ) {
      return
    }

    if (foodId.startsWith('user_')) {
      const realId = foodId.replace('user_', '')
      try {
        await nutritionService.deleteUserFood(realId)
        toast.success('Ração removida do banco de dados com sucesso.')
      } catch {
        toast.error('Erro ao excluir do banco.')
      }
    }

    setSelectedFoodIds((prev) => prev.filter((id) => id !== foodId))
    setAllFoods((prev) => prev.filter((f) => f.id !== foodId))
    toast.success('Item removido do comparador.')
  }

  // Item 7: Abrir edição manual de valores destacados (sem invenções)
  const openEditValuesModal = (food: FoodRecord) => {
    const override = manualOverrides[food.id] || {}
    setEditingFoodId(food.id)
    setEditKcal(String(override.kcal_per_kg ?? food.kcal_per_kg ?? ''))
    setEditPrice(
      override.package_price_brl !== undefined
        ? String(override.package_price_brl)
        : food.package_price_brl !== undefined
          ? String(food.package_price_brl)
          : '',
    )
    setEditWeight(
      override.package_weight_kg !== undefined
        ? String(override.package_weight_kg)
        : food.package_weight_kg !== undefined
          ? String(food.package_weight_kg)
          : '',
    )
    setEditProtein(
      override.protein_pct !== undefined
        ? String(override.protein_pct)
        : food.protein_pct !== undefined
          ? String(food.protein_pct)
          : '',
    )
  }

  const handleSaveManualValues = () => {
    if (!editingFoodId) return
    const kcalNum = Number(editKcal)
    if (!kcalNum || isNaN(kcalNum) || kcalNum <= 0) {
      toast.error('Informe um valor válido de calorias (kcal/kg).')
      return
    }

    setManualOverrides((prev) => ({
      ...prev,
      [editingFoodId]: {
        kcal_per_kg: kcalNum,
        package_price_brl: editPrice ? Number(editPrice) : undefined,
        package_weight_kg: editWeight ? Number(editWeight) : undefined,
        protein_pct: editProtein ? Number(editProtein) : undefined,
      },
    }))

    setEditingFoodId(null)
    toast.success('Valores manuais aplicados com sucesso! Os cálculos foram atualizados.')
  }

  // Compute metrics with user overrides (Item 7: nunca inventar números)
  const comparisonList = useMemo(() => {
    return selectedFoodIds
      .map((id) => allFoods.find((f) => f.id === id))
      .filter((f): f is FoodRecord => !!f && (f.species || 'canina') === species && (f.category || 'seca') === category)
      .map((food) => {
        const overrides = manualOverrides[food.id] || {}
        const effKcal = overrides.kcal_per_kg ?? food.kcal_per_kg
        const effWeight = overrides.package_weight_kg ?? food.package_weight_kg
        const effPrice = overrides.package_price_brl ?? food.package_price_brl
        const effProtein = overrides.protein_pct ?? food.protein_pct

        // Daily grams = (Daily kcal target / kcal per kg) * 1000
        const dailyGrams =
          dailyKcalTarget > 0 && effKcal > 0 ? Math.round((dailyKcalTarget / effKcal) * 1000) : 0

        // Price per kg (only if both weight and price are manually provided)
        const pricePerKg = effWeight && effPrice && effWeight > 0 ? effPrice / effWeight : null

        // Daily cost (only if pricePerKg exists)
        const dailyCostBrl = pricePerKg ? (dailyGrams / 1000) * pricePerKg : null

        // Monthly cost (30 days)
        const monthlyCostBrl = dailyCostBrl !== null ? dailyCostBrl * 30 : null

        // Package duration
        const packageDurationDays =
          effWeight && dailyGrams > 0 ? Math.round((effWeight * 1000) / dailyGrams) : null

        return {
          ...food,
          kcal_per_kg: effKcal,
          package_weight_kg: effWeight,
          package_price_brl: effPrice,
          protein_pct: effProtein,
          dailyGrams,
          pricePerKg,
          dailyCostBrl,
          monthlyCostBrl,
          packageDurationDays,
        }
      })
  }, [selectedFoodIds, allFoods, manualOverrides, dailyKcalTarget, species, category])

  // Find most economical and highest energy (among those that have valid numbers)
  const validCostItems = comparisonList.filter((f) => f.dailyCostBrl !== null && f.dailyCostBrl > 0)
  const mostEconomicalId =
    validCostItems.length > 0
      ? [...validCostItems].sort((a, b) => (a.dailyCostBrl || 0) - (b.dailyCostBrl || 0))[0]?.id
      : null

  const highestEnergyId =
    comparisonList.length > 0
      ? [...comparisonList].sort((a, b) => b.kcal_per_kg - a.kcal_per_kg)[0]?.id
      : null

  // Apply food to active dog plan
  const handleApplyToPlan = async (food: (typeof comparisonList)[0]) => {
    if (!activeDog) {
      toast.error('Nenhum cão ativo selecionado.')
      return
    }
    if ((food.species || 'canina') !== (activeDog.species || 'canina')) { toast.error('Este alimento é de outra espécie.'); return }
    if (['petisco','biscoito'].includes(food.category || '') || /complementar/i.test(food.nutritional_adequacy || '')) { toast.error('Este produto é complementar e não pode substituir o plano alimentar.'); return }
    setApplyingFood(food.id)
    try {
      const currentKcal = activePlan?.daily_kcal || 0
      if (!currentKcal) throw new Error('Defina primeiro a meta calórica do pet.')
      const newDailyGrams = Math.round((currentKcal / food.kcal_per_kg) * 1000)

      await nutritionService.savePlan(activeDog.id, {
        food_name: `${food.brand} - ${food.name}`,
        kcal_per_kg: food.kcal_per_kg,
        meals_per_day: activePlan?.meals_per_day || 2,
        daily_kcal: currentKcal,
        daily_grams: newDailyGrams,
        goal: activePlan?.goal || 'manter',
        food: food.id, diet_mode: 'commercial',
      })

      await refreshActivePlan()
      toast.success(
        `Ração ${food.brand} aplicada ao plano de ${activeDog.name}! Porção recalculada para ${newDailyGrams}g/dia.`,
      )
    } catch (e) {
      console.error(e)
      toast.error('Erro ao atualizar plano.')
    } finally {
      setApplyingFood(null)
    }
  }

  // ITEM 5: UPLOAD FOTOS (frente + rótulo) E RECÁLCULO AUTOMÁTICO
  const handleSelectFront = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImageFile(file, 1200, 0.85)
      setFrontFile(compressed)
      setFrontPreview(URL.createObjectURL(compressed))
    } catch {
      setFrontFile(file)
      setFrontPreview(URL.createObjectURL(file))
    }
  }

  const handleSelectSpec = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImageFile(file, 1200, 0.85)
      setSpecFile(compressed)
      setSpecPreview(URL.createObjectURL(compressed))
    } catch {
      setSpecFile(file)
      setSpecPreview(URL.createObjectURL(file))
    }
  }

  const handleAnalyzeUploadText = () => {
    const parsed = parseNutritionLabelText(ocrText)
    setExtractedFields(parsed)
    if (parsed.kcal_per_kg) {
      toast.success(`Energia metabolizável: ${parsed.kcal_per_kg} kcal/kg detectada!`)
    } else {
      toast.info('Valores extraídos. Confirme ou informe os campos abaixo.')
    }
  }

  const handleConfirmUploadFood = async () => {
    if (!frontFile || !specFile) {
      toast.error('Por favor selecione a foto da frente e a foto da especificação/rótulo.')
      return
    }

    const brand = extractedFields?.brand || 'Marca Enviada'
    const name = extractedFields?.name || 'Ração Fotográfica'
    const kcal = extractedFields?.kcal_per_kg
    if (!kcal || kcal <= 0) { toast.error('Informe a energia do rótulo antes de salvar.'); return }

    setUploading(true)
    try {
      // Cria registro anônimo na collection user_foods (LGPD sem dados pessoais)
      const fd = new FormData()
      fd.append('species', species); fd.append('category', category)
      fd.append('brand', brand)
      fd.append('name', name)
      fd.append('kcal_per_kg', String(kcal))
      if (extractedFields?.protein_pct)
        fd.append('protein_pct', String(extractedFields.protein_pct))
      if (extractedFields?.fat_pct) fd.append('fat_pct', String(extractedFields.fat_pct))
      if (extractedFields?.fiber_pct) fd.append('fiber_pct', String(extractedFields.fiber_pct))
      if (extractedFields?.package_weight_kg)
        fd.append('package_weight_kg', String(extractedFields.package_weight_kg))
      if (extractedFields?.package_price_brl)
        fd.append('package_price_brl', String(extractedFields.package_price_brl))
      if (extractedFields?.ingredients) fd.append('ingredients', extractedFields.ingredients)
      if (ocrText) fd.append('raw_extracted_text', ocrText)
      fd.append('front_photo', frontFile)
      fd.append('spec_photo', specFile)
      fd.append('status', 'informado_pelo_tutor')

      const created = await nutritionService.createUserFood(fd)

      // Adiciona imediatamente ao comparador com recálculo automático
      const newFoodRecord: FoodRecord = {
        id: `user_${created.id}`, species: created.species, category: created.category,
        name: created.name,
        brand: created.brand,
        kcal_per_kg: created.kcal_per_kg,
        protein_pct: created.protein_pct,
        fat_pct: created.fat_pct,
        fiber_pct: created.fiber_pct,
        life_stage: 'adulto',
        tier: 'premium',
        package_weight_kg: created.package_weight_kg,
        package_price_brl: created.package_price_brl,
        ingredients: created.ingredients || 'Cadastrada por usuário via fotos da embalagem.',
      }

      setAllFoods((prev) => [newFoodRecord, ...prev])
      setSelectedFoodIds((prev) => [newFoodRecord.id, ...prev.slice(0, 3)])
      setUploadModalOpen(false)
      toast.success(
        'Ração salva no banco de dados e adicionada ao comparador com recálculo automático!',
      )
    } catch (err) {
      console.error(err)
      toast.error('Erro ao enviar fotos da embalagem.')
    } finally {
      setUploading(false)
    }
  }

  const getTierLabel = (tier?: FoodTier) => {
    switch (tier) {
      case 'natural':
        return {
          label: 'Alimento Natural',
          color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        }
      case 'super_premium':
        return {
          label: 'Super Premium',
          color: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        }
      case 'premium':
        return {
          label: 'Premium Especial',
          color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        }
      case 'standard':
      default:
        return {
          label: 'Standard',
          color: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
        }
    }
  }

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-xs text-muted-foreground">Carregando catálogo de rações...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {labPresence&&<section className="lab-plan-first"><span className="lab-eyebrow">Alimentação em uso</span><h2>{activeDog?`O plano de ${activeDog.name}`:'Plano alimentar'}</h2>{activePlan?<><p>{activePlan.food_name} · {activePlan.daily_grams.toLocaleString('pt-BR',{maximumFractionDigits:1})} g/dia no plano salvo</p><DietPlanSummary plan={activePlan} compact/></>:<p>Consulte o plano do pet antes de comparar alimentos.</p>}<a href="/plano">Abrir plano alimentar</a><button type="button" aria-expanded={comparisonOpen} onClick={()=>setComparisonOpen(v=>!v)}>{comparisonOpen?'Recolher comparador':'Comparar ou editar alimentos'}</button></section>}
      <div hidden={labPresence&&!comparisonOpen} className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-4 space-y-3"><div className="flex flex-wrap gap-3"><label className="font-semibold">Espécie<select aria-label="Espécie dos alimentos" value={species} onChange={e=>setSpecies(e.target.value)} className="ml-2 rounded-xl border border-border bg-background p-3"><option value="canina">Cães</option><option value="felina">Gatos</option></select></label><label className="font-semibold">Categoria<select aria-label="Categoria alimentar" value={category} onChange={e=>{setCategory(e.target.value);setNatural(false)}} className="ml-2 rounded-xl border border-border bg-background p-3"><option value="seca">Ração seca</option><option value="umida">Alimento úmido</option><option value="petisco">Petiscos</option><option value="biscoito">Biscoitos</option></select></label><Button variant={natural?'default':'outline'} onClick={()=>setNatural(v=>!v)}>Alimentação natural e mista</Button></div><p className="text-sm text-muted-foreground">Compare produtos da mesma espécie e categoria. Petiscos, biscoitos e alimentos complementares não substituem a dieta completa. O custo exibido considera a mesma energia diária, não uma recomendação de servir essa quantidade.</p></section>
      {natural && <NaturalDiet foods={allFoods.filter(f=>(f.species||'canina')===species)} />}
      {comparisonList.length===0 && <p className="rounded-xl border border-border p-4">Nenhum alimento desta categoria cadastrado. Use “Adicionar manualmente” para incluir os dados reais do rótulo.</p>}
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
                Comparador de alimentos
              </h1>
              <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                Valores Manuais & Sem Invenções
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Compare marcas lado a lado com dados auditáveis, upload de fotos e exclusão de itens
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => setManualFoodOpen(true)} className="bg-primary text-primary-foreground rounded-xl h-11 text-sm"><Plus className="mr-2 h-4 w-4" />Adicionar ração manualmente</Button>
          {/* BOTÃO ITEM 5: UPLOAD DE FOTOS DA EMBALAGEM */}
          <Button
            onClick={() => setUploadModalOpen(true)}
            className="bg-primary/15 hover:bg-primary/25 text-primary border border-primary/40 font-bold text-xs rounded-xl h-9 shadow-sm"
          >
            <Camera className="w-3.5 h-3.5 mr-1.5" />
            Upload Fotos da Embalagem
          </Button>

          <Button
            onClick={() => setCatalogModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl h-9 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Escolher ({selectedFoodIds.length}/4)
          </Button>
        </div>
      </div>

      {/* ACTIVE DOG PLAN COST CARD */}
      {activeDog && activePlan ? (
        <div className="p-4 rounded-3xl bg-card border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <DogAvatar
              dog={activeDog}
              name={activeDog.name}
              avatarUrl={nutritionService.getAvatarUrl(activeDog)}
              size="md"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm text-foreground">{activeDog.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                  Pet Ativo
                </span>
                {dogs.length > 1 && (
                  <select
                    aria-label="Trocar cão ativo"
                    value={activeDog.id}
                    onChange={(e) => setActiveDogId(e.target.value)}
                    className="bg-card border border-border/70 text-[11px] rounded-lg px-2 py-0.5 text-foreground font-medium focus:outline-none focus:border-primary"
                  >
                    {dogs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.weight_kg}kg)
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Necessidade calculada:{' '}
                <strong className="text-foreground">{activePlan.daily_kcal} kcal/dia</strong> •
                Ração atual: <strong className="text-primary">{activePlan.food_name}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/caes/${activeDog.id}/peso`)}
              className="text-xs h-8 rounded-xl border-primary/40 text-primary"
            >
              Ver na Aba Peso
            </Button>
          </div>
        </div>
      ) : activeDog ? (
        <div className="p-4 rounded-3xl bg-card border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <DogAvatar
              dog={activeDog}
              name={activeDog.name}
              avatarUrl={nutritionService.getAvatarUrl(activeDog)}
              size="md"
            />
            <div>
              <span className="font-extrabold text-sm text-foreground">{activeDog.name}</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Defina o plano na aba Peso para calcular custo diário e duração do pacote.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate(`/caes/${activeDog.id}/peso`)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl h-8 shrink-0"
          >
            Configurar na Aba Peso
          </Button>
        </div>
      ) : null}

      {/* QUICK CHIPS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Rações em Comparação ({comparisonList.length})
          </span>
          <span className="text-[11px] text-muted-foreground">
            Selecione de 2 a 4 para comparar
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {comparisonList.map((food) => (
            <div
              key={food.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border/80 text-xs font-medium"
            >
              <span className="text-foreground font-bold">{food.brand}</span>
              <span className="text-muted-foreground truncate max-w-[140px]">{food.name}</span>
              <button
                type="button"
                onClick={() => handleToggleSelect(food.id)}
                className="hover:text-rose-400 text-muted-foreground transition"
                title="Remover da comparação"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {selectedFoodIds.length < 4 && (
            <button
              type="button"
              onClick={() => setCatalogModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-primary/50 text-primary hover:bg-primary/10 text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar marca
            </button>
          )}
        </div>
      </div>

      {/* COMPARISON SIDE-BY-SIDE MATRIX (Itens 5, 6, 7) */}
      <div className="overflow-x-auto pb-4 scrollbar-none">
        <div
          className="grid gap-3 min-w-[700px]"
          style={{
            gridTemplateColumns: `repeat(${Math.max(2, comparisonList.length)}, minmax(270px, 1fr))`,
          }}
        >
          {comparisonList.map((food) => {
            const isEconomical = food.id === mostEconomicalId
            const isHighestEnergy = food.id === highestEnergyId
            const isCurrentlyInPlan = activePlan?.food === food.id
            const tierBadge = getTierLabel(food.tier)

            return (
              <div
                key={food.id}
                className={`p-5 rounded-3xl bg-card border-2 flex flex-col justify-between transition-all relative ${
                  isEconomical
                    ? 'border-primary shadow-lg shadow-primary/10'
                    : 'border-border/80 hover:border-border'
                }`}
              >
                <div>
                  {/* Top Bar: Highlights & Item Actions (Item 7: Excluir e Editar Manual) */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1 flex-wrap">
                      {isEconomical && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary text-primary-foreground flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" />
                          Mais Econômica
                        </span>
                      )}
                      <span className="rounded-full border border-border px-2 py-1 text-xs">Qualidade: {food.source_url && food.quality_control && food.nutritional_adequacy ? 'documentação informada' : 'dados insuficientes'}</span>
                      {isCurrentlyInPlan && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                          Em uso
                        </span>
                      )}
                      {isHighestEnergy && !isEconomical && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Alta Kcal
                        </span>
                      )}
                    </div>

                    {/* ACTIONS: EDIT MANUAL & DELETE (Item 7) */}
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditValuesModal(food)}
                        className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground"
                        title="Inserir/editar valores manualmente (sem invenções)"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteFood(food.id)}
                        className="w-7 h-7 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                        title="Excluir item do comparador"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <FoodQuality food={food} pet={activeDog} />
                  {/* Brand & Name */}
                  <div className="space-y-1">
                    <span className="text-xs uppercase font-extrabold text-primary tracking-wider">
                      {food.brand}
                    </span>
                    <h3 className="text-base font-black text-foreground leading-snug">
                      {food.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge className={`text-[10px] font-semibold border ${tierBadge.color}`}>
                        {tierBadge.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground capitalize">
                        {food.life_stage}
                      </span>
                    </div>
                  </div>

                  {/* COST BOX (Item 7: se não houver valor, mostrar 'informar valor' em vez de inventar) */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-background/60 border border-border/60 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground font-semibold flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-primary" />
                        Custo p/ {activeDog?.name || 'Pet'}
                      </span>
                      {food.dailyGrams > 0 && (
                        <span className="text-foreground font-bold">{formatPortion(food.dailyGrams)} g/dia</span>
                      )}
                    </div>

                    {food.dailyCostBrl !== null ? (
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-foreground">
                            R$ {food.dailyCostBrl.toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">/ dia</span>
                        </div>
                        <p className="text-[11px] text-primary font-bold mt-0.5">
                          ≈ R$ {food.monthlyCostBrl?.toFixed(2)} por mês (30 dias)
                        </p>
                      </div>
                    ) : (
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => openEditValuesModal(food)}
                          className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          Informar valor do pacote
                        </button>
                      </div>
                    )}
                  </div>

                  {/* NUTRITION SPECS (Item 7: valores manuais sem números fabricados) */}
                  <div className="mt-3 p-3 rounded-2xl bg-background/50 border border-border/50 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Energia Metabolizável:</span>
                      <strong className="text-foreground font-black">
                        {food.kcal_per_kg} kcal/kg
                      </strong>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Proteína Bruta:</span>
                      {food.protein_pct ? (
                        <strong className="text-foreground">{food.protein_pct}%</strong>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openEditValuesModal(food)}
                          className="text-[11px] text-primary hover:underline font-semibold"
                        >
                          Informar valor
                        </button>
                      )}
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Pacote de Ref.:</span>
                      {food.package_weight_kg && food.package_price_brl ? (
                        <span className="text-foreground font-semibold">
                          {food.package_weight_kg} kg • R$ {food.package_price_brl.toFixed(2)}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openEditValuesModal(food)}
                          className="text-[11px] text-primary hover:underline font-semibold"
                        >
                          Informar valor
                        </button>
                      )}
                    </div>

                    <div className="flex justify-between items-center border-t border-border/40 pt-1.5">
                      <span className="text-muted-foreground">Preço por Kg:</span>
                      {food.pricePerKg ? (
                        <strong className="text-primary font-bold">
                          R$ {food.pricePerKg.toFixed(2)} / kg
                        </strong>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">
                          Pendente de valor
                        </span>
                      )}
                    </div>

                    {food.packageDurationDays !== null && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Duração do Saco:</span>
                        <span className="text-foreground font-bold">
                          ≈ {food.packageDurationDays} dias (
                          {Math.round(food.packageDurationDays / 30)} meses)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* INGREDIENTS */}
                  <div className="mt-3 space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Ingredientes Principais
                    </span>
                    <div className="p-2.5 rounded-xl bg-background/40 border border-border/40 text-[11px] text-muted-foreground leading-relaxed max-h-28 overflow-y-auto">
                      {food.ingredients || 'Composição disposta na embalagem do produto.'}
                    </div>
                  </div>
                </div>

                {/* BOTTOM ACTION */}
                <div className="pt-4 mt-3 border-t border-border/60">
                  {isCurrentlyInPlan ? (
                    <Button
                      disabled
                      className="w-full rounded-xl bg-primary/20 text-primary border border-primary/30 text-xs font-bold h-10"
                    >
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                      Ração Atual do Pet
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleApplyToPlan(food)}
                      disabled={applyingFood === food.id || !activeDog}
                      className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold h-10 shadow-sm"
                    >
                      <Soup className="w-3.5 h-3.5 mr-1.5" />
                      {applyingFood === food.id
                        ? 'Aplicando...'
                        : `Usar no Plano de ${activeDog?.name || 'Pet'}`}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* MODAL ITEM 7: EDIÇÃO MANUAL DE VALORES DESTACADOS (SEM INVENÇÃO) */}
      <Dialog open={!!editingFoodId} onOpenChange={(open) => !open && setEditingFoodId(null)}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-foreground">
              Inserir Valores Manuais da Ração
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Insira os valores diretamente da embalagem ou da nota fiscal. O sistema recalcula os
              custos e as porções sem gerar dados fabricados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">
                Energia Metabolizável (kcal / kg) *
              </Label>
              <Input
                type="number"
                value={editKcal}
                onChange={(e) => setEditKcal(e.target.value)}
                placeholder="Ex: 3800"
                className="bg-background text-xs h-10 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">Preço do Pacote (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  placeholder="Ex: 249.90"
                  className="bg-background text-xs h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">Peso do Pacote (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editWeight}
                  onChange={(e) => setEditWeight(e.target.value)}
                  placeholder="Ex: 15"
                  className="bg-background text-xs h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Proteína Bruta (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={editProtein}
                onChange={(e) => setEditProtein(e.target.value)}
                placeholder="Ex: 26"
                className="bg-background text-xs h-10 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingFoodId(null)}
                className="text-xs rounded-xl h-9"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveManualValues}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl h-9 px-4"
              >
                Salvar Valores
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL ITENS 5 & 6: UPLOAD DE FOTOS DA EMBALAGEM + BANCO DE DADOS LGPD */}
      <ManualFoodDialog species={species} category={category} open={manualFoodOpen} onOpenChange={setManualFoodOpen} onSaved={food => {
        setAllFoods(prev => [food, ...prev]); setSelectedFoodIds(prev => [food.id, ...prev.slice(0, 3)])
        toast.success('Ração salva na sua conta e adicionada ao comparador.')
      }} />
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-foreground flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              Upload de Fotos & Recálculo Automático
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Envie a foto da frente e da especificação técnica. Os dados serão validados no banco
              de dados de rações (LGPD: sem dados pessoais) e recalculados no comparador.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Foto Frente */}
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
                {frontPreview ? (
                  <div className="relative">
                    <img
                      src={frontPreview}
                      alt="Frente"
                      className="max-h-28 rounded-xl object-contain"
                    />
                    <span className="text-[10px] text-primary font-bold mt-1 block">
                      Trocar foto
                    </span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                    <span className="text-xs font-semibold text-foreground">
                      Carregar foto da frente
                    </span>
                    <span className="text-[10px] text-muted-foreground">PNG ou JPG até 10MB</span>
                  </>
                )}
                <input
                  ref={frontInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSelectFront}
                  className="hidden"
                />
              </div>
            </div>

            {/* Foto Especificação */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>2. Especificação Disposta na Embalagem *</span>
                <span className="text-[10px] text-primary font-normal">Tabela e garantia</span>
              </Label>
              <div
                onClick={() => specInputRef.current?.click()}
                className="p-3 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 transition cursor-pointer text-center bg-background/50 flex flex-col items-center justify-center min-h-[90px]"
              >
                {specPreview ? (
                  <div className="relative">
                    <img
                      src={specPreview}
                      alt="Especificação"
                      className="max-h-28 rounded-xl object-contain"
                    />
                    <span className="text-[10px] text-primary font-bold mt-1 block">
                      Trocar foto
                    </span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                    <span className="text-xs font-semibold text-foreground">
                      Carregar foto da especificação
                    </span>
                    <span className="text-[10px] text-muted-foreground">PNG ou JPG até 10MB</span>
                  </>
                )}
                <input
                  ref={specInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSelectSpec}
                  className="hidden"
                />
              </div>
            </div>

            {/* Digitação / Extração com confirmação (Item 5 e 7: nunca inventar valores) */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-background/60 border border-border/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Texto do Rótulo</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleAnalyzeUploadText}
                  className="text-[11px] h-7 px-2 font-bold text-primary"
                >
                  Identificar Dados
                </Button>
              </div>

              <textarea
                value={ocrText}
                onChange={(e) => setOcrText(e.target.value)}
                placeholder="Exemplo: Marca Premier Nattu, Adulto. Energia metabolizável 3.900 kcal/kg. Proteína bruta (mín) 28%. Pacote 12kg."
                className="w-full h-18 bg-background border border-border/70 rounded-xl p-2 text-xs focus:outline-none focus:border-primary resize-none text-foreground"
              />

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    Marca / Nome *
                  </label>
                  <Input
                    type="text"
                    placeholder="Ex: Premier Nattu"
                    value={extractedFields?.brand || ''}
                    onChange={(e) =>
                      setExtractedFields((prev) => ({
                        ...prev,
                        brand: e.target.value,
                        name: e.target.value,
                      }))
                    }
                    className="h-8 text-xs bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    Energia (kcal/kg) *
                  </label>
                  <Input
                    type="number"
                    value={extractedFields?.kcal_per_kg || 3500}
                    onChange={(e) =>
                      setExtractedFields((prev) => ({
                        ...prev,
                        kcal_per_kg: Number(e.target.value) || 0,
                      }))
                    }
                    className="h-8 text-xs font-bold bg-background text-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setUploadModalOpen(false)}
                className="text-xs rounded-xl h-9"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={uploading || !frontFile || !specFile}
                onClick={handleConfirmUploadFood}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl h-9 px-5 shadow-sm"
              >
                {uploading ? 'Gravando no banco...' : 'Confirmar & Recalcular'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CATALOG SELECTION MODAL */}
      <Dialog open={catalogModalOpen} onOpenChange={setCatalogModalOpen}>
        <DialogContent className="max-w-2xl bg-card border-border/80 max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">
              Catálogo de Rações Populares Brasileiras
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Selecione as marcas que deseja comparar (até 4 simultâneas).
            </DialogDescription>
          </DialogHeader>

          {/* Search and filters bar */}
          <div className="space-y-2 py-2">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Buscar por marca, nome da ração ou ingrediente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-background border-border/70 text-xs pl-9 h-10 rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <select
                aria-label="Filtrar por categoria"
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="bg-background border border-border/70 text-xs rounded-lg px-2.5 py-1 text-muted-foreground"
              >
                <option value="all">Todas as Categorias</option>
                <option value="natural">Alimento Natural</option>
                <option value="super_premium">Super Premium</option>
                <option value="premium">Premium Especial</option>
                <option value="standard">Standard</option>
              </select>

              <select
                aria-label="Filtrar por fase da vida"
                value={selectedLifeStage}
                onChange={(e) => setSelectedLifeStage(e.target.value)}
                className="bg-background border border-border/70 text-xs rounded-lg px-2.5 py-1 text-muted-foreground"
              >
                <option value="all">Todas as Fases</option>
                <option value="adulto">Adulto</option>
                <option value="filhote">Filhote</option>
                <option value="senior">Sênior</option>
              </select>
            </div>
          </div>

          {/* Food list */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[420px]">
            {filteredCatalog.length === 0 ? (
              <p className="text-center py-8 text-xs text-muted-foreground">
                Nenhuma ração encontrada para os filtros.
              </p>
            ) : (
              filteredCatalog.map((food) => {
                const isSelected = selectedFoodIds.includes(food.id)
                const pricePerKg =
                  food.package_weight_kg && food.package_price_brl
                    ? (food.package_price_brl / food.package_weight_kg).toFixed(2)
                    : null
                const tier = getTierLabel(food.tier)

                return (
                  <div
                    key={food.id}
                    onClick={() => handleToggleSelect(food.id)}
                    className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-primary/15 border-primary/70 text-foreground'
                        : 'bg-background/60 border-border/60 hover:border-primary/40 text-muted-foreground'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs text-foreground">{food.brand}</span>
                        <span className="text-xs text-foreground/90 truncate">{food.name}</span>
                        <Badge className={`text-[9px] px-1.5 py-0 border ${tier.color}`}>
                          {tier.label}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                        <span>{food.kcal_per_kg} kcal/kg</span>
                        {food.protein_pct && <span>• {food.protein_pct}% proteína</span>}
                        {pricePerKg && (
                          <span className="text-primary font-semibold">• R$ {pricePerKg}/kg</span>
                        )}
                        <span>• Ref: {food.package_weight_kg || 15}kg</span>
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition ${
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-border/80'
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4" />}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="pt-3 border-t border-border/60 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {selectedFoodIds.length} selecionadas (máximo 4)
            </span>
            <Button
              onClick={() => setCatalogModalOpen(false)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl px-5"
            >
              Concluir Seleção
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
