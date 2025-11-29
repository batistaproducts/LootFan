
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Antonio Batista - LootFan - 2024-05-23
// Ponto de entrada seguro da aplicação (React 18)

const container = document.getElementById('root');

if (!container) {
  const msg = "Erro Fatal: Elemento 'root' não encontrado no DOM.";
  document.body.innerHTML = `<div style="color:red; padding: 20px;">${msg}</div>`;
  throw new Error(msg);
}

try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
} catch (e) {
    console.error("Falha ao montar aplicação React:", e);
    // O ErrorHandler global no HTML cuidará da exibição visual
    throw e;
}
