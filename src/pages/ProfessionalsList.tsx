import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Briefcase,
  Star,
  MapPin,
  CheckCircle2,
  Phone,
  Search,
  Filter,
  Plus,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  Scissors,
  Home,
  ShoppingBag,
  Award,
  Heart,
} from 'lucide-react'
import { communityService } from '@/services/community'
import { useAuth } from '@/contexts/AuthContext'
import { useDog } from '@/contexts/DogContext'
import { useActiveHeroTheme } from '@/hooks/use-active-hero-theme'
import type { ProfessionalRecord, ProfessionalCategory } from '@/types/community'
import { REGIONAL_DIRECTORY, PINDA_DIRECTORY_LINKS } from '@/lib/pinda-directory'

export const CATEGORY_LABELS: Record<ProfessionalCategory, { label: string; icon: string }> = {
  veterinario: { label: 'Veterinários', icon: '🩺' },
  canicultor: { label: 'Canicultores / Criadores', icon: '🐾' },
  adestrador: { label: 'Adestradores', icon: '🦮' },
  handler: { label: 'Handlers de Pista', icon: '🏆' },
  dogwalker: { label: 'Dog Walkers', icon: '🚶' },
  cinofilo: { label: 'Cinófilos Especialistas', icon: '🐕' },
  banho_tosa: { label: 'Banho & Tosa', icon: '✂️' },
  creche: { label: 'Creches & Hotéis', icon: '🏡' },
  petshop: { label: 'Pet Shops', icon: '🛍️' },
  casa_racao: { label: 'Casas de Ração', icon: '🥩' },
}

export default function ProfessionalsListPage() {
  const { isAuthenticated } = useAuth()
  const { activeDog } = useDog()
  const { theme: activeHeroTheme } = useActiveHeroTheme(activeDog)
  const navigate = useNavigate()

  const [professionals, setProfessionals] = useState<ProfessionalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<ProfessionalCategory | 'todas'>('todas')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadData()
  }, [selectedCategory])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = import.meta.env.VITE_PILOT_MODE === 'true' ? [] : await communityService.getProfessionals(selectedCategory)
      setProfessionals(data)
    } finally {
      setLoading(false)
    }
  }

  const filtered = professionals.filter((p) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      (p.bio && p.bio.toLowerCase().includes(q)) ||
      (Array.isArray(p.specialties) && p.specialties.some((s) => s.toLowerCase().includes(q)))
    )
  })
  const localEntries = REGIONAL_DIRECTORY.filter((entry) =>
    (selectedCategory === 'todas' || entry.category === selectedCategory) &&
    (!searchQuery.trim() || `${entry.name} ${entry.address} ${entry.city} ${entry.description || ''}`.toLocaleLowerCase('pt-BR').includes(searchQuery.toLocaleLowerCase('pt-BR').trim())),
  )

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border"
              style={{
                backgroundColor: `${activeHeroTheme.brownPrimary}20`,
                borderColor: `${activeHeroTheme.brownPrimary}40`,
                color: activeHeroTheme.brownPrimary,
              }}
            >
              Comunidade & Serviços
            </span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-black tracking-tight mt-1"
            style={{ color: activeHeroTheme.brownTitle }}
          >
            Profissionais & Especialistas
          </h1>
          <p className="text-xs mt-0.5" style={{ color: activeHeroTheme.brownMuted }}>
            Serviços identificados no Vale do Paraíba e perfis da comunidade
          </p>
        </div>

        {import.meta.env.VITE_PILOT_MODE !== 'true' && <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => navigate('/profissionais/cadastrar')}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundColor: activeHeroTheme.brownPrimary,
              color: activeHeroTheme.bgColor,
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Meu Serviço</span>
          </button>
        </div>}
      </div>

      {/* Search Bar & Categorias */}
      <div className="space-y-3">
        <div className="relative">
          <Search
            className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: activeHeroTheme.brownMuted }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, especialidade, cidade ou credenciais..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl text-xs font-semibold outline-none border transition-colors"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              borderColor: `${activeHeroTheme.brownPrimary}30`,
              color: activeHeroTheme.brownTitle,
            }}
          />
        </div>

        {/* Scroll Horizontal de Categorias */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('todas')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
              selectedCategory === 'todas' ? 'shadow-sm' : 'hover:bg-white/5 opacity-80'
            }`}
            style={{
              backgroundColor:
                selectedCategory === 'todas'
                  ? `${activeHeroTheme.brownPrimary}30`
                  : 'rgba(0, 0, 0, 0.25)',
              borderColor:
                selectedCategory === 'todas'
                  ? activeHeroTheme.brownPrimary
                  : 'rgba(255, 255, 255, 0.08)',
              color:
                selectedCategory === 'todas'
                  ? activeHeroTheme.brownTitle
                  : activeHeroTheme.brownMuted,
            }}
          >
            Todos os Serviços
          </button>
          {Object.entries(CATEGORY_LABELS).map(([catKey, info]) => {
            const isSel = selectedCategory === catKey
            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setSelectedCategory(catKey as ProfessionalCategory)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 border ${
                  isSel ? 'shadow-sm' : 'hover:bg-white/5 opacity-80'
                }`}
                style={{
                  backgroundColor: isSel
                    ? `${activeHeroTheme.brownPrimary}30`
                    : 'rgba(0, 0, 0, 0.25)',
                  borderColor: isSel ? activeHeroTheme.brownPrimary : 'rgba(255, 255, 255, 0.08)',
                  color: isSel ? activeHeroTheme.brownTitle : activeHeroTheme.brownMuted,
                }}
              >
                <span>{info.icon}</span>
                <span>{info.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <section className="space-y-3" aria-labelledby="pinda-title">
        <div>
          <h2 id="pinda-title" className="text-lg font-bold" style={{ color: activeHeroTheme.brownTitle }}>
            Vale do Paraíba · guia regional
          </h2>
          <p className="text-sm" style={{ color: activeHeroTheme.brownMuted }}>
            {REGIONAL_DIRECTORY.length} entradas encontradas em fontes públicas em 29/09/2026. São listagens informativas, sem cadastro feito pelos estabelecimentos no Meu Bichu. Use a busca no Maps e confirme atendimento, endereço e credenciais antes de visitar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['veterinario','petshop','banho_tosa'] as ProfessionalCategory[]).map(category => <button key={category} type="button" onClick={()=>setSelectedCategory(category)} aria-pressed={selectedCategory===category} className="rounded-lg border px-3 py-2 text-sm" style={{color:activeHeroTheme.brownPrimary,borderColor:`${activeHeroTheme.brownPrimary}40`}}>{CATEGORY_LABELS[category].label} · {REGIONAL_DIRECTORY.filter(e=>e.category===category).length}</button>)}
        </div>
        {localEntries.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {localEntries.map(entry => <article key={`${entry.name}-${entry.address}`} className="rounded-2xl border p-4" style={{ backgroundColor: 'rgba(255,255,255,.03)', borderColor: `${activeHeroTheme.brownPrimary}25` }}>
            <div className="text-xs font-bold uppercase" style={{ color: activeHeroTheme.brownPrimary }}>{CATEGORY_LABELS[entry.category].label}</div>
            <h3 className="mt-1 font-bold" style={{ color: activeHeroTheme.brownTitle }}>{entry.name}</h3>
            <p className="mt-1 text-sm" style={{ color: activeHeroTheme.brownMuted }}>{entry.city} · {entry.address}</p>
            {entry.description && <p className="mt-1 text-sm" style={{ color: activeHeroTheme.brownMuted }}>{entry.description}</p>}
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${entry.name} ${entry.address} ${entry.city}`)}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm underline" style={{ color: activeHeroTheme.brownPrimary }}>Localizar no Maps</a>
          </article>)}
        </div> : <p className="text-sm" style={{ color: activeHeroTheme.brownMuted }}>Nenhuma entrada do guia nesta busca. Consulte os perfis cadastrados abaixo.</p>}
      </section>

      {import.meta.env.VITE_PILOT_MODE !== 'true' && <><h2 className="text-lg font-bold" style={{ color: activeHeroTheme.brownTitle }}>Perfis cadastrados no Meu Bichu</h2>
      {/* Grid de Cards dos Profissionais */}
      {loading ? (
        <div className="text-center py-16">
          <p className="text-xs animate-pulse" style={{ color: activeHeroTheme.brownMuted }}>
            Carregando especialistas do Meu Bichu...
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="p-10 rounded-3xl border text-center space-y-3"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderColor: `${activeHeroTheme.brownPrimary}20`,
          }}
        >
          <Briefcase className="w-8 h-8 mx-auto" style={{ color: activeHeroTheme.brownMuted }} />
          <h3 className="text-sm font-bold" style={{ color: activeHeroTheme.brownTitle }}>
            Nenhum profissional encontrado nesta categoria
          </h3>
          <p className="text-xs max-w-sm mx-auto" style={{ color: activeHeroTheme.brownMuted }}>
            Seja o primeiro a divulgar seu atendimento de excelência para os tutores da plataforma.
          </p>
          <button
            onClick={() => navigate('/profissionais/cadastrar')}
            className="px-4 py-2 rounded-xl text-xs font-bold mt-2 cursor-pointer transition hover:scale-105"
            style={{
              backgroundColor: activeHeroTheme.brownPrimary,
              color: activeHeroTheme.bgColor,
            }}
          >
            Cadastrar meu perfil agora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((prof) => {
            const catInfo = CATEGORY_LABELS[prof.category] || { label: prof.category, icon: '⭐' }
            const avatarUrl = communityService.getMediaUrl(
              prof as unknown as Record<string, unknown>,
              prof.avatar,
            )

            return (
              <div
                key={prof.id}
                onClick={() => navigate(`/profissionais/${prof.id}`)}
                className="p-5 rounded-3xl border transition-all cursor-pointer group hover:border-primary/60 hover:scale-[1.01] flex flex-col justify-between shadow-md"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderColor: `${activeHeroTheme.brownPrimary}25`,
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={prof.name}
                          className="w-12 h-12 rounded-2xl object-cover border"
                          style={{ borderColor: `${activeHeroTheme.brownPrimary}40` }}
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black border"
                          style={{
                            backgroundColor: `${activeHeroTheme.brownPrimary}25`,
                            borderColor: `${activeHeroTheme.brownPrimary}40`,
                            color: activeHeroTheme.brownPrimary,
                          }}
                        >
                          {catInfo.icon}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h2
                            className="font-extrabold text-sm sm:text-base tracking-tight"
                            style={{ color: activeHeroTheme.brownTitle }}
                          >
                            {prof.name}
                          </h2>
                          {prof.verified && (
                            <span
                              title="Profissional com credenciais verificadas"
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Verificado
                            </span>
                          )}
                        </div>
                        <p
                          className="text-xs font-semibold"
                          style={{ color: activeHeroTheme.brownPrimary }}
                        >
                          {catInfo.label}
                        </p>
                      </div>
                    </div>

                    {/* Média de Estrelas */}
                    <div
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-bold shrink-0"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        borderColor: `${activeHeroTheme.brownPrimary}30`,
                        color: activeHeroTheme.brownTitle,
                      }}
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{prof.rating_avg ? prof.rating_avg.toFixed(1) : '5.0'}</span>
                      <span className="text-[10px] opacity-70">({prof.reviews_count || 0})</span>
                    </div>
                  </div>

                  {prof.bio && (
                    <p
                      className="text-xs line-clamp-2 leading-relaxed"
                      style={{ color: activeHeroTheme.brownBody }}
                    >
                      {prof.bio}
                    </p>
                  )}

                  {/* Especialidades em tags */}
                  {Array.isArray(prof.specialties) && prof.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {prof.specialties.slice(0, 3).map((spec, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-lg border"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.04)',
                            borderColor: `${activeHeroTheme.brownPrimary}20`,
                            color: activeHeroTheme.brownMuted,
                          }}
                        >
                          {spec}
                        </span>
                      ))}
                      {prof.specialties.length > 3 && (
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-lg border opacity-60"
                          style={{ borderColor: `${activeHeroTheme.brownPrimary}20` }}
                        >
                          +{prof.specialties.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div
                  className="mt-4 pt-3 border-t flex items-center justify-between text-xs"
                  style={{ borderColor: `${activeHeroTheme.brownPrimary}15` }}
                >
                  <div
                    className="flex items-center gap-1"
                    style={{ color: activeHeroTheme.brownMuted }}
                  >
                    <MapPin
                      className="w-3.5 h-3.5"
                      style={{ color: activeHeroTheme.brownPrimary }}
                    />
                    <span className="text-[11px] font-medium">
                      {prof.city}
                      {prof.state ? `, ${prof.state}` : ''}
                    </span>
                  </div>

                  <span
                    className="font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                    style={{ color: activeHeroTheme.brownPrimary }}
                  >
                    Ver Perfil Completo
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}</>}
    </div>
  )
}
