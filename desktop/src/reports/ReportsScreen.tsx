import { useState } from 'react';
import { useTimeZone } from '@/features/profile/hooks';
import { useMonthReport, useYearReport } from '@/features/reports/hooks';
import { monthStart, toLocalDate, type LocalDate } from '@/lib/dates';
import { MonthNav } from '../month/MonthNav';
import { nextMonth, previousMonth } from '../month/month-nav';
import { monthTitle } from '../month/month-text';
import { Button } from '../ui/Button';
import { ErrorLine } from '../ui/ErrorLine';
import { Notice } from '../ui/Notice';
import { useNotice } from '../ui/use-notice';
import { MonthSheet } from './MonthSheet';
import { printReport } from './print';
import { nextYear, pdfFileName, yearLastMonth, type ReportKind } from './report-text';
import { saveReportPdf } from './save-pdf';
import { SheetPlaceholder } from './SheetPlaceholder';
import { YearSheet } from './YearSheet';
import './reports.css';

const KINDS: readonly { id: ReportKind; label: string }[] = [
  { id: 'month', label: 'Del mes' },
  { id: 'year', label: 'Del año' },
];
const SAVE_ERROR = 'No se pudo guardar el PDF. Si ese archivo está abierto en otro programa, ciérralo y vuelve a intentar.';

export function ReportsScreen() {
  const timeZone = useTimeZone();
  const today = toLocalDate(new Date(), timeZone);
  const [kind, setKind] = useState<ReportKind>('month');
  const [monthSel, setMonthSel] = useState<LocalDate | null>(null);
  const [yearSel, setYearSel] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const { notice, show } = useNotice();

  const currentMonth = monthStart(today);
  const start = monthSel ?? currentMonth;
  const year = yearSel ?? today.year;
  const lastMonth = yearLastMonth(year, today);
  // Solo la pestaña activa consulta (null = deshabilitada).
  const monthReport = useMonthReport(kind === 'month' ? start : null);
  const yearReport = useYearReport(kind === 'year' ? year : null, lastMonth);
  const active = kind === 'month' ? monthReport : yearReport;

  const nextMonthStart = nextMonth(start, currentMonth);
  const following = nextYear(year, today.year);
  const canGoNext = kind === 'month' ? nextMonthStart !== null : following !== null;
  const fileName = pdfFileName(kind, kind === 'month' ? start : lastMonth);
  const ready = active.isSuccess && !active.isFetching;

  const goPrevious = () => (kind === 'month' ? setMonthSel(previousMonth(start)) : setYearSel(year - 1));
  const goNext = () => {
    if (kind === 'month' && nextMonthStart) setMonthSel(nextMonthStart);
    else if (kind === 'year' && following !== null) setYearSel(following);
  };

  const save = async () => {
    setSaving(true);
    setSaveFailed(false);
    try {
      if ((await saveReportPdf(fileName)) === 'saved') show('PDF guardado');
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ticket reports-screen">
      <h1>Reportes</h1>
      <div className="reports-kinds">
        {KINDS.map(({ id, label }) => (
          <Button key={id} variant="secondary" aria-pressed={id === kind} onClick={() => setKind(id)}>
            {label}
          </Button>
        ))}
      </div>
      <MonthNav
        title={kind === 'month' ? monthTitle(start) : String(year)}
        heading="h2"
        canGoNext={canGoNext}
        onPrevious={goPrevious}
        onNext={goNext}
        previousLabel={kind === 'year' ? 'Año anterior' : undefined}
        nextLabel={kind === 'year' ? 'Año siguiente' : undefined}
      />
      <div className="reports-actions">
        <Button disabled={!ready} onClick={() => printReport(fileName.replace(/\.pdf$/, ''))}>
          Imprimir
        </Button>
        <Button variant="secondary" disabled={!ready || saving} onClick={() => void save()}>
          {saving ? 'Guardando…' : 'Guardar en PDF'}
        </Button>
      </div>
      {saveFailed && (
        <p className="reports-error" role="alert">
          {SAVE_ERROR}
        </p>
      )}
      {active.isError ? (
        <ErrorLine onRetry={() => void active.refetch()} retrying={active.isFetching} />
      ) : kind === 'month' && monthReport.data ? (
        <MonthSheet report={monthReport.data} start={start} today={today} />
      ) : kind === 'year' && yearReport.data ? (
        <YearSheet report={yearReport.data} year={year} lastMonth={lastMonth} today={today} />
      ) : (
        <SheetPlaceholder />
      )}
      <Notice message={notice} />
    </div>
  );
}
