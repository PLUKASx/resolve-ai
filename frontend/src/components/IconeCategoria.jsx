import { ICONES_CATEGORIA } from '../utils/formato';

const imagens = import.meta.glob('../assets/icones/*.{png,svg,webp}', { eager: true, import: 'default' });

const IMAGEM_POR_NOME = Object.fromEntries(
  Object.entries(imagens).map(([caminho, url]) => [caminho.split('/').pop().replace(/\.\w+$/, ''), url]),
);

export function nomeArquivoCategoria(categoria) {
  return categoria
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function IconeCategoria({ categoria }) {
  const url = categoria ? IMAGEM_POR_NOME[nomeArquivoCategoria(categoria)] : null;
  if (url) return <img className="icone-img" src={url} alt="" aria-hidden="true" />;
  return ICONES_CATEGORIA[categoria] ?? '📌';
}
