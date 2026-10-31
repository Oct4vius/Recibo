import { fileURLToPath } from 'node:url';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Orden importa: los dos reemplazos de escritorio van antes del comodín `@/*` → ../src.
export const aliases = [
  { find: /^@\/lib\/supabase$/, replacement: here('./src/lib/supabase.ts') },
  { find: /^@\/lib\/env$/, replacement: here('./src/lib/env.ts') },
  { find: /^@\//, replacement: here('../src') + '/' },
  { find: /^@desktop\//, replacement: here('./src') + '/' },
];

// Los archivos de ../src resuelven paquetes desde la raíz; con esto hay una sola copia.
export const dedupe = ['react', 'react-dom', '@tanstack/react-query', '@supabase/supabase-js', 'zod', 'aes-js'];
