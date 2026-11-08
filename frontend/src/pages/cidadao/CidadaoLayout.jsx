import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo';
import { sessao } from '../../services/api';
import Celular from './Celular';

export default function CidadaoLayout() {
  const navigate = useNavigate();
  const usuario = sessao.usuario('cidadao');
  const primeiroNome = usuario?.nome?.split(' ')[0] ?? '';

  function sair() {
    sessao.sair('cidadao');
    navigate('/app/login', { replace: true });
  }

  return (
    <Celular>
      <header className="app-topo">
        <Link to="/app" className="app-marca">
          <Logo tamanho={30} />
          <strong>Resolve Aí!</strong>
        </Link>
        <nav className="app-menu-pc">
          <NavLink to="/app" end>
            Minhas denúncias
          </NavLink>
          <NavLink to="/app/mapa">Mapa</NavLink>
          <NavLink to="/app/nova" className="botao">
            ＋ Nova denúncia
          </NavLink>
        </nav>
        <div className="app-saudacao">
          <small>Olá,</small>
          <strong>{primeiroNome} 👋</strong>
        </div>
        <button type="button" className="link" onClick={sair}>
          Sair
        </button>
      </header>

      <main className="app-conteudo">
        <Outlet />
      </main>

      <nav className="app-nav">
        <NavLink to="/app" end>
          <span>🏠</span>Início
        </NavLink>
        <NavLink to="/app/nova" className="app-nav-destaque">
          <span>＋</span>Denunciar
        </NavLink>
        <NavLink to="/app/mapa">
          <span>🗺️</span>Mapa
        </NavLink>
      </nav>
    </Celular>
  );
}
