import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { appNativo } from '../utils/appNativo';

const TELAS_PRINCIPAIS = ['/app', '/app/login', '/gestao', '/gestao/login'];

function pluginApp() {
  const cap = window.Capacitor;
  if (!appNativo || !cap) return null;
  if (cap.isPluginAvailable && !cap.isPluginAvailable('App')) return null;
  return cap.Plugins?.App ?? null;
}

export default function VoltarAndroid() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [perguntando, setPerguntando] = useState(false);
  const atual = useRef({ pathname, perguntando });
  atual.current = { pathname, perguntando };

  useEffect(() => {
    const plugin = pluginApp();
    if (!plugin?.addListener) return undefined;
    let ouvinte = null;
    let desmontado = false;

    Promise.resolve(
      plugin.addListener('backButton', () => {
        const { pathname: tela, perguntando: aberta } = atual.current;
        if (aberta) {
          setPerguntando(false);
          return;
        }
        const evento = new CustomEvent('resolveai:voltar', { cancelable: true });
        if (!window.dispatchEvent(evento)) return;

        const primeiraTela = (window.history.state?.idx ?? 0) === 0;
        if (TELAS_PRINCIPAIS.includes(tela) || primeiraTela) setPerguntando(true);
        else navigate(-1);
      }),
    ).then((h) => {
      ouvinte = h;
      if (desmontado) h?.remove?.();
    });

    return () => {
      desmontado = true;
      ouvinte?.remove?.();
    };
  }, [navigate]);

  if (!perguntando) return null;

  return (
    <div className="dialogo-fundo" role="presentation" onClick={() => setPerguntando(false)}>
      <div className="dialogo" role="alertdialog" aria-modal="true" aria-labelledby="dialogo-sair" onClick={(e) => e.stopPropagation()}>
        <h2 id="dialogo-sair">Tem certeza que deseja fechar o aplicativo?</h2>
        <p>Você continua conectado na sua conta.</p>
        <div className="dialogo-botoes">
          <button type="button" className="botao botao-secundario" onClick={() => setPerguntando(false)}>
            Cancelar
          </button>
          <button type="button" className="botao" onClick={() => pluginApp()?.exitApp?.()}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
