import { useCallback, useEffect, useState } from 'react';
import { Carregando, MensagemErro } from '../../components/Indicadores';
import { MapaOcorrencias } from '../../components/Mapa';
import { api } from '../../services/api';
import { CORES_FAIXA } from '../../utils/formato';
import DetalheOcorrencia from './DetalheOcorrencia';

export default function MapaCalor() {
  const [opcoes, setOpcoes] = useState(null);
  const [filtros, setFiltros] = useState({ categoria: '', status: 'Em aberto' });
  const [pontos, setPontos] = useState(null);
  const [erro, setErro] = useState('');
  const [selecionada, setSelecionada] = useState(null);
  const fechar = useCallback(() => setSelecionada(null), []);

  useEffect(() => {
    api.opcoes().then(setOpcoes).catch((e) => setErro(e.message));
  }, []);

  const carregar = useCallback(() => {
    setErro('');
    api.gestor.mapa(filtros).then(setPontos).catch((e) => setErro(e.message));
  }, [filtros]);

  useEffect(carregar, [carregar]);

  return (
    <>
      <header className="pagina-topo">
        <h1>Mapa de Calor</h1>
        <p>Concentração de ocorrências ponderada pelo Índice de Criticidade.</p>
      </header>

      <div className="filtros">
        <label>
          Categoria
          <select value={filtros.categoria} onChange={(e) => setFiltros({ ...filtros, categoria: e.target.value })}>
            <option value="">Todas</option>
            {opcoes?.categorias.map((c) => (
              <option key={c.nome}>{c.nome}</option>
            ))}
          </select>
        </label>
        <label>
          Situação
          <select value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}>
            <option value="Em aberto">Em aberto</option>
            <option value="">Todas</option>
            <option value="Resolvida">Resolvidas</option>
          </select>
        </label>
        <div className="legenda">
          {Object.entries(CORES_FAIXA).map(([faixa, c]) => (
            <span key={faixa}>
              <i style={{ background: c.cor }} />
              {faixa}
            </span>
          ))}
          {pontos && <small>{pontos.length} ocorrências</small>}
        </div>
      </div>

      <MensagemErro erro={erro} />
      <div className="cartao-tabela">
        {!pontos && !erro && <Carregando />}
        {pontos && <MapaOcorrencias pontos={pontos} calor altura="calc(100vh - 260px)" aoAbrir={setSelecionada} />}
      </div>

      {selecionada && (
        <DetalheOcorrencia
          id={selecionada}
          statusDisponiveis={opcoes?.status ?? []}
          aoFechar={fechar}
          aoAtualizar={carregar}
        />
      )}
    </>
  );
}
