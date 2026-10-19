import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Heart,
  X,
  Star,
  MapPin,
  Sparkles,
  Award,
  RotateCcw,
  CheckCircle2,
  Phone,
  MessageCircle,
  Briefcase,
  Flame,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter,
  SlidersHorizontal,
  Compass,
  Check,
  Info,
} from 'lucide-react'
import { communityService } from '@/services/community'
import { useAuth } from '@/contexts/AuthContext'
import { useDog } from '@/contexts/DogContext'
import { useActiveHeroTheme } from '@/hooks/use-active-hero-theme'
import { nutritionService } from '@/services/nutrition'
import { getTutorName } from '@/lib/tutor'
import { toast } from 'sonner'
import type { ProfessionalRecord, ProfessionalCategory, PetMatchRecord } from '@/types/community'
import type { DogRecord } from '@/types/nutrition'
import { CATEGORY_LABELS } from './ProfessionalsList'

// Categorias para o seletor estilo Tinder
const DISCOVER_FILTERS: {
  key: string
  label: string
  icon: string
  mode: 'all' | 'professionals' | 'dogs'
}[] = [
  { key: 'todos', label: 'Todos', icon: '✨', mode: 'all' },
  { key: 'cruzamento_pets', label: 'Cruzamento de Pets', icon: '🐶', mode: 'dogs' },
  { key: 'canicultor', label: 'Canicultores & Criadores', icon: '🐾', mode: 'professionals' },
  { key: 'veterinario', label: 'Clínicas Veterinárias', icon: '🩺', mode: 'professionals' },
  { key: 'creche', label: 'Creches & Hotéis', icon: '🏡', mode: 'professionals' },
  { key: 'adestrador', label: 'Adestradores & Comportamento', icon: '🦮', mode: 'professionals' },
  { key: 'dogwalker', label: 'Dog Walkers', icon: '🚶', mode: 'professionals' },
  { key: 'banho_tosa', label: 'Banho & Tosa', icon: '✂️', mode: 'professionals' },
  { key: 'casa_racao', label: 'Casas de Ração', icon: '🥩', mode: 'professionals' },
  { key: 'petshop', label: 'Pet Shops', icon: '🛍️', mode: 'professionals' },
]

type CardItem =
  | { type: 'professional'; data: ProfessionalRecord }
  | { type: 'dog'; data: DogRecord }

export default function DiscoverMatchesPage() {
  const { user, profile, isAuthenticated } = useAuth()
  const { dogs, activeDog } = useDog()
  const { theme: activeHeroTheme } = useActiveHeroTheme(activeDog)
  const navigate = useNavigate()

  const [filterCategory, setFilterCategory] = useState<string>('todos')
  const [cityFilter, setCityFilter] = useState<string>('')
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0)
  const [deck, setDeck] = useState<CardItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Modal / Feedback É um match!
  const [matchModalOpen, setMatchModalOpen] = useState(false)
  const [matchedItem, setMatchedItem] = useState<CardItem | null>(null)

  // Filtros avançados drawer/toggle
  const [showFilters, setShowFilters] = useState(false)

  // Portão 18+ de confirmação de maioridade (sessionStorage: bichu_age_verified_18)
  const [ageVerified, setAgeVerified] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    try {
      return sessionStorage.getItem('bichu_age_verified_18') === 'true'
    } catch {
      return false
    }
  })

  // Modal ou aba de Seus Matches
  const [viewMode, setViewMode] = useState<'swipe' | 'matches'>('swipe')
  const [userMatches, setUserMatches] = useState<PetMatchRecord[]>([])
  const [matchedPros, setMatchedPros] = useState<ProfessionalRecord[]>([])
  const [matchedDogs, setMatchedDogs] = useState<DogRecord[]>([])

  useEffect(() => {
    loadDeck()
  }, [filterCategory, cityFilter, minRatingFilter])

  useEffect(() => {
    if (viewMode === 'matches') {
      loadMatches()
    }
  }, [viewMode])

  const loadDeck = async () => {
    setLoading(true)
    try {
      const activeFilterObj = DISCOVER_FILTERS.find((f) => f.key === filterCategory)
      const mode = activeFilterObj ? activeFilterObj.mode : 'all'

      let proList: ProfessionalRecord[] = []
      let dogList: DogRecord[] = []

      if (mode === 'all' || mode === 'professionals') {
        const cat =
          filterCategory === 'todos' || filterCategory === 'cruzamento_pets'
            ? undefined
            : (filterCategory as ProfessionalCategory)
        proList = await communityService.getProfessionals(cat)
      }

      if (mode === 'all' || mode === 'dogs') {
        dogList = await communityService.getBreedingDogs()
      }

      // Filtragem por Cidade
      if (cityFilter.trim()) {
        const query = cityFilter.trim().toLowerCase()
        proList = proList.filter(
          (p) =>
            p.city?.toLowerCase().includes(query) ||
            p.state?.toLowerCase().includes(query) ||
            p.address?.toLowerCase().includes(query),
        )
        // Cães não possuem coluna direta de cidade, mas podem ser filtrados por raça/nome se aplicável
      }

      // Filtragem por Avaliação Mínima
      if (minRatingFilter > 0) {
        proList = proList.filter((p) => (p.rating_avg || 5) >= minRatingFilter)
      }

      // Não mostrar o próprio pet ativo no deck de cães
      if (activeDog) {
        dogList = dogList.filter((d) => d.id !== activeDog.id)
      }

      // Montar os itens do deck intercalados ou combinados
      const combined: CardItem[] = []
      if (mode === 'dogs') {
        dogList.forEach((d) => combined.push({ type: 'dog', data: d }))
      } else if (mode === 'professionals') {
        proList.forEach((p) => combined.push({ type: 'professional', data: p }))
      } else {
        // 'all': adiciona profissionais e cães para uma experiência rica e diversa
        const maxLen = Math.max(proList.length, dogList.length)
        for (let i = 0; i < maxLen; i++) {
          if (proList[i]) combined.push({ type: 'professional', data: proList[i] })
          if (dogList[i]) combined.push({ type: 'dog', data: dogList[i] })
        }
      }

      setDeck(combined)
      setCurrentIndex(0)
    } finally {
      setLoading(false)
    }
  }

  const loadMatches = async () => {
    if (!isAuthenticated) return
    try {
      const matches = await communityService.getUserMatches()
      setUserMatches(matches)

      const proIds = new Set(
        matches.filter((m) => m.target_type === 'professional').map((m) => m.target_id),
      )
      const dogIds = new Set(matches.filter((m) => m.target_type === 'dog').map((m) => m.target_id))

      const allPros = await communityService.getProfessionals()
      const allDogs = await communityService.getBreedingDogs()

      setMatchedPros(allPros.filter((p) => proIds.has(p.id)))
      setMatchedDogs(allDogs.filter((d) => dogIds.has(d.id)))
    } catch (e) {
      console.warn('Erro ao carregar matches:', e)
    }
  }

  const handleAction = async (action: 'like' | 'pass') => {
    const currentCard = deck[currentIndex]
    if (!currentCard) return

    if (!isAuthenticated) {
      setSwipeDirection(action === 'like' ? 'right' : 'left')
      if (action === 'like') {
        setMatchedItem(currentCard)
        setMatchModalOpen(true)
        toast.info('Modo demonstração: Match simulado!')
      }
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1)
        setSwipeDirection(null)
        setDragOffset({ x: 0, y: 0 })
      }, 280)
      return
    }

    setSwipeDirection(action === 'like' ? 'right' : 'left')

    try {
      const res = await communityService.recordMatchAction(
        currentCard.type,
        currentCard.data.id,
        action,
      )

      // Se for like e reciprocado, ou simulado para alta taxa de conexão com especialistas
      if (action === 'like') {
        const isMutual = res.is_mutual || currentCard.type === 'professional'
        if (isMutual) {
          setMatchedItem(currentCard)
          setMatchModalOpen(true)
        }
      }
    } catch (err) {
      console.error(err)
    }

    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1)
      setSwipeDirection(null)
      setDragOffset({ x: 0, y: 0 })
    }, 280)
  }

  // Gestos de toque e arrastar nativos fluidos
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    setDragOffset({ x: dx, y: dy })
  }

  const handlePointerUp = () => {
    if (!isDragging) return
    setIsDragging(false)
    if (dragOffset.x > 85) {
      handleAction('like')
    } else if (dragOffset.x < -85) {
      handleAction('pass')
    } else {
      setDragOffset({ x: 0, y: 0 })
    }
  }

  const currentItem = deck[currentIndex]

  const tutorDisplayName = profile?.display_name || getTutorName() || 'Tutor'
  const petOrTutorAvatar = activeDog
    ? nutritionService.getAvatarUrl(activeDog)
    : profile?.avatar
      ? communityService.getMediaUrl(profile as unknown as Record<string, unknown>, profile.avatar)
      : null

  const handleConfirmAge = () => {
    try {
      sessionStorage.setItem('bichu_age_verified_18', 'true')
    } catch {
      // sessionStorage não disponível
    }
    setAgeVerified(true)
  }

  const handleDeclineAge = () => {
    toast.info('Acesso restrito a maiores de 18 anos.')
    navigate('/')
  }

  return (
    <div className="space-y-6 pb-24 max-w-xl mx-auto">
      {/* Modal Portão 18+ */}
      {!ageVerified && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div
            className="w-full max-w-sm rounded-3xl border p-6 text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95"
            style={{
              backgroundColor: 'rgba(18, 18, 18, 0.96)',
              borderColor: `${activeHeroTheme.brownPrimary}40`,
            }}
          >
            <div
              className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-xl font-black border"
              style={{
                backgroundColor: `${activeHeroTheme.brownPrimary}20`,
                borderColor: `${activeHeroTheme.brownPrimary}50`,
                color: activeHeroTheme.brownPrimary,
              }}
            >
              18+
            </div>

            <div className="space-y-1.5">
              <h2
                className="text-lg font-black tracking-tight"
                style={{ color: activeHeroTheme.brownTitle }}
              >
                Confirmação de Maioridade
              </h2>
              <p className="text-xs leading-relaxed" style={{ color: activeHeroTheme.brownMuted }}>
                A área de conexões, acasalamento canino responsável e contratação de serviços é
                destinada exclusivamente a maiores de 18 anos.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmAge}
                className="w-full py-3 rounded-2xl text-xs font-bold cursor-pointer transition hover:opacity-90 shadow-lg"
                style={{
                  backgroundColor: activeHeroTheme.brownPrimary,
                  color: activeHeroTheme.bgColor,
                }}
              >
                Tenho 18 anos ou mais • Continuar
              </button>

              <button
                type="button"
                onClick={handleDeclineAge}
                className="w-full py-2.5 rounded-2xl text-xs font-semibold text-neutral-400 hover:text-white transition cursor-pointer"
              >
                Voltar ao Início
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header & Abas (Descobrir vs Seus Matches) + Avatar do Tutor/Pet */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1"
              style={{
                backgroundColor: `${activeHeroTheme.brownPrimary}20`,
                borderColor: `${activeHeroTheme.brownPrimary}40`,
                color: activeHeroTheme.brownPrimary,
              }}
            >
              <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse" />
              Descobrir & Conectar
            </span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-black tracking-tight mt-1"
            style={{ color: activeHeroTheme.brownTitle }}
          >
            {viewMode === 'swipe' ? 'Matching Pet & Especialistas' : 'Seus Matches & Conexões'}
          </h1>
        </div>

        {/* Canto superior direito: Avatar circular do tutor/pet com nome */}
        <Link
          to="/configuracoes"
          className="flex items-center gap-2 p-1.5 pr-2.5 rounded-full border transition hover:opacity-90 shrink-0"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            borderColor: `${activeHeroTheme.brownPrimary}35`,
          }}
          title="Ver perfil e configurações"
        >
          <div
            className="w-8 h-8 rounded-full overflow-hidden border flex items-center justify-center text-xs font-bold shrink-0 bg-neutral-900"
            style={{ borderColor: activeHeroTheme.brownPrimary }}
          >
            {petOrTutorAvatar ? (
              <img
                src={petOrTutorAvatar}
                alt={tutorDisplayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{activeDog ? '🐾' : '👤'}</span>
            )}
          </div>
          <span
            className="text-xs font-bold max-w-[80px] sm:max-w-[110px] truncate"
            style={{ color: activeHeroTheme.brownTitle }}
          >
            {activeDog?.name || tutorDisplayName}
          </span>
        </Link>
      </div>

      {/* Toggle Swipe / Matches */}
      <div className="flex justify-end">
        <div
          className="p-1 rounded-2xl border flex items-center gap-1 shadow-sm"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            borderColor: `${activeHeroTheme.brownPrimary}30`,
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode('swipe')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
              viewMode === 'swipe' ? 'shadow-sm' : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: viewMode === 'swipe' ? activeHeroTheme.brownPrimary : 'transparent',
              color: viewMode === 'swipe' ? activeHeroTheme.bgColor : activeHeroTheme.brownTitle,
            }}
          >
            Descobrir
          </button>
          <button
            type="button"
            onClick={() => setViewMode('matches')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1 ${
              viewMode === 'matches' ? 'shadow-sm' : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor:
                viewMode === 'matches' ? activeHeroTheme.brownPrimary : 'transparent',
              color: viewMode === 'matches' ? activeHeroTheme.bgColor : activeHeroTheme.brownTitle,
            }}
          >
            <Heart className="w-3.5 h-3.5 fill-current text-rose-400" />
            <span>Matches</span>
            {userMatches.length > 0 && (
              <span
                className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-black"
                style={{
                  backgroundColor:
                    viewMode === 'matches' ? activeHeroTheme.bgColor : activeHeroTheme.brownPrimary,
                  color:
                    viewMode === 'matches' ? activeHeroTheme.brownPrimary : activeHeroTheme.bgColor,
                }}
              >
                {userMatches.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {viewMode === 'swipe' ? (
        <>
          {/* Barra de Filtros Rápidos (Categorias deslizáveis) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {DISCOVER_FILTERS.map((item) => {
                const selected = filterCategory === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilterCategory(item.key)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 border shadow-sm ${
                      selected ? 'scale-[1.02]' : 'hover:bg-white/5 opacity-80'
                    }`}
                    style={{
                      backgroundColor: selected
                        ? `${activeHeroTheme.brownPrimary}35`
                        : 'rgba(0, 0, 0, 0.3)',
                      borderColor: selected
                        ? activeHeroTheme.brownPrimary
                        : 'rgba(255, 255, 255, 0.08)',
                      color: selected ? activeHeroTheme.brownTitle : activeHeroTheme.brownMuted,
                    }}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Toggle de Critérios de Match (Distância, Cidade, Avaliação) */}
            <div className="flex items-center justify-between text-xs px-1">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1.5 font-bold cursor-pointer transition hover:opacity-90"
                style={{ color: activeHeroTheme.brownPrimary }}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>
                  {showFilters
                    ? 'Ocultar critérios de busca'
                    : 'Refinar critérios (cidade, avaliações)'}
                </span>
                {(cityFilter || minRatingFilter > 0) && (
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>

              <span
                className="text-[11px] opacity-70"
                style={{ color: activeHeroTheme.brownMuted }}
              >
                {deck.length > 0 ? `${deck.length - currentIndex} perfis no deck` : ''}
              </span>
            </div>

            {/* Caixa retrátil de critérios */}
            {showFilters && (
              <div
                className="p-3.5 rounded-2xl border space-y-3 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.35)',
                  borderColor: `${activeHeroTheme.brownPrimary}25`,
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label
                      className="text-[11px] font-bold"
                      style={{ color: activeHeroTheme.brownMuted }}
                    >
                      Cidade ou Região
                    </label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                      <input
                        type="text"
                        value={cityFilter}
                        onChange={(e) => setCityFilter(e.target.value)}
                        placeholder="Ex: São Paulo, Campinas..."
                        className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border bg-black/40 outline-none focus:border-primary"
                        style={{
                          borderColor: `${activeHeroTheme.brownPrimary}30`,
                          color: activeHeroTheme.brownTitle,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label
                      className="text-[11px] font-bold"
                      style={{ color: activeHeroTheme.brownMuted }}
                    >
                      Avaliação Mínima
                    </label>
                    <select
                      value={minRatingFilter}
                      onChange={(e) => setMinRatingFilter(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 rounded-xl border bg-black/40 outline-none"
                      style={{
                        borderColor: `${activeHeroTheme.brownPrimary}30`,
                        color: activeHeroTheme.brownTitle,
                      }}
                    >
                      <option value="0">Qualquer avaliação</option>
                      <option value="4.5">⭐ 4.5+ estrelas</option>
                      <option value="4.8">⭐⭐ 4.8+ excelência</option>
                      <option value="5">⭐⭐⭐ 5.0 estrelas</option>
                    </select>
                  </div>
                </div>

                {(cityFilter || minRatingFilter > 0) && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCityFilter('')
                        setMinRatingFilter(0)
                      }}
                      className="text-[11px] font-bold underline cursor-pointer"
                      style={{ color: activeHeroTheme.brownPrimary }}
                    >
                      Limpar filtros
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Área do Card Deslizável Estilo Tinder */}
          <div className="relative w-full aspect-[4/5] max-h-[580px] select-none touch-none">
            {loading ? (
              <div
                className="w-full h-full rounded-3xl border flex flex-col items-center justify-center p-6 text-center space-y-3"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderColor: `${activeHeroTheme.brownPrimary}20`,
                }}
              >
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-primary animate-spin" />
                <p
                  className="text-xs font-semibold animate-pulse"
                  style={{ color: activeHeroTheme.brownMuted }}
                >
                  Preparando perfis selecionados para você...
                </p>
              </div>
            ) : !currentItem ? (
              <div
                className="w-full h-full rounded-3xl border flex flex-col items-center justify-center text-center p-8 space-y-4 backdrop-blur-2xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderColor: `${activeHeroTheme.brownPrimary}30`,
                }}
              >
                <Sparkles className="w-12 h-12" style={{ color: activeHeroTheme.brownPrimary }} />
                <div className="space-y-1">
                  <h3
                    className="text-base font-black"
                    style={{ color: activeHeroTheme.brownTitle }}
                  >
                    Você visualizou todos os perfis disponíveis!
                  </h3>
                  <p
                    className="text-xs max-w-xs mx-auto leading-relaxed"
                    style={{ color: activeHeroTheme.brownMuted }}
                  >
                    Alterne o filtro acima para explorar outras categorias ou reinicie o deck para
                    rever oportunidades.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentIndex(0)}
                  className="px-6 py-2.5 rounded-2xl text-xs font-bold cursor-pointer transition flex items-center gap-2 hover:scale-105 active:scale-95 shadow-md"
                  style={{
                    backgroundColor: activeHeroTheme.brownPrimary,
                    color: activeHeroTheme.bgColor,
                  }}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Ver Novamente</span>
                </button>
              </div>
            ) : (
              (() => {
                const rotation = dragOffset.x * 0.08
                const opacity = Math.max(0.7, 1 - Math.abs(dragOffset.x) / 500)

                const isDog = currentItem.type === 'dog'
                const dogData = isDog ? currentItem.data : null
                const profData = !isDog ? currentItem.data : null

                const catInfo = profData
                  ? CATEGORY_LABELS[profData.category] || { label: profData.category, icon: '⭐' }
                  : { label: 'Cruzamento & Genética', icon: '🐾' }

                const avatarUrl = isDog
                  ? nutritionService.getAvatarUrl(dogData!)
                  : communityService.getMediaUrl(
                      profData as unknown as Record<string, unknown>,
                      profData?.avatar,
                    )

                return (
                  <div
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className={`w-full h-full rounded-3xl border overflow-hidden backdrop-blur-2xl shadow-2xl flex flex-col justify-between transition-transform cursor-grab active:cursor-grabbing ${
                      swipeDirection === 'left'
                        ? '-translate-x-full rotate-[-20deg] opacity-0 duration-300'
                        : swipeDirection === 'right'
                          ? 'translate-x-full rotate-[20deg] opacity-0 duration-300'
                          : isDragging
                            ? ''
                            : 'duration-200'
                    }`}
                    style={{
                      transform: isDragging
                        ? `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`
                        : undefined,
                      opacity: isDragging ? opacity : undefined,
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      borderColor: `${activeHeroTheme.brownPrimary}35`,
                    }}
                  >
                    {/* Indicadores visuais dinâmicos de LIKE ou PASS ao arrastar */}
                    {dragOffset.x > 30 && (
                      <div className="absolute top-6 left-6 z-30 px-4 py-1.5 rounded-2xl border-2 border-emerald-400 text-emerald-400 font-black text-sm tracking-widest rotate-[-12deg] bg-black/70 shadow-lg backdrop-blur-md">
                        {isDog ? 'CRUZAR / MATCH' : 'CONECTAR'}
                      </div>
                    )}
                    {dragOffset.x < -30 && (
                      <div className="absolute top-6 right-6 z-30 px-4 py-1.5 rounded-2xl border-2 border-rose-500 text-rose-500 font-black text-sm tracking-widest rotate-[12deg] bg-black/70 shadow-lg backdrop-blur-md">
                        PASSAR
                      </div>
                    )}

                    {/* Badge superior da categoria */}
                    <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md text-[11px] font-bold text-white shadow">
                      <span>{catInfo.icon}</span>
                      <span>{isDog ? dogData?.breed || 'Canino' : catInfo.label}</span>
                    </div>

                    {/* Foto / Imagem Principal do Card */}
                    <div className="relative flex-1 bg-neutral-950 flex items-center justify-center overflow-hidden">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={isDog ? dogData?.name : profData?.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex flex-col items-center justify-center p-6 text-center"
                          style={{
                            backgroundColor: `${activeHeroTheme.brownPrimary}15`,
                          }}
                        >
                          <span className="text-8xl mb-3">{isDog ? '🐶' : catInfo.icon}</span>
                          <span
                            className="font-black text-base"
                            style={{ color: activeHeroTheme.brownPrimary }}
                          >
                            {isDog ? dogData?.name : profData?.name}
                          </span>
                          <span className="text-xs text-neutral-400 mt-1">
                            {isDog ? dogData?.breed || 'SRD' : catInfo.label}
                          </span>
                        </div>
                      )}

                      {/* Gradiente de leitura sobre a foto */}
                      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black via-black/70 to-transparent" />

                      {/* Informações primárias sobrepostas */}
                      <div className="absolute inset-x-0 bottom-0 p-5 text-white space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-black drop-shadow-md">
                              {isDog ? dogData?.name : profData?.name}
                            </h2>
                            {profData?.verified && (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                            )}
                          </div>

                          {profData && (
                            <div className="flex items-center gap-1 text-amber-400 font-black text-xs px-2.5 py-1 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <span>
                                {profData.rating_avg ? profData.rating_avg.toFixed(1) : '5.0'}
                              </span>
                              <span className="text-[10px] text-neutral-400 font-normal">
                                ({profData.reviews_count || 1})
                              </span>
                            </div>
                          )}

                          {isDog && (
                            <div className="flex items-center gap-1 text-rose-300 font-bold text-xs px-2.5 py-1 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md">
                              <span>{dogData?.sex === 'macho' ? '♂ Macho' : '♀ Fêmea'}</span>
                              <span>•</span>
                              <span>{dogData?.weight_kg}kg</span>
                            </div>
                          )}
                        </div>

                        {/* Localização / Cidade */}
                        <p className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>
                            {isDog
                              ? `${dogData?.breed || 'Cão de Raça'} • Apto para cruzamento / companhia`
                              : `${profData?.city || 'Brasil'}${profData?.state ? `, ${profData.state}` : ''}`}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Informações detalhadas da base do card (Bio, Especialidades, Credenciais) */}
                    <div
                      className="p-4 sm:p-5 space-y-3 border-t"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.45)',
                        borderColor: `${activeHeroTheme.brownPrimary}20`,
                      }}
                    >
                      {/* Bio / Notas */}
                      <p
                        className="text-xs line-clamp-2 leading-relaxed"
                        style={{ color: activeHeroTheme.brownBody }}
                      >
                        {isDog
                          ? dogData?.notes ||
                            `Cão da raça ${dogData?.breed || 'selecionada'}, porte ${dogData?.size || 'médio'}, com temperamento equilibrado e acompanhamento de saúde em dia.`
                          : profData?.bio ||
                            `Especialista qualificado em ${catInfo.label.toLowerCase()} com atendimento de alta qualidade.`}
                      </p>

                      {/* Tags de Especialidades ou Características */}
                      <div className="flex flex-wrap gap-1.5">
                        {isDog ? (
                          <>
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-lg border"
                              style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                borderColor: `${activeHeroTheme.brownPrimary}20`,
                                color: activeHeroTheme.brownMuted,
                              }}
                            >
                              Porte {dogData?.size || 'médio'}
                            </span>
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-lg border"
                              style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                borderColor: `${activeHeroTheme.brownPrimary}20`,
                                color: activeHeroTheme.brownMuted,
                              }}
                            >
                              Atividade {dogData?.activity_level || 'moderada'}
                            </span>
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-lg border"
                              style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                borderColor: `${activeHeroTheme.brownPrimary}20`,
                                color: activeHeroTheme.brownMuted,
                              }}
                            >
                              {dogData?.sterilized ? 'Castrado' : 'Apto Reprodução'}
                            </span>
                          </>
                        ) : (
                          Array.isArray(profData?.specialties) &&
                          profData.specialties.slice(0, 3).map((spec, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-lg border"
                              style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                borderColor: `${activeHeroTheme.brownPrimary}20`,
                                color: activeHeroTheme.brownMuted,
                              }}
                            >
                              {spec}
                            </span>
                          ))
                        )}
                      </div>

                      {/* Rodapé do Card com Link de Perfil */}
                      <div className="flex items-center justify-between pt-1">
                        {profData ? (
                          <Link
                            to={`/profissionais/${profData.id}`}
                            className="text-xs font-bold underline flex items-center gap-1 transition hover:opacity-80"
                            style={{ color: activeHeroTheme.brownPrimary }}
                          >
                            <span>Ver perfil e avaliações</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        ) : (
                          <span
                            className="text-[11px] font-semibold"
                            style={{ color: activeHeroTheme.brownMuted }}
                          >
                            Deslize à direita para cruzar ou conectar
                          </span>
                        )}

                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          {isDog ? 'Match Canino' : 'Match Profissional'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })()
            )}
          </div>

          {/* Botões de Ação estilo Tinder (Passar, Voltar, Like) */}
          {currentItem && (
            <div className="flex items-center justify-center gap-6 pt-2">
              <button
                type="button"
                onClick={() => handleAction('pass')}
                className="w-14 h-14 rounded-full border-2 border-rose-500/40 bg-rose-500/10 text-rose-400 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer shadow-xl backdrop-blur-md"
                title="Passar (não no momento)"
              >
                <X className="w-7 h-7 stroke-[2.5]" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="w-10 h-10 rounded-full border border-white/10 bg-white/5 text-neutral-400 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-30 disabled:pointer-events-none shadow"
                title="Voltar ao perfil anterior"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleAction('like')}
                className="w-14 h-14 rounded-full border-2 border-emerald-500/40 bg-emerald-500/15 text-emerald-400 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer shadow-xl backdrop-blur-md"
                title="Curtir e Conectar"
              >
                <Heart className="w-7 h-7 fill-current stroke-[1.5]" />
              </button>
            </div>
          )}
        </>
      ) : (
        /* Seção "Seus Matches" com conexões realizadas */
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold" style={{ color: activeHeroTheme.brownTitle }}>
                Suas Conexões Realizadas ({matchedPros.length + matchedDogs.length})
              </h2>
              <p className="text-xs" style={{ color: activeHeroTheme.brownMuted }}>
                Perfis com os quais você demonstrou interesse mútuo.
              </p>
            </div>
          </div>

          {!isAuthenticated ? (
            <div
              className="p-8 rounded-3xl border text-center space-y-3 backdrop-blur-md"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderColor: `${activeHeroTheme.brownPrimary}20`,
              }}
            >
              <Heart className="w-10 h-10 mx-auto text-rose-500 fill-rose-500/30" />
              <div className="space-y-1">
                <h3 className="font-bold text-sm" style={{ color: activeHeroTheme.brownTitle }}>
                  Faça login para salvar seus matches
                </h3>
                <p
                  className="text-xs max-w-xs mx-auto"
                  style={{ color: activeHeroTheme.brownMuted }}
                >
                  Conecte-se com criadores, clínicas e especialistas mantendo sua lista sempre
                  acessível em qualquer dispositivo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/entrar')}
                className="px-6 py-2.5 rounded-2xl text-xs font-bold cursor-pointer transition hover:scale-105 shadow"
                style={{
                  backgroundColor: activeHeroTheme.brownPrimary,
                  color: activeHeroTheme.bgColor,
                }}
              >
                Entrar na Conta
              </button>
            </div>
          ) : matchedPros.length === 0 && matchedDogs.length === 0 ? (
            <div
              className="p-10 rounded-3xl border text-center space-y-4 backdrop-blur-md"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderColor: `${activeHeroTheme.brownPrimary}15`,
              }}
            >
              <Sparkles
                className="w-10 h-10 mx-auto"
                style={{ color: activeHeroTheme.brownMuted }}
              />
              <div className="space-y-1">
                <h3 className="font-bold text-sm" style={{ color: activeHeroTheme.brownTitle }}>
                  Você ainda não possui matches salvos
                </h3>
                <p
                  className="text-xs max-w-sm mx-auto"
                  style={{ color: activeHeroTheme.brownMuted }}
                >
                  Explore os cards na aba Descobrir e curta criadores de cães ou especialistas do
                  seu interesse!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewMode('swipe')}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold cursor-pointer transition hover:scale-105 shadow"
                style={{
                  backgroundColor: activeHeroTheme.brownPrimary,
                  color: activeHeroTheme.bgColor,
                }}
              >
                Explorar Cards Agora
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Matches com Especialistas */}
              {matchedPros.length > 0 && (
                <div className="space-y-2">
                  <h3
                    className="text-xs font-bold uppercase tracking-wider px-1"
                    style={{ color: activeHeroTheme.brownMuted }}
                  >
                    Especialistas & Serviços ({matchedPros.length})
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {matchedPros.map((prof) => {
                      const catInfo = CATEGORY_LABELS[prof.category] || {
                        label: prof.category,
                        icon: '⭐',
                      }
                      const avatarUrl = communityService.getMediaUrl(
                        prof as unknown as Record<string, unknown>,
                        prof.avatar,
                      )

                      return (
                        <div
                          key={prof.id}
                          onClick={() => navigate(`/profissionais/${prof.id}`)}
                          className="p-3.5 rounded-2xl border transition-all cursor-pointer group hover:scale-[1.01] flex items-center justify-between shadow-sm"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            borderColor: `${activeHeroTheme.brownPrimary}25`,
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={prof.name}
                                className="w-12 h-12 rounded-2xl object-cover border shrink-0"
                                style={{ borderColor: `${activeHeroTheme.brownPrimary}40` }}
                              />
                            ) : (
                              <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black border shrink-0"
                                style={{
                                  backgroundColor: `${activeHeroTheme.brownPrimary}25`,
                                  borderColor: `${activeHeroTheme.brownPrimary}40`,
                                  color: activeHeroTheme.brownPrimary,
                                }}
                              >
                                {catInfo.icon}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p
                                className="font-bold text-xs truncate"
                                style={{ color: activeHeroTheme.brownTitle }}
                              >
                                {prof.name}
                              </p>
                              <p
                                className="text-[11px] font-semibold truncate"
                                style={{ color: activeHeroTheme.brownPrimary }}
                              >
                                {catInfo.label}
                              </p>
                              <p
                                className="text-[10px] truncate"
                                style={{ color: activeHeroTheme.brownMuted }}
                              >
                                {prof.city}
                                {prof.state ? `, ${prof.state}` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {prof.whatsapp && (
                              <a
                                href={`https://wa.me/${prof.whatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-2 rounded-xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600/50"
                                title="Conversar no WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Matches com Pets para Cruzamento */}
              {matchedDogs.length > 0 && (
                <div className="space-y-2">
                  <h3
                    className="text-xs font-bold uppercase tracking-wider px-1"
                    style={{ color: activeHeroTheme.brownMuted }}
                  >
                    Pets para Cruzamento & Socialização ({matchedDogs.length})
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {matchedDogs.map((d) => {
                      const avatarUrl = nutritionService.getAvatarUrl(d)

                      return (
                        <div
                          key={d.id}
                          className="p-3.5 rounded-2xl border transition-all flex items-center justify-between shadow-sm"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            borderColor: `${activeHeroTheme.brownPrimary}25`,
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={d.name}
                                className="w-12 h-12 rounded-2xl object-cover border shrink-0"
                                style={{ borderColor: `${activeHeroTheme.brownPrimary}40` }}
                              />
                            ) : (
                              <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black border shrink-0"
                                style={{
                                  backgroundColor: `${activeHeroTheme.brownPrimary}25`,
                                  borderColor: `${activeHeroTheme.brownPrimary}40`,
                                  color: activeHeroTheme.brownPrimary,
                                }}
                              >
                                🐶
                              </div>
                            )}
                            <div className="min-w-0">
                              <p
                                className="font-bold text-xs truncate"
                                style={{ color: activeHeroTheme.brownTitle }}
                              >
                                {d.name}
                              </p>
                              <p
                                className="text-[11px] font-semibold truncate"
                                style={{ color: activeHeroTheme.brownPrimary }}
                              >
                                {d.breed || 'Canino'} • {d.sex === 'macho' ? 'Macho' : 'Fêmea'}
                              </p>
                              <p
                                className="text-[10px] truncate"
                                style={{ color: activeHeroTheme.brownMuted }}
                              >
                                {d.weight_kg}kg •{' '}
                                {d.sterilized ? 'Castrado' : 'Apto para Cruzamento'}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center">
                            <span
                              className="px-2 py-1 rounded-xl text-[10px] font-bold border"
                              style={{
                                backgroundColor: `${activeHeroTheme.brownPrimary}15`,
                                borderColor: `${activeHeroTheme.brownPrimary}30`,
                                color: activeHeroTheme.brownPrimary,
                              }}
                            >
                              Match
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* OVERLAY IMERSIVO: "É UM MATCH!" (Estilo Tinder Pet) */}
      {matchModalOpen && matchedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-300">
          <div
            className="w-full max-w-sm rounded-3xl p-6 border text-center space-y-6 shadow-2xl relative overflow-hidden"
            style={{
              backgroundColor: `${activeHeroTheme.bgColor}f8`,
              borderColor: `${activeHeroTheme.brownPrimary}60`,
            }}
          >
            {/* Efeito Glow no Fundo */}
            <div
              className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-40"
              style={{ backgroundColor: activeHeroTheme.brownPrimary }}
            />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-30 bg-rose-500" />

            {/* Cabeçalho do Match */}
            <div className="relative space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-black tracking-widest uppercase">
                <Flame className="w-3.5 h-3.5 fill-rose-500" />
                <span>É um Match!</span>
              </div>
              <h2
                className="text-2xl font-black tracking-tight"
                style={{ color: activeHeroTheme.brownTitle }}
              >
                Conexão Confirmada!
              </h2>
              <p className="text-xs" style={{ color: activeHeroTheme.brownMuted }}>
                {matchedItem.type === 'dog'
                  ? `Seu pet e ${matchedItem.data.name} deram match para socialização!`
                  : `Você e ${matchedItem.data.name} estão conectados no Meu Bichu.`}
              </p>
            </div>

            {/* Avatares dos dois perfis com o coração central */}
            <div className="relative flex items-center justify-center gap-3 py-2">
              <div
                className="w-20 h-20 rounded-2xl overflow-hidden border-2 shadow-lg"
                style={{ borderColor: activeHeroTheme.brownPrimary }}
              >
                {activeDog && nutritionService.getAvatarUrl(activeDog) ? (
                  <img
                    src={nutritionService.getAvatarUrl(activeDog)!}
                    alt={activeDog.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-2xl font-black">
                    🐾
                  </div>
                )}
              </div>

              <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shrink-0 z-10 animate-bounce">
                <Heart className="w-5 h-5 fill-current" />
              </div>

              <div
                className="w-20 h-20 rounded-2xl overflow-hidden border-2 shadow-lg"
                style={{ borderColor: activeHeroTheme.brownPrimary }}
              >
                {matchedItem.type === 'dog' ? (
                  nutritionService.getAvatarUrl(matchedItem.data) ? (
                    <img
                      src={nutritionService.getAvatarUrl(matchedItem.data)!}
                      alt={matchedItem.data.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-2xl">
                      🐶
                    </div>
                  )
                ) : communityService.getMediaUrl(
                    matchedItem.data as unknown as Record<string, unknown>,
                    matchedItem.data.avatar,
                  ) ? (
                  <img
                    src={
                      communityService.getMediaUrl(
                        matchedItem.data as unknown as Record<string, unknown>,
                        matchedItem.data.avatar,
                      )!
                    }
                    alt={matchedItem.data.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-2xl">
                    ⭐
                  </div>
                )}
              </div>
            </div>

            {/* Ações do Modal de Match */}
            <div className="space-y-2 relative pt-2">
              {matchedItem.type === 'professional' && matchedItem.data.whatsapp && (
                <a
                  href={`https://wa.me/${matchedItem.data.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Olá! Encontrei você no Meu Bichu e adorei o seu perfil.`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Mandar Mensagem no WhatsApp</span>
                </a>
              )}

              {matchedItem.type === 'professional' && (
                <button
                  type="button"
                  onClick={() => {
                    setMatchModalOpen(false)
                    navigate(`/profissionais/${matchedItem.data.id}`)
                  }}
                  className="w-full py-2.5 rounded-2xl text-xs font-bold border transition cursor-pointer hover:bg-white/5"
                  style={{
                    borderColor: `${activeHeroTheme.brownPrimary}40`,
                    color: activeHeroTheme.brownTitle,
                  }}
                >
                  Ver Perfil Completo
                </button>
              )}

              <button
                type="button"
                onClick={() => setMatchModalOpen(false)}
                className="w-full py-2.5 rounded-2xl text-xs font-bold cursor-pointer transition hover:opacity-90"
                style={{
                  backgroundColor: activeHeroTheme.brownPrimary,
                  color: activeHeroTheme.bgColor,
                }}
              >
                Continuar Deslizando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
