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
