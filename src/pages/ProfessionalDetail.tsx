import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Star,
  MapPin,
  Phone,
  MessageCircle,
  Instagram,
  CheckCircle2,
  Award,
  Sparkles,
  Send,
  Heart,
  Share2,
} from 'lucide-react'
import { useActiveHeroTheme } from '@/hooks/use-active-hero-theme'
import { useDog } from '@/contexts/DogContext'
import { useAuth } from '@/contexts/AuthContext'
import { communityService } from '@/services/community'
import type {
  ProfessionalRecord as Professional,
  ProfessionalReviewRecord as ProfessionalReview,
} from '@/types/community'
import { toast } from 'sonner'

export default function ProfessionalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { activeDog } = useDog()
  const { theme } = useActiveHeroTheme(activeDog)
  const { user } = useAuth()

  const [professional, setProfessional] = useState<Professional | null>(null)
  const [reviews, setReviews] = useState<ProfessionalReview[]>([])
  const [loading, setLoading] = useState(true)

  // Formulário de nova avaliação
  const [newRating, setNewRating] = useState(5)
  const [newComment, setNewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // Modal / Feedback contato
  const [contactModalOpen, setContactModalOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true)
    Promise.all([communityService.getProfessionalById(id), communityService.getReviews(id)])
      .then(([prof, revs]) => {
        if (active) {
          setProfessional(prof)
          setReviews(revs)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id])

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return

    if (!newComment.trim()) {
      toast.error('Escreva um comentário sobre o atendimento.')
      return
    }

    if (!user) {
      const demoRev = {
        id: `demo_${Date.now()}`,
        professional: id,
        user: 'guest',
        user_name: 'Tutor Convidado (Demonstração)',
        rating: newRating,
        comment: newComment.trim(),
        created: new Date().toISOString(),
      }
      setReviews((prev) => [demoRev as unknown as ProfessionalReview, ...prev])
      setNewComment('')
      toast.success('Avaliação enviada com sucesso em modo demonstração!')
      return
    }

    setSubmittingReview(true)
    try {
      const rev = await communityService.addReview({
        professional: id,
        user: user.id,
        user_name: user.name || 'Tutor Bichu',
        rating: newRating,
        comment: newComment.trim(),
      })
      setReviews((prev) => [rev, ...prev.filter((r) => r.user !== user.id)])
      setNewComment('')
      toast.success('Sua avaliação foi registrada com sucesso!')
    } catch {
      toast.error('Erro ao enviar avaliação.')
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: professional?.name || 'Profissional Meu Bichu',
        text: `Confira o perfil de ${professional?.name} no Meu Bichu!`,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link do perfil copiado para a área de transferência!')
    }
  }

  if (loading) {
    return (
      <div className="py-24 text-center space-y-2">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto"
          style={{ borderColor: theme.brownPrimary, borderTopColor: 'transparent' }}
        />
        <p className="text-xs" style={{ color: theme.brownMuted }}>
          Carregando perfil do profissional...
        </p>
      </div>
    )
  }

  if (!professional) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <h2 className="text-lg font-bold" style={{ color: theme.brownTitle }}>
          Profissional não encontrado
        </h2>
        <button
          type="button"
          onClick={() => navigate('/profissionais')}
          className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
          style={{ backgroundColor: theme.brownPrimary, color: theme.bgColor }}
        >
          Voltar para listagem
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      {/* Botão Voltar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/profissionais')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-xl cursor-pointer hover:bg-white/5 transition opacity-80 hover:opacity-100"
          style={{ color: theme.brownTitle }}
        >
          <ArrowLeft className="w-4 h-4" style={{ color: theme.brownPrimary }} />
          <span>Voltar aos profissionais</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-xl border cursor-pointer hover:bg-white/5 transition"
          style={{ borderColor: `${theme.brownPrimary}30`, color: theme.brownTitle }}
        >
          <Share2 className="w-3.5 h-3.5" style={{ color: theme.brownPrimary }} />
          <span>Compartilhar</span>
        </button>
      </div>

      {/* Capa e Cabeçalho do Perfil */}
      <div
        className="rounded-3xl border overflow-hidden backdrop-blur-xl shadow-xl transition-all"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderColor: `${theme.brownPrimary}30`,
        }}
      >
        {/* Foto de Capa */}
        <div className="relative h-44 sm:h-56 w-full bg-black/40 overflow-hidden">
          {professional.cover_image && (
            <img
              src={professional.cover_image}
              alt={professional.name}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        </div>

        {/* Informações Principais */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20">
            <div className="flex items-end gap-3.5">
              <img
                src={
                  professional.avatar ||
                  '/avatar-placeholder.svg'
                }
                alt={professional.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-4 shadow-xl shrink-0"
                style={{ borderColor: theme.brownPrimary }}
              />
              <div className="min-w-0 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1
                    className="text-xl sm:text-2xl font-black"
                    style={{ color: theme.brownTitle }}
                  >
                    {professional.name}
                  </h1>
                  {professional.verified && (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Verificado</span>
                    </span>
                  )}
                </div>
                <p
                  className="text-xs flex items-center gap-1.5 mt-1"
                  style={{ color: theme.brownMuted }}
                >
                  <MapPin className="w-3.5 h-3.5" style={{ color: theme.brownPrimary }} />
                  <span>
                    {professional.city}
                    {professional.state ? `, ${professional.state}` : ''}
                  </span>
                  {professional.address && <span>• {professional.address}</span>}
                </p>
              </div>
            </div>

            {/* Ações de Contato Direto */}
            <div className="flex items-center gap-2 shrink-0">
              {professional.whatsapp && (
                <a
                  href={`https://wa.me/55${professional.whatsapp.replace(/\D/g, '')}?text=Olá%20${encodeURIComponent(
                    professional.name,
                  )},%20encontrei%20seu%20perfil%20no%20app%20Meu%20Bichu!`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    backgroundColor: '#25D366',
                    color: '#052e16',
                  }}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>
              )}

              {professional.phone && (
                <a
                  href={`tel:${professional.phone.replace(/\D/g, '')}`}
                  className="p-2.5 rounded-2xl border text-xs font-semibold cursor-pointer hover:bg-white/5 transition"
                  style={{ borderColor: `${theme.brownPrimary}40`, color: theme.brownTitle }}
                  title="Ligar"
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}

              <button
                type="button"
                onClick={() => setContactModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold cursor-pointer transition hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: theme.brownPrimary,
                  color: theme.bgColor,
                }}
              >
                Solicitar Contato
              </button>
            </div>
          </div>

          {/* Credenciais & Avaliação */}
          <div
            className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 flex-wrap text-xs"
            style={{
              backgroundColor: 'rgba(0,0,0,0.25)',
              borderColor: `${theme.brownPrimary}20`,
            }}
          >
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4" style={{ color: theme.brownPrimary }} />
              <div>
                <span className="font-semibold" style={{ color: theme.brownTitle }}>
                  Registro &amp; Credenciais:
                </span>{' '}
                <span className="font-mono text-[11px]" style={{ color: theme.brownMuted }}>
                  {professional.credentials || 'Profissional com credenciais cadastradas'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-amber-400 font-bold">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-sm">
                {professional.rating_avg ? professional.rating_avg.toFixed(1) : '5.0'}
              </span>
              <span className="text-[11px] font-normal" style={{ color: theme.brownMuted }}>
                ({reviews.length} avaliações)
              </span>
            </div>
          </div>

          {/* Bio e Apresentação */}
          <div className="space-y-2">
            <h2
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: theme.brownMuted }}
            >
              Sobre o Profissional
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: theme.brownBody }}>
              {professional.bio}
            </p>
          </div>

          {/* Especialidades / Serviços */}
          {professional.specialties && professional.specialties.length > 0 && (
            <div className="space-y-2">
              <h2
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: theme.brownMuted }}
              >
                Especialidades &amp; Serviços Ofertados
              </h2>
              <div className="flex flex-wrap gap-2">
                {professional.specialties.map((spec) => (
                  <span
                    key={spec}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shadow-sm"
                    style={{
                      backgroundColor: `${theme.brownPrimary}15`,
                      borderColor: `${theme.brownPrimary}35`,
                      color: theme.brownTitle,
                    }}
                  >
                    <Sparkles className="w-3 h-3" style={{ color: theme.brownPrimary }} />
                    <span>{spec}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Galeria de Fotos / Portfólio */}
      {professional.portfolio && professional.portfolio.length > 0 && (
        <div
          className="p-5 sm:p-6 rounded-3xl border backdrop-blur-xl space-y-3"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderColor: `${theme.brownPrimary}25`,
          }}
        >
          <h2 className="text-sm font-bold" style={{ color: theme.brownTitle }}>
            Portfólio &amp; Registros Visuais ({professional.portfolio.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {professional.portfolio.map((img, idx) => (
              <div
                key={idx}
                className="aspect-square rounded-2xl overflow-hidden border bg-black/40 group relative"
                style={{ borderColor: `${theme.brownPrimary}20` }}
              >
                <img
                  src={img}
                  alt={`Portfólio ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seção de Avaliações */}
      <div
        className="p-5 sm:p-6 rounded-3xl border backdrop-blur-xl space-y-4"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderColor: `${theme.brownPrimary}25`,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold" style={{ color: theme.brownTitle }}>
              Avaliações de Tutores
            </h2>
            <p className="text-[11px]" style={{ color: theme.brownMuted }}>
              Opiniões reais de quem já utilizou os serviços
            </p>
          </div>

          <div className="flex items-center gap-1 text-amber-400 font-bold text-sm">
            <Star className="w-4 h-4 fill-amber-400" />
            <span>{professional.rating_avg ? professional.rating_avg.toFixed(1) : '5.0'}</span>
            <span className="text-xs font-normal" style={{ color: theme.brownMuted }}>
              / 5.0
            </span>
          </div>
        </div>

        {/* Formulário para Usuário Logado Avaliar */}
        <form
          onSubmit={handleAddReview}
          className="p-4 rounded-2xl border space-y-3 bg-black/30"
          style={{ borderColor: `${theme.brownPrimary}25` }}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold" style={{ color: theme.brownTitle }}>
              {user ? `Avaliar como ${user.name}` : 'Faça login para avaliar este profissional'}
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setNewRating(star)}
                  className="p-1 cursor-pointer transition hover:scale-110"
                >
                  <Star
                    className={`w-4 h-4 ${
                      star <= newRating ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <textarea
            rows={2}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Conte aos outros tutores como foi o atendimento..."
            className="w-full px-3 py-2 rounded-xl text-xs outline-none border transition bg-black/40 resize-none"
            style={{
              borderColor: `${theme.brownPrimary}30`,
              color: theme.brownTitle,
            }}
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submittingReview}
              className="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              style={{
                backgroundColor: theme.brownPrimary,
                color: theme.bgColor,
              }}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submittingReview ? 'Enviando...' : 'Publicar Avaliação'}</span>
            </button>
          </div>
        </form>

        {/* Lista de Avaliações */}
        <div className="space-y-3 pt-2">
          {reviews.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: theme.brownMuted }}>
              Seja o primeiro a avaliar este profissional!
            </p>
          ) : (
            reviews.map((rev) => (
              <div
                key={rev.id}
                className="p-3.5 rounded-2xl border space-y-1.5"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  borderColor: `${theme.brownPrimary}15`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: theme.brownTitle }}>
                    {rev.user_name}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${
                          s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {rev.comment && (
                  <p className="text-xs leading-relaxed" style={{ color: theme.brownBody }}>
                    {rev.comment}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Simples de Contato */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            className="p-6 rounded-3xl border max-w-sm w-full space-y-4 text-center shadow-2xl"
            style={{
              backgroundColor: `${theme.bgColor}f8`,
              borderColor: `${theme.brownPrimary}40`,
              color: theme.brownTitle,
            }}
          >
            <div
              className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center border"
              style={{
                backgroundColor: `${theme.brownPrimary}20`,
                borderColor: `${theme.brownPrimary}40`,
                color: theme.brownPrimary,
              }}
            >
              <MessageCircle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold">Solicitação de Contato</h3>
            <p className="text-xs" style={{ color: theme.brownMuted }}>
              Para agilizar o atendimento, entre em contato direto pelo WhatsApp oficial ou
              telefone:
            </p>

            <div className="space-y-2 pt-2">
              {professional.whatsapp && (
                <a
                  href={`https://wa.me/55${professional.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#25D366', color: '#052e16' }}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Chamar no WhatsApp ({professional.whatsapp})</span>
                </a>
              )}

              {professional.phone && (
                <a
                  href={`tel:${professional.phone.replace(/\D/g, '')}`}
                  className="w-full py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 hover:bg-white/5"
                  style={{ borderColor: `${theme.brownPrimary}40`, color: theme.brownTitle }}
                >
                  <Phone className="w-4 h-4" />
                  <span>Ligar ({professional.phone})</span>
                </a>
              )}
            </div>

            <button
              type="button"
              onClick={() => setContactModalOpen(false)}
              className="w-full py-2 rounded-xl text-xs font-semibold cursor-pointer opacity-70 hover:opacity-100"
              style={{ color: theme.brownMuted }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
