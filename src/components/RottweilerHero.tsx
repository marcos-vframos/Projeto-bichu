import React, { useEffect, useRef, useState } from 'react'
import { Sparkles, ChevronLeft, ChevronRight, Pause, Play, Images } from 'lucide-react'
import { DogRecord } from '@/types/nutrition'
import { getCroppedBreedImage, subscribeBreedCrops, BREED_CROPS } from '@/lib/breed-assets'
import { getTimeBasedGreeting } from '@/lib/tutor'
import { useActiveHeroTheme } from '@/hooks/use-active-hero-theme'

export interface RottweilerHeroProps {
  activeDog: DogRecord | null
  onOpenSelector?: () => void
}

export function RottweilerHero({ activeDog }: RottweilerHeroProps) {
  const heroRef = useRef<HTMLDivElement>(null)

  // Rotação sequencial intercalada entre as fotos do pet
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isPausedManual, setIsPausedManual] = useState(false)

  // Resolução unificada: pet hero (foto do pet) ou raça padrão/selecionada
  const { theme, isPetHero, petImages, activeImageIndex, setActiveImageIndex } = useActiveHeroTheme(
    activeDog,
    currentSlideIndex,
  )

  // Saudação por horário sincronizada com tutor
  const [greetingData, setGreetingData] = useState(() => getTimeBasedGreeting())

  useEffect(() => {
    const updateGreeting = () => {
      setGreetingData(getTimeBasedGreeting())
    }
    updateGreeting()
    const timer = setInterval(updateGreeting, 60000)
    window.addEventListener('bichu:tutor-name-changed', updateGreeting)
    return () => {
      clearInterval(timer)
      window.removeEventListener('bichu:tutor-name-changed', updateGreeting)
    }
  }, [])

  // Micro-parallax responsivo com cursor do mouse / giroscópio leve
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  useEffect(() => {
    let rafId = 0
    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth < 768) return
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const cx = window.innerWidth / 2
        const cy = window.innerHeight / 2
        const dx = (e.clientX - cx) / cx
        const dy = (e.clientY - cy) / cy
        setTilt({ x: dx * 8, y: dy * 6 })
      })
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  // Recorte dinâmico da raça ativa vindo da grade do anexo (somente se não for pet hero)
  const [croppedUrl, setCroppedUrl] = useState<string | null>(() =>
    isPetHero ? null : getCroppedBreedImage(theme.id),
  )

  useEffect(() => {
    if (isPetHero) {
      setCroppedUrl(null)
      return
    }
    setCroppedUrl(getCroppedBreedImage(theme.id))
    return subscribeBreedCrops(() => {
      setCroppedUrl(getCroppedBreedImage(theme.id))
    })
  }, [theme.id, isPetHero])

  // Reseta slide se o pet mudar
  useEffect(() => {
    setCurrentSlideIndex(0)
    setActiveImageIndex(0)
  }, [activeDog?.id, setActiveImageIndex])

  // Temporizador de rotação sequencial automática (8 segundos por slide)
  useEffect(() => {
    if (!isPetHero || petImages.length <= 1 || isHovered || isPausedManual) {
      return
    }

    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => {
        const next = (prev + 1) % petImages.length
        setActiveImageIndex(next)
        return next
      })
    }, 8000)

    return () => clearInterval(interval)
  }, [isPetHero, petImages.length, isHovered, isPausedManual, setActiveImageIndex])

  // Imagem final: se for pet hero usa a foto do slide ativo; se for raça prioriza a URL de altíssima resolução 4K
  const activeImageUrl = isPetHero
    ? petImages[currentSlideIndex] || theme.imageUrl
    : theme.imageUrl || croppedUrl

  // Imagem com fallback e transição suave (cross-fade)
  const [imgSrc, setImgSrc] = useState(activeImageUrl)
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  useEffect(() => {
    setImgSrc(activeImageUrl)
    setImgError(false)
  }, [activeImageUrl])

  // Progresso do scroll: 0 = topo da página, 1 = hero rolado
  const [scrollProgress, setScrollProgress] = useState(0)

  // Scroll listener com requestAnimationFrame para esvaecimento e parallax suaves
  useEffect(() => {
    let ticking = false

    const updateScroll = () => {
      if (!heroRef.current) return
      const rect = heroRef.current.getBoundingClientRect()
      const heroHeight = rect.height || 540
      const scrolledPast = Math.max(0, -rect.top)
      // Esvaecimento gradual e proporcional à altura do hero
      const fadeDistance = Math.max(340, heroHeight * 0.85)
      const progress = Math.min(1, Math.max(0, scrolledPast / fadeDistance))
      setScrollProgress(progress)
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScroll)
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    updateScroll()

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  // No topo (scrollProgress=0), opacidade total (1.0). Esvaecimento progressivo ao rolar.
  const petOpacity = Math.max(0, 1 - Math.pow(scrollProgress, 1.1) * 1.25)
  // Parallax discreto no eixo Y
  const petTranslateY = scrollProgress * 28

  return (
    <section
      ref={heroRef}
      aria-label={`Apresentação Meu Bichu com ${theme.name}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group/hero relative -mx-4 -mt-4 mb-6 sm:mb-8 overflow-hidden transition-colors duration-700 rounded-b-3xl sm:rounded-b-[2.5rem]"
      style={{
        backgroundColor: theme.bgColor,
      }}
    >
      {/*
        1. FAIXA/CAMADA PRINCIPAL DA IMAGEM DO ANIMAL COM MÁXIMA PRESENÇA
        - Fundo escuro limpo, sem manchas ou borrões claros desordenados
        - Posição e enquadramento responsivos por breakpoint:
          * Mobile: focado na cabeça/olhar com centro equilibrado
          * Tablet (portrait e landscape): enquadrado no terço direito/centro
          * Desktop / Notebook: requadrado estendido com posicionamento lateral elegante
      */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden select-none"
        style={{
          opacity: petOpacity,
          transform: `translate3d(0, ${petTranslateY}px, 0)`,
          willChange: 'opacity, transform',
        }}
      >
        {!imgError ? (
          <div className="relative w-full h-full">
            {/* CONTAINER COM MICRO-RESPIRAÇÃO E TILT (MOVIMENTO E FLUIDEZ) */}
            <div
              className="w-full h-full animate-hero-breathe transition-transform duration-300 ease-out"
              style={{
                transform: `translate3d(${tilt.x}px, ${tilt.y}px, 0)`,
              }}
            >
              {/* Retrato local ou foto do próprio pet, com ajuste responsivo */}
              <picture>

                <img
                  key={imgSrc}
                  src={imgSrc}
                  alt={theme.name}
                  onLoad={() => setImgLoaded(true)}
                  onError={() => {
                    if (imgSrc !== theme.fallbackUrl && theme.fallbackUrl) {
                      setImgSrc(theme.fallbackUrl)
                    } else {
                      setImgError(true)
                    }
                  }}
                  className={`w-full h-full object-cover transition-all duration-700 ease-out animate-in fade-in zoom-in-95
                    ${
                      isPetHero
                        ? 'object-[center_70%] sm:object-[center_65%] md:object-[right_15%_center] lg:object-[right_12%_center] xl:object-[right_10%_center] scale-110 sm:scale-115 md:scale-120'
                        : BREED_CROPS[theme.id]
                          ? 'object-[center_32%] sm:object-[right_26%_center] md:object-[right_22%_center] lg:object-[right_18%_center] xl:object-[right_14%_center]'
                          : 'object-[center_28%] sm:object-[right_24%_center] md:object-[right_20%_center] lg:object-[right_15%_center] xl:object-[right_12%_center]'
                    }
                    ${imgLoaded || imgSrc.startsWith('data:') ? 'opacity-100' : 'opacity-0'}
                  `}
                  style={{
                    filter: 'none',
                  }}
                />{' '}
              </picture>
            </div>

          </div>
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-end pr-8 sm:pr-16 opacity-35"
            style={{
              background: `radial-gradient(circle at 75% 50%, ${theme.accentColor}33 0%, ${theme.bgColor} 70%)`,
            }}
          >
            <div className="text-right">
              <span
                className="text-7xl sm:text-9xl font-black tracking-tighter block opacity-60"
                style={{ color: theme.brownPrimary }}
              >
                {theme.label}
              </span>
              <span className="text-xs tracking-widest uppercase font-bold text-white/40 block mt-1">
                Visual {theme.name} Ativo
              </span>
            </div>
          </div>
        )}
      </div>

      {/*
        2. TOPO LIMPO: SAUDAÇÃO MINIMALISTA E ELEGANTE (UP DA INTERFACE)
        - Sem cards, sem botões ou elementos pesados invadindo o animal
        - Apenas a saudação por período com o nome do tutor:
          "Olá, [nome]" / "Bom dia, [nome]" / "Boa tarde, [nome]" / "Boa noite, [nome]"
        - O texto "Nutrição Canina • Border Collie" (eyebrow/chip de raça) foi REMOVIDO conforme solicitado.
      */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-5 sm:px-8 md:px-12 pt-10 sm:pt-14 pb-14 sm:pb-16 min-h-[460px] sm:min-h-[500px] lg:min-h-[540px] flex flex-col justify-end">
        <div className="max-w-md sm:max-w-lg pb-2 sm:pb-4">
          <div className="space-y-1 sm:space-y-1.5">
            {/* Badge de status discreto quando a foto do pet assume a interface */}
            {isPetHero && activeDog && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 mb-2 shadow-sm">
                <Sparkles className="w-3 h-3" style={{ color: theme.brownPrimary }} />
                <span className="text-[11px] font-semibold" style={{ color: theme.brownTitle }}>
                  Visual de {activeDog.name}
                </span>
                <span className="text-[10px] opacity-70" style={{ color: theme.brownMuted }}>
                  • Foto {currentSlideIndex + 1} de {Math.max(1, petImages.length)}
                </span>
              </div>
            )}

            <h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-black tracking-tight leading-[1.06] [text-shadow:0_2px_12px_rgba(0,0,0,.85)]"
              style={{ color: '#fff' }}
            >
              {greetingData.prefix},{' '}
              <span
                className="italic font-serif font-normal drop-shadow-sm"
                style={{ color: '#FFF4E8' }}
              >
                {greetingData.name}
              </span>
              .
            </h1>
          </div>
        </div>
      </div>

      {/*
        3. CONTROLES DE ROTAÇÃO SEQUENCIAL (QUANDO HOUVER MÚLTIPLAS FOTOS)
        - Navegação suave por bullets, pausar ao hover e botões discretos
      */}
      {isPetHero && petImages.length > 1 && (
        <div className="absolute right-4 sm:right-8 bottom-4 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              const prev = (currentSlideIndex - 1 + petImages.length) % petImages.length
              setCurrentSlideIndex(prev)
              setActiveImageIndex(prev)
            }}
            title="Foto anterior"
            className="w-6 h-6 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1.5 px-1">
            {petImages.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrentSlideIndex(idx)
                  setActiveImageIndex(idx)
                }}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  currentSlideIndex === idx
                    ? 'w-4 h-1.5'
                    : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
                }`}
                style={{
                  backgroundColor: currentSlideIndex === idx ? theme.brownPrimary : undefined,
                }}
                title={`Ir para foto ${idx + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              const next = (currentSlideIndex + 1) % petImages.length
              setCurrentSlideIndex(next)
              setActiveImageIndex(next)
            }}
            title="Próxima foto"
            className="w-6 h-6 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsPausedManual((p) => !p)
            }}
            title={isPausedManual ? 'Retomar rotação automática' : 'Pausar rotação'}
            className="w-6 h-6 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer border-l border-white/10 pl-1 ml-0.5"
          >
            {isPausedManual ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </button>
        </div>
      )}

      {/*
        4. TRANSIÇÃO LONGUÍSSIMA E SUAVE PARA O CONTEÚDO PÓS-HERO
        - Fade progressivo orgânico até a cor do fundo
      */}
    </section>
  )
}
