import { SlamSheet } from '@/components/SlamSheet';
import type { Rule } from '../mapping';
import { RuleForm } from './RuleForm';

interface Props {
  visible: boolean;
  /** null = regla nueva. */
  rule: Rule | null;
  onClose: (message?: string) => void;
}

export function RuleSheet({ visible, rule, onClose }: Props) {
  return (
    <SlamSheet visible={visible} onClose={() => onClose()} title={rule ? 'EDITAR REGLA' : 'NUEVA REGLA'}>
      <RuleForm key={rule?.id ?? 'new'} rule={rule} onDone={onClose} />
    </SlamSheet>
  );
}
