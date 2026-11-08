import { useEffect, useState } from 'react';

const ESPERA_S = 60;

export default function ReenviarCodigo({ aoReenviar, aoErro }) {
  const [restante, setRestante] = useState(ESPERA_S);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    if (restante <= 0) return undefined;
    const t = setTimeout(() => setRestante((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [restante]);

  async function reenviar() {
    setEnviando(true);
    setAviso('');
    try {
      await aoReenviar();
      setAviso('Código reenviado. Confira também a caixa de spam.');
      setRestante(ESPERA_S);
    } catch (err) {
      aoErro?.(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="reenviar">
      {restante > 0 ? (
        <small>Não chegou? Você pode pedir outro código em {restante}s.</small>
      ) : (
        <button type="button" className="link" onClick={reenviar} disabled={enviando}>
          {enviando ? 'Enviando...' : 'Reenviar código'}
        </button>
      )}
      {aviso && <small className="texto-ok">{aviso}</small>}
    </div>
  );
}
