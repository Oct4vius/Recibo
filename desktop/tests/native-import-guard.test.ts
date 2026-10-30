import { describe, expect, it } from 'vitest';
import { nativeImportGuard } from '../src/build/native-import-guard';

// `resolveId` de un plugin de Vite puede ser función o { handler }; aquí es función.
function resolve(id: string) {
  const hook = nativeImportGuard().resolveId as (id: string, importer?: string) => unknown;
  return hook(id, '/src/algo.ts');
}

describe('nativeImportGuard', () => {
  it.each(['react-native', 'expo-secure-store', '@react-native-async-storage/async-storage'])(
    'falla con %s',
    (id) => {
      expect(() => resolve(id)).toThrow(`Desktop cannot import "${id}" (imported by /src/algo.ts)`);
    },
  );

  it.each(['react', '@/lib/money', '@tanstack/react-query'])('no interviene con %s', (id) => {
    expect(resolve(id)).toBeNull();
  });
});
