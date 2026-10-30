import type { Plugin } from 'vite';

const NATIVE_PREFIXES = ['react-native', 'expo', '@react-native', '@expo'];

// Falla el build si el código compartido de ../src arrastra algo exclusivo del teléfono.
export function nativeImportGuard(): Plugin {
  return {
    name: 'native-import-guard',
    enforce: 'pre',
    resolveId(id, importer) {
      if (NATIVE_PREFIXES.some((prefix) => id.startsWith(prefix))) {
        throw new Error(`Desktop cannot import "${id}" (imported by ${importer})`);
      }
      return null;
    },
  };
}
