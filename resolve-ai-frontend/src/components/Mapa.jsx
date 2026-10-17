import { Circle, CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { CENTRO_ANAPOLIS, CORES_FAIXA, ICONES_CATEGORIA } from '../utils/formato';

const TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATRIBUICAO = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export function MapaOcorrencias({ pontos, calor = false, altura = 420, zoom = 13 }) {
  return (
    <MapContainer center={CENTRO_ANAPOLIS} zoom={zoom} style={{ height: altura }} className="mapa">
      <TileLayer url={TILES} attribution={ATRIBUICAO} />
      {calor &&
        pontos.map((p, i) => (
          <Circle
            key={`c${i}`}
            center={[p.latitude, p.longitude]}
            radius={150 + p.indice_criticidade * 4}
            pathOptions={{ stroke: false, fillColor: CORES_FAIXA[p.faixa].cor, fillOpacity: 0.2 }}
          />
        ))}
      {pontos.map((p, i) => (
        <CircleMarker
          key={`m${i}`}
          center={[p.latitude, p.longitude]}
          radius={calor ? 5 : 7}
          pathOptions={{ color: '#fff', weight: 1.5, fillColor: CORES_FAIXA[p.faixa].cor, fillOpacity: 0.95 }}
        >
          <Popup>
            <strong>
              {ICONES_CATEGORIA[p.categoria]} {p.categoria}
            </strong>
            <br />
            {p.bairro} · {p.status}
            <br />
            Criticidade: <b>{p.indice_criticidade}</b> ({p.faixa})
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

export function MapaPonto({ latitude, longitude, precisao, altura = 160 }) {
  return (
    <MapContainer
      key={`${latitude},${longitude}`}
      center={[latitude, longitude]}
      zoom={16}
      style={{ height: altura }}
      className="mapa"
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url={TILES} />
      {precisao > 0 && (
        <Circle
          center={[latitude, longitude]}
          radius={Math.min(precisao, 500)}
          pathOptions={{ color: '#2f80d1', weight: 1, fillOpacity: 0.12 }}
        />
      )}
      <CircleMarker
        center={[latitude, longitude]}
        radius={8}
        pathOptions={{ color: '#fff', weight: 2, fillColor: '#2f80d1', fillOpacity: 1 }}
      />
    </MapContainer>
  );
}
