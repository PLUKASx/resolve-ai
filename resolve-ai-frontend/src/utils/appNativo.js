const encontrado = navigator.userAgent.match(/ResolveAi\/(cidadao|gestor)\/(\d+)/);

export const appNativo = encontrado ? { perfil: encontrado[1], versao: Number(encontrado[2]) } : null;

export async function versoesPublicadas() {
  try {
    const resposta = await fetch('/versao-app.json', { cache: 'no-store' });
    return resposta.ok ? await resposta.json() : null;
  } catch {
    return null;
  }
}
