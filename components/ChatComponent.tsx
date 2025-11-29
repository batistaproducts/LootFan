
import React, { useState, useEffect, useRef } from 'react';
import { User, ChatMessage, UserRole } from '../types';
import { dbService } from '../services/mockService';
import { Button } from './Button';
import { useToast } from './Toast';

interface ChatComponentProps {
  contextId: string;
  contextType: 'DELIVERY' | 'TICKET';
  currentUser: User;
  otherUserName: string; // O nome da outra pessoa no chat
  isOpen: boolean;
  readOnly?: boolean; // Novo: Bloqueia interação se true
}

export const ChatComponent: React.FC<ChatComponentProps> = ({ contextId, contextType, currentUser, otherUserName, isOpen, readOnly = false }) => {
  const toast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
      setLoading(true);
      const msgs = await dbService.getChatMessages(contextId, contextType);
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  useEffect(() => {
      if (isOpen) {
          fetchMessages();
          // Simulação de polling (em prod usaríamos Supabase Realtime)
          const interval = setInterval(() => {
              dbService.getChatMessages(contextId, contextType).then(setMessages);
          }, 5000);
          return () => clearInterval(interval);
      }
  }, [isOpen, contextId]);

  const handleSend = async () => {
      if (!newMessage.trim()) return;
      setSending(true);
      try {
          await dbService.sendChatMessage(contextId, contextType, currentUser.id, newMessage);
          setNewMessage('');
          await fetchMessages();
      } catch (e: any) {
          toast.error(e.message || "Erro ao enviar mensagem.");
      } finally {
          setSending(false);
      }
  };

  // Regra de Bloqueio Visual para o Fã
  const canSend = () => {
      if (readOnly) return false;
      if (currentUser.role === UserRole.CREATOR) return true;
      if (currentUser.role === UserRole.FAN) {
          if (messages.length === 0 && contextType === 'DELIVERY') return false; // Creator starts delivery chat
          if (messages.length > 0) {
              const lastMsg = messages[messages.length - 1];
              // Se a última msg foi minha (Fã), não posso mandar outra.
              if (lastMsg.senderId === currentUser.id) return false;
          }
      }
      return true;
  };

  const isBlocked = !canSend();

  return (
    <div className="flex flex-col h-[400px] border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
        {/* Header */}
        <div className="bg-white p-3 border-b border-slate-200 shadow-sm flex justify-between items-center">
             <span className="font-bold text-slate-700 text-sm">Chat com {otherUserName}</span>
             <button onClick={fetchMessages} className="text-slate-400 hover:text-brand-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
             </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
             {loading && messages.length === 0 && <p className="text-center text-xs text-slate-400">Carregando...</p>}
             {messages.length === 0 && !loading && <p className="text-center text-xs text-slate-400 py-10">Nenhuma mensagem ainda.</p>}
             
             {messages.map(msg => {
                 const isMe = msg.senderId === currentUser.id;
                 return (
                     <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                         <div className={`max-w-[80%] rounded-xl p-3 text-sm ${isMe ? 'bg-brand-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'}`}>
                             <p>{msg.content}</p>
                             <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-brand-200' : 'text-slate-400'}`}>
                                 {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </p>
                         </div>
                     </div>
                 )
             })}
             <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        {readOnly ? (
            <div className="p-3 bg-slate-100 border-t border-slate-200 text-center text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                Atendimento Encerrado
            </div>
        ) : (
            <div className="p-3 bg-white border-t border-slate-200">
                {isBlocked ? (
                    <div className="text-center p-2 bg-yellow-50 text-yellow-700 text-xs rounded border border-yellow-200">
                        Aguarde a resposta de {otherUserName} para enviar outra mensagem.
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                            placeholder="Digite sua mensagem..."
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                        />
                        <Button size="sm" onClick={handleSend} isLoading={sending}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5" /></svg>
                        </Button>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};
