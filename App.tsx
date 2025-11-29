
import React, { useState, useEffect, Suspense } from 'react';
import { Navbar } from './components/Navbar';
import { UserRole, User } from './types';
import { dbService } from './services/mockService';
import { ToastProvider } from './components/Toast';
import { AuthModal } from './components/AuthModal';
import { supabase } from './services/supabaseClient';

// Lazy Load Pages para otimização de performance
const LandingPage = React.lazy(() => import('./pages/LandingPage').then(module => ({ default: module.LandingPage })));
const CreatorDashboard = React.lazy(() => import('./pages/CreatorDashboard').then(module => ({ default: module.CreatorDashboard })));
const FanView = React.lazy(() => import('./pages/FanView').then(module => ({ default: module.FanView })));
const AdminPanel = React.lazy(() => import('./pages/AdminPanel').then(module => ({ default: module.AdminPanel })));
const CreatorProfile = React.lazy(() => import('./pages/CreatorProfile').then(module => ({ default: module.CreatorProfile })));
const FanHome = React.lazy(() => import('./pages/FanHome').then(module => ({ default: module.FanHome })));
const FanPrizes = React.lazy(() => import('./pages/FanPrizes').then(module => ({ default: module.FanPrizes })));
const FanProfile = React.lazy(() => import('./pages/FanProfile').then(module => ({ default: module.FanProfile })));
const FanSupport = React.lazy(() => import('./pages/FanSupport').then(module => ({ default: module.FanSupport })));
const FanPayments = React.lazy(() => import('./pages/FanPayments').then(module => ({ default: module.FanPayments })));
const FanLootPass = React.lazy(() => import('./pages/FanLootPass').then(module => ({ default: module.FanLootPass })));

// Antonio Batista - LootFan - 2024-05-23
// Componente App: Gerencia o estado global de roteamento e autenticação
// Otimizado com Code Splitting (Lazy/Suspense) e Timeout de Sessão

type DashboardTab = 'overview' | 'editor' | 'delivery' | 'support' | 'analytics' | 'profile' | 'personal-data' | 'loot-pass';

function App() {
    // Estado Global
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentView, setCurrentView] = useState<string>('home');

    // Auth Modal State
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [authModalRole, setAuthModalRole] = useState<UserRole>(UserRole.FAN);

    // Estado das Abas do Dashboard
    const [dashboardTab, setDashboardTab] = useState<DashboardTab>('overview');

    // Routing State Mock
    const [viewProfileUsername, setViewProfileUsername] = useState<string | null>(null);
    const [viewCampaignSlug, setViewCampaignSlug] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(true);

    // Handle URL Routing on Mount
    useEffect(() => {
        const path = window.location.pathname;

        // Match /c/:username/lppass or /c/:username
        const profileMatch = path.match(/^\/c\/([^/]+)(\/lppass)?$/);

        if (profileMatch) {
            const username = profileMatch[1];
            setViewProfileUsername(username);
            setCurrentView('public-profile');
        }
    }, []);

    // Persistence Listener
    useEffect(() => {
        // Verifica sessão inicial com Timeout para evitar travamento
        const checkSession = async () => {
            try {
                const sessionPromise = supabase.auth.getSession();
                // Aumentado para 10s para conexões lentas
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000));

                const response: any = await Promise.race([sessionPromise, timeoutPromise]);

                const session = response?.data?.session;

                if (session?.user) {
                    const user = await dbService.getUserProfile(session.user.id);
                    if (user) {
                        setCurrentUser(user);
                        if (currentView === 'home') {
                            if (user.role === UserRole.CREATOR) setCurrentView('dashboard');
                            if (user.role === UserRole.FAN) setCurrentView('fan-home');
                        }
                    }
                }
            } catch (error: any) {
                if (error.message === 'Timeout') {
                    console.warn("Inicialização lenta: Verificação de sessão excedeu o tempo limite. Carregando como visitante.");
                } else {
                    console.error("Erro na inicialização da sessão:", error);
                }
            } finally {
                setIsLoading(false);
            }
        };

        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                const user = await dbService.getUserProfile(session.user.id);
                if (user) setCurrentUser(user);
            } else if (event === 'SIGNED_OUT') {
                setCurrentUser(null);
                setCurrentView('home');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleOpenAuth = (role: UserRole) => {
        setAuthModalRole(role);
        setAuthModalOpen(true);
    };

    const handleAuthSuccess = (user: User) => {
        setCurrentUser(user);
        if (user.role === UserRole.CREATOR) {
            setCurrentView('dashboard');
            setDashboardTab('overview');
            setViewProfileUsername(null);
            setViewCampaignSlug(null);
        } else if (user.role === UserRole.FAN) {
            setCurrentView('fan-home');
            setViewProfileUsername(null);
            setViewCampaignSlug(null);
        } else if (user.role === UserRole.ADMIN) {
            setCurrentView('admin');
        }
        setAuthModalOpen(false);
    };

    const handleLogout = () => {
        dbService.logout();
        setCurrentUser(null);
        setCurrentView('home');
        setViewProfileUsername(null);
        setViewCampaignSlug(null);
    };

    const navigateToProfile = (username: string) => {
        setViewProfileUsername(username);
        setViewCampaignSlug(null);
        setCurrentView('public-profile');
    };

    const navigateToCampaign = (username: string, slug: string) => {
        setViewProfileUsername(username);
        setViewCampaignSlug(slug);
        setCurrentView('fan-view');
    }

    const handleTestCampaign = (slug: string) => {
        setViewCampaignSlug(slug);
        setCurrentView('test-fan-view');
    }

    const handleNavigation = (view: string) => {
        if (view === 'home') {
            if (currentUser?.role === UserRole.FAN) {
                setCurrentView('fan-home');
                return;
            }
            if (currentUser?.role === UserRole.CREATOR) {
                setCurrentView('dashboard');
                return;
            }
            setCurrentView('home');
            return;
        }

        if (view === 'profile-settings') {
            if (currentUser?.role === UserRole.CREATOR) {
                setCurrentView('dashboard');
                setDashboardTab('profile');
            }
            return;
        }

        if (view === 'personal-data') {
            if (currentUser?.role === UserRole.CREATOR) {
                setCurrentView('dashboard');
                setDashboardTab('personal-data');
            }
            return;
        }

        // Rotas do Fã
        if (view === 'fan-profile' || view === 'fan-prizes' || view === 'fan-support' || view === 'fan-payments' || view === 'fan-loot-pass') {
            setCurrentView(view);
            return;
        }

        setCurrentView(view);
        setViewProfileUsername(null);
        setViewCampaignSlug(null);
    }

    const renderView = () => {
        if (isLoading) {
            return (
                <div className="flex h-screen items-center justify-center flex-col gap-4">
                    <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                    <div className="text-brand-600 font-bold animate-pulse">Iniciando LootFan...</div>
                </div>
            );
        }

        return (
            <Suspense fallback={
                <div className="flex h-screen items-center justify-center">
                    <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                </div>
            }>
                {(() => {
                    if (currentView === 'fan-view' && viewCampaignSlug) {
                        return (
                            <FanView
                                campaignSlug={viewCampaignSlug}
                                user={currentUser}
                                onLogin={() => handleOpenAuth(UserRole.FAN)}
                                mode="real"
                                onNavigateToProfile={(username) => navigateToProfile(username)}
                            />
                        );
                    }

                    if (currentView === 'test-fan-view' && viewCampaignSlug) {
                        return (
                            <FanView
                                campaignSlug={viewCampaignSlug}
                                user={currentUser}
                                onLogin={() => { }}
                                mode="test"
                                onBack={() => setCurrentView('dashboard')}
                            />
                        );
                    }

                    if (currentView === 'public-profile' && viewProfileUsername) {
                        return (
                            <CreatorProfile
                                username={viewProfileUsername}
                                onNavigateToCampaign={(slug) => navigateToCampaign(viewProfileUsername, slug)}
                                onBack={currentUser?.username === viewProfileUsername ? () => setCurrentView('dashboard') : undefined}
                                onLogin={() => handleOpenAuth(UserRole.FAN)}
                            />
                        );
                    }

                    if (currentView === 'home' && !currentUser) {
                        return <LandingPage onOpenAuth={handleOpenAuth} />;
                    }

                    if (currentView === 'home' && currentUser) {
                        if (currentUser.role === UserRole.CREATOR) return <CreatorDashboard user={currentUser} activeTab={dashboardTab as any} onTabChange={(t) => setDashboardTab(t as DashboardTab)} onTestCampaign={handleTestCampaign} onViewProfile={(username) => navigateToProfile(username)} />;
                        if (currentUser.role === UserRole.FAN) return <FanHome user={currentUser} onNavigateToProfile={navigateToProfile} />;
                    }

                    if (currentUser?.role === UserRole.CREATOR) {
                        return (
                            <CreatorDashboard
                                user={currentUser}
                                activeTab={dashboardTab as any}
                                onTabChange={(t) => setDashboardTab(t as DashboardTab)}
                                onTestCampaign={handleTestCampaign}
                                onViewProfile={(username) => navigateToProfile(username)}
                            />
                        );
                    }

                    if (currentUser?.role === UserRole.FAN) {
                        if (currentView === 'fan-home') return <FanHome user={currentUser} onNavigateToProfile={navigateToProfile} />;
                        if (currentView === 'fan-prizes') return <FanPrizes user={currentUser} />;
                        if (currentView === 'fan-profile') return <FanProfile user={currentUser} />;
                        if (currentView === 'fan-support') return <FanSupport user={currentUser} />;
                        if (currentView === 'fan-payments') return <FanPayments user={currentUser} onNavigateToCampaign={(slug) => navigateToCampaign('dummy', slug)} />;
                        if (currentView === 'fan-loot-pass') return <FanLootPass user={currentUser} onNavigateToProfile={navigateToProfile} />;
                        return <FanHome user={currentUser} onNavigateToProfile={navigateToProfile} />;
                    }

                    if (currentUser?.role === UserRole.ADMIN) {
                        return <AdminPanel />;
                    }

                    return <LandingPage onOpenAuth={handleOpenAuth} />;
                })()}
            </Suspense>
        );
    };

    return (
        <ToastProvider>
            <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-brand-200 selection:text-brand-900">
                <Navbar
                    currentUserRole={currentUser?.role || UserRole.GUEST}
                    userAvatarUrl={currentUser?.avatarUrl}
                    onLogin={handleOpenAuth}
                    onLogout={handleLogout}
                    onNavigate={handleNavigation}
                />

                <main className="w-full">
                    {renderView()}
                </main>

                <AuthModal
                    isOpen={authModalOpen}
                    role={authModalRole}
                    onClose={() => setAuthModalOpen(false)}
                    onSuccess={handleAuthSuccess}
                />

                {currentView !== 'test-fan-view' && (
                    <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500 bg-white">
                        <p>&copy; 2024 LootFan. Todos os direitos reservados.</p>
                        <p className="text-brand-600 font-medium">Desenvolvido para Creators de Elite.</p>
                    </footer>
                )}
            </div>
        </ToastProvider>
    );
}

export default App;
