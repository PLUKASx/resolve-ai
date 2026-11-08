import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Carregando, MensagemErro, StatusChip } from '../../components/Indicadores';
import { api } from '../../services/api';
import { formatarData } from '../../utils/formato';
import IconeCategoria from '../../components/IconeCategoria';

export default function MinhasDenuncias() {
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    setErro('');
    api.cidadao.minhas().then(setLista).catch((e) => setErro(e.message));
  }, []);

  useEffect(carregar, [carregar]);

  const emAndamento = lista?.filter((o) => !['Resolvida', 'Improcedente'].includes(o.status)).length ?? 0;

  return (
    <>
      <Link to="/app/nova" className="cartao-cta">
        <span>📸</span>
        <div>
          <strong>Nova denúncia</strong>
          <small>Foto + localização automática em segundos</small>
        </div>
      </Link>

      <div className="secao-titulo">
        <h2>Minhas denúncias</h2>
        {lista && <small>{emAndamento} em andamento</small>}
      </div>

      <MensagemErro erro={erro} tentarNovamente={carregar} />
      {!lista && !erro && <Carregando />}
      {lista?.length === 0 && (
        <div className="vazio">
          <span>📭</span>
          Você ainda não fez nenhuma denúncia.
        </div>
      )}

      <ul className="lista-denuncias">
        {lista?.map((o) => (
          <li key={o.id}>
            <Link to={`/app/denuncia/${o.id}`}>
              <span className="icone-categoria"><IconeCategoria categoria={o.categoria} /></span>
              <div>
                <strong>{o.categoria}</strong>
                <small>
                  {o.protocolo} · {o.bairro}
                </small>
                <small>{formatarData(o.data_registro, false)}</small>
              </div>
              <StatusChip status={o.status} />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
