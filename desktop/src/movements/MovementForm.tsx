import { useState } from 'react';
import { useCategories } from '@/features/categories/hooks';
import { conversionText } from '@/features/rates/text';
import type { RuleInput } from '@/features/rules/api';
import { ruleOffer, ruleOfferLabel } from '@/features/rules/offer';
import type { ExpenseChanges } from '@/features/transactions/api';
import { groupByDay } from '@/features/transactions/grouping';
import type { TransactionListItem } from '@/features/transactions/mapping';
import { SAVE_ERROR } from '@/features/transactions/messages';
import { toIsoDate, toLocalDate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import '../expense/add-expense.css';
import { CategorySelect } from '../expense/CategorySelect';
import { ExpenseFields } from '../expense/ExpenseFields';
import { canSaveExpense, formFromItem, toExpenseChanges, type ExpenseForm } from '../expense/expense-form';
import { Button } from '../ui/Button';
import { dayHeading, presentMovement } from './movements-text';

interface MovementFormProps {
  item: TransactionListItem;
  timeZone: string;
  saving: boolean;
  failed: boolean;
  /** Cualquier acción del panel en curso: no se puede guardar ni cancelar. */
  busy: boolean;
  onSave: (changes: ExpenseChanges, rule: RuleInput | null) => void;
  onCancel: () => void;
}

/** Datos del movimiento y lo que se puede cambiar: en uno importado solo la categoría, en uno manual todo. */
export function MovementForm({ item, timeZone, saving, failed, busy, onSave, onCancel }: MovementFormProps) {
  const [original] = useState<ExpenseForm>(() => formFromItem(item, timeZone));
  const [form, setForm] = useState<ExpenseForm>(original);
  const [ruleOn, setRuleOn] = useState(false);
  const categories = useCategories();
  const today = toIsoDate(toLocalDate(new Date(), timeZone));
  const row = presentMovement(item);
  const heading = groupByDay([item], new Date(), timeZone, dayHeading)[0];
  const day = heading?.kind === 'header' ? heading.title : '';
  const offer = ruleOffer({
    merchant: form.merchant,
    counterpartyLast4: item.type === 'transfer_out' ? item.counterpartyLast4 : null,
    categoryId: form.categoryId,
    originalCategoryId: original.categoryId,
  });
  const categoryName = categories.data?.find((category) => category.id === form.categoryId)?.name ?? '';
  const canSave = canSaveExpense(form, today) && !busy;
  const change = (patch: Partial<ExpenseForm>) => setForm((current) => ({ ...current, ...patch }));

  return (
    <form
      className="expense-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSave) return;
        const rule: RuleInput | null =
          offer && ruleOn && form.categoryId
            ? { matchField: offer.matchField, pattern: offer.pattern, categoryId: form.categoryId }
            : null;
        onSave(toExpenseChanges(form, original, item.source, new Date(), timeZone), rule);
      }}
    >
      <div className="movement-summary">
        <p className="movement-summary-title">{row.title}</p>
        <p className="movement-summary-amount">{formatMoney(row.amount, item.currency)}</p>
        {item.dopEquivalent && <p className="movement-summary-detail">{conversionText(item.dopEquivalent)}</p>}
        <p className="movement-summary-detail">{day}</p>
      </div>
      {item.source === 'manual' ? (
        <ExpenseFields form={form} today={today} onChange={change} />
      ) : (
        <CategorySelect value={form.categoryId} onChange={(categoryId) => change({ categoryId })} />
      )}
      {offer && (
        <label className="rule-offer">
          <input type="checkbox" checked={ruleOn} onChange={(event) => setRuleOn(event.target.checked)} />
          {ruleOfferLabel(offer, offer.pattern, categoryName)}
        </label>
      )}
      {failed && (
        <p className="form-error" role="alert">
          {SAVE_ERROR}
        </p>
      )}
      <div className="expense-actions">
        <Button type="submit" disabled={!canSave}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
