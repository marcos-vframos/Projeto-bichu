import React, { useState, useMemo } from 'react'
import { X, Search, Check, Sparkles, Dog, Cat, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { HERO_THEMES, HeroTheme, DEFAULT_HERO_THEME_ID } from '@/lib/hero-themes'
import { DogRecord } from '@/types/nutrition'
import { getCroppedBreedImage, subscribeBreedCrops } from '@/lib/breed-assets'

interface HeroSelectorModalProps {
  open: boolean
  onClose: () => void
  currentThemeId: string
  onSelectTheme: (theme: HeroTheme) => void
  activeDog?: DogRecord | null
  suggestedTheme?: HeroTheme | null
}

export function HeroSelectorModal({
  open,
  onClose,
  currentThemeId,
  onSelectTheme,
  activeDog,
  suggestedTheme,
}: HeroSelectorModalProps) {
  const [filterSpecies, setFilterSpecies] = useState<'all' | 'dog' | 'cat'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [, setCropsTick] = useState(0)

  React.useEffect(() => {
    return subscribeBreedCrops(() => {
      setCropsTick((t) => t + 1)
    })
  }, [])

  const filteredThemes = useMemo(() => {
    return HERO_THEMES.filter((t) => {
      if (filterSpecies !== 'all' && t.species !== filterSpecies && !t.id.startsWith('neutral-')) {
        return false
      }
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      return (
        t.name.toLowerCase().includes(q) ||
        t.label.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      )
    })
  }, [filterSpecies, searchQuery])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hero-selector-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl overflow-hidden border border-[#422e1e] shadow-2xl"
        style={{
          backgroundColor: '#0c0805',
          color: '#F4D4B5',
        }}
      >
        {/* Header da Modal no padrão nativo minimalista */}
        <div className="p-4 sm:p-6 border-b border-[#301f13] flex items-center justify-between gap-3 bg-[#120a06]/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: 'rgba(229, 168, 105, 0.12)',
                borderColor: 'rgba(229, 168, 105, 0.35)',
                color: '#E5A869',
              }}
            >
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="hero-selector-title"
                className="text-lg sm:text-xl font-black tracking-tight text-[#FCE7CF]"
              >
                Escolha a Interface que mais Combina
              </h2>
              <p className="text-xs text-[#C99D75]">
                {HERO_THEMES.length} visuais imersivos inspirados nas raças e tons de pelagem
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/10 text-[#C99D75] hover:text-[#FCE7CF] cursor-pointer"
            aria-label="Fechar seletor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Filtros e Busca no padrão nativo minimalista */}
        <div className="p-4 sm:px-6 bg-[#0f0905] border-b border-[#301f13] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs Espécie em chamadas tipográficas fluidas */}
          <div className="inline-flex rounded-full p-1 bg-[#1a0f07] border border-[#301f13] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setFilterSpecies('all')}
              className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterSpecies === 'all'
                  ? 'bg-[#E5A869] text-[#140c06] shadow-sm'
                  : 'text-[#C99D75] hover:text-[#FCE7CF]'
              }`}
            >
              Todos ({HERO_THEMES.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterSpecies('dog')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterSpecies === 'dog'
                  ? 'bg-[#E5A869] text-[#140c06] shadow-sm'
                  : 'text-[#C99D75] hover:text-[#FCE7CF]'
              }`}
            >
              <Dog className="w-3.5 h-3.5" />
              <span>Cães (16)</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterSpecies('cat')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterSpecies === 'cat'
                  ? 'bg-[#E5A869] text-[#140c06] shadow-sm'
                  : 'text-[#C99D75] hover:text-[#FCE7CF]'
              }`}
            >
              <Cat className="w-3.5 h-3.5" />
              <span>Gatos (7)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterSpecies('all')
                setSearchQuery('Neutro')
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                searchQuery === 'Neutro'
                  ? 'bg-[#E5A869] text-[#140c06] shadow-sm'
                  : 'text-[#C99D75] hover:text-[#FCE7CF]'
              }`}
            >
              <span>100% Neutros (2)</span>
            </button>
          </div>

          {/* Campo de Busca */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9B7452]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por raça (ex: Golden, Rottweiler, Siamês...)"
              className="w-full pl-9 pr-7 py-2 text-xs rounded-full bg-[#180e07] border border-[#301f13] text-[#FCE7CF] placeholder:text-[#805C3D] focus:outline-none focus:border-[#E5A869] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9B7452] hover:text-[#FCE7CF] cursor-pointer"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Indicador de Foto do Pet ou Sugestão de Raça */}
        {activeDog && (
          <div className="mx-4 sm:mx-6 mt-3 p-3.5 rounded-2xl bg-[#1a0f07] border border-[#E5A869]/30 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-[#E5A869] shrink-0" />
              <div className="text-xs">
                <span className="text-[#C99D75]">Pet ativo: </span>
                <strong className="text-[#FCE7CF] font-bold">{activeDog.name}</strong>
                {currentThemeId.startsWith('pet-') ? (
                  <span className="text-[#E5A869] font-bold">
                    {' '}
                    • Interface adaptada à foto carregada
                  </span>
                ) : suggestedTheme ? (
                  <>
                    <span className="text-[#9B7452]"> ({activeDog.breed || 'raça'}): </span>
                    <span className="text-[#E5A869] font-bold">{suggestedTheme.name}</span>
                  </>
                ) : null}
              </div>
            </div>

            {currentThemeId.startsWith('pet-') ? (
              <span className="text-[11px] font-semibold text-[#E5A869] flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Foto Ativa
              </span>
            ) : suggestedTheme && currentThemeId !== suggestedTheme.id ? (
              <button
                type="button"
                onClick={() => {
                  onSelectTheme(suggestedTheme)
                  onClose()
                }}
                className="px-3.5 py-1 rounded-full text-xs font-bold bg-[#E5A869] text-[#140c06] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                Aplicar raça sugerida
              </button>
            ) : suggestedTheme ? (
              <span className="text-[11px] font-semibold text-[#E5A869] flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Em uso
              </span>
            ) : null}
          </div>
        )}

        {/* Grade de Modelos de Heros */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 max-h-[62vh] scrollbar-thin scrollbar-thumb-[#301f13] scrollbar-track-transparent">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredThemes.map((theme) => {
              const isSelected = theme.id === currentThemeId
              const isSuggested = suggestedTheme?.id === theme.id

              return (
                <div
                  key={theme.id}
                  onClick={() => {
                    onSelectTheme(theme)
                    onClose()
                  }}
                  className={`group relative rounded-2xl overflow-hidden border transition-all duration-200 cursor-pointer text-left flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#E5A869] ring-2 ring-[#E5A869]/50 shadow-xl scale-[1.01]'
                      : 'border-[#2d1b0f] hover:border-[#E5A869]/60 hover:scale-[1.01]'
                  }`}
                  style={{
                    backgroundColor: theme.bgColor,
                    minHeight: '190px',
                  }}
                >
                  {/* Foto REAL da raça fundida com máscara em resolução máxima */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <img
                      src={theme.imageUrl}
                      srcSet={
                        theme.imageUrl.includes('usecurling')
                          ? `${theme.imageUrl} 3840w, ${theme.imageUrl.replace('p/3840/2160', 'p/2560/1440')} 2560w, ${theme.imageUrl.replace('p/3840/2160', 'p/1920/1080')} 1920w`
                          : undefined
                      }
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      alt={theme.name}
                      onError={(e) => {
                        // Fallback seguro caso a URL primária sofra erro de rede
                        const target = e.currentTarget
                        const cropped = getCroppedBreedImage(theme.id)
                        if (cropped && target.src !== cropped) {
                          target.src = cropped
                        } else if (target.src !== theme.fallbackUrl) {
                          target.src = theme.fallbackUrl || theme.imageUrl
                        }
                      }}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      style={{
                        objectPosition: theme.objectPosition || 'center 25%',
                        imageRendering: 'auto',
                      }}
                      loading="lazy"
                    />
                  </div>

                  {/* Conteúdo sobre o card */}
                  <div className="relative z-10 p-4 flex flex-col justify-between h-full">
                    <div>
                      {/* Topo do card: Rótulo tipográfico nativo */}
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span
                          className="text-[10px] uppercase tracking-wider font-extrabold"
                          style={{ color: theme.brownPrimary }}
                        >
                          {theme.label}
                        </span>

                        {isSelected ? (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: theme.accentColor,
                              color: theme.bgColor,
                            }}
                          >
                            <Check className="w-3 h-3" /> Ativo
                          </span>
                        ) : isSuggested ? (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: 'rgba(229,168,105,0.18)',
                              color: '#E5A869',
                            }}
                          >
                            <Sparkles className="w-2.5 h-2.5" /> Combina
                          </span>
                        ) : null}
                      </div>

                      <h3
                        className="text-base font-black tracking-tight"
                        style={{ color: theme.brownTitle }}
                      >
                        {theme.name}
                      </h3>

                      <p
                        className="text-xs mt-1 line-clamp-2 leading-relaxed"
                        style={{ color: theme.brownBody }}
                      >
                        {theme.description}
                      </p>
                    </div>

                    {/* Rodapé do card: Indicador de tom e seleção fluida */}
                    <div className="mt-4 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: theme.bgColor }}
                          title={`Fundo: ${theme.bgColor}`}
                        />
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: theme.accentColor }}
                          title={`Destaque: ${theme.accentColor}`}
                        />
                        <span className="text-[10px] ml-0.5" style={{ color: theme.brownMuted }}>
                          {theme.species === 'dog' ? 'Cão' : 'Gato'}
                        </span>
                      </div>

                      <span
                        className="font-bold transition-transform group-hover:translate-x-0.5"
                        style={{ color: theme.accentColor }}
                      >
                        {isSelected ? 'Em uso' : 'Escolher →'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredThemes.length === 0 && (
            <div className="py-12 text-center text-[#9B7452]">
              <p className="text-sm">Nenhuma raça encontrada para "{searchQuery}".</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setFilterSpecies('all')
                }}
                className="mt-2 text-xs font-bold text-[#E5A869] underline cursor-pointer"
              >
                Limpar filtros de busca
              </button>
            </div>
          )}
        </div>

        {/* Rodapé da Modal */}
        <div className="p-4 sm:px-6 bg-[#120a06] border-t border-[#301f13] flex items-center justify-between flex-wrap gap-2 text-xs text-[#C99D75]">
          <div className="flex items-center gap-2">
            <span>Interface atual:</span>
            <strong className="text-[#FCE7CF] font-bold">
              {HERO_THEMES.find((t) => t.id === currentThemeId)?.name || 'Rottweiler'}
            </strong>
          </div>

          <div className="flex items-center gap-2">
            {currentThemeId !== DEFAULT_HERO_THEME_ID && (
              <button
                type="button"
                onClick={() => {
                  const defaultTheme = HERO_THEMES.find((t) => t.id === DEFAULT_HERO_THEME_ID)
                  if (defaultTheme) {
                    onSelectTheme(defaultTheme)
                    onClose()
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#301f13] hover:border-[#E5A869]/50 text-[#C99D75] hover:text-[#FCE7CF] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Rottweiler padrão</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-1.5 rounded-full font-bold bg-[#E5A869] text-[#140c06] hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-md"
            >
              Concluir
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
