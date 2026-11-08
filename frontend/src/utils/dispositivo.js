import { appNativo } from './appNativo';

export function ehCelular() {
  if (appNativo) return true;
  if (navigator.userAgentData?.mobile) return true;
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Mobile|Mobi/i.test(ua)) return true;
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

export function ambienteDeTeste() {
  return import.meta.env.DEV || ['localhost', '127.0.0.1'].includes(window.location.hostname);
}
