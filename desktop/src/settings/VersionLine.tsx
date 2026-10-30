import { useQuery } from '@tanstack/react-query';
import { getVersion } from '@tauri-apps/api/app';

/** Versión de la app; su única fuente es tauri.conf.json. Si no se puede leer, no muestra nada. */
export function VersionLine() {
  const version = useQuery({ queryKey: ['app-version'], queryFn: getVersion, staleTime: Infinity, retry: false });
  if (!version.isSuccess) return null;
  return <p className="settings-sub">Versión {version.data}</p>;
}
