import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import Logo from './Logo';
import { versoesPublicadas } from '../utils/appNativo';
import { ambienteDeTeste, ehCelular } from '../utils/dispositivo';

export default function SomenteCelular() {
  const [apks, setApks] = useState(null);
  const liberado = ehCelular() || ambienteDeTeste();

  useEffect(() => {
    if (!liberado) versoesPublicadas().then(setApks);
  }, [liberado]);

  if (liberado) return <Outlet />;

  return (
    <div className="somente-celular">
      <Logo tamanho={64} />
      <span className="somente-celular-icone">📱</span>
      <h1>Use o celular para denunciar</h1>
      <p>
        As denúncias do Resolve Aí! são feitas <strong>no local do problema</strong>, com a foto e o GPS do celular. Por
        isso, a área do cidadão não funciona no computador.
      </p>
      <ol>
        <li>
          <strong>Android:</strong> instale o aplicativo Resolve Aí!
        </li>
        <li>
          <strong>iPhone:</strong> abra <code>{window.location.host}/app</code> no Safari do celular.
        </li>
      </ol>
      {apks?.cidadao && (
        <a className="botao" href={apks.cidadao.url} download>
          📲 Baixar o app do Cidadão (Android)
        </a>
      )}
      <Link to="/" className="link">
        ← Voltar ao início
      </Link>
      <small className="nota">É gestor da prefeitura? O painel de gestão funciona normalmente no computador.</small>
    </div>
  );
}
