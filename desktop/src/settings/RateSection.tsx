import { useProfile } from '@/features/profile/hooks';
import { useLatestUsdRate } from '@/features/rates/hooks';
import { latestRateText } from '@/features/rates/text';
import { ErrorLine } from '../ui/ErrorLine';
import { Placeholder } from '../ui/Placeholder';
import { RateForm } from './RateForm';

/** Tasa de respaldo del dólar: la del BCRD tiene prioridad. */
export function RateSection({ onNotice }: { onNotice: (message: string) => void }) {
  const profile = useProfile();
  const latest = useLatestUsdRate();
  return (
    <section className="settings-section" aria-labelledby="rate-title">
      <h2 id="rate-title">Tasa del dólar de respaldo</h2>
      {profile.isError && !profile.data ? (
        <ErrorLine onRetry={() => void profile.refetch()} retrying={profile.isFetching} />
      ) : profile.isPending ? (
        <div className="settings-placeholders">
          <Placeholder width="100%" height={52} />
        </div>
      ) : (
        // La clave renueva la precarga cuando cambia la tasa guardada.
        <RateForm key={profile.data.usdRate} rate={profile.data.usdRate} onNotice={onNotice} />
      )}
      {latest.isSuccess && <p className="settings-sub">{latestRateText(latest.data)}</p>}
      <p className="settings-sub">Solo se usa si no hay ninguna tasa del BCRD para la fecha del gasto.</p>
    </section>
  );
}
