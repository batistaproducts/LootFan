
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Campaign, Prize, UserRole, CampaignAnimation, PrizeType } from '../types';
import { dbService } from '../services/mockService';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';

interface FanViewProps {
  campaignSlug: string;
  user: User | null;
  onLogin: () => void;
  mode?: 'real' | 'test'; 
  onBack?: () => void;
  onNavigateToProfile?: (username: string) => void;
}

interface VisualSlice {
  id: string;
  prizeId: string;
  prizeName: string;
  prizeImage: string;
  percentage: number; // 0-100
  color: string;
}

// LootFan Symbol for Slot Machine Wildcard
const LootFanSymbol = {
    id: 'lootfan-logo',
    name: 'LootFan Bonus',
    imageUrl: '', // Will use SVG
    isBonus: true
};

export const FanView: React.FC<FanViewProps> = ({ campaignSlug, user, onLogin, mode = 'real', onBack, onNavigateToProfile }) => {
  const toast = useToast();
  const [campaign, setCampaign] = useState<Campaign | undefined>(undefined);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wonPrize, setWonPrize] = useState<Prize | null>(null);
  const [ageVerified, setAgeVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Credit & Payment States
  const [userBalance, setUserBalance] = useState(0);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<{spins: number, price: number} | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Machine State (Slot)
  const [slotResults, setSlotResults] = useState<(Prize | typeof LootFanSymbol)[]>([LootFanSymbol, LootFanSymbol, LootFanSymbol]);
  const [isFreeSpinPending, setIsFreeSpinPending] = useState(false); 
  const [hasFreeSpin, setHasFreeSpin] = useState(false); 
  const [pendingFinalPrize, setPendingFinalPrize] = useState<Prize | null>(null);

  // Refs de Animação
  const wheelRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const reel1Ref = useRef<HTMLDivElement>(null);
  const reel2Ref = useRef<HTMLDivElement>(null);
  const reel3Ref = useRef<HTMLDivElement>(null);

  const MAX_OPTI_SLICES = 12;

  useEffect(() => {
    const fetchCamp = async () => {
        setLoading(true);
        const c = await dbService.getCampaignBySlug(campaignSlug);
        setCampaign(c);
        if (user && c) {
            loadBalance(user.id, c.id);
        }
        setLoading(false);
    };
    fetchCamp();
  }, [campaignSlug, user]);

  const loadBalance = async (uid: string, cid: string) => {
      const bal = await dbService.getCampaignBalance(uid, cid);
      setUserBalance(bal);
  }

  const initiateAction = async () => {
    if (mode === 'test') {
        toast.info("Simulando giro (Sem cobrança)...");
        executeSpinLogic();
        return;
    }
    
    if (!user) {
      onLogin();
      return;
    }
    if (!campaign) return;

    if (hasFreeSpin) {
        executeSpinLogic();
        return;
    }

    if (userBalance > 0) {
        // Tem saldo, executa giro consumindo crédito
        executeSpinLogic();
    } else {
        // Sem saldo, abre modal de compra de créditos
        setShowCreditModal(true);
    }
  };

  const handlePurchaseCredits = async () => {
    if (!selectedPackage || !campaign || !user) return;
    
    setIsProcessingPayment(true);
    // Simula delay de gateway
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
        await dbService.purchaseCredits(user.id, campaign.id, selectedPackage.spins, selectedPackage.price);
        toast.success(`Pacote de ${selectedPackage.spins} aberturas adquirido!`);
        await loadBalance(user.id, campaign.id);
        setShowCreditModal(false);
        setIsProcessingPayment(false);
    } catch (e) {
        toast.error("Erro ao processar pagamento.");
        setIsProcessingPayment(false);
    }
  };

  // Helper para calcular fatias visuais (Segmentação > 50%)
  const visualSlices = useMemo(() => {
    if (!campaign) return [];
    
    const prizes = campaign.prizes.filter(p => p.stock !== 0);
    const totalProb = prizes.reduce((acc, p) => acc + p.probability, 0);
    if (totalProb === 0) return [];

    const dominantPrizeIndex = prizes.findIndex(p => (p.probability / totalProb) > 0.5);
    let rawSlices: Omit<VisualSlice, 'color'>[] = [];

    if (dominantPrizeIndex === -1) {
        rawSlices = prizes.map((p) => ({
            id: `slice-${p.id}`,
            prizeId: p.id,
            prizeName: p.name,
            prizeImage: p.imageUrl || '',
            percentage: (p.probability / totalProb) * 100,
        }));
    } else {
        const dominantPrize = prizes[dominantPrizeIndex];
        const otherPrizes = prizes.filter((_, i) => i !== dominantPrizeIndex);
        
        const dominantTotalPercent = (dominantPrize.probability / totalProb) * 100;
        const chunks = 3; 
        const chunkPercent = dominantTotalPercent / chunks;

        const domSlices = Array.from({ length: chunks }).map((_, i) => ({
            id: `slice-${dominantPrize.id}-chunk-${i}`,
            prizeId: dominantPrize.id,
            prizeName: dominantPrize.name,
            prizeImage: dominantPrize.imageUrl || '',
            percentage: chunkPercent,
        }));

        const otherSlices = otherPrizes.map((p) => ({
            id: `slice-${p.id}`,
            prizeId: p.id,
            prizeName: p.name,
            prizeImage: p.imageUrl || '',
            percentage: (p.probability / totalProb) * 100,
        }));

        let domIdx = 0;
        let otherIdx = 0;
        while (domIdx < domSlices.length || otherIdx < otherSlices.length) {
            if (domIdx < domSlices.length) rawSlices.push(domSlices[domIdx++]);
            if (otherIdx < otherSlices.length) rawSlices.push(otherSlices[otherIdx++]);
        }
    }

    return rawSlices.map((slice, idx) => ({
        ...slice,
        color: idx % 2 === 0 ? '#7c3aed' : '#a78bfa' 
    }));
  }, [campaign?.prizes]);

  const wheelGradient = useMemo(() => {
     let currentDeg = 0;
     const gradientParts = visualSlices.map((s) => {
         const deg = (s.percentage / 100) * 360;
         const start = currentDeg;
         const end = currentDeg + deg;
         currentDeg = end;
         return `${s.color} ${start}deg ${end}deg`;
     });
     return `conic-gradient(${gradientParts.join(', ')})`;
  }, [visualSlices]);

  const executeSpinLogic = async () => {
    if (!campaign) return;
    
    const availablePrizes = campaign.prizes.filter(p => p.stock !== 0);
    if (availablePrizes.length === 0) {
        toast.error("Todos os prêmios esgotaram!");
        return;
    }

    setIsSpinning(true);
    setWonPrize(null);

    // Lógica RNG
    let selectedPrize = pendingFinalPrize;
    if (!selectedPrize) {
        const totalProbability = availablePrizes.reduce((acc, p) => acc + p.probability, 0);
        const random = Math.random() * totalProbability;
        let cumulative = 0;
        selectedPrize = availablePrizes[0];
        for (const prize of availablePrizes) {
          cumulative += prize.probability;
          if (random <= cumulative) {
            selectedPrize = prize;
            break;
          }
        }
    }

    // Persist Transaction & Consume Credit
    if (mode === 'real' && user && !hasFreeSpin) {
        try {
            await dbService.useCreditAndSpin(campaign.id, selectedPrize, user.id);
            setUserBalance(prev => Math.max(0, prev - 1)); // Atualiza visualmente
        } catch (err: any) {
            console.error("Falha na transação", err);
            toast.error(err.message || "Erro ao processar giro.");
            setIsSpinning(false);
            return;
        }
    }

    const animType = campaign.animationType || CampaignAnimation.WHEEL;

    if (animType === CampaignAnimation.MACHINE) {
        const triggerFreeSpinDrama = !hasFreeSpin && Math.random() < 0.20;
        if (triggerFreeSpinDrama) {
            setPendingFinalPrize(selectedPrize);
        } else {
            setPendingFinalPrize(null);
            setHasFreeSpin(false); 
        }

        const reels = [reel1Ref, reel2Ref, reel3Ref];
        reels.forEach((ref, index) => {
            if (ref.current) {
                ref.current.style.transition = 'none';
                ref.current.style.transform = `translateY(0px)`;
                void ref.current.offsetWidth;
                const baseDuration = 3.5; 
                const delay = index * 0.8; 
                const easing = "cubic-bezier(0.15, 0.90, 0.35, 1.0)";
                ref.current.style.transition = `transform ${baseDuration}s ${easing} ${delay}s`;
                ref.current.style.transform = `translateY(${(31) * 96}px)`;
            }
        });

        setTimeout(() => {
            setIsSpinning(false);
            if (triggerFreeSpinDrama) {
                setIsFreeSpinPending(true);
                setHasFreeSpin(true); 
                setSlotResults([selectedPrize!, selectedPrize!, LootFanSymbol]);
            } else {
                setIsFreeSpinPending(false);
                if (selectedPrize) {
                    setSlotResults([selectedPrize, selectedPrize, selectedPrize]);
                    setWonPrize(selectedPrize);
                }
            }
            reels.forEach(ref => { if(ref.current) { ref.current.style.transition = 'none'; ref.current.style.transform = 'translateY(0px)'; } });
        }, 6000); 
        return;
    }

    if (animType === CampaignAnimation.WHEEL) {
        const targetIndices = visualSlices.map((s, i) => s.prizeId === selectedPrize!.id ? i : -1).filter(i => i !== -1);
        const targetIndex = targetIndices[Math.floor(Math.random() * targetIndices.length)];
        const targetSlice = visualSlices[targetIndex];
        let angleStart = 0;
        for (let i = 0; i < targetIndex; i++) angleStart += (visualSlices[i].percentage / 100) * 360;
        const sliceAngle = (targetSlice.percentage / 100) * 360;
        const centerAngleOfSlice = angleStart + (sliceAngle / 2);
        const finalRotation = (360 * 5) + (360 - centerAngleOfSlice);

        if (wheelRef.current) wheelRef.current.style.transform = `rotate(${finalRotation}deg)`;
        
        setTimeout(() => {
            if (selectedPrize) finishAnimation(selectedPrize);
            if (wheelRef.current) {
                wheelRef.current.style.transition = 'none';
                wheelRef.current.style.transform = `rotate(${360 - centerAngleOfSlice}deg)`;
                setTimeout(() => { if(wheelRef.current) wheelRef.current.style.transition = 'transform 4s cubic-bezier(0.25, 0.1, 0.25, 1)'; }, 50);
            }
        }, 4000);
    } 
    else if (animType === CampaignAnimation.BOX) {
        setTimeout(() => { if (selectedPrize) finishAnimation(selectedPrize); }, 3000); 
    } 
    else if (animType === CampaignAnimation.LOOT) {
        if (cardRef.current) cardRef.current.style.transform = 'rotateY(0deg)';
        setTimeout(() => {
             if (cardRef.current) cardRef.current.style.transform = 'rotateY(180deg)';
             setTimeout(() => { if (selectedPrize) finishAnimation(selectedPrize); }, 1000);
        }, 1500); 
    }
  };

  const finishAnimation = (prize: Prize) => {
      setIsSpinning(false);
      setWonPrize(prize);
  }

  // --- RENDER HELPERS ---
  const ReelStrip = useMemo(() => {
      if (!campaign?.prizes) return null;
      const effectiveAvailable = campaign.prizes.length > 0 ? campaign.prizes : [LootFanSymbol];
      const blurItems = [];
      for(let i=0; i<30; i++) blurItems.push(effectiveAvailable[i % effectiveAvailable.length]);
      return blurItems;
  }, [campaign?.prizes]);

  const renderSlotReel = (ref: React.RefObject<HTMLDivElement>, currentSymbol: Prize | typeof LootFanSymbol, targetSymbol?: Prize | typeof LootFanSymbol | null) => {
      const displayItems = [currentSymbol, ...(ReelStrip || []), targetSymbol || (campaign?.prizes[0] || LootFanSymbol)];
      return (
          <div className="flex-1 h-64 bg-white border-x border-slate-200 relative overflow-hidden reel-container">
               <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-black/20 to-transparent z-10 pointer-events-none"></div>
               <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-black/20 to-transparent z-10 pointer-events-none"></div>
               <div ref={ref} className="reel-strip absolute bottom-0 w-full flex flex-col-reverse items-center justify-end pb-20">
                   {displayItems.map((item, idx) => (
                       <div key={idx} className={`w-20 h-20 mb-4 flex-shrink-0 flex items-center justify-center rounded-lg ${isSpinning ? 'animate-slot-blur' : ''}`}>
                           {'isBonus' in item ? (
                               <div className="w-16 h-16 bg-brand-600 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-lg border-2 border-white">L</div>
                           ) : (
                               item.imageUrl ? <img src={item.imageUrl} className="w-16 h-16 object-cover rounded-md shadow-sm border border-slate-100" loading="lazy" /> : <span className="text-3xl">🎁</span>
                           )}
                       </div>
                   ))}
               </div>
               <div className="absolute top-1/2 left-0 w-full h-1 bg-red-500/30 -translate-y-1/2 z-20 pointer-events-none"></div>
          </div>
      )
  }

  if (loading) return <div className="text-center mt-20 text-brand-600">Carregando Campanha...</div>;
  if (!campaign) return <div className="text-center mt-20 text-slate-500">Campanha não encontrada.</div>;

  // AGE GATE
  if (mode === 'real' && campaign.hasAdultContent && !ageVerified && !user?.isAdult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in zoom-in-95">
        <div className="max-w-md w-full bg-white shadow-2xl p-8 rounded-2xl text-center border-t-4 border-red-500">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4"><span className="text-2xl font-bold text-red-600">18+</span></div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Conteúdo Sensível</h2>
          <p className="text-slate-500 mb-8 leading-relaxed text-sm">
              O creator marcou esta campanha como material adulto/sensível. 
              As imagens são protegidas para evitar exibição indiscriminada.
              Ao prosseguir, você declara ter mais de 18 anos.
          </p>
          <div className="flex flex-col gap-3">
             <Button variant="danger" onClick={() => setAgeVerified(true)} className="w-full">Tenho +18 Anos</Button>
             <Button variant="secondary" onClick={onBack ? onBack : () => window.history.back()} className="w-full">Voltar</Button>
          </div>
        </div>
      </div>
    );
  }

  const renderAnimationArea = () => {
      const animType = campaign.animationType || CampaignAnimation.WHEEL;
      if (animType === CampaignAnimation.MACHINE) {
          return (
              <div className="relative w-full max-w-md mx-auto h-80 bg-slate-800 rounded-3xl p-4 shadow-2xl border-4 border-slate-700 flex flex-col gap-2">
                   <div className="flex justify-between px-4 pb-2">
                       <div className={`w-3 h-3 rounded-full ${isSpinning ? 'bg-red-500 animate-pulse' : 'bg-red-900'}`}></div>
                       <div className={`w-3 h-3 rounded-full ${isSpinning ? 'bg-yellow-500 animate-pulse' : 'bg-yellow-900'}`}></div>
                       <div className={`w-3 h-3 rounded-full ${isSpinning ? 'bg-green-500 animate-pulse' : 'bg-green-900'}`}></div>
                       <div className={`w-3 h-3 rounded-full ${isSpinning ? 'bg-blue-500 animate-pulse' : 'bg-blue-900'}`}></div>
                   </div>
                   <div className="flex-1 bg-slate-100 rounded-xl border-4 border-yellow-500 shadow-inner overflow-hidden flex relative">
                        {renderSlotReel(reel1Ref, slotResults[0], slotResults[0])}
                        {renderSlotReel(reel2Ref, slotResults[1], slotResults[1])}
                        {renderSlotReel(reel3Ref, slotResults[2], slotResults[2])}
                   </div>
                   <div className="h-10 bg-slate-700 rounded-b-xl flex items-center justify-center text-slate-400 text-xs font-mono uppercase tracking-widest">LootFan Slots v1.0</div>
                   {isFreeSpinPending && (
                       <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl animate-in zoom-in">
                           <div className="text-center p-4">
                               <h2 className="text-3xl font-black text-yellow-400 drop-shadow-lg mb-2 animate-bounce">UAAU!</h2>
                               <p className="text-white font-bold text-lg mb-4">2 Iguais + Bônus!</p>
                               <div className="bg-brand-600 text-white px-4 py-2 rounded-lg shadow-lg font-bold border-2 border-white/50">GANHOU 1 GIRO GRÁTIS!</div>
                           </div>
                       </div>
                   )}
              </div>
          );
      }
      if (animType === CampaignAnimation.WHEEL) {
          const isCrowded = visualSlices.length > MAX_OPTI_SLICES;
          return (
             <div className="relative w-80 h-80 sm:w-96 sm:h-96 rounded-full border-[10px] border-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] overflow-hidden bg-white mx-auto">
                <div ref={wheelRef} className="w-full h-full relative spin-animation" style={{ background: wheelGradient }}>
                   {visualSlices.map((s, idx) => {
                       let prevDeg = 0;
                       for(let i=0; i<idx; i++) prevDeg += (visualSlices[i].percentage / 100) * 360;
                       const sliceSize = (s.percentage / 100) * 360;
                       const centerRotation = prevDeg + (sliceSize / 2);
                       if (isCrowded) return null;
                       return (
                           <div key={s.id} className="absolute top-0 left-1/2 -translate-x-1/2 h-1/2 origin-bottom flex flex-col items-center justify-start pt-4" style={{ transform: `rotate(${centerRotation}deg)` }}>
                               <div className="bg-white/20 backdrop-blur-sm p-1.5 rounded-full mb-1">
                                   {s.prizeImage ? <img src={s.prizeImage} className="w-8 h-8 rounded-full object-cover" loading="lazy" /> : <span className="text-xl">🎁</span>}
                               </div>
                               <span className="text-white text-[10px] font-bold uppercase max-w-[60px] truncate drop-shadow-md text-center bg-black/20 px-1 rounded">{s.prizeName}</span>
                           </div>
                       )
                   })}
                </div>
                <svg className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-20 w-14 h-14 drop-shadow-xl filter" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21L5 5H19L12 21Z" fill="white" stroke="#facc15" strokeWidth="2" strokeLinejoin="round" /><circle cx="12" cy="7" r="2" fill="#facc15" /></svg>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center border-4 border-brand-100 z-10"><span className="text-brand-600 font-black text-lg">L</span></div>
             </div>
          )
      }
      if (animType === CampaignAnimation.BOX) {
          return (
             <div className="h-96 flex items-center justify-center">
                 <div ref={boxRef} className={`relative w-64 h-64 ${isSpinning ? 'animate-shake' : ''}`}>
                     <div className="absolute bottom-0 w-full h-48 bg-gradient-to-br from-brand-600 to-brand-800 rounded-xl shadow-2xl flex items-center justify-center border-4 border-brand-400">
                         <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-inner"><span className="text-5xl font-black text-brand-600">L</span></div>
                     </div>
                     <div className={`absolute top-10 -left-2 w-[110%] h-16 bg-brand-500 rounded-lg shadow-lg border-b-8 border-brand-700 transition-transform origin-top ${isSpinning ? '-rotate-2' : ''}`}></div>
                 </div>
             </div>
          )
      }
      if (animType === CampaignAnimation.LOOT) {
          return (
              <div className="h-96 flex items-center justify-center perspective-1000">
                  <div ref={cardRef} className="relative w-64 h-80 transition-transform duration-1000 transform-style-3d" style={{ transform: isSpinning ? 'rotateY(180deg) scale(1.1)' : 'rotateY(0deg)' }}>
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border-4 border-brand-500 shadow-2xl backface-hidden flex flex-col items-center justify-center p-6 text-center">
                          <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-2">Loot Pack</h3>
                          <div className="w-20 h-20 bg-brand-600 rounded-full flex items-center justify-center mb-4 text-4xl">⚡</div>
                          <p className="text-brand-200 text-sm font-bold">Rare Edition</p>
                      </div>
                      <div className="absolute inset-0 w-full h-full bg-white rounded-xl border-4 border-yellow-400 shadow-[0_0_50px_rgba(250,204,21,0.5)] backface-hidden rotate-y-180 flex items-center justify-center"><div className="text-6xl animate-pulse">✨</div></div>
                  </div>
              </div>
          )
      }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center bg-slate-50 pb-20 relative">
      
      {/* Botão Voltar ao Perfil (Real Mode Only) */}
      {mode === 'real' && campaign?.creatorUsername && onNavigateToProfile && (
          <button 
              onClick={() => onNavigateToProfile(campaign.creatorUsername!)}
              className="absolute top-4 left-4 z-30 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-sm border border-slate-200 text-slate-500 hover:text-brand-600 hover:border-brand-300 transition-all group"
              title="Voltar ao Perfil do Creator"
          >
              <div className="flex items-center gap-2 px-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:-translate-x-1 transition-transform">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                  </svg>
                  <span className="text-xs font-bold hidden sm:inline">Perfil</span>
              </div>
          </button>
      )}

      {mode === 'test' && (
          <div className="w-full bg-amber-400 text-amber-950 px-4 py-3 shadow-md sticky top-16 z-40 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" /></svg><span>MODO DE SIMULAÇÃO</span></div>
              <Button size="sm" variant="secondary" onClick={onBack} className="border-amber-600/20 text-amber-900 hover:bg-amber-300">← Voltar</Button>
          </div>
      )}

      <div className="w-full bg-white border-b border-slate-200 pb-12 pt-8 mb-8 shadow-sm relative z-10">
        <div className="flex flex-col items-center justify-center">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                {campaign.title}
                {campaign.hasAdultContent && <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded border border-red-200">+18</span>}
            </h1>
            <p className="text-brand-600 font-medium bg-brand-50 px-3 py-0.5 rounded-full mt-2 text-sm">@{campaign.creatorUsername || 'creator'}</p>
        </div>
      </div>

      <div className="relative mb-16 z-10 w-full max-w-lg px-4">
         {renderAnimationArea()}

         <div className="mt-8 w-full max-w-xs mx-auto flex items-center gap-3">
            {mode === 'real' && (
                <div className="bg-brand-900 text-white rounded-lg px-4 py-2 flex flex-col items-center justify-center h-full border-2 border-brand-700 shadow-md min-w-[80px]">
                    <span className="text-[10px] font-bold uppercase text-brand-300">Aberturas</span>
                    <span className="text-2xl font-black leading-none">{userBalance}</span>
                </div>
            )}
            
            <Button 
               onClick={initiateAction} 
               disabled={isSpinning}
               fullWidth
               size="lg"
               variant={isFreeSpinPending ? 'success' : (userBalance > 0 || mode === 'test') ? 'primary' : 'secondary'}
               className={`shadow-xl ring-4 ring-white ${isSpinning ? 'opacity-90' : 'animate-bounce'} h-16 text-lg`}
            >
               {isSpinning ? 'Sorteando...' : 
                isFreeSpinPending ? 'GIRAR GRÁTIS' :
                mode === 'test' ? 'Testar Sorteio' :
                userBalance > 0 ? 'Abrir (1 Crédito)' : 
                'Comprar Giros'}
            </Button>
         </div>
         {mode === 'real' && userBalance === 0 && (
             <p className="text-center text-xs text-slate-400 mt-2 font-medium">Adquira créditos para tentar a sorte!</p>
         )}
      </div>

      {/* MODAL DE COMPRA DE CRÉDITOS */}
      {showCreditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 relative overflow-hidden">
                  {/* Background Accents */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-100 rounded-full blur-3xl"></div>
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-100 rounded-full blur-3xl"></div>

                  <h2 className="text-2xl font-bold text-center text-slate-900 mb-2 relative z-10">Adicionar Aberturas</h2>
                  <p className="text-center text-slate-500 mb-6 text-sm relative z-10">Escolha um pacote para a campanha <strong>{campaign.title}</strong></p>

                  <div className="space-y-3 relative z-10">
                      {[1, 2, 5].map(qty => {
                          const price = campaign.pricePerSpin * qty;
                          const discount = qty === 2 ? 0.05 : qty === 5 ? 0.10 : 0;
                          const finalPrice = price * (1 - discount);
                          
                          return (
                              <div 
                                key={qty} 
                                onClick={() => setSelectedPackage({spins: qty, price: finalPrice})}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center ${selectedPackage?.spins === qty ? 'border-brand-500 bg-brand-50 shadow-md scale-[1.02]' : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'}`}
                              >
                                  <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-brand-200 text-brand-700 flex items-center justify-center font-black text-lg">
                                          {qty}x
                                      </div>
                                      <div>
                                          <p className="font-bold text-slate-800">{qty} {qty === 1 ? 'Abertura' : 'Aberturas'}</p>
                                          {discount > 0 && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">ECONOMIZE {(discount*100).toFixed(0)}%</span>}
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      {discount > 0 && <p className="text-xs text-slate-400 line-through">R$ {price.toFixed(2)}</p>}
                                      <p className="font-bold text-lg text-slate-900">R$ {finalPrice.toFixed(2)}</p>
                                  </div>
                              </div>
                          )
                      })}
                  </div>

                  <div className="mt-6 flex flex-col gap-3 relative z-10">
                      <Button 
                        fullWidth 
                        size="lg" 
                        disabled={!selectedPackage} 
                        onClick={handlePurchaseCredits}
                        isLoading={isProcessingPayment}
                      >
                          {selectedPackage ? `Pagar R$ ${selectedPackage.price.toFixed(2)}` : 'Selecione um Pacote'}
                      </Button>
                      <Button variant="ghost" fullWidth onClick={() => setShowCreditModal(false)}>Cancelar</Button>
                  </div>
              </div>
          </div>
      )}

      {/* Modal de Vitória (Existing) */}
      {wonPrize && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-400 to-brand-600"></div>
               <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase">Você Ganhou!</h2>
               <div className="my-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-32 h-32 bg-slate-200 rounded-lg mx-auto mb-3 bg-cover bg-center shadow-inner flex items-center justify-center relative overflow-hidden" style={{backgroundImage: wonPrize.imageUrl ? `url(${wonPrize.imageUrl})` : undefined}}>
                      {!wonPrize.imageUrl && <div className="text-slate-400">Sem Foto</div>}
                  </div>
                  <p className="text-lg font-bold text-brand-600 leading-tight">{wonPrize.name}</p>
                  <div className="flex gap-2 justify-center mt-2">
                    <span className="text-xs font-semibold text-slate-400 border border-slate-200 px-2 py-0.5 rounded uppercase">{wonPrize.type === PrizeType.PHYSICAL ? 'Físico' : 'Digital'}</span>
                    {wonPrize.type === PrizeType.SINGLE_VIEW && <span className="text-xs font-semibold text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded uppercase">Acesso Único</span>}
                  </div>
               </div>
               <p className="text-slate-500 mb-8 text-sm leading-relaxed">{wonPrize.type === PrizeType.SINGLE_VIEW ? "Este é um conteúdo de visualização única. O link expirará após o primeiro acesso." : (wonPrize.type === PrizeType.DIGITAL ? "Link enviado para seu e-mail." : "O Creator entrará em contato.")}</p>
               <Button fullWidth onClick={() => setWonPrize(null)} className="shadow-brand-500/30">Tentar de Novo</Button>
            </div>
         </div>
      )}

      {/* Lista de Prêmios (Itens Possíveis) */}
      <div className="max-w-3xl w-full px-6">
         <h3 className="text-xl font-bold text-slate-800 mb-4">Itens Possíveis</h3>
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {campaign.prizes.map(prize => (
               <div key={prize.id} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 group relative overflow-hidden">
                  <div 
                    className={`w-16 h-16 bg-slate-100 rounded-lg bg-cover bg-center shrink-0 border border-slate-100 transition-all duration-300 ${campaign.hasAdultContent ? 'blur-sm group-hover:blur-0 cursor-pointer' : ''}`}
                    style={{backgroundImage: prize.imageUrl ? `url(${prize.imageUrl})` : undefined}}
                  >
                      {/* Se for 18+ e não tiver hover, pode colocar um icone de olho fechado ou similar, mas o blur resolve */}
                  </div>
                  
                  {/* Dica visual para +18 */}
                  {campaign.hasAdultContent && (
                      <div className="absolute top-2 left-2 w-4 h-4 bg-black/50 rounded-full flex items-center justify-center group-hover:hidden pointer-events-none z-10">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5 text-white"><path fillRule="evenodd" d="M3.25 4A2.25 2.25 0 0 0 1 6.25v7.5A2.25 2.25 0 0 0 3.25 16h7.5A2.25 2.25 0 0 0 13 13.75v-7.5A2.25 2.25 0 0 0 10.75 4h-7.5ZM19 4.75a.75.75 0 0 0-1.28-.53l-3 3a.75.75 0 0 0-.22.53v4.5c0 .199.079.39.22.53l3 3a.75.75 0 0 0 1.28-.53V4.75Z" clipRule="evenodd" /></svg>
                      </div>
                  )}

                  <div className="flex-1 min-w-0">
                     <p className="text-slate-900 font-semibold truncate">{prize.name}</p>
                     <p className="text-xs text-slate-500 font-medium">Chance: {prize.probability}%</p>
                  </div>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
};
