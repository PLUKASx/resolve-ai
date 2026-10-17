import { Navigate, Route, Routes } from 'react-router-dom';
import AvisoAtualizacao from './components/AvisoAtualizacao';
import RequerLogin from './components/RequerLogin';
import Inicio from './pages/Inicio';
import CidadaoLayout from './pages/cidadao/CidadaoLayout';
import DetalheDenuncia from './pages/cidadao/DetalheDenuncia';
import Login from './pages/cidadao/Login';
import MeuMapa from './pages/cidadao/MeuMapa';
import MinhasDenuncias from './pages/cidadao/MinhasDenuncias';
import NovaDenuncia from './pages/cidadao/NovaDenuncia';
import Registro from './pages/cidadao/Registro';
import Dashboard from './pages/gestor/Dashboard';
import GestorLayout from './pages/gestor/GestorLayout';
import GestorLogin from './pages/gestor/GestorLogin';
import MapaCalor from './pages/gestor/MapaCalor';
import Ocorrencias from './pages/gestor/Ocorrencias';
import { appNativo } from './utils/appNativo';

const INICIO_DO_APP = { cidadao: '/app', gestor: '/gestao' }[appNativo?.perfil];

export default function App() {
  return (
    <>
      <AvisoAtualizacao />
      <Routes>
        <Route path="/" element={INICIO_DO_APP ? <Navigate to={INICIO_DO_APP} replace /> : <Inicio />} />

        <Route path="/app/login" element={<Login />} />
        <Route path="/app/registro" element={<Registro />} />
        <Route
          path="/app"
          element={
            <RequerLogin perfil="cidadao">
              <CidadaoLayout />
            </RequerLogin>
          }
        >
          <Route index element={<MinhasDenuncias />} />
          <Route path="nova" element={<NovaDenuncia />} />
          <Route path="denuncia/:id" element={<DetalheDenuncia />} />
          <Route path="mapa" element={<MeuMapa />} />
        </Route>

        <Route path="/gestao/login" element={<GestorLogin />} />
        <Route
          path="/gestao"
          element={
            <RequerLogin perfil="gestor">
              <GestorLayout />
            </RequerLogin>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="ocorrencias" element={<Ocorrencias />} />
          <Route path="mapa" element={<MapaCalor />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
