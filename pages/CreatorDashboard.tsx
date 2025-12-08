
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Campaign, Prize, PrizeType, Transaction, SocialLinks, PersonalData, CampaignAnimation, DeliveryStatus, SupportTicket, TicketStatus } from '../types';
import { dbService } from '../services/mockService';
import { Button } from '../components/Button';
import { ProbabilityBar } from '../components/ProbabilityBar';
import { useToast } from '../components/Toast'; 
import { ChatComponent } from '../components/ChatComponent';

const BASE_DOMAIN = "lootfan.vercel.app/c/";

type DashboardTab = 'overview' | 'editor' | 'delivery' | 'support' | 'profile' | 'personal-data';

interface CreatorDashboardProps {
  user: User;
  activeTab: DashboardTab; 
  onTabChange: (tab: DashboardTab) => void;
  onTestCampaign?: (slug: string) => void;
  onViewProfile?: (username: string) => void;
}

export const CreatorDashboard: React.FC<CreatorDashboardProps> = ({ user, activeTab, onTabChange, onTestCampaign, onViewProfile }) => {
  const toast = useToast();
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  // Removed separate state for deliveries, derived from transactions
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecalculatingHealth, setIsRecalculatingHealth] = useState(false);

  // Delivery Modal
  const [selectedDelivery, setSelectedDelivery] = useState<Transaction | null>(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>(DeliveryStatus.PENDING);

  // Support Modal
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const campaignCoverInputRef = useRef<HTMLInputElement>(null);
  const prizeFileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Modal States
  const [isCampaignModalOpen, setCampaignModalOpen] = useState(false);
  
  // New Campaign Form State
  const [newCampTitle, setNewCampTitle] = useState('');
  const [newCampSlug, setNewCampSlug] = useState('');
  const [newCampPrice, setNewCampPrice] = useState(29.90);

  // Profile Form State
  const [profileForm, setProfileForm] = useState<{
      name: string;
      username: string;
      bio: string;
      avatarUrl: string;
      socialLinks: SocialLinks;
  }>({
      name: '',
      username: '',
      bio: '',
      avatarUrl: '',
      socialLinks: { instagram: '', twitter: '', website: '' }
  });

  // Personal Data Form State
  const [personalForm, setPersonalForm] = useState<PersonalData>({
      fullName: '',
      cpf: '',
      birthDate: '',
      phoneNumber: '',
      address: {
          zipCode: '',
          street: '',
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          state: ''
      },
      isCompany: false,
      company: {
          cnpj: '',
          legalName: '',
          tradeName: ''
      }
  });

  const loadData = async () => {
    setLoading(true);
    try {
        // Parallel fetching to speed up load
        const [campData, transData, ticketData] = await Promise.all([
            dbService.getCampaignsByCreator(user.id),
            dbService.getTransactions(user.id), // Optimized single query
            dbService.getTicketsByCreator(user.id)
        ]);

        setCampaigns(campData);
        setTransactions(transData);
        setTickets(ticketData);
        // Deliveries are derived from transData now
        
        if (campData.length > 0) {
            if (!selectedCampaignId || !campData.find(c => c.id === selectedCampaignId)) {
                setSelectedCampaignId(campData[0].id);
            }
        } else {
            setSelectedCampaignId('');
        }

        setProfileForm({
            name: user.name || '',
            username: user.username || '',
            bio: user.bio || '',
            avatarUrl: user.avatarUrl || '',
            socialLinks: user.socialLinks || { instagram: '', twitter: '', website: '' }
        });

        if (user.personalData) {
            setPersonalForm({
                fullName: user.personalData.fullName || '',
                cpf: user.personalData.cpf || '',
                birthDate: user.personalData.birthDate || '',
                phoneNumber: user.personalData.phoneNumber || '',
                address: {
                    zipCode: user.personalData.address?.zipCode || '',
                    street: user.personalData.address?.street || '',
                    number: user.personalData.address?.number || '',
                    complement: user.personalData.address?.complement || '',
                    neighborhood: user.personalData.address?.neighborhood || '',
                    city: user.personalData.address?.city || '',
                    state: user.personalData.address?.state || ''
                },
                isCompany: user.personalData.isCompany || false,
                company: user.personalData.company || {
                    cnpj: '',
                    legalName: '',
                    tradeName: ''
                }
            });
        }
    } catch (e) {
        console.error("Erro ao carregar dados", e);
        toast.error("Erro ao carregar dados. Tente atualizar a página.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user.id]);

  // Memoize active campaign to avoid re-scans on every render
  const activeCampaign = useMemo(() => 
      campaigns.find(c => c.id === selectedCampaignId), 
  [campaigns, selectedCampaignId]);

  // Derive Deliveries from Transactions (Memoized)
  // This avoids a separate API call
  const deliveries = useMemo(() => 
      transactions.filter(t => t.prizeType === PrizeType.PHYSICAL),
  [transactions]);

  // Memoize filtered deliveries by campaign
  const filteredDeliveries = useMemo(() => 
      deliveries.filter(d => d.campaignId === selectedCampaignId), 
  [deliveries, selectedCampaignId]);

  const getCampaignUrl = (slug: string) => {
      const username = profileForm.username || 'usuario';
      return `${BASE_DOMAIN}${username}/${slug}`;
  }

  // --- ACTIONS ---

  const openNewCampaignModal = () => {
      if (!profileForm.username) {
          toast.error("Você precisa definir um nome de usuário em 'Meu Perfil' antes de criar campanhas.");
          onTabChange('profile');
          return;
      }
      setNewCampTitle('');
      setNewCampSlug('');
      setNewCampPrice(29.90);
      setCampaignModalOpen(true);
  }

  const handleTestClick = () => {
      if (activeCampaign && onTestCampaign) {
          onTestCampaign(activeCampaign.slug);
      }
  }

  const handleViewProfileClick = () => {
      if (profileForm.username && onViewProfile) {
          onViewProfile(profileForm.username);
      } else {
          toast.error("Salve um nome de usuário primeiro.");
      }
  }

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!newCampTitle || !newCampSlug) {
        toast.error("Preencha todos os campos");
        return;
    }
    
    setIsSaving(true);
    try {
        const newCamp = await dbService.createCampaign(user.id, newCampTitle, newCampSlug, newCampPrice);
        if (newCamp) {
            setCampaigns([newCamp, ...campaigns]);
            setSelectedCampaignId(newCamp.id);
            setCampaignModalOpen(false);
            toast.success("Campanha criada com sucesso!");
            onTabChange('editor'); 
        }
    } catch (e) {
        toast.error("Erro ao criar campanha. Verifique se o slug já existe.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!activeCampaign) return;
    if (!window.confirm(`Tem certeza que deseja excluir "${activeCampaign.title}"? Esta ação é irreversível e excluirá todos os prêmios.`)) return;
    
    setIsSaving(true);
    try {
        await dbService.deleteCampaign(activeCampaign.id);
        toast.success("Campanha removida.");
        await loadData(); 
    } catch (e) {
        toast.error("Erro ao excluir campanha.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!activeCampaign) return;
    
    const totalProb = activeCampaign.prizes.reduce((acc, curr) => acc + Number(curr.probability), 0);
    if (Math.abs(totalProb - 100) > 0.1) {
       toast.error(`A soma das probabilidades deve ser 100%. Atual: ${totalProb.toFixed(1)}%`);
       return;
    }

    setIsSaving(true);
    try {
        await dbService.saveCampaign(activeCampaign);
        toast.success("Alterações salvas com sucesso!");
        await loadData(); 
    } catch (e) {
        toast.error("Erro ao salvar alterações.");
        console.error(e);
    } finally {
        setIsSaving(false);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
        const file = event.target.files[0];
        setIsUploading(true);
        try {
            const publicUrl = await dbService.uploadAvatar(file, user.id);
            setProfileForm(prev => ({ ...prev, avatarUrl: publicUrl }));
            toast.success("Upload concluído!");
        } catch (error: any) {
            toast.error(error.message || "Erro ao fazer upload da imagem.");
        } finally {
            setIsUploading(false);
        }
    }
  };

  const handleCampaignCoverChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!activeCampaign) return;
      if (event.target.files && event.target.files.length > 0) {
          const file = event.target.files[0];
          try {
              toast.info("Enviando capa...");
              const publicUrl = await dbService.uploadCampaignImage(file, user.id);
              handleCampaignConfigUpdate('coverImageUrl', publicUrl);
              toast.success("Capa da campanha atualizada!");
          } catch (error: any) {
              toast.error(error.message || "Falha no upload da capa.");
          }
      }
  }

  const handlePrizeImageChange = async (event: React.ChangeEvent<HTMLInputElement>, prizeIndex: number) => {
    if (event.target.files && event.target.files.length > 0) {
        const file = event.target.files[0];
        try {
            toast.info("Enviando imagem...");
            const publicUrl = await dbService.uploadPrizeImage(file, user.id);
            handlePrizeUpdate(prizeIndex, 'imageUrl', publicUrl);
            toast.success("Imagem do produto atualizada!");
        } catch (error: any) {
            toast.error(error.message || "Falha no upload.");
        }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const usernameRegex = /^[a-zA-Z0-9]+$/;
    if (!usernameRegex.test(profileForm.username)) {
        toast.error("O usuário deve conter apenas letras e números, sem espaços ou caracteres especiais.");
        return;
    }

    setIsSaving(true);
    try {
        await dbService.updateUserProfile(user.id, {
            name: profileForm.name,
            username: profileForm.username,
            bio: profileForm.bio,
            avatarUrl: profileForm.avatarUrl,
            socialLinks: profileForm.socialLinks
        });
        toast.success("Perfil atualizado com sucesso!");
    } catch (e: any) {
        if (e.message?.includes('unique constraint')) {
            toast.error("Este nome de usuário já está em uso. Por favor, escolha outro.");
        } else {
            toast.error("Erro ao atualizar perfil: " + e.message);
        }
    } finally {
        setIsSaving(false);
    }
  };

  const handleSavePersonalData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (personalForm.cpf.length < 11) {
        toast.error("CPF inválido.");
        return;
    }
    if (personalForm.isCompany) {
        if (!personalForm.company?.cnpj || personalForm.company.cnpj.length < 14) {
             toast.error("CNPJ inválido ou não preenchido.");
             return;
        }
        if (!personalForm.company?.legalName) {
            toast.error("Razão Social é obrigatória para PJ.");
            return;
        }
    }

    setIsSaving(true);
    try {
        await dbService.updateUserProfile(user.id, {
            personalData: personalForm
        });
        toast.success("Dados fiscais salvos com segurança.");
    } catch (e: any) {
        toast.error("Erro ao salvar dados pessoais: " + e.message);
    } finally {
        setIsSaving(false);
    }
  }

  const handleRefreshHealth = () => {
      setIsRecalculatingHealth(true);
      setTimeout(() => {
          setIsRecalculatingHealth(false);
          toast.info("Indicadores financeiros recalculados.");
      }, 600);
  };

  // --- DELIVERY ACTIONS ---

  const handleManageDelivery = (transaction: Transaction) => {
      setSelectedDelivery(transaction);
      setTrackingCode(transaction.trackingCode || '');
      setTrackingUrl(transaction.trackingUrl || '');
      setDeliveryStatus(transaction.deliveryStatus || DeliveryStatus.PENDING);
      setIsDeliveryModalOpen(true);
  }

  const handleSaveDelivery = async () => {
      if (!selectedDelivery) return;
      setIsSaving(true);
      try {
          await dbService.updateDelivery(selectedDelivery.id, deliveryStatus, trackingCode, trackingUrl);
          toast.success("Entrega atualizada!");
          setIsDeliveryModalOpen(false);
          loadData();
      } catch (e) {
          toast.error("Erro ao atualizar entrega.");
      } finally {
          setIsSaving(false);
      }
  }

  // --- SUPPORT ACTIONS ---
  
  const handleManageTicket = (ticket: SupportTicket) => {
      setSelectedTicket(ticket);
      setIsTicketModalOpen(true);
  }

  const handleTicketStatusChange = async (newStatus: TicketStatus) => {
      if(!selectedTicket) return;
      try {
          await dbService.updateTicketStatus(selectedTicket.id, newStatus);
          setSelectedTicket({...selectedTicket, status: newStatus});
          toast.success("Status do chamado atualizado.");
          loadData();
      } catch (e) {
          toast.error("Erro ao atualizar status.");
      }
  }

  // --- PRIZE ACTIONS ---

  const handleAddPrize = () => {
    if (!activeCampaign) return;
    
    const newPrize: Prize = {
        id: `temp-${Date.now()}`,
        name: 'Novo Produto Surpresa',
        type: PrizeType.DIGITAL,
        description: '',
        stock: -1,
        probability: 0,
        perceivedValue: 0,
        costPrice: 0,
        imageUrl: ''
    };

    const updatedCampaign = {
        ...activeCampaign,
        prizes: [...activeCampaign.prizes, newPrize]
    };
    
    setCampaigns(campaigns.map(c => c.id === activeCampaign.id ? updatedCampaign : c));
  };

  const handleDeletePrize = async (prizeId: string) => {
    if (!activeCampaign) return;
    if (!window.confirm("Remover este prêmio?")) return;

    try {
        await dbService.deletePrize(prizeId);
    } catch (e) {
        console.error("Erro ao deletar do banco", e);
    }

    const updatedPrizes = activeCampaign.prizes.filter(p => p.id !== prizeId);
    const updatedCampaign = { ...activeCampaign, prizes: updatedPrizes };
    setCampaigns(campaigns.map(c => c.id === activeCampaign.id ? updatedCampaign : c));
  };

  const handlePrizeUpdate = (index: number, field: keyof Prize, value: any) => {
    if (!activeCampaign) return;
    const newPrizes = [...activeCampaign.prizes];
    newPrizes[index] = { ...newPrizes[index], [field]: value };
    
    const updatedCampaign = { ...activeCampaign, prizes: newPrizes };
    setCampaigns(campaigns.map(c => c.id === activeCampaign.id ? updatedCampaign : c));
  };

  const handleCampaignConfigUpdate = (field: keyof Campaign, value: any) => {
      if (!activeCampaign) return;
      const updatedCampaign = { ...activeCampaign, [field]: value };
      setCampaigns(campaigns.map(c => c.id === activeCampaign.id ? updatedCampaign : c));
  }

  const copyLink = () => {
     if(activeCampaign) {
         navigator.clipboard.writeText(getCampaignUrl(activeCampaign.slug));
         toast.success("Link copiado para a área de transferência!");
     }
  }

  const totalProb = useMemo(() => 
      activeCampaign?.prizes.reduce((acc, curr) => acc + Number(curr.probability), 0) || 0,
  [activeCampaign?.prizes]);

  // UseMemo for Heavy Financial Calculations to prevent lag on inputs
  const financialStats = useMemo(() => {
    if (!activeCampaign) return null;

    const spinPrice = activeCampaign.pricePerSpin;
    const platformFee = 0.10; 
    const netRevenuePerSpin = spinPrice * (1 - platformFee);

    let expectedCost = 0;
    let highestCostFactorItem = { name: '', factor: 0, cost: 0, prob: 0 };

    activeCampaign.prizes.forEach(p => {
        const cost = p.type === PrizeType.PHYSICAL ? (p.costPrice || 0) : 0;
        const probDecimal = p.probability / 100;
        const factor = cost * probDecimal;
        expectedCost += factor;

        if (factor > highestCostFactorItem.factor) {
            highestCostFactorItem = { name: p.name, factor, cost, prob: p.probability };
        }
    });

    const expectedProfit = netRevenuePerSpin - expectedCost;
    const margin = spinPrice > 0 ? (expectedProfit / spinPrice) * 100 : 0;
    const isHealthy = expectedProfit > 0;

    return { netRevenuePerSpin, expectedCost, expectedProfit, margin, isHealthy, highestCostFactorItem };
  }, [activeCampaign?.prizes, activeCampaign?.pricePerSpin]);

  // UseMemo for Prize Performance
  const performanceStats = useMemo(() => {
    if (!activeCampaign) return null;
    const campaignTrans = transactions.filter(t => t.campaignId === activeCampaign.id);
    const totalWins = campaignTrans.length;
    let totalRealizedCost = 0;
    
    const prizeStats = activeCampaign.prizes.map(prize => {
        const winsCount = campaignTrans.filter(t => t.prizeWon === prize.name).length;
        const percentage = totalWins > 0 ? (winsCount / totalWins) * 100 : 0;
        const unitCost = prize.costPrice || 0;
        const totalPrizeCost = winsCount * unitCost;
        totalRealizedCost += totalPrizeCost;
        return { ...prize, winsCount, percentage, totalPrizeCost };
    }).sort((a, b) => b.winsCount - a.winsCount);

    const totalRealizedRevenue = activeCampaign.totalRevenue;
    const platformFeeRate = user.commissionRate || 0.10;
    const totalPlatformFees = totalRealizedRevenue * platformFeeRate;
    const netProfitRealized = totalRealizedRevenue - totalRealizedCost - totalPlatformFees;
    const roiMargin = totalRealizedRevenue > 0 ? (netProfitRealized / totalRealizedRevenue) * 100 : 0;
    const isProfitable = netProfitRealized >= 0;

    return { totalRealizedRevenue, totalRealizedCost, totalPlatformFees, netProfitRealized, roiMargin, isProfitable, prizeStats };
  }, [transactions, activeCampaign, user.commissionRate]);

  const renderFinancialHealth = () => {
      if (!financialStats) return null;
      const { netRevenuePerSpin, expectedCost, expectedProfit, margin, isHealthy, highestCostFactorItem } = financialStats;

      let suggestionMsg = null;
      if (!isHealthy && highestCostFactorItem.cost > 0) {
          const otherCosts = expectedCost - highestCostFactorItem.factor;
          const maxProbDecimal = (netRevenuePerSpin - otherCosts) / highestCostFactorItem.cost;
          const maxProbPercent = Math.floor(maxProbDecimal * 100 * 10) / 10; 

          if (maxProbPercent < 0) {
             suggestionMsg = "O custo de outros itens já excede a receita. Revise todos os custos.";
          } else {
             suggestionMsg = `Reduza a chance de "${highestCostFactorItem.name}" para no máximo ${maxProbPercent}% para evitar prejuízo.`;
          }
      }

      return (
          <div className={`mt-6 p-6 rounded-xl border transition-colors duration-300 ${isHealthy ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${isHealthy ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                      {isHealthy ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.519l2.74-1.22m0 0-5.94-2.28m5.94 2.28-2.28 5.941" /></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181" /></svg>
                      )}
                  </div>
                  <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-bold text-lg ${isHealthy ? 'text-emerald-900' : 'text-red-900'}`}>
                            {isRecalculatingHealth ? 'Recalculando...' : (isHealthy ? 'Saúde Financeira: Saudável' : 'Alerta de Prejuízo Estimado')}
                        </h3>
                        <button onClick={handleRefreshHealth} className={`p-1.5 rounded-full hover:bg-black/5 text-slate-500 transition-all ${isRecalculatingHealth ? 'animate-spin text-brand-600' : ''}`} title="Recalcular"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg></button>
                      </div>
                  </div>
              </div>
              {isRecalculatingHealth ? (
                  <div className="py-8 text-center text-slate-500 text-sm font-medium animate-pulse">Atualizando indicadores financeiros...</div>
              ) : (
                <div className="animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-white/60 p-3 rounded-lg"><p className="text-xs text-slate-500 uppercase font-bold">Receita Líquida / Giro</p><p className="text-lg font-bold text-slate-900">R$ {netRevenuePerSpin.toFixed(2)}</p></div>
                        <div className="bg-white/60 p-3 rounded-lg"><p className="text-xs text-slate-500 uppercase font-bold">Custo Médio Esperado</p><p className="text-lg font-bold text-slate-900">R$ {expectedCost.toFixed(2)}</p></div>
                        <div className="bg-white/60 p-3 rounded-lg"><p className="text-xs text-slate-500 uppercase font-bold">Lucro Projetado / Giro</p><p className={`text-lg font-bold ${isHealthy ? 'text-emerald-600' : 'text-red-600'}`}>R$ {expectedProfit.toFixed(2)} ({margin.toFixed(1)}%)</p></div>
                    </div>
                    {!isHealthy && suggestionMsg && (
                        <div className="bg-red-100 text-red-800 p-3 rounded-lg text-sm font-medium border border-red-200 flex items-start gap-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.45l.75-.45a4.5 4.5 0 0 0 1.338-3.977 4.5 4.5 0 0 0-3.588 3.588M12 13.5v-5.25m0 0a6.01 6.01 0 0 1-1.5-.45l-.75-.45a4.5 4.5 0 0 1-1.338-3.977 4.5 4.5 0 0 1 3.588 3.588" /></svg><span><strong>Sugestão Matemática:</strong> {suggestionMsg}</span></div>
                    )}
                </div>
              )}
          </div>
      )
  }

  const renderPrizePerformance = () => {
    if (!performanceStats) return null;
    const { totalRealizedRevenue, totalRealizedCost, totalPlatformFees, netProfitRealized, roiMargin, isProfitable, prizeStats } = performanceStats;

    return (
        <div className="mt-8">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-brand-600"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" /></svg>Desempenho dos Prêmios & ROI</h3>
            <div className={`p-6 rounded-xl border mb-6 ${isProfitable ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                     <div><p className="text-xs text-slate-500 font-bold uppercase">Receita Realizada</p><p className="text-xl font-bold text-slate-900">R$ {totalRealizedRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div>
                     <div><p className="text-xs text-slate-500 font-bold uppercase">Custo Entregue</p><p className="text-xl font-bold text-slate-900">R$ {totalRealizedCost.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p><p className="text-[10px] text-slate-500">Baseado no custo de produção informado</p></div>
                     <div><p className="text-xs text-slate-500 font-bold uppercase">Taxas Deduzidas ({(Number(user.commissionRate || 0.10) * 100).toFixed(0)}%)</p><p className="text-xl font-bold text-slate-500">R$ {totalPlatformFees.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div>
                     <div><p className="text-xs text-slate-500 font-bold uppercase">Lucro Líquido Real</p><p className={`text-xl font-bold ${isProfitable ? 'text-emerald-700' : 'text-red-700'}`}>R$ {netProfitRealized.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div>
                     <div className="flex flex-col justify-center"><span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold border ${isProfitable ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>{roiMargin.toFixed(1)}% Margem</span></div>
                </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left"><thead className="bg-slate-50 text-slate-700 text-xs uppercase font-bold"><tr><th className="py-3 px-4">Produto</th><th className="py-3 px-4 text-center">Qtd. Entregue</th><th className="py-3 px-4 w-1/3">Proporção (Vendas)</th><th className="py-3 px-4 text-right">Custo Total</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">{prizeStats.map(stat => (<tr key={stat.id} className="hover:bg-slate-50"><td className="py-3 px-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex-shrink-0 overflow-hidden">{stat.imageUrl ? (<img src={stat.imageUrl} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">IMG</div>)}</div><span className="font-medium text-slate-900 text-sm">{stat.name}</span></div></td><td className="py-3 px-4 text-center font-bold text-slate-700">{stat.winsCount}</td><td className="py-3 px-4"><div className="flex items-center gap-2"><div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-brand-500 rounded-full" style={{width: `${stat.percentage}%`}}></div></div><span className="text-xs font-bold text-brand-600 w-12 text-right">{stat.percentage.toFixed(1)}%</span></div></td><td className="py-3 px-4 text-right text-sm font-medium text-slate-600">{stat.totalPrizeCost > 0 ? `R$ ${stat.totalPrizeCost.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '-'}</td></tr>))}{prizeStats.length === 0 && (<tr><td colSpan={4} className="py-8 text-center text-slate-400 text-sm">Nenhuma venda registrada ainda.</td></tr>)}</tbody></table>
            </div>
        </div>
    );
  }

  if (loading) return <div className="p-8 text-center text-brand-600">Carregando Dashboard...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Painel do Creator</h1>
          <p className="text-slate-500 mt-1">Gerencie suas campanhas, prêmios e acompanhe seus lucros.</p>
        </div>
        <div className="flex gap-3">
             <div className="relative">
                 <select 
                   value={selectedCampaignId}
                   onChange={(e) => {
                       if(e.target.value === 'new') {
                           openNewCampaignModal();
                       } else {
                           setSelectedCampaignId(e.target.value);
                       }
                   }}
                   className="appearance-none bg-white border border-slate-300 text-slate-900 py-2.5 pl-4 pr-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                 >
                     {campaigns.length === 0 ? <option value="">Nenhuma Campanha</option> : null}
                     {campaigns.map(c => (
                         <option key={c.id} value={c.id}>{c.title}</option>
                     ))}
                     <option value="new" className="text-brand-600 font-bold">+ Nova Campanha</option>
                 </select>
                 <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                 </div>
             </div>

             {activeCampaign && (
                <>
                    <Button variant="secondary" onClick={handleTestClick} className="shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" /></svg>
                        Testar
                    </Button>
                    <Button variant="ghost" onClick={copyLink} title="Copiar Link da Campanha">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg>
                    </Button>
                </>
             )}
        </div>
      </div>

      {/* TABS */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {[
            { id: 'overview', label: 'Visão Geral', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg> },
            { id: 'editor', label: 'Editor', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.635m0 0a15.998 15.998 0 0 0-1.677.477 15.999 15.999 0 0 0-3.478 3.478 15.999 15.999 0 0 0 .48 1.678m2.24 7.24a2.25 2.25 0 0 1 2.25-2.25 4.5 4.5 0 0 0 2.25-2.25 2.25 2.25 0 0 1 4.5 0 4.5 4.5 0 0 0 4.5 4.5 2.25 2.25 0 0 1 2.25 2.25 2.25 2.25 0 0 1-2.25 2.25H15.75A2.25 2.25 0 0 1 13.5 18.75v-2.25Z" /></svg> },
            { id: 'delivery', label: 'Entregas', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg> },
            { id: 'support', label: 'Suporte', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" /></svg> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as DashboardTab)}
              className={`
                whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* OVERVIEW TAB */}
      {activeCampaign && activeTab === 'overview' && (
        <div className="animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-brand-50 rounded-lg text-brand-600"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg></div>
                        <h3 className="text-sm font-medium text-slate-500">Receita Bruta</h3>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">R$ {activeCampaign.totalRevenue.toFixed(2)}</p>
                    <p className="text-xs text-emerald-600 font-medium flex items-center mt-1">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                        +0% esta semana
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                         <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59" /></svg></div>
                        <h3 className="text-sm font-medium text-slate-500">Total de Giros</h3>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{activeCampaign.totalSpins}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm md:col-span-2">
                    <div className="flex items-center gap-3 mb-2">
                         <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg></div>
                        <h3 className="text-sm font-medium text-slate-500">Link da Campanha</h3>
                    </div>
                    <div className="flex gap-2">
                        <code className="flex-1 bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm text-slate-600 truncate font-mono">
                            {getCampaignUrl(activeCampaign.slug)}
                        </code>
                        <Button onClick={copyLink} size="sm">Copiar</Button>
                    </div>
                </div>
            </div>

            {renderPrizePerformance()}

            <h3 className="text-lg font-bold text-slate-900 mb-4 mt-8">Últimas Vendas</h3>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-bold">
                        <tr>
                            <th className="py-3 px-6">Data</th>
                            <th className="py-3 px-6">Fã</th>
                            <th className="py-3 px-6">Prêmio</th>
                            <th className="py-3 px-6 text-right">Valor Líquido</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {transactions.filter(t => t.campaignId === activeCampaign.id).slice(0, 5).map(t => (
                            <tr key={t.id} className="hover:bg-slate-50">
                                <td className="py-3 px-6 text-sm text-slate-500">{new Date(t.date).toLocaleDateString()}</td>
                                <td className="py-3 px-6 text-sm font-medium text-slate-900">{t.fanName}</td>
                                <td className="py-3 px-6 text-sm text-slate-600">{t.prizeWon}</td>
                                <td className="py-3 px-6 text-sm font-bold text-emerald-600 text-right">+ R$ {t.creatorNet.toFixed(2)}</td>
                            </tr>
                        ))}
                         {transactions.filter(t => t.campaignId === activeCampaign.id).length === 0 && (
                            <tr><td colSpan={4} className="py-8 text-center text-slate-400 text-sm">Nenhuma venda recente.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* EDITOR TAB */}
      {activeCampaign && activeTab === 'editor' && (
      <div className="animate-in fade-in duration-300">
          {/* --- CAPA DA CAMPANHA --- */}
          <div className="mb-6 group relative h-48 w-full rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 overflow-hidden hover:border-brand-400 transition-colors cursor-pointer" onClick={() => campaignCoverInputRef.current?.click()}>
             {activeCampaign.coverImageUrl ? (
                            <>
                                <img src={activeCampaign.coverImageUrl} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white font-bold flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                                        Alterar Capa da Campanha
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mb-2"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                                <span className="text-sm font-medium">Clique para enviar uma capa para esta campanha</span>
                            </div>
                        )}
              <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  ref={campaignCoverInputRef}
                  onChange={handleCampaignCoverChange}
              />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 pb-6 border-b border-slate-100 bg-slate-50 p-4 rounded-xl items-end">
              <div className="col-span-1 md:col-span-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Título</label>
                  <input type="text" className="w-full bg-white border border-slate-200 rounded p-1.5" value={activeCampaign.title} onChange={e => handleCampaignConfigUpdate('title', e.target.value)} />
              </div>
              <div className="col-span-1 md:col-span-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Slug</label>
                  <input type="text" className="w-full bg-white border border-slate-200 rounded p-1.5" value={activeCampaign.slug} onChange={e => handleCampaignConfigUpdate('slug', e.target.value)} />
              </div>
              <div className="col-span-1 md:col-span-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Preço (R$)</label>
                  <input type="number" className="w-full bg-white border border-slate-200 rounded p-1.5" value={activeCampaign.pricePerSpin} onChange={e => handleCampaignConfigUpdate('pricePerSpin', parseFloat(e.target.value))} />
              </div>
              <div className="col-span-1 md:col-span-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Estilo de Animação</label>
                  <select 
                      className="w-full bg-white border border-slate-200 rounded p-1.5 text-sm font-medium text-slate-700"
                      value={activeCampaign.animationType}
                      onChange={e => handleCampaignConfigUpdate('animationType', e.target.value)}
                  >
                      <option value={CampaignAnimation.WHEEL}>🎡 Roleta Clássica</option>
                      <option value={CampaignAnimation.BOX}>📦 Caixa Surpresa</option>
                      <option value={CampaignAnimation.LOOT}>🃏 Loot Pack (Cards)</option>
                      <option value={CampaignAnimation.MACHINE}>🎰 Máquina (Slot)</option>
                  </select>
              </div>
              {/* TOGGLE ATIVO / INATIVO */}
              <div className="col-span-1 md:col-span-1 flex flex-col justify-end">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2">Status</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={activeCampaign.isActive}
                          onChange={(e) => handleCampaignConfigUpdate('isActive', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                      <span className="ml-2 text-sm font-medium text-slate-700">
                          {activeCampaign.isActive ? 'Publicada' : 'Rascunho'}
                      </span>
                  </label>
              </div>
          </div>

          {/* CONFIGURAÇÃO +18 */}
          <div className="mb-6 p-4 rounded-xl border border-yellow-200 bg-yellow-50 flex flex-col md:flex-row items-center gap-4">
               <div className="flex-1">
                   <h4 className="text-sm font-bold text-yellow-800 flex items-center gap-2">
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                       Conteúdo Sensível / Adulto (+18)
                   </h4>
                   <p className="text-xs text-yellow-700 mt-1 text-justify">
                       A LootFan respeita e apoia todos os nichos de creators. Ao marcar esta opção, sua campanha exibirá um aviso de "Conteúdo +18" antes do fã acessar, garantindo transparência, proteção aos menores e segurança jurídica para sua conta.
                   </p>
               </div>
               <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-yellow-200 shadow-sm">
                   <input 
                      type="checkbox" 
                      id="adultContent"
                      className="w-5 h-5 text-red-600 rounded focus:ring-red-500 accent-red-600 cursor-pointer"
                      checked={activeCampaign.hasAdultContent || false}
                      onChange={(e) => handleCampaignConfigUpdate('hasAdultContent', e.target.checked)}
                   />
                   <label htmlFor="adultContent" className="font-bold text-slate-700 text-sm cursor-pointer select-none">
                       Esta campanha contém material +18
                   </label>
               </div>
          </div>

          <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-900">Produtos & Probabilidades</h2>
              <Button size="sm" onClick={handleSaveChanges} isLoading={isSaving}>Salvar Alterações</Button>
          </div>

           {/* TABLE OF PRIZES */}
           <div className="overflow-x-auto rounded-lg border border-slate-200 mb-6 shadow-sm">
           <table className="w-full text-left border-collapse">
               <thead className="bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider">
               <tr>
                   <th className="py-3 px-4 w-16">Foto</th>
                   <th className="py-3 px-4">Nome do Produto</th>
                   <th className="py-3 px-4">Tipo</th>
                   <th className="py-3 px-4">Estoque</th>
                   {activeCampaign.prizes.some(p => p.type === PrizeType.PHYSICAL) && <th className="py-3 px-4">Custo (R$)</th>}
                   <th className="py-3 px-4">Chance (%)</th>
                   <th className="py-3 px-4 w-10"></th>
               </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
               {activeCampaign.prizes.map((prize, idx) => (
                   <tr key={prize.id} className="bg-white hover:bg-slate-50 transition-colors group">
                   <td className="p-2 text-center">
                       <div className="w-10 h-10 bg-slate-100 rounded-md border border-slate-200 overflow-hidden relative group/img cursor-pointer" onClick={() => prizeFileInputRefs.current[prize.id]?.click()}>
                           {prize.imageUrl ? (
                               <img src={prize.imageUrl} className="w-full h-full object-cover" loading="lazy" />
                           ) : (
                               <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">IMG</div>
                           )}
                           <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center">
                               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                           </div>
                       </div>
                       <input 
                           type="file" 
                           className="hidden" 
                           accept="image/*"
                           ref={(el) => prizeFileInputRefs.current[prize.id] = el}
                           onChange={(e) => handlePrizeImageChange(e, idx)}
                       />
                   </td>
                   <td className="p-2">
                       <input type="text" value={prize.name} onChange={(e) => handlePrizeUpdate(idx, 'name', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 font-medium text-sm" placeholder="Nome do item" />
                       <input type="text" value={prize.description} onChange={(e) => handlePrizeUpdate(idx, 'description', e.target.value)} className="w-full text-xs text-slate-500 bg-transparent border-none focus:ring-0 mt-1" placeholder={prize.type === PrizeType.DIGITAL || prize.type === PrizeType.SINGLE_VIEW ? "Link do conteúdo" : "Descrição física"} />
                   </td>
                   <td className="p-2">
                       <select value={prize.type} onChange={(e) => handlePrizeUpdate(idx, 'type', e.target.value)} className="bg-transparent text-xs border border-slate-200 rounded p-1 text-slate-600">
                           <option value={PrizeType.DIGITAL}>Digital</option>
                           <option value={PrizeType.PHYSICAL}>Físico</option>
                           <option value={PrizeType.SINGLE_VIEW}>Visualização Única</option>
                       </select>
                   </td>
                   <td className="p-2">
                       <input type="number" value={prize.stock} onChange={(e) => handlePrizeUpdate(idx, 'stock', parseInt(e.target.value))} className="w-16 bg-white border border-slate-300 rounded px-2 py-1 text-center text-sm" />
                   </td>
                   {activeCampaign.prizes.some(p => p.type === PrizeType.PHYSICAL) && (
                        <td className="p-2">
                            {prize.type === PrizeType.PHYSICAL ? (
                                <input type="number" value={prize.costPrice || 0} onChange={(e) => handlePrizeUpdate(idx, 'costPrice', parseFloat(e.target.value))} className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-center text-sm" />
                            ) : (
                                <span className="text-slate-300 text-xs block text-center">-</span>
                            )}
                        </td>
                   )}
                   <td className="p-2">
                       <div className="flex items-center gap-1">
                           <input type="number" value={prize.probability} onChange={(e) => handlePrizeUpdate(idx, 'probability', parseFloat(e.target.value))} className="w-16 font-bold text-brand-600 bg-white border border-slate-300 rounded px-2 py-1 text-center text-sm" />
                           <span className="text-slate-400 text-xs">%</span>
                       </div>
                   </td>
                   <td className="p-2 text-center">
                       <button onClick={() => handleDeletePrize(prize.id)} className="text-slate-300 hover:text-red-500 p-1">
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                       </button>
                   </td>
                   </tr>
               ))}
               </tbody>
           </table>
           </div>
           
           <div className="flex flex-col gap-4">
               <Button variant="secondary" size="sm" onClick={handleAddPrize} className="self-start text-brand-600 border-brand-200 border-dashed hover:bg-brand-50 w-full sm:w-auto justify-center">
                   + Adicionar Produto
               </Button>
               <ProbabilityBar currentTotal={totalProb} />
               {renderFinancialHealth()}
           </div>
      </div>
      )}

      {/* DELIVERY TAB */}
      {activeCampaign && activeTab === 'delivery' && (
          <div className="animate-in fade-in duration-300">
               <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                      <h3 className="font-bold text-slate-700">Entregas da Campanha: {activeCampaign.title}</h3>
                      <span className="text-xs font-medium bg-slate-200 px-2 py-1 rounded text-slate-600">{filteredDeliveries.length} Itens</span>
                  </div>
                  <table className="w-full text-left">
                     <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-bold">
                         <tr>
                             <th className="py-3 px-4">Data</th>
                             <th className="py-3 px-4">Fã</th>
                             <th className="py-3 px-4">Produto</th>
                             <th className="py-3 px-4">Status</th>
                             <th className="py-3 px-4 text-right">Ação</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                         {filteredDeliveries.map(t => (
                             <tr key={t.id} className="hover:bg-slate-50">
                                 <td className="py-3 px-4 text-sm text-slate-500">{new Date(t.date).toLocaleDateString()}</td>
                                 <td className="py-3 px-4 text-sm font-medium text-slate-900">{t.fanName}</td>
                                 <td className="py-3 px-4 text-sm text-slate-600">{t.prizeWon}</td>
                                 <td className="py-3 px-4">
                                     <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                                         t.deliveryStatus === DeliveryStatus.PENDING ? 'bg-slate-100 text-slate-600' :
                                         t.deliveryStatus === DeliveryStatus.TRANSIT ? 'bg-blue-100 text-blue-700' :
                                         t.deliveryStatus === DeliveryStatus.DELIVERED ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                     }`}>{t.deliveryStatus}</span>
                                 </td>
                                 <td className="py-3 px-4 text-right">
                                     <Button size="sm" variant="secondary" onClick={() => handleManageDelivery(t)}>Gerenciar</Button>
                                 </td>
                             </tr>
                         ))}
                         {filteredDeliveries.length === 0 && (
                             <tr><td colSpan={5} className="py-12 text-center text-slate-400">Nenhuma entrega física pendente para esta campanha.</td></tr>
                         )}
                     </tbody>
                  </table>
               </div>
          </div>
      )}

      {/* SUPPORT TAB */}
      {activeTab === 'support' && (
         <div className="animate-in fade-in duration-300">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* LIST OF TICKETS */}
                 <div className="md:col-span-1 space-y-4">
                     {tickets.length === 0 && <p className="text-slate-500 text-sm italic">Nenhum chamado aberto.</p>}
                     {tickets.map(ticket => (
                         <div 
                           key={ticket.id} 
                           onClick={() => handleManageTicket(ticket)}
                           className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedTicket?.id === ticket.id ? 'bg-brand-50 border-brand-500 shadow-md' : 'bg-white border-slate-200 hover:border-brand-200'}`}
                         >
                             <div className="flex justify-between items-start mb-2">
                                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                     ticket.status === TicketStatus.CLOSED ? 'bg-slate-100 text-slate-500' : 
                                     ticket.status === TicketStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                                 }`}>
                                     {ticket.status}
                                 </span>
                                 {ticket.isRisk && <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-red-100 text-red-700">RISCO</span>}
                             </div>
                             <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{ticket.issueType}</h3>
                             <p className="text-xs text-slate-500 mt-1">Fã: {ticket.fanName}</p>
                             <p className="text-xs text-slate-400">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                         </div>
                     ))}
                 </div>

                 {/* TICKET DETAILS */}
                 <div className="md:col-span-2">
                     {selectedTicket ? (
                         <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-[600px] flex flex-col">
                             <div className="flex justify-between items-start mb-6 pb-4 border-b border-slate-100">
                                 <div>
                                     <h2 className="text-lg font-bold text-slate-900">{selectedTicket.issueType}</h2>
                                     <p className="text-xs text-slate-500">Prêmio: {selectedTicket.transactionPrizeName}</p>
                                     <p className="text-xs text-slate-500">Contato: {selectedTicket.contactEmail} | {selectedTicket.contactPhone}</p>
                                 </div>
                                 <div className="flex flex-col items-end gap-2">
                                     <select 
                                       value={selectedTicket.status}
                                       onChange={(e) => handleTicketStatusChange(e.target.value as TicketStatus)}
                                       className="text-xs font-bold bg-slate-50 border border-slate-200 rounded px-2 py-1"
                                     >
                                         <option value={TicketStatus.PENDING}>PENDENTE</option>
                                         <option value={TicketStatus.IN_PROGRESS}>EM ATENDIMENTO</option>
                                         <option value={TicketStatus.CLOSED}>CONCLUÍDO</option>
                                     </select>
                                 </div>
                             </div>

                             <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-100 text-sm">
                                 <p className="text-slate-700 italic">"{selectedTicket.description}"</p>
                             </div>

                             <div className="flex-1 overflow-hidden flex flex-col">
                                <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Chat com o Fã</h3>
                                <div className="flex-1">
                                    <ChatComponent 
                                        contextId={selectedTicket.id}
                                        contextType="TICKET"
                                        currentUser={user}
                                        otherUserName={selectedTicket.fanName || 'Fã'}
                                        isOpen={true}
                                    />
                                </div>
                             </div>
                         </div>
                     ) : (
                         <div className="h-64 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                             Selecione um chamado para atender
                         </div>
                     )}
                 </div>
             </div>
         </div>
      )}

      {/* PROFILE TAB */}
      {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto animate-in fade-in duration-300">
              <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-900 mb-6">Meu Perfil Público</h2>
                  
                  <div className="flex items-center gap-6 mb-8">
                      <div className="w-24 h-24 rounded-full bg-slate-100 border border-slate-200 overflow-hidden relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                          {profileForm.avatarUrl ? (
                              <img src={profileForm.avatarUrl} className="w-full h-full object-cover" />
                          ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                              </div>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <span className="text-white text-xs font-bold">Alterar</span>
                          </div>
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleAvatarChange} accept="image/*" />
                      <div>
                          <Button variant="secondary" size="sm" className="mb-2" isLoading={isUploading} onClick={() => fileInputRef.current?.click()}>Carregar Foto</Button>
                          <p className="text-xs text-slate-400">Recomendado: 400x400px (JPG, PNG)</p>
                      </div>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Nome de Exibição</label>
                          <input type="text" className="w-full p-2 rounded-lg border border-slate-300" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Usuário (URL do Perfil)</label>
                          <div className="flex">
                              <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-sm">
                                  {BASE_DOMAIN}
                              </span>
                              <input type="text" className="flex-1 p-2 rounded-r-lg border border-slate-300" value={profileForm.username} onChange={e => setProfileForm({...profileForm, username: e.target.value.toLowerCase()})} placeholder="seu_nome" />
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Bio (Descrição)</label>
                          <textarea className="w-full p-2 rounded-lg border border-slate-300 h-24" value={profileForm.bio} onChange={e => setProfileForm({...profileForm, bio: e.target.value})} placeholder="Conte um pouco sobre você..." />
                      </div>
                      
                      <div className="pt-4 border-t border-slate-100">
                          <h3 className="text-sm font-bold text-slate-900 mb-3">Redes Sociais</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase">Instagram</label>
                                  <input type="text" className="w-full p-2 rounded border border-slate-300 text-sm" placeholder="@usuario" value={profileForm.socialLinks.instagram || ''} onChange={e => setProfileForm({...profileForm, socialLinks: {...profileForm.socialLinks, instagram: e.target.value}})} />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase">Twitter / X</label>
                                  <input type="text" className="w-full p-2 rounded border border-slate-300 text-sm" placeholder="@usuario" value={profileForm.socialLinks.twitter || ''} onChange={e => setProfileForm({...profileForm, socialLinks: {...profileForm.socialLinks, twitter: e.target.value}})} />
                              </div>
                              <div className="md:col-span-2">
                                  <label className="text-xs font-bold text-slate-500 uppercase">Website</label>
                                  <input type="text" className="w-full p-2 rounded border border-slate-300 text-sm" placeholder="https://..." value={profileForm.socialLinks.website || ''} onChange={e => setProfileForm({...profileForm, socialLinks: {...profileForm.socialLinks, website: e.target.value}})} />
                              </div>
                          </div>
                      </div>

                      <div className="pt-6 flex justify-between items-center">
                          <Button variant="ghost" onClick={handleViewProfileClick}>👁️ Visualizar Página Pública</Button>
                          <Button type="submit" isLoading={isSaving}>Salvar Perfil</Button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* PERSONAL DATA TAB (LGPD/FISCAL) */}
      {activeTab === 'personal-data' && (
          <div className="max-w-3xl mx-auto animate-in fade-in duration-300">
              <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Dados Pessoais & Fiscais</h2>
                  <p className="text-sm text-slate-500 mb-6 bg-yellow-50 p-3 rounded border border-yellow-100">
                      🔒 <strong>Privado:</strong> Estas informações nunca serão exibidas publicamente. Elas são obrigatórias para conformidade legal, emissão de notas fiscais e processamento de pagamentos.
                  </p>

                  <form onSubmit={handleSavePersonalData} className="space-y-6">
                      
                      {/* TIPO DE PESSOA */}
                      <div className="flex items-center gap-2 mb-4">
                          <input 
                              type="checkbox" 
                              id="isCompany" 
                              checked={personalForm.isCompany || false} 
                              onChange={(e) => setPersonalForm({...personalForm, isCompany: e.target.checked})}
                              className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                          />
                          <label htmlFor="isCompany" className="text-sm font-bold text-slate-700 cursor-pointer">Sou Pessoa Jurídica (Empresa)</label>
                      </div>

                      {/* DADOS DA EMPRESA (CONDICIONAL) */}
                      {personalForm.isCompany && (
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4 animate-in slide-in-from-top-2">
                              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-2">Dados da Empresa</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-sm font-bold text-slate-700 mb-1">CNPJ</label>
                                      <input type="text" value={personalForm.company?.cnpj || ''} onChange={e => setPersonalForm({...personalForm, company: {...personalForm.company!, cnpj: e.target.value}})} className="w-full p-2.5 rounded-lg border border-slate-300" placeholder="00.000.000/0000-00" />
                                  </div>
                                  <div>
                                      <label className="block text-sm font-bold text-slate-700 mb-1">Inscrição Estadual</label>
                                      <input type="text" value={personalForm.company?.stateRegistration || ''} onChange={e => setPersonalForm({...personalForm, company: {...personalForm.company!, stateRegistration: e.target.value}})} className="w-full p-2.5 rounded-lg border border-slate-300" />
                                  </div>
                                  <div className="md:col-span-2">
                                      <label className="block text-sm font-bold text-slate-700 mb-1">Razão Social</label>
                                      <input type="text" value={personalForm.company?.legalName || ''} onChange={e => setPersonalForm({...personalForm, company: {...personalForm.company!, legalName: e.target.value}})} className="w-full p-2.5 rounded-lg border border-slate-300" />
                                  </div>
                                   <div className="md:col-span-2">
                                      <label className="block text-sm font-bold text-slate-700 mb-1">Nome Fantasia</label>
                                      <input type="text" value={personalForm.company?.tradeName || ''} onChange={e => setPersonalForm({...personalForm, company: {...personalForm.company!, tradeName: e.target.value}})} className="w-full p-2.5 rounded-lg border border-slate-300" />
                                  </div>
                              </div>
                          </div>
                      )}

                      {/* DADOS DO REPRESENTANTE / PF */}
                      <div>
                           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
                               {personalForm.isCompany ? 'Dados do Representante Legal' : 'Dados Pessoais'}
                           </h3>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
                                    <input type="text" value={personalForm.fullName} onChange={e => setPersonalForm({...personalForm, fullName: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-300" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">CPF</label>
                                    <input type="text" value={personalForm.cpf} onChange={e => setPersonalForm({...personalForm, cpf: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-300" placeholder="000.000.000-00" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Data de Nascimento</label>
                                    <input type="date" value={personalForm.birthDate} onChange={e => setPersonalForm({...personalForm, birthDate: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-300" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Celular</label>
                                    <input type="tel" value={personalForm.phoneNumber} onChange={e => setPersonalForm({...personalForm, phoneNumber: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-300" placeholder="(11) 99999-9999" required />
                                </div>
                           </div>
                      </div>

                      {/* ENDEREÇO FISCAL */}
                      <div>
                           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Endereço Fiscal</h3>
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-1">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">CEP</label>
                                    <input type="text" value={personalForm.address?.zipCode || ''} onChange={e => setPersonalForm({...personalForm, address: {...personalForm.address!, zipCode: e.target.value}})} className="w-full p-2.5 rounded-lg border border-slate-300" required />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Logradouro</label>
                                    <input type="text" value={personalForm.address?.street || ''} onChange={e => setPersonalForm({...personalForm, address: {...personalForm.address!, street: e.target.value}})} className="w-full p-2.5 rounded-lg border border-slate-300" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Número</label>
                                    <input type="text" value={personalForm.address?.number || ''} onChange={e => setPersonalForm({...personalForm, address: {...personalForm.address!, number: e.target.value}})} className="w-full p-2.5 rounded-lg border border-slate-300" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Bairro</label>
                                    <input type="text" value={personalForm.address?.neighborhood || ''} onChange={e => setPersonalForm({...personalForm, address: {...personalForm.address!, neighborhood: e.target.value}})} className="w-full p-2.5 rounded-lg border border-slate-300" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Cidade - UF</label>
                                    <input type="text" value={personalForm.address?.city || ''} onChange={e => setPersonalForm({...personalForm, address: {...personalForm.address!, city: e.target.value}})} className="w-full p-2.5 rounded-lg border border-slate-300" placeholder="São Paulo - SP" required />
                                </div>
                           </div>
                      </div>

                      {/* ... rest of the form ... */}
                      <div className="pt-6">
                          <Button type="submit" isLoading={isSaving} size="lg">Salvar Dados</Button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* MODALS */}
      {isCampaignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95">
            <h3 className="text-xl font-bold mb-4">Nova Campanha</h3>
            <form onSubmit={handleCreateCampaign}>
                <div className="mb-4">
                    <label className="block text-sm font-bold text-slate-700 mb-1">Título da Campanha</label>
                    <input type="text" className="w-full p-2 border border-slate-300 rounded" value={newCampTitle} onChange={e => setNewCampTitle(e.target.value)} placeholder="Ex: Pack de Verão" required />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-bold text-slate-700 mb-1">URL Personalizada (Slug)</label>
                    <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-sm">
                             /{profileForm.username}/
                        </span>
                        <input type="text" className="flex-1 p-2 border border-slate-300 rounded-r" value={newCampSlug} onChange={e => setNewCampSlug(e.target.value)} placeholder="verao-2024" required />
                    </div>
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-bold text-slate-700 mb-1">Preço por Giro (R$)</label>
                    <input type="number" className="w-full p-2 border border-slate-300 rounded" value={newCampPrice} onChange={e => setNewCampPrice(parseFloat(e.target.value))} required />
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={() => setCampaignModalOpen(false)}>Cancelar</Button>
                    <Button type="submit" isLoading={isSaving}>Criar Campanha</Button>
                </div>
            </form>
          </div>
        </div>
      )}

      {isDeliveryModalOpen && selectedDelivery && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 max-h-[90vh] overflow-y-auto flex flex-col">
                  <h3 className="text-xl font-bold mb-4">Gerenciar Entrega</h3>
                  <div className="space-y-4 flex-1">
                      <div className="bg-slate-50 p-3 rounded border border-slate-200">
                          <p className="text-sm"><strong>Produto:</strong> {selectedDelivery.prizeWon}</p>
                          <p className="text-sm"><strong>Fã:</strong> {selectedDelivery.fanName}</p>
                          <p className="text-sm mt-2 font-mono bg-white p-2 rounded border border-slate-200">
                             <strong>Endereço:</strong><br/>
                             {selectedDelivery.shippingAddress?.street}, {selectedDelivery.shippingAddress?.number}<br/>
                             {selectedDelivery.shippingAddress?.city} - {selectedDelivery.shippingAddress?.state}<br/>
                             CEP: {selectedDelivery.shippingAddress?.zipCode}
                          </p>
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Status da Entrega</label>
                          <select className="w-full p-2 border border-slate-300 rounded" value={deliveryStatus} onChange={e => setDeliveryStatus(e.target.value as DeliveryStatus)}>
                              <option value={DeliveryStatus.PENDING}>Pendente</option>
                              <option value={DeliveryStatus.TRANSIT}>Em Trânsito</option>
                              <option value={DeliveryStatus.DELIVERED}>Entregue</option>
                              <option value={DeliveryStatus.RETURNED}>Devolvido</option>
                              <option value={DeliveryStatus.REFUND}>Reembolsado</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Código de Rastreio</label>
                          <input type="text" className="w-full p-2 border border-slate-300 rounded" value={trackingCode} onChange={e => setTrackingCode(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Link de Rastreio (Opcional)</label>
                          <input type="text" className="w-full p-2 border border-slate-300 rounded" value={trackingUrl} onChange={e => setTrackingUrl(e.target.value)} />
                      </div>
                      
                      {/* CHAT DELIVERY */}
                      <div className="pt-4 border-t border-slate-100">
                          <h4 className="text-sm font-bold text-slate-500 uppercase mb-2">Mensagem para o Fã</h4>
                          <ChatComponent 
                              contextId={selectedDelivery.id}
                              contextType="DELIVERY"
                              currentUser={user}
                              otherUserName={selectedDelivery.fanName || 'Fã'}
                              isOpen={isDeliveryModalOpen}
                          />
                      </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                      <Button variant="secondary" onClick={() => setIsDeliveryModalOpen(false)}>Fechar</Button>
                      <Button onClick={handleSaveDelivery} isLoading={isSaving}>Salvar Alterações</Button>
                  </div>
              </div>
          </div>
      )}

      {isTicketModalOpen && selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
             {/* Ticket Modal Logic (Same as FanView but for Creator - Reusing logic in render above) */}
             <div className="hidden">Logica está no render principal</div>
          </div>
      )}

      {activeTab !== 'profile' && activeTab !== 'personal-data' && activeTab !== 'delivery' && activeTab !== 'support' && !activeCampaign && (
             <div className="flex flex-col items-center justify-center py-20 text-center">
                <Button onClick={openNewCampaignModal}>Criar Primeira Campanha</Button>
            </div>
      )}
    </div>
  );
};
