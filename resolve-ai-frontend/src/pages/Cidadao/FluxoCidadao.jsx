import React, { useState } from 'react';
import logoPena from '../../assets/pena.png';

export default function FluxoCidadao() {
  const [telaAtual, setTelaAtual] = useState('login');

  // --- ESTILOS RESPONSIVOS ---
  const fundoTela = {
    minHeight: '100vh', backgroundColor: '#f1f5f9', display: 'flex',
    alignItems: 'center', justifyContent: 'center', padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif', boxSizing: 'border-box'
  };

  const cartaoResponsivo = {
    width: '100%', maxWidth: '500px', backgroundColor: 'white', borderRadius: '16px',
    padding: '40px 30px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', boxSizing: 'border-box'
  };

  const btnAzul = {
    width: '100%', padding: '16px', backgroundColor: '#2d7cd1', color: 'white', 
    border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
  };

  const inputPadrao = {
    width: '100%', padding: '16px', border: '1px solid #cbd5e1', borderRadius: '8px', 
    marginBottom: '15px', boxSizing: 'border-box', fontSize: '15px'
  };

  const cardMenu = {
    backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0',
    marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer',
    fontWeight: '500', color: '#1e293b', transition: '0.2s'
  };

  // --- TELAS ---
  if (telaAtual === 'login') {
    return (
      <div style={fundoTela}>
        <div style={cartaoResponsivo}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <img src={logoPena} alt="Logo Resolve Aí" style={{ width: '80px', marginBottom: '15px' }} />
            <h2 style={{ color: '#0f172a', marginBottom: '5px', fontSize: '24px' }}>Bem-vindo ao Resolve Aí!</h2>
            <p style={{ color: '#64748b', fontSize: '15px', marginTop: '0' }}>Denuncie problemas urbanos com poucos toques.</p>
          </div>
          <input style={inputPadrao} type="text" placeholder="Digite seu CPF" />
          <input style={inputPadrao} type="password" placeholder="Digite sua senha" />
          <button style={{...btnAzul, marginTop: '10px'}} onClick={() => setTelaAtual('menu')}>
            Entrar
          </button>
          <p style={{ textAlign: 'center', color: '#2d7cd1', fontSize: '14px', marginTop: '20px', cursor: 'pointer' }}>
            Não tem conta? Registrar-se
          </p>
        </div>
      </div>
    );
  }

  if (telaAtual === 'menu') {
    return (
      <div style={fundoTela}>
        <div style={cartaoResponsivo}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ width: '70px', height: '70px', backgroundColor: '#e2e8f0', borderRadius: '50%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px' }}>👤</div>
            <h3 style={{ margin: '10px 0 0 0' }}>Olá, Pedro!</h3>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '0' }}>Anápolis/GO</p>
          </div>

          <div style={cardMenu} onClick={() => setTelaAtual('denuncia')}>
            <span style={{color: '#2d7cd1', fontSize: '20px'}}>⊕</span> Fazer Denúncia
          </div>
          <div style={cardMenu}>
            <span style={{color: '#2d7cd1', fontSize: '20px'}}>🕒</span> Ver Histórico
          </div>
          <div style={cardMenu}>
            <span style={{color: '#2d7cd1', fontSize: '20px'}}>✏️</span> Editar Perfil
          </div>
          <div style={{...cardMenu, color: '#ef4444', marginTop: '30px'}} onClick={() => setTelaAtual('login')}>
            <span style={{fontSize: '20px'}}>↪</span> Sair
          </div>
        </div>
      </div>
    );
  }

  if (telaAtual === 'denuncia') {
    return (
      <div style={fundoTela}>
        <div style={cartaoResponsivo}>
          <h2 style={{marginTop: '0'}}>Nova Denúncia</h2>
          
          <p style={{fontWeight: 'bold', fontSize: '14px', marginBottom: '5px'}}>Sua Localização</p>
          <div style={{backgroundColor: '#e0f2fe', padding: '20px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', flexDirection: 'column'}}>
            <span style={{fontSize: '24px'}}>📍</span>
            <span style={{fontSize: '13px', marginTop: '5px'}}>Jardim das Américas - Anápolis/GO</span>
          </div>

          <p style={{fontWeight: 'bold', fontSize: '14px', marginTop: '20px', marginBottom: '5px'}}>Mídia</p>
          <div style={{border: '2px dashed #cbd5e1', padding: '20px', textAlign: 'center', borderRadius: '8px', color: '#64748b', cursor: 'pointer'}}>
             📸 Adicionar foto ou vídeo
          </div>

          <p style={{fontWeight: 'bold', fontSize: '14px', marginTop: '20px', marginBottom: '5px'}}>Categoria</p>
          <select style={{...inputPadrao, padding: '14px', backgroundColor: 'white'}}>
            <option>Selecione o problema...</option>
            <option>Buraco na via</option>
            <option>Falta de iluminação pública</option>
            <option>Acúmulo de lixo</option>
          </select>

          <p style={{fontWeight: 'bold', fontSize: '14px', marginTop: '5px', marginBottom: '5px'}}>Descrição Adicional</p>
          <textarea style={{...inputPadrao, height: '80px', padding: '12px'}} placeholder="(Opcional)"></textarea>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button style={{...btnAzul, backgroundColor: '#94a3b8'}} onClick={() => setTelaAtual('menu')}>
              Voltar
            </button>
            <button style={btnAzul} onClick={() => setTelaAtual('sucesso')}>
              Enviar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (telaAtual === 'sucesso') {
    return (
      <div style={fundoTela}>
        <div style={{...cartaoResponsivo, textAlign: 'center'}}>
          <div style={{ width: '80px', height: '80px', backgroundColor: '#10b981', borderRadius: '50%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', color: 'white', marginBottom: '20px' }}>
            ✓
          </div>
          <h2 style={{color: '#0f172a'}}>Enviada com sucesso!</h2>
          <p style={{color: '#64748b', fontSize: '15px'}}>Obrigado por colaborar. Sua denúncia será encaminhada para o setor responsável.</p>
          
          <button style={{...btnAzul, marginTop: '30px'}} onClick={() => setTelaAtual('menu')}>
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }
}