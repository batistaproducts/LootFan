
import React, { useState, useEffect } from 'react';
import { User, Transaction, PrizeType, SUPPORT_ISSUES, SupportTicket, TicketStatus, DeliveryStatus } from '../types';
import { dbService } from '../services/mockService';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';

interface FanPrizesProps {
  user: User;
}

export const FanPrizes: React.FC<FanPrizesProps> = ({ user }) => {
  const toast = useToast();
  const [prizes, setPrizes] = useState<Transaction[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal de Detalhes (Novo)
  const [selectedDetailPrize, setSelectedDetailPrize] = useState<Transaction | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Modal de Confirmação para Visualização Única
  const [selectedPrizeToConsume, setSelectedPrizeToConsume] = useState<Transaction | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);

  // Modal Suporte
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportForm, setSupportForm] = useState({
      transactionId: '',
      issueType: SUPPORT_ISSUES[0],
      description: '',
      contactEmail: user.email,
      contactPhone: user.personalData?.phoneNumber || ''
  });
  const [isSendingTicket, setIsSendingTicket] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
       setLoading(true);
       const [prizesData, ticketsData] = await Promise.all([
           dbService.getFanTransactions(user.id),
           dbService.getTicketsByFan(user.id)
       ]);
       setPrizes(prizesData);
       setTickets(ticketsData);
       setLoading(false);
    };
    fetchData();
  }, [user.id]);

  // Função helper para verificar se existe ticket aberto
  const hasOpenTicket = (transactionId: string) => {
      return tickets.some(t => t.transactionId === transactionId && t.status !== TicketStatus.CLOSED);
  };

  const getTicketStatus = (transactionId: string) => {
      return tickets.find(t => t.transactionId === transactionId && t.status !== TicketStatus.CLOSED);
  };

  const handleOpenDetails = (prize: Transaction) => {
      setSelectedDetailPrize(prize);
      setShowDetailsModal(true);
  };

  // Lógica de ação principal do Modal de Detalhes
  const handlePrimaryAction = (prize: Transaction) => {
      if (prize.prizeType === PrizeType.PHYSICAL) {
          if (prize.trackingUrl) {
              window.open(prize.trackingUrl, '_blank');
              toast.success("Rastreamento aberto em nova aba.");
          } else if (prize.trackingCode) {
              navigator.clipboard.writeText(prize.trackingCode);
              toast.success("Código de rastreio copiado! Consulte no site dos Correios/Transportadora.");
          } else {
              toast.info("Aguardando código de rastreio do Creator.");
          }
          return;
      }

      if (prize.prizeType === PrizeType.DIGITAL) {
          if (prize.prizeContent) {
             window.open(prize.prizeContent, '_blank');
             toast.success("Conteúdo aberto em nova aba.");
          } else {
             toast.error("Link do conteúdo indisponível.");
          }
          return;
      }

      if (prize.prizeType === PrizeType.SINGLE_VIEW) {
          if (prize.isConsumed) {
              toast.error("Este item já foi visualizado e não pode ser aberto novamente.");
              return;
          }
          // Fecha modal de detalhes e abre o de confirmação
          setShowDetailsModal(false);
          setSelectedPrizeToConsume(prize);
          setShowConfirmModal(true);
      }
  };

  const confirmSingleView = async () => {
      if (!selectedPrizeToConsume) return;
      try {
          await dbService.consumePrize(selectedPrizeToConsume.id);
          setPrizes(prizes.map(p => p.id === selectedPrizeToConsume.id ? { ...p, isConsumed: true } : p));
          setShowConfirmModal(false);
          setShowContentModal(true);
      } catch (e) {
          toast.error("Erro ao validar visualização.");
      }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!supportForm.transactionId) {
          toast.error("Selecione o prêmio relacionado ao problema.");
          return;
      }
      if(!supportForm.description) {
          toast.error("Descreva o problema.");
          return;
      }

      setIsSendingTicket(true);
      try {
          const trans = prizes.find(p => p.id === supportForm.transactionId);
          if(!trans) throw new Error("Transação inválida.");
          
          if (!trans.creatorId) throw new Error("Não foi possível identificar o Creator da transação.");

          await dbService.createSupportTicket(
              user.id,
              trans.creatorId,
              supportForm.transactionId,
              supportForm.issueType,
              supportForm.description,
              supportForm.contactEmail,
              supportForm.contactPhone
          );

          toast.success("Chamado aberto com sucesso!");
          setShowSupportModal(false);
          setSupportForm({ ...supportForm, description: '', transactionId: '' });
          
          // Refresh tickets
          const newTickets = await dbService.getTicketsByFan(user.id);
          setTickets(newTickets);

      } catch (e: any) {
          console.error(e);
          toast.error(e.message || "Erro ao abrir chamado. Tente novamente.");
      } finally {
          setIsSendingTicket(false);
      }
  }

  if (loading) return <div className="p-12 text-center text-brand-600">Carregando seus prêmios...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-24">
       <h1 className="text-3xl font-bold text-slate-900 mb-8 flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-brand-600"><path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H4.5a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>
          Meus Prêmios
       </h1>

       {prizes.length === 0 ? (
           <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center">
               <p className="text-slate-500 mb-4">Você ainda não ganhou nenhum prêmio.</p>
               <Button onClick={() => window.location.href='/'} variant="secondary">Explorar Creators</Button>
           </div>
       ) : (
           <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                 <thead className="bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider">
                     <tr>
                         <th className="py-4 px-6">Produto</th>
                         <th className="py-4 px-6">Creator</th>
                         <th className="py-4 px-6">Tipo</th>
                         <th className="py-4 px-6">Data</th>
                         <th className="py-4 px-6">Status/Alertas</th>
                         <th className="py-4 px-6 text-right">Ação</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                     {prizes.map(prize => {
                         const openTicket = getTicketStatus(prize.id);
                         return (
                            <tr key={prize.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-4 px-6 font-medium text-slate-900">{prize.prizeWon}</td>
                                <td className="py-4 px-6 text-slate-600">{prize.creatorName}</td>
                                <td className="py-4 px-6">
                                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-md border tracking-wide uppercase shadow-sm ${
                                        prize.prizeType === PrizeType.PHYSICAL ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                        prize.prizeType === PrizeType.SINGLE_VIEW ? 'bg-purple-900 text-purple-50 border-purple-950' :
                                        'bg-blue-50 text-blue-700 border-blue-200'
                                    }`}>
                                        {prize.prizeType === PrizeType.PHYSICAL ? 'FÍSICO' : 
                                        prize.prizeType === PrizeType.SINGLE_VIEW ? 'ACESSO ÚNICO' : 'DIGITAL'}
                                    </span>
                                </td>
                                <td className="py-4 px-6 text-slate-500 text-sm">{new Date(prize.date).toLocaleDateString('pt-BR')}</td>
                                <td className="py-4 px-6">
                                    <div className="flex flex-col gap-1 items-start">
                                        {openTicket && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded border border-yellow-200" title="Existe um chamado em aberto para este item">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-5.5-2.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM10 12a5.99 5.99 0 0 0-4.793 2.39A9.948 9.948 0 0 0 10 18a9.948 9.948 0 0 0 4.793-3.61A5.99 5.99 0 0 0 10 12Z" clipRule="evenodd" />
                                                </svg>
                                                Suporte Aberto
                                            </span>
                                        )}
                                        {prize.prizeType === PrizeType.SINGLE_VIEW && prize.isConsumed && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" /></svg>
                                                Já Consumido
                                            </span>
                                        )}
                                        {prize.prizeType === PrizeType.PHYSICAL && prize.deliveryStatus && prize.deliveryStatus !== DeliveryStatus.PENDING && (
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                                                prize.deliveryStatus === DeliveryStatus.DELIVERED ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-blue-100 text-blue-700 border-blue-200'
                                            }`}>
                                                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M6.5 3c-1.051 0-2.093.04-3.125.117A1.49 1.49 0 0 0 2 4.607V10.5h9V4.606c0-.771-.59-1.43-1.375-1.489A41.568 41.568 0 0 0 6.5 3ZM2 12v2.5A1.5 1.5 0 0 0 3.5 16h.041a3 3 0 0 1 5.918 0h.791a.75.75 0 0 0 .75-.75V12H2Z" /><path d="M6.5 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM13.25 5a.75.75 0 0 0-.75.75v8.514a3.001 3.001 0 0 1 4.893 1.44c.37-.275.61-.719.595-1.231l-.034-2.245a6 6 0 0 0-1.671-3.939l-1.353-1.354a.75.75 0 0 0-.53-.22h-1.15Z" /></svg>
                                                {prize.deliveryStatus}
                                            </span>
                                        )}
                                        {!openTicket && (!prize.deliveryStatus || prize.deliveryStatus === DeliveryStatus.PENDING) && prize.prizeType === PrizeType.PHYSICAL && (
                                            <span className="text-[10px] text-slate-400 italic">Pendente envio</span>
                                        )}
                                    </div>
                                </td>
                                <td className="py-4 px-6 text-right">
                                    <Button size="sm" onClick={() => handleOpenDetails(prize)} variant="secondary" className="border-slate-300 text-slate-600 hover:text-brand-600">
                                        Detalhes
                                    </Button>
                                </td>
                            </tr>
                         )
                     })}
                 </tbody>
              </table>
           </div>
       )}

       {/* MODAL DE DETALHES DO PRÊMIO */}
       {showDetailsModal && selectedDetailPrize && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
               <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                        <h3 className="text-xl font-bold text-slate-900 truncate pr-4">{selectedDetailPrize.prizeWon}</h3>
                        <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1">
                        
                        {/* ALERTA VISUAL DE CONSUMO */}
                        {selectedDetailPrize.isConsumed && (
                             <div className="bg-slate-100 border-l-4 border-slate-400 text-slate-700 p-4 mb-6 rounded-r-lg flex items-start gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0 text-slate-500"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" /></svg>
                                <div>
                                    <p className="font-bold">Conteúdo Já Visualizado</p>
                                    <p className="text-sm">Este item de acesso único já foi consumido e não está mais disponível.</p>
                                </div>
                             </div>
                        )}

                        {/* IMAGEM DO PRODUTO (Somente se cadastrada) */}
                        {selectedDetailPrize.prizeImageUrl && (
                           <div className="w-full h-48 bg-slate-100 rounded-xl mb-6 overflow-hidden border border-slate-200 flex items-center justify-center shadow-inner relative">
                               <img src={selectedDetailPrize.prizeImageUrl} className="w-full h-full object-cover" />
                               <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                                    <span className="text-white text-xs font-bold bg-black/40 px-2 py-1 rounded backdrop-blur-sm">
                                        Foto do produto no momento da compra
                                    </span>
                               </div>
                           </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Campanha</label>
                                    <p className="text-slate-900 font-medium">{selectedDetailPrize.campaignTitle || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Creator</label>
                                    <p className="text-slate-900 font-medium">{selectedDetailPrize.creatorName}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Tipo</label>
                                    <div className="mt-1">
                                        <span className={`text-xs font-bold px-2 py-1 rounded border ${
                                            selectedDetailPrize.prizeType === PrizeType.PHYSICAL ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                            selectedDetailPrize.prizeType === PrizeType.SINGLE_VIEW ? 'bg-purple-900 text-white border-purple-950' :
                                            'bg-blue-50 text-blue-700 border-blue-200'
                                        }`}>
                                            {selectedDetailPrize.prizeType === PrizeType.PHYSICAL ? 'FÍSICO - REQUER ENVIO' : 
                                            selectedDetailPrize.prizeType === PrizeType.SINGLE_VIEW ? 'ACESSO ÚNICO' : 'DIGITAL - DOWNLOAD'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Informações de Entrega / Conteúdo</label>
                                
                                {selectedDetailPrize.prizeType === PrizeType.PHYSICAL ? (
                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <p className="font-semibold text-slate-700">Status:</p>
                                            <p>{selectedDetailPrize.deliveryStatus || 'Pendente'}</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">Rastreio:</p>
                                            {selectedDetailPrize.trackingCode ? (
                                                <p className="font-mono bg-white border border-slate-200 px-2 py-1 rounded inline-block mt-1 select-all">
                                                    {selectedDetailPrize.trackingCode}
                                                </p>
                                            ) : (
                                                <p className="text-slate-400 italic">Ainda não informado</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">Enviado para:</p>
                                            <p className="text-slate-500 text-xs mt-1">
                                                {selectedDetailPrize.shippingAddress?.street}, {selectedDetailPrize.shippingAddress?.number} <br/>
                                                {selectedDetailPrize.shippingAddress?.city} - {selectedDetailPrize.shippingAddress?.state}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500">
                                        Este é um item digital. Clique no botão de visualização para acessar seu conteúdo.
                                        {selectedDetailPrize.prizeType === PrizeType.SINGLE_VIEW && (
                                            <span className="block mt-2 text-purple-600 font-bold">Atenção: Acesso único!</span>
                                        )}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
                        <button 
                            onClick={() => { setShowDetailsModal(false); setShowSupportModal(true); setSupportForm({...supportForm, transactionId: selectedDetailPrize.id}); }}
                            className="text-sm text-slate-500 hover:text-slate-800 underline"
                        >
                            Relatar Problema
                        </button>
                        
                        <div className="flex gap-3 w-full sm:w-auto">
                            <Button variant="secondary" onClick={() => setShowDetailsModal(false)} className="flex-1 sm:flex-none">
                                Fechar
                            </Button>
                            <Button 
                                onClick={() => handlePrimaryAction(selectedDetailPrize)} 
                                disabled={selectedDetailPrize.isConsumed}
                                className="flex-1 sm:flex-none shadow-brand-500/20"
                            >
                                {selectedDetailPrize.prizeType === PrizeType.PHYSICAL ? 'Acompanhar' : 'Visualizar'}
                            </Button>
                        </div>
                    </div>
               </div>
           </div>
       )}

       {/* SUPPORT FOOTER */}
       <div className="mt-12 bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
           <h3 className="text-lg font-bold text-slate-900 mb-2">Precisa de Ajuda?</h3>
           <p className="text-slate-500 text-sm mb-4">
               Em caso de problemas com o produto, ou solicitação de suporte, clique no link abaixo.
           </p>
           <button 
             onClick={() => setShowSupportModal(true)}
             className="text-brand-600 font-bold hover:underline hover:text-brand-700"
           >
               Abrir Solicitação de Suporte
           </button>
       </div>

       {/* Modal Suporte */}
       {showSupportModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
               <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95 h-[90vh] overflow-y-auto">
                   <div className="flex justify-between items-center mb-6">
                       <h3 className="text-xl font-bold text-slate-900">Solicitação de Suporte</h3>
                       <button onClick={() => setShowSupportModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                   </div>
                   
                   <form onSubmit={handleSubmitTicket} className="space-y-4">
                       <div>
                           <label className="block text-sm font-bold text-slate-700 mb-1">Prêmio com Problema</label>
                           <select 
                             className="w-full p-2.5 rounded-lg border border-slate-300"
                             value={supportForm.transactionId}
                             onChange={e => setSupportForm({...supportForm, transactionId: e.target.value})}
                             required
                           >
                               <option value="">Selecione...</option>
                               {prizes.map(p => (
                                   <option key={p.id} value={p.id}>
                                       {p.prizeWon} ({p.creatorName})
                                   </option>
                               ))}
                           </select>
                       </div>

                       <div>
                           <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Problema</label>
                           <select 
                             className="w-full p-2.5 rounded-lg border border-slate-300"
                             value={supportForm.issueType}
                             onChange={e => setSupportForm({...supportForm, issueType: e.target.value})}
                           >
                               {SUPPORT_ISSUES.map(issue => (
                                   <option key={issue} value={issue}>{issue}</option>
                               ))}
                           </select>
                       </div>

                       <div>
                           <label className="block text-sm font-bold text-slate-700 mb-1">Seus Dados de Contato</label>
                           <input type="text" value={user.name} disabled className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 mb-2 text-slate-500" />
                           <input type="email" value={supportForm.contactEmail} onChange={e => setSupportForm({...supportForm, contactEmail: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-300 mb-2" placeholder="Seu E-mail" required />
                           <input type="tel" value={supportForm.contactPhone} onChange={e => setSupportForm({...supportForm, contactPhone: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-300" placeholder="Seu Telefone" required />
                       </div>

                       <div>
                           <label className="block text-sm font-bold text-slate-700 mb-1">Descrição do Problema</label>
                           <textarea 
                             className="w-full p-2.5 rounded-lg border border-slate-300 h-32"
                             placeholder="Descreva detalhadamente o que aconteceu..."
                             value={supportForm.description}
                             onChange={e => setSupportForm({...supportForm, description: e.target.value})}
                             required
                           ></textarea>
                       </div>

                       <div className="pt-2">
                           <Button fullWidth size="lg" type="submit" isLoading={isSendingTicket}>Enviar Solicitação</Button>
                       </div>
                   </form>
               </div>
           </div>
       )}

       {/* Modal de Confirmação Single View (Existing) */}
       {showConfirmModal && selectedPrizeToConsume && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
               <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
                   <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                   </div>
                   <h3 className="text-xl font-bold text-center text-slate-900 mb-2">Atenção: Visualização Única</h3>
                   <p className="text-center text-slate-500 mb-6">
                       Este conteúdo só poderá ser aberto <strong>uma única vez</strong>. 
                       Ao confirmar, o link será exibido e expirará logo em seguida.
                       Certifique-se de que pode salvar ou consumir o conteúdo agora.
                   </p>
                   <div className="flex gap-3">
                       <Button variant="secondary" fullWidth onClick={() => setShowConfirmModal(false)}>Cancelar</Button>
                       <Button variant="danger" fullWidth onClick={confirmSingleView}>Confirmar e Abrir</Button>
                   </div>
               </div>
           </div>
       )}

       {/* Modal de Conteúdo (Existing) */}
       {showContentModal && selectedPrizeToConsume && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
               <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl animate-in zoom-in-95">
                   <h3 className="text-xl font-bold text-slate-900 mb-4 border-b border-slate-100 pb-4">
                       Conteúdo Exclusivo
                   </h3>
                   <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center break-all mb-6">
                       {selectedPrizeToConsume.prizeContent?.startsWith('http') ? (
                           <a href={selectedPrizeToConsume.prizeContent} target="_blank" rel="noreferrer" className="text-brand-600 font-bold underline hover:text-brand-700 text-lg">
                               {selectedPrizeToConsume.prizeContent}
                           </a>
                       ) : (
                           <p className="text-slate-800 font-medium text-lg">{selectedPrizeToConsume.prizeContent}</p>
                       )}
                   </div>
                   <p className="text-center text-red-500 text-sm mb-6 font-medium">
                       Este acesso foi consumido e não estará mais disponível.
                   </p>
                   <Button fullWidth onClick={() => setShowContentModal(false)}>Fechar Janela</Button>
               </div>
           </div>
       )}
    </div>
  );
};
