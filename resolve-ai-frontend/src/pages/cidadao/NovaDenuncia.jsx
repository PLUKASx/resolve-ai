import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaixaBadge, MensagemErro } from '../../components/Indicadores';
import { MapaPonto } from '../../components/Mapa';
import { api } from '../../services/api';
import { ICONES_CATEGORIA } from '../../utils/formato';

const PONTOS_DEMO = [
  [-16.3267, -48.9528],
  [-16.3475, -48.9335],
  [-16.2975, -48.965],
  [-16.318, -48.9405],
];

function lerGPS() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Este dispositivo não oferece GPS.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          precisao: pos.coords.accuracy,
          capturadoEm: pos.timestamp,
          simulado: false,
        }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? 'Permissão de localização negada. Libere o acesso à localização no navegador.'
              : 'Não foi possível obter sua localização agora.',
          ),
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

function posicaoSimulada() {
  const [lat, lon] = PONTOS_DEMO[Math.floor(Math.random() * PONTOS_DEMO.length)];
  return {
    latitude: lat + (Math.random() - 0.5) * 0.004,
    longitude: lon + (Math.random() - 0.5) * 0.004,
    precisao: 12,
    capturadoEm: Date.now(),
    simulado: true,
  };
}

export default function NovaDenuncia() {
  const [categorias, setCategorias] = useState([]);
  const [categoria, setCategoria] = useState('');
  const [descricao, setDescricao] = useState('');
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [gps, setGps] = useState({ estado: 'buscando' });
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [criada, setCriada] = useState(null);
  const inputFoto = useRef(null);

  useEffect(() => {
    api.opcoes().then((o) => setCategorias(o.categorias)).catch((e) => setErro(e.message));
    capturarGPS();
  }, []);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  async function capturarGPS() {
    setGps({ estado: 'buscando' });
    try {
      setGps({ estado: 'ok', ...(await lerGPS()) });
    } catch (e) {
      setGps({ estado: 'erro', mensagem: e.message });
    }
  }

  function escolherFoto(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (arquivo.size > 5 * 1024 * 1024) {
      setErro('A foto deve ter no máximo 5 MB.');
      return;
    }
    setErro('');
    setFoto(arquivo);
    setPreview(URL.createObjectURL(arquivo));
  }

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    if (!categoria) {
      setErro('Selecione a categoria do problema.');
      return;
    }
    if (gps.estado !== 'ok') {
      setErro('Aguarde a captura da sua localização.');
      return;
    }

    setEnviando(true);
    try {
      let posicao = gps;
      if (gps.simulado) {
        posicao = { ...gps, capturadoEm: Date.now() };
      } else {
        posicao = await lerGPS().catch(() => gps);
      }

      const dados = new FormData();
      dados.append('categoria', categoria);
      dados.append('descricao', descricao);
      dados.append('latitude', posicao.latitude);
      dados.append('longitude', posicao.longitude);
      dados.append('precisao', posicao.precisao);
      dados.append('capturado_em', Math.round(posicao.capturadoEm));
      if (foto) dados.append('foto', foto);

      setCriada(await api.cidadao.registrarOcorrencia(dados));
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (criada) {
    return (
      <div className="sucesso">
        <span className="sucesso-icone">✅</span>
        <h2>Denúncia registrada!</h2>
        <p>
          Protocolo <strong>{criada.protocolo}</strong>
        </p>
        <dl className="resumo">
          <dt>Bairro</dt>
          <dd>{criada.bairro}</dd>
          <dt>Encaminhada para</dt>
          <dd>{criada.departamento}</dd>
          <dt>Prioridade</dt>
          <dd>
            <FaixaBadge faixa={criada.faixa} />
          </dd>
        </dl>
        <Link className="botao" to={`/app/denuncia/${criada.id}`}>
          Acompanhar denúncia
        </Link>
        <Link className="link" to="/app">
          Voltar ao início
        </Link>
      </div>
    );
  }

  return (
    <form className="form-denuncia" onSubmit={enviar}>
      <h2>Nova denúncia</h2>

      <section>
        <h3>1. Foto do problema</h3>
        <input ref={inputFoto} type="file" accept="image/*" capture="environment" hidden onChange={escolherFoto} />
        <button type="button" className={`area-foto ${preview ? 'com-foto' : ''}`} onClick={() => inputFoto.current.click()}>
          {preview ? <img src={preview} alt="Pré-visualização da foto" /> : <><span>📷</span>Toque para tirar ou anexar uma foto</>}
        </button>
      </section>

      <section>
        <h3>2. Localização (automática)</h3>
        {gps.estado === 'buscando' && (
          <div className="gps gps-buscando">
            <span className="spinner" /> Capturando sua localização pelo GPS...
          </div>
        )}
        {gps.estado === 'ok' && (
          <>
            <MapaPonto latitude={gps.latitude} longitude={gps.longitude} precisao={gps.precisao} />
            <div className="gps gps-ok">
              📍 {gps.simulado ? 'Localização simulada (demonstração)' : 'Localização capturada'} · precisão ±
              {Math.round(gps.precisao)} m
              <button type="button" className="link" onClick={capturarGPS}>
                Atualizar
              </button>
            </div>
          </>
        )}
        {gps.estado === 'erro' && (
          <div className="gps gps-erro">
            {gps.mensagem}
            <div className="gps-acoes">
              <button type="button" className="botao botao-secundario" onClick={capturarGPS}>
                Tentar novamente
              </button>
              {import.meta.env.DEV && (
                <button type="button" className="link" onClick={() => setGps({ estado: 'ok', ...posicaoSimulada() })}>
                  Simular GPS (modo demonstração)
                </button>
              )}
            </div>
          </div>
        )}
        <small className="nota">Para evitar trotes, o endereço não pode ser digitado manualmente.</small>
      </section>

      <section>
        <h3>3. Categoria</h3>
        <div className="grade-categorias">
          {categorias.map((c) => (
            <button
              type="button"
              key={c.nome}
              className={categoria === c.nome ? 'selecionada' : ''}
              onClick={() => setCategoria(c.nome)}
            >
              <span>{ICONES_CATEGORIA[c.nome]}</span>
              {c.nome}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>4. Descrição (opcional)</h3>
        <textarea
          className="campo"
          rows={3}
          maxLength={1000}
          placeholder="Ex.: buraco grande próximo ao ponto de ônibus"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
      </section>

      <MensagemErro erro={erro} />
      <button className="botao" disabled={enviando || gps.estado !== 'ok'}>
        {enviando ? 'Enviando...' : 'Enviar denúncia'}
      </button>
    </form>
  );
}
