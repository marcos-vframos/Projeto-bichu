import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { DogProvider } from '@/contexts/DogContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/sonner'
import Layout from '@/components/Layout'
import { PilotGate } from '@/components/PilotGate'

// Páginas existentes
const LibraryPage = lazy(() => import('@/pages/Library'))
const Index = lazy(() => import('@/pages/Index'))
const DogsListPage = lazy(() => import('@/pages/DogsList'))
const DogFormPage = lazy(() => import('@/pages/DogForm'))
const DogDetailPage = lazy(() => import('@/pages/DogDetail'))
const WeightTrackerPage = lazy(() => import('@/pages/WeightTracker'))
const FoodComparisonPage = lazy(() => import('@/pages/FoodComparison'))
const AssistedHealthPage = lazy(() => import('@/pages/AssistedHealth'))
const BcsInteractivePage = lazy(() => import('@/pages/BcsInteractive'))
const FeedingPlanPage = lazy(() => import('@/pages/FeedingPlan'))
const SettingsPage = lazy(() => import('@/pages/Settings'))
const NotFound = lazy(() => import('@/pages/NotFound'))

// Novas páginas de Comunidade & Auth
const LoginPage = lazy(() => import('@/pages/Login'))
const RegisterPage = lazy(() => import('@/pages/Register'))
const ProfessionalsListPage = lazy(() => import('@/pages/ProfessionalsList'))
const ProfessionalDetailPage = lazy(() => import('@/pages/ProfessionalDetail'))
const ProfessionalFormPage = lazy(() => import('@/pages/ProfessionalForm'))
const UserProfilePage = lazy(() => import('@/pages/UserProfile'))

export function App() {
  if (window.location.pathname.replace(/\/$/, '') === '/painel' || new URLSearchParams(window.location.hash.slice(1)).has('access')) {
    window.location.replace('/painel' + window.location.hash)
    return <main className="p-8">Abrindo site do proprietário…</main>
  }
  const content = (
    <ThemeProvider>
      <AuthProvider>
        <DogProvider>
          <Router>
            {import.meta.env.VITE_DEMO_MODE !== 'false' && import.meta.env.VITE_PILOT_MODE !== 'true' && (
              <div role="status" style={{ position: 'relative', zIndex: 100, padding: '8px 16px', background: '#173b35', color: '#fff', textAlign: 'center', fontSize: 14 }}>
                Versão de avaliação · Luna e os registros são exemplos. Alterações ficam apenas neste navegador; conta e comunidade exigem o servidor original.
              </div>
            )}
            <Suspense fallback={<p role="status" className="p-6">Carregando área…</p>}><Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
                <Route path="/biblioteca" element={<LibraryPage />} />
                <Route path="/caes" element={<DogsListPage />} />
                <Route path="/caes/novo" element={<DogFormPage />} />
                <Route path="/caes/:id" element={<DogDetailPage />} />
                <Route path="/caes/:id/editar" element={<DogFormPage />} />
                <Route path="/caes/:id/plano" element={<WeightTrackerPage />} />
                <Route path="/caes/:id/peso" element={<WeightTrackerPage />} />
                <Route path="/caes/:id/saude" element={<AssistedHealthPage />} />

                {/* Módulo Saúde Assistida */}
                <Route path="/saude-assistida" element={<AssistedHealthPage />} />

                {/* BCS Interativo */}
                <Route path="/bcs" element={<BcsInteractivePage />} />
                <Route path="/bcs/guia" element={<BcsInteractivePage />} />
                <Route path="/bcs/:id" element={<BcsInteractivePage />} />
                <Route path="/bcs-interativo" element={<BcsInteractivePage />} />

                {/* Gestão de Peso & Metas */}
                <Route path="/peso" element={<WeightTrackerPage />} />

                {/* Comparador de Rações (ambas as rotas registradas) */}
                <Route path="/comparador" element={<FoodComparisonPage />} />
                <Route path="/comparar-racoes" element={<FoodComparisonPage />} />

                {/* Plano Alimentar */}
                <Route path="/plano" element={<FeedingPlanPage />} />

                {/* Ajustes e Personalização */}
                <Route path="/configuracoes" element={<SettingsPage />} />

                {/* Autenticação & Contas */}
                <Route path="/entrar" element={<LoginPage />} />
                {import.meta.env.VITE_PILOT_MODE !== 'true' && <Route path="/criar-conta" element={<RegisterPage />} />}

                {/* Profissionais & Criadores */}
                <Route path="/profissionais" element={<ProfessionalsListPage />} />
                {import.meta.env.VITE_PILOT_MODE !== 'true' && <Route path="/profissionais/cadastrar" element={<ProfessionalFormPage />} />}
                {import.meta.env.VITE_PILOT_MODE !== 'true' && <Route path="/profissionais/:id" element={<ProfessionalDetailPage />} />}

                {/* Rede Social Pet */}
                {import.meta.env.VITE_PILOT_MODE !== 'true' && <Route path="/perfil/:username" element={<UserProfilePage />} />}

                {/* Tinder Matching Pet */}

                {/* Rota 404 */}
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes></Suspense>
            <Toaster position="top-center" richColors closeButton />
          </Router>
        </DogProvider>
      </AuthProvider>
    </ThemeProvider>
  )
  return import.meta.env.VITE_PILOT_MODE === 'true' ? <PilotGate>{content}</PilotGate> : content
}

export default App
