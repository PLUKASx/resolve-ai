import React from 'react';

export default function PainelGestor() {
  const containerGeral = { display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' };
  const menuLateral = { width: '250px', backgroundColor: '#0f172a', color: 'white', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' };
  const conteudoPrincipal = { flex: 1, backgroundColor: '#f1f5f9', padding: '30px' };
  const cardDashboard = { backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '20px' };

  return (
    <div style={containerGeral}>
      {/* Menu Lateral */}
      <div style={menuLateral}>
        <h2 style={{ color: '#38bdf8', borderBottom: '1px solid #334155', paddingBottom: '10px', marginBottom: '20px' }}>Resolve Aí! Gestão</h2>
        <div style={{ cursor: 'pointer', padding: '10px', backgroundColor: '#1e293b', borderRadius: '5px' }}>📊 Dashboard Geral</div>
        <div style={{ cursor: 'pointer', padding: '10px' }}>🚨 Ocorrências (Criticidade)</div>
        <div style={{ cursor: 'pointer', padding: '10px' }}>🗺️ Mapa de Calor</div>
        <div style={{ cursor: 'pointer', padding: '10px', marginTop: 'auto', color: '#f87171' }}>Sair</div>
      </div>

      {/* Conteúdo Principal */}
      <div style={conteudoPrincipal}>
        <h1 style={{ color: '#1e293b', marginTop: 0 }}>Visão Geral do Município</h1>
        <p style={{ color: '#64748b', marginBottom: '30px' }}>Acompanhamento em tempo real das demandas urbanas.</p>

        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <div style={{ ...cardDashboard, flex: 1, borderTop: '4px solid #ef4444' }}>
            <h3>Criticidade Alta</h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '10px 0 0 0' }}>14</p>
          </div>
          <div style={{ ...cardDashboard, flex: 1, borderTop: '4px solid #f59e0b' }}>
            <h3>Criticidade Média</h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '10px 0 0 0' }}>42</p>
          </div>
          <div style={{ ...cardDashboard, flex: 1, borderTop: '4px solid #10b981' }}>
            <h3>Resolvidos (Mês)</h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '10px 0 0 0' }}>128</p>
          </div>
        </div>

        <div style={cardDashboard}>
          <h3>Mapa de Ocorrências e Power BI</h3>
          <div style={{ height: '300px', backgroundColor: '#e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', marginTop: '15px' }}>
            [ Área reservada para integração futura com os gráficos do Power BI ]
          </div>
        </div>
      </div>
    </div>
  );
}