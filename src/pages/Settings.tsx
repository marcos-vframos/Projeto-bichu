import {clearOffline} from '@/lib/offline-cache'
import PilotFeedback from '@/components/PilotFeedback'
import PreferenceSyncStatus from '@/components/PreferenceSyncStatus'
import { preferenceStorage } from '@/lib/preferences'
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User,
  Shield,
  Palette,
  LogOut,
  Trash2,
  Plus,
  Save,
  Cpu,
  Radio,
  Edit3,
  Calendar,
  Sparkles,
  AlertTriangle,
  Check,
  Info,
} from 'lucide-react'
import { BRAND } from '@/lib/brand'
import { useDog } from '@/contexts/DogContext'
import { useAuth } from '@/contexts/AuthContext'
import { nutritionService } from '@/services/nutrition'
import { DogAvatar } from '@/components/DogAvatar'
import { HeroSelectorModal } from '@/components/HeroSelectorModal'
import {
  HERO_THEMES,
  HERO_STORAGE_KEY,
  DEFAULT_HERO_THEME_ID,
  getHeroThemeById,
  applyHeroThemeToDom,
  HeroTheme,
} from '@/lib/hero-themes'
import { getTutorName, setTutorName } from '@/lib/tutor'
import { useActiveHeroTheme } from '@/hooks/use-active-hero-theme'
import { setPetHeroPreference } from '@/lib/color-extractor'
import { DogRecord } from '@/types/nutrition'
import { Briefcase, Share2, Heart } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export { SettingsPage }
export default function SettingsPage() {
  useEffect(()=>{window.dispatchEvent(new Event('bichu:pilot-controls'));return()=>{setTimeout(()=>window.dispatchEvent(new Event('bichu:pilot-controls')),0)}},[])
  const navigate = useNavigate()
  const { dogs, refreshDogs, activeDog, setActiveDogId } = useDog()
  const { user, profile, isAuthenticated, logout } = useAuth()

  // 1. Dados do Tutor
  const [tutorInput, setTutorInput] = useState(() => getTutorName())
  const [tutorSaved, setTutorSaved] = useState(false)

  const handleSaveTutor = (e: React.FormEvent) => {
    e.preventDefault()
    setTutorName(tutorInput)
    setTutorSaved(true)
    setTimeout(() => setTutorSaved(false), 2000)
    toast.success('Nome do tutor atualizado')
  }

  // ── Bloco de Conta e Comunidade inserido no topo ──
  const { theme } = useActiveHeroTheme(activeDog)
  const accountBlock = (
    <div
      className="p-5 rounded-3xl border backdrop-blur-xl shadow-lg space-y-4"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.035)',
        borderColor: `${theme.brownPrimary}30`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center border font-bold shadow-md"
            style={{
              backgroundColor: `${theme.brownPrimary}20`,
              borderColor: `${theme.brownPrimary}40`,
              color: theme.brownPrimary,
            }}
          >
            <User className="w-5 h-5" />
          </div>
          <div>
            {isAuthenticated && user ? (
              <>
                <p className="text-xs font-bold" style={{ color: theme.brownTitle }}>
                  {user.name}
                </p>
                <p className="text-[11px]" style={{ color: theme.brownMuted }}>
                  {user.email}
                </p>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 inline-block"
                  style={{
                    backgroundColor: `${theme.brownPrimary}15`,
                    borderColor: `${theme.brownPrimary}30`,
                    color: theme.brownPrimary,
                  }}
                >
                  Perfil: {profile?.role || 'Tutor'}
                </span>
              </>
            ) : (
              <>
                <p className="text-xs font-bold" style={{ color: theme.brownTitle }}>
                  Modo Convidado (Sem login)
                </p>
                <p className="text-[11px]" style={{ color: theme.brownMuted }}>
                  Entre para sincronizar seus pets e acessar a comunidade
                </p>
              </>
            )}
          </div>
        </div>

        <div>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => logout()}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
            >
              Sair
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/entrar')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
                style={{ backgroundColor: theme.brownPrimary, color: theme.bgColor }}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => navigate('/criar-conta')}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border hover:bg-white/5 transition cursor-pointer"
                style={{ borderColor: `${theme.brownPrimary}40`, color: theme.brownTitle }}
              >
                Registrar
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-white/5 grid grid-cols-1 gap-2">
        <button
          type="button"
          onClick={() => navigate('/profissionais')}
          className="p-3 rounded-2xl border bg-black/30 hover:bg-black/50 flex flex-col items-center gap-1.5 transition cursor-pointer"
          style={{ borderColor: `${theme.brownPrimary}25` }}
        >
          <Briefcase className="w-4 h-4" style={{ color: theme.brownPrimary }} />
          <span className="text-[11px] font-bold" style={{ color: theme.brownTitle }}>
            Profissionais
          </span>
          <span className="text-[9px] opacity-70" style={{ color: theme.brownMuted }}>
            Vets &amp; Canis
          </span>
        </button>




      </div>
    </div>
  )

  // 2. Privacidade
  const [privacyAnalytics, setPrivacyAnalytics] = useState(() => {
    try {
      return preferenceStorage.getItem('bichu_privacy_analytics') !== 'false'
    } catch {
      return true
    }
  })
  const [privacyOffline, setPrivacyOffline] = useState(() => {
    try {
      return preferenceStorage.getItem('bichu_privacy_offline') !== 'false'
    } catch {
      return true
    }
  })

  const toggleAnalytics = () => {
    const next = !privacyAnalytics
    setPrivacyAnalytics(next)
    try {
      preferenceStorage.setItem('bichu_privacy_analytics', String(next))
    } catch {
      /* intentionally ignored */
    }
    window.dispatchEvent(new Event('bichu:privacy-changed'))
    toast.success(next ? 'Métricas do piloto ativadas' : 'Métricas do piloto desativadas')
  }

  const toggleOffline = () => {
    const next = !privacyOffline
    setPrivacyOffline(next)
    if(!next)clearOffline()
    try {
      preferenceStorage.setItem('bichu_privacy_offline', String(next))
    } catch {
      /* intentionally ignored */
    }
    toast.success(next ? 'Armazenamento offline ativado' : 'Armazenamento offline pausado')
  }

  // 3. Troca de Temas / Heros / Foto do Pet
  const [heroModalOpen, setHeroModalOpen] = useState(false)
  const activeHero = useActiveHeroTheme(activeDog)
  const currentTheme = activeHero.theme

  const handleSelectTheme = (theme: HeroTheme) => {
    try {
      if (activeDog) setPetHeroPreference(activeDog.id, false)
      preferenceStorage.setItem('bichu_manual_color', 'false')
      preferenceStorage.setItem(HERO_STORAGE_KEY, theme.id)
      // Se for um dos temas neutros, sincroniza também bichu_theme
      if (theme.id === 'neutral-black-white' || theme.id === 'neutral-white-black') {
        preferenceStorage.setItem('bichu_theme', theme.id)
        document.documentElement.setAttribute('data-theme', theme.id)
      }
      applyHeroThemeToDom(theme)
      window.dispatchEvent(new Event('bichu:hero-theme-changed'))
    } catch {
      /* intentionally ignored */
    }
  }

  // 4. Modais Sair / Excluir Conta
  const [logoutModalOpen, setLogoutModalOpen] = useState(false)
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false)
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('')

  const handleLogout = () => { logout() }

  const handleDeleteAllData = async () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'EXCLUIR') {
      toast.error('Digite a palavra EXCLUIR para confirmar.')
      return
    }
    try {
      if(import.meta.env.VITE_PILOT_MODE==='true'){
        const r=await fetch('/api/pilot/account',{method:'DELETE',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({confirmation:'EXCLUIR'})})
        if(!r.ok)throw Error((await r.json()).error||'Não foi possível excluir a conta')
        const id=user?.id
        if(id){localStorage.removeItem(`mb_preferences_${id}`);localStorage.removeItem(`mb_preferences_pending_${id}`);localStorage.removeItem(`mb_offline_${id}`)}
        sessionStorage.removeItem('mb_offline_session')
      }else{for(const d of dogs)await nutritionService.deleteDog(d.id)}
      toast.success('Conta e dados associados excluídos do servidor.');window.location.reload()

    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir os dados.')
    }
  }

  // 5. Gestão Técnica dos Animais (Edição rápida inline / técnica)
  const [editingPet, setEditingPet] = useState<DogRecord | null>(null)
  const [deletePetTarget, setDeletePetTarget] = useState<DogRecord | null>(null)
  const [savingPet, setSavingPet] = useState(false)
  const [petGalleryItems, setPetGalleryItems] = useState<
    { id: string; url: string; isPrimary: boolean; file?: File; filename?: string }[]
  >([])

  useEffect(() => {
    if (!editingPet) {
      setPetGalleryItems([])
      return
    }
    const list: { id: string; url: string; isPrimary: boolean; filename?: string }[] = []
    if (editingPet.avatar) {
      const mainUrl =
        nutritionService.getFileUrl(editingPet, editingPet.avatar) || editingPet.avatar
      list.push({
        id: `avatar_${editingPet.avatar}`,
        url: mainUrl,
        isPrimary: true,
        filename: editingPet.avatar,
      })
    }
    if (Array.isArray(editingPet.gallery)) {
      for (const g of editingPet.gallery) {
        if (!g || g === editingPet.avatar) continue
        const gUrl = nutritionService.getFileUrl(editingPet, g) || g
        list.push({
          id: `gallery_${g}`,
          url: gUrl,
          isPrimary: false,
          filename: g,
        })
      }
    }
    setPetGalleryItems(list)
  }, [editingPet])

  const handleSavePetTechnical = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPet) return
    setSavingPet(true)
    try {
      const formData = new FormData()
      formData.append('name', editingPet.name)
      formData.append('species', editingPet.species || 'canina')
      formData.append('breed', editingPet.breed)
      formData.append('sex', editingPet.sex)
      formData.append('sterilized', String(editingPet.sterilized))
      formData.append('birth_date', editingPet.birth_date)
      formData.append('weight_kg', String(Number(editingPet.weight_kg)))
      formData.append('microchip', editingPet.microchip || '')
      formData.append('tracker_brand', editingPet.tracker_brand || '')
      formData.append('tracker_id', editingPet.tracker_id || '')
      formData.append('notes', editingPet.notes || '')

      const primary = petGalleryItems.find((i) => i.isPrimary) || petGalleryItems[0]
      if (primary) {
        if (primary.file) {
          formData.append('avatar', primary.file)
        } else if (primary.filename) {
          formData.append('avatar', primary.filename)
        }
      } else {
        formData.append('avatar', '')
      }

      for (const item of petGalleryItems) {
        if (item.file) {
          formData.append('gallery', item.file)
        }
      }

      await nutritionService.updateDog(editingPet.id, formData)
      await refreshDogs()
      window.dispatchEvent(new Event('bichu:hero-theme-changed'))
      toast.success(`Informações e galeria de ${editingPet.name} salvas!`)
      setEditingPet(null)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar as informações do animal.')
    } finally {
      setSavingPet(false)
    }
  }

  const handleDeletePet = async () => {
    if (!deletePetTarget) return
    try {
      await nutritionService.deleteDog(deletePetTarget.id)
      await refreshDogs()
      toast.success(`Pet ${deletePetTarget.name} removido com sucesso.`)
      setDeletePetTarget(null)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao remover o pet.')
    }
  }

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-black tracking-tight"
            style={{ color: currentTheme.brownTitle }}
          >
            Configurações
          </h1>
          <p className="text-xs mt-0.5" style={{ color: currentTheme.brownMuted }}>
            Preferências do tutor, privacidade, interfaces e ficha técnica dos animais
          </p>
        </div>
      </div>

      {import.meta.env.VITE_PILOT_MODE === 'true' && <><PreferenceSyncStatus /><div id="pilot-metrics-settings" /><section className="rounded-2xl border border-current/20 p-4"><h2 className="text-lg font-bold mb-3">Feedback</h2><PilotFeedback /></section></>}
      {/* 1. SEÇÃO DO TUTOR */}
      <section
        className="p-5 sm:p-6 rounded-3xl border backdrop-blur-xl transition-all shadow-md"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderColor: `${currentTheme.brownPrimary}25`,
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center border"
            style={{
              backgroundColor: `${currentTheme.brownPrimary}20`,
              borderColor: `${currentTheme.brownPrimary}40`,
              color: currentTheme.brownPrimary,
            }}
          >
            <User className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold" style={{ color: currentTheme.brownTitle }}>
              Informações do Tutor
            </h2>
            <p className="text-[11px]" style={{ color: currentTheme.brownMuted }}>
              Utilizado na saudação e personalização das recomendações
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveTutor} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label
              htmlFor="tutor-name"
              className="text-xs font-semibold block mb-1"
              style={{ color: currentTheme.brownTitle }}
            >
              Nome do Tutor
            </label>
            <input
              id="tutor-name"
              type="text"
              value={tutorInput}
              onChange={(e) => setTutorInput(e.target.value)}
              placeholder="Ex: Sam, Marcos, Ana..."
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold outline-none border transition-colors"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                borderColor: `${currentTheme.brownPrimary}35`,
                color: currentTheme.brownTitle,
              }}
            />
          </div>
          <div className="sm:self-end">
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: currentTheme.brownPrimary,
                color: currentTheme.bgColor,
              }}
            >
              {tutorSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{tutorSaved ? 'Salvo!' : 'Salvar Tutor'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* 2. GERENCIAMENTO DOS ANIMAIS (Ficha técnica completa, chips, coleira/rastreador) */}
      <section
        className="p-5 sm:p-6 rounded-3xl border backdrop-blur-xl transition-all shadow-md space-y-4"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderColor: `${currentTheme.brownPrimary}25`,
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center border"
              style={{
                backgroundColor: `${currentTheme.brownPrimary}20`,
                borderColor: `${currentTheme.brownPrimary}40`,
                color: currentTheme.brownPrimary,
              }}
            >
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: currentTheme.brownTitle }}>
                Gerenciamento dos Animais Cadastrados
              </h2>
              <p className="text-[11px]" style={{ color: currentTheme.brownMuted }}>
                Ficha técnica, microchips, rastreadores e identificadores
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/caes/novo')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundColor: `${currentTheme.brownPrimary}25`,
              borderColor: `${currentTheme.brownPrimary}50`,
              color: currentTheme.brownPrimary,
              border: `1px solid ${currentTheme.brownPrimary}50`,
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Animal</span>
          </button>
        </div>

        {dogs.length === 0 ? (
          <div
            className="p-8 rounded-2xl border text-center space-y-2"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderColor: `${currentTheme.brownPrimary}20`,
            }}
          >
            <p className="text-xs" style={{ color: currentTheme.brownMuted }}>
              Nenhum animal cadastrado no dispositivo.
            </p>
            <button
              onClick={() => navigate('/caes/novo')}
              className="text-xs font-bold underline"
              style={{ color: currentTheme.brownPrimary }}
            >
              Cadastrar agora
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {dogs.map((dog) => {
              const isSelectedActive = activeDog?.id === dog.id

              return (
                <div
                  key={dog.id}
                  className="p-4 rounded-2xl border transition-all"
                  style={{
                    backgroundColor: isSelectedActive
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(0, 0, 0, 0.25)',
                    borderColor: isSelectedActive
                      ? `${currentTheme.brownPrimary}60`
                      : `${currentTheme.brownPrimary}20`,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <DogAvatar
                        dog={dog}
                        name={dog.name}
                        avatarUrl={nutritionService.getAvatarUrl(dog)}
                        size="lg"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3
                            className="text-sm font-black truncate"
                            style={{ color: currentTheme.brownTitle }}
                          >
                            {dog.name}
                          </h3>
                          {isSelectedActive && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                              style={{
                                backgroundColor: `${currentTheme.brownPrimary}25`,
                                borderColor: `${currentTheme.brownPrimary}50`,
                                color: currentTheme.brownPrimary,
                              }}
                            >
                              Ativo
                            </span>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: currentTheme.brownMuted }}>
                          {dog.species === 'felina' ? 'Gato' : 'Cão'} • {dog.breed || 'SRD'} •{' '}
                          {dog.weight_kg} kg • {dog.sex === 'femea' ? 'Fêmea' : 'Macho'} •{' '}
                          {dog.sterilized ? 'Castrado(a)' : 'Não castrado(a)'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveDogId(dog.id)}
                        className="p-2 rounded-xl text-xs font-semibold cursor-pointer transition opacity-80 hover:opacity-100 hover:bg-white/5"
                        style={{ color: currentTheme.brownPrimary }}
                        title="Tornar pet ativo"
                      >
                        {isSelectedActive ? 'Em uso' : 'Ativar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPet(dog)}
                        className="p-2 rounded-xl text-xs font-semibold cursor-pointer transition hover:bg-white/5"
                        style={{ color: currentTheme.brownTitle }}
                        title="Editar informações técnicas"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletePetTarget(dog)}
                        className="p-2 rounded-xl text-xs cursor-pointer transition hover:bg-rose-500/10 text-rose-400"
                        title="Excluir animal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Ficha técnica em destaque */}
                  <div
                    className="mt-3 pt-3 border-t grid grid-cols-1 gap-2.5 text-[11px]"
                    style={{ borderColor: `${currentTheme.brownPrimary}15` }}
                  >
                    <div className="flex items-center gap-1.5">
                      <Cpu
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: currentTheme.brownPrimary }}
                      />
                      <span style={{ color: currentTheme.brownMuted }}>Microchip:</span>
                      <strong className="truncate" style={{ color: currentTheme.brownTitle }}>
                        {dog.microchip || 'Não informado'}
                      </strong>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Radio
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: currentTheme.brownPrimary }}
                      />
                      <span style={{ color: currentTheme.brownMuted }}>Coleira/Rastreador:</span>
                      <strong className="truncate" style={{ color: currentTheme.brownTitle }}>
                        {dog.tracker_brand
                          ? `${dog.tracker_brand} (${dog.tracker_id || 'ID s/n'})`
                          : 'Nenhum'}
                      </strong>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Calendar
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: currentTheme.brownPrimary }}
                      />
                      <span style={{ color: currentTheme.brownMuted }}>Nascimento:</span>
                      <strong style={{ color: currentTheme.brownTitle }}>
                        {dog.birth_date
                          ? new Date(dog.birth_date).toLocaleDateString('pt-BR')
                          : 'Não informada'}
                      </strong>
                    </div>
                  </div>

                  {dog.notes && (
                    <p
                      className="mt-2 text-[11px] italic leading-relaxed"
                      style={{ color: `${currentTheme.brownTitle}aa` }}
                    >
                      &ldquo;{dog.notes}&rdquo;
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 3. SEÇÃO DE INTERFACES E TEMAS POR RAÇA */}
      <section
        className="p-5 sm:p-6 rounded-3xl border backdrop-blur-xl transition-all shadow-md space-y-4"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderColor: `${currentTheme.brownPrimary}25`,
        }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center border"
              style={{
                backgroundColor: `${currentTheme.brownPrimary}20`,
                borderColor: `${currentTheme.brownPrimary}40`,
                color: currentTheme.brownPrimary,
              }}
            >
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: currentTheme.brownTitle }}>
                Interface e Cores do Aplicativo
              </h2>
              <p className="text-[11px]" style={{ color: currentTheme.brownMuted }}>
                Atualmente ativa: <strong>{currentTheme.name}</strong>{' '}
                {activeHero.isPetHero
                  ? '(Cores extraídas da foto do pet)'
                  : `(${HERO_THEMES.length} interfaces, incluindo 100% Neutras)`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const neutralTheme = HERO_THEMES.find((t) => t.id === 'neutral-black-white')
                if (neutralTheme) handleSelectTheme(neutralTheme)
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer hover:opacity-90"
              style={{
                backgroundColor: '#000000',
                borderColor: '#ffffff30',
                color: '#ffffff',
              }}
              title="Ativar tema 100% Neutro Black & White"
            >
              Neutro P&B
            </button>
            <button
              type="button"
              onClick={() => {
                const neutralTheme = HERO_THEMES.find((t) => t.id === 'neutral-white-black')
                if (neutralTheme) handleSelectTheme(neutralTheme)
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer hover:opacity-90"
              style={{
                backgroundColor: '#ffffff',
                borderColor: '#00000030',
                color: '#000000',
              }}
              title="Ativar tema 100% Neutro White & Black"
            >
              Neutro B&P
            </button>
            <button
              type="button"
              onClick={() => setHeroModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: currentTheme.brownPrimary,
                color: currentTheme.bgColor,
              }}
            >
              Todas as Interfaces
            </button>
          </div>
        </div>

        {/* Controle específico quando o pet ativo tem foto cadastrada */}
        {activeDog && activeHero.hasPetPhoto && (
          <div
            className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 flex-wrap"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              borderColor: `${currentTheme.brownPrimary}20`,
            }}
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4" style={{ color: currentTheme.brownPrimary }} />
              <div>
                <p className="text-xs font-bold" style={{ color: currentTheme.brownTitle }}>
                  Usar foto de {activeDog.name} no Hero e Cores da Interface
                </p>
                <p className="text-[10px]" style={{ color: currentTheme.brownMuted }}>
                  Quando ativado, a foto do seu pet substitui a imagem genérica e as cores das telas
                  adaptam-se à foto.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const next = !activeHero.usePetHeroPref
                setPetHeroPreference(activeDog.id, next)
                toast.success(
                  next
                    ? `Visual adaptado à foto de ${activeDog.name} ativado!`
                    : `Visual da raça ${activeHero.baseBreedTheme.name} restaurado.`,
                )
              }}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                activeHero.usePetHeroPref ? 'bg-emerald-500' : 'bg-white/20'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  activeHero.usePetHeroPref ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        )}
      </section>

      {/* 4. PRIVACIDADE E DADOS LOCAIS */}
      <section
        className="p-5 sm:p-6 rounded-3xl border backdrop-blur-xl transition-all shadow-md space-y-4"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderColor: `${currentTheme.brownPrimary}25`,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center border"
            style={{
              backgroundColor: `${currentTheme.brownPrimary}20`,
              borderColor: `${currentTheme.brownPrimary}40`,
              color: currentTheme.brownPrimary,
            }}
          >
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold" style={{ color: currentTheme.brownTitle }}>
              Privacidade do Dispositivo
            </h2>
            <p className="text-[11px]" style={{ color: currentTheme.brownMuted }}>
              Acesso individual por conta. As informações ficam separadas por tutor.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-black/20 border border-white/5">
            <div>
              <p className="text-xs font-bold" style={{ color: currentTheme.brownTitle }}>
                Consulta offline
              </p>
              <p className="text-[10px]" style={{ color: currentTheme.brownMuted }}>
                Permite consultar dados já carregados nesta sessão sem conexão. Novos registros exigem internet.
              </p>
            </div>
            <button
              type="button"
              onClick={toggleOffline}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                privacyOffline ? 'bg-emerald-500' : 'bg-white/20'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  privacyOffline ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-black/20 border border-white/5">
            <div>
              <p className="text-xs font-bold" style={{ color: currentTheme.brownTitle }}>
                Métricas de uso e falhas
              </p>
              <p className="text-[10px]" style={{ color: currentTheme.brownMuted }}>
                Permite analisar uso e falhas, vinculados à sua conta. Desative para interromper novos envios.
              </p>
            </div>
            <button
              type="button"
              onClick={toggleAnalytics}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                privacyAnalytics ? 'bg-emerald-500' : 'bg-white/20'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  privacyAnalytics ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* 5. FICHA TÉCNICA DA APLICAÇÃO */}
      <section
        className="p-5 sm:p-6 rounded-3xl border backdrop-blur-xl transition-all shadow-md space-y-4"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderColor: `${currentTheme.brownPrimary}25`,
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center border"
            style={{
              backgroundColor: `${currentTheme.brownPrimary}20`,
              borderColor: `${currentTheme.brownPrimary}40`,
              color: currentTheme.brownPrimary,
            }}
          >
            <Info className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold" style={{ color: currentTheme.brownTitle }}>
              Ficha Técnica da Aplicação
            </h2>
            <p className="text-[11px]" style={{ color: currentTheme.brownMuted }}>
              Identidade, versão do sistema e parâmetros científicos
            </p>
          </div>
        </div>

        <div
          className="p-4 rounded-2xl border space-y-3"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            borderColor: `${currentTheme.brownPrimary}20`,
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5">
            <span className="text-xs font-semibold" style={{ color: currentTheme.brownMuted }}>
              Nome da Aplicação
            </span>
            <span className="text-xs font-bold" style={{ color: currentTheme.brownTitle }}>
              {BRAND.pro}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5">
            <span className="text-xs font-semibold" style={{ color: currentTheme.brownMuted }}>
              Versão do Sistema
            </span>
            <span
              className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border"
              style={{
                backgroundColor: `${currentTheme.brownPrimary}20`,
                borderColor: `${currentTheme.brownPrimary}40`,
                color: currentTheme.brownPrimary,
              }}
            >
              v{BRAND.version}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5">
            <span className="text-xs font-semibold" style={{ color: currentTheme.brownMuted }}>
              Propósito / Tagline
            </span>
            <span
              className="text-xs font-medium text-right"
              style={{ color: currentTheme.brownTitle }}
            >
              {BRAND.tagline}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5">
            <span className="text-xs font-semibold" style={{ color: currentTheme.brownMuted }}>
              Diretrizes Nutricionais
            </span>
            <span className="text-xs font-medium" style={{ color: currentTheme.brownTitle }}>
              NRC 2006 / FEDIAF / AAFCO
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold" style={{ color: currentTheme.brownMuted }}>
              Escala de Condição Corporal
            </span>
            <span className="text-xs font-medium" style={{ color: currentTheme.brownTitle }}>
              WSAVA BCS 1-9 (Canina &amp; Felina)
            </span>
          </div>
        </div>
      </section>

      {/* ATALHOS PARA COMUNIDADE E REDE SOCIAL */}
      <section
        className="p-5 sm:p-6 rounded-3xl border backdrop-blur-xl transition-all shadow-md space-y-4"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderColor: `${currentTheme.brownPrimary}30`,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold" style={{ color: currentTheme.brownTitle }}>
              Comunidade & Serviços Pet
            </h2>
            <p className="text-[11px]" style={{ color: currentTheme.brownMuted }}>
              Consulte o guia regional de profissionais e serviços
            </p>
          </div>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${currentTheme.brownPrimary}20`,
              color: currentTheme.brownPrimary,
            }}
          >
            Novo
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">


          <button
            type="button"
            onClick={() => navigate('/profissionais')}
            className="p-3 rounded-2xl border text-left transition hover:scale-[1.02] cursor-pointer"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              borderColor: `${currentTheme.brownPrimary}25`,
            }}
          >
            <p className="text-xs font-bold" style={{ color: currentTheme.brownTitle }}>
              🩺 Profissionais
            </p>
            <p className="text-[11px]" style={{ color: currentTheme.brownMuted }}>
              Veterinários e creches
            </p>
          </button>


        </div>
      </section>

      {/* 6. GESTÃO DE SESSÃO / SAIR / EXCLUIR */}
      <section
        className="p-5 sm:p-6 rounded-3xl border backdrop-blur-xl transition-all shadow-md space-y-4"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderColor: 'rgba(255, 255, 255, 0.08)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold" style={{ color: currentTheme.brownTitle }}>
              Sessão & Conta de Usuário
            </h2>
            <p className="text-[11px]" style={{ color: currentTheme.brownMuted }}>
              {isAuthenticated
                ? `Conectado como ${profile?.display_name || user?.name || user?.email}`
                : 'Você está no modo convidado (armazenamento neste dispositivo)'}
            </p>
          </div>
          {!isAuthenticated && (
            <button
              type="button"
              onClick={() => navigate('/entrar')}
              className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition hover:scale-105"
              style={{
                backgroundColor: currentTheme.brownPrimary,
                color: currentTheme.bgColor,
              }}
            >
              Fazer Login / Cadastrar
            </button>
          )}
        </div>

        {isAuthenticated && (
          <div
            className="p-4 rounded-2xl border flex items-center justify-between"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              borderColor: `${currentTheme.brownPrimary}20`,
            }}
          >
            <div>
              <p className="text-xs font-bold" style={{ color: currentTheme.brownTitle }}>
                {profile?.display_name || user?.name}
              </p>
              <p className="text-[11px]" style={{ color: currentTheme.brownMuted }}>
                {user?.email} • @{profile?.username || 'tutor'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                logout()
                toast.success('Você encerrou a sessão.')
              }}
              className="px-3 py-1.5 rounded-xl border text-xs font-semibold text-rose-400 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer"
            >
              Desconectar
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => setLogoutModalOpen(true)}
            className="flex-1 py-3 px-4 rounded-2xl border text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2 hover:bg-white/5"
            style={{
              borderColor: `${currentTheme.brownPrimary}40`,
              color: currentTheme.brownTitle,
            }}
          >
            <LogOut className="w-4 h-4" />
            <span>Limpar Dados do Dispositivo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDeleteConfirmationText('')
              setDeleteAccountModalOpen(true)
            }}
            className="flex-1 py-3 px-4 rounded-2xl border border-rose-500/30 text-rose-400 text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2 hover:bg-rose-500/10"
          >
            <Trash2 className="w-4 h-4" />
            <span>Excluir Conta e Dados</span>
          </button>
        </div>
      </section>

      {/* MODAL DE SELEÇÃO DE HERO */}
      <HeroSelectorModal
        open={heroModalOpen}
        onClose={() => setHeroModalOpen(false)}
        currentThemeId={currentTheme.id}
        onSelectTheme={handleSelectTheme}
        activeDog={activeDog}
        suggestedTheme={null}
      />

      {/* MODAL EDITAR INFORMAÇÕES TÉCNICAS DO PET */}
      <Dialog open={Boolean(editingPet)} onOpenChange={(open) => !open && setEditingPet(null)}>
        <DialogContent
          className="max-w-lg max-h-[85vh] overflow-y-auto border backdrop-blur-2xl rounded-3xl p-5"
          style={{
            backgroundColor: `${currentTheme.bgColor}f8`,
            borderColor: `${currentTheme.brownPrimary}30`,
            color: currentTheme.brownTitle,
          }}
        >
          {editingPet && (
            <form onSubmit={handleSavePetTechnical} className="space-y-4">
              <DialogHeader>
                <DialogTitle
                  className="text-base font-black"
                  style={{ color: currentTheme.brownTitle }}
                >
                  Ficha Técnica • {editingPet.name}
                </DialogTitle>
                <DialogDescription className="text-xs" style={{ color: currentTheme.brownMuted }}>
                  Cadastre o microchip, modelo de rastreador e observações clínicas
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold block" style={{ color: currentTheme.brownTitle }}>
                    Nome
                  </label>
                  <input
                    type="text"
                    value={editingPet.name}
                    onChange={(e) => setEditingPet({ ...editingPet, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold block" style={{ color: currentTheme.brownTitle }}>
                    Raça
                  </label>
                  <input
                    type="text"
                    value={editingPet.breed}
                    onChange={(e) => setEditingPet({ ...editingPet, breed: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold block" style={{ color: currentTheme.brownTitle }}>
                    Peso Atual (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingPet.weight_kg}
                    onChange={(e) =>
                      setEditingPet({ ...editingPet, weight_kg: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold block" style={{ color: currentTheme.brownTitle }}>
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={editingPet.birth_date ? editingPet.birth_date.split('T')[0] : ''}
                    onChange={(e) => setEditingPet({ ...editingPet, birth_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-semibold block" style={{ color: currentTheme.brownTitle }}>
                    Número do Microchip
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 981098108765432"
                    value={editingPet.microchip || ''}
                    onChange={(e) => setEditingPet({ ...editingPet, microchip: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold block" style={{ color: currentTheme.brownTitle }}>
                    Marca / Modelo da Coleira
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Tractive, Apple AirTag..."
                    value={editingPet.tracker_brand || ''}
                    onChange={(e) =>
                      setEditingPet({ ...editingPet, tracker_brand: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold block" style={{ color: currentTheme.brownTitle }}>
                    Identificador / ID do Rastreador
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: TRK-99214-BR"
                    value={editingPet.tracker_id || ''}
                    onChange={(e) => setEditingPet({ ...editingPet, tracker_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-semibold block" style={{ color: currentTheme.brownTitle }}>
                    Observações Pertinentes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Alergias, medicações de uso contínuo, vacinas, cirurgias..."
                    value={editingPet.notes || ''}
                    onChange={(e) => setEditingPet({ ...editingPet, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs resize-none"
                  />
                </div>

                {/* Gestão rápida de fotos do pet no modal */}
                <div className="space-y-2 sm:col-span-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span
                      className="font-semibold text-xs"
                      style={{ color: currentTheme.brownTitle }}
                    >
                      Fotos do Pet ({petGalleryItems.length})
                    </span>
                    <label
                      htmlFor="quick-pet-photo-upload"
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition flex items-center gap-1 shadow-sm"
                      style={{
                        backgroundColor: `${currentTheme.brownPrimary}30`,
                        color: currentTheme.brownPrimary,
                      }}
                    >
                      <Plus className="w-3 h-3" />
                      <span>Adicionar fotos</span>
                    </label>
                    <input
                      id="quick-pet-photo-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || [])
                        if (files.length === 0) return
                        const newOnes = files.map((f) => ({
                          id: `quick_${Date.now()}_${Math.random()}`,
                          url: URL.createObjectURL(f),
                          isPrimary: petGalleryItems.length === 0,
                          file: f,
                        }))
                        setPetGalleryItems((prev) => [...prev, ...newOnes])
                        e.target.value = ''
                      }}
                    />
                  </div>

                  {petGalleryItems.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {petGalleryItems.map((item, idx) => (
                        <div
                          key={item.id}
                          className={`relative aspect-square rounded-xl overflow-hidden border group bg-black/40 ${
                            item.isPrimary
                              ? 'border-primary ring-2 ring-primary/40'
                              : 'border-white/10'
                          }`}
                        >
                          <img src={item.url} alt="Pet" className="w-full h-full object-cover" />
                          {item.isPrimary ? (
                            <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[8px] font-bold px-1 rounded">
                              Principal
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setPetGalleryItems((prev) =>
                                  prev.map((it, i) => ({ ...it, isPrimary: i === idx })),
                                )
                              }
                              className="absolute top-1 left-1 bg-black/70 text-white text-[8px] px-1 rounded opacity-0 group-hover:opacity-100 transition"
                            >
                              Principal
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setPetGalleryItems((prev) => {
                                const filtered = prev.filter((_, i) => i !== idx)
                                if (item.isPrimary && filtered.length > 0) {
                                  filtered[0].isPrimary = true
                                }
                                return filtered
                              })
                            }}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-sm"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="pt-2 flex-row gap-2 justify-end">
                {' '}
                <button
                  type="button"
                  onClick={() => setEditingPet(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium cursor-pointer hover:bg-white/5"
                  style={{ color: currentTheme.brownMuted }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPet}
                  className="px-5 py-2 rounded-xl text-xs font-bold cursor-pointer"
                  style={{
                    backgroundColor: currentTheme.brownPrimary,
                    color: currentTheme.bgColor,
                  }}
                >
                  {savingPet ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL CONFIRMAÇÃO EXCLUIR PET */}
      <Dialog
        open={Boolean(deletePetTarget)}
        onOpenChange={(open) => !open && setDeletePetTarget(null)}
      >
        <DialogContent
          className="max-w-md border backdrop-blur-2xl rounded-3xl p-5"
          style={{
            backgroundColor: `${currentTheme.bgColor}f8`,
            borderColor: 'rgba(244, 63, 94, 0.4)',
            color: currentTheme.brownTitle,
          }}
        >
          <DialogHeader>
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-black text-rose-400">
              Excluir animal cadastrado?
            </DialogTitle>
            <DialogDescription className="text-xs" style={{ color: currentTheme.brownMuted }}>
              Tem certeza de que deseja remover permanentemente o perfil de{' '}
              <strong>{deletePetTarget?.name}</strong>, incluindo histórico de pesagens e planos?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 flex-row gap-2 justify-end">
            <button
              type="button"
              onClick={() => setDeletePetTarget(null)}
              className="px-4 py-2 rounded-xl text-xs font-medium cursor-pointer hover:bg-white/5"
              style={{ color: currentTheme.brownMuted }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDeletePet}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white cursor-pointer"
            >
              Confirmar Exclusão
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CONFIRMAÇÃO SAIR */}
      <Dialog open={logoutModalOpen} onOpenChange={setLogoutModalOpen}>
        <DialogContent
          className="max-w-md border backdrop-blur-2xl rounded-3xl p-5"
          style={{
            backgroundColor: `${currentTheme.bgColor}f8`,
            borderColor: `${currentTheme.brownPrimary}30`,
            color: currentTheme.brownTitle,
          }}
        >
          <DialogHeader>
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center border mb-2"
              style={{
                backgroundColor: `${currentTheme.brownPrimary}20`,
                borderColor: `${currentTheme.brownPrimary}40`,
                color: currentTheme.brownPrimary,
              }}
            >
              <LogOut className="w-5 h-5" />
            </div>
            <DialogTitle
              className="text-base font-black"
              style={{ color: currentTheme.brownTitle }}
            >
              Sair do Dispositivo
            </DialogTitle>
            <DialogDescription className="text-xs" style={{ color: currentTheme.brownMuted }}>
              Isso limpará os estados ativos e a sessão em memória deste navegador. Seus dados
              principais permanecerão salvos.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 flex-row gap-2 justify-end">
            <button
              type="button"
              onClick={() => setLogoutModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium cursor-pointer hover:bg-white/5"
              style={{ color: currentTheme.brownMuted }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
              style={{
                backgroundColor: currentTheme.brownPrimary,
                color: currentTheme.bgColor,
              }}
            >
              Confirmar e Sair
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CONFIRMAÇÃO DUPLA EXCLUIR CONTA */}
      <Dialog open={deleteAccountModalOpen} onOpenChange={setDeleteAccountModalOpen}>
        <DialogContent
          className="max-w-md border backdrop-blur-2xl rounded-3xl p-5"
          style={{
            backgroundColor: `${currentTheme.bgColor}f8`,
            borderColor: 'rgba(244, 63, 94, 0.4)',
            color: currentTheme.brownTitle,
          }}
        >
          <DialogHeader>
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-black text-rose-400">
              Excluir conta e dados do servidor?
            </DialogTitle>
            <DialogDescription className="text-xs" style={{ color: currentTheme.brownMuted }}>
              Esta ação é <strong>irreversível</strong>. A conta, pets, fotos, pesagens, planos, feedbacks, telemetria e histórico de alterações serão apagados do servidor. O prazo de sete dias, sozinho, não apaga esses dados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold block text-rose-400">
              Para prosseguir, digite a palavra EXCLUIR abaixo:
            </label>
            <input
              type="text"
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              placeholder="Digite EXCLUIR"
              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-rose-500/40 text-xs text-rose-200 uppercase font-bold"
            />
          </div>

          <DialogFooter className="pt-3 flex-row gap-2 justify-end">
            <button
              type="button"
              onClick={() => setDeleteAccountModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium cursor-pointer hover:bg-white/5"
              style={{ color: currentTheme.brownMuted }}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={deleteConfirmationText.trim().toUpperCase() !== 'EXCLUIR'}
              onClick={handleDeleteAllData}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white cursor-pointer"
            >
              Apagar Tudo Definitivamente
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
