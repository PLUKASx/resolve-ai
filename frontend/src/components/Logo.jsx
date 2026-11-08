import { useId } from 'react';

export default function Logo({ tamanho = 88 }) {
  const id = useId();
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 64 64"
      fill="none"
      stroke={`url(#${id})`}
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="8" y1="58" x2="56" y2="6" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#86efac" />
          <stop offset="1" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      <path d="M54 6C38 8 24 18 18 34c-3 8-3 14-2 18 4-1 10-3 18-7C48 38 58 24 54 6z" />
      <path d="M8 60 44 18" />
      <path d="M24 44h12M28 34h12M34 24h10" />
    </svg>
  );
}
