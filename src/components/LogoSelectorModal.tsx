import { preferenceStorage } from '@/lib/preferences'
import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AVAILABLE_LOGOS,
  DEFAULT_LOGO_ID,
  LOGO_STORAGE_KEY,
  getCroppedLogoImage,
  subscribeLogoCrops,
  initLogoCrops,
  LogoItem,
} from '@/lib/logo-assets'
import { Check, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

export function LogoSelectorModal({
  open,
  onClose,
  currentLogoId,
  onSelectLogo,
  primaryColor = '#E5A869',
  bgColor = '#0a0a0a',
  textColor = '#F4D4B5',
}: {
  open: boolean
  onClose: () => void
  currentLogoId: string
  onSelectLogo: (id: string) => void
  primaryColor?: string
  bgColor?: string
  textColor?: string
}) {
  const [, setTick] = useState(0)

  useEffect(() => {
    initLogoCrops()
    return subscribeLogoCrops(() => {
      setTick((t) => t + 1)
    })
  }, [])

  const handlePick = (logo: LogoItem) => {
    onSelectLogo(logo.id)
    try {
      preferenceStorage.setItem(LOGO_STORAGE_KEY, logo.id)
      window.dispatchEvent(new CustomEvent('bichu:header-logo-changed', { detail: logo.id }))
    } catch {
      // storage disabled
    }
    toast.success(`Ícone do cabeçalho alterado para "${logo.label}"`)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        className="max-w-xl max-h-[85vh] overflow-y-auto border backdrop-blur-2xl rounded-3xl p-5 sm:p-6"
        style={{
          backgroundColor: `${bgColor}f8`,
          borderColor: `${primaryColor}30`,
          color: textColor,
        }}
      >
        <DialogHeader
          className="space-y-1.5 pb-2 border-b"
          style={{ borderColor: `${primaryColor}20` }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: primaryColor }} />
            <DialogTitle className="text-lg font-black tracking-tight" style={{ color: textColor }}>
              Escolher Ícone da Marca
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs" style={{ color: `${textColor}aa` }}>
            Selecione o emblema oficial do Meu Bichu exibido ao lado do nome no cabeçalho.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3">
          {AVAILABLE_LOGOS.map((item) => {
            const isSelected = (currentLogoId || DEFAULT_LOGO_ID) === item.id
            const imgData = getCroppedLogoImage(item.id)

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePick(item)}
                className="group relative flex flex-col items-center p-3 rounded-2xl border text-center transition-all duration-200 cursor-pointer outline-none hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: isSelected ? `${primaryColor}18` : 'rgba(255, 255, 255, 0.02)',
                  borderColor: isSelected ? primaryColor : `${primaryColor}25`,
                }}
              >
                {/* Logo Image Preview */}
                <div
                  className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center border shadow-md transition-transform group-hover:scale-105"
                  style={{
                    backgroundColor: 'transparent',
                    borderColor: isSelected ? primaryColor : 'rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {imgData ? (
                    <img
                      src={imgData}
                      alt={item.label}
                      loading="lazy" decoding="async" className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs opacity-40 animate-pulse">
                      ...
                    </div>
                  )}
                </div>

                <div className="mt-2.5 w-full min-w-0">
                  <div className="flex items-center justify-center gap-1.5">
                    <span
                      className="text-xs font-bold truncate tracking-tight"
                      style={{ color: isSelected ? primaryColor : textColor }}
                    >
                      {item.label}
                    </span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 shrink-0" style={{ color: primaryColor }} />
                    )}
                  </div>
                  {item.description && (
                    <p
                      className="text-[10px] leading-tight line-clamp-1 mt-0.5"
                      style={{ color: `${textColor}77` }}
                    >
                      {item.description}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
