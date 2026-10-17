import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo';
import { MensagemErro } from '../../components/Indicadores';
import { api, sessao } from '../../services/api';
import { mascararCPF } from '../../utils/formato';
import Celular from './Celular';

export default function Login() {
  const navigate = useNavigate();
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (sessao.token('cidadao')) return <Navigate to="/app" replace />;

  async function entrar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      sessao.salvar('cidadao', await api.cidadao.login(cpf, senha));
      navigate('/app', { replace: true });
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Celular>
      <form className="tela-auth" onSubmit={entrar}>
        <Logo />
        <h1>Bem-vindo ao Resolve Aí!</h1>
        <p>Denuncie problemas urbanos com poucos toques.</p>

        <input
          className="campo"
          inputMode="numeric"
          autoComplete="username"
          placeholder="Digite seu CPF"
          value={cpf}
          onChange={(e) => setCpf(mascararCPF(e.target.value))}
          required
        />
        <input
          className="campo"
          type="password"
          autoComplete="current-password"
          placeholder="Digite sua senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />
        <MensagemErro erro={erro} />
        <button className="botao" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
        <Link to="/app/registro" className="link">
          Não tem conta? Registrar-se
        </Link>
        <p className="dica">Demonstração: CPF 529.982.247-25 · senha 123456</p>
      </form>
    </Celular>
  );
}
