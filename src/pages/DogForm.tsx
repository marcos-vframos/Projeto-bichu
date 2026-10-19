import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Sparkles, Dog as DogIcon, Camera, UploadCloud, X } from 'lucide-react'
import { DogAvatar } from '@/components/DogAvatar'
import { getErrorMessage } from '@/lib/errors'
import { useDog } from '@/contexts/DogContext'
import { nutritionService } from '@/services/nutrition'
import { POPULAR_BREEDS } from '@/types/nutrition'
import type { DogRecord, DogSex, ActivityLevel, DogSize, BodyCondition, PetSpecies } from '@/types/nutrition'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

/**
 * Redimensiona e comprime uma foto do pet no navegador para evitar envio
 * de payloads gigantescos (>2MB-5MB) e garantir upload instantâneo e estável.
 */
async function compressImageFile(file: File, maxDimension = 1200, quality = 0.85): Promise<File> {
  // Se for SVG, não precisa de compressão via canvas
  if (file.type === 'image/svg+xml') return file

  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { width, height } = img

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        return resolve(file)
      }

      ctx.drawImage(img, 0, 0, width, height)

      // Escolhe tipo de saída (WebP se suportado, senão JPEG)
      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          const compressed = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, '') + (outputType === 'image/png' ? '.png' : '.jpg'),
            {
              type: outputType,
              lastModified: Date.now(),
            },
          )
          resolve(compressed)
        },
        outputType,
        quality,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file)
    }

    img.src = objectUrl
  })
}

export default function DogFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const { dogs, refreshDogs, setActiveDogId } = useDog()

  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)

  // Form State
  const [species, setSpecies] = useState<PetSpecies>('canina')
  const [name, setName] = useState('')
  const [breed, setBreed] = useState('SRD / Sem Raça Definida (Vira-lata)')
  const [birthDate, setBirthDate] = useState(() => {
    // Default to ~2 years ago
    const d = new Date()
    d.setFullYear(d.getFullYear() - 2)
    return d.toISOString().split('T')[0]
  })
  const [sex, setSex] = useState<DogSex>('macho')
  const [sterilized, setSterilized] = useState(true)
  const [weightKg, setWeightKg] = useState<number>(12)
  const [size, setSize] = useState<DogSize>('medio')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderada')
  const [bodyCondition, setBodyCondition] = useState<BodyCondition>('ideal')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null)

  // Gallery state: fotos existentes e novos arquivos
  interface GalleryItem {
    id: string
    url: string
    isPrimary: boolean
    file?: File
    isExisting?: boolean
    filename?: string
  }
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([])

  // Load dog data when editing
  useEffect(() => {
    if (!id) return
    let active = true

    async function load() {
      setLoading(true)
      const data = await nutritionService.getDogById(id!)
      if (!active) return
      if (data) {
        setSpecies(data.species === 'felina' ? 'felina' : 'canina')
        setName(data.name || '')
        setBreed(data.breed || 'SRD / Sem Raça Definida (Vira-lata)')
        setBirthDate(data.birth_date ? data.birth_date.split('T')[0] : '')
        setSex(data.sex || 'macho')
        setSterilized(Boolean(data.sterilized))
        setWeightKg(data.weight_kg || 10)
        setSize(data.size || 'medio')
        setActivityLevel(data.activity_level || 'moderada')
        setBodyCondition(data.body_condition || 'ideal')

        const items: GalleryItem[] = []
        if (data.avatar) {
          const mainUrl = nutritionService.getFileUrl(data, data.avatar) || data.avatar
          items.push({
            id: `avatar_${data.avatar}`,
            url: mainUrl,
            isPrimary: true,
            isExisting: true,
            filename: data.avatar,
          })
          setExistingAvatarUrl(mainUrl)
        }
        if (Array.isArray(data.gallery)) {
          for (const g of data.gallery) {
            if (!g || g === data.avatar) continue
            const gUrl = nutritionService.getFileUrl(data, g) || g
            items.push({
              id: `gallery_${g}`,
              url: gUrl,
              isPrimary: false,
              isExisting: true,
              filename: g,
            })
          }
        }
        setGalleryItems(items)
      } else {
        toast.error('Pet não encontrado')
        navigate('/caes')
      }
      setLoading(false)
    }

    load()
    return () => {
      active = false
    }
  }, [id, navigate])

  const handleMultipleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const validFiles = files.filter((f) => f.type.startsWith('image/'))
    if (validFiles.length === 0) {
      toast.error('Selecione imagens válidas (PNG, JPG, WEBP).')
      return
    }

    if (galleryItems.length + validFiles.length > 10) {
      toast.error('Limite de até 10 fotos por pet.')
      return
    }

    const newItems: GalleryItem[] = []

    for (const file of validFiles) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`Arquivo ${file.name} excede o limite de 10MB.`)
        continue
      }
      try {
        const compressed = await compressImageFile(file, 1200, 0.85)
        const previewUrl = URL.createObjectURL(compressed)
        const isFirstEver = galleryItems.length === 0 && newItems.length === 0
        newItems.push({
          id: `new_${Date.now()}_${Math.random()}`,
          url: previewUrl,
          file: compressed,
          isPrimary: isFirstEver,
        })
      } catch {
        const previewUrl = URL.createObjectURL(file)
        const isFirstEver = galleryItems.length === 0 && newItems.length === 0
        newItems.push({
          id: `new_${Date.now()}_${Math.random()}`,
          url: previewUrl,
          file,
          isPrimary: isFirstEver,
        })
      }
    }

    setGalleryItems((prev) => {
      const updated = [...prev, ...newItems]
      // Garante que pelo menos 1 é primária
      if (!updated.some((item) => item.isPrimary) && updated.length > 0) {
        updated[0].isPrimary = true
      }
      return updated
    })

    // Limpa o input para permitir selecionar novamente
    e.target.value = ''
  }

  const handleSetPrimaryPhoto = (index: number) => {
    setGalleryItems((prev) =>
      prev.map((item, idx) => ({
        ...item,
        isPrimary: idx === index,
      })),
    )
    toast.success('Foto definida como principal (avatar)!')
  }

  const handleRemoveGalleryPhoto = (index: number) => {
    setGalleryItems((prev) => {
      const target = prev[index]
      const nextList = prev.filter((_, idx) => idx !== index)
      // Se removeu a primária, torna a primeira restante como primária
      if (target.isPrimary && nextList.length > 0) {
        nextList[0].isPrimary = true
      }
      return nextList
    })
    if (galleryItems.length <= 1 && id) {
      import('@/lib/color-extractor').then(({ clearCachedPetPalette }) => {
        clearCachedPetPalette(id)
      })
    }
  }

  const handleBreedChange = (selectedBreed: string) => {
    setBreed(selectedBreed)
    const found = POPULAR_BREEDS.find((b) => b.name === selectedBreed)
    if (found) {
      setSize(found.defaultSize)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Por favor, informe o nome do pet.')
      return
    }

    if (!weightKg || weightKg <= 0 || weightKg > 120) {
      toast.error('Informe um peso válido entre 0.5kg e 120kg.')
      return
    }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('breed', breed)
      formData.append('species', species)
      formData.append('birth_date', birthDate)
      formData.append('sex', sex)
      formData.append('sterilized', String(sterilized))
      formData.append('weight_kg', String(Number(weightKg)))
      formData.append('size', size)
      formData.append('activity_level', activityLevel)
      formData.append('body_condition', bodyCondition)

      // Gerencia foto principal e galeria
      const primaryItem = galleryItems.find((item) => item.isPrimary) || galleryItems[0]

      if (primaryItem) {
        if (primaryItem.file) {
          formData.append('avatar', primaryItem.file)
        } else if (primaryItem.filename) {
          // Já existe no storage
          formData.append('avatar', primaryItem.filename)
        }
      } else {
        formData.append('avatar', '')
      }

      // Adiciona novos arquivos à galeria
      for (const item of galleryItems) {
        if (item.file) {
          formData.append('gallery', item.file)
        } else if (import.meta.env.VITE_PILOT_MODE === 'true' && item.filename) {
          formData.append('gallery', item.filename)
        }
      }

      if (isEditing && id) {
        const updated = await nutritionService.updateDog(id, formData)
        toast.success('Alterações salvas com sucesso!')
        // Sincroniza evento para recarregar o tema
        window.dispatchEvent(new Event('bichu:hero-theme-changed'))
        await refreshDogs()
        navigate(`/caes/${id}`)
      } else {
        const created = await nutritionService.createDog(formData)
        toast.success('Pet cadastrado com sucesso!')
        await refreshDogs()

        // Set as active if first dog or freshly registered
        if (dogs.length === 0 || !isEditing) {
          setActiveDogId(created.id)
        }
        // Dispara evento para atualização imediata do tema da foto
        window.dispatchEvent(new Event('bichu:hero-theme-changed'))
        navigate(`/caes/${created.id}/plano`)
      }
    } catch (err) {
      console.error('Erro ao salvar pet:', err)
      const errorMsg = getErrorMessage(err)
      toast.error(errorMsg || 'Erro ao salvar os dados do pet.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <div className="w-9 h-9 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        <p className="text-xs text-muted-foreground">Carregando dados do pet...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl hover:bg-muted"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Button>
        <div>
          <h1 className="text-xl font-black tracking-tight text-foreground">
            {isEditing ? `Editar perfil de ${name || 'pet'}` : 'Cadastrar novo pet'}
          </h1>
          <p className="text-xs text-muted-foreground">
            Dados biométricos essenciais para cálculo calórico e nutricional
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identificação Card */}
        <div className="p-5 rounded-3xl bg-card border border-border/80 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <DogIcon className="w-4 h-4" />
            <span>Identificação do Pet</span>
          </div>

          {/* Photo & Multi-Image Gallery Upload Section */}
          <div className="p-4 rounded-2xl bg-background/50 border border-border/70 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">Galeria de Fotos do Pet</span>
                  <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
                    Rotação Sequencial no Hero
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Adicione uma ou mais fotos (até 10). Elas serão intercaladas suavemente no topo da
                  Home.
                </p>
              </div>

              <label
                htmlFor="dog-multi-photo-input"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold cursor-pointer transition shadow-sm"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Adicionar fotos</span>
              </label>
              <input
                id="dog-multi-photo-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handleMultipleFilesChange}
                className="hidden"
              />
            </div>

            {/* Grid de fotos selecionadas */}
            {galleryItems.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
                {galleryItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`relative group rounded-2xl overflow-hidden border aspect-square bg-black/40 flex items-center justify-center transition-all ${
                      item.isPrimary
                        ? 'border-primary ring-2 ring-primary/40 shadow-md'
                        : 'border-border/80 hover:border-primary/50'
                    }`}
                  >
                    <img
                      src={item.url}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Tag de foto principal */}
                    {item.isPrimary ? (
                      <span className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
                        Principal
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryPhoto(idx)}
                        className="absolute top-1.5 left-1.5 bg-black/60 hover:bg-black/90 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        Definir principal
                      </button>
                    )}

                    {/* Botão de exclusão */}
                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryPhoto(idx)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-500/80 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm"
                      title="Remover foto"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                onClick={() => document.getElementById('dog-multi-photo-input')?.click()}
                className="p-6 rounded-xl border border-dashed border-border/80 text-center cursor-pointer hover:bg-white/5 transition flex flex-col items-center justify-center gap-2"
              >
                <Camera className="w-6 h-6 text-muted-foreground" />
                <p className="text-xs font-semibold text-foreground">
                  Nenhuma foto carregada ainda
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Toque aqui para enviar fotos do seu pet (JPG, PNG ou WebP de até 10MB)
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dog-name" className="text-xs font-semibold text-foreground">
              Nome do pet <span className="text-rose-400">*</span>
            </Label>
            <Input
              id="dog-name"
              placeholder="Ex: Thor, Mel, Bob, Luna"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background border-border/70 text-sm h-11 rounded-xl"
              required
            />
          </div>

          <div className="space-y-1.5"><Label htmlFor="pet-species">Espécie</Label>
            <select id="pet-species" value={species} onChange={e => { setSpecies(e.target.value as PetSpecies); setBreed('SRD / Sem Raça Definida'); }} className="w-full h-12 rounded-xl border border-border bg-background px-3 text-foreground">
              <option value="canina">Cão</option><option value="felina">Gato</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="breed-select" className="text-xs font-semibold text-foreground">
                Raça
              </Label>
              {species === 'felina' ? <Input id="breed-select" value={breed} onChange={e => setBreed(e.target.value)} placeholder="Raça ou SRD" className="bg-background h-11 rounded-xl" /> : <Select value={breed} onValueChange={handleBreedChange}>
                <SelectTrigger
                  id="breed-select"
                  className="bg-background border-border/70 text-sm h-11 rounded-xl"
                >
                  <SelectValue placeholder="Selecione a raça" />
                </SelectTrigger>
                <SelectContent className="max-h-60 bg-card border-border/80">
                  {POPULAR_BREEDS.map((b) => (
                    <SelectItem key={b.name} value={b.name} className="text-xs">
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="birth-date" className="text-xs font-semibold text-foreground">
                Data de Nascimento (estimada)
              </Label>
              <Input
                id="birth-date"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="bg-background border-border/70 text-sm h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Sexo</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={sex === 'macho' ? 'default' : 'outline'}
                  onClick={() => setSex('macho')}
                  className="h-10 text-xs rounded-xl font-semibold"
                >
                  Macho
                </Button>
                <Button
                  type="button"
                  variant={sex === 'femea' ? 'default' : 'outline'}
                  onClick={() => setSex('femea')}
                  className="h-10 text-xs rounded-xl font-semibold"
                >
                  Fêmea
                </Button>
              </div>
            </div>

            <div className="flex flex-col justify-end">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-background/60 border border-border/60">
                <div>
                  <Label
                    htmlFor="castrado"
                    className="text-xs font-semibold text-foreground cursor-pointer"
                  >
                    Castrado(a)?
                  </Label>
                  <p className="text-[10px] text-muted-foreground">Ajusta o fator metabólico</p>
                </div>
                <Switch id="castrado" checked={sterilized} onCheckedChange={setSterilized} />
              </div>
            </div>
          </div>
        </div>

        {/* Biometria & Atividade Card */}
        <div className="p-5 rounded-3xl bg-card border border-border/80 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Sparkles className="w-4 h-4" />
            <span>Biometria e Rotina</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="weight" className="text-xs font-semibold text-foreground">
                Peso Atual (kg) <span className="text-rose-400">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="120"
                  value={weightKg}
                  onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                  className="bg-background border-border/70 text-sm h-11 rounded-xl pr-12 font-bold"
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  kg
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dog-size" className="text-xs font-semibold text-foreground">
                Porte Sugerido
              </Label>
              <Select value={size} onValueChange={(val: DogSize) => setSize(val)}>
                <SelectTrigger
                  id="dog-size"
                  className="bg-background border-border/70 text-sm h-11 rounded-xl"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/80">
                  <SelectItem value="mini" className="text-xs">
                    Mini (até 5kg)
                  </SelectItem>
                  <SelectItem value="pequeno" className="text-xs">
                    Pequeno (5 a 10kg)
                  </SelectItem>
                  <SelectItem value="medio" className="text-xs">
                    Médio (10 a 25kg)
                  </SelectItem>
                  <SelectItem value="grande" className="text-xs">
                    Grande (25 a 45kg)
                  </SelectItem>
                  <SelectItem value="gigante" className="text-xs">
                    Gigante (+45kg)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Activity Level */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Nível de Atividade Física Diária
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'baixa', label: 'Sedentário / Leve', desc: 'Passeios curtos' },
                { id: 'moderada', label: 'Moderado', desc: '1h de brincadeiras' },
                { id: 'alta', label: 'Intenso / Ativo', desc: 'Corridas & agilidade' },
              ].map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => setActivityLevel(act.id as ActivityLevel)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    activityLevel === act.id
                      ? 'bg-primary/15 border-primary/70 text-foreground font-bold'
                      : 'bg-background/60 border-border/60 text-muted-foreground hover:border-border'
                  }`}
                >
                  <p className="text-xs font-bold leading-tight">{act.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{act.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Body Condition */}
          <div className="space-y-1.5">
            <Label htmlFor="body-condition" className="text-xs font-semibold text-foreground">
              Condição Corporal Atual
            </Label>
            <Select
              value={bodyCondition}
              onValueChange={(val: BodyCondition) => setBodyCondition(val)}
            >
              <SelectTrigger
                id="body-condition"
                className="bg-background border-border/70 text-sm h-11 rounded-xl"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/80">
                <SelectItem value="abaixo_do_ideal" className="text-xs">
                  Abaixo do ideal (costelas muito visíveis / magro)
                </SelectItem>
                <SelectItem value="ideal" className="text-xs">
                  Ideal (cintura visível, peso saudável)
                </SelectItem>
                <SelectItem value="acima_do_ideal" className="text-xs">
                  Acima do ideal (sobrepeso / sem cintura definida)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex-1 rounded-xl h-12 text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            disabled={saving}
            className="flex-[2] h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Concluir Cadastro'}
          </Button>
        </div>
      </form>
    </div>
  )
}
