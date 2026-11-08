import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Carregando, CriticidadeBarra, MensagemErro, StatusPonto } from '../../components/Indicadores';
import { api } from '../../services/api';
import { textoDias } from '../../utils/formato';
import DetalheOcorrencia from './DetalheOcorrencia';

export default function Ocorrencias() {
  const [opcoes, setOpcoes] = useState(null);
  const [params, setParams] = useSearchParams();
  const filtros = {
    categoria: params.get('categoria') ?? '',
    status: params.get('status') ?? '',
    faixa: params.get('faixa') ?? '',
    bairro: params.get('bairro') ?? '',
  };
  const chaveFiltros = JSON.stringify(filtros);
  const selecionada = Number(params.get('id')) || null;
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');

  function mudarParametro(campo, valor) {
    const novos = new URLSearchParams(params);
    if (valor) novos.set(campo, valor);
    else novos.delete(campo);
    setParams(novos, { replace: !(campo === 'id' && valor) });
  }
  const setSelecionada = (id) => mudarParametro('id', id ? String(id) : '');

  useEffect(() => {
    api.opcoes().then(setOpcoes).catch((e) => setErro(e.message));
  }, []);

  const carregar = useCallback(() => {
    setErro('');
    api.gestor.ocorrencias(JSON.parse(chaveFiltros)).then(setLista).catch((e) => setErro(e.message));
  }, [chaveFiltros]);

  useEffect(carregar, [carregar]);

  const filtro = (campo) => (e) => mudarParametro(campo, e.target.value);

  return (
    <>
      <header className="pagina-topo">
        <h1>Ocorrências por Criticidade</h1>
        <p>Lista ordenada automaticamente pelo Índice de Criticidade.</p>
      </header>

      <div className="filtros">
        <label>
          Categoria
          <select value={filtros.categoria} onChange={filtro('categoria')}>
            <option value="">Todas</option>
            {opcoes?.categorias.map((c) => (
              <option key={c.nome}>{c.nome}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={filtros.status} onChange={filtro('status')}>
            <option value="">Todos</option>
            <option value="Em aberto">Em aberto (não concluídas)</option>
            {opcoes?.status.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Faixa de criticidade
          <select value={filtros.faixa} onChange={filtro('faixa')}>
            <option value="">Todas</option>
            {opcoes?.faixas.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        {filtros.bairro && (
          <span className="filtro-chip">
            Bairro: <strong>{filtros.bairro}</strong>
            <button type="button" onClick={() => mudarParametro('bairro', '')} aria-label="Remover filtro de bairro">
              ✕
            </button>
          </span>
        )}
        {lista && <small className="filtros-total">{lista.length} ocorrência(s)</small>}
      </div>

      <MensagemErro erro={erro} tentarNovamente={carregar} />

      <div className="cartao-tabela">
        {!lista && !erro && <Carregando />}
        {lista && (
          <table className="tabela">
            <thead>
              <tr>
                <th>Ocorrência</th>
                <th>Bairro</th>
                <th>Espera</th>
                <th>Criticidade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((o) => (
                <tr key={o.id} onClick={() => setSelecionada(o.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSelecionada(o.id)}>
                  <td>
                    <strong>{o.protocolo}</strong>
                    <small>{o.categoria}</small>
                  </td>
                  <td>{o.bairro}</td>
                  <td>{textoDias(o.dias_espera)}</td>
                  <td>
                    <CriticidadeBarra indice={o.indice_criticidade} faixa={o.faixa} />
                  </td>
                  <td>
                    <StatusPonto status={o.status} />
                  </td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={5} className="vazio">
                    Nenhuma ocorrência encontrada com esses filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {selecionada && (
        <DetalheOcorrencia
          id={selecionada}
          statusDisponiveis={opcoes?.status ?? []}
          aoFechar={() => setSelecionada(null)}
          aoAtualizar={carregar}
        />
      )}
    </>
  );
}
