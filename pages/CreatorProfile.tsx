
import React, { useState, useEffect } from 'react';
import { User, Campaign } from '../types';
import { dbService } from '../services/mockService';
import { Button } from '../components/Button';

// Antonio Batista - LootFan - 2024-05-23
// Página de Perfil Público: Exibe Bio, Links e Grid de Campanhas

interface CreatorProfileProps {
  username: string;
  onNavigateToCampaign: (slug: string) => void;
  onBack?: () => void; // Opcional: Para o próprio creator voltar
}

export const CreatorProfile: React.FC<CreatorProfileProps> = ({ username, onNavigateToCampaign, onBack }) => {
  const [creator, setCreator] = useState<User | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      const user = await dbService.getCreatorByUsername(username);
      if (user) {
        setCreator(user);
        const userCampaigns = await dbService.getCampaignsByCreator(user.id);
        setCampaigns(userCampaigns.filter(c => c.isActive)); // Apenas ativas
      }
      setLoading(false);
    };
    loadProfile();
  }, [username]);

  if (loading) return <div className="flex h-screen items-center justify-center text-brand-600">Carregando Perfil...</div>;
  if (!creator) return <div className="flex h-screen items-center justify-center text-slate-500">Creator não encontrado.</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* BARRA DE NAVEGAÇÃO DO CREATOR (SE FOR ELE VENDO) */}
      {onBack && (
          <div className="w-full bg-brand-600 text-white px-4 py-3 shadow-md sticky top-16 z-40 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                  <span>VISUALIZAÇÃO PÚBLICA</span>
                  <span className="hidden sm:inline font-normal text-brand-100 text-sm">- É assim que seus fãs veem seu perfil.</span>
              </div>
              <Button size="sm" variant="secondary" onClick={onBack} className="border-brand-400 text-brand-700 bg-white hover:bg-brand-50">
                  ← Voltar para Dashboard
              </Button>
          </div>
      )}

      {/* Header / Cover */}
      <div className="w-full bg-white border-b border-slate-200 pb-8 pt-12 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 text-center">
            
            <div className="w-32 h-32 mx-auto rounded-full bg-slate-200 border-4 border-white shadow-lg overflow-hidden mb-4 flex items-center justify-center">
                 {creator.avatarUrl ? (
                     <img src={creator.avatarUrl} alt={creator.name} className="w-full h-full object-cover" />
                 ) : (
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 text-slate-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                     </svg>
                 )}
            </div>
            
            <h1 className="text-3xl font-bold text-slate-900">{creator.name}</h1>
            <p className="text-brand-600 font-medium">@{creator.username}</p>
            
            {creator.bio && (
                <p className="mt-4 text-slate-600 max-w-lg mx-auto leading-relaxed">{creator.bio}</p>
            )}

            {/* Social Links */}
            {creator.socialLinks && (
                <div className="flex justify-center gap-4 mt-6">
                    {creator.socialLinks.instagram && (
                        <a href={`https://instagram.com/${creator.socialLinks.instagram.replace('@','')}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-pink-600 transition-colors">
                            Instagram
                        </a>
                    )}
                    {creator.socialLinks.twitter && (
                        <a href={`https://twitter.com/${creator.socialLinks.twitter.replace('@','')}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-400 transition-colors">
                            Twitter
                        </a>
                    )}
                    {creator.socialLinks.website && (
                        <a href={creator.socialLinks.website} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-brand-600 transition-colors">
                            Website
                        </a>
                    )}
                </div>
            )}
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="max-w-5xl mx-auto px-4 py-12">
          <h2 className="text-xl font-bold text-slate-800 mb-6 border-l-4 border-brand-500 pl-3">Campanhas Disponíveis</h2>
          
          {campaigns.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                  Este creator ainda não tem campanhas ativas.
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {campaigns.map(camp => (
                      <div key={camp.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-brand-200 transition-all duration-300 overflow-hidden group">
                          <div className="h-40 bg-slate-100 flex items-center justify-center relative overflow-hidden">
                              {camp.coverImageUrl ? (
                                  <img src={camp.coverImageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              ) : (
                                <>
                                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                                    <div className="text-6xl group-hover:scale-110 transition-transform duration-300 text-brand-200">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-20 h-20">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H4.5a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                                        </svg>
                                    </div>
                                </>
                              )}
                          </div>
                          
                          <div className="p-6">
                              <h3 className="text-lg font-bold text-slate-900 mb-2 truncate">{camp.title}</h3>
                              <div className="flex justify-between items-center mt-4">
                                  <span className="text-sm text-slate-500">{camp.prizes.length} Prêmios</span>
                                  <span className="text-brand-600 font-bold bg-brand-50 px-2 py-1 rounded">
                                      R$ {camp.pricePerSpin.toFixed(2)} / Giro
                                  </span>
                              </div>
                              
                              <Button 
                                className="w-full mt-6" 
                                onClick={() => onNavigateToCampaign(camp.slug)}
                              >
                                  Ver Roleta
                              </Button>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>

    </div>
  );
};
