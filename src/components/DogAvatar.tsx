import React from 'react'
import { nutritionService } from '@/services/nutrition'
import type { DogRecord } from '@/types/nutrition'

interface DogAvatarProps {
  name?: string
  avatarUrl?: string
  dog?: DogRecord | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const PALETTES = [
  'from-emerald-500 to-teal-700',
  'from-amber-500 to-orange-700',
  'from-blue-500 to-indigo-700',
  'from-purple-500 to-pink-700',
  'from-rose-500 to-red-700',
  'from-cyan-500 to-blue-700',
]

function getPalette(name: string = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const idx = Math.abs(hash) % PALETTES.length
  return PALETTES[idx]
}

export const DogAvatar: React.FC<DogAvatarProps> = ({
  name = 'Cão',
  avatarUrl,
  dog,
  size = 'md',
  className = '',
}) => {
  // Se dog for passado, resolve a URL real pelo nutritionService
  // Se avatarUrl for um nome de arquivo PocketBase, resolve via getFileUrl
  const resolvedUrl = React.useMemo(() => {
    if (dog) {
      return nutritionService.getAvatarUrl(dog) || avatarUrl
    }
    if (avatarUrl) {
      if (
        avatarUrl.startsWith('http://') ||
        avatarUrl.startsWith('https://') ||
        avatarUrl.startsWith('data:') ||
        avatarUrl.startsWith('/') ||
        avatarUrl.startsWith('blob:')
      ) {
        return avatarUrl
      }
      // Provável nome de arquivo PocketBase salvo diretamente
      return nutritionService.getFileUrl({ avatar: avatarUrl } as DogRecord, avatarUrl) || avatarUrl
    }
    return undefined
  }, [dog, avatarUrl])

  const displayName = dog?.name || name
  const initials = (displayName.trim() || 'C')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('')

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base font-semibold',
    xl: 'w-20 h-20 text-xl font-bold',
  }[size]

  const [imgError, setImgError] = React.useState(false)

  // Reset imgError if resolvedUrl changes
  React.useEffect(() => {
    setImgError(false)
  }, [resolvedUrl])

  if (resolvedUrl && !imgError) {
    return (
      <div
        className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 border border-primary/30 shadow-sm ${sizeClasses} ${className}`}
      >
        <img
          src={resolvedUrl}
          alt={displayName}
          className="w-full h-full object-cover object-center"
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  const grad = getPalette(displayName)

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full shrink-0 font-medium text-white shadow-sm bg-gradient-to-br ${grad} border border-white/10 ${sizeClasses} ${className}`}
      aria-label={displayName}
    >
      <span>{initials}</span>
    </div>
  )
}
