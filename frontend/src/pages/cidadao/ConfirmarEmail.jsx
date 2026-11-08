import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Logo from '../../components/Logo';
import { MensagemErro } from '../../components/Indicadores';
import ReenviarCodigo from '../../components/ReenviarCodigo';
import { api, sessao } from '../../services/api';
import { mascararCPF } from '../../utils/formato';
import Celular from './Celular';

export default function ConfirmarEmail() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [params] = useSearchParams();
  const [cpf, setCpf] = useState(mascararCPF(params.get('cpf') || ''));
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function confirmar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      sessao.salvar('cidadao', await api.cidadao.confirmarEmail(cpf, codigo));
      navigate('/app', { replace: true });
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Celular>
      <form className="tela-auth" onSubmit={confirmar}>
        <Logo tamanho={64} />
        <h1>Confirme seu e-mail</h1>
        <p>
          {state?.mensagem ||
            (state?.emailMascarado
              ? `Enviamos um código de 6 dígitos para ${state.emailMascarado}.`
              : 'Digite o código de 6 dígitos que enviamos para o seu e-mail.')}
        </p>

        {!params.get('cpf') && (
          <input className="campo" inputMode="numeric" placeholder="CPF" value={cpf} onChange={(e) => setCpf(mascararCPF(e.target.value))} required />
        )}
        <input
          className="campo campo-codigo"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          maxLength={6}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
          required
          minLength={6}
          autoFocus
        />
        <MensagemErro erro={erro} />
        <button className="botao" disabled={enviando || codigo.length !== 6}>
          {enviando ? 'Confirmando...' : 'Confirmar e entrar'}
        </button>
        <ReenviarCodigo aoReenviar={() => api.cidadao.reenviarCodigo(cpf)} aoErro={setErro} />
        <Link to="/app/login" className="link">
          ← Voltar para a entrada
        </Link>
      </form>
    </Celular>
  );
}
