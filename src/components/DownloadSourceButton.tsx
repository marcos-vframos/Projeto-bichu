import React, { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { downloadSourceZip } from '@/lib/source-downloader'

export interface DownloadSourceButtonProps {
  primaryColor?: string
  textColor?: string
  bgColor?: string
  compact?: boolean
  className?: string
}

export function DownloadSourceButton({
  primaryColor = '#E5A869',
  textColor = '#F4D4B5',
  compact = false,
  className = '',
}: DownloadSourceButtonProps) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (downloading) return

    setDownloading(true)
    const toastId = toast.loading('Preparando download do código-fonte completo...')

    try {
      const result = await downloadSourceZip()
      toast.success('Download iniciado!', {
        id: toastId,
        description: `Arquivo ${result.filename} pronto para salvar.`,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao baixar o arquivo.'
      toast.error('Não foi possível baixar o código', {
        id: toastId,
        description: msg,
      })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading}
      title="Baixar código-fonte completo do Meu Bichu (ZIP)"
      aria-label="Baixar código-fonte completo em ZIP"
      className={`group inline-flex items-center gap-1.5 transition-all duration-200 cursor-pointer border rounded-full outline-none select-none disabled:opacity-60 disabled:cursor-wait hover:scale-[1.03] active:scale-[0.97] shadow-sm ${
        compact ? 'px-2 py-1 sm:px-2.5 sm:py-1' : 'px-2.5 py-1'
      } ${className}`}
      style={{
        backgroundColor: `${primaryColor}18`,
        borderColor: `${primaryColor}40`,
        color: textColor,
      }}
    >
      {downloading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: primaryColor }} />
      ) : (
        <Download
          className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:-translate-y-0.5"
          style={{ color: primaryColor }}
        />
      )}
      <span
        className="text-[10px] sm:text-[11px] font-semibold tracking-tight whitespace-nowrap"
        style={{ color: textColor }}
      >
        {downloading ? 'Baixando...' : 'Código'}
      </span>
    </button>
  )
}
