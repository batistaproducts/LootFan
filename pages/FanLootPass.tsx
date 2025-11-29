
import React, { useState, useEffect } from 'react';
import { User, Subscription } from '../types';
import { dbService } from '../services/mockService';
import { Button } from '../components/Button';

interface FanLootPassProps {
  user: User;
  onNavigateToProfile: (username: string) => void;
}

export const FanLootPass: React.FC<FanLootPassProps> = ({ user, onNavigateToProfile }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      const loadSubs = async () => {
          setLoading(true);
          const data = await dbService.getAllFanSubscriptions(user.id);
          setSubscriptions(data);
          setLoading(false);
      }
      loadSubs();
  }, [user.id]);

  if (loading) return <div className="p-12 text-center text-brand-600">Carregando seus passes...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-yellow-100 rounded-xl text-yellow-600">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" /></svg>
            </div>
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Meus LootPass</h1>
                <p className="text-slate-500">Gerencie suas assinaturas e veja seu progresso nos clubes.</p>
            </div>
        </div>

        {subscriptions.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border-2 border-dashed border-slate-200 text-center">
                <p className="text-slate-400 mb-4">Você ainda não assinou nenhum clube.</p>
                <Button onClick={() => window.location.href='/'} variant="secondary">Explorar Creators</Button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {subscriptions.map(sub => {
                    const progressPercent = (sub.xp % 100); 
                    return (
                        <div key={sub.id} className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-700 relative group">
                            {/* Card Background Image */}
                            <div className="absolute inset-0 z-0 opacity-30 group-hover:opacity-40 transition-opacity">
                                {sub.passCover ? (
                                    <img src={sub.passCover} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-purple-900 to-black"></div>
                                )}
                            </div>
                            
                            <div className="relative z-10 p-6 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full border-2 border-yellow-500 overflow-hidden bg-slate-800">
                                            {sub.creatorAvatar ? <img src={sub.creatorAvatar} className="w-full h-full object-cover" /> : <div className="text-white flex items-center justify-center h-full font-bold">{sub.creatorName?.charAt(0)}</div>}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white leading-tight">{sub.passTitle || 'Clube VIP'}</h3>
                                            <p className="text-slate-400 text-xs">por {sub.creatorName}</p>
                                        </div>
                                    </div>
                                    <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-1 rounded border border-green-500/30 uppercase">Ativo</span>
                                </div>

                                <div className="mt-auto">
                                    <div className="flex justify-between items-end mb-2">
                                        <div className="text-yellow-500 font-black text-3xl italic">LVL {sub.level}</div>
                                        <div className="text-slate-400 text-xs font-mono">{sub.xp} XP TOTAL</div>
                                    </div>
                                    
                                    {/* Progress Bar */}
                                    <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-600 relative">
                                        <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-600 to-yellow-400" style={{width: `${progressPercent}%`}}></div>
                                        <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow-md">
                                            {sub.nextLevelXp} XP para o próximo nível
                                        </div>
                                    </div>

                                    <div className="flex gap-2 mt-6">
                                        <Button size="sm" fullWidth className="bg-white text-slate-900 hover:bg-slate-200 border-none" onClick={() => sub.creatorUsername && onNavigateToProfile(sub.creatorUsername)}>
                                            Acessar Clube
                                        </Button>
                                        <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white border border-slate-600">
                                            Gerenciar
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
    </div>
  );
};
