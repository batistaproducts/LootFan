
import React, { useState } from 'react';
import { Button } from './Button';
import { User, UserRole } from '../types';
import { dbService } from '../services/mockService';
import { useToast } from './Toast';

interface TermsModalProps {
  user: User;
  onAccepted: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ user, onAccepted }) => {
  const toast = useToast();
  const [isAccepting, setIsAccepting] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
        setScrolledToBottom(true);
    }
  };

  const handleAccept = async () => {
      if (!scrolledToBottom) {
          toast.error("Por favor, leia os termos até o final.");
          return;
      }
      setIsAccepting(true);
      try {
          await dbService.acceptTerms(user.id);
          toast.success("Termos aceitos. Obrigado!");
          onAccepted();
      } catch (error) {
          toast.error("Erro ao registrar aceite.");
      } finally {
          setIsAccepting(false);
      }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
        <div className="bg-white w-full max-w-2xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-slate-200">
            <div className="p-6 border-b border-slate-200 bg-slate-50">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-brand-600"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                    Atualização de Termos de Uso
                </h3>
                <p className="text-sm text-slate-500 mt-1">Para continuar utilizando a LootFan, você precisa ler e aceitar os novos termos.</p>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 prose prose-slate max-w-none text-sm leading-relaxed" onScroll={handleScroll}>
                {user.role === UserRole.CREATOR ? (
                    <>
                    <h4 className="font-bold text-lg">TERMOS DE SERVIÇO PARA CREATORS</h4>
                    <p>Última atualização: {new Date().toLocaleDateString()}</p>
                    
                    <h5 className="font-bold mt-4">1. Responsabilidade Integral</h5>
                    <p>Ao utilizar a LootFan, você reconhece ser o único responsável pela criação, oferta e entrega dos produtos anunciados. A LootFan é uma intermediadora tecnológica e não possui controle sobre o estoque ou envio.</p>

                    <h5 className="font-bold mt-4">2. Política de Banimento e Suspensão</h5>
                    <p>A LootFan reserva-se o direito de suspender ou inativar contas permanentemente, sem aviso prévio, caso sejam detectadas:</p>
                    <ul>
                        <li>Atividades fraudulentas ou golpes contra fãs.</li>
                        <li>Não entrega recorrente de prêmios físicos ou digitais.</li>
                        <li>Violação de direitos autorais.</li>
                        <li>Comportamento abusivo ou ilícito.</li>
                    </ul>

                    <h5 className="font-bold mt-4">3. Transparência (+18)</h5>
                    <p>Creators de conteúdo adulto devem marcar obrigatoriamente suas campanhas como tal. A falha em categorizar corretamente o conteúdo resultará em banimento imediato.</p>
                    
                    <h5 className="font-bold mt-4">4. Dados Fiscais</h5>
                    <p>Você concorda em fornecer dados verdadeiros para fins fiscais e de conformidade legal (KYC).</p>
                    </>
                ) : (
                    <>
                        <h4 className="font-bold text-lg">TERMOS DE USO PARA FÃS</h4>
                        <p>Última atualização: {new Date().toLocaleDateString()}</p>

                        <h5 className="font-bold mt-4">1. Natureza dos Loots</h5>
                        <p>Ao adquirir um giro, você está comprando uma chance de obter produtos definidos pelo Creator. A LootFan garante a aleatoriedade do sorteio, mas não a entrega física ou a qualidade subjetiva do prêmio, que são responsabilidade do Creator.</p>

                        <h5 className="font-bold mt-4">2. Isenção de Responsabilidade</h5>
                        <p>A LootFan não se responsabiliza por falhas de entrega por parte do Creator. Disputas devem ser iniciadas através da ferramenta de Suporte da plataforma.</p>

                        <h5 className="font-bold mt-4">3. Produtos Digitais</h5>
                        <p>Produtos digitais acessados, baixados ou visualizados não são passíveis de reembolso (Direito de Arrependimento não aplicável após consumo, conforme Art. 49 CDC/Jurisprudência).</p>
                    </>
                )}
                <div className="h-20"></div>
                <p className="text-center text-slate-400 italic">-- Fim dos Termos --</p>
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50 flex flex-col items-center gap-3">
                {!scrolledToBottom && (
                    <p className="text-xs text-orange-600 font-bold animate-pulse">
                        Role até o final para habilitar o botão de aceite.
                    </p>
                )}
                <Button 
                    fullWidth 
                    size="lg" 
                    disabled={!scrolledToBottom} 
                    isLoading={isAccepting}
                    onClick={handleAccept}
                >
                    Li e Aceito os Termos
                </Button>
            </div>
        </div>
    </div>
  );
};
