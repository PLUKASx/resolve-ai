import { useCallback, useEffect, useState } from 'react';
import { Carregando, MensagemErro } from '../../components/Indicadores';
import { MapaOcorrencias } from '../../components/Mapa';
import { api } from '../../services/api';
import { CORES_FAIXA } from '../../utils/formato';

export default function MeuMapa() {
  const [pontos, setPontos] = useState(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    setErro('');
    api.cidadao.mapa().then(setPontos).catch((e) => setErro(e.message));
  }, []);

  useEffect(carregar, [carregar]);

  return (
    <>
      <div className="secao-titulo">
        <h2>Mapa das minhas denúncias</h2>
        {pontos && <small>{pontos.length} no mapa</small>}
      </div>

      <div className="legenda">
        {Object.entries(CORES_FAIXA).map(([faixa, c]) => (
          <span key={faixa}>
            <i style={{ background: c.cor }} />
            {faixa}
          </span>
        ))}
      </div>

      <MensagemErro erro={erro} tentarNovamente={carregar} />
      {!pontos && !erro && <Carregando />}
      {pontos && <MapaOcorrencias pontos={pontos} altura="clamp(380px, 65vh, 680px)" />}
    </>
  );
}
