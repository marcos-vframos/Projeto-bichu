import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { LogIn, Mail, Lock, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveHeroTheme } from '@/hooks/use-active-hero-theme'
import { useDog } from '@/contexts/DogContext'
import { toast } from 'sonner'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, user } = useAuth()
  const { activeDog } = useDog()
  const { theme } = useActiveHeroTheme(activeDog)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Preencha e-mail e senha')
      return
    }

    setSubmitting(true)
    try {
      await login({ email, password })
      navigate('/configuracoes')
    } catch {
      toast.error('E-mail ou senha incorretos.')
    } finally {
      setSubmitting(false)
    }
  }


  if (user) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center space-y-4">
        <div
          className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center border shadow-lg"
          style={{
            backgroundColor: `${theme.brownPrimary}20`,
            borderColor: `${theme.brownPrimary}40`,
            color: theme.brownPrimary,
          }}
        >
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black" style={{ color: theme.brownTitle }}>
          Você já está conectado!
        </h1>
        <p className="text-xs" style={{ color: theme.brownMuted }}>
          Logado como <strong>{user.name}</strong> ({user.email})
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-5 py-2.5 rounded-2xl text-xs font-bold cursor-pointer"
            style={{ backgroundColor: theme.brownPrimary, color: theme.bgColor }}
          >
            Ir para Início
          </button>
          <button
            type="button"
            onClick={() => navigate('/configuracoes')}
            className="px-5 py-2.5 rounded-2xl text-xs font-semibold border cursor-pointer hover:bg-white/5"
            style={{ borderColor: `${theme.brownPrimary}40`, color: theme.brownTitle }}
          >
            Ajustes de Conta
          </button>
        </div>
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
          <LogIn className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black tracking-tight" style={{ color: theme.brownTitle }}>
          Entrar no Meu Bichu
        </h1>
        <p className="text-xs" style={{ color: theme.brownMuted }}>
          Acesse sua conta para sincronizar pets, interagir na rede social e conectar com
          profissionais
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

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold" style={{ color: theme.brownTitle }}>
                Senha
              </label>
            </div>
            <div className="relative">
              <Lock
                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: theme.brownMuted }}
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha secreta"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium outline-none border transition-colors bg-black/40"
                style={{
                  borderColor: `${theme.brownPrimary}30`,
                  color: theme.brownTitle,
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg hover:scale-[1.01] active:scale-[0.98]"
            style={{
              backgroundColor: theme.brownPrimary,
              color: theme.bgColor,
            }}
          >
            {submitting ? (
              <span>Entrando...</span>
            ) : (
              <>
                <span>Entrar na Conta</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>


      </div>

      {/* Não tem conta? Registrar */}
      <div className="text-center space-y-2">
        <p className="text-xs" style={{ color: theme.brownMuted }}>
          Ainda não tem conta?{' '}
          <Link
            to="/criar-conta"
            className="font-bold underline hover:opacity-90"
            style={{ color: theme.brownPrimary }}
          >
            Criar conta gratuita
          </Link>
        </p>

        <p className="text-[11px] opacity-70" style={{ color: theme.brownMuted }}>
          <ShieldCheck className="w-3 h-3 inline mr-1" />
          Modo convidado continua ativo caso prefira usar sem login.
        </p>
      </div>
    </div>
  )
}
