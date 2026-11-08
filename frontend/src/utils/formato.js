export const ICONES_CATEGORIA = {
  'Vazamento de água': '💧',
  'Esgoto a céu aberto': '🚱',
  'Buraco na via': '🕳️',
  'Árvore caída': '🌳',
  'Iluminação pública': '💡',
  'Sinalização danificada': '🚸',
  'Lixo e entulho': '🗑️',
  Outros: '📌',
};

export const CORES_STATUS = {
  Aberta: '#94a3b8',
  'Em análise': '#f59e0b',
  Encaminhada: '#10b981',
  'Em execução': '#3b82f6',
  Resolvida: '#16a34a',
  Improcedente: '#ef4444',
};

export const CORES_FAIXA = {
  Alta: { cor: '#ef4444', fundo: '#fee2e2', texto: '#b91c1c' },
  Média: { cor: '#f59e0b', fundo: '#fef3c7', texto: '#b45309' },
  Baixa: { cor: '#22c55e', fundo: '#dcfce7', texto: '#15803d' },
};

export const CENTRO_ANAPOLIS = [-16.3281, -48.953];

export function mascararCPF(valor) {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function formatarData(iso, comHora = true) {
  const data = new Date(iso);
  const opcoes = { day: '2-digit', month: '2-digit', year: 'numeric' };
  if (comHora) Object.assign(opcoes, { hour: '2-digit', minute: '2-digit' });
  return data.toLocaleString('pt-BR', opcoes);
}

export function textoDias(dias) {
  if (dias === 0) return 'Hoje';
  return dias === 1 ? '1 dia' : `${dias} dias`;
}

export const NIVEIS_IDENTIDADE = {
  nao_verificado: { texto: 'Não verificado', icone: '⚪' },
  email: { texto: 'E-mail confirmado', icone: '✉️' },
  govbr_bronze: { texto: 'gov.br bronze', icone: '🥉' },
  govbr_prata: { texto: 'gov.br prata', icone: '🥈' },
  govbr_ouro: { texto: 'gov.br ouro', icone: '🥇' },
};

export function textoNivel(nivel) {
  const n = NIVEIS_IDENTIDADE[nivel];
  return n ? `${n.icone} ${n.texto}` : nivel || '—';
}

export function qualidadeGPS(precisao) {
  if (precisao <= 30) return { nivel: 'otima', rotulo: 'Ótima', cor: '#15803d' };
  if (precisao <= 100) return { nivel: 'boa', rotulo: 'Boa', cor: '#15803d' };
  if (precisao <= 1000) return { nivel: 'fraca', rotulo: 'Fraca', cor: '#b45309' };
  return { nivel: 'aproximada', rotulo: 'Aproximada', cor: '#b91c1c' };
}
