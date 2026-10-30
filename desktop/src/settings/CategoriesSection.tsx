import { useState } from 'react';
import { useCategories } from '@/features/categories/hooks';
import type { Category } from '@/features/categories/mapping';
import { Button } from '../ui/Button';
import { ErrorLine } from '../ui/ErrorLine';
import { Placeholder } from '../ui/Placeholder';
import { CategoryPanel } from './CategoryPanel';

const NOT_SPENDING = 'No cuenta como gasto';

export function CategoriesSection({ onNotice }: { onNotice: (message: string) => void }) {
  const categories = useCategories();
  // La categoría se conserva al cerrar el panel para que no se vacíe mientras sale.
  const [selected, setSelected] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);
  const all = categories.data ?? [];
  const own = all.filter((category) => category.isOwn);
  const builtIn = all.filter((category) => !category.isOwn);

  const openPanel = (category: Category | null) => {
    setSelected(category);
    setOpen(true);
  };

  return (
    <section className="settings-section" aria-labelledby="categories-title">
      <h2 id="categories-title">Categorías</h2>
      {categories.isError && !categories.data ? (
        <ErrorLine onRetry={() => void categories.refetch()} retrying={categories.isFetching} />
      ) : categories.isPending ? (
        <div className="settings-placeholders">
          {[0, 1, 2].map((i) => (
            <Placeholder key={i} width="100%" height={52} />
          ))}
        </div>
      ) : (
        <>
          <h3>Tus categorías</h3>
          {own.length === 0 ? (
            <p className="empty">Aún no tienes categorías propias.</p>
          ) : (
            <ul className="settings-list">
              {own.map((category) => (
                <li key={category.id}>
                  <button type="button" className="settings-row" onClick={() => openPanel(category)}>
                    {category.name}
                    {!category.countsAsSpending && <span className="settings-sub">{NOT_SPENDING}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Button variant="secondary" onClick={() => openPanel(null)}>
            Nueva categoría
          </Button>
          <h3>Las que trae Recibo</h3>
          <ul className="settings-list">
            {builtIn.map((category) => (
              <li key={category.id} className="settings-static">
                {category.name}
                {!category.countsAsSpending && <span className="settings-sub">{NOT_SPENDING}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
      <CategoryPanel
        category={selected}
        open={open}
        onClose={() => setOpen(false)}
        onDone={(message) => {
          setOpen(false);
          onNotice(message);
        }}
      />
    </section>
  );
}
