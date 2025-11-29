
import React, { useState, useEffect } from 'react';
import { User, Campaign, CampaignAnimation } from '../types';
import { dbService } from '../services/mockService';
import { Button } from '../components/Button';
import { supabase } from '../services/supabaseClient'; // Direct access for session check or use dbService helper
import { useToast } from '../components/Toast';

// Antonio Batista - LootFan - 2024-05-23
// Página de Perfil Público: Exibe Bio, Links, Grid de Campanhas e Loot Pass

interface CreatorProfileProps {
  username: string;
  onNavigateToCampaign: (slug: string) => void;
  onBack?: () => void;
}

export const CreatorProfile: React.FC<CreatorProfileProps> = ({ username, onNavigateToCampaign, onBack }) => {
  const toast = useToast();
  const [creator, setCreator] = useState<User | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      
      // Get Viewer ID
      const { data: session } = await supabase.auth.getSession();
      const currentViewerId = session?.session?.user?.id || null;
      setViewerId(currentViewerId);

      const user = await dbService.getCreatorByUsername(username);
      if (user) {
        setCreator(user);
        const userCampaigns = await dbService.getCampaignsByCreator(user.id);
        setCampaigns(userCampaigns.filter(c => c.isActive));

        // Check Subscription
        if (currentViewerId && user.lootPassConfig?.isEnabled) {
            const sub = await dbService.getSubscription(currentViewerId, user.id);
            if (sub && sub.status === 'ACTIVE') setIsSubscribed(true);
        }
      }
      setLoading(false);
    };
    loadProfile();
  }, [username]);

  const handleSubscribe = async () => {
      if (!viewerId) {
          toast.info("Faça login como Fã para assinar.");
          return;
      }
      if (!creator || !creator.lootPassConfig) return;

      if(!window.confirm(`Confirmar assinatura de R$ ${creator.lootPassConfig.price.toFixed(2)}/mês?`)) return;

      setSubscribing(true);
      try {
          await dbService.subscribeToCreator(viewerId, creator.id, creator.lootPassConfig.price);
          toast.success(`Bem-vindo ao clube ${creator.lootPassConfig.title}!`);
          setIsSubscribed(true);
      } catch (e) {
          toast.error("Erro ao processar assinatura.");
      } finally {
          setSubscribing(false);
      }
  }

  const getAnimationLabel = (type: CampaignAnimation) => {
      switch (type) {
          case CampaignAnimation.WHEEL: return { label: 'Roleta', icon: '🎡' };
          case CampaignAnimation.BOX: return { label: 'Caixa Surpresa', icon: '📦' };
          case CampaignAnimation.LOOT: return { label: 'Loot Cards', icon: '🃏' };
          case CampaignAnimation.MACHINE: return { label: 'Slot Machine', icon: '🎰' };
          default: return { label: 'Sorteio', icon: '✨' };
      }
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-brand-600">Carregando Perfil...</div>;
  if (!creator) return <div className="flex h-screen items-center justify-center text-slate-500">Creator não encontrado.</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* BARRA DE NAVEGAÇÃO DO CREATOR */}
      {onBack && (
          <div className="w-full bg-brand-600 text-white px-4 py-3 shadow-md sticky top-16 z-40 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                  <span>VISUALIZAÇÃO PÚBLICA</span>
              </div>
              <Button size="sm" variant="secondary" onClick={onBack} className="border-brand-400 text-brand-700 bg-white hover:bg-brand-50">← Voltar</Button>
          </div>
      )}

      {/* Header / Cover */}
      <div className="w-full bg-white border-b border-slate-200 pb-12 pt-12 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 text-center">
            
            <div className="w-32 h-32 mx-auto rounded-full bg-slate-200 border-4 border-white shadow-lg overflow-hidden mb-4 flex items-center justify-center relative">
                 {creator.avatarUrl ? (
                     <img src={creator.avatarUrl} alt={creator.name} className="w-full h-full object-cover" />
                 ) : (
                     <span className="text-4xl text-slate-400 font-bold">{creator.name.charAt(0)}</span>
                 )}
                 {isSubscribed && (
                     <div className="absolute bottom-0 right-0 bg-yellow-400 border-2 border-white rounded-full p-1.5 shadow-md" title="Você é um membro VIP">
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-yellow-900"><path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" /></svg>
                     </div>
                 )}
            </div>
            
            <h1 className="text-3xl font-bold text-slate-900">{creator.name}</h1>
            <p className="text-brand-600 font-medium">@{creator.username}</p>
            {creator.bio && <p className="mt-4 text-slate-600 max-w-lg mx-auto leading-relaxed">{creator.bio}</p>}

            {/* Social Links */}
            {creator.socialLinks && (
                <div className="flex justify-center gap-4 mt-6">
                    {creator.socialLinks.instagram && <a href={`https://instagram.com/${creator.socialLinks.instagram.replace('@','')}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-pink-600 transition-colors">Instagram</a>}
                    {creator.socialLinks.twitter && <a href={`https://twitter.com/${creator.socialLinks.twitter.replace('@','')}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-400 transition-colors">Twitter</a>}
                    {creator.socialLinks.website && <a href={creator.socialLinks.website} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-brand-600 transition-colors">Website</a>}
                </div>
            )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* LEFT SIDEBAR: LOOT PASS */}
          <div className="lg:col-span-1 order-last lg:order-first">
              {creator.lootPassConfig?.isEnabled ? (
                  <div className="sticky top-24">
                      <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-2xl overflow-hidden shadow-xl border border-yellow-500/30">
                          <div className="h-32 bg-slate-700 relative">
                              {creator.lootPassConfig.coverUrl ? (
                                  <img src={creator.lootPassConfig.coverUrl} className="w-full h-full object-cover opacity-60" />
                              ) : (
                                  <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                              <div className="absolute bottom-4 left-4">
                                  <span className="bg-yellow-500 text-yellow-950 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">Loot Pass</span>
                                  <h3 className="text-xl font-bold text-white mt-1">{creator.lootPassConfig.title}</h3>
                              </div>
                          </div>
                          
                          <div className="p-6">
                              <p className="text-slate-400 text-sm mb-6">{creator.lootPassConfig.description}</p>
                              
                              <ul className="space-y-3 mb-6">
                                  {creator.lootPassConfig.perks.map((perk, i) => (
                                      <li key={i} className="text-slate-300 text-xs flex items-start gap-2">
                                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>
                                          {perk}
                                      </li>
                                  ))}
                              </ul>

                              {isSubscribed ? (
                                  <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 text-center">
                                      <p className="text-green-400 font-bold text-sm">Assinatura Ativa ✅</p>
                                  </div>
                              ) : (
                                  <Button 
                                    fullWidth 
                                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-yellow-950 border-none font-bold hover:brightness-110 shadow-lg shadow-yellow-500/20"
                                    onClick={handleSubscribe}
                                    isLoading={subscribing}
                                  >
                                      Assinar por R$ {creator.lootPassConfig.price.toFixed(2)}
                                  </Button>
                              )}
                          </div>
                      </div>
                  </div>
              ) : (
                  <div className="p-6 bg-white rounded-xl border border-slate-200 text-center text-slate-400 text-sm italic">
                      Loot Pass não configurado.
                  </div>
              )}
          </div>

          {/* MAIN CONTENT: CAMPAIGNS */}
          <div className="lg:col-span-3">
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-brand-600"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>
                    Campanhas
                </h2>
                
                {campaigns.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                        Nenhuma campanha ativa no momento.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {campaigns.map(camp => {
                            const animInfo = getAnimationLabel(camp.animationType);
                            const isLocked = camp.isLootPassOnly && !isSubscribed;

                            return (
                            <div key={camp.id} className={`bg-white rounded-xl border transition-all duration-300 overflow-hidden group relative flex flex-col ${isLocked ? 'border-yellow-200 bg-slate-50' : 'border-slate-200 shadow-sm hover:shadow-lg hover:border-brand-200'}`}>
                                <div className="h-40 bg-slate-100 flex items-center justify-center relative overflow-hidden shrink-0">
                                    {camp.coverImageUrl ? (
                                        <img src={camp.coverImageUrl} className={`w-full h-full object-cover transition-transform duration-500 ${isLocked || camp.hasAdultContent ? 'blur-md' : 'group-hover:scale-105'}`} />
                                    ) : (
                                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                                    )}
                                    
                                    {/* BADGES */}
                                    {camp.hasAdultContent && (
                                        <div className="absolute top-2 left-2 z-20">
                                            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm border border-red-400">+18</span>
                                        </div>
                                    )}
                                    {camp.isLootPassOnly && (
                                        <div className="absolute top-2 right-2 z-20">
                                            <span className="bg-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-1 rounded shadow-sm border border-yellow-300 flex items-center gap-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" /></svg>
                                                VIP
                                            </span>
                                        </div>
                                    )}

                                    {isLocked && (
                                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center z-10 p-4 text-center">
                                            <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-yellow-900 mb-2 shadow-lg">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" /></svg>
                                            </div>
                                            <p className="text-white font-bold text-sm shadow-black drop-shadow-md">Exclusivo Loot Pass</p>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="p-5 flex flex-col flex-1">
                                    <h3 className="text-lg font-bold text-slate-900 mb-2 truncate">{camp.title}</h3>
                                    
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                            <span>{animInfo.icon}</span> {animInfo.label}
                                        </span>
                                    </div>

                                    <div className="mt-auto">
                                        <div className="flex justify-between items-center mt-4">
                                            <span className="text-sm text-slate-500">{camp.prizes.length} Itens</span>
                                            <span className="text-brand-600 font-bold bg-brand-50 px-2 py-1 rounded">R$ {camp.pricePerSpin.toFixed(2)}</span>
                                        </div>
                                        
                                        <Button 
                                          className={`w-full mt-4 ${isLocked ? 'opacity-50 cursor-not-allowed bg-slate-400 hover:bg-slate-400' : ''}`} 
                                          onClick={() => !isLocked && onNavigateToCampaign(camp.slug)}
                                          disabled={isLocked}
                                        >
                                            {isLocked ? 'Assine para Abrir' : 'Abrir'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )})}
                    </div>
                )}
          </div>
      </div>
    </div>
  );
};
