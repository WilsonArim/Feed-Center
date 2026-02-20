import { BrowserRouter, Routes, Route } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/components/core/AuthProvider'
import { ProtectedRoute } from '@/components/core/ProtectedRoute'
import { isSupabaseConfigured, supabaseConfigError } from '@/lib/supabase'
import { AppLayout } from '@/components/core/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { FinanceiroPage } from '@/pages/FinanceiroPage'
import { LinksPage } from '@/pages/LinksPage'
import { TodoPage } from '@/pages/TodoPage'
import { CryptoPage } from '@/pages/CryptoPage'
import { CryptoDeFiPage } from '@/pages/CryptoDeFiPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NewsPage } from '@/pages/NewsPage'

export default function App() {
    if (!isSupabaseConfigured) {
        return (
            <div className="min-h-dvh flex items-center justify-center p-6">
                <div className="w-full max-w-2xl modal-panel rounded-[var(--radius-xl)] p-6 sm:p-8">
                    <h1 className="text-2xl sm:text-3xl font-black mb-3">Supabase not configured</h1>
                    <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed mb-4">
                        {supabaseConfigError}
                    </p>
                    <ol className="list-decimal pl-5 space-y-2 text-sm sm:text-base text-[var(--text-primary)]">
                        <li>Open your Vercel project settings.</li>
                        <li>Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Production.</li>
                        <li>Trigger a new deploy (preferably without cache).</li>
                    </ol>
                </div>
            </div>
        )
    }

    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <BrowserRouter>
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
                            <Route index element={<DashboardPage />} />
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
                </BrowserRouter>
            </AuthProvider>
        </QueryClientProvider>
    )
}
