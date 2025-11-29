
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Campaign, Prize, PrizeType, Transaction, SocialLinks, PersonalData, CampaignAnimation, DeliveryStatus, SupportTicket, TicketStatus, AnalyticsData, LootPassConfig } from '../types';
import { dbService } from '../services/mockService';
import { Button } from '../components/Button';
import { ProbabilityBar } from '../components/ProbabilityBar';
import { useToast } from '../components/Toast';
import { ChatComponent } from '../components/ChatComponent';
import QRCode from 'qrcode';

const BASE_DOMAIN = "lootfan.netlify.app/c/";

type DashboardTab = 'overview' | 'editor' | 'delivery' | 'support' | 'analytics' | 'profile' | 'personal-data' | 'loot-pass';

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
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

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

    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const campaignCoverInputRef = useRef<HTMLInputElement>(null);
    const passCoverInputRef = useRef<HTMLInputElement>(null);
    const prizeFileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Modal States
    const [isCampaignModalOpen, setCampaignModalOpen] = useState(false);

    // Share Popover State
    const [isShareOpen, setIsShareOpen] = useState(false);
    const shareRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

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

    // Loot Pass Form State
    const [lootPassForm, setLootPassForm] = useState<LootPassConfig>({
        isEnabled: false,
        title: 'Clube VIP',
        description: 'Acesso a conteúdos exclusivos e sorteios especiais.',
        price: 29.90,
        coverUrl: '',
        perks: []
    });
    const [newPerk, setNewPerk] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const [campData, transData, ticketData] = await Promise.all([
                dbService.getCampaignsByCreator(user.id),
                dbService.getTransactions(user.id),
                dbService.getTicketsByCreator(user.id)
            ]);

            setCampaigns(campData);
            setTransactions(transData);
            setTickets(ticketData);

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

            if (user.lootPassConfig) {
                setLootPassForm(user.lootPassConfig);
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

    // Handle Click Outside for Share Popover
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (shareRef.current && !shareRef.current.contains(event.target as Node)) {
                setIsShareOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load analytics when switching to the tab
    useEffect(() => {
        if (activeTab === 'analytics' && !analytics) {
            const loadAnalytics = async () => {
                try {
                    const data = await dbService.getCreatorAnalytics(user.id);
                    setAnalytics(data);
                } catch (e) {
                    console.error(e);
                    toast.error("Erro ao carregar analytics.");
                }
            }
            loadAnalytics();
        }
    }, [activeTab, user.id]);

    const activeCampaign = useMemo(() =>
        campaigns.find(c => c.id === selectedCampaignId),
        [campaigns, selectedCampaignId]);

    // Generate QR Code Image
    useEffect(() => {
        if (isShareOpen && activeCampaign && canvasRef.current) {
            setTimeout(generateShareImage, 100);
        }
    }, [isShareOpen, activeCampaign]);

    const generateShareImage = async () => {
        if (!activeCampaign || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const url = getCampaignUrl(activeCampaign.slug);
        const size = 600;
        const qrContainerSize = 380;
        const qrCodeSize = 320;
        const radius = 40;

        canvas.width = size;
        canvas.height = size;

        ctx.fillStyle = '#7c3aed';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(0, 0, size, size, radius);
        else ctx.fillRect(0, 0, size, size);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        const boxX = (size - qrContainerSize) / 2;
        const boxY = (size - qrContainerSize) / 2 - 30;
        const boxRadius = 20;

        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, qrContainerSize, qrContainerSize, boxRadius);
            ctx.fill();
        } else ctx.fillRect(boxX, boxY, qrContainerSize, qrContainerSize);

        try {
            const qrDataUrl = await QRCode.toDataURL(url, {
                margin: 0, width: qrCodeSize, color: { dark: '#000000', light: '#ffffff' }
            });
            const img = new Image();
            img.src = qrDataUrl;
            img.onload = () => {
                const qrX = boxX + (qrContainerSize - qrCodeSize) / 2;
                const qrY = boxY + (qrContainerSize - qrCodeSize) / 2;
                ctx.drawImage(img, qrX, qrY, qrCodeSize, qrCodeSize);

                const iconSize = 60;
                const gapIconText = 15;
                const gapText = 8;
                const fontLoot = '500 40px Inter, sans-serif';
                const fontFan = '800 40px Inter, sans-serif';

                ctx.font = fontLoot;
                const wLoot = ctx.measureText('Loot').width;
                ctx.font = fontFan;
                const wFan = ctx.measureText('Fan').width;

                const totalLogoWidth = iconSize + gapIconText + wLoot + gapText + wFan;
                const startX = (size - totalLogoWidth) / 2;
                const logoYBase = boxY + qrContainerSize + 70;
                const iconX = startX;
                const iconY = logoYBase - (iconSize / 2);

                ctx.fillStyle = '#ffffff';
                if (ctx.roundRect) {
                    ctx.beginPath();
                    ctx.roundRect(iconX, iconY - 5, iconSize, iconSize, 14);
                    ctx.fill();
                } else ctx.fillRect(iconX, iconY - 5, iconSize, iconSize);

                ctx.fillStyle = '#7c3aed';
                ctx.font = 'bold 40px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('L', iconX + (iconSize / 2), iconY + (iconSize / 2) - 3);

                const textY = logoYBase + 5;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
                ctx.fillStyle = '#334155';
                ctx.font = fontLoot;
                ctx.fillText('Loot', startX + iconSize + gapIconText, textY);
                ctx.fillStyle = '#000000';
                ctx.font = fontFan;
                ctx.fillText('Fan', startX + iconSize + gapIconText + wLoot + gapText, textY);
            };
        } catch (err) { console.error(err); }
    };

    const deliveries = useMemo(() => transactions.filter(t => t.prizeType === PrizeType.PHYSICAL), [transactions]);
    const filteredDeliveries = useMemo(() => deliveries.filter(d => d.campaignId === selectedCampaignId), [deliveries, selectedCampaignId]);

    const getCampaignUrl = (slug: string) => {
        const username = profileForm.username || 'usuario';
        return `https://${BASE_DOMAIN}${username}/${slug}`;
    }

    // --- ACTIONS ---
    const openNewCampaignModal = () => { if (!profileForm.username) { toast.error("Defina usuário primeiro."); onTabChange('profile'); return; } setNewCampTitle(''); setNewCampSlug(''); setNewCampPrice(29.90); setCampaignModalOpen(true); }
    const handleTestClick = () => { if (activeCampaign && onTestCampaign) onTestCampaign(activeCampaign.slug); }
    const handleViewProfileClick = () => { if (profileForm.username && onViewProfile) onViewProfile(profileForm.username); else toast.error("Salve um usuário primeiro."); }

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault(); setIsSaving(true);
        try {
            const newCamp = await dbService.createCampaign(user.id, newCampTitle, newCampSlug, newCampPrice);
            if (newCamp) {
                setCampaigns([newCamp, ...campaigns]);
                setSelectedCampaignId(newCamp.id);
                setCampaignModalOpen(false);
                toast.success("Campanha criada!");
                onTabChange('editor');
            }
        } catch (e) {
            toast.error("Erro ao criar.");
        } finally { setIsSaving(false); }
    };

    const handleDeleteCampaign = async () => { if (!activeCampaign || !window.confirm("Excluir campanha?")) return; setIsSaving(true); try { await dbService.deleteCampaign(activeCampaign.id); toast.success("Removida."); await loadData(); } catch (e) { toast.error("Erro."); } finally { setIsSaving(false); } };
    const handleSaveChanges = async () => { if (!activeCampaign) return; setIsSaving(true); try { await dbService.saveCampaign(activeCampaign); toast.success("Salvo!"); await loadData(); } catch (e) { toast.error("Erro."); } finally { setIsSaving(false); } };
    const handleAvatarChange = async (e: any) => { if (e.target.files?.[0]) { setIsUploading(true); try { const url = await dbService.uploadAvatar(e.target.files[0], user.id); setProfileForm(p => ({ ...p, avatarUrl: url })); toast.success("Upload OK"); } catch (err: any) { toast.error(err.message); } finally { setIsUploading(false); } } };
    const handleCampaignCoverChange = async (e: any) => { if (activeCampaign && e.target.files?.[0]) { try { const url = await dbService.uploadCampaignImage(e.target.files[0], user.id); handleCampaignConfigUpdate('coverImageUrl', url); toast.success("Capa OK"); } catch (err: any) { toast.error(err.message); } } };
    const handlePrizeImageChange = async (e: any, idx: number) => { if (e.target.files?.[0]) { try { const url = await dbService.uploadPrizeImage(e.target.files[0], user.id); handlePrizeUpdate(idx, 'imageUrl', url); toast.success("Imagem OK"); } catch (err: any) { toast.error(err.message); } } };

    const handleSaveProfile = async (e: any) => { e.preventDefault(); setIsSaving(true); try { await dbService.updateUserProfile(user.id, { name: profileForm.name, username: profileForm.username, bio: profileForm.bio, avatarUrl: profileForm.avatarUrl, socialLinks: profileForm.socialLinks }); toast.success("Perfil salvo!"); } catch (e: any) { toast.error(e.message); } finally { setIsSaving(false); } };
    const handleSavePersonalData = async (e: any) => { e.preventDefault(); setIsSaving(true); try { await dbService.updateUserProfile(user.id, { personalData: personalForm }); toast.success("Dados salvos!"); } catch (e: any) { toast.error(e.message); } finally { setIsSaving(false); } };

    const handleRefreshHealth = () => { setIsRecalculatingHealth(true); setTimeout(() => { setIsRecalculatingHealth(false); toast.info("Recalculado."); }, 600); };

    const handleManageDelivery = (t: Transaction) => { setSelectedDelivery(t); setTrackingCode(t.trackingCode || ''); setTrackingUrl(t.trackingUrl || ''); setDeliveryStatus(t.deliveryStatus || DeliveryStatus.PENDING); setIsDeliveryModalOpen(true); };
    const handleSaveDelivery = async () => { if (!selectedDelivery) return; setIsSaving(true); try { await dbService.updateDelivery(selectedDelivery.id, deliveryStatus, trackingCode, trackingUrl); toast.success("Atualizado!"); setIsDeliveryModalOpen(false); loadData(); } catch (e) { toast.error("Erro."); } finally { setIsSaving(false); } };

    const handleManageTicket = (t: SupportTicket) => { setSelectedTicket(t); };
    const handleTicketStatusChange = async (s: TicketStatus) => { if (!selectedTicket) return; try { await dbService.updateTicketStatus(selectedTicket.id, s); setSelectedTicket({ ...selectedTicket, status: s }); toast.success("Status atualizado"); loadData(); } catch (e) { toast.error("Erro."); } };

    const handleAddPrize = () => { if (!activeCampaign) return; const newP: Prize = { id: `temp-${Date.now()}`, name: 'Novo Item', type: PrizeType.DIGITAL, description: '', stock: -1, probability: 0, perceivedValue: 0, costPrice: 0, imageUrl: '' }; setCampaigns(campaigns.map(c => c.id === activeCampaign.id ? { ...c, prizes: [...c.prizes, newP] } : c)); };
    const handleDeletePrize = async (id: string) => { if (!activeCampaign || !window.confirm("Remover?")) return; try { await dbService.deletePrize(id); } catch (e) { } const updated = activeCampaign.prizes.filter(p => p.id !== id); setCampaigns(campaigns.map(c => c.id === activeCampaign.id ? { ...c, prizes: updated } : c)); };
    const handlePrizeUpdate = (idx: number, f: keyof Prize, v: any) => { if (!activeCampaign) return; const ps = [...activeCampaign.prizes]; ps[idx] = { ...ps[idx], [f]: v }; setCampaigns(campaigns.map(c => c.id === activeCampaign.id ? { ...c, prizes: ps } : c)); };
    const handleCampaignConfigUpdate = (f: keyof Campaign, v: any) => { if (!activeCampaign) return; setCampaigns(campaigns.map(c => c.id === activeCampaign.id ? { ...c, [f]: v } : c)); };

    const copyLink = () => { if (activeCampaign) { navigator.clipboard.writeText(getCampaignUrl(activeCampaign.slug)); toast.success("Copiado!"); } };
    const handleDownloadQR = () => { if (!canvasRef.current) return; const l = document.createElement('a'); l.download = 'qr.png'; l.href = canvasRef.current.toDataURL(); l.click(); toast.success("Baixado!"); };

    // --- LOOT PASS ACTIONS ---
    const handleSaveLootPass = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await dbService.updateUserProfile(user.id, { lootPassConfig: lootPassForm });
            toast.success("Configurações do Loot Pass salvas!");
        } catch (e: any) {
            toast.error("Erro ao salvar: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePassCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            try {
                const url = await dbService.uploadCampaignImage(file, user.id);
                setLootPassForm(prev => ({ ...prev, coverUrl: url }));
                toast.success("Imagem do passe atualizada!");
            } catch (error: any) {
                toast.error(error.message);
            }
        }
    };

    const handleAddPerk = () => {
        if (newPerk.trim()) {
            setLootPassForm(prev => ({ ...prev, perks: [...prev.perks, newPerk.trim()] }));
            setNewPerk('');
        }
    };

    const removePerk = (idx: number) => {
        setLootPassForm(prev => ({ ...prev, perks: prev.perks.filter((_, i) => i !== idx) }));
    };

    // --- MEMOS ---
    const totalProb = useMemo(() => activeCampaign?.prizes.reduce((acc, curr) => acc + Number(curr.probability), 0) || 0, [activeCampaign?.prizes]);
    const financialStats = useMemo(() => { if (!activeCampaign) return null; const spinPrice = activeCampaign.pricePerSpin; const platformFee = 0.10; const netRevenuePerSpin = spinPrice * (1 - platformFee); let expectedCost = 0; let highestCostFactorItem = { name: '', factor: 0, cost: 0, prob: 0 }; activeCampaign.prizes.forEach(p => { const cost = p.type === PrizeType.PHYSICAL ? (p.costPrice || 0) : 0; const probDecimal = p.probability / 100; const factor = cost * probDecimal; expectedCost += factor; if (factor > highestCostFactorItem.factor) { highestCostFactorItem = { name: p.name, factor, cost, prob: p.probability }; } }); const expectedProfit = netRevenuePerSpin - expectedCost; const margin = spinPrice > 0 ? (expectedProfit / spinPrice) * 100 : 0; const isHealthy = expectedProfit > 0; return { netRevenuePerSpin, expectedCost, expectedProfit, margin, isHealthy, highestCostFactorItem }; }, [activeCampaign?.prizes, activeCampaign?.pricePerSpin]);
    const performanceStats = useMemo(() => { if (!activeCampaign) return null; const campaignTrans = transactions.filter(t => t.campaignId === activeCampaign.id); const totalWins = campaignTrans.length; let totalRealizedCost = 0; const prizeStats = activeCampaign.prizes.map(prize => { const winsCount = campaignTrans.filter(t => t.prizeWon === prize.name).length; const percentage = totalWins > 0 ? (winsCount / totalWins) * 100 : 0; const unitCost = prize.costPrice || 0; const totalPrizeCost = winsCount * unitCost; totalRealizedCost += totalPrizeCost; return { ...prize, winsCount, percentage, totalPrizeCost }; }).sort((a, b) => b.winsCount - a.winsCount); const totalRealizedRevenue = activeCampaign.totalRevenue; const platformFeeRate = user.commissionRate || 0.10; const totalPlatformFees = totalRealizedRevenue * platformFeeRate; const netProfitRealized = totalRealizedRevenue - totalRealizedCost - totalPlatformFees; const roiMargin = totalRealizedRevenue > 0 ? (netProfitRealized / totalRealizedRevenue) * 100 : 0; const isProfitable = netProfitRealized >= 0; return { totalRealizedRevenue, totalRealizedCost, totalPlatformFees, netProfitRealized, roiMargin, isProfitable, prizeStats }; }, [transactions, activeCampaign, user.commissionRate]);

    // --- RENDER HELPERS ---
    const renderFinancialHealth = () => {
        if (!financialStats) return null;
        const { netRevenuePerSpin, expectedCost, expectedProfit, margin, isHealthy, highestCostFactorItem } = financialStats;
        let suggestionMsg = null;
        if (!isHealthy && highestCostFactorItem.cost > 0) {
            const otherCosts = expectedCost - highestCostFactorItem.factor;
            const maxProbDecimal = (netRevenuePerSpin - otherCosts) / highestCostFactorItem.cost;
            const maxProbPercent = Math.floor(maxProbDecimal * 100 * 10) / 10;
            if (maxProbPercent < 0) { suggestionMsg = "O custo de outros itens já excede a receita."; } else { suggestionMsg = `Reduza a chance de "${highestCostFactorItem.name}" para no máximo ${maxProbPercent}%.`; }
        }
        return (
            <div className={`mt-6 p-6 rounded-xl border transition-colors duration-300 ${isHealthy ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${isHealthy ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        {isHealthy ? (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.519l2.74-1.22m0 0-5.94-2.28m5.94 2.28-2.28 5.941" /></svg>) : (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181" /></svg>)}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className={`font-bold text-lg ${isHealthy ? 'text-emerald-900' : 'text-red-900'}`}> {isRecalculatingHealth ? 'Recalculando...' : (isHealthy ? 'Saúde Financeira: Saudável' : 'Alerta de Prejuízo')} </h3>
                            <button onClick={handleRefreshHealth} className={`p-1.5 rounded-full hover:bg-black/5 text-slate-500 transition-all ${isRecalculatingHealth ? 'animate-spin text-brand-600' : ''}`} title="Recalcular"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg></button>
                        </div>
                    </div>
                </div>
                {isRecalculatingHealth ? (<div className="py-8 text-center text-slate-500 text-sm font-medium animate-pulse">Atualizando...</div>) : (<div className="animate-in fade-in duration-300"> <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4"> <div className="bg-white/60 p-3 rounded-lg"><p className="text-xs text-slate-500 uppercase font-bold">Receita Líquida</p><p className="text-lg font-bold text-slate-900">R$ {netRevenuePerSpin.toFixed(2)}</p></div> <div className="bg-white/60 p-3 rounded-lg"><p className="text-xs text-slate-500 uppercase font-bold">Custo Esperado</p><p className="text-lg font-bold text-slate-900">R$ {expectedCost.toFixed(2)}</p></div> <div className="bg-white/60 p-3 rounded-lg"><p className="text-xs text-slate-500 uppercase font-bold">Lucro Projetado</p><p className={`text-lg font-bold ${isHealthy ? 'text-emerald-600' : 'text-red-600'}`}>R$ {expectedProfit.toFixed(2)} ({margin.toFixed(1)}%)</p></div> </div> {!isHealthy && suggestionMsg && (<div className="bg-red-100 text-red-800 p-3 rounded-lg text-sm font-medium border border-red-200 flex items-start gap-2"><span><strong>Dica:</strong> {suggestionMsg}</span></div>)} </div>)}
            </div>
        )
    }

    const renderPrizePerformance = () => {
        if (!performanceStats) return null;
        const { totalRealizedRevenue, totalRealizedCost, totalPlatformFees, netProfitRealized, roiMargin, isProfitable, prizeStats } = performanceStats;
        return (
            <div className="mt-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-brand-600"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" /></svg>Desempenho & ROI</h3>
                <div className={`p-6 rounded-xl border mb-6 ${isProfitable ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                        <div><p className="text-xs text-slate-500 font-bold uppercase">Receita Real</p><p className="text-xl font-bold text-slate-900">R$ {totalRealizedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
                        <div><p className="text-xs text-slate-500 font-bold uppercase">Custo Entregue</p><p className="text-xl font-bold text-slate-900">R$ {totalRealizedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
                        <div><p className="text-xs text-slate-500 font-bold uppercase">Taxas (10%)</p><p className="text-xl font-bold text-slate-500">R$ {totalPlatformFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
                        <div><p className="text-xs text-slate-500 font-bold uppercase">Lucro Líquido</p><p className={`text-xl font-bold ${isProfitable ? 'text-emerald-700' : 'text-red-700'}`}>R$ {netProfitRealized.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
                        <div className="flex flex-col justify-center"><span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold border ${isProfitable ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>{roiMargin.toFixed(1)}% Margem</span></div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left"><thead className="bg-slate-50 text-slate-700 text-xs uppercase font-bold"><tr><th className="py-3 px-4">Produto</th><th className="py-3 px-4 text-center">Qtd.</th><th className="py-3 px-4 w-1/3">Proporção</th><th className="py-3 px-4 text-right">Custo</th></tr></thead> <tbody className="divide-y divide-slate-100">{prizeStats.map(stat => (<tr key={stat.id} className="hover:bg-slate-50"><td className="py-3 px-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex-shrink-0 overflow-hidden">{stat.imageUrl ? (<img src={stat.imageUrl} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">IMG</div>)}</div><span className="font-medium text-slate-900 text-sm">{stat.name}</span></div></td><td className="py-3 px-4 text-center font-bold text-slate-700">{stat.winsCount}</td><td className="py-3 px-4"><div className="flex items-center gap-2"><div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-brand-500 rounded-full" style={{ width: `${stat.percentage}%` }}></div></div><span className="text-xs font-bold text-brand-600 w-12 text-right">{stat.percentage.toFixed(1)}%</span></div></td><td className="py-3 px-4 text-right text-sm font-medium text-slate-600">{stat.totalPrizeCost > 0 ? `R$ ${stat.totalPrizeCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</td></tr>))}{prizeStats.length === 0 && (<tr><td colSpan={4} className="py-8 text-center text-slate-400 text-sm">Nenhuma venda.</td></tr>)}</tbody></table>
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
                                if (e.target.value === 'new') {
                                    openNewCampaignModal();
                                } else {
                                    setSelectedCampaignId(e.target.value);
                                }
                            }}
                            className="appearance-none bg-white border border-slate-300 text-slate-900 py-2.5 pl-4 pr-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium cursor-pointer"
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
                            <Button variant="secondary" onClick={handleTestClick} className="shadow-sm">Testar</Button>
                            <div className="relative" ref={shareRef}>
                                <Button
                                    variant="ghost"
                                    onClick={() => setIsShareOpen(!isShareOpen)}
                                    title="Compartilhar"
                                    className={isShareOpen ? 'bg-slate-100 text-brand-600' : ''}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg>
                                </Button>
                                {isShareOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 p-4 z-50 animate-in fade-in zoom-in-95 origin-top-right">
                                        <h4 className="font-bold text-slate-800 mb-2 text-sm">Compartilhar Campanha</h4>
                                        <div className="mb-3 rounded-lg overflow-hidden border border-slate-100 shadow-sm bg-slate-50 flex items-center justify-center">
                                            <canvas ref={canvasRef} className="w-full h-auto" style={{ maxWidth: '250px' }} />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <Button size="sm" onClick={copyLink} fullWidth className="text-xs">Copiar Link</Button>
                                            <Button size="sm" variant="secondary" onClick={handleDownloadQR} fullWidth className="text-xs">Baixar QR (PNG)</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* TABS */}
            <div className="border-b border-slate-200 mb-6">
                <nav className="-mb-px flex space-x-8 overflow-x-auto">
                    {[
                        { id: 'overview', label: 'Visão Geral', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg> },
                        { id: 'editor', label: 'Editor', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.8 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.635m0 0a15.998 15.998 0 0 0-1.677.477 15.999 15.999 0 0 0-3.478 3.478 15.999 15.999 0 0 0 .48 1.678m2.24 7.24a2.25 2.25 0 0 1 2.25-2.25 4.5 4.5 0 0 0 2.25-2.25 2.25 2.25 0 0 1 4.5 0 4.5 4.5 2.25 2.25 0 0 1 2.25 2.25 2.25 2.25 0 0 1-2.25 2.25H15.75A2.25 2.25 0 0 1 13.5 18.75v-2.25Z" /></svg> },
                        { id: 'loot-pass', label: 'Loot Pass', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-yellow-600"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg> },
                        { id: 'analytics', label: 'Analytics', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" /></svg> },
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
                </div>
            )}

            {/* EDITOR TAB */}
            {activeCampaign && activeTab === 'editor' && (
                <div className="animate-in fade-in duration-300">
                    <div className="mb-6 group relative h-48 w-full rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 overflow-hidden hover:border-brand-400 transition-colors cursor-pointer" onClick={() => campaignCoverInputRef.current?.click()}>
                        {activeCampaign.coverImageUrl ? (
                            <>
                                <img src={activeCampaign.coverImageUrl} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-white font-bold">Alterar Capa</span></div>
                            </>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400"><span className="text-sm font-medium">Alterar Capa</span></div>
                        )}
                        <input type="file" className="hidden" accept="image/*" ref={campaignCoverInputRef} onChange={handleCampaignCoverChange} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 pb-6 border-b border-slate-100 bg-slate-50 p-4 rounded-xl items-end">
                        <div className="col-span-1 md:col-span-1"><label className="text-xs font-bold text-slate-500 uppercase">Título</label><input type="text" className="w-full bg-white border border-slate-200 rounded p-1.5" value={activeCampaign.title} onChange={e => handleCampaignConfigUpdate('title', e.target.value)} /></div>
                        <div className="col-span-1 md:col-span-1"><label className="text-xs font-bold text-slate-500 uppercase">Slug</label><input type="text" className="w-full bg-white border border-slate-200 rounded p-1.5" value={activeCampaign.slug} onChange={e => handleCampaignConfigUpdate('slug', e.target.value)} /></div>
                        <div className="col-span-1 md:col-span-1"><label className="text-xs font-bold text-slate-500 uppercase">Preço (R$)</label><input type="number" className="w-full bg-white border border-slate-200 rounded p-1.5" value={activeCampaign.pricePerSpin} onChange={e => handleCampaignConfigUpdate('pricePerSpin', parseFloat(e.target.value))} /></div>
                        <div className="col-span-1 md:col-span-1"><label className="text-xs font-bold text-slate-500 uppercase">Animação</label><select className="w-full bg-white border border-slate-200 rounded p-1.5 text-sm" value={activeCampaign.animationType} onChange={e => handleCampaignConfigUpdate('animationType', e.target.value)}><option value={CampaignAnimation.WHEEL}>🎡 Roleta</option><option value={CampaignAnimation.BOX}>📦 Caixa</option><option value={CampaignAnimation.LOOT}>🃏 Cards</option><option value={CampaignAnimation.MACHINE}>🎰 Slot</option></select></div>
                        <div className="col-span-1 md:col-span-1 flex flex-col justify-end"><label className="text-xs font-bold text-slate-500 uppercase mb-2">Status</label><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={activeCampaign.isActive} onChange={(e) => handleCampaignConfigUpdate('isActive', e.target.checked)} /><div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div><span className="ml-2 text-sm font-medium text-slate-700">{activeCampaign.isActive ? 'Publicada' : 'Rascunho'}</span></label></div>
                    </div>

                    <div className="flex flex-col gap-3 mb-6">
                        {/* +18 Checkbox */}
                        <div className="p-4 rounded-xl border border-yellow-200 bg-yellow-50 flex items-center gap-3">
                            <input type="checkbox" id="adultContent" className="w-5 h-5 text-red-600 rounded focus:ring-red-500 accent-red-600" checked={activeCampaign.hasAdultContent || false} onChange={(e) => handleCampaignConfigUpdate('hasAdultContent', e.target.checked)} />
                            <label htmlFor="adultContent" className="font-bold text-slate-700 text-sm">Conteúdo +18 (Protegido)</label>
                        </div>

                        {/* Loot Pass Checkbox */}
                        <div className="p-4 rounded-xl border border-yellow-300 bg-gradient-to-r from-yellow-50 to-white flex items-center gap-3 shadow-sm">
                            <div className="p-2 bg-yellow-100 rounded-lg text-yellow-700">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" /></svg>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" id="lootPassOnly" className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500 accent-yellow-600" checked={activeCampaign.isLootPassOnly || false} onChange={(e) => handleCampaignConfigUpdate('isLootPassOnly', e.target.checked)} />
                                    <label htmlFor="lootPassOnly" className="font-bold text-slate-800 text-sm">Exclusivo para Membros Loot Pass</label>
                                </div>
                                <p className="text-xs text-slate-500 mt-1 ml-8">Apenas assinantes do seu clube poderão acessar e comprar nesta campanha.</p>
                            </div>
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
                                    <th className="py-3 px-4">Nome</th>
                                    <th className="py-3 px-4">Tipo</th>
                                    <th className="py-3 px-4">Estoque</th>
                                    <th className="py-3 px-4">Chance (%)</th>
                                    <th className="py-3 px-4 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {activeCampaign.prizes.map((prize, idx) => (
                                    <tr key={prize.id} className="bg-white hover:bg-slate-50 transition-colors">
                                        <td className="p-2 text-center"><div className="w-10 h-10 bg-slate-100 rounded-md border border-slate-200 overflow-hidden relative cursor-pointer" onClick={() => prizeFileInputRefs.current[prize.id]?.click()}>{prize.imageUrl ? <img src={prize.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">IMG</div>}</div><input type="file" className="hidden" accept="image/*" ref={(el) => { prizeFileInputRefs.current[prize.id] = el; }} onChange={(e) => handlePrizeImageChange(e, idx)} /></td>
                                        <td className="p-2"><input type="text" value={prize.name} onChange={(e) => handlePrizeUpdate(idx, 'name', e.target.value)} className="w-full bg-transparent border-none text-sm focus:ring-0" placeholder="Nome" /></td>
                                        <td className="p-2"><select value={prize.type} onChange={(e) => handlePrizeUpdate(idx, 'type', e.target.value)} className="bg-transparent text-xs border-slate-200 rounded"><option value={PrizeType.DIGITAL}>Digital</option><option value={PrizeType.PHYSICAL}>Físico</option><option value={PrizeType.SINGLE_VIEW}>Único</option></select></td>
                                        <td className="p-2"><input type="number" value={prize.stock} onChange={(e) => handlePrizeUpdate(idx, 'stock', parseInt(e.target.value))} className="w-16 bg-white border border-slate-300 rounded text-center text-sm" /></td>
                                        <td className="p-2"><input type="number" value={prize.probability} onChange={(e) => handlePrizeUpdate(idx, 'probability', parseFloat(e.target.value))} className="w-16 text-brand-600 font-bold bg-white border border-slate-300 rounded text-center text-sm" /></td>
                                        <td className="p-2"><button onClick={() => handleDeletePrize(prize.id)} className="text-slate-300 hover:text-red-500">✕</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col gap-4">
                        <Button variant="secondary" size="sm" onClick={handleAddPrize} className="self-start">+ Produto</Button>
                        <ProbabilityBar currentTotal={totalProb} />
                        {renderFinancialHealth()}
                    </div>
                </div>
            )}

            {/* LOOT PASS TAB */}
            {activeTab === 'loot-pass' && (
                <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 shadow-inner">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813a3.75 3.75 0 0 0 2.576-2.576l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clipRule="evenodd" /></svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Configuração Loot Pass</h2>
                            <p className="text-slate-500">Crie seu clube de assinaturas e gere receita recorrente.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSaveLootPass} className="space-y-8">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-slate-900">Status do Clube</h3>
                                <p className="text-sm text-slate-500">Permitir que fãs assinem seu Loot Pass.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={lootPassForm.isEnabled} onChange={(e) => setLootPassForm({ ...lootPassForm, isEnabled: e.target.checked })} />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                    <div><label className="block text-sm font-bold text-slate-700 mb-1">Nome do Passe</label><input type="text" className="w-full p-2.5 rounded-lg border border-slate-300" placeholder="Ex: Clube Dourado" value={lootPassForm.title} onChange={e => setLootPassForm({ ...lootPassForm, title: e.target.value })} required /></div>
                                    <div><label className="block text-sm font-bold text-slate-700 mb-1">Descrição</label><textarea className="w-full p-2.5 rounded-lg border border-slate-300 h-24" placeholder="O que seus fãs ganham ao assinar?" value={lootPassForm.description} onChange={e => setLootPassForm({ ...lootPassForm, description: e.target.value })} required /></div>
                                    <div><label className="block text-sm font-bold text-slate-700 mb-1">Preço Mensal (R$)</label><input type="number" className="w-full p-2.5 rounded-lg border border-slate-300" placeholder="29.90" value={lootPassForm.price} onChange={e => setLootPassForm({ ...lootPassForm, price: parseFloat(e.target.value) })} required /></div>
                                </div>
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                    <h3 className="font-bold text-slate-900 mb-4">Benefícios (Perks)</h3>
                                    <div className="flex gap-2 mb-4"><input type="text" className="flex-1 p-2.5 rounded-lg border border-slate-300" placeholder="Ex: Acesso a campanhas exclusivas" value={newPerk} onChange={e => setNewPerk(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddPerk())} /><Button type="button" onClick={handleAddPerk} variant="secondary">Adicionar</Button></div>
                                    <ul className="space-y-2">{lootPassForm.perks.map((perk, idx) => (<li key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100"><span className="text-sm text-slate-700 flex items-center gap-2"><span className="text-yellow-500">★</span> {perk}</span><button type="button" onClick={() => removePerk(idx)} className="text-slate-400 hover:text-red-500">✕</button></li>))}{lootPassForm.perks.length === 0 && <li className="text-center text-slate-400 text-sm italic">Adicione benefícios para atrair fãs.</li>}</ul>
                                </div>
                            </div>
                            <div className="lg:col-span-1">
                                <h3 className="font-bold text-slate-500 text-xs uppercase mb-4 tracking-wider">Pré-visualização</h3>
                                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-1 shadow-2xl relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-yellow-400 via-yellow-200 to-yellow-600 opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                    <div className="bg-slate-900 rounded-xl p-6 relative z-10 h-full flex flex-col">
                                        <div className="w-full h-32 bg-slate-800 rounded-lg mb-4 overflow-hidden relative cursor-pointer group/cover border border-slate-700" onClick={() => passCoverInputRef.current?.click()}>
                                            {lootPassForm.coverUrl ? (<img src={lootPassForm.coverUrl} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-slate-600 text-xs uppercase font-bold tracking-widest bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">Capa do Passe</div>)}
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-opacity"><span className="text-white text-xs font-bold">Alterar</span></div>
                                            <input type="file" className="hidden" accept="image/*" ref={passCoverInputRef} onChange={handlePassCoverChange} />
                                        </div>
                                        <div className="flex justify-between items-start mb-2"><h3 className="text-xl font-bold text-white">{lootPassForm.title || 'Nome do Passe'}</h3><span className="bg-yellow-500 text-yellow-950 text-xs font-black px-2 py-1 rounded">VIP</span></div>
                                        <p className="text-slate-400 text-xs mb-6 line-clamp-3">{lootPassForm.description || 'Descrição do passe...'}</p>
                                        <ul className="space-y-2 mb-6 flex-1">{(lootPassForm.perks.length > 0 ? lootPassForm.perks : ['Benefício 1', 'Benefício 2']).slice(0, 3).map((p, i) => (<li key={i} className="text-slate-300 text-xs flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-yellow-500"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>{p}</li>))}</ul>
                                        <div className="pt-4 border-t border-slate-800 flex items-center justify-between"><div><p className="text-[10px] text-slate-500 uppercase font-bold">Mensalidade</p><p className="text-lg font-bold text-white">R$ {lootPassForm.price.toFixed(2)}</p></div><Button size="sm" className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-yellow-950 border-none font-bold hover:brightness-110 shadow-lg shadow-yellow-500/20">Assinar</Button></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end pt-4 border-t border-slate-200"><Button size="lg" type="submit" isLoading={isSaving}>Salvar Configuração</Button></div>
                    </form>
                </div>
            )}

            {/* DELIVERY TAB */}
            {activeTab === 'delivery' && (
                <div className="animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-brand-600"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
                            Gestão de Entregas - {activeCampaign?.title || 'Todas'}
                        </h2>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider">
                                <tr><th className="py-3 px-4">Item</th><th className="py-3 px-4">Fã</th><th className="py-3 px-4">Data</th><th className="py-3 px-4">Status</th><th className="py-3 px-4 text-right">Ação</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredDeliveries.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50">
                                        <td className="py-3 px-4 font-medium">{t.prizeWon}</td>
                                        <td className="py-3 px-4">{t.fanName}</td>
                                        <td className="py-3 px-4 text-sm text-slate-500">{new Date(t.date).toLocaleDateString()}</td>
                                        <td className="py-3 px-4"><span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${t.deliveryStatus === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{t.deliveryStatus}</span></td>
                                        <td className="py-3 px-4 text-right"><Button size="sm" variant="secondary" onClick={() => handleManageDelivery(t)}>Gerenciar</Button></td>
                                    </tr>
                                ))}
                                {filteredDeliveries.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-400">Nenhuma entrega pendente para esta campanha.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* SUPPORT TAB */}
            {activeTab === 'support' && (
                <div className="animate-in fade-in duration-300">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Central de Suporte</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1 space-y-3">
                            {tickets.map(ticket => (
                                <div key={ticket.id} onClick={() => handleManageTicket(ticket)} className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedTicket?.id === ticket.id ? 'bg-brand-50 border-brand-500 shadow-md' : 'bg-white border-slate-200 hover:border-brand-200'}`}>
                                    <div className="flex justify-between mb-1"><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${ticket.status === 'CLOSED' ? 'bg-slate-100 text-slate-500' : 'bg-yellow-100 text-yellow-700'}`}>{ticket.status}</span><span className="text-xs text-slate-400">{new Date(ticket.createdAt).toLocaleDateString()}</span></div>
                                    <h4 className="font-bold text-slate-900 text-sm">{ticket.issueType}</h4>
                                    <p className="text-xs text-slate-500 truncate">{ticket.description}</p>
                                </div>
                            ))}
                            {tickets.length === 0 && <p className="text-slate-400 text-center text-sm">Nenhum chamado aberto.</p>}
                        </div>
                        <div className="md:col-span-2">
                            {selectedTicket ? (
                                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                                        <div><h3 className="text-lg font-bold text-slate-900">{selectedTicket.issueType}</h3><p className="text-sm text-slate-500">Fã: {selectedTicket.fanName} | Item: {selectedTicket.transactionPrizeName}</p></div>
                                        <div className="flex gap-2">
                                            <select className="text-sm border border-slate-300 rounded p-1" value={selectedTicket.status} onChange={(e) => handleTicketStatusChange(e.target.value as TicketStatus)} disabled={selectedTicket.status === TicketStatus.CLOSED}><option value="PENDING">Pendente</option><option value="IN_PROGRESS">Em Atendimento</option><option value="CLOSED">Concluído</option></select>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-lg mb-6 text-sm text-slate-700 italic">"{selectedTicket.description}"</div>
                                    <h4 className="font-bold text-slate-400 text-xs uppercase mb-3">Chat com o Fã</h4>
                                    <ChatComponent contextId={selectedTicket.id} contextType="TICKET" currentUser={user} otherUserName={selectedTicket.fanName || 'Fã'} isOpen={true} readOnly={selectedTicket.status === TicketStatus.CLOSED} />
                                </div>
                            ) : (<div className="h-64 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">Selecione um ticket</div>)}
                        </div>
                    </div>
                </div>
            )}

            {/* ANALYTICS TAB */}
            {activeTab === 'analytics' && analytics && (
                <div className="animate-in fade-in duration-300">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Analytics Avançado</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs text-slate-500 font-bold uppercase">LTV (Lifetime Value)</p><p className="text-2xl font-bold text-brand-600">R$ {analytics.ltv.toFixed(2)}</p></div>
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs text-slate-500 font-bold uppercase">Taxa de Retenção</p><p className="text-2xl font-bold text-emerald-600">{analytics.retentionRate.toFixed(1)}%</p></div>
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs text-slate-500 font-bold uppercase">Taxa de Churn</p><p className="text-2xl font-bold text-red-500">{analytics.churnRate.toFixed(1)}%</p></div>
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs text-slate-500 font-bold uppercase">Total Fãs Únicos</p><p className="text-2xl font-bold text-slate-900">{analytics.totalFans}</p></div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-900 mb-6">Receita Mensal (Últimos 6 Meses)</h3>
                            <div className="flex items-end justify-between h-64 gap-4">
                                {analytics.monthlyHistory.map((m, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                        <div className="w-full bg-brand-100 rounded-t-lg relative group-hover:bg-brand-200 transition-colors" style={{ height: `${Math.max(10, (m.revenue / (Math.max(...analytics.monthlyHistory.map(h => h.revenue)) || 1)) * 100)}%` }}>
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">R$ {m.revenue}</div>
                                        </div>
                                        <span className="text-xs text-slate-500 font-medium">{m.month}</span>
                                    </div>
                                ))}
                                {analytics.monthlyHistory.length === 0 && <p className="w-full text-center text-slate-400 self-center">Dados insuficientes.</p>}
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-900 mb-4">Top Fãs (Baleias)</h3>
                            <p className="text-xs text-slate-400 mb-4 italic">O termo 'Baleias' não é pejorativo e remete ao conceito de 'Peixe Grande' (High Spenders).</p>
                            <div className="space-y-4">
                                {analytics.topFans.map((fan, i) => (
                                    <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                                        <div><p className="font-bold text-slate-800 text-sm">{fan.fanName}</p><p className="text-xs text-slate-500">{fan.totalSpins} giros</p></div>
                                        <div className="text-right"><p className="font-bold text-brand-600 text-sm">R$ {fan.totalSpent.toFixed(2)}</p><p className="text-[10px] text-slate-400">Última: {new Date(fan.lastPurchase).toLocaleDateString()}</p></div>
                                    </div>
                                ))}
                                {analytics.topFans.length === 0 && <p className="text-slate-400 text-sm">Nenhum fã ainda.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PROFILE SETTINGS TAB */}
            {activeTab === 'profile' && (
                <div className="max-w-2xl mx-auto animate-in fade-in duration-300">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Perfil Público</h2>
                    <form onSubmit={handleSaveProfile} className="space-y-6 bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-32 h-32 rounded-full bg-slate-100 border-4 border-white shadow-md relative overflow-hidden group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                                {profileForm.avatarUrl ? <img src={profileForm.avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300 font-bold">{profileForm.name.charAt(0)}</div>}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-white text-xs font-bold">Alterar</span></div>
                                <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
                            </div>
                            <p className="text-xs text-slate-400 mt-2">Clique para alterar foto</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">Nome de Exibição</label><input type="text" className="w-full p-2.5 rounded-lg border border-slate-300" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} required /></div>
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">Usuário (URL)</label><div className="flex"><span className="bg-slate-100 border border-r-0 border-slate-300 text-slate-500 p-2.5 rounded-l-lg text-sm">/c/</span><input type="text" className="w-full p-2.5 rounded-r-lg border border-slate-300" value={profileForm.username} onChange={e => setProfileForm({ ...profileForm, username: e.target.value.replace(/[^a-zA-Z0-9]/g, '') })} required /></div></div>
                        </div>
                        <div><label className="block text-sm font-bold text-slate-700 mb-1">Bio</label><textarea className="w-full p-2.5 rounded-lg border border-slate-300 h-24" value={profileForm.bio} onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })} /></div>
                        <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">Redes Sociais</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">Instagram</label><input type="text" className="w-full p-2.5 rounded-lg border border-slate-300" placeholder="@usuario" value={profileForm.socialLinks.instagram} onChange={e => setProfileForm({ ...profileForm, socialLinks: { ...profileForm.socialLinks, instagram: e.target.value } })} /></div>
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">Twitter (X)</label><input type="text" className="w-full p-2.5 rounded-lg border border-slate-300" placeholder="@usuario" value={profileForm.socialLinks.twitter} onChange={e => setProfileForm({ ...profileForm, socialLinks: { ...profileForm.socialLinks, twitter: e.target.value } })} /></div>
                            <div className="md:col-span-2"><label className="block text-sm font-bold text-slate-700 mb-1">Website</label><input type="url" className="w-full p-2.5 rounded-lg border border-slate-300" placeholder="https://" value={profileForm.socialLinks.website} onChange={e => setProfileForm({ ...profileForm, socialLinks: { ...profileForm.socialLinks, website: e.target.value } })} /></div>
                        </div>
                        <div className="flex justify-between items-center pt-4">
                            <Button type="button" variant="secondary" onClick={handleViewProfileClick}>👁️ Visualizar Página Pública</Button>
                            <Button type="submit" isLoading={isSaving}>Salvar Perfil</Button>
                        </div>
                    </form>
                </div>
            )}

            {/* PERSONAL DATA TAB */}
            {activeTab === 'personal-data' && (
                <div className="max-w-2xl mx-auto animate-in fade-in duration-300">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Dados Pessoais (Privado)</h2>
                    <form onSubmit={handleSavePersonalData} className="space-y-6 bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                        <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600 mb-4 flex gap-3 border border-slate-200">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                            <p>Estas informações são confidenciais e usadas apenas para fins fiscais e pagamentos. Nunca serão exibidas publicamente.</p>
                        </div>
                        <div className="flex items-center gap-2 mb-4 p-3 border border-slate-200 rounded-lg">
                            <input type="checkbox" checked={personalForm.isCompany} onChange={e => setPersonalForm({ ...personalForm, isCompany: e.target.checked })} className="w-4 h-4 text-brand-600 rounded" />
                            <span className="text-sm font-bold text-slate-700">Sou Pessoa Jurídica (Empresa/MEI)</span>
                        </div>
                        {personalForm.isCompany && (
                            <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">CNPJ</label><input type="text" className="w-full p-2 rounded border border-slate-300" value={personalForm.company?.cnpj} onChange={e => setPersonalForm({ ...personalForm, company: { ...personalForm.company!, cnpj: e.target.value } })} /></div>
                                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Razão Social</label><input type="text" className="w-full p-2 rounded border border-slate-300" value={personalForm.company?.legalName} onChange={e => setPersonalForm({ ...personalForm, company: { ...personalForm.company!, legalName: e.target.value } })} /></div>
                            </div>
                        )}
                        <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">Representante Legal</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label><input type="text" className="w-full p-2.5 rounded-lg border border-slate-300" value={personalForm.fullName} onChange={e => setPersonalForm({ ...personalForm, fullName: e.target.value })} required /></div>
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">CPF</label><input type="text" className="w-full p-2.5 rounded-lg border border-slate-300" value={personalForm.cpf} onChange={e => setPersonalForm({ ...personalForm, cpf: e.target.value })} required /></div>
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">Nascimento</label><input type="date" className="w-full p-2.5 rounded-lg border border-slate-300" value={personalForm.birthDate} onChange={e => setPersonalForm({ ...personalForm, birthDate: e.target.value })} required /></div>
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">Celular</label><input type="tel" className="w-full p-2.5 rounded-lg border border-slate-300" value={personalForm.phoneNumber} onChange={e => setPersonalForm({ ...personalForm, phoneNumber: e.target.value })} required /></div>
                        </div>
                        <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">Endereço Fiscal</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-1"><label className="block text-sm font-bold text-slate-700 mb-1">CEP</label><input type="text" className="w-full p-2.5 rounded-lg border border-slate-300" value={personalForm.address.zipCode} onChange={e => setPersonalForm({ ...personalForm, address: { ...personalForm.address, zipCode: e.target.value } })} required /></div>
                            <div className="col-span-2"><label className="block text-sm font-bold text-slate-700 mb-1">Rua</label><input type="text" className="w-full p-2.5 rounded-lg border border-slate-300" value={personalForm.address.street} onChange={e => setPersonalForm({ ...personalForm, address: { ...personalForm.address, street: e.target.value } })} required /></div>
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">Número</label><input type="text" className="w-full p-2.5 rounded-lg border border-slate-300" value={personalForm.address.number} onChange={e => setPersonalForm({ ...personalForm, address: { ...personalForm.address, number: e.target.value } })} required /></div>
                            <div className="col-span-2"><label className="block text-sm font-bold text-slate-700 mb-1">Cidade - UF</label><input type="text" className="w-full p-2.5 rounded-lg border border-slate-300" value={personalForm.address.city} onChange={e => setPersonalForm({ ...personalForm, address: { ...personalForm.address, city: e.target.value } })} required /></div>
                        </div>
                        <div className="flex justify-end pt-4"><Button type="submit" isLoading={isSaving}>Salvar Dados</Button></div>
                    </form>
                </div>
            )}

            {/* NEW CAMPAIGN MODAL */}
            {isCampaignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Nova Campanha</h3>
                        <form onSubmit={handleCreateCampaign} className="space-y-4">
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">Título</label><input type="text" className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Ex: Pack de Verão" value={newCampTitle} onChange={e => setNewCampTitle(e.target.value)} required /></div>
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">Slug (URL)</label><div className="flex items-center"><span className="bg-slate-100 border border-r-0 border-slate-300 text-slate-500 p-2 rounded-l-lg text-sm">/</span><input type="text" className="w-full p-2 rounded-r-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="pack-verao" value={newCampSlug} onChange={e => setNewCampSlug(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())} required /></div></div>
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">Preço por Giro (R$)</label><input type="number" step="0.01" className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" value={newCampPrice} onChange={e => setNewCampPrice(parseFloat(e.target.value))} required /></div>
                            <div className="flex gap-3 pt-4"><Button variant="secondary" fullWidth type="button" onClick={() => setCampaignModalOpen(false)}>Cancelar</Button><Button fullWidth type="submit" isLoading={isSaving}>Criar Campanha</Button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELIVERY MODAL */}
            {isDeliveryModalOpen && selectedDelivery && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95">
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Gerenciar Entrega</h3>
                        <div className="bg-slate-50 p-4 rounded-lg mb-4 text-sm space-y-2">
                            <p><strong>Item:</strong> {selectedDelivery.prizeWon}</p>
                            <p><strong>Fã:</strong> {selectedDelivery.fanName}</p>
                            <p><strong>Endereço:</strong> {selectedDelivery.shippingAddress ? `${selectedDelivery.shippingAddress.street}, ${selectedDelivery.shippingAddress.number} - ${selectedDelivery.shippingAddress.city}` : 'Não informado'}</p>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
                                <select className="w-full p-2 rounded border border-slate-300" value={deliveryStatus} onChange={(e) => setDeliveryStatus(e.target.value as DeliveryStatus)}>
                                    <option value="PENDING">Pendente</option>
                                    <option value="TRANSIT">Em Trânsito</option>
                                    <option value="DELIVERED">Entregue</option>
                                    <option value="RETURNED">Devolvido</option>
                                </select>
                            </div>
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">Código de Rastreio</label><input type="text" className="w-full p-2 rounded border border-slate-300" value={trackingCode} onChange={e => setTrackingCode(e.target.value)} placeholder="Ex: AA123456789BR" /></div>
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">Link de Rastreio (Opcional)</label><input type="url" className="w-full p-2 rounded border border-slate-300" value={trackingUrl} onChange={e => setTrackingUrl(e.target.value)} placeholder="https://..." /></div>
                        </div>
                        <h4 className="font-bold text-slate-900 mt-6 mb-2">Falar com o Fã</h4>
                        <ChatComponent contextId={selectedDelivery.id} contextType="DELIVERY" currentUser={user} otherUserName={selectedDelivery.fanName} isOpen={true} />
                        <div className="flex gap-3 pt-6 mt-4 border-t border-slate-100">
                            <Button variant="secondary" fullWidth onClick={() => setIsDeliveryModalOpen(false)}>Cancelar</Button>
                            <Button fullWidth onClick={handleSaveDelivery} isLoading={isSaving}>Salvar Alterações</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
