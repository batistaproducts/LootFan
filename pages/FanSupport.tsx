
import React, { useState, useEffect } from 'react';
import { User, SupportTicket, TicketStatus } from '../types';
import { dbService } from '../services/mockService';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';
import { ChatComponent } from '../components/ChatComponent';

interface FanSupportProps {
  user: User;
}

export const FanSupport: React.FC<FanSupportProps> = ({ user }) => {
  const toast = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  useEffect(() => {
    loadTickets();
  }, [user.id]);

  const loadTickets = async () => {
    setLoading(true);
    const data = await dbService.getTicketsByFan(user.id);
    setTickets(data);
    setLoading(false);
  };

  const handleEscalate = async (ticket: SupportTicket) => {
      if (!window.confirm("Deseja acionar a equipe LootFan? Use esta opção apenas se o creator não responder há muito tempo.")) return;
      try {
          await dbService.escalateTicket(ticket.id);
          toast.success("O chamado foi marcado como Risco e nossa equipe foi notificada.");
          loadTickets();
      } catch (e) {
          toast.error("Erro ao escalar chamado.");
      }
  }

  const handleCloseTicket = async (ticket: SupportTicket) => {
      if (!window.confirm("Deseja encerrar este chamado?")) return;
      try {
          await dbService.updateTicketStatus(ticket.id, TicketStatus.CLOSED);
          toast.success("Chamado encerrado.");
          
          // Atualiza estado local para feedback visual imediato
          setTickets(prev => prev.map(t => t.id === ticket.id ? {...t, status: TicketStatus.CLOSED} : t));
          setSelectedTicket(prev => prev ? {...prev, status: TicketStatus.CLOSED} : null);
          
      } catch (e) {
          toast.error("Erro ao encerrar chamado.");
      }
  }

  // Verifica se o ticket tem mais de 30 dias para permitir escalonamento
  const canEscalate = (ticket: SupportTicket) => {
      const created = new Date(ticket.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - created.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 30 && ticket.status !== TicketStatus.CLOSED && !ticket.isRisk;
  }

  if (loading) return <div className="p-12 text-center text-brand-600">Carregando suporte...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
       <h1 className="text-3xl font-bold text-slate-900 mb-8 flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-brand-600"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" /></svg>
          Meus Chamados de Suporte
       </h1>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {/* LISTA DE CHAMADOS */}
           <div className="md:col-span-1 space-y-4">
               {tickets.length === 0 && <p className="text-slate-500 text-sm">Nenhum chamado aberto.</p>}
               {tickets.map(ticket => (
                   <div 
                     key={ticket.id} 
                     onClick={() => setSelectedTicket(ticket)}
                     className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedTicket?.id === ticket.id ? 'bg-brand-50 border-brand-500 shadow-md' : 'bg-white border-slate-200 hover:border-brand-200'}`}
                   >
                       <div className="flex justify-between items-start mb-2">
                           <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                               ticket.status === TicketStatus.CLOSED ? 'bg-slate-100 text-slate-500' : 
                               ticket.status === TicketStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                           }`}>
                               {ticket.status}
                           </span>
                           <span className="text-xs text-slate-400">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                       </div>
                       <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{ticket.issueType}</h3>
                       <p className="text-xs text-slate-500 mt-1">Creator: {ticket.creatorName}</p>
                   </div>
               ))}
           </div>

           {/* DETALHES DO CHAMADO */}
           <div className="md:col-span-2">
               {selectedTicket ? (
                   <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                       <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-100">
                           <div>
                               <h2 className="text-xl font-bold text-slate-900">{selectedTicket.issueType}</h2>
                               <p className="text-sm text-slate-500 mt-1">Prêmio: {selectedTicket.transactionPrizeName}</p>
                           </div>
                           <div className="flex gap-2">
                               {canEscalate(selectedTicket) && (
                                   <Button size="sm" variant="danger" onClick={() => handleEscalate(selectedTicket)}>
                                       ⚠️ Acionar LootFan (Risco)
                                   </Button>
                               )}
                               {selectedTicket.status !== TicketStatus.CLOSED && (
                                   <Button size="sm" variant="secondary" onClick={() => handleCloseTicket(selectedTicket)}>
                                       Encerrar Chamado
                                   </Button>
                               )}
                           </div>
                       </div>

                       <div className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-100">
                           <p className="text-slate-700 text-sm italic">"{selectedTicket.description}"</p>
                       </div>

                       <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Chat com Creator</h3>
                       <ChatComponent 
                           contextId={selectedTicket.id}
                           contextType="TICKET"
                           currentUser={user}
                           otherUserName={selectedTicket.creatorName || 'Creator'}
                           isOpen={true}
                       />
                       {selectedTicket.status === TicketStatus.CLOSED && (
                           <p className="text-center text-sm text-slate-400 mt-4">Este chamado está encerrado. O chat é apenas leitura.</p>
                       )}
                   </div>
               ) : (
                   <div className="h-64 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                       Selecione um chamado para ver os detalhes
                   </div>
               )}
           </div>
       </div>
    </div>
  );
};
