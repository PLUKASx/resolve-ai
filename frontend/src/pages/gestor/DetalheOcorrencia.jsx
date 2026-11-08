import { useEffect, useState } from 'react';
import { Carregando, CriticidadeBarra, MensagemErro, StatusPonto } from '../../components/Indicadores';
import LinhaDoTempo from '../../components/LinhaDoTempo';
import { MapaPonto } from '../../components/Mapa';
import { api } from '../../services/api';
import { formatarData, qualidadeGPS, textoNivel } from '../../utils/formato';
import IconeCategoria from '../../components/IconeCategoria';

export default function DetalheOcorrencia({ id, statusDisponiveis, aoFechar, aoAtualizar }) {
  const [oc, setOc] = useState(null);
  const [erro, setErro] = useState('');
  const [novoStatus, setNovoStatus] = useState('');
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api.gestor
      .ocorrencia(id)
      .then((dados) => {
        setOc(dados);
        setNovoStatus(dados.status);
      })
      .catch((e) => setErro(e.message));
  }, [id]);

  useEffect(() => {
    const fecharComEsc = (e) => e.key === 'Escape' && aoFechar();
    const fecharComVoltar = (e) => {
      e.preventDefault();
      aoFechar();
    };
    window.addEventListener('keydown', fecharComEsc);
    window.addEventListener('resolveai:voltar', fecharComVoltar);
    return () => {
      window.removeEventListener('keydown', fecharComEsc);
      window.removeEventListener('resolveai:voltar', fecharComVoltar);
    };
  }, [aoFechar]);

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      const atualizada = await api.gestor.atualizarStatus(id, novoStatus, observacao);
      setOc(atualizada);
      setObservacao('');
      aoAtualizar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  const comp = oc?.composicao_indice;

  return (
    <div className="modal-fundo" onClick={aoFechar}>
      <aside className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="modal-fechar" onClick={aoFechar} aria-label="Fechar">
          ×
        </button>
        {!oc && !erro && <Carregando />}
        {!oc && <MensagemErro erro={erro} />}
        {oc && (
          <>
            <header className="modal-topo">
              <span className="icone-categoria"><IconeCategoria categoria={oc.categoria} /></span>
              <div>
                <h2>
                  {oc.protocolo} — {oc.categoria}
                </h2>
                <small>
                  {oc.bairro} · registrada em {formatarData(oc.data_registro)} · {oc.denunciante_ref}
                  {oc.denunciante_nivel && ` · ${textoNivel(oc.denunciante_nivel)}`}
                </small>
              </div>
            </header>

            <div className="modal-grade">
              <div>
                {oc.foto_url ? (
                  <img className="detalhe-foto" src={oc.foto_url} alt="Foto da ocorrência" />
                ) : (
                  <div className="sem-foto">Sem foto anexada</div>
                )}
                {oc.descricao && <p className="detalhe-descricao">“{oc.descricao}”</p>}
                <MapaPonto latitude={oc.latitude} longitude={oc.longitude} precisao={oc.precisao_gps} altura={180} />
                <small className="nota">
                  GPS {oc.latitude.toFixed(5)}, {oc.longitude.toFixed(5)} · precisão ±{Math.round(oc.precisao_gps)} m{' '}
                  <span
                    className="selo-gps"
                    style={{ color: qualidadeGPS(oc.precisao_gps).cor }}
                    title="Ótima ≤ 30 m · Boa ≤ 100 m · Fraca ≤ 1 km · Aproximada > 1 km"
                  >
                    {qualidadeGPS(oc.precisao_gps).rotulo}
                  </span>
                </small>
              </div>

              <div>
                <h3>Índice de Criticidade</h3>
                <CriticidadeBarra indice={oc.indice_criticidade} faixa={oc.faixa} />
                {comp && (
                  <table className="composicao">
                    <tbody>
                      <tr>
                        <td>Peso da categoria</td>
                        <td>+{comp.peso_categoria}</td>
                      </tr>
                      <tr>
                        <td>Tempo de espera ({comp.dias_espera} dias × 1,5, máx. 30)</td>
                        <td>+{comp.tempo_espera}</td>
                      </tr>
                      <tr>
                        <td>Recorrência ({comp.ocorrencias_proximas} iguais a até 300 m)</td>
                        <td>+{comp.recorrencia}</td>
                      </tr>
                      <tr>
                        <th>Total {comp.congelado && '(congelado na conclusão)'}</th>
                        <th>{comp.total}</th>
                      </tr>
                    </tbody>
                  </table>
                )}

                <p className="encaminhamento">
                  Encaminhada para <strong>{oc.departamento}</strong>
                </p>

                <form className="form-status" onSubmit={salvar}>
                  <h3>
                    Atualizar status <StatusPonto status={oc.status} />
                  </h3>
                  <select value={novoStatus} onChange={(e) => setNovoStatus(e.target.value)}>
                    {statusDisponiveis.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <textarea
                    rows={2}
                    maxLength={500}
                    placeholder="Observação para o cidadão (opcional)"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                  />
                  <MensagemErro erro={erro} />
                  <button className="botao" disabled={salvando}>
                    {salvando ? 'Salvando...' : 'Salvar atualização'}
                  </button>
                </form>
              </div>
            </div>

            <h3>Histórico</h3>
            <LinhaDoTempo historico={oc.historico} />
          </>
        )}
      </aside>
    </div>
  );
}
