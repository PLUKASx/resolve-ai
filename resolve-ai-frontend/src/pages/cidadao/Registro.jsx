import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo';
import { MensagemErro } from '../../components/Indicadores';
import { api, sessao } from '../../services/api';
import { mascararCPF } from '../../utils/formato';
import Celular from './Celular';

export default function Registro() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: '', cpf: '', senha: '', confirmacao: '' });
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const alterar = (campo) => (e) =>
    setForm({ ...form, [campo]: campo === 'cpf' ? mascararCPF(e.target.value) : e.target.value });

  async function registrar(e) {
    e.preventDefault();
    setErro('');
    if (form.senha !== form.confirmacao) {
      setErro('As senhas não conferem.');
      return;
    }
    setEnviando(true);
    try {
      sessao.salvar('cidadao', await api.cidadao.registrar(form.nome, form.cpf, form.senha));
      navigate('/app', { replace: true });
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Celular>
      <form className="tela-auth" onSubmit={registrar}>
        <Logo tamanho={64} />
        <h1>Criar conta</h1>
        <p>Suas denúncias ficam visíveis só para você e para a gestão.</p>

        <input className="campo" placeholder="Nome completo" value={form.nome} onChange={alterar('nome')} required minLength={3} />
        <input className="campo" inputMode="numeric" placeholder="CPF" value={form.cpf} onChange={alterar('cpf')} required />
        <input className="campo" type="password" placeholder="Senha (mínimo 6 caracteres)" value={form.senha} onChange={alterar('senha')} required minLength={6} />
        <input className="campo" type="password" placeholder="Confirme a senha" value={form.confirmacao} onChange={alterar('confirmacao')} required />
        <MensagemErro erro={erro} />
        <button className="botao" disabled={enviando}>
          {enviando ? 'Criando conta...' : 'Registrar'}
        </button>
        <Link to="/app/login" className="link">
          Já tem conta? Entrar
        </Link>
      </form>
    </Celular>
  );
}
