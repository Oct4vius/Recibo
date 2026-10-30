import { useEffect } from 'react';
import { useCategoryRuleCount, useDeleteCategory, useSaveCategory } from '@/features/categories/hooks';
import type { Category } from '@/features/categories/mapping';
import { categoryErrorMessage, deleteCategoryPrompt } from '@/features/categories/validation';
import { SAVE_ERROR } from '@/features/transactions/messages';
import '../expense/add-expense.css';
import { ConfirmButton } from '../ui/ConfirmButton';
import { SidePanel } from '../ui/SidePanel';
import { CategoryForm } from './CategoryForm';

interface CategoryPanelProps {
  /** La categoría abierta (null = nueva); se conserva mientras el panel sale. */
  category: Category | null;
  open: boolean;
  onClose: () => void;
  onDone: (notice: string) => void;
}

/** Panel de una categoría propia. Las mutaciones viven aquí para que sus avisos lleguen aunque el panel se cierre. */
export function CategoryPanel({ category, open, onClose, onDone }: CategoryPanelProps) {
  const save = useSaveCategory();
  const remove = useDeleteCategory();
  const ruleCount = useCategoryRuleCount(category?.id ?? null);
  const busy = save.isPending || remove.isPending;

  const { reset: resetSave } = save;
  const { reset: resetRemove } = remove;
  useEffect(() => {
    if (!open) return;
    resetSave();
    resetRemove();
  }, [open, category?.id, resetSave, resetRemove]);

  const prompt = category ? deleteCategoryPrompt(category.name, ruleCount.data ?? 0, category.countsAsSpending) : null;

  return (
    <SidePanel open={open} title={category ? 'Tu categoría' : 'Nueva categoría'} onClose={onClose} busy={busy}>
      <CategoryForm
        key={category?.id ?? 'new'}
        category={category}
        saving={save.isPending}
        busy={busy}
        serverError={save.isError ? categoryErrorMessage(save.error) : null}
        onSave={(input) => save.mutate(input, { onSuccess: () => onDone('Categoría guardada') })}
        onCancel={onClose}
      />
      {category && prompt && (
        <div className="settings-delete">
          <ConfirmButton
            label="Borrar categoría"
            question={prompt.title}
            detail={prompt.message}
            confirmLabel="Sí, borrar"
            pending={busy || !ruleCount.isSuccess}
            onConfirm={() => remove.mutate(category.id, { onSuccess: () => onDone('Categoría borrada') })}
          />
          {remove.isError && (
            <p className="form-error" role="alert">
              {SAVE_ERROR}
            </p>
          )}
        </div>
      )}
    </SidePanel>
  );
}
