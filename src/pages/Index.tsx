import TodayOverview from '@/components/TodayOverview'
import { useIsDesktop } from '@/hooks/use-desktop'
import { formatPortion } from '@/lib/format-portion'
import { weightDate } from '@/lib/weight-date'
import DietPlanSummary from '@/components/DietPlanSummary'
import { preferenceStorage } from '@/lib/preferences'
import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Soup,
  Heart,
  Stethoscope,
  GraduationCap,
  Scissors,
  Lock,
  Scale,
  Sliders,
  ChevronRight,
  Clock,
  Sparkles,
  Palette,
  TrendingDown,
  TrendingUp,
  Minus,
  UtensilsCrossed,
  Activity,
  Plus,
} from 'lucide-react'
import { useDog } from '@/contexts/DogContext'
import { CountUp } from '@/components/CountUp'
import { WeightSheet } from '@/components/WeightSheet'
import { RottweilerHero } from '@/components/RottweilerHero'
import { HeroSelectorModal } from '@/components/HeroSelectorModal'
import { nutritionService } from '@/services/nutrition'
import type { WeightLogRecord } from '@/types/nutrition'
import {
  HeroTheme,
  DEFAULT_HERO_THEME_ID,
  HERO_STORAGE_KEY,
  getHeroThemeById,
  matchHeroThemeByBreed,
  applyHeroThemeToDom,
  HERO_THEMES,
} from '@/lib/hero-themes'
import { useActiveHeroTheme } from '@/hooks/use-active-hero-theme'
import { setPetHeroPreference } from '@/lib/color-extractor'
import { toast } from 'sonner'

export function Index() {
  const { dogs, activeDog, activePlan, loading, refreshDogs, refreshActivePlan } = useDog()
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [shakingModule, setShakingModule] = useState<string | null>(null)
  const [weightSheetOpen, setWeightSheetOpen] = useState(false)
  const [weightLogs, setWeightLogs] = useState<WeightLogRecord[]>([])
  const [, setLoadingWeights] = useState(false)
  const [heroSelectorOpen, setHeroSelectorOpen] = useState(false)

  // Resolução unificada da interface: pet hero com paleta da foto ou raça
  const activeHero = useActiveHeroTheme(activeDog)
  const currentHeroTheme = activeHero.theme

  // Tema sugerido com base na raça do pet ativo
  const suggestedTheme = useMemo(() => {
    if (!activeDog?.breed) return null
    return matchHeroThemeByBreed(activeDog.breed)
  }, [activeDog?.breed])

  const handleSelectHeroTheme = (theme: HeroTheme) => {
    try {
      if (activeDog) setPetHeroPreference(activeDog.id, false)
      preferenceStorage.setItem('bichu_manual_color', 'false')
      preferenceStorage.setItem(HERO_STORAGE_KEY, theme.id)
      applyHeroThemeToDom(theme)
      window.dispatchEvent(new Event('bichu:hero-theme-changed'))
    } catch {
      // Ignora erro de storage
    }
    toast(`Visual atualizado para ${theme.name}`, {
      description: `Interface integrada ao tom ${theme.name}.`,
    })
  }

  // Load weight logs for active dog to calculate variation and previous weight
  useEffect(() => {
    let isCurrent = true
    if (!activeDog?.id) {
      setWeightLogs([])
      return
    }

    setLoadingWeights(true)
    nutritionService
      .getWeightLogs(activeDog.id)
      .then((logs) => {
        if (isCurrent) {
          setWeightLogs(logs)
        }
      })
      .catch((err) => {
        console.warn('Erro ao carregar histórico de peso para Home:', err)
      })
      .finally(() => {
        if (isCurrent) setLoadingWeights(false)
      })

    return () => {
      isCurrent = false
    }
  }, [activeDog?.id, activeDog?.weight_kg])

  const handleModuleClick = (mod: { id: string; active?: boolean; route?: string }) => {
    if (mod.active && mod.route) {
      navigate(mod.route)
      return
    }

    if (mod.active) {
      if (activeDog) {
        navigate(`/caes/${activeDog.id}/plano`)
      } else {
        navigate('/caes')
      }
      return
    }

    // Coming soon shake and toast
    setShakingModule(mod.id)
    setTimeout(() => setShakingModule(null), 450)
    toast('Este módulo chega em uma próxima atualização', {
      description: 'Estamos refinando os recursos com especialistas veterinários.',
    })
  }

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center space-y-3">
        <div
          className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: currentHeroTheme.brownPrimary, borderTopColor: 'transparent' }}
        />
        <p className="text-sm font-medium" style={{ color: currentHeroTheme.brownBody }}>
          Carregando perfil nutricional...
        </p>
      </div>
    )
  }

  // ONBOARDING EMPTY STATE: Apresenta o Hero imersivo limpo no topo
  if (!loading && dogs.length === 0) {
    return (
      <div className="bichu-home space-y-6 pb-10 transition-colors duration-500">
        {/* Hero imersivo com topo clean (apenas saudação mínima) */}
        <RottweilerHero activeDog={null} />

        {/* ZONA PÓS-HERO: Seleção de Interface & Gestão de Pets no padrão nativo minimalista */}
        <div className="flex items-center justify-between gap-3 flex-wrap px-1">
          <button
            onClick={() => setHeroSelectorOpen(true)}
            type="button"
            className="group inline-flex items-center gap-2 py-1.5 px-3 rounded-full text-xs font-semibold cursor-pointer transition-all duration-200 hover:opacity-100 opacity-80 border-none outline-none bg-transparent hover:bg-white/5 active:scale-[0.98]"
            style={{ color: currentHeroTheme.brownTitle }}
          >
            <Palette className="w-4 h-4" style={{ color: currentHeroTheme.brownPrimary }} />
            <span>Escolher interface</span>
            <span className="text-[11px] opacity-70" style={{ color: currentHeroTheme.brownMuted }}>
              ({HERO_THEMES.length} raças)
            </span>
          </button>

          <button
            onClick={() => navigate('/caes/novo')}
            type="button"
            className="inline-flex items-center gap-1.5 py-1.5 px-4 rounded-full text-xs font-bold cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundColor: currentHeroTheme.brownPrimary,
              color: currentHeroTheme.bgColor,
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar primeiro pet</span>
          </button>
        </div>

        {/* Módulos Essenciais Meu Bichu em formato HORIZONTAL, fluidos e 100% clicáveis */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: currentHeroTheme.brownMuted }}
            >
              Módulos Científicos
            </h2>
            <span
              className="text-[11px] font-medium"
              style={{ color: currentHeroTheme.brownPrimary }}
            >
              Toque para acessar
            </span>
          </div>

          <div className="bichu-essential-grid flex flex-col gap-2.5">
            {/* 1. Cálculo RER / MER */}
            <button
              type="button"
              onClick={() => navigate('/caes/novo')}
              className="group w-full p-4 rounded-3xl backdrop-blur-md border text-left cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.985] flex items-center justify-between gap-4"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderColor: `${currentHeroTheme.brownPrimary}25`,
              }}
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105"
                  style={{
                    backgroundColor: `${currentHeroTheme.brownPrimary}18`,
                    borderColor: `${currentHeroTheme.brownPrimary}35`,
                    color: currentHeroTheme.brownPrimary,
                  }}
                >
                  <Soup className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-bold text-sm tracking-tight"
                      style={{ color: currentHeroTheme.brownTitle }}
                    >
                      Cálculo RER / MER
                    </span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0"
                      style={{
                        backgroundColor: `${currentHeroTheme.brownPrimary}15`,
                        borderColor: `${currentHeroTheme.brownPrimary}30`,
                        color: currentHeroTheme.brownPrimary,
                      }}
                    >
                      Metabolismo
                    </span>
                  </div>
                  <p
                    className="text-xs leading-relaxed line-clamp-2 mt-0.5"
                    style={{ color: currentHeroTheme.brownBody }}
                  >
                    Calorias de repouso exatas ajustadas pelo fator metabólico individual.
                  </p>
                </div>
              </div>
              <ChevronRight
                className="w-5 h-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                style={{ color: currentHeroTheme.brownPrimary }}
              />
            </button>

            {/* 2. Gramas por Refeição */}
            <button
              type="button"
              onClick={() => navigate('/caes/novo')}
              className="group w-full p-4 rounded-3xl backdrop-blur-md border text-left cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.985] flex items-center justify-between gap-4"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderColor: `${currentHeroTheme.brownPrimary}25`,
              }}
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105"
                  style={{
                    backgroundColor: `${currentHeroTheme.brownPrimary}18`,
                    borderColor: `${currentHeroTheme.brownPrimary}35`,
                    color: currentHeroTheme.brownPrimary,
                  }}
                >
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-bold text-sm tracking-tight"
                      style={{ color: currentHeroTheme.brownTitle }}
                    >
                      Gramas por Refeição
                    </span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0"
                      style={{
                        backgroundColor: `${currentHeroTheme.brownPrimary}15`,
                        borderColor: `${currentHeroTheme.brownPrimary}30`,
                        color: currentHeroTheme.brownPrimary,
                      }}
                    >
                      Horários
                    </span>
                  </div>
                  <p
                    className="text-xs leading-relaxed line-clamp-2 mt-0.5"
                    style={{ color: currentHeroTheme.brownBody }}
                  >
                    Distribuição por horário para digestão equilibrada ao longo do dia.
                  </p>
                </div>
              </div>
              <ChevronRight
                className="w-5 h-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                style={{ color: currentHeroTheme.brownPrimary }}
              />
            </button>

            {/* 3. Controle de Peso */}
            <button
              type="button"
              onClick={() => navigate('/caes/novo')}
              className="group w-full p-4 rounded-3xl backdrop-blur-md border text-left cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.985] flex items-center justify-between gap-4"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderColor: `${currentHeroTheme.brownPrimary}25`,
              }}
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105"
                  style={{
                    backgroundColor: `${currentHeroTheme.brownPrimary}18`,
                    borderColor: `${currentHeroTheme.brownPrimary}35`,
                    color: currentHeroTheme.brownPrimary,
                  }}
                >
                  <Scale className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-bold text-sm tracking-tight"
                      style={{ color: currentHeroTheme.brownTitle }}
                    >
                      Controle de Peso
                    </span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0"
                      style={{
                        backgroundColor: `${currentHeroTheme.brownPrimary}15`,
                        borderColor: `${currentHeroTheme.brownPrimary}30`,
                        color: currentHeroTheme.brownPrimary,
                      }}
                    >
                      Evolução
                    </span>
                  </div>
                  <p
                    className="text-xs leading-relaxed line-clamp-2 mt-0.5"
                    style={{ color: currentHeroTheme.brownBody }}
                  >
                    Histórico com variação desde a última pesagem e prevenção de sobrepeso.
                  </p>
                </div>
              </div>
              <ChevronRight
                className="w-5 h-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                style={{ color: currentHeroTheme.brownPrimary }}
              />
            </button>
          </div>
        </div>

        {/* Seletor de interface em modal */}
        <HeroSelectorModal
          open={heroSelectorOpen}
          onClose={() => setHeroSelectorOpen(false)}
          currentThemeId={currentHeroTheme.id}
          onSelectTheme={handleSelectHeroTheme}
          activeDog={null}
          suggestedTheme={null}
        />
      </div>
    )
  }

  const meals =
    activePlan?.meals_json && activePlan.meals_json.length > 0
      ? activePlan.meals_json
      : [
          {
            id: '1',
            label: 'Café da manhã',
            time: '08:00',
            grams: Math.round((activePlan?.daily_grams || 200) / 2),
          },
          {
            id: '2',
            label: 'Jantar',
            time: '19:00',
            grams: Math.round((activePlan?.daily_grams || 200) / 2),
          },
        ]

  // Sort weight logs chronologically
  const sortedWeights = [...weightLogs].sort(
    (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime(),
  )
  const currentWeight =
    activeDog?.weight_kg || (sortedWeights[sortedWeights.length - 1]?.weight_kg ?? 0)
  const previousWeightLog =
    sortedWeights.length > 1 ? sortedWeights[sortedWeights.length - 2] : null
  const weightVariation =
    previousWeightLog !== null
      ? Number((currentWeight - previousWeightLog.weight_kg).toFixed(1))
      : null

  const modules = [
    {
      id: 'nutrition',
      title: 'Nutrição & Plano',
      subtitle: 'Porção diária NRC & gramas por refeição',
      color: 'bg-primary/15 text-primary border-primary/30',
      tag: 'Ativo',
      icon: Soup,
      active: true,
      route: activeDog ? `/caes/${activeDog.id}/plano` : '/caes',
    },
    {
      id: 'weight',
      title: 'Evolução de Peso',
      subtitle: 'Curva histórica & registros periódicos',
      color: 'bg-primary/15 text-primary border-primary/30',
      tag: 'Ativo',
      icon: Scale,
      active: true,
      route: activeDog ? `/caes/${activeDog.id}/peso` : '/caes',
    },
    {
      id: 'bcs',
      title: 'BCS Interativo',
      subtitle: 'Guia visual 1-9 & ajuste automático de dose',
      color: 'bg-primary/15 text-primary border-primary/30',
      tag: 'Ativo',
      icon: Activity,
      active: true,
      route: activeDog ? `/bcs/${activeDog.id}` : '/bcs/guia',
    },
    {
      id: 'compare',
      title: 'Comparador de Rações',
      subtitle: 'Kcal/kg, ingredientes & custo real por dia',
      color: 'bg-primary/15 text-primary border-primary/30',
      tag: 'Ativo',
      icon: UtensilsCrossed,
      active: true,
      route: '/comparador',
    },
    {
      id: 'social',
      title: 'Social Pet',
      subtitle: 'Comunidade, passeios & rotina de tutores',
      color: 'bg-muted text-muted-foreground border-border',
      tag: 'Em breve',
      icon: Heart,
      active: false,
    },
    {
      id: 'health',
      title: 'Saúde & Vet',
      subtitle: 'Histórico vacinal, vermífugos & exames',
      color: 'bg-muted text-muted-foreground border-border',
      tag: 'Em breve',
      icon: Stethoscope,
      active: false,
    },
    {
      id: 'training',
      title: 'Adestramento',
      subtitle: 'Truques, reforço positivo & comportamento',
      color: 'bg-muted text-muted-foreground border-border',
      tag: 'Em breve',
      icon: GraduationCap,
      active: false,
    },
    {
      id: 'grooming',
      title: 'Banho & Tosa',
      subtitle: 'Agendamentos & cuidados higiênicos',
      color: 'bg-muted text-muted-foreground border-border',
      tag: 'Em breve',
      icon: Scissors,
      active: false,
    },
  ]

  return (
    <div className="bichu-home space-y-6 pb-12 transition-colors duration-500">
      {/* 1. HERO IMERSIVO COM TOPO LIMPO: A imagem respira e a saudação é curta e essencial */}
      <div className="bichu-home-intro"><div className="bichu-home-presentation"><RottweilerHero activeDog={activeDog} /><DietPlanSummary plan={activePlan} compact={isDesktop}/></div>{isDesktop&&activeDog&&<TodayOverview key={activeDog.id} dog={activeDog} plan={activePlan}/>}</div>

      {/* 2. ZONA PÓS-HERO (ABAIXO DA DOBRA): Seleção de Interface, raça ativa e atalhos sem sobrepor o animal */}
      <div className="flex items-center justify-between gap-3 flex-wrap px-1">
        {/* Ação fluida no padrão nativo: "Escolher interface" */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setHeroSelectorOpen(true)}
            type="button"
            className="group inline-flex items-center gap-2 py-1 px-2.5 rounded-full text-xs font-semibold cursor-pointer transition-all duration-200 hover:opacity-100 opacity-80 border-none outline-none bg-transparent hover:bg-white/5 active:scale-[0.98]"
            style={{ color: currentHeroTheme.brownTitle }}
            title="Trocar a raça/espécie do visual imersivo"
          >
            <Palette
              className="w-3.5 h-3.5 transition-transform group-hover:rotate-12"
              style={{ color: currentHeroTheme.brownPrimary }}
            />
            <span className="group-hover:underline decoration-1 underline-offset-2">
              Escolher interface
            </span>
            <span
              className="text-[11px] font-normal opacity-70"
              style={{ color: currentHeroTheme.brownMuted }}
            >
              ({currentHeroTheme.name})
            </span>
          </button>

          {/* Toggle sutil para alternar entre foto do pet e raça se o pet tiver foto */}
          {activeDog && activeHero.hasPetPhoto && (
            <button
              type="button"
              onClick={() => {
                const next = !activeHero.usePetHeroPref
                setPetHeroPreference(activeDog.id, next)
                toast(
                  next
                    ? `Visual de ${activeDog.name} ativado!`
                    : `Visual da raça ${activeHero.baseBreedTheme.name} ativado`,
                  {
                    description: next
                      ? 'A imagem do seu pet e paleta correspondente assumiram a interface.'
                      : 'Voltando à arte de referência da raça.',
                  },
                )
              }}
              className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[11px] font-medium border cursor-pointer transition-all hover:bg-white/5 active:scale-[0.98]"
              style={{
                borderColor: `${currentHeroTheme.brownPrimary}30`,
                color: currentHeroTheme.brownTitle,
                backgroundColor: activeHero.isPetHero
                  ? `${currentHeroTheme.brownPrimary}15`
                  : 'transparent',
              }}
              title="Alternar entre foto do pet e visual da raça"
            >
              <Sparkles className="w-3 h-3" style={{ color: currentHeroTheme.brownPrimary }} />
              <span>{activeHero.isPetHero ? 'Usando foto do pet' : 'Usar foto do pet'}</span>
            </button>
          )}
        </div>

        <button
          onClick={() => navigate('/caes')}
          type="button"
          className="group text-xs font-medium inline-flex items-center gap-1 py-1 px-2.5 rounded-full cursor-pointer transition-all duration-200 hover:opacity-100 opacity-80 border-none outline-none bg-transparent hover:bg-white/5 active:scale-[0.98]"
          style={{ color: currentHeroTheme.brownTitle }}
        >
          <span>Meus pets</span>
          <ChevronRight
            className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
            style={{ color: currentHeroTheme.brownPrimary }}
          />
        </button>
      </div>

      {/* 3. CARD RESUMO DE HOJE — Vidro translúcido elegante integrado ao fundo escuro da raça */}
      <div
        className="bichu-nutrition-summary relative overflow-hidden rounded-3xl p-5 sm:p-6 backdrop-blur-xl border transition-all duration-300 shadow-xl"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.035)',
          borderColor: `${currentHeroTheme.brownPrimary}25`,
        }}
      >
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: currentHeroTheme.brownPrimary }}
            />
            <span
              className="text-xs uppercase tracking-wider font-bold"
              style={{ color: currentHeroTheme.brownPrimary }}
            >
              Resumo Nutricional de Hoje
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-medium flex items-center gap-1.5 px-3 py-1 rounded-full border backdrop-blur-md"
              style={{
                backgroundColor: 'rgba(25, 16, 10, 0.5)',
                borderColor: `${currentHeroTheme.brownPrimary}30`,
                color: currentHeroTheme.brownTitle,
              }}
            >
              <Sparkles className="w-3 h-3" style={{ color: currentHeroTheme.brownPrimary }} />
              <span>{activePlan?.food_name || 'Ração Padrão'}</span>
            </span>
          </div>
        </div>

        {/* Big numbers row (4 métricas balanceadas) */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y"
          style={{ borderColor: `${currentHeroTheme.brownPrimary}20` }}
        >
          <div>
            <p className="text-[11px] font-medium" style={{ color: currentHeroTheme.brownMuted }}>
              Calorias / dia
            </p>
            <div
              className="text-2xl sm:text-3xl font-black mt-0.5 tracking-tight"
              style={{ color: currentHeroTheme.brownTitle }}
            >
              <CountUp end={activePlan?.daily_kcal || 0} suffix="" />
              <span
                className="text-xs font-semibold ml-1"
                style={{ color: currentHeroTheme.brownPrimary }}
              >
                kcal
              </span>
            </div>
            <p
              className="text-[10px] mt-0.5 opacity-70"
              style={{ color: currentHeroTheme.brownMuted }}
            >
              Meta energética NRC
            </p>
          </div>

          <div
            className="sm:border-l sm:pl-3"
            style={{ borderColor: `${currentHeroTheme.brownPrimary}20` }}
          >
            <p className="text-[11px] font-medium" style={{ color: currentHeroTheme.brownMuted }}>
              Porção total
            </p>
            <div
              className="text-2xl sm:text-3xl font-black mt-0.5 tracking-tight"
              style={{ color: currentHeroTheme.brownPrimary }}
            >
              <CountUp end={activePlan?.daily_grams || 0} suffix="" />
              <span
                className="text-xs font-semibold ml-1 opacity-80"
                style={{ color: currentHeroTheme.brownTitle }}
              >
                g/dia
              </span>
            </div>
            <p
              className="text-[10px] mt-0.5 opacity-70"
              style={{ color: currentHeroTheme.brownMuted }}
            >
              Pesagem precisa
            </p>
          </div>

          <div
            className="border-t sm:border-t-0 sm:border-l pt-2 sm:pt-0 sm:pl-3"
            style={{ borderColor: `${currentHeroTheme.brownPrimary}20` }}
          >
            <p className="text-[11px] font-medium" style={{ color: currentHeroTheme.brownMuted }}>
              Refeições
            </p>
            <div
              className="text-2xl sm:text-3xl font-black mt-0.5 tracking-tight"
              style={{ color: currentHeroTheme.brownTitle }}
            >
              <CountUp end={activePlan?.meals_per_day || meals.length} />
              <span
                className="text-xs font-semibold ml-1 opacity-80"
                style={{ color: currentHeroTheme.brownTitle }}
              >
                x/dia
              </span>
            </div>
            <p
              className="text-[10px] mt-0.5 opacity-70"
              style={{ color: currentHeroTheme.brownMuted }}
            >
              Fracionamento diário
            </p>
          </div>

          <div
            className="border-t sm:border-t-0 sm:border-l pt-2 sm:pt-0 sm:pl-3"
            style={{ borderColor: `${currentHeroTheme.brownPrimary}20` }}
          >
            <p className="text-[11px] font-medium" style={{ color: currentHeroTheme.brownMuted }}>
              Peso atual
            </p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span
                className="text-2xl sm:text-3xl font-black tracking-tight"
                style={{ color: currentHeroTheme.brownTitle }}
              >
                {currentWeight}
              </span>
              <span className="text-xs font-bold" style={{ color: currentHeroTheme.brownPrimary }}>
                kg
              </span>
            </div>
            <div className="text-[10px] mt-0.5 flex items-center gap-1">
              {weightVariation === null ? (
                <span style={{ color: currentHeroTheme.brownMuted }}>1ª pesagem registrada</span>
              ) : weightVariation > 0 ? (
                <span
                  className="font-semibold flex items-center gap-0.5"
                  style={{ color: currentHeroTheme.brownPrimary }}
                >
                  <TrendingUp className="w-3 h-3" />+{weightVariation} kg última vez
                </span>
              ) : weightVariation < 0 ? (
                <span
                  className="font-semibold flex items-center gap-0.5"
                  style={{ color: currentHeroTheme.brownPrimary }}
                >
                  <TrendingDown className="w-3 h-3" />
                  {weightVariation} kg última vez
                </span>
              ) : (
                <span
                  style={{ color: currentHeroTheme.brownMuted }}
                  className="flex items-center gap-0.5"
                >
                  <Minus className="w-3 h-3" />
                  Estável desde última
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Meals horizontal pills */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-xs font-semibold flex items-center gap-1.5"
              style={{ color: currentHeroTheme.brownTitle }}
            >
              <Clock className="w-3.5 h-3.5" style={{ color: currentHeroTheme.brownPrimary }} />
              Próximas Refeições
            </span>
            <span
              className="text-[10px] font-medium"
              style={{ color: currentHeroTheme.brownPrimary }}
            >
              1ª refeição destacada
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {meals.map((meal, idx) => {
              const isNext = idx === 0
              return (
                <button
                  key={meal.id || idx}
                  onClick={() =>
                    activeDog ? navigate(`/caes/${activeDog.id}/plano`) : navigate('/caes')
                  }
                  className="relative flex-1 min-w-[110px] p-3 rounded-2xl text-left border transition-all duration-200 cursor-pointer backdrop-blur-md hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    backgroundColor: isNext
                      ? 'rgba(229, 168, 105, 0.12)'
                      : 'rgba(255, 255, 255, 0.02)',
                    borderColor: isNext
                      ? `${currentHeroTheme.brownPrimary}70`
                      : `${currentHeroTheme.brownPrimary}20`,
                  }}
                >
                  <div className="flex items-center justify-between gap-1">
                    <p
                      className="text-[11px] font-semibold truncate"
                      style={{ color: currentHeroTheme.brownMuted }}
                    >
                      {meal.label}
                    </p>
                    {isNext && (
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ backgroundColor: currentHeroTheme.brownPrimary }}
                      />
                    )}
                  </div>
                  <p
                    className="text-base font-extrabold mt-0.5"
                    style={{ color: currentHeroTheme.brownTitle }}
                  >
                    {formatPortion(meal.grams)}
                    <span
                      className="text-xs font-normal ml-0.5 opacity-70"
                      style={{ color: currentHeroTheme.brownMuted }}
                    >
                      g
                    </span>
                  </p>
                  {meal.time && (
                    <span
                      className="text-[10px] font-medium block mt-0.5"
                      style={{ color: currentHeroTheme.brownPrimary }}
                    >
                      {meal.time}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 5. MÓDULOS CIENTÍFICOS ESSENCIAIS — HORIZONTAIS E CLICÁVEIS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: currentHeroTheme.brownMuted }}
          >
            Módulos Nutricionais Essenciais
          </h2>
          <span
            className="text-[11px] font-medium"
            style={{ color: currentHeroTheme.brownPrimary }}
          >
            Acesso direto
          </span>
        </div>

        <div className="bichu-essential-grid flex flex-col gap-2.5">
          {/* 1. Cálculo RER / MER (Horizontal & Clicável → /caes/:id/plano) */}
          <button
            type="button"
            onClick={() =>
              activeDog ? navigate(`/caes/${activeDog.id}/plano`) : navigate('/caes')
            }
            className="group w-full p-4 rounded-3xl backdrop-blur-md border text-left cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.985] flex items-center justify-between gap-4"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderColor: `${currentHeroTheme.brownPrimary}25`,
            }}
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105"
                style={{
                  backgroundColor: `${currentHeroTheme.brownPrimary}18`,
                  borderColor: `${currentHeroTheme.brownPrimary}35`,
                  color: currentHeroTheme.brownPrimary,
                }}
              >
                <Soup className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="font-bold text-sm tracking-tight"
                    style={{ color: currentHeroTheme.brownTitle }}
                  >
                    Cálculo RER / MER
                  </span>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0"
                    style={{
                      backgroundColor: `${currentHeroTheme.brownPrimary}15`,
                      borderColor: `${currentHeroTheme.brownPrimary}30`,
                      color: currentHeroTheme.brownPrimary,
                    }}
                  >
                    {activePlan?.daily_kcal ? `${activePlan.daily_kcal} kcal/dia` : 'NRC / WSAVA'}
                  </span>
                </div>
                <p
                  className="text-xs leading-relaxed line-clamp-2 mt-0.5"
                  style={{ color: currentHeroTheme.brownBody }}
                >
                  Calorias de repouso exatas ajustadas pelo fator metabólico individual.
                </p>
              </div>
            </div>
            <ChevronRight
              className="w-5 h-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
              style={{ color: currentHeroTheme.brownPrimary }}
            />
          </button>

          {/* 2. Gramas por Refeição (Horizontal & Clicável → plano de alimentação) */}
          <button
            type="button"
            onClick={() =>
              activeDog ? navigate(`/caes/${activeDog.id}/plano`) : navigate('/caes')
            }
            className="group w-full p-4 rounded-3xl backdrop-blur-md border text-left cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.985] flex items-center justify-between gap-4"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderColor: `${currentHeroTheme.brownPrimary}25`,
            }}
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105"
                style={{
                  backgroundColor: `${currentHeroTheme.brownPrimary}18`,
                  borderColor: `${currentHeroTheme.brownPrimary}35`,
                  color: currentHeroTheme.brownPrimary,
                }}
              >
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="font-bold text-sm tracking-tight"
                    style={{ color: currentHeroTheme.brownTitle }}
                  >
                    Gramas por Refeição
                  </span>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0"
                    style={{
                      backgroundColor: `${currentHeroTheme.brownPrimary}15`,
                      borderColor: `${currentHeroTheme.brownPrimary}30`,
                      color: currentHeroTheme.brownPrimary,
                    }}
                  >
                    {activePlan?.daily_grams
                      ? `${formatPortion(activePlan.daily_grams)} g diárias`
                      : `${meals.length} porções`}
                  </span>
                </div>
                <p
                  className="text-xs leading-relaxed line-clamp-2 mt-0.5"
                  style={{ color: currentHeroTheme.brownBody }}
                >
                  Distribuição por horário para digestão equilibrada ao longo do dia.
                </p>
              </div>
            </div>
            <ChevronRight
              className="w-5 h-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
              style={{ color: currentHeroTheme.brownPrimary }}
            />
          </button>

          {/* 3. Controle de Peso (Horizontal & Clicável → /caes/:id/peso) */}
          <button
            type="button"
            onClick={() => (activeDog ? navigate(`/caes/${activeDog.id}/peso`) : navigate('/caes'))}
            className="group w-full p-4 rounded-3xl backdrop-blur-md border text-left cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.985] flex items-center justify-between gap-4"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderColor: `${currentHeroTheme.brownPrimary}25`,
            }}
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105"
                style={{
                  backgroundColor: `${currentHeroTheme.brownPrimary}18`,
                  borderColor: `${currentHeroTheme.brownPrimary}35`,
                  color: currentHeroTheme.brownPrimary,
                }}
              >
                <Scale className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="font-bold text-sm tracking-tight"
                    style={{ color: currentHeroTheme.brownTitle }}
                  >
                    Controle de Peso
                  </span>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0"
                    style={{
                      backgroundColor: `${currentHeroTheme.brownPrimary}15`,
                      borderColor: `${currentHeroTheme.brownPrimary}30`,
                      color: currentHeroTheme.brownPrimary,
                    }}
                  >
                    {currentWeight > 0 ? `${currentWeight} kg atual` : 'Histórico'}
                  </span>
                </div>
                <p
                  className="text-xs leading-relaxed line-clamp-2 mt-0.5"
                  style={{ color: currentHeroTheme.brownBody }}
                >
                  Histórico com variação desde a última pesagem e prevenção de sobrepeso.
                </p>
              </div>
            </div>
            <ChevronRight
              className="w-5 h-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
              style={{ color: currentHeroTheme.brownPrimary }}
            />
          </button>
        </div>
      </div>

      {/* 5.5. COMUNIDADE, PROFISSIONAIS & MATCHING (Destaques da Nova Expansão) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: currentHeroTheme.brownMuted }}
            >
              Comunidade & Serviços Pet
            </h2>
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${currentHeroTheme.brownPrimary}25`,
                color: currentHeroTheme.brownPrimary,
              }}
            >
              Novidade
            </span>
          </div>
          <span
            className="text-[11px] font-medium"
            style={{ color: currentHeroTheme.brownPrimary }}
          >
            Rede & Conexões
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {/* 2. Catálogo de Profissionais */}
          <div
            onClick={() => navigate('/profissionais')}
            className="p-4 rounded-3xl border transition-all duration-200 cursor-pointer select-none flex flex-col justify-between backdrop-blur-md hover:scale-[1.02] active:scale-[0.98] shadow-md group"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderColor: `${currentHeroTheme.brownPrimary}30`,
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-2xl border flex items-center justify-center text-lg"
                  style={{
                    backgroundColor: `${currentHeroTheme.brownPrimary}18`,
                    borderColor: `${currentHeroTheme.brownPrimary}40`,
                    color: currentHeroTheme.brownPrimary,
                  }}
                >
                  🩺
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: `${currentHeroTheme.brownPrimary}15`,
                    borderColor: `${currentHeroTheme.brownPrimary}30`,
                    color: currentHeroTheme.brownPrimary,
                  }}
                >
                  Especialistas
                </span>
              </div>
              <h3
                className="font-bold text-sm tracking-tight"
                style={{ color: currentHeroTheme.brownTitle }}
              >
                Profissionais & Serviços
              </h3>
              <p
                className="text-xs mt-1 leading-snug"
                style={{ color: currentHeroTheme.brownBody }}
              >
                Veterinários, canicultores, adestradores e creches do guia regional.
              </p>
            </div>
            <div
              className="mt-3 pt-2 border-t flex items-center justify-between text-[11px] font-bold"
              style={{
                borderColor: `${currentHeroTheme.brownPrimary}18`,
                color: currentHeroTheme.brownPrimary,
              }}
            >
              <span>Buscar especialistas</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>


        </div>
      </div>

      {/* 6. DEMAIS MÓDULOS DO ECOSSISTEMA */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: currentHeroTheme.brownMuted }}
          >
            Mais Módulos Meu Bichu
          </h2>
          <span className="text-xs" style={{ color: currentHeroTheme.brownMuted }}>
            Ferramentas & Integrações
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {modules
            .filter((m) => m.id !== 'nutrition' && m.id !== 'weight')
            .map((m) => {
              const Icon = m.icon
              const isShaking = shakingModule === m.id
              return (
                <div
                  key={m.id}
                  onClick={() => handleModuleClick(m)}
                  className={`relative p-4 rounded-3xl border transition-all duration-200 cursor-pointer select-none flex flex-col justify-between backdrop-blur-md ${
                    m.active
                      ? 'hover:scale-[1.02] active:scale-[0.98] shadow-md'
                      : 'opacity-75 hover:opacity-90'
                  } ${isShaking ? 'animate-shake' : ''}`}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderColor: m.active
                      ? `${currentHeroTheme.brownPrimary}35`
                      : `${currentHeroTheme.brownPrimary}15`,
                  }}
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="w-10 h-10 rounded-2xl border flex items-center justify-center"
                        style={{
                          backgroundColor: m.active
                            ? `${currentHeroTheme.brownPrimary}18`
                            : 'rgba(255, 255, 255, 0.05)',
                          borderColor: m.active
                            ? `${currentHeroTheme.brownPrimary}40`
                            : 'rgba(255, 255, 255, 0.1)',
                          color: m.active
                            ? currentHeroTheme.brownPrimary
                            : currentHeroTheme.brownMuted,
                        }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      {m.active ? (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                          style={{
                            backgroundColor: `${currentHeroTheme.brownPrimary}18`,
                            color: currentHeroTheme.brownPrimary,
                            borderColor: `${currentHeroTheme.brownPrimary}35`,
                          }}
                        >
                          {m.tag}
                        </span>
                      ) : (
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.04)',
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            color: currentHeroTheme.brownMuted,
                          }}
                        >
                          <Lock className="w-2.5 h-2.5" />
                          {m.tag}
                        </span>
                      )}
                    </div>

                    <h3
                      className="font-bold text-sm tracking-tight"
                      style={{ color: currentHeroTheme.brownTitle }}
                    >
                      {m.title}
                    </h3>
                    <p
                      className="text-xs mt-1 leading-snug"
                      style={{ color: currentHeroTheme.brownBody }}
                    >
                      {m.subtitle}
                    </p>
                  </div>

                  <div
                    className="mt-3.5 pt-2 border-t flex items-center justify-between text-[11px]"
                    style={{
                      borderColor: `${currentHeroTheme.brownPrimary}18`,
                      color: currentHeroTheme.brownMuted,
                    }}
                  >
                    <span>{m.active ? 'Acessar módulo' : 'Em desenvolvimento'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Weight Sheet modal */}
      <WeightSheet
        open={weightSheetOpen}
        onOpenChange={setWeightSheetOpen}
        dog={activeDog}
        onSaved={() => {
          refreshDogs()
          refreshActivePlan()
          if (activeDog?.id) {
            nutritionService.getWeightLogs(activeDog.id).then(setWeightLogs)
          }
        }}
      />

      {/* Hero / Interface Selector Modal */}
      <HeroSelectorModal
        open={heroSelectorOpen}
        onClose={() => setHeroSelectorOpen(false)}
        currentThemeId={currentHeroTheme.id}
        onSelectTheme={handleSelectHeroTheme}
        activeDog={activeDog}
        suggestedTheme={suggestedTheme}
      />
    </div>
  )
}

export default Index
