import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Check, Trash2, Edit2, ChevronRight, Scale, Bone, AlertCircle } from 'lucide-react'
import { useDog } from '@/contexts/DogContext'
import { DogAvatar } from '@/components/DogAvatar'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { nutritionService } from '@/services/nutrition'
import { formatAge } from '@/lib/nutrition-calculator'
import { toast } from 'sonner'
import type { DogRecord } from '@/types/nutrition'

export default function DogsListPage() {
  const { dogs, activeDog, setActiveDogId, refreshDogs } = useDog()
  const navigate = useNavigate()
  const [dogToDelete, setDogToDelete] = useState<DogRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleSetPrimary = (dog: DogRecord, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveDogId(dog.id)
    toast.success(`${dog.name} agora é o pet ativo`)
  }

  const handleDelete = async () => {
    if (!dogToDelete) return
    setDeleting(true)
    try {
      const ok = await nutritionService.deleteDog(dogToDelete.id)
      if (ok) {
        toast.success(`Perfil de ${dogToDelete.name} excluído`)
        await refreshDogs()
      } else {
        toast.error('Erro ao excluir o perfil do pet')
      }
    } catch {
      toast.error('Não foi possível excluir o pet')
    } finally {
      setDeleting(false)
      setDogToDelete(null)
    }
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Meus pets</h1>
          <p className="text-xs text-muted-foreground">
            Gerencie cães e gatos desta conta ({dogs.length})
          </p>
        </div>

        <Button
          onClick={() => navigate('/caes/novo')}
          className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs rounded-xl shadow-md"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Adicionar pet
        </Button>
      </div>

      {dogs.length === 0 ? (
        <div className="p-8 rounded-3xl bg-card border border-border/80 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
            <Bone className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Nenhum pet cadastrado</h2>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
              Cadastre o perfil do seu primeiro pet para calcular sua porção ideal de ração.
            </p>
          </div>
          <Button
            onClick={() => navigate('/caes/novo')}
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-xl text-xs px-6"
          >
            Cadastrar pet
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {dogs.map((dog) => {
            const isActive = activeDog?.id === dog.id
            const ageText = formatAge(dog.birth_date)

            return (
              <div
                key={dog.id}
                onClick={() => navigate(`/caes/${dog.id}`)}
                className={`group relative p-4 sm:p-5 rounded-3xl bg-card border transition-all cursor-pointer ${
                  isActive
                    ? 'border-emerald-500/70 shadow-lg shadow-emerald-500/5 bg-gradient-to-r from-card via-card to-emerald-950/10'
                    : 'border-border/60 hover:border-emerald-500/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <DogAvatar
                      dog={dog}
                      name={dog.name}
                      avatarUrl={nutritionService.getAvatarUrl(dog)}
                      size="lg"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-foreground truncate group-hover:text-primary transition">
                          {dog.name}
                        </h2>
                        {isActive && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Ativo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {dog.species === 'felina' ? 'Gato' : 'Cão'} • {dog.breed || 'SRD'} • {ageText} • {dog.sex === 'femea' ? 'Fêmea' : 'Macho'}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-foreground/80 mt-1.5 font-medium">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Scale className="w-3.5 h-3.5" />
                          {dog.weight_kg} kg
                        </span>
                        {dog.sterilized && (
                          <span className="text-[11px] text-muted-foreground">• Castrado(a)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {!isActive && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleSetPrimary(dog, e)}
                        className="h-8 text-xs text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg px-2"
                        title="Tornar ativo"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Ativar
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/caes/${dog.id}/editar`)
                      }}
                      className="h-8 w-8 text-muted-foreground hover:text-white rounded-lg"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDogToDelete(dog)
                      }}
                      className="h-8 w-8 text-muted-foreground hover:text-rose-400 rounded-lg"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-1" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!dogToDelete} onOpenChange={(open) => !open && setDogToDelete(null)}>
        <AlertDialogContent className="bg-card border-border/80">
          <AlertDialogHeader>
            <div className="w-10 h-10 rounded-full bg-rose-500/15 text-rose-400 flex items-center justify-center mb-1">
              <AlertCircle className="w-5 h-5" />
            </div>
            <AlertDialogTitle className="text-base text-foreground">
              Excluir {dogToDelete?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Esta ação removerá o perfil, os registros de peso e os planos de nutrição associados.
              Esta operação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel className="text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs"
            >
              {deleting ? 'Excluindo...' : 'Sim, excluir pet'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
