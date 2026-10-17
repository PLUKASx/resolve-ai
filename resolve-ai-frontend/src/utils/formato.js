export const ICONES_CATEGORIA = {
  'Vazamento de água': '💧',
  'Esgoto a céu aberto': '🚱',
  'Buraco na via': '🕳️',
  'Árvore caída': '🌳',
  'Iluminação pública': '💡',
  'Sinalização danificada': '🚸',
  'Lixo e entulho': '🗑️',
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
