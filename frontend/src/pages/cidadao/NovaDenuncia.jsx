import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaixaBadge, MensagemErro } from '../../components/Indicadores';
import { MapaPonto } from '../../components/Mapa';
import { api } from '../../services/api';
import { ambienteDeTeste } from '../../utils/dispositivo';
import IconeCategoria from '../../components/IconeCategoria';
import {
  abrirConfiguracoesDoApp,
  pedirLocalizacaoExata,
  podeAbrirConfiguracoes,
  podePedirLocalizacaoExata,
} from '../../utils/localizacaoExata';

const IDADE_MAXIMA_FOTO_MS = 3 * 60 * 1000;
const DESCRICAO_MINIMA = 10;
const LIMITE_GPS_PADRAO_M = 1000;

const PONTOS_DEMO = [
  [-16.3267, -48.9528],
  [-16.3475, -48.9335],
  [-16.2975, -48.965],
  [-16.318, -48.9405],
];

const PRECISAO_BOA_M = 20;
const ESPERA_MELHORAR_MS = 8000;

function lerGPS() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Este dispositivo não oferece GPS.'));
      return;
    }
    let melhor = null;
    let terminou = false;
    const terminar = (erro) => {
      if (terminou) return;
      terminou = true;
      navigator.geolocation.clearWatch(id);
      clearTimeout(limite);
      clearTimeout(desistir);
      if (melhor) resolve(melhor);
      else reject(erro ?? new Error('Não foi possível obter sua localização agora.'));
    };
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        if (melhor && pos.coords.accuracy >= melhor.precisao) return;
        melhor = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          precisao: pos.coords.accuracy,
          capturadoEm: pos.timestamp,
          simulado: false,
        };
        if (melhor.precisao <= PRECISAO_BOA_M) terminar();
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          terminar(new Error('Permissão de localização negada. Libere o acesso à localização para o app.'));
        } else if (!melhor) {
          terminar(new Error('Não foi possível obter sua localização agora.'));
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
    const limite = setTimeout(() => melhor && terminar(), ESPERA_MELHORAR_MS);
    const desistir = setTimeout(() => terminar(), 15000);
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
    api
      .opcoes()
      .then((o) => {
        setCategorias(o.categorias);
        if (o.gps_precisao_maxima_m) setLimiteGPS(o.gps_precisao_maxima_m);
      })
      .catch((e) => setErro(e.message));
    capturarGPS();
  }, []);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const pedidosExata = useRef(0);
  const [limiteGPS, setLimiteGPS] = useState(LIMITE_GPS_PADRAO_M);
  const aproximada = gps.estado === 'ok' && !gps.simulado && gps.precisao > limiteGPS;

  async function capturarGPS() {
    setGps({ estado: 'buscando' });
    try {
      let leitura = await lerGPS();
      if (leitura.precisao > limiteGPS && pedidosExata.current === 0 && podePedirLocalizacaoExata()) {
        pedidosExata.current += 1;
        if (await pedirLocalizacaoExata()) leitura = await lerGPS();
      }
      setGps({ estado: 'ok', ...leitura });
    } catch (e) {
      setGps({ estado: 'erro', mensagem: e.message });
    }
  }

  async function ativarLocalizacaoExata() {
    if (podePedirLocalizacaoExata() && pedidosExata.current < 2) {
      pedidosExata.current += 1;
      if (await pedirLocalizacaoExata()) capturarGPS();
      else setGps((g) => ({ ...g }));
    } else if (podeAbrirConfiguracoes()) {
      await abrirConfiguracoesDoApp();
    } else {
      capturarGPS();
    }
  }

  const aproximadaRef = useRef(false);
  aproximadaRef.current = aproximada;
  useEffect(() => {
    const aoVoltar = () => document.visibilityState === 'visible' && aproximadaRef.current && capturarGPS();
    document.addEventListener('visibilitychange', aoVoltar);
    return () => document.removeEventListener('visibilitychange', aoVoltar);
  }, []);

  const vaiAbrirConfiguracoes = !(podePedirLocalizacaoExata() && pedidosExata.current < 2) && podeAbrirConfiguracoes();

  function escolherFoto(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    const idade = Date.now() - (arquivo.lastModified || 0);
    if (!ambienteDeTeste() && (idade > IDADE_MAXIMA_FOTO_MS || idade < -60 * 1000)) {
      setErro('A foto precisa ser tirada agora, pela câmera, no local do problema. Fotos da galeria não são aceitas.');
      return;
    }
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
    if (!foto) {
      setErro('Tire uma foto do problema.');
      return;
    }
    if (!categoria) {
      setErro('Selecione a categoria do problema.');
      return;
    }
    if (descricao.trim().length < DESCRICAO_MINIMA) {
      setErro(`Descreva o problema com pelo menos ${DESCRICAO_MINIMA} caracteres.`);
      return;
    }
    if (gps.estado !== 'ok') {
      setErro('Aguarde a captura da sua localização.');
      return;
    }
    if (aproximada) {
      setErro('Para denunciar, ative a localização exata.');
      return;
    }

    setEnviando(true);
    try {
      let posicao = gps;
      if (gps.simulado) {
        posicao = { ...gps, capturadoEm: Date.now() };
      } else if (Date.now() - gps.capturadoEm > 4 * 60 * 1000) {
        posicao = await lerGPS().catch(() => gps);
      }

      const dados = new FormData();
      dados.append('categoria', categoria);
      dados.append('descricao', descricao);
      dados.append('latitude', posicao.latitude);
      dados.append('longitude', posicao.longitude);
      dados.append('precisao', posicao.precisao);
      dados.append('capturado_em', Math.round(posicao.capturadoEm));
      dados.append('foto', foto);

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
          {preview ? <img src={preview} alt="Pré-visualização da foto" /> : <><span>📷</span>Toque para tirar a foto agora</>}
        </button>
        {preview && (
          <button type="button" className="link" onClick={() => inputFoto.current.click()}>
            📷 Tirar outra foto
          </button>
        )}
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
            {aproximada ? (
              <div className="gps gps-aproximada">
                <span>
                  📍 <strong>Ative a localização exata para denunciar</strong>
                  <small>
                    {vaiAbrirConfiguracoes
                      ? 'Toque em Localização e ligue "Usar localização exata".'
                      : `Sua localização está aproximada (±${Math.round(gps.precisao)} m).`}
                  </small>
                </span>
                <button type="button" className="botao-exata" onClick={ativarLocalizacaoExata}>
                  {podePedirLocalizacaoExata() || podeAbrirConfiguracoes()
                    ? vaiAbrirConfiguracoes
                      ? 'Abrir permissões'
                      : 'Permitir'
                    : 'Atualizar'}
                </button>
              </div>
            ) : (
              <div className="gps gps-ok">
                📍 {gps.simulado ? 'Localização simulada (demonstração)' : 'Localização capturada'} · precisão ±
                {Math.round(gps.precisao)} m
                <button type="button" className="link" onClick={capturarGPS}>
                  Atualizar
                </button>
              </div>
            )}
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
      </section>

      <section>
        <h3>3. Categoria</h3>
        <div className="grade-categorias">
          {categorias.map((c) => (
            <button
              type="button"
              key={c.nome}
              className={categoria === c.nome ? 'selecionada' : ''}
              onClick={() => {
                setCategoria(c.nome);
                setErro('');
              }}
            >
              <span className="icone-botao"><IconeCategoria categoria={c.nome} /></span>
              {c.nome}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>4. Descrição</h3>
        <textarea
          className="campo"
          rows={3}
          maxLength={1000}
          placeholder="Ex.: buraco grande próximo ao ponto de ônibus, já causou acidente com moto"
          value={descricao}
          onChange={(e) => {
            setDescricao(e.target.value);
            setErro('');
          }}
        />
        <small className={`nota contador ${descricao.trim().length >= DESCRICAO_MINIMA ? 'contador-ok' : ''}`}>
          {descricao.trim().length >= DESCRICAO_MINIMA
            ? '✓ Obrigado pelos detalhes!'
            : `Conte o que está acontecendo: mínimo de ${DESCRICAO_MINIMA} caracteres (faltam ${DESCRICAO_MINIMA - descricao.trim().length}).`}
        </small>
      </section>

      <MensagemErro erro={erro} />
      <button className="botao" disabled={enviando || gps.estado !== 'ok'}>
        {enviando ? 'Enviando...' : 'Enviar denúncia'}
      </button>
    </form>
  );
}
