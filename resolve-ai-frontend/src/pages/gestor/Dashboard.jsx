import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Carregando, CriticidadeBarra, MensagemErro, StatusPonto } from '../../components/Indicadores';
import { api } from '../../services/api';
import { CORES_FAIXA, CORES_STATUS, ICONES_CATEGORIA } from '../../utils/formato';

function Barras({ itens, rotulo = (i) => i.nome, valor = (i) => i.total, cor, sufixo }) {
  const maximo = Math.max(1, ...itens.map(valor));
  return (
    <ul className="barras">
      {itens.map((item) => (
        <li key={item.nome}>
          <span className="barras-rotulo">{rotulo(item)}</span>
          <span className="barras-trilho">
            <span style={{ width: `${(valor(item) / maximo) * 100}%`, background: cor(item) }} />
          </span>
          <strong>{valor(item)}</strong>
          {sufixo && <small>{sufixo(item)}</small>}
        </li>
      ))}
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
        <div className="kpi">
          <small>Total de ocorrências</small>
          <strong>{dados.total}</strong>
        </div>
        <div className="kpi">
          <small>Em aberto</small>
          <strong>{dados.em_aberto}</strong>
        </div>
        <div className="kpi kpi-alerta">
          <small>Criticidade alta</small>
          <strong>{dados.criticas}</strong>
        </div>
        <div className="kpi">
          <small>Tempo Médio de Espera</small>
          <strong>
            {dados.tempo_medio_espera.toLocaleString('pt-BR')} <span>dias</span>
          </strong>
        </div>
        <div className="kpi kpi-ok">
          <small>Resolvidas</small>
          <strong>{dados.resolvidas}</strong>
          <span>média de {dados.tempo_medio_resolucao.toLocaleString('pt-BR')} dias</span>
        </div>
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
          />
        </div>

        <div className="painel">
          <h2>Em aberto por categoria</h2>
          <small>Demandas aguardando solução</small>
          <Barras
            itens={dados.por_categoria}
            rotulo={(c) => `${ICONES_CATEGORIA[c.nome]} ${c.nome}`}
            cor={() => '#2f80d1'}
          />
        </div>

        <div className="painel">
          <h2>Situação dos chamados</h2>
          <small>Todas as ocorrências por status</small>
          <Barras itens={dados.por_status} cor={(s) => CORES_STATUS[s.nome]} />
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
                <div>
                  <strong>{o.protocolo}</strong>
                  <small>
                    {o.categoria} · {o.bairro}
                  </small>
                </div>
                <CriticidadeBarra indice={o.indice_criticidade} faixa={o.faixa} />
                <StatusPonto status={o.status} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
