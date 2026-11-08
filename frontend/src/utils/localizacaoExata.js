import { appNativo } from './appNativo';

function plugin() {
  const cap = window.Capacitor;
  if (!appNativo || !cap) return null;
  if (cap.isPluginAvailable && !cap.isPluginAvailable('Geolocation')) return null;
  return cap.Plugins?.Geolocation ?? null;
}

export const podePedirLocalizacaoExata = () => Boolean(plugin()?.requestPermissions);

export async function pedirLocalizacaoExata() {
  const p = plugin();
  if (!p?.requestPermissions) return false;
  try {
    const r = await p.requestPermissions({ permissions: ['location'] });
    return r?.location === 'granted';
  } catch {
    return false;
  }
}

function pluginConfiguracoes() {
  const cap = window.Capacitor;
  if (!appNativo || !cap) return null;
  if (cap.isPluginAvailable && !cap.isPluginAvailable('NativeSettings')) return null;
  return cap.Plugins?.NativeSettings ?? null;
}

export const podeAbrirConfiguracoes = () => Boolean(pluginConfiguracoes()?.openAndroid);

export async function abrirConfiguracoesDoApp() {
  try {
    await pluginConfiguracoes()?.openAndroid({ option: 'application_details' });
  } catch {
  }
}
