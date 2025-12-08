import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Antonio Batista - LootFan - 2024-05-23
// Ponto de entrada da aplicação utilizando React 18 createRoot
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Não foi possível encontrar o elemento root para montar a aplicação");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);