import { BrowserRouter, Routes, Route } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/components/core/AuthProvider'
import { ProtectedRoute } from '@/components/core/ProtectedRoute'
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
