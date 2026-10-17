import { CORES_FAIXA, CORES_STATUS } from '../utils/formato';

export function StatusPonto({ status }) {
  return (
    <span className="status-ponto">
      <i style={{ background: CORES_STATUS[status] || '#94a3b8' }} />
      {status}
    </span>
  );
}

export function StatusChip({ status }) {
  const cor = CORES_STATUS[status] || '#94a3b8';
  return (
    <span className="chip" style={{ color: cor, background: `${cor}1f` }}>
      {status}
    </span>
  );
}

export function FaixaBadge({ faixa }) {
  const c = CORES_FAIXA[faixa] || CORES_FAIXA.Baixa;
  return (
    <span className="badge" style={{ color: c.texto, background: c.fundo }}>
      {faixa}
    </span>
  );
}

export function CriticidadeBarra({ indice, faixa }) {
  const c = CORES_FAIXA[faixa] || CORES_FAIXA.Baixa;
  return (
    <span className="criticidade">
      <span className="criticidade-trilho">
        <span style={{ width: `${indice}%`, background: c.cor }} />
      </span>
      <strong>{indice}</strong>
      <FaixaBadge faixa={faixa} />
    </span>
  );
}

export function Carregando({ texto = 'Carregando...' }) {
  return (
    <div className="estado">
      <span className="spinner" />
      {texto}
    </div>
  );
}

export function MensagemErro({ erro, tentarNovamente }) {
  if (!erro) return null;
  return (
    <div className="alerta alerta-erro">
      {erro}
      {tentarNovamente && (
        <button type="button" className="link" onClick={tentarNovamente}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
