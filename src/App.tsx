import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router'
import { Loader2 } from 'lucide-react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/components/core/AuthProvider'
import { ProtectedRoute } from '@/components/core/ProtectedRoute'
import { isSupabaseConfigured, supabaseConfigError } from '@/lib/supabase'
import { AppLayout } from '@/components/core/AppLayout'

const LoginPage = lazy(async () => ({ default: (await import('@/pages/LoginPage')).LoginPage }))
const RegisterPage = lazy(async () => ({ default: (await import('@/pages/RegisterPage')).RegisterPage }))
const DashboardPage = lazy(async () => ({ default: (await import('@/pages/DashboardPage')).DashboardPage }))
const TodayPage = lazy(async () => ({ default: (await import('@/pages/TodayPage')).TodayPage }))
const StartGuidePage = lazy(async () => ({ default: (await import('@/pages/StartGuidePage')).StartGuidePage }))
const HomeRedirectPage = lazy(async () => ({ default: (await import('@/pages/HomeRedirectPage')).HomeRedirectPage }))
const FinanceiroPage = lazy(async () => ({ default: (await import('@/pages/FinanceiroPage')).FinanceiroPage }))
const LinksPage = lazy(async () => ({ default: (await import('@/pages/LinksPage')).LinksPage }))
const TodoPage = lazy(async () => ({ default: (await import('@/pages/TodoPage')).TodoPage }))
const CryptoPage = lazy(async () => ({ default: (await import('@/pages/CryptoPage')).CryptoPage }))
const CryptoDeFiPage = lazy(async () => ({ default: (await import('@/pages/CryptoDeFiPage')).CryptoDeFiPage }))
const SettingsPage = lazy(async () => ({ default: (await import('@/pages/SettingsPage')).SettingsPage }))
const NewsPage = lazy(async () => ({ default: (await import('@/pages/NewsPage')).NewsPage }))

function RouteLoadingFallback() {
    return (
        <div className="min-h-dvh flex items-center justify-center p-6 bg-[var(--bg-deep)] text-[var(--text-primary)]">
            <div className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Loader2 size={16} className="animate-spin" />
                A carregar modulo...
            </div>
        </div>
    )
}

export default function App() {
    if (!isSupabaseConfigured) {
        return (
            <div className="min-h-dvh flex items-center justify-center p-6 bg-[var(--bg-deep)] text-[var(--text-primary)]">
                <div className="w-full max-w-2xl modal-panel p-6 sm:p-8">
                    <h1 className="text-h2 mb-3">Supabase nao configurado</h1>
                    <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed mb-4">
                        {supabaseConfigError}
                    </p>
                    <ol className="list-decimal pl-5 space-y-2 text-sm sm:text-base text-[var(--text-primary)]">
                        <li>Abre as definicoes do projeto na Vercel.</li>
                        <li>Adiciona `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em Production.</li>
                        <li>Faz novo deploy (de preferencia sem cache).</li>
                    </ol>
                </div>
            </div>
        )
    }

    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <BrowserRouter>
                    <Suspense fallback={<RouteLoadingFallback />}>
                        <Routes>
                            {/* Public */}
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/register" element={<RegisterPage />} />

                            {/* Protected */}
                            <Route
                                element={
                                    <ProtectedRoute>
                                        <AppLayout />
                                    </ProtectedRoute>
                                }
                            >
                                <Route index element={<HomeRedirectPage />} />
                                <Route path="start" element={<StartGuidePage />} />
                                <Route path="today" element={<TodayPage />} />
                                <Route path="dashboard" element={<DashboardPage />} />
                                <Route path="financeiro" element={<FinanceiroPage />} />
                                <Route path="todo" element={<TodoPage />} />
                                <Route path="links" element={<LinksPage />} />
                                <Route path="crypto">
                                    <Route index element={<CryptoPage />} />
                                    <Route path="defi" element={<CryptoDeFiPage />} />
                                </Route>
                                <Route path="settings" element={<SettingsPage />} />
                                <Route path="news" element={<NewsPage />} />
                            </Route>
                        </Routes>
                    </Suspense>
                </BrowserRouter>
            </AuthProvider>
        </QueryClientProvider>
    )
}
