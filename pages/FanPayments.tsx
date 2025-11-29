
import React, { useState, useEffect } from 'react';
import { User, PaymentMethod, CampaignBalance } from '../types';
import { dbService } from '../services/mockService';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';

interface FanPaymentsProps {
  user: User;
  onNavigateToCampaign: (slug: string) => void;
}

export const FanPayments: React.FC<FanPaymentsProps> = ({ user, onNavigateToCampaign }) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'methods' | 'history'>('methods');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [balances, setBalances] = useState<CampaignBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingCard, setIsAddingCard] = useState(false);

  // New Card Form
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVC, setCardCVC] = useState('');
  const [cardName, setCardName] = useState('');

  useEffect(() => {
      loadData();
  }, [user.id]);

  const loadData = async () => {
      setLoading(true);
      try {
          const [methods, bal] = await Promise.all([
              dbService.getPaymentMethods(user.id),
              dbService.getAllFanBalances(user.id)
          ]);
          setPaymentMethods(methods);
          setBalances(bal);
      } catch (e) {
          toast.error("Erro ao carregar dados financeiros.");
      } finally {
          setLoading(false);
      }
  }

  const handleAddCard = async (e: React.FormEvent) => {
      e.preventDefault();
      if(cardNumber.length < 16 || cardCVC.length < 3) {
          toast.error("Dados do cartão inválidos.");
          return;
      }
      setIsAddingCard(true);
      try {
          await dbService.addPaymentMethod(user.id, cardNumber, cardExpiry, cardCVC);
          toast.success("Cartão adicionado com segurança!");
          setCardNumber('');
          setCardExpiry('');
          setCardCVC('');
          setCardName('');
          loadData();
      } catch (e) {
          toast.error("Erro ao salvar cartão.");
      } finally {
          setIsAddingCard(false);
      }
  }

  const handleDeleteCard = async (id: string) => {
      if(!window.confirm("Remover este cartão?")) return;
      try {
          await dbService.deletePaymentMethod(id);
          toast.success("Cartão removido.");
          loadData();
      } catch(e) {
          toast.error("Erro ao remover.");
      }
  }

  if (loading) return <div className="p-12 text-center text-brand-600">Carregando carteira...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-8 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-brand-600"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg>
            Minha Carteira
        </h1>

        <div className="border-b border-slate-200 mb-6">
            <nav className="flex gap-6">
                <button 
                    onClick={() => setActiveTab('methods')}
                    className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'methods' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Meus Cartões
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Saldos & Histórico
                </button>
            </nav>
        </div>

        {activeTab === 'methods' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-left-4">
                {/* LISTA DE CARTÕES */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-700 mb-2">Cartões Salvos</h3>
                    {paymentMethods.length === 0 && <p className="text-slate-400 italic text-sm">Nenhum cartão salvo.</p>}
                    {paymentMethods.map(pm => (
                        <div key={pm.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center group">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-6 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                    {pm.brand}
                                </div>
                                <div>
                                    <p className="font-mono text-slate-700 font-bold">•••• {pm.last4}</p>
                                    <p className="text-xs text-slate-400">Cartão de Crédito</p>
                                </div>
                            </div>
                            <button onClick={() => handleDeleteCard(pm.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                            </button>
                        </div>
                    ))}
                </div>

                {/* NOVO CARTÃO */}
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-brand-600"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                        Adicionar Novo Cartão
                    </h3>
                    <form onSubmit={handleAddCard} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome no Cartão</label>
                            <input type="text" className="w-full p-2 rounded border border-slate-300 text-sm" value={cardName} onChange={e => setCardName(e.target.value)} placeholder="NOME COMO NO CARTAO" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Número</label>
                            <input type="text" className="w-full p-2 rounded border border-slate-300 text-sm font-mono" value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="0000 0000 0000 0000" maxLength={16} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Validade</label>
                                <input type="text" className="w-full p-2 rounded border border-slate-300 text-sm" value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} placeholder="MM/AA" maxLength={5} required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CVC</label>
                                <input type="text" className="w-full p-2 rounded border border-slate-300 text-sm" value={cardCVC} onChange={e => setCardCVC(e.target.value)} placeholder="123" maxLength={4} required />
                            </div>
                        </div>
                        
                        <div className="pt-2 text-[10px] text-slate-400 text-justify">
                            <span className="flex items-center gap-1 mb-1 font-bold text-emerald-600"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" /></svg> Ambiente Seguro</span>
                            Seus dados são criptografados e enviados diretamente para o processador de pagamentos (Tokenização). A LootFan não armazena o número completo do seu cartão, atendendo às normas PCI-DSS e LGPD.
                        </div>

                        <Button fullWidth isLoading={isAddingCard}>Salvar Cartão</Button>
                    </form>
                </div>
            </div>
        )}

        {activeTab === 'history' && (
            <div className="animate-in fade-in slide-in-from-right-4">
                <h3 className="font-bold text-slate-700 mb-4">Saldos Disponíveis em Campanhas</h3>
                {balances.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400">
                        Você não possui créditos ativos em nenhuma campanha.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {balances.map((bal, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                                <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                                    {bal.campaignCover ? (
                                        <img src={bal.campaignCover} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">🎁</div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-900">{bal.campaignTitle}</h4>
                                    <p className="text-xs text-slate-500">Creator: {bal.creatorName}</p>
                                    <div className="mt-1 inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold border border-emerald-100">
                                        {bal.balance} Aberturas Disponíveis
                                    </div>
                                </div>
                                <Button size="sm" onClick={() => onNavigateToCampaign(bal.campaignSlug)}>
                                    Abrir Agora
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
    </div>
  );
};
