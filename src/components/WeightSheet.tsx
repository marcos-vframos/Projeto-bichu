import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Minus, Scale } from 'lucide-react'
import { nutritionService } from '@/services/nutrition'
import { toast } from 'sonner'
import type { DogRecord } from '@/types/nutrition'

interface WeightSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dog: DogRecord | null
  onSaved?: () => void
}

export const WeightSheet: React.FC<WeightSheetProps> = ({ open, onOpenChange, dog, onSaved }) => {
  const [weight, setWeight] = useState<number>(dog?.weight_kg || 10)
  const [date, setDate] = useState<string>(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()))
  const [saving, setSaving] = useState(false)

  // Reset when opened
  React.useEffect(() => {
    if (dog?.weight_kg) {
      setWeight(dog.weight_kg)
    }
    setDate(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()))
  }, [dog, open])

  const adjust = (delta: number) => {
    setWeight((prev) => {
      const next = Math.max(0.5, Math.min(120, Number((prev + delta).toFixed(1))))
      return next
    })
  }

  const handleSave = async () => {
    if (!dog) return
    if (weight <= 0) {
      toast.error('Informe um peso válido')
      return
    }

    setSaving(true)
    try {
      await nutritionService.addWeightLog(dog.id, weight, date)
      toast.success('Peso registrado com sucesso!')
      onOpenChange(false)
      onSaved?.()
    } catch (e) {
      console.error(e)
      toast.error('Não foi possível registrar o peso.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border/80">
        <DialogHeader>
          <div className="w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-1">
            <Scale className="w-5 h-5" />
          </div>
          <DialogTitle className="text-lg">Registrar Peso</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Acompanhe a curva de peso de {dog?.name || 'seu cão'} para calibrar as porções.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Stepper display */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-muted/40 border border-border/50">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Peso Atual
            </span>
            <div className="flex items-baseline gap-1 my-3">
              <span className="text-5xl font-black tracking-tight text-foreground">{weight}</span>
              <span className="text-xl font-bold text-emerald-400">kg</span>
            </div>

            <div className="flex items-center gap-3 w-full max-w-xs justify-center mt-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => adjust(-0.5)}
                className="w-11 h-11 rounded-full border-border/70 hover:bg-emerald-500/10 hover:text-emerald-400"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => adjust(-0.1)}
                className="h-9 px-3 rounded-full text-xs font-semibold border-border/70 hover:bg-emerald-500/10 hover:text-emerald-400"
              >
                -0.1
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => adjust(+0.1)}
                className="h-9 px-3 rounded-full text-xs font-semibold border-border/70 hover:bg-emerald-500/10 hover:text-emerald-400"
              >
                +0.1
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => adjust(+0.5)}
                className="w-11 h-11 rounded-full border-border/70 hover:bg-emerald-500/10 hover:text-emerald-400"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="date" className="text-xs text-muted-foreground">
              Data da pesagem
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-background border-border/70 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs rounded-lg px-5"
          >
            {saving ? 'Salvando...' : 'Salvar Registro'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
