import React, { useState } from 'react';
import FluxoCidadao from './pages/Cidadao/FluxoCidadao';
import PainelGestor from './pages/Gestor/PainelGestor';

export default function App() {
  // Controle para saber qual visão mostrar
  const [visaoAtual, setVisaoAtual] = useState('cidadao');

  return (
    <div>
      {/* Barra superior provisória só para facilitar os seus testes */}
      <div style={{ backgroundColor: '#cbd5e1', padding: '10px', textAlign: 'center' }}>
        <span style={{ fontWeight: 'bold', marginRight: '15px' }}>Testar ambiente:</span>
        <button 
          onClick={() => setVisaoAtual('cidadao')} 
          style={{ padding: '8px 16px', marginRight: '10px', cursor: 'pointer', fontWeight: visaoAtual === 'cidadao' ? 'bold' : 'normal' }}
        >
          📱 Cidadão
        </button>
        <button 
          onClick={() => setVisaoAtual('gestor')} 
          style={{ padding: '8px 16px', cursor: 'pointer', fontWeight: visaoAtual === 'gestor' ? 'bold' : 'normal' }}
        >
          💻 Gestor Público
        </button>
      </div>

      {/* Mostra o componente Cidadão ou Gestor dependendo do botão clicado */}
      {visaoAtual === 'cidadao' ? <FluxoCidadao /> : <PainelGestor />}
    </div>
  );
}