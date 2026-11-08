import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo';
import { MensagemErro } from '../../components/Indicadores';
import ReenviarCodigo from '../../components/ReenviarCodigo';
import { api, sessao } from '../../services/api';
import { mascararCPF } from '../../utils/formato';
import Celular from './Celular';
import CampoSenha from '../../components/CampoSenha';

export default function EsqueciSenha() {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState(1);
  const [cpf, setCpf] = useState('');
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function pedirCodigo(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const { mensagem } = await api.cidadao.esqueciSenha(cpf);
      setAviso(mensagem);
      setEtapa(2);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function redefinir(e) {
    e.preventDefault();
    setErro('');
    if (senha !== confirmacao) {
      setErro('As senhas não conferem.');
      return;
    }
    setEnviando(true);
    try {
      sessao.salvar('cidadao', await api.cidadao.redefinirSenha(cpf, codigo, senha));
      navigate('/app', { replace: true });
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Celular>
      {etapa === 1 ? (
        <form className="tela-auth" onSubmit={pedirCodigo}>
          <Logo tamanho={64} />
          <h1>Esqueci minha senha</h1>
          <p>Informe seu CPF. Vamos enviar um código para o e-mail da sua conta.</p>
          <input className="campo" inputMode="numeric" placeholder="CPF" value={cpf} onChange={(e) => setCpf(mascararCPF(e.target.value))} required autoComplete="username" />
          <MensagemErro erro={erro} />
          <button className="botao" disabled={enviando}>
            {enviando ? 'Enviando...' : 'Enviar código'}
          </button>
          <Link to="/app/login" className="link">
            ← Voltar para a entrada
          </Link>
        </form>
      ) : (
        <form className="tela-auth" onSubmit={redefinir}>
          <Logo tamanho={64} />
          <h1>Criar nova senha</h1>
          <p>{aviso}</p>
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
          <CampoSenha className="campo" placeholder="Nova senha (mínimo 6 caracteres)" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} autoComplete="new-password" />
          <CampoSenha className="campo" placeholder="Confirme a nova senha" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} required autoComplete="new-password" />
          <MensagemErro erro={erro} />
          <button className="botao" disabled={enviando || codigo.length !== 6}>
            {enviando ? 'Salvando...' : 'Salvar nova senha'}
          </button>
          <ReenviarCodigo aoReenviar={() => api.cidadao.esqueciSenha(cpf)} aoErro={setErro} />
          <button type="button" className="link" onClick={() => setEtapa(1)}>
            Usar outro CPF
          </button>
          <p className="nota">Não tem mais acesso ao e-mail da conta? Procure o atendimento da prefeitura.</p>
        </form>
      )}
    </Celular>
  );
}
