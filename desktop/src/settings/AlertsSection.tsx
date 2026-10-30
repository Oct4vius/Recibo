import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { desktopPort } from '../alerts/desktop-port';
import { disableDeviceAlerts, enableDeviceAlerts } from '@/features/notifications/flows';
import { notificationKeys } from '@/features/notifications/keys';
import { deviceAlertsView } from '@/features/notifications/state';
import { SAVE_ERROR } from '@/features/transactions/messages';
import { ErrorLine } from '../ui/ErrorLine';
import { Placeholder } from '../ui/Placeholder';

/** Casilla de avisos de esta computadora; la preferencia vive en la computadora, no en Supabase. */
export function AlertsSection() {
  const queryClient = useQueryClient();
  const current = useQuery({
    queryKey: notificationKeys.device(),
    queryFn: async () => ({ enabled: await desktopPort.readEnabled(), permission: await desktopPort.readPermission() }),
    staleTime: 0,
  });
  const toggle = useMutation({
    mutationFn: async (on: boolean) => {
      if (on) await enableDeviceAlerts(desktopPort);
      else await disableDeviceAlerts(desktopPort);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });

  const view = current.data ? deviceAlertsView(current.data.enabled, current.data.permission) : null;
  const checked = toggle.isPending ? toggle.variables : (view?.on ?? false);

  return (
    <section className="settings-section" aria-labelledby="alerts-title">
      <h2 id="alerts-title">Avisos de presupuesto</h2>
      {current.isError && !current.data ? (
        <ErrorLine onRetry={() => void current.refetch()} retrying={current.isFetching} />
      ) : current.isPending ? (
        <div className="settings-placeholders">
          <Placeholder width="100%" height={44} />
        </div>
      ) : (
        <label className="settings-check">
          <input type="checkbox" checked={checked} disabled={toggle.isPending} onChange={(event) => toggle.mutate(event.target.checked)} />
          Avisos en esta computadora
        </label>
      )}
      {toggle.isError && <p className="form-error">{SAVE_ERROR}</p>}
      <p className="settings-sub">Pueden tardar unos minutos en llegar.</p>
    </section>
  );
}
