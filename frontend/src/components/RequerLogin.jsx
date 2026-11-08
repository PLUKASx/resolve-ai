import { Navigate } from 'react-router-dom';
import { sessao } from '../services/api';

const LOGIN = { cidadao: '/app/login', gestor: '/gestao/login' };

export default function RequerLogin({ perfil, children }) {
  if (!sessao.token(perfil)) return <Navigate to={LOGIN[perfil]} replace />;
  return children;
}
