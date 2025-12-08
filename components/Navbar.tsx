
import React, { useState, useRef, useEffect } from 'react';
import { UserRole } from '../types';
import { Button } from './Button';

// Antonio Batista - LootFan - 2024-05-23
// Navbar Global - Estilo Clean com Dropdown Menu e Ícones Minimalistas

interface NavbarProps {
  currentUserRole: UserRole;
  userAvatarUrl?: string;
  onLogin: (role: UserRole) => void;
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentUserRole, userAvatarUrl, onLogin, onLogout, onNavigate }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (action: string) => {
      onNavigate(action);
      setIsMenuOpen(false);
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo (INALTERADO) */}
        <div 
          className="flex items-center gap-2 cursor-pointer group" 
          onClick={() => onNavigate('home')}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-500/30 group-hover:scale-105 transition-transform">
            <span className="text-xl font-black">L</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Loot<span className="text-brand-600">Fan</span>
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {currentUserRole === UserRole.GUEST ? (
            <>
              <button 
                onClick={() => onLogin(UserRole.FAN)}
                className="hidden text-sm font-medium text-slate-500 hover:text-brand-600 transition-colors sm:block"
              >
                Sou Fã
              </button>
              <Button 
                onClick={() => onLogin(UserRole.CREATOR)} 
                variant="primary" 
                size="sm"
                className="shadow-brand-500/20"
              >
                Sou Creator
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-4">
              
              {/* --- CREATOR MENU --- */}
              {currentUserRole === UserRole.CREATOR && (
                 <>
                   <span className="hidden md:inline-flex text-xs font-semibold text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
                      Creator Studio
                   </span>
                   
                   <div className="relative" ref={menuRef}>
                     <button 
                       onClick={() => setIsMenuOpen(!isMenuOpen)}
                       className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center hover:ring-2 hover:ring-brand-500 hover:border-brand-500 transition-all overflow-hidden text-slate-400"
                     >
                       {userAvatarUrl ? (
                          <img src={userAvatarUrl} alt="Perfil" className="w-full h-full object-cover" />
                       ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                          </svg>
                       )}
                     </button>

                     {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right ring-1 ring-black/5">
                            <div className="px-4 py-3 border-b border-slate-50">
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Minha Conta</p>
                            </div>
                            <button 
                                onClick={() => handleMenuClick('profile-settings')}
                                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-600 flex items-center gap-3 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                </svg>
                                Perfil Público
                            </button>
                            <button 
                                onClick={() => handleMenuClick('personal-data')}
                                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-600 flex items-center gap-3 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                                </svg>
                                Dados Pessoais
                            </button>
                        </div>
                     )}
                   </div>
                 </>
              )}

              {/* --- FAN MENU --- */}
               {currentUserRole === UserRole.FAN && (
                  <>
                     <button 
                        onClick={() => onNavigate('home')}
                        className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-600 mr-2"
                      >
                         Buscar Creators
                      </button>

                      {/* Dropdown Fã */}
                      <div className="relative" ref={menuRef}>
                         <button 
                           onClick={() => setIsMenuOpen(!isMenuOpen)}
                           className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center hover:ring-2 hover:ring-brand-500 hover:border-brand-500 transition-all overflow-hidden text-brand-600"
                         >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                            </svg>
                         </button>

                         {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right ring-1 ring-black/5">
                                <div className="px-4 py-3 border-b border-slate-50">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Conta Fã</p>
                                </div>
                                <button 
                                    onClick={() => handleMenuClick('fan-profile')}
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-600 flex items-center gap-3 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                    </svg>
                                    Meu Perfil
                                </button>
                                <button 
                                    onClick={() => handleMenuClick('fan-prizes')}
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-600 flex items-center gap-3 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H4.5a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                                    </svg>
                                    Meus Prêmios
                                </button>
                                <button 
                                    onClick={() => handleMenuClick('fan-payments')}
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-600 flex items-center gap-3 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg>
                                    Meus Pagamentos
                                </button>
                                <button 
                                    onClick={() => handleMenuClick('fan-support')}
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-600 flex items-center gap-3 transition-colors border-t border-slate-50"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
                                    </svg>
                                    Suporte
                                </button>
                            </div>
                         )}
                      </div>
                  </>
               )}

               {currentUserRole === UserRole.ADMIN && (
                 <span className="text-xs font-semibold text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-200">
                    Admin
                 </span>
              )}
              <Button onClick={onLogout} variant="ghost" size="sm" className="flex items-center gap-2">
                Sair
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
