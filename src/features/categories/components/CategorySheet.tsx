import { SlamSheet } from '@/components/SlamSheet';
import type { Category } from '../mapping';
import { CategoryForm } from './CategoryForm';

interface Props {
  visible: boolean;
  /** null = categoría nueva. */
  category: Category | null;
  onClose: () => void;
}

export function CategorySheet({ visible, category, onClose }: Props) {
  return (
    <SlamSheet visible={visible} onClose={onClose} title={category ? 'EDITAR CATEGORÍA' : 'NUEVA CATEGORÍA'}>
      <CategoryForm key={category?.id ?? 'new'} category={category} onDone={onClose} />
    </SlamSheet>
  );
}
