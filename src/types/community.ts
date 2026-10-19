export type UserRole = 'tutor' | 'profissional' | 'ambos'

export interface UserRecord {
  id: string
  email: string
  name?: string
  avatar?: string
  created: string
  updated: string
}

export interface TutorProfileRecord {
  id: string
  user: string
  display_name: string
  username?: string
  bio?: string
  city?: string
  state?: string
  phone?: string
  avatar?: string
  role?: UserRole
  created: string
  updated: string
}

export type ProfessionalCategory =
  | 'veterinario'
  | 'canicultor'
  | 'adestrador'
  | 'handler'
  | 'dogwalker'
  | 'cinofilo'
  | 'banho_tosa'
  | 'creche'
  | 'petshop'
  | 'casa_racao'

export interface ProfessionalRecord {
  id: string
  user: string
  name: string
  category: ProfessionalCategory
  specialties?: string[]
  bio?: string
  credentials?: string
  city: string
  state?: string
  address?: string
  phone?: string
  whatsapp?: string
  instagram?: string
  rating_avg?: number
  reviews_count?: number
  verified?: boolean
  avatar?: string
  cover_image?: string
  portfolio?: string[]
  created: string
  updated: string
  expand?: {
    user?: UserRecord
  }
}

export interface ProfessionalReviewRecord {
  id: string
  professional: string
  user: string
  user_name?: string
  rating: number
  comment?: string
  created: string
  updated: string
  expand?: {
    user?: UserRecord
  }
}

export interface PostRecord {
  id: string
  user: string
  dog?: string
  caption?: string
  images?: string[] | string
  likes_count?: number
  comments_count?: number
  author_name?: string
  author_username?: string
  author_avatar?: string
  dog_name?: string
  location?: string
  created: string
  updated: string
  has_liked?: boolean
  is_liked?: boolean
  expand?: {
    user?: UserRecord
    dog?: Record<string, unknown>
  }
}

// Alias for backwards compatibility
export type Post = PostRecord
export type PostComment = PostCommentRecord

export interface PostCommentRecord {
  id: string
  post: string
  user: string
  user_name: string
  text: string
  created: string
  updated: string
  expand?: {
    user?: UserRecord
  }
}

export interface FollowRecord {
  id: string
  follower: string
  following: string
  created: string
  updated: string
}

export interface PetMatchRecord {
  id: string
  user: string
  target_type: 'professional' | 'dog'
  target_id: string
  action: 'like' | 'pass'
  is_mutual?: boolean
  created: string
  updated: string
}
