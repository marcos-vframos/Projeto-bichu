import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { UserPlus, Mail, Lock, User, MapPin, Briefcase, Heart, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveHeroTheme } from '@/hooks/use-active-hero-theme'
import { useDog } from '@/contexts/DogContext'
import { toast } from 'sonner'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, user } = useAuth()
  const { activeDog } = useDog()
  const { theme } = useActiveHeroTheme(activeDog)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [city, setCity] = useState('São Paulo')
  const [role, setRole] = useState<'tutor' | 'profissional' | 'ambos'>('tutor')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password) {
      toast.error('Preencha os campos obrigatórios')
      return
    }
    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres')
      return
    }

    setSubmitting(true)
    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        passwordConfirm: password,
        role,
        city: city.trim(),
      })
      toast.success('Conta criada com sucesso!')
      if (role === 'profissional' || role === 'ambos') {
        navigate('/profissionais/cadastrar')
      } else {
        navigate('/')
      }
    } catch (err: unknown) {
      console.error('Erro no cadastro:', err)
      let msg = 'Não foi possível criar a conta. Tente novamente.'
      if (err && typeof err === 'object') {
        const errorObj = err as Record<string, unknown>
        const response = errorObj.response as Record<string, unknown> | undefined
        const data = response?.data as Record<string, { message?: string }> | undefined
        if (data && typeof data === 'object') {
          const detailMsgs = Object.entries(data)
            .map(([field, detail]) => {
              const fieldName =
                field === 'email'
                  ? 'E-mail'
                  : field === 'password'
                    ? 'Senha'
                    : field === 'passwordConfirm'
                      ? 'Confirmação de senha'
                      : field === 'name'
                        ? 'Nome'
                        : field
              return `${fieldName}: ${detail?.message || 'inválido'}`
            })
            .filter(Boolean)
          if (detailMsgs.length > 0) {
            msg = detailMsgs.join(' | ')
          }
        } else if (typeof response?.message === 'string' && response.message) {
          msg = response.message
        } else if (typeof errorObj.message === 'string' && errorObj.message) {
          msg = errorObj.message
        }
      }
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (user) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center space-y-4">
        <h1 className="text-xl font-black" style={{ color: theme.brownTitle }}>
          Você já possui uma conta ativa!
        </h1>
        <p className="text-xs" style={{ color: theme.brownMuted }}>
          Conectado como <strong>{user.name}</strong> ({user.email})
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-2xl text-xs font-bold cursor-pointer"
          style={{ backgroundColor: theme.brownPrimary, color: theme.bgColor }}
        >
          Voltar para Início
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto py-6 sm:py-10 px-4 space-y-6">
      {/* Topo / Header */}
      <div className="text-center space-y-1.5">
        <div
          className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center border mb-3 shadow-md"
          style={{
            backgroundColor: `${theme.brownPrimary}20`,
            borderColor: `${theme.brownPrimary}40`,
            color: theme.brownPrimary,
          }}
        >
          <UserPlus className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black tracking-tight" style={{ color: theme.brownTitle }}>
          Criar Conta no Meu Bichu
        </h1>
        <p className="text-xs" style={{ color: theme.brownMuted }}>
          Participe da rede de nutrição, saúde, criadores e profissionais pet
        </p>
      </div>

      {/* Card do Formulário */}
      <div
        className="p-6 rounded-3xl border backdrop-blur-xl shadow-xl transition-all"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.035)',
          borderColor: `${theme.brownPrimary}30`,
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label className="text-xs font-bold block mb-1.5" style={{ color: theme.brownTitle }}>
              Seu Nome Completo
            </label>
            <div className="relative">
              <User
                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: theme.brownMuted }}
              />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Sam Silva, Dra. Roberta..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium outline-none border transition-colors bg-black/40"
                style={{
                  borderColor: `${theme.brownPrimary}30`,
                  color: theme.brownTitle,
                }}
              />
            </div>
          </div>

          {/* E-mail */}
          <div>
            <label className="text-xs font-bold block mb-1.5" style={{ color: theme.brownTitle }}>
              E-mail
            </label>
            <div className="relative">
              <Mail
                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: theme.brownMuted }}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium outline-none border transition-colors bg-black/40"
                style={{
                  borderColor: `${theme.brownPrimary}30`,
                  color: theme.brownTitle,
                }}
              />
            </div>
          </div>

          {/* Senha */}
          <div>
            <label className="text-xs font-bold block mb-1.5" style={{ color: theme.brownTitle }}>
              Senha de Acesso
            </label>
            <div className="relative">
              <Lock
                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: theme.brownMuted }}
              />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium outline-none border transition-colors bg-black/40"
                style={{
                  borderColor: `${theme.brownPrimary}30`,
                  color: theme.brownTitle,
                }}
              />
            </div>
          </div>

          {/* Cidade */}
          <div>
            <label className="text-xs font-bold block mb-1.5" style={{ color: theme.brownTitle }}>
              Sua Cidade / Região
            </label>
            <div className="relative">
              <MapPin
                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: theme.brownMuted }}
              />
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: São Paulo, Campinas, Rio de Janeiro..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium outline-none border transition-colors bg-black/40"
                style={{
                  borderColor: `${theme.brownPrimary}30`,
                  color: theme.brownTitle,
                }}
              />
            </div>
          </div>

          {/* Escolha do Perfil: Tutor / Profissional / Ambos */}
          <div>
            <label className="text-xs font-bold block mb-1.5" style={{ color: theme.brownTitle }}>
              Qual é o seu objetivo principal?
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole('tutor')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  role === 'tutor' ? 'ring-2' : 'hover:bg-white/5 opacity-80'
                }`}
                style={{
                  borderColor: role === 'tutor' ? theme.brownPrimary : 'rgba(255,255,255,0.1)',
                  backgroundColor: role === 'tutor' ? `${theme.brownPrimary}20` : 'rgba(0,0,0,0.3)',
                }}
              >
                <Heart className="w-4 h-4" style={{ color: theme.brownPrimary }} />
                <span className="text-[11px] font-bold" style={{ color: theme.brownTitle }}>
                  Tutor
                </span>
                <span className="text-[9px] opacity-75" style={{ color: theme.brownMuted }}>
                  Cuidar do meu pet
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRole('profissional')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  role === 'profissional' ? 'ring-2' : 'hover:bg-white/5 opacity-80'
                }`}
                style={{
                  borderColor:
                    role === 'profissional' ? theme.brownPrimary : 'rgba(255,255,255,0.1)',
                  backgroundColor:
                    role === 'profissional' ? `${theme.brownPrimary}20` : 'rgba(0,0,0,0.3)',
                }}
              >
                <Briefcase className="w-4 h-4" style={{ color: theme.brownPrimary }} />
                <span className="text-[11px] font-bold" style={{ color: theme.brownTitle }}>
                  Profissional
                </span>
                <span className="text-[9px] opacity-75" style={{ color: theme.brownMuted }}>
                  Oferecer serviços
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRole('ambos')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  role === 'ambos' ? 'ring-2' : 'hover:bg-white/5 opacity-80'
                }`}
                style={{
                  borderColor: role === 'ambos' ? theme.brownPrimary : 'rgba(255,255,255,0.1)',
                  backgroundColor: role === 'ambos' ? `${theme.brownPrimary}20` : 'rgba(0,0,0,0.3)',
                }}
              >
                <div className="flex gap-1">
                  <Heart className="w-3.5 h-3.5" style={{ color: theme.brownPrimary }} />
                  <Briefcase className="w-3.5 h-3.5" style={{ color: theme.brownPrimary }} />
                </div>
                <span className="text-[11px] font-bold" style={{ color: theme.brownTitle }}>
                  Ambos
                </span>
                <span className="text-[9px] opacity-75" style={{ color: theme.brownMuted }}>
                  Tutor & Pro
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg hover:scale-[1.01] active:scale-[0.98] mt-2"
            style={{
              backgroundColor: theme.brownPrimary,
              color: theme.bgColor,
            }}
          >
            {submitting ? (
              <span>Criando conta...</span>
            ) : (
              <>
                <span>Cadastrar Gratuitamente</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Já tem conta */}
      <div className="text-center">
        <p className="text-xs" style={{ color: theme.brownMuted }}>
          Já possui conta?{' '}
          <Link
            to="/entrar"
            className="font-bold underline hover:opacity-90"
            style={{ color: theme.brownPrimary }}
          >
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  )
}
