import { useEffect, useState } from 'react';
import { appNativo, versoesPublicadas } from '../utils/appNativo';

export default function AvisoAtualizacao() {
  const [nova, setNova] = useState(null);

  useEffect(() => {
    if (!appNativo) return;
    versoesPublicadas().then((versoes) => {
      const publicada = versoes?.[appNativo.perfil];
      if (publicada && publicada.versao > appNativo.versao) setNova(publicada);
    });
  }, []);

  if (!nova) return null;
  const url = new URL(nova.url, window.location.origin).href;

  function baixar() {
    const navegador = window.Capacitor?.Plugins?.Browser;
    if (navegador) navegador.open({ url });
    else window.open(url, '_blank');
  }

  return (
    <div className="atualizacao">
      <div className="atualizacao-caixa">
        <span>🚀</span>
        <h2>Nova versão disponível</h2>
        <p>Atualize o Resolve Aí para continuar usando. Depois de baixar, toque no arquivo para instalar.</p>
        <button type="button" className="botao" onClick={baixar}>
          Baixar atualização
        </button>
        <small>Se não abrir, acesse pelo navegador: {url}</small>
      </div>
    </div>
  );
}
