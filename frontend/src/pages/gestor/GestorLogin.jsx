import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { MensagemErro } from '../../components/Indicadores';
import { api, sessao } from '../../services/api';
import CampoSenha from '../../components/CampoSenha';

export default function GestorLogin() {
  const navigate = useNavigate();
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (sessao.token('gestor')) return <Navigate to="/gestao" replace />;

  async function entrar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      sessao.salvar('gestor', await api.gestor.login(matricula, senha));
      navigate('/gestao', { replace: true });
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="gestor-login-fundo">
      <form className="gestor-login" onSubmit={entrar}>
        <h1>Resolve Aí! Gestão</h1>
        <p>Acesso restrito a gestores públicos.</p>
        <label>
          Matrícula
          <input className="campo" value={matricula} onChange={(e) => setMatricula(e.target.value)} required autoComplete="username" />
        </label>
        <label>
          Senha
          <CampoSenha
            className="campo"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <MensagemErro erro={erro} />
        <button className="botao" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar no painel'}
        </button>
        <p className="dica">Demonstração: matrícula 1001 · senha gestor123</p>
        <Link to="/" className="link">
          ← Voltar
        </Link>
      </form>
    </div>
  );
}
