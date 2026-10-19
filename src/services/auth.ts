import type { UserRecord, TutorProfileRecord } from '@/types/community'
export interface RegisterInput {
  name: string
  email: string
  password: string
  passwordConfirm: string
  username?: string
  city?: string
  state?: string
  phone?: string
  role?: 'tutor' | 'profissional' | 'ambos'
}

export interface LoginInput {
  email: string
  password: string
}

const unavailable = async (..._args: unknown[]): Promise<never> => {
  throw new Error('Função indisponível nesta etapa. O acesso é por convite.')
}
export const authService = {
  getCurrentUser: (): UserRecord | null => null,
  isAuthenticated: () => false,
  getTutorProfile: async (_id: string): Promise<TutorProfileRecord | null> => null,
  register: unavailable,
  login: unavailable,
  updateTutorProfile: unavailable,
  logout: () => {
    void fetch('/api/pilot/logout', { method: 'POST' })
  },
  getAvatarUrl: (value: { avatar?: string; [key: string]: unknown } | null) =>
    value?.avatar?.startsWith('/api/pilot/files/') ? value.avatar : undefined,
}
