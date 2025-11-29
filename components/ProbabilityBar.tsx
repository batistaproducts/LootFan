
import React from 'react';

// Antonio Batista - LootFan - 2024-05-23
// Componente de Validação Visual de Probabilidade - Tema Light com Ícones SVG

interface ProbabilityBarProps {
  currentTotal: number;
}

export const ProbabilityBar: React.FC<ProbabilityBarProps> = ({ currentTotal }) => {
  const isValid = Math.abs(currentTotal - 100) < 0.1; // Float tolerance
  const isOver = currentTotal > 100;

  // Cor da barra baseada no estado
  let barColor = "bg-brand-500";
  let textColor = "text-brand-600";
  let containerBorder = "border-slate-200";
  
  if (isOver) {
      barColor = "bg-red-500";
      textColor = "text-red-600";
      containerBorder = "border-red-200 bg-red-50";
  } else if (isValid) {
      barColor = "bg-emerald-500";
      textColor = "text-emerald-600";
      containerBorder = "border-emerald-200 bg-emerald-50";
  } else {
      containerBorder = "border-slate-200 bg-slate-50";
  }

  return (
    <div className={`mt-6 p-5 rounded-xl border ${containerBorder} transition-colors duration-300`}>
      <div className="flex justify-between items-end mb-3">
        <div>
            <span className="block text-sm font-bold text-slate-700">Distribuição de Probabilidade (Total 100%)</span>
            <span className="text-xs text-slate-500">Regra de negócio obrigatória para funcionamento da roleta.</span>
        </div>
        <span className={`text-xl font-black ${textColor}`}>
          {currentTotal.toFixed(1)}%
        </span>
      </div>
      
      {/* Barra de Progresso */}
      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${barColor}`} 
          style={{ width: `${Math.min(currentTotal, 100)}%` }}
        />
      </div>

      {/* Mensagens de Feedback */}
      <div className="mt-3 text-sm font-medium">
        {isValid && (
          <span className="text-emerald-700 flex items-center gap-2">
             <span className="bg-emerald-200 text-emerald-700 rounded-full w-5 h-5 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
             </span> 
             Distribuição Perfeita.
          </span>
        )}
        {!isValid && !isOver && (
          <span className="text-slate-600 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Faltam <span className="font-bold">{ (100 - currentTotal).toFixed(1) }%</span>. O sistema alocará isso automaticamente ao item "Comum".
          </span>
        )}
        {isOver && (
          <span className="text-red-600 flex items-center gap-2">
            <span className="bg-red-200 text-red-700 rounded-full w-5 h-5 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
            </span>
            Erro: A soma ultrapassa 100%. Reduza probabilidades.
          </span>
        )}
      </div>
    </div>
  );
};
