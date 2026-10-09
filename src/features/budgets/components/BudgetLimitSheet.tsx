import { SlamSheet } from '@/components/SlamSheet';
import type { BudgetPeriod } from '@/types/database';
import { LIMIT_TITLE } from '../text';
import { BudgetLimitForm } from './BudgetLimitForm';

/** `period` null = cerrado. */
export function BudgetLimitSheet({ period, onClose }: { period: BudgetPeriod | null; onClose: () => void }) {
  return (
    <SlamSheet visible={period !== null} onClose={onClose} title={period ? LIMIT_TITLE[period] : ''}>
      {period ? <BudgetLimitForm period={period} onDone={onClose} /> : null}
    </SlamSheet>
  );
}
