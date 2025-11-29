
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { dbService } from '../services/mockService';
import { Button } from '../components/Button';

// Antonio Batista - LootFan - 2024-05-23
// Fan Home: Página inicial para fãs logados com busca de Creators

interface FanHomeProps {
  user: User;
  onNavigateToProfile: (username: string) => void;
}

export const FanHome: React.FC<FanHomeProps> = ({ user, onNavigateToProfile }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingTop, setLoadingTop] = useState(true);

  // Busca inicial (trending) ou quando o usuário digita
  useEffect(() => {
    const doSearch = async () => {
        setIsSearching(true);
        try {
            if (searchTerm.trim() === '') {
                // Se estiver vazio, carrega TOP 10 CREATORS (por vendas)
                setLoadingTop(true);
                const topCreators = await dbService.getTopCreators();
                setSearchResults(topCreators);
                setLoadingTop(false);
            } else {
                // Busca normal
                const results = await dbService.searchCreators(searchTerm);
                setSearchResults(results);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearching(false);
        }
    };

    const debounce = setTimeout(doSearch, 500);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* Search Header */}
      <div className="bg-white border-b border-slate-200 py-12 px-4 shadow-sm">
          <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Bem-vindo, {user.name.split(' ')[0]}! 👋</h1>
              <p className="text-slate-500 mb-8">Encontre seus creators favoritos e descubra prêmios exclusivos.</p>
              
              <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Busque por nome ou @usuario..." 
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                      </svg>
                  </div>
                  {isSearching && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <svg className="animate-spin h-5 w-5 text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* Results Grid */}
      <div className="max-w-5xl mx-auto px-4 py-12">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-brand-600"><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" /></svg>
            {searchTerm ? 'Resultados da Busca' : 'Creators em Destaque (Top 10)'}
          </h2>

          {loadingTop ? (
              <div className="text-center py-20 text-slate-400">Carregando os melhores...</div>
          ) : searchResults.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
                  <p className="text-slate-400">Nenhum creator encontrado.</p>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchResults.map((creator, index) => (
                      <div key={creator.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex items-center gap-4 relative overflow-hidden">
                          {!searchTerm && index < 3 && (
                             <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">TOP {index + 1}</div>
                          )}
                          <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-100">
                              {creator.avatarUrl ? (
                                  <img src={creator.avatarUrl} alt={creator.name} className="w-full h-full object-cover" />
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-brand-100 text-brand-600 font-bold text-xl">
                                      {creator.name.charAt(0)}
                                  </div>
                              )}
                          </div>
                          <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-slate-900 truncate">{creator.name}</h3>
                              <p className="text-sm text-brand-600 truncate">@{creator.username || 'user'}</p>
                              <p className="text-xs text-slate-400 mt-1 truncate">{creator.bio || 'Sem bio definida.'}</p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            onClick={() => onNavigateToProfile(creator.username || '')}
                            disabled={!creator.username}
                          >
                              Visitar
                          </Button>
                      </div>
                  ))}
              </div>
          )}
      </div>
    </div>
  );
};
