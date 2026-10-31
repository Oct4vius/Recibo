import { useCategories } from '@/features/categories/hooks';

interface CategorySelectProps {
  value: string | null;
  onChange: (categoryId: string | null) => void;
  /** Texto de la opción vacía. */
  noneLabel?: string;
}

export function CategorySelect({ value, onChange, noneLabel = 'Sin categoría' }: CategorySelectProps) {
  const categories = useCategories();
  return (
    <label className="field">
      Categoría
      <select value={value ?? ''} onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}>
        <option value="">{noneLabel}</option>
        {(categories.data ?? []).map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
    </label>
  );
}
