// Ícones em SVG próprio (traço fino, cor herdada de currentColor), no lugar
// dos emojis do sistema: emoji renderiza colorido e inconsistente entre
// SO/navegador, destoando do resto do tema neon-galáctico (spec NEON).

type IconProps = { className?: string };

const base = {
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
};

export function IconLibrary({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 6.5c-2.2-1.6-5-2-8-1v13c3-1 5.8-.6 8 1 2.2-1.6 5-2 8-1v-13c-3-1-5.8-.6-8 1Z" />
      <path d="M12 6.5v13" />
    </svg>
  );
}

export function IconInfo({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16.5" />
      <circle cx="12" cy="7.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconSettings({ className }: IconProps) {
  const teeth = Array.from({ length: 6 }, (_, i) => i * 60);
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="3.4" />
      {teeth.map((angle) => (
        <rect key={angle} x="10.9" y="1.8" width="2.2" height="4" rx="0.8" transform={`rotate(${angle} 12 12)`} />
      ))}
    </svg>
  );
}

export function IconSoundOn({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 10v4h3.5L12 17.5v-11L7.5 10Z" />
      <path d="M16.2 9.2a4.2 4.2 0 0 1 0 5.6" />
      <path d="M18.6 6.8a7.8 7.8 0 0 1 0 10.4" />
    </svg>
  );
}

export function IconSoundOff({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 10v4h3.5L12 17.5v-11L7.5 10Z" />
      <path d="M16 9.5l4.5 5M20.5 9.5 16 14.5" />
    </svg>
  );
}

export function IconPaste({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="5" y="4.5" width="14" height="17" rx="1.6" />
      <path d="M9 4.5V3.6c0-.6.5-1.1 1.1-1.1h3.8c.6 0 1.1.5 1.1 1.1v.9" />
      <line x1="8.2" y1="10.5" x2="15.8" y2="10.5" />
      <line x1="8.2" y1="14" x2="15.8" y2="14" />
      <line x1="8.2" y1="17.5" x2="13" y2="17.5" />
    </svg>
  );
}

export function IconCreateRoom({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="7.8" x2="12" y2="16.2" />
      <line x1="7.8" y1="12" x2="16.2" y2="12" />
    </svg>
  );
}

export function IconTwoPlayers({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="8.7" cy="8.2" r="2.9" />
      <path d="M3.2 19c.4-3.4 2.6-5.3 5.5-5.3s5.1 1.9 5.5 5.3" />
      <circle cx="16.2" cy="7.2" r="2.3" />
      <path d="M14.6 13.2c2.4.2 4.2 2 4.7 5.1" />
    </svg>
  );
}

// ---- Cartas de evento (spec CARTAS) ---------------------------------------

// Carta virada pra baixo: usada pra representar a mão do adversário (só a
// contagem é visível, REQ-CARTAS-07 — nunca qual carta é).
export function IconCardBack({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M12 8l2.4 4-2.4 4-2.4-4Z" />
    </svg>
  );
}

export function IconCardSaltoEstelar({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 16c3-6.5 7.5-9.5 12.5-9.5" />
      <path d="M13.3 4.2 17 7l-3 2.4" />
      <circle cx="19" cy="17" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconCardBuracoNegro({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconCardEstrelaDaSorte({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="2.5" y="3.5" width="7.5" height="7.5" rx="1" />
      <rect x="14" y="13" width="7.5" height="7.5" rx="1" />
      <path d="M6.25 5.2v4.1M4.2 7.25h4.1" />
      <path d="M17.75 14.7v4.1M15.7 16.75h4.1" />
    </svg>
  );
}

export function IconCardDevoradorDeTabuleiro({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="2.5" y="2.5" width="12" height="12" rx="1" />
      <line x1="6.5" y1="2.5" x2="6.5" y2="14.5" />
      <line x1="10.5" y1="2.5" x2="10.5" y2="14.5" />
      <line x1="2.5" y1="6.5" x2="14.5" y2="6.5" />
      <line x1="2.5" y1="10.5" x2="14.5" y2="10.5" />
      <rect x="13.5" y="13.5" width="7.5" height="6.2" rx="1" />
      <path d="M15 13.5v-1.6a2.25 2.25 0 0 1 4.5 0v1.6" />
    </svg>
  );
}

export function IconCardBolhaProtecao({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

export function IconCardCorrenteza({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M2.5 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
      <path d="M2.5 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
    </svg>
  );
}

export function IconCardTempestade({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6.3 14.8a3.3 3.3 0 0 1 .4-6.6 4.3 4.3 0 0 1 8.2-1.1 3.6 3.6 0 0 1 2.8 6.5" />
      <path d="M12.2 15l-2.4 4h3l-2 4" />
    </svg>
  );
}

export function IconCardTsunami({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M2 15.5c2-2.6 3.7-3.3 5.5-3.3s3.1 1.8 5 1.8 3.1-2.6 5-2.6 2.5.9 3 1.8" />
      <line x1="2" y1="19.5" x2="22" y2="19.5" />
    </svg>
  );
}
