import { SlamSheet } from '@/components/SlamSheet';
import type { LinkedAccount } from '../mapping';
import { AccountForm } from './AccountForm';

export function AccountSheet({ account, onClose }: { account: LinkedAccount | null; onClose: () => void }) {
  return (
    <SlamSheet visible={account !== null} onClose={onClose} title="CUENTA">
      {account ? <AccountForm account={account} onDone={onClose} /> : null}
    </SlamSheet>
  );
}
