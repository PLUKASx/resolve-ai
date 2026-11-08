import { CORES_STATUS, formatarData } from '../utils/formato';

export default function LinhaDoTempo({ historico }) {
  return (
    <ol className="linha-tempo">
      {[...historico].reverse().map((h, i) => (
        <li key={i}>
          <i style={{ background: CORES_STATUS[h.status] }} />
          <div>
            <strong>{h.status}</strong>
            <small>
              {formatarData(h.data)} · {h.autor}
            </small>
            {h.observacao && <p>{h.observacao}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
