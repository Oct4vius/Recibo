import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart';
import { SAVE_ERROR } from '@/features/transactions/messages';
import { ErrorLine } from '../ui/ErrorLine';
import { Placeholder } from '../ui/Placeholder';

// Es de esta computadora, no de Supabase: clave propia.
const STARTUP_KEY = ['desktop', 'autostart'] as const;

/** Casilla para abrir Recibo al encender Windows (apagada de fábrica). */
export function StartupSection() {
  const queryClient = useQueryClient();
  const current = useQuery({ queryKey: STARTUP_KEY, queryFn: isEnabled });
  const toggle = useMutation({
    mutationFn: (on: boolean) => (on ? enable() : disable()),
    onSettled: () => queryClient.invalidateQueries({ queryKey: STARTUP_KEY }),
  });

  const checked = toggle.isPending ? toggle.variables : (current.data ?? false);

  return (
    <section className="settings-section" aria-labelledby="startup-title">
      <h2 id="startup-title">Al encender la computadora</h2>
      {current.isError && !current.data ? (
        <ErrorLine onRetry={() => void current.refetch()} retrying={current.isFetching} />
      ) : current.isPending ? (
        <div className="settings-placeholders">
          <Placeholder width="100%" height={44} />
        </div>
      ) : (
        <label className="settings-check">
          <input type="checkbox" checked={checked} disabled={toggle.isPending} onChange={(event) => toggle.mutate(event.target.checked)} />
          Abrir Recibo al encender la computadora
        </label>
      )}
      {toggle.isError && <p className="form-error">{SAVE_ERROR}</p>}
      <p className="settings-sub">Así los avisos llegan aunque no abras Recibo.</p>
    </section>
  );
}
