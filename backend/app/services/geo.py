from .criticidade import distancia_m

CENTRO_ANAPOLIS = (-16.3281, -48.9530)

BAIRROS = {
    "Centro": (-16.3267, -48.9528),
    "Jundiaí": (-16.3180, -48.9405),
    "Vila Jaiara": (-16.2975, -48.9650),
    "Jardim das Américas": (-16.3475, -48.9335),
    "Maracanã": (-16.3420, -48.9690),
    "Bairro de Lourdes": (-16.3320, -48.9640),
    "Vila Santa Isabel": (-16.3135, -48.9555),
    "Jardim Alexandrina": (-16.3545, -48.9480),
    "Recanto do Sol": (-16.3650, -48.9620),
    "Parque Brasília": (-16.3060, -48.9300),
    "Cidade Universitária": (-16.2900, -48.9440),
    "Vila Góis": (-16.3365, -48.9460),
    "São Carlos": (-16.3230, -48.9700),
    "Jardim Progresso": (-16.3010, -48.9480),
}

RAIO_MAXIMO_M = 5_000


def bairro_mais_proximo(lat: float, lon: float) -> str:
    nome, dist = min(
        ((n, distancia_m(lat, lon, *c)) for n, c in BAIRROS.items()),
        key=lambda item: item[1],
    )
    return nome if dist <= RAIO_MAXIMO_M else "Outra localidade"
