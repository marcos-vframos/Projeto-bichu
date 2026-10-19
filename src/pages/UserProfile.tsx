import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  User,
  MapPin,
  Calendar,
  Grid,
  Heart,
  MessageCircle,
  UserPlus,
  UserCheck,
  ArrowLeft,
  Dog,
  Camera,
} from 'lucide-react'
import { communityService } from '@/services/community'
import { useAuth } from '@/contexts/AuthContext'
import { useDog } from '@/contexts/DogContext'
import { useActiveHeroTheme } from '@/hooks/use-active-hero-theme'
import { toast } from 'sonner'
import type { TutorProfileRecord, PostRecord } from '@/types/community'

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { user: currentUser, isAuthenticated } = useAuth()
  const { activeDog } = useDog()
  const { theme: activeHeroTheme } = useActiveHeroTheme(activeDog)

  const [profile, setProfile] = useState<TutorProfileRecord | null>(null)
  const [userPosts, setUserPosts] = useState<PostRecord[]>([])
  const [followersCount, setFollowersCount] = useState({ followers: 0, following: 0 })
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [followingAction, setFollowingAction] = useState(false)

  useEffect(() => {
    if (username) {
      loadProfile(username)
    }
  }, [username])

  const loadProfile = async (uName: string) => {
    setLoading(true)
    try {
      const p = await communityService.getProfileByUsername(uName)
      setProfile(p)

      if (p) {
        const posts = await communityService.getUserPosts(p.user)
        setUserPosts(posts)

        const counts = await communityService.getFollowersCount(p.user)
        setFollowersCount(counts)

        if (isAuthenticated && currentUser && currentUser.id !== p.user) {
          const followState = await communityService.isFollowing(p.user)
          setIsFollowing(followState)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleToggleFollow = async () => {
    if (!isAuthenticated || !currentUser) {
      toast.error('Faça login para seguir outros perfis.')
      navigate('/entrar')
      return
    }
    if (!profile) return

    setFollowingAction(true)
    try {
      const nextFollow = await communityService.toggleFollow(profile.user)
      setIsFollowing(nextFollow)
      setFollowersCount((prev) => ({
        ...prev,
        followers: Math.max(0, prev.followers + (nextFollow ? 1 : -1)),
      }))
      toast.success(
        nextFollow
          ? `Você está seguindo @${profile.username}`
          : `Você deixou de seguir @${profile.username}`,
      )
    } catch (err) {
      console.error(err)
      toast.error('Não foi possível atualizar seguimento.')
    } finally {
      setFollowingAction(false)
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <p className="text-xs animate-pulse" style={{ color: activeHeroTheme.brownMuted }}>
          Carregando perfil do tutor...
        </p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="py-20 text-center space-y-3">
        <h2 className="text-base font-bold" style={{ color: activeHeroTheme.brownTitle }}>
          Perfil não encontrado
        </h2>
        <Link
          to="/feed"
          className="text-xs font-bold underline"
          style={{ color: activeHeroTheme.brownPrimary }}
        >
          Voltar para o Feed da Matilha
        </Link>
      </div>
    )
  }

  const isSelf = currentUser?.id === profile.user

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-semibold cursor-pointer transition hover:opacity-80"
          style={{ color: activeHeroTheme.brownMuted }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>
      </div>

      {/* Header do Perfil */}
      <div
        className="p-6 sm:p-8 rounded-3xl border backdrop-blur-2xl shadow-xl space-y-6"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderColor: `${activeHeroTheme.brownPrimary}30`,
        }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex items-center justify-center font-black text-2xl sm:text-3xl border-2 shadow-md"
              style={{
                backgroundColor: `${activeHeroTheme.brownPrimary}20`,
                borderColor: activeHeroTheme.brownPrimary,
                color: activeHeroTheme.brownPrimary,
              }}
            >
              {profile.display_name.charAt(0).toUpperCase()}
            </div>

            <div>
              <h1
                className="text-xl sm:text-2xl font-black tracking-tight"
                style={{ color: activeHeroTheme.brownTitle }}
              >
                {profile.display_name}
              </h1>
              <p className="text-xs font-bold" style={{ color: activeHeroTheme.brownPrimary }}>
                @{profile.username || 'tutor'}
              </p>

              {(profile.city || profile.state) && (
                <div
                  className="flex items-center gap-1 text-xs mt-1"
                  style={{ color: activeHeroTheme.brownMuted }}
                >
                  <MapPin className="w-3.5 h-3.5" style={{ color: activeHeroTheme.brownPrimary }} />
                  <span>
                    {profile.city}
                    {profile.state ? `, ${profile.state}` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Botão Seguir / Deixar de Seguir */}
          {!isSelf && (
            <button
              type="button"
              onClick={handleToggleFollow}
              disabled={followingAction}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md hover:scale-105 active:scale-95 ${
                isFollowing ? 'border' : ''
              }`}
              style={{
                backgroundColor: isFollowing ? 'transparent' : activeHeroTheme.brownPrimary,
                borderColor: isFollowing ? activeHeroTheme.brownPrimary : 'transparent',
                color: isFollowing ? activeHeroTheme.brownTitle : activeHeroTheme.bgColor,
              }}
            >
              {isFollowing ? (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Seguindo</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Seguir Tutor</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p
            className="text-xs sm:text-sm leading-relaxed"
            style={{ color: activeHeroTheme.brownBody }}
          >
            {profile.bio}
          </p>
        )}

        {/* Estatísticas (Posts, Seguidores, Seguindo) */}
        <div
          className="p-4 rounded-2xl border flex items-center justify-around text-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderColor: `${activeHeroTheme.brownPrimary}20`,
          }}
        >
          <div>
            <p className="text-base font-black" style={{ color: activeHeroTheme.brownTitle }}>
              {userPosts.length}
            </p>
            <p className="text-[11px]" style={{ color: activeHeroTheme.brownMuted }}>
              Publicações
            </p>
          </div>

          <div className="h-6 w-px bg-white/10" />

          <div>
            <p className="text-base font-black" style={{ color: activeHeroTheme.brownTitle }}>
              {followersCount.followers}
            </p>
            <p className="text-[11px]" style={{ color: activeHeroTheme.brownMuted }}>
              Seguidores
            </p>
          </div>

          <div className="h-6 w-px bg-white/10" />

          <div>
            <p className="text-base font-black" style={{ color: activeHeroTheme.brownTitle }}>
              {followersCount.following}
            </p>
            <p className="text-[11px]" style={{ color: activeHeroTheme.brownMuted }}>
              Seguindo
            </p>
          </div>
        </div>
      </div>

      {/* Grid de Publicações do Perfil */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Grid className="w-4 h-4" style={{ color: activeHeroTheme.brownPrimary }} />
          <h2 className="text-sm font-bold" style={{ color: activeHeroTheme.brownTitle }}>
            Galeria & Publicações ({userPosts.length})
          </h2>
        </div>

        {userPosts.length === 0 ? (
          <div
            className="p-10 rounded-3xl border text-center space-y-2"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderColor: `${activeHeroTheme.brownPrimary}15`,
            }}
          >
            <Camera className="w-8 h-8 mx-auto" style={{ color: activeHeroTheme.brownMuted }} />
            <p className="text-xs" style={{ color: activeHeroTheme.brownMuted }}>
              Este tutor ainda não compartilhou publicações no feed.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {userPosts.map((post) => {
              const postImg =
                Array.isArray(post.images) && post.images.length > 0
                  ? communityService.getMediaUrl(
                      post as unknown as Record<string, unknown>,
                      post.images[0],
                    )
                  : typeof post.images === 'string' && post.images
                    ? communityService.getMediaUrl(
                        post as unknown as Record<string, unknown>,
                        post.images,
                      )
                    : null

              return (
                <div
                  key={post.id}
                  className="group relative aspect-square rounded-2xl overflow-hidden border bg-black/40 shadow-sm cursor-pointer"
                  style={{ borderColor: `${activeHeroTheme.brownPrimary}20` }}
                >
                  {postImg ? (
                    <img
                      src={postImg}
                      alt={post.caption || 'Foto'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full p-4 flex flex-col justify-between text-left">
                      <p
                        className="text-xs line-clamp-4 leading-relaxed"
                        style={{ color: activeHeroTheme.brownBody }}
                      >
                        {post.caption}
                      </p>
                      {post.dog_name && (
                        <span
                          className="text-[10px] font-bold"
                          style={{ color: activeHeroTheme.brownPrimary }}
                        >
                          🐾 {post.dog_name}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Overlay com contadores ao passar o mouse */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-xs font-bold">
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4 fill-current text-rose-500" />
                      {post.likes_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4 fill-current" />
                      {post.comments_count || 0}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
