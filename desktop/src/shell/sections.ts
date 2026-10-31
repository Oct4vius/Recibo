export type SectionId = 'month' | 'movements' | 'history' | 'budget' | 'accounts' | 'settings';

/** `icon` es el atributo `d` de un trazo SVG de 24x24; siempre se dibuja junto al texto. */
export const SECTIONS: readonly { id: SectionId; label: string; icon: string }[] = [
  { id: 'month', label: 'Este mes', icon: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10' },
  { id: 'movements', label: 'Movimientos', icon: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6' },
  { id: 'history', label: 'Meses anteriores', icon: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5' },
  { id: 'budget', label: 'Presupuesto', icon: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 8a4 4 0 100 8 4 4 0 000-8zM12 12h.01' },
  { id: 'accounts', label: 'Mis correos', icon: 'M3 6h18v12H3zM3 7l9 7 9-7' },
  { id: 'settings', label: 'Ajustes', icon: 'M4 7h10M18 7h2M4 17h2M10 17h10M16 4v6M8 14v6' },
];
