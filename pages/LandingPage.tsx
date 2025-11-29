
import React, { useState } from 'react';
import { Button } from '../components/Button';
import { UserRole } from '../types';

// Antonio Batista - LootFan - 2024-05-23
// Landing Page: Focada em conversão, dor e oportunidade. Estilo Clean/Privacy/Nuuvem.

interface LandingProps {
  onOpenAuth: (role: UserRole) => void;
}

export const LandingPage: React.FC<LandingProps> = ({ onOpenAuth }) => {
  // Calculadora State
  const [ticketPrice, setTicketPrice] = useState(29.90);
  const [sales, setSales] = useState(100);
  
  const platformFee = 0.10; // 10%
  const grossRevenue = ticketPrice * sales;
  const platformCost = grossRevenue * platformFee;
  const netRevenue = grossRevenue - platformCost;

  return (
    <div className="flex flex-col items-center w-full">
      
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden px-6 pt-16 pb-24 text-center sm:pt-24 lg:px-8 bg-white">
        {/* Background Gradient Spot */}
        <div className="absolute top-[-10%] left-1/2 -z-10 w-[800px] h-[800px] -translate-x-1/2 rounded-full bg-brand-100/50 blur-3xl opacity-70" />
        
        <div className="mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium text-brand-600 ring-1 ring-inset ring-brand-600/20 bg-brand-50 mb-8">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clipRule="evenodd" />
            </svg>
            Nova Era da Monetização
          </div>
          
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-7xl mb-6">
            Transforme fãs em <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-purple-600">
              Super Compradores
            </span>
          </h1>
          
          <p className="mx-auto max-w-2xl text-lg leading-8 text-slate-600 mb-10">
            A plataforma definitiva para Creators (Gamers, Educadores, Artistas e +) venderem <strong>conteúdos exclusivos</strong> e experiências digitais através de caixas surpresa, assinaturas e mercado secundário.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={() => onOpenAuth(UserRole.CREATOR)} size="lg" className="shadow-soft w-full sm:w-auto">
              Começar a Lucrar
            </Button>
            <Button variant="secondary" size="lg" onClick={() => window.location.href='#calculator'} className="w-full sm:w-auto">
              Simular Ganhos
            </Button>
          </div>
        </div>
      </section>

      {/* Feature Cards - Estilo Nuuvem Cards */}
      <section className="w-full bg-slate-50 py-24 border-y border-slate-200">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Por que Creators de Elite usam LootFan?</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { 
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-brand-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                  ),
                  title: "Venda o Invendável", 
                  desc: "Monetize arquivos antigos, fotos exclusivas e itens físicos parados com alto valor percebido." 
              },
              { 
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-orange-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
                    </svg>
                  ),
                  title: "Fator FOMO", 
                  desc: "A escassez e a chance de ganhar itens 'Lendários' aumentam o ticket médio em até 300%." 
              },
              { 
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-emerald-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                    </svg>
                  ),
                  title: "Pagamento Split", 
                  desc: "Receba seus ganhos limpos. Nós processamos os pagamentos complexos e taxas automaticamente." 
              }
            ].map((feature, idx) => (
              <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-soft transition-shadow duration-300">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEW SECTION: BUSINESS MODELS */}
      <section className="w-full bg-white py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
          <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
              <div className="text-center mb-16">
                  <span className="text-brand-600 font-bold uppercase tracking-wider text-sm bg-brand-50 px-3 py-1 rounded-full border border-brand-100">Ecossistema Completo</span>
                  <h2 className="text-3xl font-extrabold text-slate-900 mt-4 sm:text-5xl">3 Motores de Receita</h2>
                  <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">Não dependa de apenas uma fonte. O LootFan oferece um conjunto de ferramentas para maximizar o LTV (Lifetime Value) do seu fã.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Card 1: Loot Drops */}
                  <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 flex flex-col h-full hover:border-brand-300 transition-colors">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm mb-6 border border-slate-100">🎲</div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">Loot Drops</h3>
                      <p className="text-slate-500 mb-6 flex-1">O modelo clássico. Venda caixas surpresa com produtos digitais ou físicos. Ideal para lançamentos, queima de estoque e engajamento rápido.</p>
                      <ul className="space-y-2 mb-8">
                          <li className="flex items-center gap-2 text-sm text-slate-700 font-medium"><span className="text-green-500">✓</span> Vendas Imediatas</li>
                          <li className="flex items-center gap-2 text-sm text-slate-700 font-medium"><span className="text-green-500">✓</span> Gamificação Viciante</li>
                      </ul>
                  </div>

                  {/* Card 2: Loot Pass (NEW) */}
                  <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 flex flex-col h-full relative overflow-hidden group shadow-2xl">
                      <div className="absolute top-0 right-0 bg-yellow-500 text-yellow-950 text-xs font-bold px-3 py-1 rounded-bl-xl">NOVO</div>
                      <div className="absolute inset-0 bg-gradient-to-br from-brand-900/50 to-purple-900/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      
                      <div className="relative z-10 flex flex-col h-full">
                          <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-3xl shadow-inner mb-6 border border-slate-700 text-yellow-400">👑</div>
                          <h3 className="text-2xl font-bold text-white mb-2">Loot Pass</h3>
                          <p className="text-slate-400 mb-6 flex-1">Crie seu clube de assinatura VIP. Fãs pagam mensalmente para ter acesso a drops exclusivos, descontos e progressão de nível estilo "Battle Pass".</p>
                          <ul className="space-y-2 mb-8">
                              <li className="flex items-center gap-2 text-sm text-slate-300 font-medium"><span className="text-yellow-500">★</span> Receita Recorrente (MRR)</li>
                              <li className="flex items-center gap-2 text-sm text-slate-300 font-medium"><span className="text-yellow-500">★</span> Fidelização Extrema</li>
                          </ul>
                          <Button className="w-full bg-yellow-500 text-yellow-950 hover:bg-yellow-400 border-none font-bold" onClick={() => onOpenAuth(UserRole.CREATOR)}>Criar meu Clube</Button>
                      </div>
                  </div>

                  {/* Card 3: Marketplace (NEW) */}
                  <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 flex flex-col h-full hover:border-brand-300 transition-colors">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm mb-6 border border-slate-100">🤝</div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">Marketplace</h3>
                      <p className="text-slate-500 mb-6 flex-1">Permita que seus fãs negociem itens repetidos entre si. Você ganha royalties (taxa) em cada transação secundária realizada na plataforma.</p>
                      <ul className="space-y-2 mb-8">
                          <li className="flex items-center gap-2 text-sm text-slate-700 font-medium"><span className="text-brand-500">↗</span> Royalties Perpétuos</li>
                          <li className="flex items-center gap-2 text-sm text-slate-700 font-medium"><span className="text-brand-500">↗</span> Economia Viva</li>
                      </ul>
                  </div>
              </div>
          </div>
      </section>

      {/* Calculator Section - Clean & Modern */}
      <section id="calculator" className="w-full py-24 px-6 bg-slate-50 border-t border-slate-200">
        <div className="mx-auto max-w-5xl">
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-2xl shadow-brand-900/5">
            <h2 className="text-3xl font-bold text-center mb-2 text-slate-900">Calculadora de Potencial</h2>
            <p className="text-center text-slate-500 mb-12">Veja quanto você pode faturar vendendo seus produtos como Loots.</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-10">
                <div>
                    <div className="flex justify-between mb-2">
                        <label className="text-sm font-semibold text-slate-700">Preço por Giro</label>
                        <span className="text-brand-600 font-bold bg-brand-50 px-2 py-0.5 rounded">R$ {ticketPrice.toFixed(2)}</span>
                    </div>
                    <input 
                    type="range" min="5" max="200" step="5" 
                    value={ticketPrice} 
                    onChange={(e) => setTicketPrice(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600 hover:accent-brand-500"
                    />
                </div>

                <div>
                    <div className="flex justify-between mb-2">
                        <label className="text-sm font-semibold text-slate-700">Vendas Estimadas (Giros)</label>
                        <span className="text-brand-600 font-bold bg-brand-50 px-2 py-0.5 rounded">{sales} Giros</span>
                    </div>
                    <input 
                    type="range" min="10" max="5000" step="10" 
                    value={sales} 
                    onChange={(e) => setSales(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600 hover:accent-brand-500"
                    />
                </div>
                </div>

                <div className="bg-gradient-to-br from-brand-50 to-white rounded-2xl p-8 border border-brand-100 shadow-inner">
                    <div className="space-y-4">
                        <div className="flex justify-between text-slate-500">
                            <span>Receita Bruta:</span>
                            <span className="font-medium text-slate-900">R$ {grossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-slate-400 text-sm">
                            <span>Taxa da Plataforma (10%):</span>
                            <span>- R$ {platformCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="border-t border-brand-200 pt-6 mt-2">
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">Seu Lucro Líquido</span>
                                <span className="text-4xl font-extrabold text-brand-600">
                                    R$ {netRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                        <Button onClick={() => onOpenAuth(UserRole.CREATOR)} fullWidth size="lg" className="mt-6 shadow-brand-500/25">
                            Criar Minha Conta Grátis
                        </Button>
                    </div>
                </div>
            </div>
            </div>
        </div>
      </section>

    </div>
  );
};
