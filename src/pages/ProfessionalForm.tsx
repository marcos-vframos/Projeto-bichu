import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Upload,
  Plus,
  Trash2,
  ArrowLeft,
} from 'lucide-react'
import { communityService } from '@/services/community'
import { useAuth } from '@/contexts/AuthContext'
import { useDog } from '@/contexts/DogContext'
import { useActiveHeroTheme } from '@/hooks/use-active-hero-theme'
import { toast } from 'sonner'
import type { ProfessionalCategory } from '@/types/community'
import { CATEGORY_LABELS } from './ProfessionalsList'

export default function ProfessionalFormPage() {
  const { user, isAuthenticated } = useAuth()
  const { activeDog } = useDog()
  const { theme: activeHeroTheme } = useActiveHeroTheme(activeDog)
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [category, setCategory] = useState<ProfessionalCategory>('veterinario')
  const [specialtiesText, setSpecialtiesText] = useState('')
  const [bio, setBio] = useState('')
  const [credentials, setCredentials] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('SP')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [instagram, setInstagram] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Informe o nome do profissional ou estabelecimento.')
      return
    }
    if (!city.trim()) {
      toast.error('Informe a cidade principal de atendimento.')
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      if (user?.id) {
        formData.append('user', user.id)
      }
      formData.append('name', name.trim())
      formData.append('category', category)
      formData.append('bio', bio.trim())
      formData.append('credentials', credentials.trim())
      formData.append('city', city.trim())
      formData.append('state', state)
      formData.append('address', address.trim())
      formData.append('phone', phone.trim())
      formData.append('whatsapp', whatsapp.trim())
      formData.append('instagram', instagram.trim())
      formData.append('rating_avg', '5.0')
      formData.append('reviews_count', '0')
      formData.append('verified', 'false')

      // Parse specialties array
      const specs = specialtiesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      formData.append('specialties', JSON.stringify(specs))

      if (avatarFile) {
        formData.append('avatar', avatarFile)
      }

      const created = await communityService.createProfessional(formData)
      toast.success('Perfil profissional publicado com sucesso na comunidade!')
      navigate(`/profissionais/${created.id}`)
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : 'Falha ao cadastrar profissional.'
      toast.error(msg.includes('user') ? 'Você já possui um perfil profissional cadastrado.' : msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 pb-20 max-w-2xl mx-auto">
      <div>
        <button
          type="button"
          onClick={() => navigate('/profissionais')}
          className="flex items-center gap-2 text-xs font-semibold cursor-pointer transition hover:opacity-80"
          style={{ color: activeHeroTheme.brownMuted }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para profissionais</span>
        </button>
      </div>

      <div
        className="p-6 sm:p-8 rounded-3xl border backdrop-blur-2xl shadow-xl space-y-6"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderColor: `${activeHeroTheme.brownPrimary}30`,
        }}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" style={{ color: activeHeroTheme.brownPrimary }} />
            <h1
              className="text-xl sm:text-2xl font-black tracking-tight"
              style={{ color: activeHeroTheme.brownTitle }}
            >
              Cadastrar Perfil Profissional
            </h1>
            {!isAuthenticated && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                Modo Demonstração / Convidado
              </span>
            )}
          </div>
          <p className="text-xs" style={{ color: activeHeroTheme.brownMuted }}>
            Divulgue seus serviços veterinários, consultoria nutricional, canil, adestramento ou
            creche para milhares de tutores.
            {!isAuthenticated && ' (Você pode testar e cadastrar livremente sem login).'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <label
                className="text-xs font-semibold block"
                style={{ color: activeHeroTheme.brownTitle }}
              >
                Nome Profissional *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Dra. Mariana Silva"
                required
                className="w-full px-4 py-2.5 rounded-2xl text-xs font-semibold outline-none border"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.45)',
                  borderColor: `${activeHeroTheme.brownPrimary}35`,
                  color: activeHeroTheme.brownTitle,
                }}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label
                className="text-xs font-semibold block"
                style={{ color: activeHeroTheme.brownTitle }}
              >
                Categoria Principal de Atuação *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProfessionalCategory)}
                className="w-full px-3 py-2.5 rounded-2xl text-xs font-semibold outline-none border"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.45)',
                  borderColor: `${activeHeroTheme.brownPrimary}35`,
                  color: activeHeroTheme.brownTitle,
                }}
              >
                {Object.entries(CATEGORY_LABELS).map(([catKey, info]) => (
                  <option key={catKey} value={catKey} className="bg-neutral-900 text-white">
                    {info.icon} {info.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label
                className="text-xs font-semibold block"
                style={{ color: activeHeroTheme.brownTitle }}
              >
                Especialidades (separadas por vírgula)
              </label>
              <input
                type="text"
                value={specialtiesText}
                onChange={(e) => setSpecialtiesText(e.target.value)}
                placeholder="Ex: Nutrologia Clínica, Gastroenterologia, Rottweilers, Obediência..."
                className="w-full px-4 py-2.5 rounded-2xl text-xs font-semibold outline-none border"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.45)',
                  borderColor: `${activeHeroTheme.brownPrimary}35`,
                  color: activeHeroTheme.brownTitle,
                }}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label
                className="text-xs font-semibold block"
                style={{ color: activeHeroTheme.brownTitle }}
              >
                Credenciais / Registros Oficiais
              </label>
              <input
                type="text"
                value={credentials}
                onChange={(e) => setCredentials(e.target.value)}
                placeholder="Ex: CRMV-SP 12345 • Afixo CBKC/FCI 9876 • Certificação IACP"
                className="w-full px-4 py-2.5 rounded-2xl text-xs font-semibold outline-none border"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.45)',
                  borderColor: `${activeHeroTheme.brownPrimary}35`,
                  color: activeHeroTheme.brownTitle,
                }}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label
                className="text-xs font-semibold block"
                style={{ color: activeHeroTheme.brownTitle }}
              >
                Apresentação & Biografia
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Descreva sua experiência, metodologia de trabalho, cuidados e diferenciais..."
                className="w-full px-4 py-2.5 rounded-2xl text-xs font-medium outline-none border resize-none"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.45)',
                  borderColor: `${activeHeroTheme.brownPrimary}35`,
                  color: activeHeroTheme.brownTitle,
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="text-xs font-semibold block"
                style={{ color: activeHeroTheme.brownTitle }}
              >
                Cidade de Atendimento *
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: São Paulo"
                required
                className="w-full px-4 py-2.5 rounded-2xl text-xs font-semibold outline-none border"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.45)',
                  borderColor: `${activeHeroTheme.brownPrimary}35`,
                  color: activeHeroTheme.brownTitle,
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="text-xs font-semibold block"
                style={{ color: activeHeroTheme.brownTitle }}
              >
                Estado (UF)
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl text-xs font-semibold outline-none border"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.45)',
                  borderColor: `${activeHeroTheme.brownPrimary}35`,
                  color: activeHeroTheme.brownTitle,
                }}
              >
                {[
                  'AC',
                  'AL',
                  'AP',
                  'AM',
                  'BA',
                  'CE',
                  'DF',
                  'ES',
                  'GO',
                  'MA',
                  'MT',
                  'MS',
                  'MG',
                  'PA',
                  'PB',
                  'PR',
                  'PE',
                  'PI',
                  'RJ',
                  'RN',
                  'RS',
                  'RO',
                  'RR',
                  'SC',
                  'SP',
                  'SE',
                  'TO',
                ].map((uf) => (
                  <option key={uf} value={uf} className="bg-neutral-900 text-white">
                    {uf}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label
                className="text-xs font-semibold block"
                style={{ color: activeHeroTheme.brownTitle }}
              >
                Endereço / Bairro (Opcional)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: Av. Paulista, 1000 ou Atendimento Domiciliar"
                className="w-full px-4 py-2.5 rounded-2xl text-xs font-semibold outline-none border"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.45)',
                  borderColor: `${activeHeroTheme.brownPrimary}35`,
                  color: activeHeroTheme.brownTitle,
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="text-xs font-semibold block"
                style={{ color: activeHeroTheme.brownTitle }}
              >
                WhatsApp com DDD (para contato direto)
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Ex: 11999998888"
                className="w-full px-4 py-2.5 rounded-2xl text-xs font-semibold outline-none border"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.45)',
                  borderColor: `${activeHeroTheme.brownPrimary}35`,
                  color: activeHeroTheme.brownTitle,
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="text-xs font-semibold block"
                style={{ color: activeHeroTheme.brownTitle }}
              >
                Instagram Comercial
              </label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="Ex: @seucanil.oficial"
                className="w-full px-4 py-2.5 rounded-2xl text-xs font-semibold outline-none border"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.45)',
                  borderColor: `${activeHeroTheme.brownPrimary}35`,
                  color: activeHeroTheme.brownTitle,
                }}
              />
            </div>

            {/* Foto de Perfil / Logo */}
            <div className="space-y-1.5 sm:col-span-2">
              <label
                className="text-xs font-semibold block"
                style={{ color: activeHeroTheme.brownTitle }}
              >
                Foto de Perfil ou Logotipo da Empresa
              </label>
              <div
                className="p-4 rounded-2xl border border-dashed flex items-center justify-between"
                style={{
                  borderColor: `${activeHeroTheme.brownPrimary}40`,
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                }}
              >
                <div className="flex items-center gap-3">
                  <Upload className="w-5 h-5" style={{ color: activeHeroTheme.brownPrimary }} />
                  <span className="text-xs" style={{ color: activeHeroTheme.brownMuted }}>
                    {avatarFile ? avatarFile.name : 'Selecione uma imagem JPG, PNG ou WEBP'}
                  </span>
                </div>
                <label
                  htmlFor="pro-avatar-input"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition hover:scale-105"
                  style={{
                    backgroundColor: `${activeHeroTheme.brownPrimary}30`,
                    color: activeHeroTheme.brownPrimary,
                  }}
                >
                  Procurar
                </label>
                <input
                  id="pro-avatar-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-6 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 mt-4"
            style={{
              backgroundColor: activeHeroTheme.brownPrimary,
              color: activeHeroTheme.bgColor,
            }}
          >
            <span>{submitting ? 'Publicando...' : 'Publicar Perfil Profissional'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
