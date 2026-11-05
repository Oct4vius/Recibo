import type { LocalDate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import type { MonthReport, ReportItem } from '@/features/reports/types';
import {
  emptyReportText,
  itemAmountLines,
  itemLabel,
  monthSheetTitle,
  monthTotalLabel,
  printedOnLine,
  shortDay,
  subtotalLabel,
} from './report-text';
import './report-sheet.css';

function SheetItem({ item }: { item: ReportItem }) {
  const { main, approx } = itemAmountLines(item);
  return (
    <div className="sheet-row">
      <span className="sheet-date">{shortDay(item.date)}</span>
      <span className="sheet-what">{itemLabel(item.merchant)}</span>
      <span className="sheet-amount">
        {main}
        {approx ? <span className="sheet-approx">{approx}</span> : null}
      </span>
    </div>
  );
}

/** Hoja del mes: gastos agrupados por categoría, subtotal de cada una y total. */
export function MonthSheet({ report, start, today }: { report: MonthReport; start: LocalDate; today: LocalDate }) {
  return (
    <article className="report-sheet">
      <h2 className="sheet-title">{monthSheetTitle(start)}</h2>
      <p className="sheet-sub">{printedOnLine(today)}</p>
      {report.groups.length === 0 ? <p className="sheet-empty">{emptyReportText('month', start)}</p> : null}
      {report.groups.map((group) => {
        const [first, ...rest] = group.items;
        return (
          <section key={group.categoryId ?? 'none'} className="sheet-cat">
            <div className="sheet-keep">
              <h3 className="sheet-cat-name">{group.name}</h3>
              {first ? <SheetItem item={first} /> : null}
            </div>
            {rest.map((item) => (
              <SheetItem key={item.id} item={item} />
            ))}
            <div className="sheet-row sheet-subtotal">
              <span className="sheet-what">{subtotalLabel(group.name)}</span>
              <span className="sheet-amount">{formatMoney(group.totalDop, 'DOP')}</span>
            </div>
          </section>
        );
      })}
      <div className="sheet-row sheet-total">
        <span className="sheet-what">{monthTotalLabel(report.count)}</span>
        <span className="sheet-amount">{formatMoney(report.totalDop, 'DOP')}</span>
      </div>
    </article>
  );
}
