import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Carregando, CriticidadeBarra, MensagemErro, StatusPonto } from '../../components/Indicadores';
import { api } from '../../services/api';
import { CORES_FAIXA, CORES_STATUS } from '../../utils/formato';
import IconeCategoria from '../../components/IconeCategoria';

export function linkOcorrencias(filtros) {
  const params = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v !== '' && v != null));
  return `/gestao/ocorrencias${params.size ? `?${params}` : ''}`;
}

function Barras({ itens, rotulo = (i) => i.nome, valor = (i) => i.total, cor, sufixo, link, dica }) {
  const maximo = Math.max(1, ...itens.map(valor));
  return (
    <ul className="barras">
      {itens.map((item) => {
        const conteudo = (
          <>
            <span className="barras-rotulo">{rotulo(item)}</span>
            <span className="barras-trilho">
              <span style={{ width: `${(valor(item) / maximo) * 100}%`, background: cor(item) }} />
            </span>
            <strong>{valor(item)}</strong>
            {sufixo ? <small>{sufixo(item)}</small> : <small />}
          </>
        );
        return (
          <li key={item.nome}>
            {link ? (
              <Link to={link(item)} className="barras-linha clicavel" title={dica?.(item)}>
                {conteudo}
              </Link>
            ) : (
              <div className="barras-linha">{conteudo}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function Dashboard() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    setErro('');
    api.gestor.dashboard().then(setDados).catch((e) => setErro(e.message));
  }, []);

  useEffect(carregar, [carregar]);

  if (erro) return <MensagemErro erro={erro} tentarNovamente={carregar} />;
  if (!dados) return <Carregando />;

  const corBairro = (b) =>
    CORES_FAIXA[b.criticidade_media >= 70 ? 'Alta' : b.criticidade_media >= 40 ? 'Média' : 'Baixa'].cor;

  return (
    <>
      <header className="pagina-topo">
        <h1>Dashboard Geral</h1>
        <p>Visão consolidada das demandas de zeladoria urbana.</p>
      </header>

      <section className="kpis">
        <Link to={linkOcorrencias({})} className="kpi clicavel" title="Ver todas as ocorrências">
          <small>Total de ocorrências</small>
          <strong>{dados.total}</strong>
        </Link>
        <Link to={linkOcorrencias({ status: 'Em aberto' })} className="kpi clicavel" title="Ver as ocorrências em aberto">
          <small>Em aberto</small>
          <strong>{dados.em_aberto}</strong>
        </Link>
        <Link
          to={linkOcorrencias({ status: 'Em aberto', faixa: 'Alta' })}
          className="kpi kpi-alerta clicavel"
          title="Ver as ocorrências em aberto com criticidade alta"
        >
          <small>Criticidade alta</small>
          <strong>{dados.criticas}</strong>
        </Link>
        <div className="kpi">
          <small>Tempo Médio de Espera</small>
          <strong>
            {dados.tempo_medio_espera.toLocaleString('pt-BR')} <span>dias</span>
          </strong>
        </div>
        <Link to={linkOcorrencias({ status: 'Resolvida' })} className="kpi kpi-ok clicavel" title="Ver as ocorrências resolvidas">
          <small>Resolvidas</small>
          <strong>{dados.resolvidas}</strong>
          <span>média de {dados.tempo_medio_resolucao.toLocaleString('pt-BR')} dias</span>
        </Link>
      </section>

      <section className="paineis">
        <div className="painel">
          <h2>Bairros mais críticos</h2>
          <small>Soma do Índice de Criticidade das ocorrências em aberto</small>
          <Barras
            itens={dados.bairros_criticos}
            valor={(b) => b.pontuacao}
            cor={corBairro}
            sufixo={(b) => `${b.total} oc.`}
            link={(b) => linkOcorrencias({ bairro: b.nome, status: 'Em aberto' })}
            dica={(b) => `Ver as ocorrências em aberto de ${b.nome}`}
          />
        </div>

        <div className="painel">
          <h2>Em aberto por categoria</h2>
          <small>Demandas aguardando solução</small>
          <Barras
            itens={dados.por_categoria}
            rotulo={(c) => (
              <>
                <IconeCategoria categoria={c.nome} /> {c.nome}
              </>
            )}
            cor={() => '#2f80d1'}
            link={(c) => linkOcorrencias({ categoria: c.nome, status: 'Em aberto' })}
            dica={(c) => `Ver as ocorrências em aberto de ${c.nome}`}
          />
        </div>

        <div className="painel">
          <h2>Situação dos chamados</h2>
          <small>Todas as ocorrências por status</small>
          <Barras
            itens={dados.por_status}
            cor={(s) => CORES_STATUS[s.nome]}
            link={(s) => linkOcorrencias({ status: s.nome })}
            dica={(s) => `Ver as ocorrências com status ${s.nome}`}
          />
        </div>

        <div className="painel">
          <div className="painel-cabecalho">
            <h2>Registros recentes</h2>
            <Link to="/gestao/ocorrencias" className="link">
              Ver ranking →
            </Link>
          </div>
          <ul className="recentes">
            {dados.recentes.map((o) => (
              <li key={o.id}>
                <Link to={linkOcorrencias({ id: o.id })} className="recentes-linha clicavel" title="Abrir a ocorrência">
                  <div>
                    <strong>{o.protocolo}</strong>
                    <small>
                      {o.categoria} · {o.bairro}
                    </small>
                  </div>
                  <CriticidadeBarra indice={o.indice_criticidade} faixa={o.faixa} />
                  <StatusPonto status={o.status} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
