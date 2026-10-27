import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Heart,
  MessageCircle,
  Share2,
  Plus,
  Image as ImageIcon,
  Send,
  MapPin,
  Sparkles,
  UserCheck,
  Dog,
} from 'lucide-react'
import { useActiveHeroTheme } from '@/hooks/use-active-hero-theme'
import { useDog } from '@/contexts/DogContext'
import { useAuth } from '@/contexts/AuthContext'
import { communityService } from '@/services/community'
import type { PostRecord, PostCommentRecord } from '@/types/community'
import { toast } from 'sonner'

export function SocialFeedPage() {
  const navigate = useNavigate()
  const { activeDog, dogs } = useDog()
  const { theme } = useActiveHeroTheme(activeDog)
  const { user, profile, isAuthenticated } = useAuth()

  const [posts, setPosts] = useState<PostRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Criar Post
  const [isCreatingPost, setIsCreatingPost] = useState(false)
  const [caption, setCaption] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [selectedDogId, setSelectedDogId] = useState(activeDog?.id || '')
  const [locationStr, setLocationStr] = useState('')
  const [submittingPost, setSubmittingPost] = useState(false)

  // Comentários ativos por post
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null)
  const [commentsMap, setCommentsMap] = useState<Record<string, PostCommentRecord[]>>({})
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    communityService
      .getFeed()
      .then((data) => {
        if (active) setPosts(data)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const handleLike = async (postId: string) => {
    if (!isAuthenticated) {
      toast.info('Modo demonstração: curtida simulada localmente (faça login para sincronizar).')
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                is_liked: !p.is_liked,
                likes_count: p.is_liked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1,
              }
            : p,
        ),
      )
      return
    }
    const res = await communityService.togglePostLike(postId)
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, is_liked: res.has_liked, likes_count: res.likes_count } : p,
      ),
    )
  }

  const handleToggleComments = async (postId: string) => {
    if (openCommentsPostId === postId) {
      setOpenCommentsPostId(null)
      return
    }
    setOpenCommentsPostId(postId)
    if (!commentsMap[postId]) {
      const comms = await communityService.getPostComments(postId)
      setCommentsMap((prev) => ({ ...prev, [postId]: comms }))
    }
  }

  const handleAddComment = async (postId: string, e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return

    if (!isAuthenticated) {
      const demoComment = {
        id: `demo_${Date.now()}`,
        post: postId,
        user: 'guest',
        author_name: 'Convidado (Demonstração)',
        author_username: 'convidado',
        content: commentText.trim(),
        created: new Date().toISOString(),
      }
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), demoComment as unknown as PostCommentRecord],
      }))
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p,
        ),
      )
      setCommentText('')
      toast.info('Comentário publicado em modo demonstração!')
      return
    }

    setSubmittingComment(true)
    try {
      const newComm = await communityService.createComment(postId, commentText.trim())
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComm],
      }))
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p,
        ),
      )
      setCommentText('')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!caption.trim() && !imageUrl.trim()) {
      toast.error('Insira ao menos uma foto ou legenda para publicar.')
      return
    }

    if (!isAuthenticated) {
      const demoPost = {
        id: `demo_${Date.now()}`,
        author_name: 'Tutor Convidado',
        author_username: 'tutor_convidado',
        author_avatar: '/avatar-placeholder.svg',
        caption: caption.trim(),
        images: imageUrl.trim()
          ? [imageUrl.trim()]
          : ['/heroes/beagle.png'],
        likes_count: 0,
        comments_count: 0,
        is_liked: false,
        created: new Date().toISOString(),
        location: locationStr.trim() || undefined,
      }
      setPosts((prev) => [demoPost as unknown as PostRecord, ...prev])
      setIsCreatingPost(false)
      setCaption('')
      setImageUrl('')
      setLocationStr('')
      toast.success('Publicação compartilhada (modo demonstração)!')
      return
    }

    setSubmittingPost(true)
    try {
      const formData = new FormData()
      formData.append('caption', caption.trim())
      if (locationStr.trim()) formData.append('location', locationStr.trim())
      if (selectedDogId) formData.append('dog', selectedDogId)

      const created = await communityService.createPost(formData)

      setPosts((prev) => [created, ...prev])
      setIsCreatingPost(false)
      setCaption('')
      setImageUrl('')
      setLocationStr('')
      toast.success('Publicação compartilhada no feed!')
    } catch {
      toast.error('Erro ao publicar.')
    } finally {
      setSubmittingPost(false)
    }
  }

  const handleSharePost = (post: PostRecord) => {
    if (navigator.share) {
      navigator.share({
        title: `Post de ${post.author_name} no Meu Bichu`,
        text: post.caption,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link da postagem copiado!')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 px-2 sm:px-4">
      {/* Barra de Ação Superior */}
      <div
        className="p-4 sm:p-5 rounded-3xl border backdrop-blur-xl shadow-lg flex items-center justify-between gap-3"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.035)',
          borderColor: `${theme.brownPrimary}30`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center border"
            style={{
              backgroundColor: `${theme.brownPrimary}20`,
              borderColor: `${theme.brownPrimary}40`,
              color: theme.brownPrimary,
            }}
          >
            <Dog className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black" style={{ color: theme.brownTitle }}>
              Rede Social Pet
            </h1>
            <p className="text-[11px]" style={{ color: theme.brownMuted }}>
              Compartilhe a evolução, o peso e momentos do seu pet
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCreatingPost((prev) => !prev)}
          className="px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md hover:scale-[1.02] active:scale-[0.98]"
          style={{
            backgroundColor: theme.brownPrimary,
            color: theme.bgColor,
          }}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nova Postagem</span>
          <span className="sm:hidden">Postar</span>
        </button>
      </div>

      {/* Box de Criação de Postagem */}
      {isCreatingPost && (
        <form
          onSubmit={handleCreatePost}
          className="p-5 rounded-3xl border backdrop-blur-xl shadow-xl space-y-3.5 transition-all animate-in fade-in slide-in-from-top-2"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderColor: `${theme.brownPrimary}40`,
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: theme.brownTitle }}
            >
              Criar Postagem Pet
            </span>
            <button
              type="button"
              onClick={() => setIsCreatingPost(false)}
              className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
              style={{ color: theme.brownMuted }}
            >
              Cancelar
            </button>
          </div>

          <textarea
            required
            rows={3}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="O que seu pet aprontou hoje? Conte sobre o peso, refeição ou passeio..."
            className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium outline-none border transition bg-black/40 resize-none"
            style={{ borderColor: `${theme.brownPrimary}30`, color: theme.brownTitle }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label
                className="text-[11px] font-bold block mb-1"
                style={{ color: theme.brownMuted }}
              >
                Foto (URL da imagem ou deixe vazio para gerar)
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-xl text-xs outline-none border bg-black/40"
                style={{ borderColor: `${theme.brownPrimary}30`, color: theme.brownTitle }}
              />
            </div>

            <div>
              <label
                className="text-[11px] font-bold block mb-1"
                style={{ color: theme.brownMuted }}
              >
                Localização (opcional)
              </label>
              <input
                type="text"
                value={locationStr}
                onChange={(e) => setLocationStr(e.target.value)}
                placeholder="Ex: Parque Ibirapuera, SP"
                className="w-full px-3 py-2 rounded-xl text-xs outline-none border bg-black/40"
                style={{ borderColor: `${theme.brownPrimary}30`, color: theme.brownTitle }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px]" style={{ color: theme.brownMuted }}>
                Marcar cão:
              </span>
              <select
                value={selectedDogId}
                onChange={(e) => setSelectedDogId(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-xl border bg-black/50 cursor-pointer"
                style={{ borderColor: `${theme.brownPrimary}30`, color: theme.brownTitle }}
              >
                {dogs.map((d) => (
                  <option key={d.id} value={d.id} className="bg-zinc-900 text-white">
                    {d.name} ({d.breed})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={submittingPost}
              className="px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow"
              style={{
                backgroundColor: theme.brownPrimary,
                color: theme.bgColor,
              }}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submittingPost ? 'Postando...' : 'Publicar'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Lista de Postagens (Feed Estilo Instagram) */}
      {loading ? (
        <div className="py-20 text-center space-y-2">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto"
            style={{ borderColor: theme.brownPrimary, borderTopColor: 'transparent' }}
          />
          <p className="text-xs" style={{ color: theme.brownMuted }}>
            Carregando momentos pet...
          </p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-sm font-bold" style={{ color: theme.brownTitle }}>
            Nenhum momento compartilhado ainda.
          </p>
          <button
            type="button"
            onClick={() => setIsCreatingPost(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
            style={{ backgroundColor: theme.brownPrimary, color: theme.bgColor }}
          >
            Publicar primeira foto
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => {
            const comments = commentsMap[post.id] || []
            const isCommentsOpen = openCommentsPostId === post.id

            return (
              <div
                key={post.id}
                className="rounded-3xl border overflow-hidden backdrop-blur-xl shadow-xl transition-all"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderColor: `${theme.brownPrimary}25`,
                }}
              >
                {/* Cabeçalho do Post */}
                <div className="p-3.5 sm:p-4 flex items-center justify-between">
                  <Link
                    to={`/perfil/${post.author_username || 'tutor'}`}
                    className="flex items-center gap-3 group"
                  >
                    <img
                      src={
                        post.author_avatar ||
                        '/avatar-placeholder.svg'
                      }
                      alt={post.author_name}
                      className="w-10 h-10 rounded-full object-cover border-2 shadow-sm"
                      style={{ borderColor: theme.brownPrimary }}
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-xs font-bold group-hover:underline"
                          style={{ color: theme.brownTitle }}
                        >
                          {post.author_name}
                        </span>
                        {post.dog_name && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                            style={{
                              backgroundColor: `${theme.brownPrimary}15`,
                              borderColor: `${theme.brownPrimary}30`,
                              color: theme.brownPrimary,
                            }}
                          >
                            🐾 {post.dog_name}
                          </span>
                        )}
                      </div>
                      {post.location && (
                        <p
                          className="text-[10px] flex items-center gap-0.5 mt-0.5"
                          style={{ color: theme.brownMuted }}
                        >
                          <MapPin className="w-2.5 h-2.5" />
                          <span>{post.location}</span>
                        </p>
                      )}
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleSharePost(post)}
                    className="p-2 rounded-xl opacity-75 hover:opacity-100 transition cursor-pointer"
                    style={{ color: theme.brownMuted }}
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Imagem do Post */}
                {post.images && post.images.length > 0 && (
                  <div
                    className="relative w-full aspect-square bg-black/60 overflow-hidden cursor-pointer"
                    onDoubleClick={() => handleLike(post.id)}
                  >
                    <img
                      src={post.images[0]}
                      alt="Momento Pet"
                      className="w-full h-full object-cover select-none"
                    />
                  </div>
                )}

                {/* Barra de Ações (Curtir, Comentar, Salvar) */}
                <div className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleLike(post.id)}
                        className="flex items-center gap-1.5 transition-transform active:scale-125 cursor-pointer"
                      >
                        <Heart
                          className={`w-5 h-5 ${
                            post.is_liked ? 'fill-rose-500 text-rose-500' : 'text-zinc-400'
                          }`}
                        />
                        <span className="text-xs font-bold" style={{ color: theme.brownTitle }}>
                          {post.likes_count}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleComments(post.id)}
                        className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition cursor-pointer"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-xs font-bold" style={{ color: theme.brownTitle }}>
                          {post.comments_count}
                        </span>
                      </button>
                    </div>

                    <span className="text-[10px] opacity-60" style={{ color: theme.brownMuted }}>
                      {new Date(post.created).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  </div>

                  {/* Legenda */}
                  {post.caption && (
                    <p className="text-xs leading-relaxed" style={{ color: theme.brownBody }}>
                      <strong className="mr-1.5" style={{ color: theme.brownTitle }}>
                        {post.author_username ? `@${post.author_username}` : post.author_name}
                      </strong>
                      {post.caption}
                    </p>
                  )}

                  {/* Toggle para ver comentários */}
                  {post.comments_count > 0 && !isCommentsOpen && (
                    <button
                      type="button"
                      onClick={() => handleToggleComments(post.id)}
                      className="text-[11px] font-semibold opacity-75 hover:opacity-100 cursor-pointer block"
                      style={{ color: theme.brownMuted }}
                    >
                      Ver todos os {post.comments_count} comentários
                    </button>
                  )}

                  {/* Seção de comentários expandida */}
                  {isCommentsOpen && (
                    <div
                      className="mt-3 pt-3 border-t space-y-2.5"
                      style={{ borderColor: `${theme.brownPrimary}15` }}
                    >
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {comments.length === 0 ? (
                          <p className="text-[11px]" style={{ color: theme.brownMuted }}>
                            Nenhum comentário ainda. Deixe o primeiro!
                          </p>
                        ) : (
                          comments.map((c) => (
                            <div key={c.id} className="text-xs">
                              <strong className="mr-1.5" style={{ color: theme.brownTitle }}>
                                {c.user_name}:
                              </strong>
                              <span style={{ color: theme.brownBody }}>{c.text}</span>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Input de comentário */}
                      <form
                        onSubmit={(e) => handleAddComment(post.id, e)}
                        className="flex items-center gap-2 pt-1"
                      >
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Adicione um comentário..."
                          className="flex-1 px-3 py-1.5 rounded-xl text-xs outline-none border bg-black/40"
                          style={{
                            borderColor: `${theme.brownPrimary}30`,
                            color: theme.brownTitle,
                          }}
                        />
                        <button
                          type="submit"
                          disabled={submittingComment || !commentText.trim()}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-40"
                          style={{ backgroundColor: theme.brownPrimary, color: theme.bgColor }}
                        >
                          Publicar
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SocialFeedPage
