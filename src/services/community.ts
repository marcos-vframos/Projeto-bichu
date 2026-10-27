import pb from '@/lib/native-community'
import type {
  ProfessionalRecord,
  ProfessionalCategory,
  ProfessionalReviewRecord,
  PostRecord,
  PostCommentRecord,
  PetMatchRecord,
  TutorProfileRecord,
} from '@/types/community'

export const communityService = {
  // --- PROFISSIONAIS ---
  async getProfessionals(category?: ProfessionalCategory | 'todas'): Promise<ProfessionalRecord[]> {
    try {
      const filter = category && category !== 'todas' ? `category = "${category}"` : ''
      const records = await pb.collection('professionals').getFullList<ProfessionalRecord>({
        filter,
        sort: '-rating_avg,-reviews_count',
      })
      return records
    } catch (err) {
      console.warn('Erro ao carregar profissionais:', err)
      return []
    }
  },

  async getProfessionalById(id: string): Promise<ProfessionalRecord | null> {
    try {
      return await pb.collection('professionals').getOne<ProfessionalRecord>(id)
    } catch {
      return null
    }
  },

  async getProfessionalByUserId(userId: string): Promise<ProfessionalRecord | null> {
    try {
      return await pb
        .collection('professionals')
        .getFirstListItem<ProfessionalRecord>(`user = "${userId}"`)
    } catch {
      return null
    }
  },

  async createProfessional(formData: FormData): Promise<ProfessionalRecord> {
    return await pb.collection('professionals').create<ProfessionalRecord>(formData)
  },

  async updateProfessional(
    id: string,
    formData: FormData | Partial<ProfessionalRecord>,
  ): Promise<ProfessionalRecord> {
    return await pb.collection('professionals').update<ProfessionalRecord>(id, formData)
  },

  // Avaliações de profissionais
  async getReviews(professionalId: string): Promise<ProfessionalReviewRecord[]> {
    try {
      return await pb.collection('professional_reviews').getFullList<ProfessionalReviewRecord>({
        filter: `professional = "${professionalId}"`,
        sort: '-created',
      })
    } catch {
      return []
    }
  },

  async addReview(data: {
    professional: string
    user: string
    user_name: string
    rating: number
    comment: string
  }): Promise<ProfessionalReviewRecord> {
    const rev = await pb.collection('professional_reviews').create<ProfessionalReviewRecord>(data)

    // Recalcula média e total no profissional
    try {
      const allReviews = await this.getReviews(data.professional)
      const count = allReviews.length
      const avg =
        count > 0
          ? Number((allReviews.reduce((acc, r) => acc + (r.rating || 5), 0) / count).toFixed(1))
          : data.rating
      await pb.collection('professionals').update(data.professional, {
        rating_avg: avg,
        reviews_count: count,
      })
    } catch (e) {
      console.warn('Falha ao atualizar média de avaliações:', e)
    }

    return rev
  },

  // --- REDE SOCIAL / FEED ---
  async getPosts(): Promise<PostRecord[]> {
    return this.getFeedPosts()
  },

  async getComments(postId: string): Promise<PostCommentRecord[]> {
    return this.getPostComments(postId)
  },

  async toggleLike(postId: string): Promise<{ liked: boolean; count: number }> {
    const currentUserId =
      pb.authStore.isValid && pb.authStore.record ? pb.authStore.record.id : null
    let hasLiked = false
    if (currentUserId) {
      try {
        await pb
          .collection('post_likes')
          .getFirstListItem(`post = "${postId}" && user = "${currentUserId}"`)
        hasLiked = true
      } catch {
        hasLiked = false
      }
    }
    const res = await this.toggleLikePost(postId, hasLiked)
    return { liked: res.has_liked, count: res.likes_count }
  },

  async getFeed(): Promise<PostRecord[]> {
    return this.getFeedPosts()
  },

  async togglePostLike(postId: string): Promise<{ has_liked: boolean; likes_count: number }> {
    const currentUserId =
      pb.authStore.isValid && pb.authStore.record ? pb.authStore.record.id : null
    let hasLiked = false
    if (currentUserId) {
      try {
        await pb
          .collection('post_likes')
          .getFirstListItem(`post = "${postId}" && user = "${currentUserId}"`)
        hasLiked = true
      } catch {
        hasLiked = false
      }
    }
    return this.toggleLikePost(postId, hasLiked)
  },

  async createComment(postId: string, text: string): Promise<PostCommentRecord> {
    const userName = pb.authStore.record?.name || 'Tutor Meu Bichu'
    return this.addComment(postId, text, userName)
  },

  async getFeedPosts(): Promise<PostRecord[]> {
    try {
      const currentUserId =
        pb.authStore.isValid && pb.authStore.record ? pb.authStore.record.id : null
      const posts = await pb.collection('posts').getFullList<PostRecord>({
        sort: '-created',
        expand: 'user,dog',
      })

      // Se logado, verificar quais posts o usuário curtiu
      if (currentUserId && posts.length > 0) {
        try {
          const userLikes = await pb.collection('post_likes').getFullList({
            filter: `user = "${currentUserId}"`,
          })
          const likedPostIds = new Set(userLikes.map((l) => l.post))
          return posts.map((p) => ({
            ...p,
            has_liked: likedPostIds.has(p.id),
          }))
        } catch {
          return posts
        }
      }

      return posts
    } catch (err) {
      console.warn('Erro ao carregar posts:', err)
      return []
    }
  },

  async getUserPosts(userId: string): Promise<PostRecord[]> {
    try {
      return await pb.collection('posts').getFullList<PostRecord>({
        filter: `user = "${userId}"`,
        sort: '-created',
        expand: 'dog',
      })
    } catch {
      return []
    }
  },

  async createPost(formData: FormData): Promise<PostRecord> {
    return await pb.collection('posts').create<PostRecord>(formData)
  },

  async toggleLikePost(
    postId: string,
    currentLiked: boolean,
  ): Promise<{ has_liked: boolean; likes_count: number }> {
    const currentUserId =
      pb.authStore.isValid && pb.authStore.record ? pb.authStore.record.id : null
    if (!currentUserId) throw new Error('Necessário login para curtir postagens.')

    try {
      const post = await pb.collection('posts').getOne<PostRecord>(postId)
      let likes = post.likes_count || 0

      if (currentLiked) {
        // Remover curtida
        try {
          const existing = await pb
            .collection('post_likes')
            .getFirstListItem(`post = "${postId}" && user = "${currentUserId}"`)
          await pb.collection('post_likes').delete(existing.id)
        } catch {
          /* ignore */
        }
        likes = Math.max(0, likes - 1)
        await pb.collection('posts').update(postId, { likes_count: likes })
        return { has_liked: false, likes_count: likes }
      } else {
        // Adicionar curtida
        try {
          await pb.collection('post_likes').create({
            post: postId,
            user: currentUserId,
          })
        } catch {
          /* ignore duplicate */
        }
        likes += 1
        await pb.collection('posts').update(postId, { likes_count: likes })
        return { has_liked: true, likes_count: likes }
      }
    } catch (err) {
      console.error(err)
      throw err
    }
  },

  async getPostComments(postId: string): Promise<PostCommentRecord[]> {
    try {
      return await pb.collection('post_comments').getFullList<PostCommentRecord>({
        filter: `post = "${postId}"`,
        sort: 'created',
      })
    } catch {
      return []
    }
  },

  async addComment(postId: string, text: string, userName: string): Promise<PostCommentRecord> {
    const currentUserId =
      pb.authStore.isValid && pb.authStore.record ? pb.authStore.record.id : null
    if (!currentUserId) throw new Error('Necessário login para comentar.')

    const comment = await pb.collection('post_comments').create<PostCommentRecord>({
      post: postId,
      user: currentUserId,
      user_name: userName,
      text,
    })

    try {
      const post = await pb.collection('posts').getOne<PostRecord>(postId)
      await pb.collection('posts').update(postId, {
        comments_count: (post.comments_count || 0) + 1,
      })
    } catch {
      /* ignore */
    }

    return comment
  },

  // --- SEGUIR / SEGUIDORES ---
  async isFollowing(followingUserId: string): Promise<boolean> {
    const currentUserId =
      pb.authStore.isValid && pb.authStore.record ? pb.authStore.record.id : null
    if (!currentUserId || currentUserId === followingUserId) return false
    try {
      await pb
        .collection('follows')
        .getFirstListItem(`follower = "${currentUserId}" && following = "${followingUserId}"`)
      return true
    } catch {
      return false
    }
  },

  async toggleFollow(targetUserId: string): Promise<boolean> {
    const currentUserId =
      pb.authStore.isValid && pb.authStore.record ? pb.authStore.record.id : null
    if (!currentUserId) throw new Error('Necessário login para seguir.')

    try {
      const existing = await pb
        .collection('follows')
        .getFirstListItem(`follower = "${currentUserId}" && following = "${targetUserId}"`)
      await pb.collection('follows').delete(existing.id)
      return false
    } catch {
      await pb.collection('follows').create({
        follower: currentUserId,
        following: targetUserId,
      })
      return true
    }
  },

  async getFollowersCount(userId: string): Promise<{ followers: number; following: number }> {
    try {
      const followers = await pb
        .collection('follows')
        .getFullList({ filter: `following = "${userId}"` })
      const following = await pb
        .collection('follows')
        .getFullList({ filter: `follower = "${userId}"` })
      return { followers: followers.length, following: following.length }
    } catch {
      return { followers: 0, following: 0 }
    }
  },

  async getProfileByUsername(username: string): Promise<TutorProfileRecord | null> {
    try {
      return await pb
        .collection('tutor_profiles')
        .getFirstListItem<TutorProfileRecord>(`username = "${username}"`)
    } catch {
      return null
    }
  },

  // --- MATCHING / DESCOBRIR ---
  async getBreedingDogs(): Promise<import('@/types/nutrition').DogRecord[]> {
    try {
      // Busca cães não castrados ou aptos para canicultura / pedigree / encontro
      const records = await pb
        .collection('dogs')
        .getFullList<import('@/types/nutrition').DogRecord>({
          sort: '-created',
        })
      return records
    } catch (err) {
      console.warn('Erro ao carregar cães para descoberta:', err)
      return []
    }
  },

  async recordMatchAction(
    targetType: 'professional' | 'dog',
    targetId: string,
    action: 'like' | 'pass',
  ): Promise<{ is_mutual: boolean; record: PetMatchRecord }> {
    const currentUserId =
      pb.authStore.isValid && pb.authStore.record ? pb.authStore.record.id : null
    if (!currentUserId) throw new Error('Faça login para dar matches.')

    let isMutual = false

    // Se ação for like, verificar se houve like recíproco
    if (action === 'like') {
      try {
        if (targetType === 'professional') {
          // Profissional curtiu de volta o usuário tutor? Ou se for cão
          const prof = await this.getProfessionalById(targetId)
          if (prof && prof.user) {
            const reciprocal = await pb.collection('pet_matches').getList(1, 1, {
              filter: `user = "${prof.user}" && target_id = "${currentUserId}" && action = "like"`,
            })
            if (reciprocal.items.length > 0) {
              isMutual = true
              await pb.collection('pet_matches').update(reciprocal.items[0].id, { is_mutual: true })
            }
          }
        } else if (targetType === 'dog') {
          // Se o dono do cão curtiu o pet ativo do usuário atual
          const dogRecord = await pb
            .collection('dogs')
            .getOne<import('@/types/nutrition').DogRecord>(targetId)
            .catch(() => null)
          if (dogRecord && dogRecord.user) {
            const reciprocal = await pb.collection('pet_matches').getList(1, 1, {
              filter: `user = "${dogRecord.user}" && action = "like"`,
            })
            if (reciprocal.items.length > 0) {
              isMutual = true
              await pb.collection('pet_matches').update(reciprocal.items[0].id, { is_mutual: true })
            }
          }
        }
      } catch {
        /* ignore */
      }
    }

    try {
      // Upsert ou criar
      const existing = await pb.collection('pet_matches').getList<PetMatchRecord>(1, 1, {
        filter: `user = "${currentUserId}" && target_id = "${targetId}"`,
      })
      if (existing.items.length > 0) {
        const updated = await pb
          .collection('pet_matches')
          .update<PetMatchRecord>(existing.items[0].id, {
            action,
            is_mutual: isMutual || existing.items[0].is_mutual,
          })
        return { is_mutual: updated.is_mutual || false, record: updated }
      }

      const created = await pb.collection('pet_matches').create<PetMatchRecord>({
        user: currentUserId,
        target_type: targetType,
        target_id: targetId,
        action,
        is_mutual: isMutual,
      })
      return { is_mutual: isMutual, record: created }
    } catch (e) {
      console.error('Erro ao registrar match:', e)
      throw e
    }
  },

  async getUserMatches(): Promise<PetMatchRecord[]> {
    const currentUserId =
      pb.authStore.isValid && pb.authStore.record ? pb.authStore.record.id : null
    if (!currentUserId) return []
    try {
      return await pb.collection('pet_matches').getFullList<PetMatchRecord>({
        filter: `user = "${currentUserId}" && action = "like"`,
        sort: '-created',
      })
    } catch {
      return []
    }
  },

  // Helpers de imagens dos registros do app
  getMediaUrl(record: { [key: string]: unknown } | null, filename?: string): string | undefined {
    if (!record || !filename) return undefined
    if (
      filename.startsWith('http://') ||
      filename.startsWith('https://') ||
      filename.startsWith('data:')
    ) {
      return filename
    }
    try {
      return pb.files.getURL(record, filename)
    } catch {
      return undefined
    }
  },
}
