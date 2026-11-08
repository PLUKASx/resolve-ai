import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Carregando, FaixaBadge, MensagemErro, StatusChip } from '../../components/Indicadores';
import { MapaPonto } from '../../components/Mapa';
import Linha from '../../components/LinhaDoTempo';
import { api } from '../../services/api';
import { formatarData, textoDias } from '../../utils/formato';
import IconeCategoria from '../../components/IconeCategoria';

export default function DetalheDenuncia() {
  const { id } = useParams();
  const [oc, setOc] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.cidadao.detalhe(id).then(setOc).catch((e) => setErro(e.message));
  }, [id]);

  if (erro) return <MensagemErro erro={erro} />;
  if (!oc) return <Carregando />;

  return (
    <div className="detalhe">
      <Link to="/app" className="link voltar">
        ← Minhas denúncias
      </Link>
      <div className="detalhe-topo">
        <span className="icone-categoria"><IconeCategoria categoria={oc.categoria} /></span>
        <div>
          <h2>{oc.categoria}</h2>
          <small>
            {oc.protocolo} · {formatarData(oc.data_registro)}
          </small>
        </div>
      </div>

      <div className="detalhe-chips">
        <StatusChip status={oc.status} />
        <FaixaBadge faixa={oc.faixa} />
      </div>

      {oc.foto_url && <img className="detalhe-foto" src={oc.foto_url} alt="Foto enviada" />}
      {oc.descricao && <p className="detalhe-descricao">“{oc.descricao}”</p>}

      <MapaPonto latitude={oc.latitude} longitude={oc.longitude} precisao={oc.precisao_gps} altura={140} />

      <dl className="resumo">
        <dt>Bairro</dt>
        <dd>{oc.bairro}</dd>
        <dt>Responsável</dt>
        <dd>{oc.departamento}</dd>
        <dt>{oc.data_resolucao ? 'Tempo até a solução' : 'Aguardando há'}</dt>
        <dd>{textoDias(oc.dias_espera)}</dd>
      </dl>

      <h3>Acompanhamento</h3>
      <Linha historico={oc.historico} />
    </div>
  );
}
