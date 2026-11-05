import { localDate, type LocalDate } from '@/lib/dates';
import { shareLabel } from '@/features/history/labels';
import { formatMoney } from '@/lib/money';
import type { YearReport } from '@/features/reports/types';
import {
  emptyReportText,
  itemAmountLines,
  itemLabel,
  monthRowLabel,
  shortDay,
  yearCountLine,
  yearRangeLine,
  yearSheetTitle,
} from './report-text';
import './report-sheet.css';

/** Hoja del año: total, gasto por categoría y por mes. */
export function YearSheet({
  report,
  year,
  lastMonth,
  today,
}: {
  report: YearReport;
  year: number;
  lastMonth: LocalDate;
  today: LocalDate;
}) {
  const total = formatMoney(report.totalDop, 'DOP');
  return (
    <article className="report-sheet sheet-year">
      <h2 className="sheet-title">{yearSheetTitle(year)}</h2>
      <p className="sheet-sub">{yearRangeLine(lastMonth, today)}</p>
      {report.count === 0 ? (
        <p className="sheet-empty">{emptyReportText('year', localDate(year, 1, 1))}</p>
      ) : (
        <>
          <p className="sheet-big">{total}</p>
          <p className="sheet-sub">{yearCountLine(report.count)}</p>
          <div className="sheet-cols">
            <div>
              <h3 className="sheet-cat-name">Por categoría</h3>
              {report.categories.items.map((cat) => (
                <div key={cat.categoryId ?? 'none'}>
                  <div className="sheet-row">
                    <span className="sheet-what">{cat.name}</span>
                    <span className="sheet-share">{shareLabel(cat.totalDop, report.categories.total)}</span>
                    <span className="sheet-amount">{formatMoney(cat.totalDop, 'DOP')}</span>
                  </div>
                  {cat.categoryId === null
                    ? report.largestUncategorized.map((item, index) => {
                        const { main, approx } = itemAmountLines(item);
                        return (
                          <p key={item.id} className="sheet-note">
                            {index === 0 ? 'Los más grandes: ' : ''}
                            {shortDay(item.date)} · {itemLabel(item.merchant)} · {main}
                            {approx ? ` (${approx})` : ''}
                          </p>
                        );
                      })
                    : null}
                </div>
              ))}
              <div className="sheet-row sheet-total">
                <span className="sheet-what">Total</span>
                <span className="sheet-amount">{total}</span>
              </div>
            </div>
            <div>
              <h3 className="sheet-cat-name">Por mes</h3>
              {report.months.map((bucket) => (
                <div key={bucket.startIso} className="sheet-row">
                  <span className="sheet-what">{monthRowLabel(bucket.start.month)}</span>
                  <span className="sheet-amount">{formatMoney(bucket.totalDop, 'DOP')}</span>
                </div>
              ))}
              <div className="sheet-row sheet-total">
                <span className="sheet-what">Total</span>
                <span className="sheet-amount">{total}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </article>
  );
}
