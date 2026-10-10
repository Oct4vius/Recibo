import { SlamSheet } from '@/components/SlamSheet';
import { ChangePasswordForm } from './ChangePasswordForm';

interface Props {
  visible: boolean;
  email: string;
  /** `done` = la contraseña se cambió. */
  onClose: (done: boolean) => void;
}

export function ChangePasswordSheet({ visible, email, onClose }: Props) {
  return (
    <SlamSheet visible={visible} onClose={() => onClose(false)} title="CAMBIAR CONTRASEÑA">
      <ChangePasswordForm email={email} onDone={() => onClose(true)} />
    </SlamSheet>
  );
}
