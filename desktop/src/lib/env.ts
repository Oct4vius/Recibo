import { parseEnv } from '@/lib/env-schema';

// Único lugar donde escritorio lee variables; Vite solo expone EXPO_PUBLIC_* (envPrefix).
export const env = parseEnv({ ...import.meta.env });
