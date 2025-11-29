import React from 'react';

// Antonio Batista - LootFan - 2024-05-23
// Painel Administrativo básico

export const AdminPanel = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Admin Master Control</h1>
      <div className="bg-red-900/20 border border-red-900 p-6 rounded-lg text-center">
        <h2 className="text-xl text-red-300 font-bold mb-2">Acesso Restrito</h2>
        <p className="text-gray-400">Esta área permite visualizar todas as transações, banir creators e moderar conteúdo +18.</p>
        <p className="text-gray-500 mt-4 text-sm">Funcionalidade completa omitida para brevidade da demo.</p>
      </div>
    </div>
  );
};