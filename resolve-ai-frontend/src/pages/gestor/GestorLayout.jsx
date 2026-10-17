import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { sessao } from '../../services/api';

export default function GestorLayout() {
  const navigate = useNavigate();
  const usuario = sessao.usuario('gestor');

  function sair() {
    sessao.sair('gestor');
    navigate('/gestao/login', { replace: true });
  }

  return (
    <div className="gestor">
      <aside className="gestor-menu">
        <h1>Resolve Aí! Gestão</h1>
        <nav>
          <NavLink to="/gestao" end>
            📊 Dashboard Geral
          </NavLink>
          <NavLink to="/gestao/ocorrencias">🚨 Ocorrências (Criticidade)</NavLink>
          <NavLink to="/gestao/mapa">🗺️ Mapa de Calor</NavLink>
        </nav>
        <div className="gestor-usuario">
          <small>{usuario?.nome}</small>
          <button type="button" onClick={sair}>
            Sair
          </button>
        </div>
      </aside>
      <main className="gestor-conteudo">
        <Outlet />
      </main>
    </div>
  );
}
