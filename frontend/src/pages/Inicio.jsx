import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { versoesPublicadas } from '../utils/appNativo';

export default function Inicio() {
  const [apks, setApks] = useState(null);

  useEffect(() => {
    versoesPublicadas().then(setApks);
  }, []);

  return (
    <div className="inicio">
      <Logo tamanho={72} />
      <h1>Resolve Aí!</h1>
      <p>Plataforma de gestão urbana — escolha como deseja acessar.</p>
      <div className="inicio-cartoes">
        <Link to="/app" className="inicio-cartao">
          <span>📱</span>
          <strong>App do Cidadão</strong>
          <small>Registre problemas com foto e GPS, no local, pelo celular, e acompanhe o andamento.</small>
          <code>CPF 529.982.247-25 · senha 123456</code>
        </Link>
        <Link to="/gestao" className="inicio-cartao inicio-cartao-escuro">
          <span>🏛️</span>
          <strong>Painel de Gestão</strong>
          <small>Dashboard, ranking por criticidade e mapa de calor.</small>
          <code>Matrícula 1001 · senha gestor123</code>
        </Link>
      </div>
      {apks && (
        <div className="inicio-downloads">
          {apks.cidadao && (
            <a className="botao" href={apks.cidadao.url} download>
              📲 Baixar app do Cidadão (Android)
            </a>
          )}
          {apks.gestor && (
            <a className="botao botao-secundario" href={apks.gestor.url} download>
              📲 Baixar app do Gestor (Android)
            </a>
          )}
        </div>
      )}
    </div>
  );
}
